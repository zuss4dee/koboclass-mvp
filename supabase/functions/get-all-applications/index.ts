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

    // Fetch all pending host applications with user data
    const { data, error } = await supabaseAdmin
      .from('host_applications')
      .select(`
        id,
        created_at,
        user_id,
        bio,
        social_links,
        status,
        users!host_applications_user_id_fkey ( email )
      `)
      .eq('status', 'pending')

    if (error) throw error

    // Format the data to match the expected structure
    const formattedData = data.map(app => ({
      ...app,
      users: app.users[0] // Extract the first user object from the array
    }))

    return new Response(JSON.stringify({ 
      success: true, 
      data: formattedData 
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
