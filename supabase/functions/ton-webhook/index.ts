import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Address } from "https://esm.sh/@ton/core"

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

    console.log(`Verifying ${type}: ${tx_hash} from ${sender}`);

    // House Wallet Address
    const HOUSE_WALLET = "UQB0ZVYU321cleF9B5TwQc0KZ3h2L2sIAwPrQFODCWHPDoFA";

    // 1. Verify transaction via TonCenter API
    // Using mainnet for production
    const TON_API_URL = "https://toncenter.com/api/v2/getTransactions";
    const cacheBuster = Date.now();
    const response = await fetch(`${TON_API_URL}?address=${HOUSE_WALLET}&limit=50&timestamp=${cacheBuster}`, {
        headers: { "Cache-Control": "no-cache" }
    });
    
    if (!response.ok) {
        throw new Error("TonCenter API error: " + response.statusText);
    }
    
    const tonData = await response.json();
    
    // Find the matching transactions
    const expectedSenderRaw = Address.parse(sender).toRawString();

    let processedCount = 0;

    for (const tx of tonData.result || []) {
        // Skip outgoing messages
        if (!tx.in_msg) continue;
        
        const val = parseFloat(tx.in_msg.value) / 1e9;
        if (val <= 0) continue; // Skip zero value transfers
        
        // Ensure sender matches
        if (!tx.in_msg.source) continue;
        const txSourceRaw = Address.parse(tx.in_msg.source).toRawString();
        
        if (expectedSenderRaw !== txSourceRaw) continue;

        const txHash = tx.transaction_id.hash;

        // Ensure this transaction hasn't been credited yet
        const { data: existing } = await supabaseClient
            .from('transactions')
            .select('id')
            .eq('tx_hash', txHash)
            .single();
            
        if (!existing) {
            // Uncredited transaction found!
            if (type === 'deposit') {
                // Determine user
                const { data: user, error: userError } = await supabaseClient
                    .from('users')
                    .select('balance, id')
                    .eq('wallet_address', sender)
                    .single()

                if (!userError && user) {
                    await supabaseClient
                        .from('users')
                        .update({ balance: Number(user.balance) + val })
                        .eq('id', user.id)
                        
                    await supabaseClient.from('transactions').insert({
                        user_id: user.id,
                        amount: val,
                        type: 'deposit',
                        status: 'completed',
                        tx_hash: txHash,
                        wallet_address: sender
                    })
                    processedCount++;
                }
            } else if (type === 'bet_confirmation') {
                await supabaseClient
                    .from('bets')
                    .update({ status: 'confirmed' })
                    .eq('tx_hash', txHash)
                processedCount++;
            }
            
            // If the user specified a specific tx_hash or amount and we found it, we can break early if we want,
            // but for deposits it's safer to just process ALL uncredited deposits!
            if (tx_hash && txHash === tx_hash) {
                break;
            }
        }
    }
    
    if (processedCount === 0 && amount) {
        throw new Error("Deposit transaction not found on-chain yet or already processed.");
    }

    return new Response(JSON.stringify({ success: true, processed: processedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Returning 200 so clients can read the JSON error safely
    })
  }
})
