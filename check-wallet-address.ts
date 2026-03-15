import { TonClient, WalletContractV4, WalletContractV3R2 } from "@ton/ton";
import { WalletContractV5R1 } from "@ton/ton"; // Assuming they are all exported here, wait V5 is exported since ton 13.9.0
import { mnemonicToPrivateKey } from "@ton/crypto";
import { execSync } from "child_process";

async function main() {
    try {
        console.log("Fetching secret...");
        const output = execSync('npx supabase secrets get SERVER_WALLET_MNEMONIC', { encoding: 'utf-8' });
        // The output might have "Getting value..." or other text. The actual secret is usually the last line or the only line without getting value.
        const lines = output.trim().split('\n');
        const mnemonic = lines[lines.length - 1].trim();

        if (!mnemonic || mnemonic.split(" ").length < 12) {
            console.error("Invalid mnemonic. Got:", mnemonic);
            return;
        }

        const keyPair = await mnemonicToPrivateKey(mnemonic.split(" "));
        
        const walletV4 = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
        const walletV3 = WalletContractV3R2.create({ workchain: 0, publicKey: keyPair.publicKey });
        const walletV5 = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });

        console.log("=========================================");
        console.log("V4 (What Edge Function Uses):", walletV4.address.toString({ testOnly: false, bounceable: false }));
        console.log("V3R2:", walletV3.address.toString({ testOnly: false, bounceable: false }));
        console.log("V5R1:", walletV5.address.toString({ testOnly: false, bounceable: false }));
        console.log("=========================================");
        
        console.log("If your 18 TON is sent to V5 but the Edge Function expects V4, the balance will be 0.");
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}
main();
