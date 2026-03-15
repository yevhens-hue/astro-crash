import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { verifyTelegramAuth } from "../_shared/telegram-auth.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-init-data',
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

    const initData = req.headers.get('x-telegram-init-data')
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')

    // 1. Verify Telegram Auth
    if (!botToken) throw new Error('Bot token not configured');
    if (initData) {
      const isValid = await verifyTelegramAuth(initData, botToken);
      if (!isValid) throw new Error('Unauthorized: Invalid Telegram Auth');
    } else {
      throw new Error('Unauthorized: Telegram Auth required');
    }

    const { wallet_address, tx_hash, is_bonus } = await req.json()

    if (!wallet_address) {
      throw new Error('wallet_address is required');
    }

    // 2. Generate spin result securely 
    const cryptoBuffer = new Uint8Array(3);
    crypto.getRandomValues(cryptoBuffer);
    
    const spinResults = [
        SYMBOLS[cryptoBuffer[0] % SYMBOLS.length],
        SYMBOLS[cryptoBuffer[1] % SYMBOLS.length],
        SYMBOLS[cryptoBuffer[2] % SYMBOLS.length]
    ];

    const isWin = spinResults.every(s => s === spinResults[0]);
    let winAmount = 0;
    if (isWin) {
      if (spinResults[0] === '777') winAmount = 100.0;
      else if (spinResults[0] === '💎') winAmount = 50.0;
      else if (spinResults[0] === '👑') winAmount = 20.0;
      else winAmount = 5.0; 
    }

    // 3. Atomic update via RPC
    const { data: result, error: rpcError } = await supabaseClient.rpc('spin_slot_atomic', {
        p_user_address: wallet_address,
        p_cost: COST_PER_SPIN,
        p_win_amount: winAmount,
        p_is_bonus: !!is_bonus
    });

    if (rpcError) throw new Error("RPC Error: " + rpcError.message);
    if (!result.success) throw new Error(result.error);

    // 4. Record spin in DB (using userId from result if we returned it, but we have wallet_address)
    // We'll fetch userId first or just use the wallet_address if the table allows it
    const { data: user } = await supabaseClient.from('users').select('id').eq('wallet_address', wallet_address).single();

    await supabaseClient.from('slot_spins').insert({
        user_id: user?.id,
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
        new_balance: result.new_balance
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
