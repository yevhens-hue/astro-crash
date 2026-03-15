import { TonClient, WalletContractV4, internal, Address } from "https://esm.sh/@ton/ton@13.9.0";
import { mnemonicToPrivateKey } from "https://esm.sh/@ton/crypto@3.2.0";

async function main() {
    try {
        console.log("Normalizing address...");
        const addr = Address.parse("UQBAGN3jApYWbNp4jy8VomFwKKdycQCsTcZnUJF00ZNrYdMt");
        console.log("Raw:", addr.toRawString());

        console.log("Creating TON client...");
        const client = new TonClient({
            endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC"
        });

        console.log("Parsing mnemonic...");
        const keyPair = await mnemonicToPrivateKey("test test test test test test test test test test test test test test test test test test test test test test test test".split(" "));
        
        console.log("Creating wallet...");
        const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
        const contract = client.open(wallet);

        console.log("Getting balance...");
        const serverBalance = await contract.getBalance();
        console.log("Balance:", serverBalance);
    } catch (e: any) {
        console.error("ERROR:", e.message);
    }
}
main();
