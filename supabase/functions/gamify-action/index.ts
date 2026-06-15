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

    // Capture level BEFORE awarding XP to detect level-up
    const { data: priorStreak } = await supabase
      .from("user_streaks")
      .select("level")
      .eq("user_id", uid)
      .maybeSingle();
    const priorLevel = priorStreak?.level ?? 1;

    const { data: xpRes } = await supabase.rpc("award_xp", { p_user_id: uid, p_amount: xp });
    const newLevel = xpRes?.[0]?.level ?? priorLevel;

    const LEVEL_NAMES: Record<number, { name: string; msg: string }> = {
      2: { name: "Reset Apprentice", msg: "You've moved past beginner" },
      3: { name: "Reset Practitioner", msg: "The habits are becoming yours" },
      5: { name: "Reset Veteran", msg: "Most people quit before this" },
      10: { name: "Reset Master", msg: "You've changed your trajectory" },
    };

    const sendNotif = async (template: string, vars: Record<string, unknown>) => {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "",
          },
          body: JSON.stringify({ user_id: uid, template_key: template, vars }),
        });
      } catch (e) {
        console.error("notif dispatch failed", e);
      }
    };

    if (newLevel > priorLevel && LEVEL_NAMES[newLevel]) {
      await sendNotif("level_up", {
        level_name: LEVEL_NAMES[newLevel].name,
        level_message: LEVEL_NAMES[newLevel].msg,
      });
    }

    // Auto-award streak milestone badges + streak notification
    const cur = streak?.[0]?.current_streak ?? 0;
    const milestones: Record<number, { slug: string; tpl: string }> = {
      1: { slug: "first-drop", tpl: "" },
      7: { slug: "week-strong", tpl: "streak_7" },
      14: { slug: "two-week", tpl: "streak_14" },
      30: { slug: "thirty-reset", tpl: "streak_30" },
    };
    const milestone = milestones[cur];
    if (milestone) {
      if (milestone.slug) {
        const { data: badge } = await supabase
          .from("badges")
          .select("id, xp_reward")
          .eq("slug", milestone.slug)
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
      if (milestone.tpl) {
        await sendNotif(milestone.tpl, { streak: cur });
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
