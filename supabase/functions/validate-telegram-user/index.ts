import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { verifyTelegramAuth } from "../_shared/telegram-auth.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-init-data',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const initData = req.headers.get('x-telegram-init-data')
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!botToken) {
      throw new Error('Bot token not configured')
    }
    if (!initData || initData.length === 0) {
      throw new Error('Telegram verification failed: No initData provided')
    }
    
    const authResult = await verifyTelegramAuth(initData, botToken)
    if (!authResult.valid) {
      throw new Error(`Telegram auth failed: ${authResult.reason || 'Invalid signature'}`)
    }
    
    // Extract user ID from initData
    const params = new URLSearchParams(initData)
    const userJson = params.get('user')
    if (!userJson) {
      throw new Error('No user data in initData')
    }
    
    const user = JSON.parse(userJson)
    if (!user.id) {
      throw new Error('Invalid user data')
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      telegram_id: user.id.toString(),
      username: user.username || null,
      first_name: user.first_name || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
