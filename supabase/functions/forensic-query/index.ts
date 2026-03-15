import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TonClient, WalletContractV5R1, Address } from "npm:@ton/ton@14.0.0";
import { mnemonicToWalletKey } from "npm:@ton/crypto@3.2.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const mnemonic = Deno.env.get('SERVER_WALLET_MNEMONIC');
    if (!mnemonic) throw new Error("Mnemonic missing");

    const keyPair = await mnemonicToWalletKey(mnemonic.split(" "));
    const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
    
    // 2. Initialize TON Client to check balance
    const endpoint = "https://toncenter.com/api/v2/jsonRPC";
    const client = new TonClient({
        endpoint,
        apiKey: Deno.env.get('TONCENTER_API_KEY')
    });
    const contract = client.open(wallet);
    const serverBalance = await contract.getBalance();
    const readableBalance = Number(serverBalance) / 1e9;
    const seqno = await contract.getSeqno();

    const derivedAddress = wallet.address.toString({ bounceable: false, testOnly: false });
    const expectedAddress = "UQB0ZVYU321cleF9B5TwQc0KZ3h2L2sIAwPrQFODCWHPDoFA";

    // 3. Query transactions from DB
    const { data: dbWithdrawals, error: txError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('type', 'withdrawal')
      .order('created_at', { ascending: false })
      .limit(10);

    // 4. Query on-chain transactions for Server Wallet
    let formattedTxs: any[] = [];
    try {
        const txs = await client.getTransactions(wallet.address, { limit: 10 });
        formattedTxs = txs.map(tx => {
            const inMsg = tx.inMessage;
            const outMsgs = tx.outMessages;
            
            let description = "Regular Transaction";
            if (inMsg?.info.type === 'external-in') {
                description = "Outgoing Request (Signed)";
            }

            return {
                hash: typeof tx.hash === 'function' ? tx.hash().toString('hex') : (tx.hash instanceof Buffer || tx.hash instanceof Uint8Array ? Buffer.from(tx.hash).toString('hex') : tx.hash.toString()),
                utime: tx.now,
                date: new Date(tx.now * 1000).toISOString(),
                description,
                valueInNano: inMsg?.info.type === 'internal' ? inMsg.info.value.coins.toString() : '0',
                outMessages: outMsgs.map(m => ({
                    to: m.info.dest?.toString(),
                    value: m.info.type === 'internal' ? m.info.value.coins.toString() : '0'
                }))
            };
        });
    } catch (err: any) {
        console.error("Server chain query failed:", err.message);
    }

    // 5. Query user's wallet for the 5 TON inflow (Investigation)
    // In production, this should be parameterized or removed for security
    const userWalletAddressStr = Deno.env.get('FORENSIC_USER_WALLET') || "UQBAGN3jApYWbNp4jy8VomFwKKdycQCsTcZnUJF00ZNrYdMt";
    let formattedUserTxs: any[] = [];
    try {
        const userTxs = await client.getTransactions(Address.parse(userWalletAddressStr), { limit: 10 });
        formattedUserTxs = userTxs.map(tx => {
            const inMsg = tx.inMessage;
            return {
                hash: typeof tx.hash === 'function' ? tx.hash().toString('hex') : (tx.hash instanceof Buffer || tx.hash instanceof Uint8Array ? Buffer.from(tx.hash).toString('hex') : tx.hash.toString()),
                utime: tx.now,
                date: new Date(tx.now * 1000).toISOString(),
                valueInNano: inMsg?.info.type === 'internal' ? inMsg.info.value.coins.toString() : '0',
                valueInTon: inMsg?.info.type === 'internal' ? Number(inMsg.info.value.coins) / 1e9 : 0,
                from: inMsg?.info.type === 'internal' ? inMsg.info.src?.toString() : 'External/Other'
            };
        });
    } catch (err: any) {
        console.error("User chain query failed:", err.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        derivedAddress,
        expectedAddress,
        match: derivedAddress === expectedAddress,
        balance: serverBalance.toString(),
        readableBalance,
        seqno,
        dbWithdrawals,
        onChainTxs: formattedTxs,
        userWalletInvestigation: {
          address: userWalletAddressStr,
          recentTxs: formattedUserTxs
        },
        txError: txError ? txError.message : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
