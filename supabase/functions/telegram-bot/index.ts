import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const APP_URL = Deno.env.get("APP_URL") || "https://telegram-gambling-app.vercel.app";

// Sanitize input to prevent XSS
const sanitizeParam = (param: string): string => {
    return param.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50);
};

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Webhook received:", payload);

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
              web_app: { url: APP_URL + (startParam ? `?startapp=${startParam}` : '') },
            },
          ],
          [
            {
              text: "Join Channel 📢",
              url: "https://t.me/AstroCrashNews",
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

      const appLink = startAppArg 
        ? `https://t.me/AstroCrashRobot_bot/play?startapp=${startAppArg}`
        : `https://t.me/AstroCrashRobot_bot/play`;

      const results = [
        {
          type: "article",
          id: "share_invite_" + Date.now(), // Ensure unique ID
          title: "🚀 Invite Friends to AstroCrash",
          description: "Earn 10% from their bets! 💸",
          thumbnail_url: "https://telegram-gambling-app.vercel.app/images/coin.png", // Optional: Add a nice icon if available
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
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
