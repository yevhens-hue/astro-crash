// Follow this setup guide to integrate the Telegram Web App SDK: https://core.telegram.org/bots/webapps#initializing-mini-apps
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYMBOLS = ['💎', '🎭', '👑', '777', '🍒', '🔔', '🍋'];
const COST_PER_SPIN = 0.1;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { wallet_address, tx_hash } = await req.json()

    if (!wallet_address) {
      throw new Error('wallet_address is required');
    }

    // 1. Fetch User and Balance
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('id, balance')
      .eq('wallet_address', wallet_address)
      .single()

    if (userError || !user) {
        throw new Error("User not found: " + (userError?.message || ''));
    }

    if (user.balance < COST_PER_SPIN) {
        throw new Error("Insufficient balance");
    }

    // 2. Generate spin result securely 
    const cryptoBuffer = new Uint8Array(3);
    crypto.getRandomValues(cryptoBuffer);
    
    const spinResults = [
        SYMBOLS[cryptoBuffer[0] % SYMBOLS.length],
        SYMBOLS[cryptoBuffer[1] % SYMBOLS.length],
        SYMBOLS[cryptoBuffer[2] % SYMBOLS.length]
    ];

    // Win Calculation: 3 of a kind
    const isWin = spinResults.every(s => s === spinResults[0]);
    // Jackpots mapping
    let winAmount = 0;
    if (isWin) {
      if (spinResults[0] === '777') winAmount = 100.0;
      else if (spinResults[0] === '💎') winAmount = 50.0;
      else if (spinResults[0] === '👑') winAmount = 20.0;
      else winAmount = 5.0; // standard 3-of-a-kind
    }

    // 3. Atomically update balance (deduct cost + add win_amount)
    const netChange = winAmount - COST_PER_SPIN;
    
    const { error: balanceError } = await supabaseClient
        .from('users')
        .update({ balance: Number(user.balance) + netChange })
        .eq('id', user.id);

    if (balanceError) {
        throw new Error("Failed to update balance: " + balanceError.message);
    }

    // 4. Record spin in DB
    await supabaseClient.from('slot_spins').insert({
        user_id: user.id,
        wallet_address: wallet_address,
        amount: COST_PER_SPIN,
        result_symbols: spinResults,
        win_amount: winAmount,
        tx_hash: tx_hash || `slot_tx_${Date.now()}`,
        status: 'confirmed'
    });

    return new Response(JSON.stringify({ 
        success: true, 
        spinResults, 
        winAmount, 
        netChange 
    }), {
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
