import { mnemonicToWalletKey } from "@ton/crypto";
import { WalletContractV5R1, Address } from "@ton/ton";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function check() {
    const mnemonic = process.env.SERVER_WALLET_MNEMONIC;
    if (!mnemonic) {
        console.error("No mnemonic found");
        return;
    }
    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: key.publicKey });
    console.log("Wallet address (V5R1):", wallet.address.toString());
    console.log("Wallet address (Raw):", wallet.address.toRawString());
}

check();
