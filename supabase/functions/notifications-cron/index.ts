// Edge function: notifications-cron
// Runs hourly. Dispatches time-based notifications:
//   - good_morning  (8am local UTC for now)
//   - streak_at_risk (8pm UTC, rings not closed)
//   - birthday      (00:00 UTC of user's DOB month/day)
//   - community_mission (random hour per day)
//   - blood_sugar_missing (12pm UTC if no reading)
//
// Idempotency: each notification type checks for an existing notification of
// the same template_key created today for that user before inserting.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_FUNCTION_SECRET")!;

async function sendNotification(
  userId: string,
  templateKey: string,
  vars: Record<string, unknown> = {},
  payload: Record<string, unknown> = {},
) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": INTERNAL_SECRET,
    },
    body: JSON.stringify({ user_id: userId, template_key: templateKey, vars, payload }),
  });
  if (!res.ok) console.error(`send-notification failed: ${res.status} ${await res.text()}`);
}

async function alreadySentToday(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  templateKey: string,
): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("template_key", templateKey)
    .gte("created_at", startOfDay.toISOString())
    .maybeSingle();
  return !!data;
}

function daysSince(date: string | null): number {
  if (!date) return 1;
  const ms = Date.now() - new Date(date).getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // AuthZ: requires internal secret (called by pg_cron)
  if (req.headers.get("x-internal-secret") !== INTERNAL_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date();
  const hourUtc = now.getUTCHours();
  const todayMd = `${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  const stats = { good_morning: 0, streak_at_risk: 0, birthday: 0, community_mission: 0 };

  // Load all members with profile rows
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, first_name, date_of_birth, program_start_date");

  if (!profiles?.length) {
    return new Response(JSON.stringify({ ok: true, stats, note: "no profiles" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Pick a single random hour per day for community_mission (variable reward)
  const dailySeed = `${now.getUTCFullYear()}-${todayMd}`;
  const seedHash = Array.from(dailySeed).reduce((a, c) => a + c.charCodeAt(0), 0);
  const missionHour = 9 + (seedHash % 10); // between 9 and 18 UTC

  // Streak data once
  const userIds = profiles.map((p) => p.user_id);
  const { data: streaks } = await supabase
    .from("user_streaks")
    .select("user_id, current_streak, last_active_date")
    .in("user_id", userIds);
  const streakMap = new Map(streaks?.map((s) => [s.user_id, s]) ?? []);

  // Unanswered community count (snapshot)
  const { count: unansweredCount } = await supabase
    .from("community_questions")
    .select("id", { count: "exact", head: true })
    .eq("answer_count", 0);

  for (const p of profiles) {
    const dayInProgram = daysSince(p.program_start_date);
    const streak = streakMap.get(p.user_id);

    // BIRTHDAY — runs once at 00 UTC
    if (hourUtc === 0 && p.date_of_birth) {
      const dob = new Date(p.date_of_birth);
      const dobMd = `${String(dob.getUTCMonth() + 1).padStart(2, "0")}-${String(dob.getUTCDate()).padStart(2, "0")}`;
      if (dobMd === todayMd && !(await alreadySentToday(supabase, p.user_id, "birthday"))) {
        await sendNotification(p.user_id, "birthday");
        stats.birthday++;
      }
    }

    // GOOD MORNING — 8 UTC
    if (hourUtc === 8 && !(await alreadySentToday(supabase, p.user_id, "good_morning"))) {
      await sendNotification(p.user_id, "good_morning", {
        streak: streak?.current_streak ?? 0,
        action_name: "Today's action",
      });
      stats.good_morning++;
    }

    // STREAK AT RISK — 20 UTC, only if streak is alive AND at least one of
    // today's 4 rings (water/meal/walk/mindset) is still open.
    if (hourUtc === 20 && (streak?.current_streak ?? 0) > 0) {
      const todayStr = now.toISOString().slice(0, 10);
      const [water, meals, walks, mindset] = await Promise.all([
        supabase.from("water_logs").select("ounces").eq("member_id", p.user_id).eq("log_date", todayStr),
        supabase.from("meal_logs").select("vegetables, protein, complex_carbs").eq("member_id", p.user_id).eq("log_date", todayStr),
        supabase.from("post_meal_walks").select("slot").eq("member_id", p.user_id).eq("log_date", todayStr),
        supabase.from("mindset_reads").select("id").eq("member_id", p.user_id).eq("log_date", todayStr).maybeSingle(),
      ]);
      const waterOk = (water.data ?? []).reduce((n: number, r: { ounces: number }) => n + (r.ounces || 0), 0) > 0;
      const mealsOk = (meals.data ?? []).some((m: { vegetables: boolean; protein: boolean; complex_carbs: boolean }) =>
        m.vegetables && m.protein && m.complex_carbs,
      );
      const walksOk = (walks.data ?? []).length > 0;
      const mindsetOk = !!mindset.data;
      const anyOpen = !waterOk || !mealsOk || !walksOk || !mindsetOk;
      if (anyOpen && !(await alreadySentToday(supabase, p.user_id, "streak_at_risk"))) {
        await sendNotification(p.user_id, "streak_at_risk", {
          streak: streak?.current_streak ?? 0,
        });
        stats.streak_at_risk++;
      }
    }


    // COMMUNITY MISSION — random hour, only if unanswered questions exist
    if (hourUtc === missionHour && (unansweredCount ?? 0) > 0) {
      if (!(await alreadySentToday(supabase, p.user_id, "community_mission"))) {
        await sendNotification(p.user_id, "community_mission", {
          n: unansweredCount,
          day: dayInProgram,
        });
        stats.community_mission++;
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, hour: hourUtc, missionHour, stats }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
