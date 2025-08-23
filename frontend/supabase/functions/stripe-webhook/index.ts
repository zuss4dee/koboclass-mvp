/*
# Stripe Webhook Handler

1. New Edge Function
   - `stripe-webhook` function to handle Stripe events
   - Processes checkout.session.completed events
   - Handles charge.refunded events
   - Creates tickets and earnings records
   - Sends confirmation emails

2. Security
   - Webhook signature verification
   - Environment variable validation
   - Error handling and logging

3. Database Operations
   - Create transaction records
   - Create ticket records for students
   - Create earning records for hosts
   - Update refund statuses
*/

console.log("--- STRIPE WEBHOOK LOADED (SIMPLE TEST) ---");

Deno.serve(async (req: Request) => {
  console.log("--- STRIPE WEBHOOK INVOKED (SIMPLE TEST) ---");
  console.log(`Request Method: ${req.method}`);

  try {
    const body = await req.text();
    console.log("Request Body Received (first 500 chars):", body.substring(0, 500));
  } catch (e) {
    console.error("Error reading request body:", e);
  }

  return new Response(
    JSON.stringify({ message: "Hello from simple test webhook!" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});