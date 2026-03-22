import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error("Missing keys");

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: users, error } = await supabase
        .from('users')
        .select('*');
        
    if (error) {
        console.error(error);
        return;
    }
    
    console.log("Found", users.length, "users.");
    
    // Look for users with exactly 7.05 balance
    const user705 = users.filter(u => Number(u.balance) === 7.05 || Number(u.balance) + Number(u.bonus_balance) === 7.05);
    console.log("Users with 7.05 balance:", user705);
    
    console.log("\nAll users' balances:");
    users.forEach(u => {
        console.log(`${u.id} | ${u.wallet_address} | bal: ${u.balance} | bonus: ${u.bonus_balance} | ${u.username || 'no-username'}`);
    });
}
main();
