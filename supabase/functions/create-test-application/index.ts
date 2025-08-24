import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, bio } = await req.json()

    if (!email || !bio) {
      throw new Error('Missing email or bio')
    }

    // Create test user
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert([{
        email: email,
        full_name: 'Test Host User'
      }])
      .select()
      .single()

    if (userError) throw userError

    // Create test host application
    const { data: appData, error: appError } = await supabaseAdmin
      .from('host_applications')
      .insert([{
        user_id: userData.id,
        bio: bio,
        social_links: { 
          instagram: '@testhost', 
          twitter: '@testhost_dev',
          linkedin: 'linkedin.com/in/testhost'
        },
        status: 'pending'
      }])
      .select()

    if (appError) throw appError

    return new Response(JSON.stringify({ 
      success: true, 
      user: userData, 
      application: appData[0] 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
