const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: user } = await supabase.from('users').select('id').eq('wallet_address', "0:4018dde30296166cda788f2f15a2617028a7727100ac4dc667509174d1936b61").single();
  if (user) {
      console.log("User ID:", user.id);
      const { data: bets } = await supabase.from('bets').select('*').eq('user_id', user.id);
      console.log("User Bets:", bets);
  } else {
      console.log("User not found");
  }
}
check();
