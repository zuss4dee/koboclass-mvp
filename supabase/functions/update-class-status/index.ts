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

    const { classId, status } = await req.json()

    if (!classId || !status) {
      throw new Error('Missing classId or status')
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new Error('Invalid status provided')
    }

    // Update the class status
    const { data: updatedClass, error: updateError } = await supabaseAdmin
      .from('classes')
      .update({ 
        status: status.toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('id', classId)
      .select()
      .single()

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, class: updatedClass }), {
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
