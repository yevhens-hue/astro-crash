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

    const { tx_hash, sender, type } = await req.json()

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
                // Use atomic function to prevent race conditions
                const { data: result, error: depositError } = await supabaseClient
                    .rpc('credit_deposit_atomic', {
                        p_wallet_address: sender,
                        p_amount: val,
                        p_tx_hash: txHash
                    });

                if (depositError) {
                    console.error(`Deposit error for wallet ${sender}:`, depositError);
                    throw new Error(`Deposit failed: ${depositError.message}`);
                }

                if (!result?.success) {
                    console.error(`Deposit failed for wallet ${sender}:`, result?.error);
                    throw new Error(result?.error || 'Deposit failed');
                }

                processedCount++;
                console.log(`Deposited ${val} TON to user ${result.user_id}, new balance: ${result.new_balance}`);
            } else if (type === 'bet_confirmation') {
                // Use atomic function to prevent race conditions
                const { data: result, error: betError } = await supabaseClient
                    .rpc('confirm_bet_atomic', {
                        p_tx_hash: txHash
                    });

                if (betError) {
                    console.error(`Bet confirmation error for tx ${txHash}:`, betError);
                    throw new Error(`Bet confirmation failed: ${betError.message}`);
                }

                if (!result?.success) {
                    console.error(`Bet confirmation failed for tx ${txHash}:`, result?.error);
                    throw new Error(result?.error || 'Bet confirmation failed');
                }

                processedCount++;
                console.log(`Confirmed bet ${result.bet_id}, previous status: ${result.previous_status}`);
            }
            
            // If the user specified a specific tx_hash or amount and we found it, we can break early if we want,
            // but for deposits it's safer to just process ALL uncredited deposits!
            if (tx_hash && txHash === tx_hash) {
                break;
            }
        }
    }
    
    if (processedCount === 0 && tx_hash) {
        throw new Error("Transaction not found on-chain yet or already processed.");
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
