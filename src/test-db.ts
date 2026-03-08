import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

console.log('Starting DB check...');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key defined:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const timeout = setTimeout(() => {
    console.error('Request timed out after 10s');
    process.exit(1);
  }, 10000);

  try {
    console.log('Fetching users...');
    const { data: users, error: uError } = await supabase.from('users').select('*').limit(5);
    if (uError) throw uError;
    console.log('--- USERS ---');
    console.log(users);
    
    console.log('Fetching bets...');
    const { data: bets, error: bError } = await supabase.from('bets').select('*').limit(5);
    if (bError) throw bError;
    console.log('--- BETS ---');
    console.log(bets);
    
    clearTimeout(timeout);
    process.exit(0);
  } catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
  }
}

check();
