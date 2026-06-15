// Edge function: send-notification
// Renders a VITA notification template (Section 16 of spec) and persists it
// to public.notifications for the in-app feed. Honors per-user prefs unless
// the template is marked urgent.
//
// Auth: requires either a logged-in user (acting on themselves), an admin
// user, or the INTERNAL_FUNCTION_SECRET in x-internal-secret header (used by
// cron + other edge functions).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Template = {
  /** Body template; supports {first_name}, {streak}, {day}, {action_name}, {water_have}, {water_need}, {n}, {hours}, {level_name}, {level_message}, {unlock_name}, {unlock_desc}, {day_name}, {milestone} */
  body: string;
  title: string;
  /** Maps to notification_prefs key; null = always send (urgent / event) */
  prefKey: string | null;
  urgent?: boolean;
};

const TEMPLATES: Record<string, Template> = {
  daily_action: {
    title: "VITA",
    prefKey: "daily_action",
    body: "VITA says: {first_name}, Day {day} is waiting. Today is {action_name}. It takes less time than you think.",
  },
  water: {
    title: "VITA",
    prefKey: "water",
    body: "VITA says: {first_name}, you've had {water_have}oz of water today. You need {water_need}oz more. Your cells are filing a complaint.",
  },
  streak_at_risk: {
    title: "VITA",
    prefKey: "streak_at_risk",
    urgent: true,
    body: "VITA says: {streak}-day streak. {first_name}, you have until midnight. Four rings. You've done this before.",
  },
  streak_7: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: Seven days, {first_name}. Research shows you are now 3.6 times more likely to stay with this. You're in the zone.",
  },
  streak_14: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: 14 days, {first_name}. You've earned your first Streak Freeze. It's saved — one missed day won't break what you've built.",
  },
  streak_30: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: 30 days. {first_name}, that's a habit. Not a trial run. A habit.",
  },
  streak_broken: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: Your {streak}-day streak reset, {first_name}. That's okay. Every expert has a Day 1 in their past. New one starts now.",
  },
  blood_sugar_missing: {
    title: "VITA",
    prefKey: "vita_morning",
    body: "VITA says: {first_name}, your blood sugar hasn't been logged yet today. Even a bad number is useful information.",
  },
  measurement_7d: {
    title: "VITA",
    prefKey: "measurement",
    body: "VITA says: {first_name}, your Month {n} check-in is in 7 days. Keep going — the numbers are going to say something good.",
  },
  measurement_1d: {
    title: "VITA",
    prefKey: "measurement",
    urgent: true,
    body: "VITA says: Tomorrow is measurement day, {first_name}. Get the tape measure ready. This is the moment you prove your effort.",
  },
  a1c_prompt: {
    title: "VITA",
    prefKey: "a1c",
    body: "VITA says: {first_name}, you're at {day} days. Book an A1C test this week. You've earned that conversation with your doctor.",
  },
  wrong_direction: {
    title: "VITA",
    prefKey: null,
    urgent: true,
    body: "VITA says: {first_name}, we noticed your numbers moved unexpectedly this month. I want to understand what happened. Can we talk about it?",
  },
  cheat_meal_window: {
    title: "VITA",
    prefKey: "cheat_meal",
    body: "VITA says: It's {day_name}, {first_name}. Your cheat meal is available tonight — last meal of the day, then the fast begins. Make it worth it.",
  },
  if_fast_start: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: {first_name}, your {hours}-hour fasting window starts now. Water, plain tea, and the knowledge that this is working.",
  },
  if_fast_complete: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: Fast complete, {first_name}. {hours} hours. That's another metabolic win.",
  },
  good_morning: {
    title: "VITA",
    prefKey: "vita_morning",
    body: "VITA says: Morning, {first_name}. Your {streak}-day streak is intact. {action_name} is ready for you.",
  },
  nothing_logged: {
    title: "VITA",
    prefKey: "vita_morning",
    body: "VITA says: {first_name}, we noticed you haven't logged anything today. Your blood sugar doesn't take days off either. Just saying.",
  },
  workout_day: {
    title: "VITA",
    prefKey: "workout",
    body: "VITA says: {first_name}, {action_name} is scheduled for today. Your muscles are ready. The Epsom salt for tonight is optional but recommended.",
  },
  content_unlocked: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: {first_name}, you've unlocked {unlock_name}. {unlock_desc}. It's waiting for you.",
  },
  level_up: {
    title: "VITA",
    prefKey: "level_up",
    body: "VITA says: {first_name}, you just reached {level_name}. {level_message}. This is permanent.",
  },
  birthday: {
    title: "VITA",
    prefKey: "birthday",
    body: "VITA says: Happy birthday, {first_name}. Today there's no tracking. Just celebrating.",
  },
  community_mission: {
    title: "VITA",
    prefKey: "community_mission",
    body: "VITA says: {first_name}, {n} questions in the community need your experience. Day {day} in the program — you've been through this.",
  },
  community_win_celebrated: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: {first_name}, {n} members just celebrated your {milestone}. That's real.",
  },
  qa_answered: {
    title: "Diabetes Reset Method",
    prefKey: null,
    body: "The Diabetes Reset Method team answered your question in the community. Tap to see their response.",
  },
};

function render(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] === undefined || vars[k] === null ? `{${k}}` : String(vars[k]),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id ?? "");
    const templateKey = String(body.template_key ?? "");
    const vars: Record<string, unknown> = body.vars ?? {};
    const payload: Record<string, unknown> = body.payload ?? {};

    if (!userId || !templateKey) {
      return new Response(JSON.stringify({ error: "user_id and template_key required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tpl = TEMPLATES[templateKey];
    if (!tpl) {
      return new Response(JSON.stringify({ error: `unknown template: ${templateKey}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AuthZ: internal secret OR caller is target user OR caller is admin
    const internalSecret = req.headers.get("x-internal-secret");
    const isInternal =
      internalSecret && internalSecret === Deno.env.get("INTERNAL_FUNCTION_SECRET");

    if (!isInternal) {
      const auth = req.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: userData } = await supabase.auth.getUser(auth.slice(7));
      const callerId = userData?.user?.id;
      if (!callerId) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (callerId !== userId) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", callerId)
          .eq("role", "admin")
          .maybeSingle();
        if (!roleRow) {
          return new Response(JSON.stringify({ error: "forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Load profile (for first_name default + preference check)
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, notification_prefs")
      .eq("user_id", userId)
      .maybeSingle();

    if (tpl.prefKey && !tpl.urgent) {
      const enabled = profile?.notification_prefs?.[tpl.prefKey];
      if (enabled === false) {
        return new Response(JSON.stringify({ ok: true, skipped: "pref_disabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const fullVars = { first_name: profile?.first_name ?? "there", ...vars };
    const rendered = render(tpl.body, fullVars);

    const { data: inserted, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        template_key: templateKey,
        title: tpl.title,
        body: rendered,
        payload,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, notification: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-notification error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
