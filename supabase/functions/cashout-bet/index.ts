import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { verifyTelegramAuth } from "../_shared/telegram-auth.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-init-data, x-wallet-address',
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

    const { bet_id, cashout_at, wallet_address } = await req.json()

    if (!bet_id || !cashout_at || !wallet_address) {
      throw new Error('bet_id, cashout_at and wallet_address are required');
    }

    // SECURITY: Verify Telegram Auth (required for security)
    const initData = req.headers.get('x-telegram-init-data')
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!botToken) throw new Error('Bot token not configured');
    if (!initData || initData.length === 0) throw new Error('Unauthorized: Telegram Auth required');
    
    const authResult = await verifyTelegramAuth(initData, botToken);
    if (!authResult.valid) throw new Error(`Unauthorized: ${authResult.reason || 'Invalid Telegram Auth'}`);

    // RATE LIMITING: Check if user has exceeded rate limit
    const { data: rateLimitData, error: rateLimitError } = await supabaseClient.rpc('check_rate_limit', {
      p_wallet_address: wallet_address,
      p_endpoint: 'cashout-bet',
      p_limit: 20,  // Max 20 cashouts per minute
      p_window_seconds: 60
    });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (!rateLimitData) {
      return new Response(JSON.stringify({ 
        error: 'Too many requests. Please slow down.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        status: 429
      });
    }

    // 1. Fetch bet and associated round
    const { data: bet, error: betError } = await supabaseClient
      .from('bets')
      .select('*, rounds(crash_point), users(id, balance, wallet_address)')
      .eq('id', bet_id)
      .single()

    if (betError || !bet) {
        throw new Error("Bet not found: " + (betError?.message || ''));
    }

    // SECURITY: Verify wallet owns the bet
    if (bet.users.wallet_address !== wallet_address) {
        throw new Error("Unauthorized: This bet belongs to another wallet");
    }

    if (bet.status !== 'confirmed') {
        throw new Error("Bet is not active (status: " + bet.status + ")");
    }

    const crashPoint = Number(bet.rounds?.crash_point);
    const requestedCashout = Number(cashout_at);

    // 2. Validate Crash Condition
    // The user can't cash out after the game has crashed
    if (requestedCashout > crashPoint) {
        throw new Error("Crash point already reached");
    }

    // 3. Calculate Win Amount
    const winAmount = Number(bet.amount) * requestedCashout;

    // 4. Execute atomic cashout via RPC to prevent race conditions
    const { data: result, error: rpcError } = await supabaseClient.rpc('cashout_bet_atomic', {
        p_bet_id: bet_id,
        p_cashout_at: requestedCashout,
        p_win_amount: winAmount
    });

    if (rpcError) {
        throw new Error("RPC Error: " + rpcError.message);
    }
    if (!result.success) {
        throw new Error(result.error);
    }

    return new Response(JSON.stringify({ 
        success: true, 
        winAmount,
        cashoutAt: requestedCashout,
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
