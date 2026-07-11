// Edge function: notifications-cron
// Runs hourly. Dispatches time-based notifications:
//   - good_morning       (8am UTC — global fallback)
//   - streak_at_risk     (local 20:00 per member timezone, when a ring is still open)
//   - birthday           (00:00 UTC of user's DOB month/day)
//   - community_mission  (random hour per day, UTC)
//
// Idempotency: each notification type checks for an existing notification of
// the same template_key created today for that user before inserting.
// For streak_at_risk, dedupe is scoped to the member's LOCAL date.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_FUNCTION_SECRET")!;
const FALLBACK_TZ = "America/New_York";

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

async function alreadySentTodayUtc(
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

// Returns { hour, dateISO } in the given IANA timezone for `now`.
function localParts(now: Date, tz: string): { hour: number; dateISO: string } {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const y = get("year");
    const m = get("month");
    const d = get("day");
    let h = parseInt(get("hour") || "0", 10);
    if (h === 24) h = 0;
    return { hour: h, dateISO: `${y}-${m}-${d}` };
  } catch {
    const fallback = new Intl.DateTimeFormat("en-CA", {
      timeZone: FALLBACK_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    });
    const parts = fallback.formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    let h = parseInt(get("hour") || "0", 10);
    if (h === 24) h = 0;
    return { hour: h, dateISO: `${get("year")}-${get("month")}-${get("day")}` };
  }
}

async function alreadySentOnLocalDate(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  templateKey: string,
  tz: string,
  localDateISO: string,
): Promise<boolean> {
  // Look back 48h of rows for this user+template; check any local date match.
  const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("notifications")
    .select("created_at")
    .eq("user_id", userId)
    .eq("template_key", templateKey)
    .gte("created_at", twoDaysAgo);
  return (data ?? []).some((row: { created_at: string }) => {
    const d = localParts(new Date(row.created_at), tz).dateISO;
    return d === localDateISO;
  });
}

function daysSince(date: string | null): number {
  if (!date) return 1;
  const ms = Date.now() - new Date(date).getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, first_name, date_of_birth, program_start_date, timezone");

  if (!profiles?.length) {
    return new Response(JSON.stringify({ ok: true, stats, note: "no profiles" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const dailySeed = `${now.getUTCFullYear()}-${todayMd}`;
  const seedHash = Array.from(dailySeed).reduce((a, c) => a + c.charCodeAt(0), 0);
  const missionHour = 9 + (seedHash % 10);

  const userIds = profiles.map((p) => p.user_id);
  const { data: streaks } = await supabase
    .from("user_streaks")
    .select("user_id, current_streak, last_active_date")
    .in("user_id", userIds);
  const streakMap = new Map(streaks?.map((s) => [s.user_id, s]) ?? []);

  const { count: unansweredCount } = await supabase
    .from("community_questions")
    .select("id", { count: "exact", head: true })
    .eq("answer_count", 0);

  const todayUtcStr = now.toISOString().slice(0, 10);

  for (const p of profiles) {
    const dayInProgram = daysSince(p.program_start_date);
    const streak = streakMap.get(p.user_id);
    const tz = (p as { timezone?: string | null }).timezone || FALLBACK_TZ;
    const local = localParts(now, tz);

    // BIRTHDAY — UTC 00, unchanged
    if (hourUtc === 0 && p.date_of_birth) {
      const dob = new Date(p.date_of_birth);
      const dobMd = `${String(dob.getUTCMonth() + 1).padStart(2, "0")}-${String(dob.getUTCDate()).padStart(2, "0")}`;
      if (dobMd === todayMd && !(await alreadySentTodayUtc(supabase, p.user_id, "birthday"))) {
        await sendNotification(p.user_id, "birthday");
        stats.birthday++;
      }
    }

    // GOOD MORNING — UTC 8, unchanged
    if (hourUtc === 8 && !(await alreadySentTodayUtc(supabase, p.user_id, "good_morning"))) {
      await sendNotification(p.user_id, "good_morning", {
        streak: streak?.current_streak ?? 0,
        action_name: "Today's action",
      });
      stats.good_morning++;
    }

    // STREAK AT RISK — per-user local 20:00; evaluate member's local today.
    if (local.hour === 20 && (streak?.current_streak ?? 0) > 0) {
      // Use UTC "today" for log lookups. This is a small approximation: log
      // rows are already keyed by log_date at write time in the member's
      // local view of "today", so scanning today+yesterday is safer.
      const logDates = [todayUtcStr];
      // Include yesterday when timezone is west of UTC and its local date
      // is still one behind UTC.
      const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10);
      if (local.dateISO !== todayUtcStr) logDates.push(local.dateISO, yesterday);

      const [water, meals, walks, mindset] = await Promise.all([
        supabase.from("water_logs").select("ounces, log_date").eq("member_id", p.user_id).in("log_date", logDates),
        supabase.from("meal_logs").select("vegetables, protein, complex_carbs, log_date").eq("member_id", p.user_id).in("log_date", logDates),
        supabase.from("post_meal_walks").select("slot, log_date").eq("member_id", p.user_id).in("log_date", logDates),
        supabase.from("mindset_reads").select("id, log_date").eq("member_id", p.user_id).in("log_date", logDates),
      ]);
      // Restrict to rows matching the member's local today.
      const localToday = local.dateISO;
      const waterRows = (water.data ?? []).filter((r: { log_date: string }) => r.log_date === localToday);
      const mealRows = (meals.data ?? []).filter((r: { log_date: string }) => r.log_date === localToday);
      const walkRows = (walks.data ?? []).filter((r: { log_date: string }) => r.log_date === localToday);
      const mindsetRows = (mindset.data ?? []).filter((r: { log_date: string }) => r.log_date === localToday);

      const waterOk = waterRows.reduce((n: number, r: { ounces: number }) => n + (r.ounces || 0), 0) > 0;
      const mealsOk = mealRows.some((m: { vegetables: boolean; protein: boolean; complex_carbs: boolean }) =>
        m.vegetables && m.protein && m.complex_carbs,
      );
      const walksOk = walkRows.length > 0;
      const mindsetOk = mindsetRows.length > 0;
      const anyOpen = !waterOk || !mealsOk || !walksOk || !mindsetOk;

      if (anyOpen && !(await alreadySentOnLocalDate(supabase, p.user_id, "streak_at_risk", tz, localToday))) {
        await sendNotification(p.user_id, "streak_at_risk", {
          streak: streak?.current_streak ?? 0,
        });
        stats.streak_at_risk++;
      }
    }

    // COMMUNITY MISSION — random UTC hour
    if (hourUtc === missionHour && (unansweredCount ?? 0) > 0) {
      if (!(await alreadySentTodayUtc(supabase, p.user_id, "community_mission"))) {
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
