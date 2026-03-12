const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: txs, error: txErr } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Recent TXs:", txs);
  if (txErr) console.error(txErr);
}
check();
