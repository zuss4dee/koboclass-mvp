// PAYSTACK WEBHOOK (Production-ready)
// - Uses Deno Web Crypto for HMAC SHA-512 (no Node 'crypto')
// - Verifies signature over RAW body
// - Double-verifies transaction with Paystack
// - Idempotent inserts (checks existing tx by reference)
// - Updates tickets + host_earnings + transactions

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-paystack-signature, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hmacSHA512Hex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Env
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
  const PLATFORM_FEE_RATE = Number(Deno.env.get("PLATFORM_FEE_RATE") ?? "0");

  console.log("[webhook] env check", {
    hasSupabaseUrl: !!SUPABASE_URL,
    hasServiceKey: !!SERVICE_KEY,
    hasPaystack: !!PAYSTACK_SECRET_KEY,
    feeRate: PLATFORM_FEE_RATE,
  });

  if (!SUPABASE_URL || !SERVICE_KEY || !PAYSTACK_SECRET_KEY) {
    console.error("[webhook] Missing env");
    return json({ error: "Server misconfigured (env missing)" }, 500);
  }

  try {
    // RAW body first (signature must be computed over raw)
    const raw = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";

    // Verify signature
    const computed = await hmacSHA512Hex(PAYSTACK_SECRET_KEY, raw);
    if (computed.toLowerCase() !== signature.toLowerCase()) {
      console.error("[webhook] invalid signature");
      return json({ error: "Invalid signature" }, 401);
    }

    const event = JSON.parse(raw);
    console.log("[webhook] event", event?.event, event?.data?.reference);

    if (event?.event !== "charge.success") {
      return json({ ok: true, ignored: event?.event });
    }

    const reference: string = event.data?.reference;
    const amountKobo: number = event.data?.amount;
    const paid_at: string = event.data?.paid_at;
    const meta = event.data?.metadata || {};

    if (!reference || !amountKobo) {
      console.error("[webhook] missing reference/amount");
      return json({ error: "Missing reference/amount" }, 400);
    }

    // Defensive: verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const verifyJson = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || !verifyJson?.status || verifyJson.data?.status !== "success") {
      console.error("[webhook] verify failed", verifyRes.status, verifyJson);
      return json({ error: "Verification failed", detail: verifyJson }, 400);
    }

    const classId: string = String(meta.classId || "");
    const learnerId: string = String(meta.learnerId || "");
    const quantity: number = Number(meta.quantity ?? 1);
    const amount = amountKobo / 100;

    // Fee + net (percentage model)
    const feeAmount = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
    const netAmount = Math.round((amount - feeAmount) * 100) / 100;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Idempotency: if transaction exists, exit gracefully
    const { data: existingTx, error: existingErr } = await supabase
      .from("transactions")
      .select("id")
      .eq("reference", reference)
      .limit(1)
      .maybeSingle();

    if (existingErr) {
      console.error("[webhook] tx read error", existingErr.message);
      return json({ error: "DB read error" }, 500);
    }
    if (existingTx?.id) {
      console.log("[webhook] already processed", reference);
      return json({ ok: true, already_processed: true });
    }

    // 1) Update ticket to paid (by Paystack reference)
    const { error: ticketErr } = await supabase
      .from("tickets")
      .update({ status: "paid", paid_at: paid_at ? new Date(paid_at).toISOString() : new Date().toISOString() })
      .eq("paystack_ref", reference);

    if (ticketErr) {
      console.error("[webhook] ticket update error", ticketErr.message);
      // Non-fatal; continue to record transaction so we can reconcile
    }

    // 2) Insert transaction (audit)
    const { error: txErr } = await supabase.from("transactions").insert({
      reference,
      user_id: learnerId || null,
      class_id: classId || null,
      gross_amount: amount,
      fee_amount: feeAmount,
      net_amount: netAmount,
      provider: "paystack",
      raw: verifyJson,
      created_at: new Date().toISOString(),
    });

    if (txErr) {
      console.error("[webhook] tx insert error", txErr.message);
      // Still return 200 to avoid Paystack retries looping forever; you'll see this in logs.
    }

    // 3) Credit host earnings (pending)
    let host_id: string | null = null;
    if (classId) {
      const { data: klass } = await supabase
        .from("classes")
        .select("host_id")
        .eq("id", classId)
        .single();
      host_id = klass?.host_id ?? null;
    }

    if (host_id) {
      const { error: earnErr } = await supabase.from("host_earnings").insert({
        host_id,
        class_id: classId || null,
        reference,
        quantity,
        gross_amount: amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        payout_status: "pending",
        created_at: new Date().toISOString(),
      });
      if (earnErr) console.error("[webhook] earnings insert error", earnErr.message);
    }

    console.log("[webhook] success", { reference, amount, netAmount });
    return json({ ok: true, reference });
  } catch (e) {
    console.error("[webhook] unexpected", e);
    return json({ error: "Internal server error" }, 500);
  }
});