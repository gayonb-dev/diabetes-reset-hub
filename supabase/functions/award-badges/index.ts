// Edge function: award-badges
// Idempotently evaluates program + community badge criteria for a user, inserts
// missing rows into user_badges, mirrors slugs into visitor_profiles, and drops
// a bell notification per newly-earned badge.
//
// Identity resolution:
//  - Service-role caller (matching SUPABASE_SERVICE_ROLE_KEY) → uses body.user_id.
//  - Otherwise → derives user_id from the caller's JWT. body.user_id is IGNORED.
//    Client callers (Ask.tsx etc.) never assert identity in the payload.

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

type SB = SupabaseClient;

function isoDate(d: Date | string): string {
  return typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

async function programDayFor(admin: SB, uid: string): Promise<number> {
  const { data } = await admin.rpc("current_program_day", { p_user_id: uid });
  return Number(data ?? 1);
}

/** For a given historical date, derive that day's program-day number. */
async function programStartDate(admin: SB, uid: string): Promise<Date> {
  const { data: p } = await admin
    .from("profiles").select("program_start_date").eq("user_id", uid).maybeSingle();
  if (p?.program_start_date) return new Date(p.program_start_date as string);
  const { data: s } = await admin
    .from("subscriptions").select("created_at").eq("user_id", uid)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (s?.created_at) return new Date(s.created_at as string);
  return new Date();
}

function dayNumberOn(logDate: string, startISO: Date): number {
  const start = new Date(Date.UTC(startISO.getUTCFullYear(), startISO.getUTCMonth(), startISO.getUTCDate()));
  const d = new Date(logDate + "T00:00:00Z");
  return Math.max(1, Math.floor((d.getTime() - start.getTime()) / 86400000) + 1);
}

/** Evaluate every qualifying slug for this user, given current data. */
async function evaluateSlugs(admin: SB, uid: string): Promise<string[]> {
  const slugs = new Set<string>();
  const add = (s: string, cond: boolean) => { if (cond) slugs.add(s); };
  const startDate = await programStartDate(admin, uid);
  const programDay = await programDayFor(admin, uid);

  const { data: streakRow } = await admin
    .from("user_streaks").select("current_streak, longest_streak").eq("user_id", uid).maybeSingle();
  const streak = Math.max(streakRow?.current_streak ?? 0, streakRow?.longest_streak ?? 0);

  const existsRow = async (table: string, col: string, val: unknown, extra?: Record<string, unknown>) => {
    let q = admin.from(table).select("id", { head: true, count: "exact" }).eq(col, val);
    if (extra) for (const [k, v] of Object.entries(extra)) q = q.eq(k, v);
    const { count } = await q;
    return (count ?? 0) > 0;
  };

  // Program-day thresholds
  add("14-day-foundation", programDay >= 15);
  add("90-day-warrior", programDay >= 90);
  add("full-6-months", programDay >= 180);
  add("day-90-wisdom", programDay >= 90);
  add("day-180-wisdom", programDay >= 180);
  add("day-270-wisdom", programDay >= 270);

  // Streak-derived
  add("week-one-warrior", streak >= 7);
  add("freeze-earned", streak >= 14);
  add("thirty-day-streak", streak >= 30);

  // Simple existence
  add("first-drop", await existsRow("blood_sugar_readings", "member_id", uid));
  add("a1c-entry", await existsRow("a1c_logs", "member_id", uid));
  add("move-it", await existsRow("workout_sessions", "user_id", uid, { status: "completed" }));
  add("night-faster", await existsRow("if_fasting_log", "member_id", uid, { status: "completed" }));
  add("win-sharer", await existsRow("win_posts", "author_id", uid));
  add("first-question", await existsRow("community_questions", "author_id", uid));

  // voice-of-the-community: ≥5 of user's questions have an admin response
  // (matches badge copy: "5 questions received DRM admin responses").
  // VITA (AI) and verified peer answers do NOT count.
  {
    const { data: myQs } = await admin
      .from("community_questions").select("id").eq("author_id", uid);
    const qIds = (myQs ?? []).map((q: { id: string }) => q.id);
    if (qIds.length) {
      const { data: ansRows } = await admin
        .from("community_answers")
        .select("question_id")
        .in("question_id", qIds)
        .eq("is_admin_response", true);
      const voiceCount = new Set(
        (ansRows ?? []).map((r: { question_id: string }) => r.question_id),
      ).size;
      add("voice-of-the-community", voiceCount >= 5);
    }
  }

  // full-plate
  const { count: fullPlate } = await admin
    .from("meal_logs").select("id", { head: true, count: "exact" })
    .eq("member_id", uid).eq("vegetables", true).eq("protein", true).eq("complex_carbs", true);
  add("full-plate", (fullPlate ?? 0) > 0);

  // hydrated — any day ≥ 64 oz total water
  const { data: waterRows } = await admin
    .from("water_logs").select("log_date, ounces").eq("member_id", uid);
  const waterByDay = new Map<string, number>();
  (waterRows ?? []).forEach((r: { log_date: string; ounces: number | null }) => {
    waterByDay.set(r.log_date, (waterByDay.get(r.log_date) ?? 0) + (r.ounces ?? 0));
  });
  add("hydrated", Array.from(waterByDay.values()).some((v) => v >= 64));

  // cheat-and-fast
  const cheat = await existsRow("cheat_meals", "member_id", uid);
  const fast = await existsRow("if_fasting_log", "member_id", uid, { status: "completed" });
  add("cheat-and-fast", cheat && fast);

  // month-1-complete: any member_measurements + program day ≥ 30
  add("month-1-complete", programDay >= 30 && (await existsRow("member_measurements", "member_id", uid)));

  // featured: any of user's questions currently pinned as QotD
  const { count: featuredCount } = await admin
    .from("community_questions").select("id", { head: true, count: "exact" })
    .eq("author_id", uid).eq("is_question_of_day", true);
  add("featured", (featuredCount ?? 0) > 0);

  // helper: any own community_answers with helpful_count > 0
  const { count: helperCount } = await admin
    .from("community_answers").select("id", { head: true, count: "exact" })
    .eq("author_id", uid).gt("helpful_count", 0);
  add("helper", (helperCount ?? 0) > 0);

  // A1C-derived
  const { data: a1cRows } = await admin
    .from("a1c_logs").select("value_percent, measured_on")
    .eq("member_id", uid).order("measured_on", { ascending: true });
  if ((a1cRows?.length ?? 0) > 0) {
    const first = Number(a1cRows![0].value_percent);
    const last = Number(a1cRows![a1cRows!.length - 1].value_percent);
    add("dropping", first - last >= 0.5);
    add("pre-diabetic-zone", last < 6.5);
    add("normal-zone", last < 5.7);
  }

  // weight-milestone: earliest weight vs any later weight, drop ≥ 5 lb
  const { data: weightRows } = await admin
    .from("health_logs").select("weight, log_date")
    .eq("user_id", uid).not("weight", "is", null)
    .order("log_date", { ascending: true });
  if ((weightRows?.length ?? 0) >= 2) {
    const baseline = Number(weightRows![0].weight);
    add("weight-milestone", weightRows!.some((r: { weight: number }) => baseline - Number(r.weight) >= 5));
  }

  // full-house — 7 consecutive log dates where all 4 rings closed.
  // Rings per date:
  //   water:  SUM(water_logs.ounces) ≥ round(weight_lb / 2), min floor 64
  //   meals:  3 fully-compliant meal_logs (breakfast/lunch/dinner)
  //   move:   day 15–28 → 3 walks; day ≥ 29 → walk OR completed workout;
  //           day ≤ 14 → walk OR completed workout
  //   mind:   any mindset_reads row
  {
    const [{ data: meals }, { data: walks }, { data: workouts }, { data: minds }] = await Promise.all([
      admin.from("meal_logs").select("log_date, meal_type, vegetables, protein, complex_carbs").eq("member_id", uid),
      admin.from("post_meal_walks").select("log_date, slot").eq("member_id", uid),
      admin.from("workout_sessions").select("completed_at, status").eq("user_id", uid).eq("status", "completed"),
      admin.from("mindset_reads").select("log_date").eq("member_id", uid),
    ]);

    const mealSet = new Map<string, Set<string>>();
    (meals ?? []).forEach((m: { log_date: string; meal_type: string; vegetables: boolean; protein: boolean; complex_carbs: boolean }) => {
      if (m.vegetables && m.protein && m.complex_carbs) {
        const s = mealSet.get(m.log_date) ?? new Set<string>();
        s.add(m.meal_type);
        mealSet.set(m.log_date, s);
      }
    });
    const walkCount = new Map<string, Set<string>>();
    (walks ?? []).forEach((w: { log_date: string; slot: string }) => {
      const s = walkCount.get(w.log_date) ?? new Set<string>();
      s.add(w.slot);
      walkCount.set(w.log_date, s);
    });
    const workoutDays = new Set<string>();
    (workouts ?? []).forEach((w: { completed_at: string | null }) => {
      if (w.completed_at) workoutDays.add(isoDate(w.completed_at));
    });
    const mindDays = new Set<string>((minds ?? []).map((r: { log_date: string }) => r.log_date));

    // weight timeline for water target per date
    const weightTimeline: Array<{ date: string; weight: number }> =
      (weightRows ?? []).map((r: { log_date: string; weight: number }) => ({
        date: r.log_date, weight: Number(r.weight),
      }));
    const weightOn = (day: string): number => {
      let latest = 0;
      for (const w of weightTimeline) {
        if (w.date <= day) latest = w.weight; else break;
      }
      return latest;
    };

    // Candidate dates = union of every ring-log date
    const allDays = new Set<string>();
    waterByDay.forEach((_, d) => allDays.add(d));
    mealSet.forEach((_, d) => allDays.add(d));
    walkCount.forEach((_, d) => allDays.add(d));
    workoutDays.forEach((d) => allDays.add(d));
    mindDays.forEach((d) => allDays.add(d));

    const closedDay = (day: string): boolean => {
      const waterOz = waterByDay.get(day) ?? 0;
      const w = weightOn(day);
      const target = w > 0 ? Math.max(64, Math.round(w / 2)) : 64;
      if (waterOz < target) return false;

      const meals3 = (mealSet.get(day)?.size ?? 0) >= 3;
      if (!meals3) return false;

      const dnum = dayNumberOn(day, startDate);
      let moveOk = false;
      if (dnum >= 15 && dnum <= 28) {
        moveOk = (walkCount.get(day)?.size ?? 0) >= 3;
      } else {
        moveOk = (walkCount.get(day)?.size ?? 0) >= 1 || workoutDays.has(day);
      }
      if (!moveOk) return false;

      if (!mindDays.has(day)) return false;
      return true;
    };

    // Look for 7 consecutive closed days
    const sortedDays = Array.from(allDays).sort();
    let run = 0;
    let prev: string | null = null;
    for (const d of sortedDays) {
      if (!closedDay(d)) { run = 0; prev = d; continue; }
      if (prev) {
        const gap = (new Date(d + "T00:00:00Z").getTime() - new Date(prev + "T00:00:00Z").getTime()) / 86400000;
        run = gap === 1 || run === 0 ? (gap === 1 ? run + 1 : 1) : 1;
      } else {
        run = 1;
      }
      prev = d;
      if (run >= 7) { slugs.add("full-house"); break; }
    }
  }

  return Array.from(slugs);
}

async function awardMissingBadges(admin: SB, uid: string, notify = true) {
  const eligible = await evaluateSlugs(admin, uid);
  if (eligible.length === 0) return { newly: [] as string[] };

  const { data: badges } = await admin
    .from("badges").select("id, slug, name, description, category, xp_reward").in("slug", eligible);
  if (!badges?.length) return { newly: [] as string[] };

  const { data: existing } = await admin
    .from("user_badges").select("badge_id").eq("user_id", uid);
  const existingIds = new Set((existing ?? []).map((r: { badge_id: string }) => r.badge_id));

  const toInsert = badges.filter((b) => !existingIds.has(b.id));
  if (toInsert.length === 0) return { newly: [] as string[] };

  const { error: insErr } = await admin
    .from("user_badges").insert(toInsert.map((b) => ({ user_id: uid, badge_id: b.id })));
  if (insErr) { console.error("[award-badges] insert error", insErr); return { newly: [] }; }

  // Mirror slugs into visitor_profiles
  const { data: vp } = await admin
    .from("visitor_profiles").select("badges_earned, community_badges_earned")
    .eq("user_id", uid).maybeSingle();
  const prog = new Set(((vp?.badges_earned as string[]) ?? []));
  const comm = new Set(((vp?.community_badges_earned as string[]) ?? []));
  toInsert.forEach((b) => { (b.category === "community" ? comm : prog).add(b.slug); });
  await admin.from("visitor_profiles").update({
    badges_earned: Array.from(prog),
    community_badges_earned: Array.from(comm),
  }).eq("user_id", uid);

  for (const b of toInsert) {
    if (b.xp_reward) await admin.rpc("award_xp", { p_user_id: uid, p_amount: b.xp_reward });
    if (notify) {
      await admin.from("notifications").insert({
        user_id: uid, template_key: "badge_unlocked",
        title: "Badge unlocked",
        body: `${b.name} — ${b.description ?? ""}`.trim(),
        payload: { slug: b.slug, category: b.category },
      });
    }
  }

  return { newly: toInsert.map((b) => b.slug) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const authHeader = req.headers.get("Authorization") ?? "";
    const apiKey = req.headers.get("apikey") ?? "";
    const isServiceRole =
      authHeader === `Bearer ${SERVICE_ROLE}` || apiKey === SERVICE_ROLE;

    const body = await req.json().catch(() => ({} as { user_id?: string; notify?: boolean }));

    let uid: string | null = null;
    if (isServiceRole) {
      if (typeof body.user_id === "string" && body.user_id) uid = body.user_id;
    } else {
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      uid = user.id;
    }
    if (!uid) {
      return new Response(JSON.stringify({ error: "missing user_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notify = body.notify !== false;
    const result = await awardMissingBadges(admin, uid, notify);
    return new Response(JSON.stringify({ ok: true, newly: result.newly }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[award-badges] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
