"use client";
import { useState } from "react";

export default function CheckoutTest() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        "https://tjtfpofpafuxjkijdzww.supabase.co/functions/v1/initiate-payment",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ classId: "TEST_CLASS_ID", quantity: 1 }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.data?.authorization_url) {
        throw new Error(data?.error || "Failed to start payment");
      }
      window.location.href = data.data.authorization_url;
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Checkout Test</h1>
      <button onClick={start} disabled={loading}>
        {loading ? "Starting..." : "Start Paystack Test"}
      </button>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
    </main>
  );
}
