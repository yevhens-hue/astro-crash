import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TonClient, WalletContractV4, internal } from "https://esm.sh/@ton/ton@13.9.0";
import { mnemonicToPrivateKey } from "https://esm.sh/@ton/crypto@3.2.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const { amount, wallet_address } = await req.json();

    if (!amount || !wallet_address || isNaN(amount) || amount <= 0) {
        throw new Error("Invalid withdrawal request parameters");
    }

    // 1. Verify user balance
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('balance, id')
      .eq('wallet_address', wallet_address)
      .single();

    if (userError || !user) throw new Error("User not found");
    if (user.balance < amount) throw new Error("Insufficient database balance");

    // 2. Initialize TON Client (Testnet for safety if not specified)
    const isTestnet = Deno.env.get('TON_NETWORK') === 'testnet';
    const endpoint = isTestnet 
        ? "https://testnet.toncenter.com/api/v2/jsonRPC"
        : "https://toncenter.com/api/v2/jsonRPC";
        
    const client = new TonClient({
        endpoint,
        apiKey: Deno.env.get('TONCENTER_API_KEY')
    });

    // 3. Initialize Server Wallet
    const mnemonic = Deno.env.get('SERVER_WALLET_MNEMONIC');
    if (!mnemonic) throw new Error("Server wallet mnemonic not configured");
    
    const keyPair = await mnemonicToPrivateKey(mnemonic.split(" "));
    const workchain = 0;
    const wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    const contract = client.open(wallet);

    // 4. Check Server Wallet Balance
    const serverBalance = await contract.getBalance();
    const withdrawAmountNano = amount * 1000000000; // Convert TON to nanoTON
    
    // We need amount + gas (approx 0.05 TON)
    if (serverBalance < withdrawAmountNano + 50000000) {
        throw new Error("Game server wallet has insufficient funds to process withdrawal");
    }

    // 5. Send Transaction
    const seqno = await contract.getSeqno();
    
    await contract.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
            internal({
                to: wallet_address,
                value: withdrawAmountNano.toString(),
                body: "Astro Crash Withdrawal",
                bounce: false,
            })
        ]
    });

    // 6. Atomic Balance update in DB
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ balance: user.balance - amount })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // 7. Log transaction
    await supabaseClient.from('transactions').insert({
      user_id: user.id,
      amount: amount,
      type: 'withdrawal',
      status: 'completed',
      wallet_address: wallet_address
    });

    return new Response(JSON.stringify({ 
        success: true, 
        message: "Withdrawal processed successfully on the blockchain" 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Withdrawal Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
