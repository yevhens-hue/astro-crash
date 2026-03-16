import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Address } from "https://esm.sh/@ton/core"

// SECURITY: CORS should be restricted in production
// Allow only specific origins, not '*'
const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [];
const isProd = Deno.env.get('DENO_DEPLOYMENT_ID') !== undefined; // Detect production

const getCorsHeaders = (origin: string | null) => {
    // In production, only allow specific origins
    if (isProd && origin && ALLOWED_ORIGINS.includes(origin)) {
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
        };
    }
    // In development or if no origin match, be more permissive but log it
    if (!isProd) {
        return {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
        };
    }
    // Production: deny by default
    return {
        'Access-Control-Allow-Origin': 'null',
    };
};

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // In production, if origin is not allowed, still handle OPTIONS but deny others
  if (isProd && origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.log(`[SECURITY] Blocked request from unauthorized origin: ${origin}`);
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST in production from allowed origins
  if (isProd && origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 403
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // SECURITY: Get house wallet from env ONLY - never hardcode!
    const HOUSE_WALLET = Deno.env.get('HOUSE_WALLET');
    if (!HOUSE_WALLET) {
        console.error('[SECURITY] CRITICAL: HOUSE_WALLET not configured!');
        throw new Error('Server configuration error');
    }

    const { tx_hash, amount, sender, type } = await req.json()

    console.log(`Verifying ${type}: ${tx_hash} from ${sender}`);

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
    // SECURITY: Return proper error codes, not 200
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
