// Edge function: select-question-of-day
// Runs daily at 02:00 UTC. Picks the Question of the Day using this fallback chain:
//   1. Highest upvoted unanswered question in the last 24 hours
//   2. Highest "Me too!" count unanswered question in the last 7 days
//   3. Leave for admin manual pin (no-op)
//   4. Skip the day
// An admin manual pin (AdminCommunity → setQotD) sets question_of_day_date = today
// and naturally wins because this cron exits early if a QotD already exists for today.
//
// Auth: CRON_SECRET header OR service-role.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Allow either CRON_SECRET (cron caller) or admin user (manual trigger from UI)
    const cronHeader = req.headers.get("x-cron-secret");
    const isCron = cronHeader && cronHeader === CRON_SECRET;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (!isCron) {
      const auth = req.headers.get("Authorization") ?? "";
      if (!auth) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: auth } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
      const { data: isAdmin } = await admin.rpc("has_role", { p_user_id: user.id, p_role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    console.log("[select-qotd] running for", today, "cron=", !!isCron);

    // If a QotD already exists for today (e.g. admin manual pin), respect it.
    const { data: existing } = await admin
      .from("community_questions")
      .select("id, content")
      .eq("question_of_day_date", today)
      .eq("is_question_of_day", true)
      .maybeSingle();

    if (existing) {
      console.log("[select-qotd] existing pin wins:", existing.id);
      return new Response(
        JSON.stringify({ ok: true, source: "existing", question_id: existing.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Step 1: highest upvoted unanswered in last 24h
    const { data: step1 } = await admin
      .from("community_questions")
      .select("id, content, upvote_count, metoo_count, answer_count, created_at")
      .eq("is_verified_answered", false)
      .eq("answer_count", 0)
      .gte("created_at", since24h)
      .order("upvote_count", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);

    let chosen = step1?.[0] && step1[0].upvote_count > 0 ? step1[0] : null;
    let source = "step1_upvotes_24h";

    // Step 2: highest "Me too!" unanswered in last 7d
    if (!chosen) {
      const { data: step2 } = await admin
        .from("community_questions")
        .select("id, content, upvote_count, metoo_count, answer_count, created_at")
        .eq("is_verified_answered", false)
        .eq("answer_count", 0)
        .gte("created_at", since7d)
        .order("metoo_count", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1);
      if (step2?.[0] && step2[0].metoo_count > 0) {
        chosen = step2[0];
        source = "step2_metoo_7d";
      }
    }

    if (!chosen) {
      console.log("[select-qotd] no candidate — skipping the day");
      return new Response(
        JSON.stringify({ ok: true, source: "step4_skip", question_id: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Clear any stale today flag, then pin chosen
    await admin
      .from("community_questions")
      .update({ is_question_of_day: false, question_of_day_date: null })
      .eq("question_of_day_date", today);

    const { error: ue } = await admin
      .from("community_questions")
      .update({ is_question_of_day: true, question_of_day_date: today })
      .eq("id", chosen.id);
    if (ue) throw new Error(ue.message);

    console.log("[select-qotd] pinned", chosen.id, "via", source);
    return new Response(
      JSON.stringify({ ok: true, source, question_id: chosen.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[select-qotd] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
