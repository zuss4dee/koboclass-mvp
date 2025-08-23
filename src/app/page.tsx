"use client";

import { useState } from "react";

export default function CheckoutTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function startPayment() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        "https://tjtfpofpafuxjkijdzww.functions.supabase.co/initiate-payment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId: "TEST_CLASS_ID", // Replace with a real class ID from your DB
            quantity: 1,
            email: "test@example.com", // only works if ALLOW_UNAUTH_INIT=true
            user_id: "TEST_USER_ID",   // only works if ALLOW_UNAUTH_INIT=true
          }),
        }
      );

      const data = await res.json();
      setResult(data);

      if (data?.success && data?.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      }
    } catch (err) {
      console.error(err);
      setResult({ success: false, error: "Unexpected error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Checkout Test</h1>
      <button
        onClick={startPayment}
        disabled={loading}
        style={{
          padding: "10px 20px",
          background: "#2563eb",
          color: "white",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
        }}
      >
        {loading ? "Processing..." : "Start Paystack Test"}
      </button>

      {result && (
        <pre style={{ marginTop: 20, background: "#f3f4f6", padding: 12 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}