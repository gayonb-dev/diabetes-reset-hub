// Phase C2 — Compute engagement scores nightly.
// score = 0.30 spend + 0.25 content + 0.20 conversation + 0.15 recency + 0.10 consistency
// All sub-scores normalized 0..1. Results upserted into visitor_engagement_scores
// keyed by visitor_profile_id. Reads from activity_events + orders.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DAY = 86_400_000;

function expDecay(days: number, halfLife = 14) {
  return Math.pow(0.5, Math.max(0, days) / halfLife);
}
function logNorm(x: number, cap = 2000) {
  if (x <= 0) return 0;
  return Math.min(1, Math.log10(1 + x) / Math.log10(1 + cap));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const now = Date.now();
    const since90 = new Date(now - 90 * DAY).toISOString();
    const since30 = new Date(now - 30 * DAY).toISOString();

    // Pull every visitor profile that has any signal: chat or purchase
    const { data: profiles } = await supabase
      .from("visitor_profiles")
      .select("id, user_id, last_activity_at")
      .order("last_activity_at", { ascending: false })
      .limit(2000);

    let updated = 0;
    for (const p of profiles ?? []) {
      // Events in last 90d
      const { data: events90 } = await supabase
        .from("activity_events")
        .select("event_type, event_at")
        .eq("visitor_profile_id", p.id)
        .gte("event_at", since90);

      const events = events90 ?? [];
      if (events.length === 0 && !p.last_activity_at) continue;

      const chatTurns = events.filter((e) => e.event_type === "chat_turn").length;
      const contentDone = events.filter((e) => e.event_type === "content_complete").length;

      // Distinct days active in last 30d
      const days = new Set<string>();
      for (const e of events) {
        if (new Date(e.event_at).getTime() >= now - 30 * DAY) {
          days.add(String(e.event_at).slice(0, 10));
        }
      }

      // Spend — sum paid orders by email-linked user OR by visitor.user_id
      let totalPaid = 0;
      let lastPurchaseAt: string | null = null;
      if (p.user_id) {
        const { data: userResp } = await supabase.auth.admin.getUserById(p.user_id);
        const email = userResp?.user?.email;
        if (email) {
          const { data: orders } = await supabase
            .from("orders")
            .select("amount, created_at, status")
            .eq("customer_email", email)
            .eq("status", "paid");
          for (const o of orders ?? []) {
            totalPaid += (o.amount ?? 0) / 100;
            if (!lastPurchaseAt || o.created_at > lastPurchaseAt) lastPurchaseAt = o.created_at;
          }
        }
      }

      const lastTs = p.last_activity_at ? new Date(p.last_activity_at).getTime() : now - 365 * DAY;
      const daysSince = Math.floor((now - lastTs) / DAY);

      const spend_score = logNorm(totalPaid);
      const content_score = Math.min(1, contentDone / 20);
      const conversation_score = Math.min(1, chatTurns / 50);
      const recency_score = expDecay(daysSince);
      const consistency_score = Math.min(1, days.size / 30);

      const score =
        0.30 * spend_score +
        0.25 * content_score +
        0.20 * conversation_score +
        0.15 * recency_score +
        0.10 * consistency_score;

      // Last conversation theme — most recent message classifier.topic
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("classifier, created_at")
        .eq("visitor_profile_id", p.id)
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const theme = (lastMsg?.classifier as any)?.topic ?? null;

      // Open questions — last 5 user turns with intent=question and no assistant follow-up
      const { data: openQ } = await supabase
        .from("messages")
        .select("content, classifier, created_at")
        .eq("visitor_profile_id", p.id)
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(5);
      const openQuestions = (openQ ?? [])
        .filter((m: any) => (m.classifier?.intent ?? "").includes("question"))
        .map((m: any) => ({ q: m.content.slice(0, 200), at: m.created_at }));

      const talkingPoints: string[] = [];
      if (theme) talkingPoints.push(`Last talked about: ${theme}`);
      if (daysSince > 14) talkingPoints.push(`Quiet for ${daysSince} days`);
      if (totalPaid > 0) talkingPoints.push(`Lifetime spend: $${totalPaid.toFixed(0)}`);
      if (openQuestions.length) talkingPoints.push(`${openQuestions.length} open question(s)`);

      const firstName = p.user_id
        ? ((await supabase.auth.admin.getUserById(p.user_id)).data?.user?.user_metadata?.full_name as string | undefined)
            ?.split(" ")[0] ?? "there"
        : "there";
      const draftWa = `Hey ${firstName}, Gayon here. ${
        theme ? `Last time we touched on ${theme}. ` : ""
      }${daysSince > 14 ? "Wanted to check in. " : ""}How can I help this week?`;

      await supabase.from("visitor_engagement_scores").upsert(
        {
          visitor_profile_id: p.id,
          user_id: p.user_id,
          score,
          spend_score,
          content_score,
          conversation_score,
          recency_score,
          consistency_score,
          total_paid_usd: totalPaid,
          days_since_last_activity: daysSince,
          last_conversation_theme: theme,
          last_purchase_at: lastPurchaseAt,
          open_unresolved_questions: openQuestions,
          talking_points: talkingPoints,
          draft_whatsapp_script: draftWa,
          refreshed_at: new Date().toISOString(),
        },
        { onConflict: "visitor_profile_id" },
      );
      updated++;
    }

    await supabase.from("activity_events").insert({
      event_type: "score_refreshed",
      metadata: { updated, ran_at: new Date().toISOString() },
    });

    return new Response(JSON.stringify({ ok: true, updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compute-engagement-scores fatal", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
