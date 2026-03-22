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

    const initData = req.headers.get('x-telegram-init-data')
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')

    // 1. Verify Telegram Auth (required for security)
    if (!botToken) throw new Error('Bot token not configured');
    if (!initData || initData.length === 0) throw new Error('Unauthorized: Telegram Auth required');
    
    const authResult = await verifyTelegramAuth(initData, botToken);
    if (!authResult.valid) throw new Error(`Unauthorized: ${authResult.reason || 'Invalid Telegram Auth'}`);

    const { wallet_address, round_id, amount, is_bonus } = await req.json()

    if (!wallet_address || !round_id || !amount) {
      throw new Error('Missing required fields');
    }

    // RATE LIMITING: Check if user has exceeded rate limit
    const { data: rateLimitData, error: rateLimitError } = await supabaseClient.rpc('check_rate_limit', {
      p_wallet_address: wallet_address,
      p_endpoint: 'place-bet',
      p_limit: 10,  // Max 10 bets per minute
      p_window_seconds: 60
    });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (!rateLimitData) {
      // Get rate limit status for response headers
      const { data: status } = await supabaseClient.rpc('get_rate_limit_status', {
        p_wallet_address: wallet_address,
        p_endpoint: 'place-bet',
        p_limit: 10,
        p_window_seconds: 60
      });

      return new Response(JSON.stringify({ 
        error: 'Too many requests. Please slow down.',
        rate_limit: status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        status: 429
      });
    }

    // 2. Execute atomic bet placement via RPC
    const { data: result, error: rpcError } = await supabaseClient.rpc('place_bet_atomic', {
        p_user_address: wallet_address,
        p_round_id: round_id,
        p_amount: Number(amount),
        p_is_bonus: !!is_bonus
    });

    if (rpcError) throw new Error("RPC Error: " + rpcError.message);
    if (!result.success) throw new Error(result.error);

    // Get updated rate limit status
    const { data: rateStatus } = await supabaseClient.rpc('get_rate_limit_status', {
      p_wallet_address: wallet_address,
      p_endpoint: 'place-bet',
      p_limit: 10,
      p_window_seconds: 60
    });

    return new Response(JSON.stringify({ 
        success: true, 
        bet_id: result.bet_id,
        new_balance: result.new_balance,
        rate_limit: rateStatus
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Return 400 for errors
    })
  }
})
