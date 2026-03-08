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

    // 1. Get the latest round
    const { data: latestRound, error: fetchError } = await supabaseClient
      .from('rounds')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const now = new Date();
    let targetRound = latestRound;

    // 2. Decide if we need a new round
    // If no round exists, or the latest round is older than 30 seconds (safety margin)
    const roundAge = latestRound ? (now.getTime() - new Date(latestRound.created_at).getTime()) / 1000 : 999;

    if (!latestRound || roundAge > 30) {
      // Generate secure crash point
      const server_seed = crypto.randomUUID();
      // SHA-256 logic (Simplified for Edge Function demo, use real HMAC in production)
      const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(server_seed));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Simple logic: 0.01% instant crash at 1.00x, otherwise uniform up to 100x
      // Better: crashAt = 99 / (1 - Math.random()) / 100 (Classic Bustabit formula)
      const r = Math.random();
      const crash_point = Math.max(1.0, 0.99 / (1 - r)).toFixed(2);

      const { data: newRound, error: insertError } = await supabaseClient
        .from('rounds')
        .insert({
          server_seed: hashHex,
          crash_point: crash_point,
          status: 'pending'
        })
        .select()
        .single()

      if (insertError) throw insertError;
      targetRound = newRound;
    }

    return new Response(JSON.stringify(targetRound), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
