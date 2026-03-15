const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...vals] = line.split('=');
  if (key && !key.startsWith('#')) acc[key.trim()] = vals.join('=').trim().replace(/(^"|"$)/g, '');
  return acc;
}, {});

async function run() {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?wallet_address=ilike.*UQBAGN3j*&select=balance,id,telegram_id,wallet_address,username`, {
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
    }
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
run();
