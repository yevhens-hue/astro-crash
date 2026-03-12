const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const result = await supabase.functions.invoke('process-withdrawal', {
      body: { amount: 0.1, wallet_address: '0:4018dde30296166cda788f2f15a2617028a7727100ac4dc667509174d1936b61' }
  });
  console.log("Withdraw Result:", result.data, result.error);
}
check();
