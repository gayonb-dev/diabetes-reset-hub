// Edge function: streak-rollover
// Hourly cron. For each member with an active streak: if their local time is 3am,
// evaluate their LOCAL yesterday's 4 rings. If yesterday incomplete AND freeze
// available → consume freeze + notify. Else reset current_streak to 0 and mirror.
// After processing, if streak is a positive multiple of 7 and no freeze held →
// award one freeze. Dedupe by user_streaks.last_rollover_date == local yesterday.
//
// verify_jwt = false — gated by x-internal-secret header. Service-role client.

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INTERNAL_SECRET = Deno.env.get("INTERNAL_FUNCTION_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FALLBACK_TZ = "America/New_York";

function localHourAndYesterday(now: Date, tz: string): { hour: number; yesterdayISO: string; todayISO: string } {
  const parts = (zone: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(now);
  let p: Intl.DateTimeFormatPart[];
  try {
    p = parts(tz);
  } catch {
    p = parts(FALLBACK_TZ);
  }
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  let h = parseInt(get("hour") || "0", 10);
  if (h === 24) h = 0;
  const todayISO = `${get("year")}-${get("month")}-${get("day")}`;
  const y = new Date(`${todayISO}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  const yesterdayISO = y.toISOString().slice(0, 10);
  return { hour: h, yesterdayISO, todayISO };
}

async function sendNotification(userId: string, templateKey: string, vars: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({ user_id: userId, template_key: templateKey, vars }),
    });
  } catch (e) {
    console.error("notif dispatch failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.headers.get("x-internal-secret") !== INTERNAL_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date();

  const { data: streaks } = await supa
    .from("user_streaks")
    .select("user_id, current_streak, last_active_date, last_rollover_date")
    .gt("current_streak", 0);

  if (!streaks?.length) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userIds = streaks.map((s) => s.user_id as string);
  const { data: profs } = await supa
    .from("profiles")
    .select("user_id, timezone")
    .in("user_id", userIds);
  const tzMap = new Map<string, string>();
  for (const pr of profs ?? []) tzMap.set(pr.user_id as string, ((pr as { timezone?: string | null }).timezone) || FALLBACK_TZ);

  let processed = 0;
  let consumed = 0;
  let reset = 0;
  let awarded = 0;
  let skippedHour = 0;
  let skippedDedupe = 0;

  for (const s of streaks) {
    const uid = s.user_id as string;
    const tz = tzMap.get(uid) || FALLBACK_TZ;
    const { hour, yesterdayISO } = localHourAndYesterday(now, tz);

    if (hour !== 3) { skippedHour++; continue; }
    if ((s as { last_rollover_date?: string | null }).last_rollover_date === yesterdayISO) { skippedDedupe++; continue; }

    processed++;

    // Already logged yesterday? Then it was a clean day — set last_rollover and
    // check milestone award.
    if (s.last_active_date === yesterdayISO) {
      const cur = Number(s.current_streak ?? 0);
      if (cur > 0 && cur % 7 === 0) {
        const { data: vp } = await supa
          .from("visitor_profiles")
          .select("streak_freeze_available")
          .eq("user_id", uid)
          .maybeSingle();
        if (vp && !vp.streak_freeze_available) {
          await supa.from("visitor_profiles").update({ streak_freeze_available: true }).eq("user_id", uid);
          awarded++;
        }
      }
      await supa.from("user_streaks").update({ last_rollover_date: yesterdayISO }).eq("user_id", uid);
      continue;
    }

    // Yesterday incomplete → check 4 rings from raw logs. Any missing → miss.
    const [water, meals, walks, mindset] = await Promise.all([
      supa.from("water_logs").select("ounces").eq("member_id", uid).eq("log_date", yesterdayISO),
      supa.from("meal_logs").select("vegetables, protein, complex_carbs").eq("member_id", uid).eq("log_date", yesterdayISO),
      supa.from("post_meal_walks").select("slot").eq("member_id", uid).eq("log_date", yesterdayISO),
      supa.from("mindset_reads").select("id").eq("member_id", uid).eq("log_date", yesterdayISO).maybeSingle(),
    ]);
    const waterOk = (water.data ?? []).reduce((n, r: { ounces: number }) => n + (r.ounces || 0), 0) > 0;
    const mealsOk = (meals.data ?? []).some((m: { vegetables: boolean; protein: boolean; complex_carbs: boolean }) =>
      m.vegetables && m.protein && m.complex_carbs,
    );
    const walksOk = (walks.data ?? []).length > 0;
    const mindsetOk = !!mindset.data;
    const anyOpen = !waterOk || !mealsOk || !walksOk || !mindsetOk;

    if (!anyOpen) {
      await supa.from("user_streaks").update({ last_rollover_date: yesterdayISO }).eq("user_id", uid);
      continue;
    }

    const { data: vp } = await supa
      .from("visitor_profiles")
      .select("streak_freeze_available")
      .eq("user_id", uid)
      .maybeSingle();

    const streakBefore = Number(s.current_streak ?? 0);
    if (vp?.streak_freeze_available) {
      await supa.from("visitor_profiles").update({ streak_freeze_available: false }).eq("user_id", uid);
      await sendNotification(uid, "streak_freeze_used", { streak: streakBefore });
      consumed++;
    } else {
      await supa
        .from("user_streaks")
        .update({ current_streak: 0, updated_at: new Date().toISOString() })
        .eq("user_id", uid);
      await supa.from("visitor_profiles").update({ streak_count: 0 }).eq("user_id", uid);
      await sendNotification(uid, "streak_broken", { streak: streakBefore });
      reset++;
    }
    await supa.from("user_streaks").update({ last_rollover_date: yesterdayISO }).eq("user_id", uid);
  }

  return new Response(
    JSON.stringify({ ok: true, checked: streaks.length, processed, consumed, reset, awarded, skippedHour, skippedDedupe }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
