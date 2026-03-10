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

    const { bet_id, cashout_at } = await req.json()

    if (!bet_id || !cashout_at) {
      throw new Error('bet_id and cashout_at are required');
    }

    // 1. Fetch bet and associated round
    const { data: bet, error: betError } = await supabaseClient
      .from('bets')
      .select('*, rounds(crash_point), users(id, balance)')
      .eq('id', bet_id)
      .single()

    if (betError || !bet) {
        throw new Error("Bet not found: " + (betError?.message || ''));
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

    // 4. Update the bet
    const { error: updateBetError } = await supabaseClient
        .from('bets')
        .update({ 
            status: 'cashed', 
            cashout_at: requestedCashout,
            win_amount: winAmount
        })
        .eq('id', bet.id);

    if (updateBetError) {
        throw new Error("Failed to update bet status: " + updateBetError.message);
    }

    // 5. Update user balance atomically
    const { error: balanceError } = await supabaseClient
        .from('users')
        .update({ balance: Number(bet.users.balance) + winAmount })
        .eq('id', bet.users.id);

    if (balanceError) {
        throw new Error("Failed to credit balance: " + balanceError.message);
    }

    return new Response(JSON.stringify({ 
        success: true, 
        winAmount,
        cashoutAt: requestedCashout
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
