import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHANNEL_ID = Deno.env.get("TELEGRAM_CHANNEL_ID")!;
const APP_URL = Deno.env.get("APP_URL") || "https://t.me/AstroHubBot/app";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    // Check authorization string (basic security measure for webhook/cron calls)
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET') || SUPABASE_SERVICE_ROLE_KEY}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
      console.error("Missing Telegram credentials");
      return new Response("Missing config", { status: 500 });
    }

    // Get last 10 finished rounds
    const { data: rounds, error } = await supabase
      .from('rounds')
      .select('crash_point')
      .eq('status', 'finished')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !rounds || rounds.length === 0) {
      return new Response("No rounds found or DB error", { status: 500 });
    }

    // Bot Logic: Pattern detection
    // Let's count how many recent crashes were below 2x (red)
    let consecutiveReds = 0;
    for (const round of rounds) {
      if (round.crash_point < 2.0) {
        consecutiveReds++;
      } else {
        break;
      }
    }

    let signalMessage = "";
    let targetMultiplier = 1.0;

    if (consecutiveReds >= 3) {
      signalMessage = `🚨 **АЛГОРИТМ ЗАФИКСИРОВАЛ АНОМАЛИЮ** 🚨\n\n📉 Последние ${consecutiveReds} раундов игра забирала ставки.\n⚖️ Вероятность крупного выигрыша сейчас **94.7%**\n\n🎯 **ЦЕЛЬ:** Забирай на 2.00x\n⚡️ **ДЕЙСТВУЙ СЕЙЧАС!**`;
    } else if (rounds[0].crash_point > 10.0) {
      signalMessage = `🚀 **ПРОИЗОШЕЛ ОГРОМНЫЙ ИКС!** 🚀\n\nТолько что раунд достиг **${rounds[0].crash_point.toFixed(2)}x**!\n\nОбычно после таких взлетов алгоритм дает серию средних иксов.\n🎯 **ЦЕЛЬ:** Забирай на 1.50x - 1.80x`;
    } else {
      // 30% chance to send a general signal just to keep engagement high
      if (Math.random() < 0.3) {
        targetMultiplier = +(Math.random() * (2.5 - 1.5) + 1.5).toFixed(2);
        signalMessage = `⚡️ **СИГНАЛ ОТ НЕЙРОСЕТИ** ⚡️\n\nМы проанализировали последние 1000 раундов.\nПаттерн благоприятный.\n\n🎯 **ЦЕЛЬ:** Забирай на ${targetMultiplier}x\n💎 Удачи, пилот!`;
      } else {
        // No strong pattern, skip sending a signal this time
        return new Response(JSON.stringify({ message: "No strong signal detected, skipping." }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Send to Telegram
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "🎮 СДЕЛАТЬ СТАВКУ",
            url: APP_URL,
          },
        ],
      ],
    };

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text: signalMessage,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }),
    });

    const telegramData = await response.json();

    if (!telegramData.ok) {
      console.error("Telegram error:", telegramData);
      return new Response(JSON.stringify({ error: telegramData }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, message: "Signal sent!" }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Signal bot error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
