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

    // 1. Check if there's an active round
    const { data: activeRound, error: activeError } = await supabaseClient
      .from('rounds')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (activeRound) {
        // If the round is older than 30 seconds, close it and create a new one
        const now = new Date()
        const createdAt = new Date(activeRound.created_at)
        const diff = (now.getTime() - createdAt.getTime()) / 1000

        if (diff < 20) {
            return new Response(JSON.stringify(activeRound), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Close old round
        await supabaseClient
            .from('rounds')
            .update({ status: 'finished' })
            .eq('id', activeRound.id)
    }

    // 2. Generate new Provably Fair crash point
    const serverSeed = Math.random().toString(36).substring(2, 15)
    // Formula: 1 + random(0-4)
    const crashPoint = (1 + Math.random() * 4).toFixed(2)

    const { data: newRound, error: insertError } = await supabaseClient
      .from('rounds')
      .insert({
        server_seed: serverSeed,
        crash_point: crashPoint,
        status: 'active'
      })
      .select()
      .single()

    if (insertError) throw insertError

    return new Response(JSON.stringify(newRound), {
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
