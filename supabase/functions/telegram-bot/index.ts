import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
// SECURITY: Get URLs from environment - never hardcode!
const APP_URL = Deno.env.get("APP_URL");
const CHANNEL_URL = Deno.env.get("TELEGRAM_CHANNEL_URL");
const TELEGRAM_BOT_NAME = Deno.env.get("TELEGRAM_BOT_NAME") || "AstroCrashRobot_bot";

// CORS headers for this webhook
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// SECURITY: Verify request comes from Telegram using secret token
const verifyTelegramRequest = async (req: Request, body: any): Promise<boolean> => {
    // Check for valid payload structure
    if (!body || (!body.message && !body.callback_query && !body.inline_query)) {
        return false;
    }
    
    // Verify Telegram's secret token (X-Telegram-Bot-Api-Secret-Token header)
    // This is the recommended way to secure webhooks per Telegram docs
    const secretToken = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
    const providedToken = req.headers.get('x-telegram-bot-api-secret-token');
    
    if (secretToken) {
        // If secret is configured, it MUST be provided and match
        if (!providedToken || providedToken !== secretToken) {
            console.log('[SECURITY] Invalid or missing Telegram secret token');
            return false;
        }
    }
    
    return true;
};

// Sanitize input to prevent XSS
const sanitizeParam = (param: string): string => {
    return param.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    // SECURITY: Verify request before processing
    const isValid = await verifyTelegramRequest(req, payload);
    if (!isValid) {
        console.log('[SECURITY] Invalid Telegram request blocked');
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    console.log("Webhook received:", payload);

    // SECURITY: Get URLs from environment - require in production
    const isProduction = Deno.env.get('DENO_DEPLOYMENT_ID') !== undefined;
    const appUrl = APP_URL || (isProduction ? '' : 'https://telegram-gambling-app.vercel.app');
    const channelUrl = CHANNEL_URL || (isProduction ? '' : 'https://t.me/AstroCrashNews');

    // In production, fail if URLs are not configured
    if (isProduction && (!appUrl || !channelUrl)) {
        console.error('[SECURITY] CRITICAL: APP_URL or TELEGRAM_CHANNEL_URL not configured in production!');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Handle Start Command
    if (payload.message && payload.message.text && payload.message.text.startsWith("/start")) {
      const chatId = payload.message.chat.id;
      const firstName = payload.message.from.first_name;
      const startParam = sanitizeParam(payload.message.text.split(' ')[1] || '');

      const message = `Welcome to Astro Crash, ${firstName}! 🚀\n\nReady to win big? Play the most exciting crash game on TON!`;
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: "Play Now 🚀",
              web_app: { url: appUrl + (startParam ? `?startapp=${startParam}` : '') },
            },
          ],
          [
            {
              text: "Join Channel 📢",
              url: channelUrl,
            },
          ],
        ],
      };

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          reply_markup: keyboard,
        }),
      });
    }

    // Handle Inline Query for sharing
    if (payload.inline_query) {
      const queryId = payload.inline_query.id;
      const startAppArg = sanitizeParam(payload.inline_query.query || ''); 
      // If the user appended their referral code (e.g., typing "@AstroCrashRobot_bot ref_123"),
      // we can capture it. Otherwise, it's just the base app link.

      // Use proper t.me URL for the bot
      const botUsername = TELEGRAM_BOT_NAME.replace('_bot', '');
      const appLink = startAppArg 
        ? `https://t.me/${botUsername}/play?startapp=${startAppArg}`
        : `https://t.me/${botUsername}/play`;

      const results = [
        {
          type: "article",
          id: "share_invite_" + Date.now(), // Ensure unique ID
          title: "🚀 Invite Friends to AstroCrash",
          description: "Earn 10% from their bets! 💸",
          thumbnail_url: `${appUrl}/images/coin.png`, // Use appUrl from env
          input_message_content: {
            message_text: `🚀 Join me on **AstroCrash**! Fly the rocket, win TON, and earn together! 🌕✨`,
            parse_mode: "Markdown"
          },
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Play & Earn 🚀",
                  url: appLink
                }
              ]
            ]
          }
        }
      ];

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerInlineQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inline_query_id: queryId,
          results: results,
          cache_time: 0 // Set to 0 for debugging so results aren't cached
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
