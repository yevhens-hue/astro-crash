import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { verifyTelegramAuth } from "../_shared/telegram-auth.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-init-data',
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

    // 1. Verify Telegram Auth
    if (!botToken) throw new Error('Bot token not configured');
    
    // In production, we MUST verify. In local dev, we might skip if debugging.
    if (initData) {
      const isValid = await verifyTelegramAuth(initData, botToken);
      if (!isValid) throw new Error('Unauthorized: Invalid Telegram Auth');
    } else {
        // Only allow missing initData if FEATURE_FLAGS.DEBUG_MODE is on 
        // (but we don't have direct access to client flags here, so we assume strict)
        throw new Error('Unauthorized: Telegram Auth required');
    }

    const { wallet_address, round_id, amount, is_bonus } = await req.json()

    if (!wallet_address || !round_id || !amount) {
      throw new Error('Missing required fields');
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

    return new Response(JSON.stringify({ 
        success: true, 
        bet_id: result.bet_id,
        new_balance: result.new_balance
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
