import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { applicationId, userId, status } = await req.json()

    if (!applicationId || !status) {
      throw new Error('Missing applicationId or status')
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new Error('Invalid status provided')
    }

    // Just delete the application to remove it from pending list
    const { error: deleteError } = await supabaseAdmin
      .from('host_applications')
      .delete()
      .eq('id', applicationId)

    if (deleteError) throw deleteError

    const application = { id: applicationId, user_id: userId, status: status.toLowerCase() }

    // If approved, update the user's role to HOST
    if (status === 'APPROVED') {
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({ role: 'host' })
        .eq('id', userId)

      if (userError) throw userError
    }

    return new Response(JSON.stringify({ success: true, application }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
