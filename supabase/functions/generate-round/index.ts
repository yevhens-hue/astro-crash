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

    // Generate secure crash point
    const server_seed = crypto.randomUUID();
    // SHA-256 logic (Simplified for Edge Function demo, use real HMAC in production)
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(server_seed));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Better Bustabit formula
    const r = Math.random();
    const crash_point = Math.max(1.0, 0.99 / (1 - r)).toFixed(2);

    const { data: targetRound, error: insertError } = await supabaseClient
      .from('rounds')
      .insert({
        server_seed: hashHex,
        crash_point: crash_point,
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
