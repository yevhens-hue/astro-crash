import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testRaceCondition() {
  const testWallet = 'UQBAGN3jApYWbNp4jy8VomFwKKdycQCsTcZnUJF00ZNrYdMt';
  
  console.log('--- Security Test: Race Condition & Atomic Updates ---');
  
  // 1. Reset balance to 1 TON
  await supabase.from('users').update({ balance: 1.0 }).eq('wallet_address', testWallet);
  console.log('Initial balance set to 1.0 TON');

  // 2. Fire 10 parallel bets of 0.5 TON each
  // Only 2 should succeed, 8 should fail.
  // We'll call the new atomic function via RPC
  const roundId = '00000000-0000-0000-0000-000000000000'; // Dummy ID for test or real one
  
  console.log('Spamming 10 parallel bets of 0.5 TON...');
  const attempts = Array.from({ length: 10 }).map(() => 
    supabase.rpc('place_bet_atomic', {
      p_user_address: testWallet,
      p_round_id: 'e86e9e4f-698d-47fb-9eb7-2e452a36b46b', // Existing round or dummy
      p_amount: 0.5
    })
  );

  const results = await Promise.all(attempts);
  
  const successes = results.filter(r => r.data?.success).length;
  const failures = results.filter(r => !r.data?.success).length;

  console.log(`Successes: ${successes}`);
  console.log(`Failures: ${failures}`);

  // 3. Final balance check
  const { data: user } = await supabase.from('users').select('balance').eq('wallet_address', testWallet).single();
  console.log(`Final balance: ${user?.balance} TON`);

  if (successes === 2 && Number(user?.balance) === 0) {
    console.log('✅ TEST PASSED: No negative balance, exact amount deducted.');
  } else {
    console.log('❌ TEST FAILED: Balance integrity compromised!');
  }
}

testRaceCondition();
