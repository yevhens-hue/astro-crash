import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TonClient, WalletContractV5R1, internal, Address } from "npm:@ton/ton@14.0.0";
import { mnemonicToWalletKey } from "npm:@ton/crypto@3.2.0";
import { verifyTelegramAuth } from "../_shared/telegram-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-init-data',
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

    const { amount, wallet_address, recipient_address } = await req.json();

    if (!amount || !wallet_address || !recipient_address || isNaN(amount) || amount < 0.5) {
        console.error("Invalid withdrawal parameters received:", { amount, wallet_address, recipient_address, typeAmount: typeof amount });
        throw new Error("Invalid withdrawal request parameters: minimum 0.5 TON and recipient required");
    }

    // Try to normalize address formats to ensure robust DB lookup
    let searchAddresses = [wallet_address];
    try {
        const parsedAddress = Address.parse(wallet_address);
        searchAddresses.push(parsedAddress.toString({ bounceable: true, testOnly: false }));
        searchAddresses.push(parsedAddress.toRawString());
        searchAddresses.push(parsedAddress.toString({ bounceable: false, testOnly: false }));
    } catch (e) {
        console.warn("Could not parse wallet address:", wallet_address);
    }

    // 1. Verify user balance using ANY of the valid address formats
    const { data: targetUser, error: userError } = await supabaseClient
      .from('users')
      .select('balance, id, telegram_id, wallet_address, username')
      .in('wallet_address', searchAddresses)
      .limit(1)
      .maybeSingle();

    if (userError || !targetUser) {
        console.error("User lookup failed for address:", wallet_address, "Searched:", searchAddresses, userError);
        throw new Error("User not found or balance check failed");
    }

    // SECURITY: Only allow withdrawal to user's own wallet address
    // Normalize addresses to handle different formats (bounceable, non-bounceable, raw)
    let normalizedRecipient: string;
    let normalizedWallet: string;
    try {
        normalizedRecipient = Address.parse(recipient_address).toString({ bounceable: false, testOnly: false });
        normalizedWallet = Address.parse(wallet_address).toString({ bounceable: false, testOnly: false });
    } catch (e) {
        throw new Error("Invalid address format");
    }
    
    if (normalizedRecipient !== normalizedWallet) {
        throw new Error("Security: Withdrawals can only be sent to your registered wallet address");
    }


    // 2. Verify Telegram Auth (REQUIRED for security)
    const initData = req.headers.get('x-telegram-init-data');
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    
    if (!botToken) {
        throw new Error('Bot token not configured');
    }
    if (!initData || initData.length === 0) {
        throw new Error('Telegram verification failed: No initData provided');
    }
    
    const authResult = await verifyTelegramAuth(initData, botToken);
    if (!authResult.valid) {
        throw new Error(`Telegram auth failed: ${authResult.reason || 'Invalid signature'}`);
    }
    console.log(`[WITHDRAWAL] Telegram auth verified for user: ${wallet_address}`);

    if (targetUser.balance < amount) {
        throw new Error(`Insufficient balance. Your balance: ${targetUser.balance} TON.`);
    }

    // DEV MODE: Skip actual transfer if no wallet configured
    const mnemonic = Deno.env.get('SERVER_WALLET_MNEMONIC');
    
    if (!mnemonic) {
        console.warn("[WITHDRAWAL] No SERVER_WALLET_MNEMONIC configured - simulating withdrawal");
        
        // Just update the balance without sending real TON
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({ balance: targetUser.balance - amount })
          .eq('id', targetUser.id);

        if (updateError) {
            console.error("Balance update failed:", updateError);
            throw new Error("Failed to update balance");
        }

        // Log transaction
        await supabaseClient.from('transactions').insert({
            user_id: targetUser.id,
            amount: amount,
            type: 'withdrawal',
            status: 'completed',
            wallet_address: wallet_address,
            telegram_id: targetUser.telegram_id,
            username: targetUser.username
        });

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Withdrawal processed (simulated)"
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // 2. Initialize TON Client
    const endpoint = "https://toncenter.com/api/v2/jsonRPC"; // Ensure mainnet
    const client = new TonClient({
        endpoint,
        apiKey: Deno.env.get('TONCENTER_API_KEY')
    });

    // 3. Initialize Server Wallet (HOT WALLET)
    const keyPair = await mnemonicToWalletKey(mnemonic.split(" "));
    const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
    const contract = client.open(wallet);

    // 4. Double check server wallet address and balance
    const serverAddress = wallet.address.toString({ bounceable: false, testOnly: false });
    console.log(`[WITHDRAWAL] Using server wallet: ${serverAddress}`);
    
    const serverBalance = await contract.getBalance();
    const withdrawAmountNano = BigInt(Math.floor(amount * 1e9));
    const gasAmountNano = BigInt(50000000); // 0.05 TON
    
    if (serverBalance < withdrawAmountNano + gasAmountNano) {
        const readableBalance = Number(serverBalance) / 1e9;
        throw new Error(`Server wallet insufficient funds: ${readableBalance} TON. Required: ${amount} + gas.`);
    }

    // 5. Check Seqno and Send Transaction
    const seqno = await contract.getSeqno();
    console.log(`[WITHDRAWAL] Current seqno: ${seqno}, Amount: ${amount} to ${recipient_address}`);

    // Create transfer
    const transfer = wallet.createTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        sendMode: 1 + 2, // Pay fees separately + ignore errors
        messages: [
            internal({
                to: recipient_address,
                value: withdrawAmountNano,
                body: "Astro Crash Withdrawal",
                bounce: false,
            })
        ]
    });

    // Send via client for more robustness in Deno
    await client.sendExternalMessage(wallet, transfer);
    
    console.log(`[WITHDRAWAL] Message sent to network. Amount: ${amount} TON.`);

    // 6. Update user balance in DB
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ balance: targetUser.balance - amount })
      .eq('id', targetUser.id);

    if (updateError) {
        console.error("CRITICAL: Balance deduction failed after transaction broadcast!", updateError);
        // We still continue to log the transaction, as the user might have actually received funds
    }

    // 7. Log transaction
    const { data: txRecord, error: logError } = await supabaseClient.from('transactions').insert({
      user_id: targetUser.id,
      amount: amount,
      type: 'withdrawal',
      status: 'completed',
      wallet_address: wallet_address,
      telegram_id: targetUser.telegram_id,
      username: targetUser.username
    }).select().single();

    if (logError) console.error("Transaction logging failed:", logError);

    // 8. Send Telegram Notification - Regular notification
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (BOT_TOKEN && targetUser.telegram_id) {
        try {
            let message = '';
            const LARGE_WITHDRAWAL_THRESHOLD = parseFloat(Deno.env.get('LARGE_WITHDRAWAL_THRESHOLD') || '100');
            const isLargeWithdrawal = amount >= LARGE_WITHDRAWAL_THRESHOLD;
            
            if (isLargeWithdrawal) {
                // Large withdrawal notification
                message = `⚠️ *LARGE WITHDRAWAL!* \n\n*${amount} TON* requested for withdrawal.\n\nWallet: \`${wallet_address.slice(0, 8)}...${wallet_address.slice(-8)}\`\n\nPlease verify this request manually if suspicious.`;
            } else {
                message = `✅ *Withdrawal Successful!* \n\n*${amount} TON* has been sent to your wallet. \n\nCheck your transaction history. 💰`;
            }
            
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: targetUser.telegram_id, text: message, parse_mode: 'Markdown' })
            });
        } catch (tgError) { console.error("TG notification failed:", tgError) }
    }

    // 9. Alert admin for large withdrawals
    const LARGE_WITHDRAWAL_THRESHOLD = parseFloat(Deno.env.get('LARGE_WITHDRAWAL_THRESHOLD') || '100');
    if (amount >= LARGE_WITHDRAWAL_THRESHOLD) {
        const ADMIN_TELEGRAM_ID = Deno.env.get('ADMIN_TELEGRAM_ID');
        if (ADMIN_TELEGRAM_ID && BOT_TOKEN) {
            try {
                const adminMessage = `🚨 *ALERT: Large Withdrawal!* \n\n\nAmount: *${amount} TON*\nUser: ${wallet_address}\nUsername: ${targetUser.username || 'N/A'}\nTime: ${new Date().toISOString()}`;
                
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: ADMIN_TELEGRAM_ID, text: adminMessage, parse_mode: 'Markdown' })
                });
            } catch (adminError) {
                console.error("Admin notification failed:", adminError);
            }
        }
    }

    return new Response(JSON.stringify({ 
        success: true, 
        message: "Withdrawal processed",
        tx_id: txRecord?.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Withdrawal Error:", error.message);
    const statusCode = error.message.includes('Insufficient') || 
                       error.message.includes('not found') || 
                       error.message.includes('minimum') ? 400 : 500;
    return new Response(JSON.stringify({ 
        success: false, 
        error: error.message || "Unknown error" 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode,
    });
  }
});
