const HOUSE_WALLET = "UQB0ZVYU321cleF9B5TwQc0KZ3h2L2sIAwPrQFODCWHPDoFA";
const TON_API_URL = "https://toncenter.com/api/v2/getTransactions";

async function main() {
    const response = await fetch(`${TON_API_URL}?address=${HOUSE_WALLET}&limit=5`);
    const data = await response.json();
    for (const tx of data.result || []) {
        if (tx.in_msg && parseFloat(tx.in_msg.value) > 0) {
            console.log(JSON.stringify(tx.in_msg, null, 2));
            break;
        }
    }
}

main();
