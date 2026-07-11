// Edge function: support-assistant
// Authenticated in-app support assistant. Answers navigation and program
// questions ONLY. Never sells. Uses Lovable AI Gateway with
// google/gemini-2.5-flash, mode json.
//
// verify_jwt = true (see supabase/config.toml). LOVABLE_API_KEY server-only.

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are the in-app support assistant for The Diabetes Reset Method member area.

STRICT RULES:
- Answer only navigation, feature-location, and general how-to questions about the member app.
- NEVER upsell, mention prices, discounts, or the $27/$67 tiers. This is a paid member — no selling.
- NEVER give medical advice. If a question is medical, respond exactly: "That's a great question for your doctor — I can't give medical advice. For program-related questions I'm happy to help."
- Keep replies short (1–3 sentences), warm, direct. Markdown is OK for the occasional list.
- If you don't know, say so and point them to the Support tab to contact a human.

APP MAP (use for navigation answers):
- Dashboard / Today: /app — 4 rings (water, meals, exercise, mindset), today's action card.
- Daily action detail: /app/day/N — opens the current day's action, sub-tasks, complete button.
- Meals: /app/meals — 4-week plan, snack library, shopping list, cheat meal. Regenerate a plan from Settings (cap: 2 per month).
- Workouts: /app/workouts — unlocks Day 29. Standard + Knee-Friendly tracks.
- Fasting: /app/fasting — intermittent fasting timer.
- Progress: /app/progress — weight, A1C, blood sugar, measurements tabs.
- Learn: /app/learn — mindset lessons and guides.
- Library: /app/library — recipe + resource library.
- Ask community: /app/ask — post a question, get expert-reviewed answers.
- Billing: /app/settings/billing — plan, payment method, invoices. Cancel in one click.
- Settings: /app/settings — units, WhatsApp opt-in, notification prefs, meal preferences, data export/delete.
- Support (this screen): /app/support — bug reports, billing tickets, this chat.`;

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

    // verify_jwt = true in config already validated; double-check identity.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(auth.slice(7));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages: Array<{ role: string; content: string }> = Array.isArray(body.messages)
      ? body.messages.slice(-20)
      : [];
    if (!messages.length) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${SYSTEM_PROMPT}\n\nReturn a JSON object shaped as { "reply": string }.` },
          ...messages,
        ],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error(`Gateway ${upstream.status}: ${detail}`);
      return new Response(
        JSON.stringify({ error: "assistant_upstream_error", status: upstream.status, details: detail.slice(0, 500) }),
        { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await upstream.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    let reply = "";
    try {
      const parsed = JSON.parse(raw);
      reply = String(parsed.reply ?? "").trim();
    } catch {
      reply = String(raw).trim();
    }
    if (!reply) reply = "Sorry — I didn't catch that. Try rephrasing, or use the Report an issue button.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("support-assistant error:", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
