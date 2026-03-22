require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const url = `${supabaseUrl}/functions/v1/ton-webhook`;

async function run() {
  console.log("Calling ton-webhook...");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + anonKey
      },
      body: JSON.stringify({
        sender: process.env.TEST_USER_WALLET || "UQBAGN3jApYWbNp4jy8VomFwKKdycQCsTcZnUJF00ZNrYdMt",
        type: "deposit"
      })
    });

    const status = res.status;
    const text = await res.text();
    console.log("Status:", status);
    console.log("Response:", text);

    if (!res.ok) {
      throw new Error(`HTTP error: ${status}`);
    }
  } catch (err) {
    console.error("Failed to trigger deposit:", err);
    process.exit(1);
  }
}

run();
