// Edge function: gamify-action
// Called by the client when a member completes a tracked daily action.
// Bumps the streak (idempotent per day) and awards XP. Service-role only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsFor, preflight } from "../_shared/cors.ts";


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
  const pre = preflight(req);
  if (pre) return pre;
  const corsHeaders = corsFor(req);

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

    // Mirror the authoritative streak into visitor_profiles so the dashboard
    // reads the same value the sidebar reads.
    const currentStreak = streak?.[0]?.current_streak ?? 0;
    await supabase
      .from("visitor_profiles")
      .update({ streak_count: currentStreak })
      .eq("user_id", uid);

    // Level is EARNED: derived from the number of completed days
    // (distinct dates with a member_daily_progress row at status='completed'),
    // NOT from elapsed calendar days and NOT from XP.
    const { data: completedRows } = await supabase
      .from("member_daily_progress")
      .select("day_number, completed_at")
      .eq("member_id", uid)
      .eq("status", "completed");
    const completedDays = new Set(
      (completedRows ?? []).map((r: { day_number: number; completed_at: string | null }) =>
        r.completed_at ? String(r.completed_at).slice(0, 10) : `day-${r.day_number}`,
      ),
    ).size;

    const LEVEL_DAY_THRESHOLDS = [0, 14, 45, 90, 135, 180, 270, 365, 450, 540];
    let earnedLevel = 1;
    for (let i = 0; i < LEVEL_DAY_THRESHOLDS.length; i++) {
      if (completedDays >= LEVEL_DAY_THRESHOLDS[i]) earnedLevel = i + 1;
    }

    // Capture prior level from visitor_profiles (the display source of truth).
    const { data: vp } = await supabase
      .from("visitor_profiles")
      .select("level")
      .eq("user_id", uid)
      .maybeSingle();
    const priorLevel = vp?.level ?? 1;
    // Never demote: the stored level is a permanent floor.
    const newLevel = Math.max(earnedLevel, priorLevel);


    // Award XP (Reset Points accumulate) — its returned level is ignored.
    const { data: xpRes } = await supabase.rpc("award_xp", { p_user_id: uid, p_amount: xp });

    // Level names/messages MUST stay in sync with src/lib/levels.ts and
    // src/components/gamification/LevelUpOverlay.tsx.
    const LEVEL_NAMES: Record<number, { name: string; msg: string }> = {
      1:  { name: "The Starter",             msg: "You began." },
      2:  { name: "The Builder",             msg: "Your routine is taking shape." },
      3:  { name: "The Momentum Maker",      msg: "You keep returning." },
      4:  { name: "The Pattern Finder",      msg: "You are learning from your routine." },
      5:  { name: "The Steady Navigator",    msg: "You are choosing what helps." },
      6:  { name: "The Consistency Keeper",  msg: "You built six months of practice." },
      7:  { name: "The Sustainer",           msg: "You are carrying useful routines forward." },
      8:  { name: "The Champion",            msg: "One full year of showing up." },
      9:  { name: "The Guide",               msg: "Your experience can help you ask better questions." },
      10: { name: "The Long-Game Leader",    msg: "You have practiced for the long term." },
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
      await supabase
        .from("visitor_profiles")
        .update({ level: newLevel, level_earned_at: new Date().toISOString() })
        .eq("user_id", uid);
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

    // Chain to award-badges (service-role → trusted user_id).
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/award-badges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        },
        body: JSON.stringify({ user_id: uid }),
      });
    } catch (e) {
      console.error("award-badges chain failed", e);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        streak: streak?.[0] ?? null,
        xp: xpRes?.[0] ?? null,
        newBadge: milestone?.slug ?? null,
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
