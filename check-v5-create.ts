import { TonClient, WalletContractV4, WalletContractV5R1 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";

async function main() {
    const keyPair = await mnemonicToPrivateKey("test test test test test test test test test test test test test test test test test test test test test test test test".split(" "));
    const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
    console.log("V5 Address:", wallet.address.toString());
}
main();
