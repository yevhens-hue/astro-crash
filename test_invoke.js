
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testWithdraw() {
  console.log("Invoking...");
  const { data, error } = await supabase.functions.invoke('process-withdrawal', {
    body: {
      amount: 0.6,
      wallet_address: "0:259db8cefc8cedb377bcf7ea609cd29baee200424b9177a63d91cf97ba9d16a8", // Mock valid address
      recipient_address: "UQBAGN3jApYWbNp4jy8VomFwKKdycQCsxxxxx", // target
    }
  });

  console.log("Response data:", data);
  console.log("Response error:", error);
}

testWithdraw();
