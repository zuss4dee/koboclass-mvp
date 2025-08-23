import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import Stripe from 'https://esm.sh/stripe@12.9.0';

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const { userId, email } = await req.json();

  if (!userId || !email) {
    return new Response(JSON.stringify({ error: 'Missing userId or email' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Create a Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Save the Stripe account ID to the user's profile
    const { error: supabaseError } = await supabase
      .from('users')
      .update({ stripe_account_id: account.id })
      .eq('id', userId);

    if (supabaseError) {
      throw new Error(`Supabase error: ${supabaseError.message}`);
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${Deno.env.get('FRONTEND_URL')}/dashboard?reauth=true`,
      return_url: `${Deno.env.get('FRONTEND_URL')}/dashboard?stripe_connect_success=true`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Stripe Connect onboarding error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
