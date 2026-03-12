const { createClient } = require('@supabase/supabase-js');
// Load env from .env.local
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: txs, error: txErr } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(20);
  console.log("Recent DB TXs:", txs);
  if (txErr) console.error(txErr);
}
check();
