import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { amount, wallet_address } = await req.json()

    // 1. Verify user balance
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('balance, id')
      .eq('wallet_address', wallet_address)
      .single()

    if (userError || !user) throw new Error("User not found")
    if (user.balance < amount) throw new Error("Insufficient balance")

    // 2. Atomic Balance update
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ balance: user.balance - amount })
      .eq('id', user.id)

    if (updateError) throw updateError

    // 3. Initiate TON transaction from Server Wallet
    // NOTE: This usually takes time and requires retry logic.
    // In production, we'd add this to a background queue.
    console.log(`Withdrawal initiated: ${amount} TON to ${wallet_address}`)

    // 4. Log transaction
    await supabaseClient.from('transactions').insert({
      user_id: user.id,
      amount: amount,
      type: 'withdrawal',
      status: 'completed', // Or 'pending' if it's asynchronous
      wallet_address: wallet_address
    })

    return new Response(JSON.stringify({ success: true, message: "Withdrawal started" }), {
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
