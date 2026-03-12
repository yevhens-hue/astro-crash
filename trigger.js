const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const result = await supabase.functions.invoke('ton-webhook', {
      body: { sender: 'EQBAGN3jApYWbNp4jy8VomFwKKdycQCsTcZnUJF00ZNrYY7o', type: 'deposit' }
  });
  console.log("Trigger Result:", result.data, result.error);
}
check();
