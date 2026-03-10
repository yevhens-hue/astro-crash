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

    const { wallet_address, round_id, amount } = await req.json()

    if (!wallet_address || !round_id || !amount) {
      throw new Error('wallet_address, round_id, and amount are required');
    }

    // 1. Fetch User and check balance
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('id, balance')
      .eq('wallet_address', wallet_address)
      .single()

    if (userError || !user) {
        throw new Error("User not found: " + (userError?.message || ''));
    }

    if (Number(user.balance) < Number(amount)) {
        throw new Error("Insufficient balance");
    }

    // 2. Prevent placing bets on rounds that have already started/crashed
    // But for this MVP without strict timing, just ensure round exists
    const { data: round, error: roundError } = await supabaseClient
      .from('rounds')
      .select('status')
      .eq('id', round_id)
      .single()
      
    if (roundError || !round) {
        throw new Error("Round not found");
    }

    // Optional: if (round.status !== 'pending') throw new Error("Round already started")
    
    // 3. User can bet multiple times (e.g., Panel A and Panel B) on the same round.
    // Removed duplicate bet restriction flag.

    // 4. Atomically deduct the balance
    const { error: balanceError } = await supabaseClient
        .from('users')
        .update({ balance: Number(user.balance) - Number(amount) })
        .eq('id', user.id);

    if (balanceError) {
        throw new Error("Failed to deduct balance: " + balanceError.message);
    }

    // 5. Insert the bet
    const { data: newBet, error: betError } = await supabaseClient
        .from('bets')
        .insert({
            user_id: user.id,
            round_id: round_id,
            amount: amount,
            status: 'confirmed',
            tx_hash: `server_bet_${Date.now()}` // Mock hash since no actual on-chain tx
        })
        .select()
        .single();

    if (betError) {
        // Rollback balance if bet insertion failed
        await supabaseClient.from('users').update({ balance: Number(user.balance) }).eq('id', user.id);
        throw new Error("Failed to record bet: " + betError.message);
    }

    return new Response(JSON.stringify({ 
        success: true, 
        bet: newBet
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
