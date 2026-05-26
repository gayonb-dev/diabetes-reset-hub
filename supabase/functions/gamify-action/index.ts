// Edge function: gamify-action
// Called by the client when a member completes a tracked daily action.
// Bumps the streak (idempotent per day) and awards XP. Service-role only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACTION_XP: Record<string, number> = {
  daily_action: 10,
  log_water: 5,
  log_glucose: 8,
  log_weight: 8,
  log_meal: 6,
  complete_workout: 15,
  complete_lesson: 12,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(auth.slice(7));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uid = userData.user.id;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "daily_action");
    const xp = ACTION_XP[action] ?? 5;

    const { data: streak } = await supabase.rpc("bump_streak", { p_user_id: uid });
    const { data: xpRes } = await supabase.rpc("award_xp", { p_user_id: uid, p_amount: xp });

    // Auto-award streak milestone badges
    const cur = streak?.[0]?.current_streak ?? 0;
    const milestones: Record<number, string> = { 1: "first-drop", 7: "week-strong", 30: "thirty-reset" };
    const slug = milestones[cur];
    if (slug) {
      const { data: badge } = await supabase
        .from("badges")
        .select("id, xp_reward")
        .eq("slug", slug)
        .maybeSingle();
      if (badge) {
        const { error: insErr } = await supabase
          .from("user_badges")
          .insert({ user_id: uid, badge_id: badge.id });
        if (!insErr && badge.xp_reward) {
          await supabase.rpc("award_xp", { p_user_id: uid, p_amount: badge.xp_reward });
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        streak: streak?.[0] ?? null,
        xp: xpRes?.[0] ?? null,
        newBadge: slug ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("gamify-action error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
