import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { tx_hash, amount, sender } = await req.json()

    // 1. Verify transaction with TON API (TonCenter)
    const HOUSE_WALLET = Deno.env.get('HOUSE_WALLET')
    const TONCENTER_API_KEY = Deno.env.get('TONCENTER_API_KEY')
    
    console.log(`Verifying TX ${tx_hash} for ${amount} TON from ${sender}`)

    const response = await fetch(`https://toncenter.com/api/v2/getTransactions?address=${HOUSE_WALLET}&limit=10&api_key=${TONCENTER_API_KEY}`)
    const { result } = await response.json()
    
    // Look for a transaction that matches sender and amount
    const found = result.find((tx: any) => 
      tx.in_msg.source === sender && 
      tx.in_msg.value === (Number(amount) * 1e9).toString()
    )

    if (!found) {
      console.error("Transaction not found on chain for:", sender, amount)
      return new Response(JSON.stringify({ error: "Transaction not found on chain" }), { status: 400 })
    }
    
    // 2. Update bet status in DB
    const { data, error } = await supabaseClient
      .from('bets')
      .update({ status: 'confirmed' })
      .match({ tx_hash: tx_hash })
      .select()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, bet: data }), {
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
