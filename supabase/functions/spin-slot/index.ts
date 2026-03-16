import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { verifyTelegramAuth } from "../_shared/telegram-auth.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-init-data',
}

const SYMBOLS = ['💎', '🎭', '👑', '777', '🍒', '🔔', '🍋'];
const COST_PER_SPIN = 0.1;
const JACKPOT_CONTRIBUTION_PERCENT = 0.005; // 0.5%

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
    let jackpotWin = 0;
    let jackpotType = null;

    // 3. Get current jackpot before spin
    const { data: jackpotData } = await supabaseClient.rpc('get_current_jackpot');
    const currentJackpot = jackpotData?.[0]?.current_amount || 10;

    if (isWin) {
      const symbol = spinResults[0];
      
      // Calculate base win amount
      if (symbol === '777') winAmount = 100.0;
      else if (symbol === '💎') winAmount = 50.0;
      else if (symbol === '👑') winAmount = 20.0;
      else winAmount = 5.0;

      // Calculate jackpot win if applicable
      if (symbol === '777') {
        jackpotWin = currentJackpot * 1.00; // 100%
        jackpotType = '777';
      } else if (symbol === '💎') {
        jackpotWin = currentJackpot * 0.50; // 50%
        jackpotType = '💎';
      } else if (symbol === '👑') {
        jackpotWin = currentJackpot * 0.25; // 25%
        jackpotType = '👑';
      }

      // Process jackpot if won
      if (jackpotWin > 0) {
        await supabaseClient.rpc('process_jackpot_win', {
          p_winner_address: wallet_address,
          p_symbol: symbol,
          p_current_jackpot: currentJackpot
        });
      }
    }

    // 4. Contribute to jackpot (0.5% of bet)
    const contribution = COST_PER_SPIN * JACKPOT_CONTRIBUTION_PERCENT;
    await supabaseClient.rpc('contribute_to_jackpot', {
      p_cost: COST_PER_SPIN
    });

    // 5. Atomic update via RPC
    const { data: result, error: rpcError } = await supabaseClient.rpc('spin_slot_atomic', {
        p_user_address: wallet_address,
        p_cost: COST_PER_SPIN,
        p_win_amount: winAmount + jackpotWin, // Base win + jackpot win
        p_is_bonus: !!is_bonus
    });

    if (rpcError) throw new Error("RPC Error: " + rpcError.message);
    if (!result.success) throw new Error(result.error);

    // 6. Record spin in DB
    const { data: user } = await supabaseClient.from('users').select('id').eq('wallet_address', wallet_address).single();

    await supabaseClient.from('slot_spins').insert({
        user_id: user?.id,
        wallet_address: wallet_address,
        amount: COST_PER_SPIN,
        result_symbols: spinResults,
        win_amount: winAmount + jackpotWin,
        tx_hash: tx_hash || `slot_tx_${Date.now()}`,
        status: 'confirmed'
    });

    // 7. Get updated jackpot amount
    const { data: newJackpotData } = await supabaseClient.rpc('get_current_jackpot');
    const newJackpot = newJackpotData?.[0]?.current_amount || currentJackpot;

    return new Response(JSON.stringify({ 
        success: true, 
        spinResults, 
        winAmount, 
        new_balance: result.new_balance,
        jackpotWin: jackpotWin,
        jackpotType: jackpotType,
        currentJackpot: newJackpot,
        contribution: contribution
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
