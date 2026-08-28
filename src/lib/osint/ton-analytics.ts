import axios from 'axios';

/**
 * TON BLOCKCHAIN ANALYTICS SCRAPER
 * This script interacts with the TON API to fetch the transactions of a Web3 Telegram App's smart contract.
 * By analyzing incoming transactions from users, we can proxy their revenue or daily active users (DAU).
 */

const TONAPI_URL = 'https://tonapi.io/v2';

export interface TonAppMetrics {
    contractAddress: string;
    incomingTon24h: number;     // Proxy for Revenue
    outgoingTon24h: number;     // Withdrawals / Payouts
    uniqueWallets24h: number;   // Proxy for Active DAU
    totalTransactions24h: number;
}

export async function getTonAppMetrics(contractAddress: string): Promise<TonAppMetrics | null> {
    try {
        // Fetch recent transactions (limit to the last 24h via timestamp logic usually, but here we paginate or get top N)
        // Since this is a simple script, we'll fetch the last 100 transactions to demonstrate the logic.
        // A production app will use block workers or indexers.
        const response = await axios.get(`${TONAPI_URL}/blockchain/accounts/${contractAddress}/transactions?limit=100`);
        const transactions: any[] = response.data.transactions || [];

        let incomingTon = 0;
        let outgoingTon = 0;
        const uniqueWallets = new Set<string>();

        // Calculate metrics over these transactions
        for (const tx of transactions) {
            // Check incoming messages (transfers TO the contract)
            if (tx.in_msg && tx.in_msg.value > 0) {
                incomingTon += (tx.in_msg.value / 1e9); // Convert NanoTON to TON
                if (tx.in_msg.source) {
                    uniqueWallets.add(tx.in_msg.source.address);
                }
            }

            // Check outgoing messages (transfers FROM the contract)
            if (tx.out_msgs && tx.out_msgs.length > 0) {
                for (const out of tx.out_msgs) {
                    if (out.value > 0) {
                        outgoingTon += (out.value / 1e9);
                    }
                }
            }
        }

        return {
            contractAddress,
            incomingTon24h: incomingTon,
            outgoingTon24h: outgoingTon,
            uniqueWallets24h: uniqueWallets.size,
            totalTransactions24h: transactions.length
        };

    } catch (error: any) {
        console.error(`[OSINT] Failed to fetch TON metrics for ${contractAddress}:`, error.message);
        return null;
    }
}

// Development testing block
if (require.main === module) {
    (async () => {
        // Test with a known active contract or a random one (like fragments or a popular app)
        // E.g. Fragment (Telegram Usernames Dapp)
        const fragmentContract = 'EQC-3ilVr-W0Uc3pLrGJElwTaClz80cjTqB2N_D1k_R3zSbn';
        console.log(`Analyzing TON contract: ${fragmentContract}...`);
        const metrics = await getTonAppMetrics(fragmentContract);
        console.log('Metrics (last 100 txs):', metrics);
    })();
}
