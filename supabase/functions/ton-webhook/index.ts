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

    console.log(`Verifying ${type}: ${tx_hash} from ${sender}`);

    // House Wallet Address
    const HOUSE_WALLET = "UQB0ZVYU321cleF9B5TwQc0KZ3h2L2sIAwPrQFODCWHPDoFA";

    // 1. Verify transaction via TonCenter API
    // Using mainnet for production
    const TON_API_URL = "https://toncenter.com/api/v2/getTransactions";
    const response = await fetch(`${TON_API_URL}?address=${HOUSE_WALLET}&limit=20`);
    
    if (!response.ok) {
        throw new Error("TonCenter API error: " + response.statusText);
    }
    
    const tonData = await response.json();
    
    // Find the matching transaction
    let onChainTx = null;
    let finalTxHash = tx_hash;

    for (const tx of tonData.result || []) {
        // Skip outgoing messages
        if (!tx.in_msg) continue;
        
        const val = parseFloat(tx.in_msg.value) / 1e9;
        
        // 1. Match by exact tx_hash if provided
        if (finalTxHash && tx.transaction_id.hash === finalTxHash) {
            onChainTx = tx;
            break;
        }

        // 2. Or match by approximate amount (within 0.01 TON due to gas) if no tx_hash provided
        if (!finalTxHash && Math.abs(val - amount) <= 0.01) {
            // Ensure this transaction hasn't been credited yet
            const { data: existing } = await supabaseClient
                .from('transactions')
                .select('id')
                .eq('tx_hash', tx.transaction_id.hash)
                .single();
                
            if (!existing) {
                onChainTx = tx;
                finalTxHash = tx.transaction_id.hash;
                break;
            }
        }
    }
    
    if (!onChainTx) {
        throw new Error("Deposit transaction not found on-chain yet or already processed.");
    }

    const onChainAmount = parseFloat(onChainTx.in_msg.value) / 1e9;

    if (type === 'deposit') {
      // 2. Prevent double-crediting
      const { data: existingTx } = await supabaseClient
        .from('transactions')
        .select('id')
        .eq('tx_hash', finalTxHash)
        .single();
        
      if (existingTx) {
          throw new Error("Transaction already processed");
      }

      // 3. Update user balance
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('balance, id')
        .eq('wallet_address', sender)
        .single()

      if (!userError && user) {
        await supabaseClient
          .from('users')
          .update({ balance: Number(user.balance) + onChainAmount })
          .eq('id', user.id)
          
        await supabaseClient.from('transactions').insert({
          user_id: user.id,
          amount: onChainAmount,
          type: 'deposit',
          status: 'completed',
          tx_hash: finalTxHash,
          wallet_address: sender
        })
      }
    } else if (type === 'bet_confirmation') {
       await supabaseClient
        .from('bets')
        .update({ status: 'confirmed' })
        .eq('tx_hash', finalTxHash)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
