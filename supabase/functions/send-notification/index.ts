// Edge function: send-notification
// Renders a VITA notification template (Section 16 of spec) and persists it
// to public.notifications for the in-app feed. Honors per-user prefs unless
// the template sets bypassPrefs.
//
// Auth: requires either a logged-in user (acting on themselves), an admin
// user, or the INTERNAL_FUNCTION_SECRET in x-internal-secret header (used by
// cron + other edge functions).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

import { corsFor } from "../_shared/cors.ts";

type Template = {
  /** Body template; supports {first_name}, {streak}, {day}, {action_name}, {water_have}, {water_need}, {n}, {hours}, {level_name}, {level_message}, {unlock_name}, {unlock_desc}, {day_name}, {milestone} */
  body: string;
  title: string;
  /** Maps to notification_prefs key; null = always send (event-driven) */
  prefKey: string | null;
  /** Internal: bypasses quiet-hours/preference gating. Never surfaced to members as "urgent". */
  bypassPrefs?: boolean;
};

const TEMPLATES: Record<string, Template> = {
  daily_action: {
    title: "VITA",
    prefKey: "daily_action",
    body: "VITA says: {first_name}, Day {day} is ready. Today's action is {action_name}. Start when it fits your day.",
  },
  water: {
    title: "VITA",
    prefKey: "water",
    body: "VITA says: {first_name}, you've logged {water_have} oz today. Your current app goal shows {water_need} oz remaining.",
  },
  streak_at_risk: {
    title: "VITA",
    prefKey: "streak_at_risk",
    bypassPrefs: true,
    body: "VITA says: {first_name}, one more completed action will keep your {streak}-day streak going. If today got away from you, you can return tomorrow.",
  },

  streak_7: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: Seven days, {first_name}. You kept returning to your daily actions. Take a moment to notice what helped.",
  },
  streak_14: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: 14 days, {first_name}. You earned a Streak Freeze. It can protect your streak after one missed day.",
  },
  streak_30: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: 30 days, {first_name}. You have a month of practice to learn from.",
  },
  streak_broken: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: Your {streak}-day streak reset, {first_name}. Your past work still counts. Choose one useful action when you're ready.",
  },
  streak_freeze_used: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: Your Streak Freeze protected your {streak}-day streak. Welcome back.",
  },

  blood_sugar_missing: {
    title: "VITA",
    prefKey: "vita_morning",
    body: "VITA says: {first_name}, no blood-sugar reading is logged today. Log one only if it is part of your usual care plan.",
  },
  measurement_7d: {
    title: "VITA",
    prefKey: "measurement",
    body: "VITA says: {first_name}, your Month {n} check-in is in seven days. Use it to review what you recorded, without judging a single number.",
  },
  measurement_1d: {
    title: "VITA",
    prefKey: "measurement",
    bypassPrefs: true,
    body: "VITA says: Your measurement check-in is tomorrow, {first_name}. Measure under similar conditions if you choose to log it.",
  },
  a1c_prompt: {
    title: "VITA",
    prefKey: "a1c",
    body: "VITA says: {first_name}, if an A1C test is already part of your care plan, this may be a good time to check the date with your healthcare team.",
  },
  wrong_direction: {
    title: "VITA",
    prefKey: null,
    bypassPrefs: true,
    body: "VITA says: {first_name}, one or more recent entries changed from last month. Review the log and bring any concerns to your healthcare professional.",
  },
  good_morning: {
    title: "VITA",
    prefKey: "vita_morning",
    body: "VITA says: Good morning, {first_name}. {action_name} is ready when you are.",
  },
  nothing_logged: {
    title: "VITA",
    prefKey: "vita_morning",
    body: "VITA says: {first_name}, nothing is logged today. If you want a fresh start, choose one small action.",
  },
  workout_day: {
    title: "VITA",
    prefKey: "workout",
    body: "VITA says: {first_name}, {action_name} is scheduled for today. Choose the listed modification if you need a gentler option.",
  },
  content_unlocked: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: {first_name}, {unlock_name} is now available. {unlock_desc}",
  },
  level_up: {
    title: "VITA",
    prefKey: "level_up",
    body: "VITA says: {first_name}, you reached {level_name}. {level_message}",
  },
  birthday: {
    title: "VITA",
    prefKey: "birthday",
    body: "VITA says: Happy birthday, {first_name}. We hope you make room for something that feels good today.",
  },
  community_mission: {
    title: "VITA",
    prefKey: "community_mission",
    body: "VITA says: {first_name}, {n} community questions are open. Share only what you are comfortable sharing.",
  },
  community_win_celebrated: {
    title: "VITA",
    prefKey: null,
    body: "VITA says: {first_name}, {n} members reacted to your update.",
  },
  qa_answered: {
    title: "Diabetes Reset Method",
    prefKey: null,
    body: "The DRM team answered your community question. Tap to read the response.",
  },
};

function render(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] === undefined || vars[k] === null ? `{${k}}` : String(vars[k]),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });

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
        headers: { ...corsFor(req), "Content-Type": "application/json" },
      });
    }

    const tpl = TEMPLATES[templateKey];
    if (!tpl) {
      return new Response(JSON.stringify({ error: `unknown template: ${templateKey}` }), {
        status: 400,
        headers: { ...corsFor(req), "Content-Type": "application/json" },
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
          headers: { ...corsFor(req), "Content-Type": "application/json" },
        });
      }
      const { data: userData } = await supabase.auth.getUser(auth.slice(7));
      const callerId = userData?.user?.id;
      if (!callerId) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsFor(req), "Content-Type": "application/json" },
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
            headers: { ...corsFor(req), "Content-Type": "application/json" },
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

    if (tpl.prefKey && !tpl.bypassPrefs) {
      const enabled = profile?.notification_prefs?.[tpl.prefKey];
      if (enabled === false) {
        return new Response(JSON.stringify({ ok: true, skipped: "pref_disabled" }), {
          headers: { ...corsFor(req), "Content-Type": "application/json" },
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
      headers: { ...corsFor(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-notification error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsFor(req), "Content-Type": "application/json" },
    });
  }
});
