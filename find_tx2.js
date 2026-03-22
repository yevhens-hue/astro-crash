require('dotenv').config({ path: '.env.local' });

const { Address } = require('@ton/core');

async function check() {
  const HOUSE_WALLET = process.env.HOUSE_WALLET || "UQB0ZVYU321cleF9B5TwQc0KZ3h2L2sIAwPrQFODCWHPDoFA";
  const userWallet = process.env.TEST_USER_WALLET || "UQBAGN3jApYWbNp4jy8VomFwKKdycQCsTcZnUJF00ZNrYdMt";

  const expectedSenderRaw = Address.parse(userWallet).toRawString();

  console.log("Checking transactions for House Wallet:", HOUSE_WALLET);
  console.log("Looking for deposits from:", userWallet, "(raw:", expectedSenderRaw, ")");

  try {
    const res = await fetch(`https://toncenter.com/api/v2/getTransactions?address=${HOUSE_WALLET}&limit=100`);
    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();

    if (!data.ok) {
      console.error("TonCenter API error:", data);
      return;
    }

    let found = 0;
    for (const tx of data.result) {
      if (!tx.in_msg || !tx.in_msg.source) continue;

      const val = parseFloat(tx.in_msg.value) / 1e9;
      if (val <= 0) continue;

      try {
        const txSourceRaw = Address.parse(tx.in_msg.source).toRawString();
        if (txSourceRaw === expectedSenderRaw) {
          console.log("----");
          console.log("FOUND DEPOSIT!");
          console.log("Amount:", val, "TON");
          console.log("Hash:", tx.transaction_id.hash);
          console.log("Date:", new Date(tx.utime * 1000).toLocaleString());
          found++;
          console.log("Tx index:", data.result.indexOf(tx));
        }
      } catch (e) {
        // ignore invalid addresses
      }
    }

    if (found === 0) {
      console.log("No deposits found from this user in the last 100 transactions.");
    }
  } catch (err) {
    console.error("Failed to fetch transactions:", err);
    process.exit(1);
  }
}

check();
