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

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import Stripe from 'stripe';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

interface CheckoutSession {
  id: string;
  payment_intent: string;
  customer_email: string;
  amount_total: number;
  currency: string;
  metadata: {
    user_id: string;
    class_id: string;
  };
  payment_status: string;
}

interface Charge {
  id: string;
  amount: number;
  currency: string;
  refunded: boolean;
  amount_refunded: number;
  metadata: {
    user_id?: string;
    class_id?: string;
    transaction_id?: string;
  };
}

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const resendApiKey = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req: Request) => {
  console.log('Stripe webhook received a request.');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const signature = req.headers.get('Stripe-Signature');
    if (!signature) {
      console.error('Missing Stripe-Signature header.');
      return new Response('Missing Stripe-Signature header.', { status: 400 });
    }

    let event;
    const body = await req.text();

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret!
      );
      console.log('Stripe event constructed successfully:', event.type);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log('Processing Stripe event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object as CheckoutSession);
        break;
      
      case 'charge.refunded':
        await handleChargeRefunded(supabase, event.data.object as Charge);
        break;
      
      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});

async function handleCheckoutCompleted(supabase: any, session: CheckoutSession) {
  try {
    console.log('Processing checkout completion:', session.id);

    const { user_id, class_id } = session.metadata;
    
    if (!user_id || !class_id) {
      console.error('Missing metadata in checkout session:', session.metadata);
      return;
    }

    console.log(`Metadata found: user_id=${user_id}, class_id=${class_id}`);

    // Get class information
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select(`
        *,
        users!classes_host_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('id', class_id)
      .single();

    if (classError || !classData) {
      console.error('Error fetching class data:', classError);
      return;
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          user_id,
          class_id,
          amount: session.amount_total,
          currency: session.currency.toUpperCase(),
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent,
          payment_status: 'succeeded',
          payment_method_type: 'card' // Default for checkout sessions
        }
      ])
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      return;
    }

    console.log('Transaction created:', transaction.id);

    // Create ticket for the student
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert([
        {
          user_id,
          class_id,
          transaction_id: transaction.id,
          status: 'paid'
        }
      ])
      .select()
      .single();

    if (ticketError) {
      console.error('Error creating ticket:', ticketError);
      return;
    }

    console.log('Ticket created:', ticket.id);

    // Create earning record for the host (80% of the payment)
    const hostEarning = Math.floor(session.amount_total * 0.8);
    
    const { data: earning, error: earningError } = await supabase
      .from('earnings')
      .insert([
        {
          host_id: classData.host_id,
          class_id,
          ticket_id: ticket.id,
          amount: hostEarning,
          currency: session.currency.toUpperCase(),
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (earningError) {
      console.error('Error creating earning:', earningError);
      return;
    }

    console.log('Earning created:', earning.id);

    // Get user information for email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user_id)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user data:', userError);
      // Continue without sending email rather than failing the entire process
    } else {
      // Send confirmation email using Resend
      await sendTicketConfirmationEmail({
        userEmail: userData.email,
        userName: userData.full_name || 'Student',
        className: classData.title,
        hostName: classData.users.full_name || 'Host',
        classDate: new Date(classData.date_time).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        classTime: new Date(classData.date_time).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        duration: `${classData.duration_minutes} minutes`,
        price: `₦${(session.amount_total / 100).toLocaleString()}`,
        ticketId: ticket.id
      });
    }

    console.log('Checkout completion processed successfully');

  } catch (error) {
    console.error('Error handling checkout completion:', error);
    throw error;
  }
}

async function handleChargeRefunded(supabase: any, charge: Charge) {
  try {
    console.log('Processing charge refund:', charge.id);

    // Find the transaction by payment intent or charge ID
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('stripe_payment_intent_id', charge.id)
      .single();

    if (transactionError || !transaction) {
      console.error('Transaction not found for refunded charge:', charge.id);
      return;
    }

    // Fetch class data to get the correct host_id
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('host_id')
      .eq('id', transaction.class_id)
      .single();

    if (classError || !classData) {
      console.error('Could not find class to process refund for transaction:', transaction.id, classError);
      // Still attempt to update transaction and ticket, but log that earning was not updated
    }

    // Update transaction status
    const { error: updateTransactionError } = await supabase
      .from('transactions')
      .update({ payment_status: 'refunded' })
      .eq('id', transaction.id);

    if (updateTransactionError) {
      console.error('Error updating transaction status:', updateTransactionError);
      return;
    }

    // Update ticket status
    const { error: updateTicketError } = await supabase
      .from('tickets')
      .update({ status: 'refunded' })
      .eq('transaction_id', transaction.id);

    if (updateTicketError) {
      console.error('Error updating ticket status:', updateTicketError);
      return;
    }

    // Update earning status only if classData was found
    if (classData) {
      const { error: updateEarningError } = await supabase
        .from('earnings')
        .update({ status: 'refunded' })
        .eq('class_id', transaction.class_id)
        .eq('host_id', classData.host_id); // Use correct host_id

      if (updateEarningError) {
        console.error('Error updating earning status:', updateEarningError);
        return;
      }
    }

    console.log('Refund processed successfully');

  } catch (error) {
    console.error('Error handling charge refund:', error);
    throw error;
  }
}

// Resend email service integration
async function sendTicketConfirmationEmail(data: {
  userEmail: string;
  userName: string;
  className: string;
  hostName: string;
  classDate: string;
  classTime: string;
  duration: string;
  price: string;
  ticketId: string;
}) {
  try {
    console.log('Sending ticket confirmation email to:', data.userEmail);
    
    const resend = new Resend(resendApiKey);
    
    const result = await resend.emails.send({
      from: 'KoboClass <noreply@koboclass.com>',
      to: data.userEmail,
      subject: `✅ Class Purchased: ${data.className}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Class Purchase Confirmation</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8f6f3; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #D9572B 0%, #F4A261 100%); padding: 40px 30px; text-align: center; }
            .logo { color: #ffffff; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .header-text { color: #ffffff; font-size: 18px; margin: 0; }
            .content { padding: 40px 30px; }
            .class-card { background-color: #f8f6f3; border-radius: 12px; padding: 24px; margin: 24px 0; }
            .class-title { font-size: 24px; font-weight: bold; color: #2C3E50; margin: 0 0 8px 0; }
            .host-name { color: #7F8C8D; font-size: 16px; margin: 0 0 16px 0; }
            .class-details { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0; }
            .detail-item { display: flex; align-items: center; gap: 8px; color: #2C3E50; }
            .price-section { background-color: #D9572B; color: #ffffff; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0; }
            .price { font-size: 32px; font-weight: bold; margin: 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #D9572B 0%, #F4A261 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; margin: 24px 0; }
            .footer { background-color: #2C3E50; color: #ffffff; padding: 30px; text-align: center; }
            .footer-text { margin: 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">KoboClass</div>
              <p class="header-text">Your class ticket is confirmed! 🎉</p>
            </div>
            
            <div class="content">
              <h2>Hi ${data.userName}!</h2>
              <p>Thank you for purchasing a ticket to this amazing class. We're excited to have you join us!</p>
              
              <div class="class-card">
                <h3 class="class-title">${data.className}</h3>
                <p class="host-name">with ${data.hostName}</p>
                
                <div class="class-details">
                  <div class="detail-item">
                    <span>📅</span>
                    <span>${data.classDate}</span>
                  </div>
                  <div class="detail-item">
                    <span>🕐</span>
                    <span>${data.classTime}</span>
                  </div>
                  <div class="detail-item">
                    <span>⏱️</span>
                    <span>${data.duration}</span>
                  </div>
                </div>
              </div>
              
              <div class="price-section">
                <p class="price">${data.price}</p>
                <p style="margin: 0; font-size: 14px;">Payment Confirmed</p>
              </div>
              
              <p><strong>What's Next?</strong></p>
              <ul>
                <li>We'll send you reminders before the class starts</li>
                <li>Join the live session from your dashboard</li>
                <li>Bring your questions and get ready to learn!</li>
              </ul>
              
              <a href="${Deno.env.get('FRONTEND_URL') || 'https://koboclass.com'}/dashboard" class="cta-button">
                View My Classes
              </a>
              
              <p style="margin-top: 32px; font-size: 14px; color: #7F8C8D;">
                Ticket ID: ${data.ticketId}
              </p>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                &copy; 2024 KoboClass. Made with &hearts; for Nigerian creatives.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    
    console.log('Ticket confirmation email sent successfully:', result.data?.id);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending ticket confirmation email:', error);
    return { success: false, error: 'Failed to send confirmation email' };
  }
}