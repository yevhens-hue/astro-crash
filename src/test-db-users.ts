import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Load env vars manually
const envFile = readFileSync(".env.local", "utf8");
const envVars = Object.fromEntries(
    envFile.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('='))
);

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data } = await supabase.from('users').select('*').limit(3);
    console.log(JSON.stringify(data, null, 2));
}

check();
