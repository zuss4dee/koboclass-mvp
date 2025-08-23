// INITIATE PAYMENT (with optional unauth testing mode)
// - Validates env
// - Requires JWT by default
// - If ALLOW_UNAUTH_INIT=true, accepts user info in body for testing

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  // Env
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
  const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "http://localhost:3000";
  const REQUIRE_AUTH = (Deno.env.get("ALLOW_UNAUTH_INIT") ?? "false").toLowerCase() !== "true";

  if (!SUPABASE_URL || !SERVICE_KEY || !PAYSTACK_SECRET_KEY) {
    console.error("[initiate-payment] Missing env");
    return json({ success: false, error: "Server misconfigured (env missing)" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Parse body first
    const body = (await req.json().catch(() => ({}))) as {
      classId?: string;
      quantity?: number;
      // used only when REQUIRE_AUTH=false (testing)
      user_id?: string;
      email?: string;
    };

    const classId = body.classId;
    const quantity = Number.isInteger(body.quantity) && (body.quantity as number) > 0 ? (body.quantity as number) : 1;

    if (!classId) {
      return json({ success: false, error: "classId is required" }, 400);
    }

    let userId: string | null = null;
    let userEmail: string | null = null;
    let userFullName: string | null = null;

    if (REQUIRE_AUTH) {
      // JWT required
      const authHeader = req.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return json({ success: false, error: "Authorization header required" }, 401);
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: authData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !authData?.user) {
        return json({ success: false, error: "Invalid or expired token" }, 401);
      }
      userId = authData.user.id;

      // Fetch user profile for email
      const { data: profile, error: profErr } = await supabase
        .from("users")
        .select("email, full_name")
        .eq("id", userId)
        .single();

      if (profErr || !profile?.email) {
        console.error("[initiate-payment] user profile error", profErr?.message);
        return json({ success: false, error: "User profile not found" }, 404);
      }
      userEmail = profile.email;
      userFullName = profile.full_name ?? null;
    } else {
      // Unauth testing mode: read from body (with safe fallbacks)
      userId = body.user_id ?? "TEST_USER_ID";
      userEmail = body.email ?? "test@example.com";
      userFullName = null;
    }

    // Fetch class
    const { data: klass, error: classErr } = await supabase
      .from("classes")
      .select("id, title, price_ngn, host_id, is_cancelled")
      .eq("id", classId)
      .single();

    if (classErr || !klass) {
      console.error("[initiate-payment] class fetch error", classErr?.message);
      return json({ success: false, error: "Class not found" }, 404);
    }
    if (klass.is_cancelled) {
      return json({ success: false, error: "Class has been cancelled" }, 400);
    }

    // Amount (kobo)
    const amountKobo = Math.round(Number(klass.price_ngn) * 100) * quantity;
    if (!Number.isFinite(amountKobo) || amountKobo <= 0) {
      return json({ success: false, error: "Invalid amount" }, 400);
    }

    const reference = `kobo_${classId}_${userId}_${Date.now()}`;
    const callbackUrl = `${FRONTEND_URL}/paystack/callback`;

    // Initialize Paystack
    let initRes: Response;
    try {
      initRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          amount: amountKobo,
          currency: "NGN",
          reference,
          callback_url: callbackUrl,
          metadata: {
            classId,
            learnerId: userId,
            hostId: klass.host_id,
            className: klass.title,
            learnerName: userFullName,
            quantity,
          },
        }),
      });
    } catch (e) {
      console.error("[initiate-payment] network error -> paystack", e);
      return json({ success: false, error: "Unable to reach payment service. Try again." }, 503);
    }

    const initJson = await initRes.json().catch(() => ({}));
    if (!initRes.ok || !initJson?.status) {
      console.error("[initiate-payment] paystack failed", initRes.status, initJson);
      return json({ success: false, error: initJson?.message || "Payment init failed" }, 502);
    }

    // Upsert ticket as pending
    const ticketPayload = {
      class_id: classId,
      learner_id: userId,
      amount_paid: amountKobo, // kobo
      currency: "NGN",
      status: "pending",
      paystack_ref: initJson.data.reference,
      quantity,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { error: ticketErr } = await supabase
      .from("tickets")
      .upsert(ticketPayload, { onConflict: "class_id,learner_id", ignoreDuplicates: false });

    if (ticketErr) {
      console.error("[initiate-payment] ticket upsert error", ticketErr.message);
      return json({ success: false, error: "Failed to create ticket record" }, 500);
    }

    return json({
      success: true,
      data: {
        authorization_url: initJson.data.authorization_url,
        access_code: initJson.data.access_code,
        reference: initJson.data.reference,
      },
    });
  } catch (e) {
    console.error("[initiate-payment] unexpected", e);
    return json({ success: false, error: "Unexpected server error" }, 500);
  }
});