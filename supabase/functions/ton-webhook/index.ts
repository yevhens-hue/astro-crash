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

    const { tx_hash, amount, sender, type } = await req.json()

    // 1. Verify transaction via TonCenter API (Testnet or Mainnet)
    // const TON_API_URL = "https://testnet.toncenter.com/api/v2/getTransactions";
    // const response = await fetch(`${TON_API_URL}?address=${Deno.env.get('HOUSE_WALLET')}&limit=10`);
    // ... verification logic ...
    
    console.log(`Verifying ${type}: ${tx_hash} from ${sender}`);

    if (type === 'deposit') {
      // Update user balance
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('balance, id')
        .eq('wallet_address', sender)
        .single()

      if (!userError && user) {
        await supabaseClient
          .from('users')
          .update({ balance: user.balance + amount })
          .eq('id', user.id)
          
        await supabaseClient.from('transactions').insert({
          user_id: user.id,
          amount: amount,
          type: 'deposit',
          status: 'completed',
          tx_hash: tx_hash
        })
      }
    } else if (type === 'bet_confirmation') {
       await supabaseClient
        .from('bets')
        .update({ status: 'confirmed' })
        .eq('tx_hash', tx_hash)
    }

    return new Response(JSON.stringify({ success: true }), {
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
