import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Generate securely random seeds
    const serverSeed = crypto.randomUUID().replace(/-/g, '');
    const clientSeed = "0000000000000000000" + Math.floor(Math.random() * 1000000000).toString(16); // Mock Bitcoin block hash
    
    // 2. Provably Fair Math (HMAC-SHA256)
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw", encoder.encode(serverSeed),
        { name: "HMAC", hash: "SHA-256" },
        false, ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(clientSeed));
    const hashHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // 3. Extract 52 bits and calculate bustabit-style crash point
    const h = parseInt(hashHex.slice(0, 13), 16);
    const e = Math.pow(2, 52);
    // 99% return to player, 1% house edge
    const r = (100 * e - h) / (e - h);
    
    // Cap slightly so it doesn't go to infinity or be too weird, round to 2 decimals
    let crash_point = Math.max(1.0, r / 100);
    // Additional safeguards
    if (crash_point < 1.0) crash_point = 1.0;
    
    // Store as JSON in server_seed column so client can verify
    const seedData = JSON.stringify({
        serverSeed,
        clientSeed,
        hash: hashHex
    });

    const { data: targetRound, error: insertError } = await supabaseClient
      .from('rounds')
      .insert({
        server_seed: seedData,
        crash_point: crash_point.toFixed(2),
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) throw insertError;

    return new Response(JSON.stringify(targetRound), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
