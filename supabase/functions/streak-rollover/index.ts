// Edge function: streak-rollover
// Daily cron. For each member: checks yesterday's 4 rings (water/meals/walks-or-workouts/mindset).
// If yesterday incomplete AND freeze available → consume freeze + notify.
// If yesterday incomplete AND no freeze → reset current_streak to 0 and mirror to visitor_profiles.streak_count.
// After processing, if new streak is a positive multiple of 7 and no freeze held → award one freeze.
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

function yesterdayIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
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
  const y = yesterdayIso();

  const { data: streaks } = await supa
    .from("user_streaks")
    .select("user_id, current_streak, last_active_date")
    .gt("current_streak", 0);

  if (!streaks?.length) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let consumed = 0;
  let reset = 0;
  let awarded = 0;

  for (const s of streaks) {
    const uid = s.user_id as string;
    // Already logged yesterday? Skip.
    if (s.last_active_date === y) {
      // Check for milestone award on yesterday's completed streak.
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
      continue;
    }

    // Yesterday incomplete → check 4 rings from raw logs. Any missing → miss.
    const [water, meals, walks, mindset] = await Promise.all([
      supa.from("water_logs").select("ounces").eq("member_id", uid).eq("log_date", y),
      supa.from("meal_logs").select("vegetables, protein, complex_carbs").eq("member_id", uid).eq("log_date", y),
      supa.from("post_meal_walks").select("slot").eq("member_id", uid).eq("log_date", y),
      supa.from("mindset_reads").select("id").eq("member_id", uid).eq("log_date", y).maybeSingle(),
    ]);
    const waterOk = (water.data ?? []).reduce((n, r: { ounces: number }) => n + (r.ounces || 0), 0) > 0;
    const mealsOk = (meals.data ?? []).some((m: { vegetables: boolean; protein: boolean; complex_carbs: boolean }) =>
      m.vegetables && m.protein && m.complex_carbs,
    );
    const walksOk = (walks.data ?? []).length > 0;
    const mindsetOk = !!mindset.data;
    const anyOpen = !waterOk || !mealsOk || !walksOk || !mindsetOk;

    if (!anyOpen) continue;

    // Freeze?
    const { data: vp } = await supa
      .from("visitor_profiles")
      .select("streak_freeze_available")
      .eq("user_id", uid)
      .maybeSingle();

    const streakBefore = Number(s.current_streak ?? 0);
    if (vp?.streak_freeze_available) {
      // Consume freeze.
      await supa.from("visitor_profiles").update({ streak_freeze_available: false }).eq("user_id", uid);
      await sendNotification(uid, "streak_freeze_used", { streak: streakBefore });
      consumed++;
    } else {
      // Reset.
      await supa
        .from("user_streaks")
        .update({ current_streak: 0, updated_at: new Date().toISOString() })
        .eq("user_id", uid);
      await supa.from("visitor_profiles").update({ streak_count: 0 }).eq("user_id", uid);
      await sendNotification(uid, "streak_broken", { streak: streakBefore });
      reset++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, checked: streaks.length, consumed, reset, awarded }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
