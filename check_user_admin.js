require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not found');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkUser() {
    const wallet = 'UQBAGN3jApYWbNp4jy8VomFwKKdycQCsTcZnUJF00ZNrYdMt';

    console.log('Querying with service role key...');
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', wallet);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Found users:', JSON.stringify(data, null, 2));

    // Also check all users to see what's in the DB
    const { data: allUsers, error: allError } = await supabase
        .from('users')
        .select('id, wallet_address, balance, bonus_balance')
        .order('created_at', { ascending: false })
        .limit(10);

    console.log('\nRecent users:', JSON.stringify(allUsers, null, 2));
}

checkUser();
