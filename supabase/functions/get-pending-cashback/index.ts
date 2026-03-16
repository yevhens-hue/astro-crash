// Edge function to get pending cashback for a user
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get wallet address from request body
    const { wallet_address } = await req.json();
    if (!wallet_address) {
      return new Response(
        JSON.stringify({ error: "Missing wallet_address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, vip_level, vip_points, vip_cashback_rate, weekly_net_loss, last_cashback_calculated_at")
      .eq("wallet_address", wallet_address)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setUTCDate(periodEnd.getUTCDate() - periodEnd.getUTCDay()); // Last Sunday
    periodEnd.setUTCHours(0, 0, 0, 0);
    
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 7); // Previous Sunday

    // Get bets for current period to calculate net loss
    const { data: bets, error: betsError } = await supabase
      .from("bets")
      .select("amount, win_amount, status, created_at")
      .eq("user_id", user.id)
      .gte("created_at", periodStart.toISOString())
      .lt("created_at", periodEnd.toISOString());

    if (betsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch bets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate net loss
    let totalBets = 0;
    let totalWins = 0;
    
    for (const bet of bets || []) {
      totalBets += Number(bet.amount) || 0;
      if (bet.status === "cashed") {
        totalWins += Number(bet.win_amount) || 0;
      }
    }

    const netLoss = Math.max(0, totalBets - totalWins);
    
    // Get VIP level info
    const vipLevels = {
      1: { name: "Bronze", nextLevel: 2, nextLevelPoints: 10000, perks: ["5% Weekly Cashback", "Priority Support", "Faster Withdrawals"] },
      2: { name: "Silver", nextLevel: 3, nextLevelPoints: 25000, perks: ["7% Weekly Cashback", "Priority Support", "Faster Withdrawals", "Higher Limits"] },
      3: { name: "Gold", nextLevel: 4, nextLevelPoints: 50000, perks: ["10% Weekly Cashback", "Priority Support", "Instant Withdrawals", "Higher Limits", "Exclusive Promos"] },
      4: { name: "Platinum", nextLevel: 5, nextLevelPoints: 100000, perks: ["12% Weekly Cashback", "VIP Support", "Instant Withdrawals", "Higher Limits", "Exclusive Promos", "Personal Manager"] },
      5: { name: "Diamond", nextLevel: null, nextLevelPoints: null, perks: ["15% Weekly Cashback", "VIP Support", "Instant Withdrawals", "Highest Limits", "Exclusive Promos", "Personal Manager", "Special Events"] },
    };

    const cashbackRate = Number(user.vip_cashback_rate) || 0.05;
    const cashbackAmount = netLoss * cashbackRate;
    const currentLevel = user.vip_level || 1;
    const levelInfo = vipLevels[currentLevel] || vipLevels[1];

    // Calculate next level progress
    const progressPercent = Math.min(100, (Number(user.vip_points) / (levelInfo.nextLevelPoints || 1)) * 100);

    return new Response(
      JSON.stringify({
        // VIP info
        level: currentLevel,
        levelName: levelInfo.name,
        currentPoints: Number(user.vip_points) || 0,
        nextLevelPoints: levelInfo.nextLevelPoints,
        nextLevelName: levelInfo.nextLevel ? vipLevels[levelInfo.nextLevel]?.name : null,
        perks: levelInfo.perks,
        
        // Cashback info
        pendingCashback: cashbackAmount >= 1 ? cashbackAmount : 0, // Minimum 1 TON
        cashbackRate: cashbackRate * 100, // As percentage
        netLoss: netLoss,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        
        // Progress to next level
        progressPercent: progressPercent,
        
        // Calculation breakdown
        calculation: {
          totalBets: totalBets,
          totalWins: totalWins,
          formula: `${totalBets} - ${totalWins} = ${netLoss} (net loss)`,
          cashbackFormula: `${netLoss} × ${cashbackRate * 100}% = ${cashbackAmount.toFixed(2)} TON`,
          minimumQualifier: cashbackAmount < 1 ? "Below 1 TON minimum" : "Qualifies for cashback"
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
