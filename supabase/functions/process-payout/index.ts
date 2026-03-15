import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { TonClient, WalletContractV4, internal } from "https://esm.sh/@ton/ton@13.11.1"
import { mnemonicToWalletKey } from "https://esm.sh/@ton/crypto@3.2.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { bet_id } = await req.json()
    console.log(`[PAYOUT] Processing bet_id: ${bet_id}`)

    // 1. Fetch bet and user info
    const { data: bet, error: betError } = await supabaseClient
      .from('bets')
      .select('*, users(wallet_address, telegram_id)')
      .eq('id', bet_id)
      .single()

    if (betError) throw new Error(`Bet query error: ${betError.message}`)
    if (!bet) throw new Error("Bet not found")
    if (!bet.users) throw new Error("User data missing for this bet")
    if (bet.status !== 'cashed') throw new Error(`Invalid bet status: ${bet.status}`)

    // 2. Send Telegram Notification
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (BOT_TOKEN && bet.users?.telegram_id) {
        try {
            const message = `🚀 *ASTRO VICTORY!* \n\nYou just cashed out *${bet.win_amount} TON* at *${bet.cashout_at}x*! \n\nCheck your wallet! 💰`;
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: bet.users.telegram_id, text: message, parse_mode: 'Markdown' })
            });
        } catch (tgError) { console.error("TG notification failed:", tgError) }
    }

    // 3. Real TON Payout Logic
    const MNEMONIC = Deno.env.get('HOT_WALLET_MNEMONIC');
    if (MNEMONIC) {
        try {
            const client = new TonClient({
                endpoint: 'https://toncenter.com/api/v2/jsonRPC',
                apiKey: Deno.env.get('TONCENTER_API_KEY')
            });

            const key = await mnemonicToWalletKey(MNEMONIC.split(' '));
            const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
            const contract = client.open(wallet);

            await contract.sendTransfer({
                secretKey: key.secretKey,
                seqno: await contract.getSeqno(),
                messages: [
                    internal({
                        to: bet.users.wallet_address,
                        value: (Number(bet.win_amount) * 1e9).toString(), // nanoTON
                        bounce: false,
                        body: `Payout for bet ${bet.id} in Astro Crash`,
                    })
                ]
            });
            console.log(`[PAYOUT] Successfully sent ${bet.win_amount} TON to ${bet.users.wallet_address}`);
        } catch (payoutError) {
            console.error("Payout transaction failed:", payoutError);
            throw new Error(`Payout transaction failed: ${payoutError.message}`);
        }
    } else {
        console.log(`[PAYOUT] Simulated payout of ${bet.win_amount} TON to ${bet.users.wallet_address} (No Hot Wallet Seed)`);
    }

    // 4. Update bet status to 'paid' AND increment user balance atomically
    const { error: updateError } = await supabaseClient
      .from('bets')
      .update({ status: 'paid' })
      .eq('id', bet.id)

    if (updateError) throw updateError

    // 5. Increment balance in 'users' table - Use atomic RPC to prevent race conditions
    const { data: balanceResult, error: balanceError } = await supabaseClient.rpc('increment_user_balance', {
        p_wallet_address: bet.users.wallet_address,
        p_amount: Number(bet.win_amount)
    });

    if (balanceError) {
        console.error("[PAYOUT] Balance update failed:", balanceError);
        // Still mark as paid since on-chain tx was sent
    } else {
        console.log(`[BALANCE] Updated ${bet.users.wallet_address} balance by ${bet.win_amount} TON`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
