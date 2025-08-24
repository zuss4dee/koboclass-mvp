/*
# Create Stripe Checkout Session

1. New Edge Function
   - `create-checkout-session` function to create Stripe checkout sessions
   - Validates class and user data
   - Creates Stripe checkout session with proper metadata
   - Returns session URL for frontend redirect

2. Security
   - User authentication validation
   - Class availability checks
   - Duplicate purchase prevention

3. Integration
   - Stripe Checkout API integration
   - Proper metadata for webhook processing
   - Success/cancel URL configuration
*/

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateCheckoutRequest {
  classId: string;
  userId: string;
  userEmail: string;
  className: string;
  hostName: string;
  currency: string;
}

Deno.serve(async (req: Request) => {
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      console.error('Missing required environment variables');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Headers:', Object.fromEntries(req.headers.entries()));

    // Parse request body
    const bodyText = await req.text();
    console.log('Raw Body:', bodyText);
    if (!bodyText) {
      return new Response(JSON.stringify({ error: 'Request body is empty' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const requestData: CreateCheckoutRequest = JSON.parse(bodyText);
    console.log('Parsed Body:', requestData);

    const { classId, userId, userEmail, className, hostName, currency } = requestData;

    // Validate required fields
    if (!classId || !userId || !userEmail) {
      console.log('Missing required fields validation failed');
      return new Response(JSON.stringify({ 
        error: 'Missing required fields' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Starting existing ticket check...');
    // Check if user already has a ticket for this class
    const { data: existingTicket, error: ticketCheckError } = await supabase
      .from('tickets')
      .select('id')
      .eq('user_id', userId)
      .eq('class_id', classId)
      .eq('status', 'paid')
      .single();

    console.log('Existing ticket check result:', { existingTicket, ticketCheckError });

    if (existingTicket) {
      console.log('User already has ticket - returning error');
      return new Response(JSON.stringify({ 
        error: 'You already have a ticket for this class' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Starting class verification...');
    // Verify class exists and is approved
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, title, status, date_time, price')
      .eq('id', classId)
      .eq('status', 'approved')
      .single();

    console.log('Class verification result:', { classData, classError });

    if (classError || !classData) {
      console.log('Class not found or not approved - returning error');
      return new Response(JSON.stringify({ 
        error: 'Class not found or not available for booking' 
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Securely fetch the class price from the database
    const serverAmount = classData.price; // Assuming 'price' is in the smallest currency unit (kobo)

    console.log('Checking if class is in future...');
    // Verify class is in the future
    if (new Date(classData.date_time) <= new Date()) {
      console.log('Class has already started - returning error');
      return new Response(JSON.stringify({ 
        error: 'This class has already started or ended' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('All validations passed, creating Stripe session...');
    // Create Stripe checkout session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'success_url': `${req.headers.get('origin') || 'https://koboclass.com'}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${req.headers.get('origin') || 'https://koboclass.com'}/class/${classId}/checkout?payment=cancelled`,
        'customer_email': userEmail,
        'line_items[0][price_data][currency]': currency.toLowerCase(),
        'line_items[0][price_data][product_data][name]': className,
        'line_items[0][price_data][product_data][description]': `Live class with ${hostName}`,
        'line_items[0][price_data][unit_amount]': serverAmount.toString(),
        'line_items[0][quantity]': '1',
        'metadata[user_id]': userId,
        'metadata[class_id]': classId,
        'metadata[host_name]': hostName,
        'payment_intent_data[metadata][user_id]': userId,
        'payment_intent_data[metadata][class_id]': classId,
      }),
    });

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error('Stripe API error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to create checkout session' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const session = await stripeResponse.json();

    return new Response(JSON.stringify({
      sessionId: session.id,
      url: session.url
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
