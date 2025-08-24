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

    const { hostId } = await req.json()
    if (!hostId) throw new Error('Host ID is required.')

    // 1. Find all successful, unpaid transactions for the host
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('Transaction')
      .select('id, amount, booking: Booking!inner(class: Class!inner(hostId))')
      .eq('status', 'succeeded')
      .is('payoutId', null)
      .eq('booking.class.hostId', hostId)

    if (txError) throw txError
    if (!transactions || transactions.length === 0) {
      throw new Error('No pending transactions found for this host.')
    }

    // 2. Calculate total payout amount
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0)
    const transactionIds = transactions.map(tx => tx.id)

    // 3. Create a new Payout record
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('Payout')
      .insert({
        hostId,
        amount: totalAmount,
        status: 'completed', // In a real app, this might be 'pending' then 'completed'
      })
      .select()
      .single()

    if (payoutError) throw payoutError

    // 4. Update the transactions with the new payoutId
    const { error: updateTxError } = await supabaseAdmin
      .from('Transaction')
      .update({ payoutId: payout.id })
      .in('id', transactionIds)

    if (updateTxError) throw updateTxError

    return new Response(JSON.stringify({ success: true, payout }), {
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
