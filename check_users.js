const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    const { data, error } = await supabase.from('users').select('*').limit(5);
    if (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
    console.log("Users:", data);
    console.log("Fetched", data?.length ?? 0, "users successfully");
  } catch (err) {
    console.error("Failed to fetch users:", err);
    process.exit(1);
  }
}

check();
