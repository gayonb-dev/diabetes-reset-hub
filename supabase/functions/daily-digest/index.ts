// Phase C1 — Daily digest (map-reduce).
// MAP: for each conversation with activity yesterday, ask the LLM for ONE
// PHI-redacted sentence summarizing what the visitor wanted + how it ended.
// REDUCE: synthesize all those one-liners into a structured digest:
//   { actions_today, what_agent_heard, numbers, anomalies }
// Persists into daily_digest and emails Gayon. NEVER includes raw PHI.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "Diabetes Reset <hello@diabetesresetmethod.com>";
const DIGEST_TO = Deno.env.get("DIGEST_RECIPIENT") ?? "hello@diabetesresetmethod.com";

const MODEL = "google/gemini-2.5-flash";

async function llm(messages: any[], jsonMode = false) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const now = new Date();
    const yStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)).toISOString();
    const yEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const digestDate = yStart.slice(0, 10);

    // Skip if already generated
    const { data: existing } = await supabase
      .from("daily_digest").select("id").eq("digest_date", digestDate).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, skipped: "already_generated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Conversations active yesterday
    const { data: convos } = await supabase
      .from("conversations")
      .select("id, visitor_profile_id, summary, last_message_at")
      .gte("last_message_at", yStart)
      .lt("last_message_at", yEnd);

    const summaries: string[] = [];
    for (const c of convos ?? []) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("role, content, classifier")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: true })
        .limit(40);
      const transcript = (msgs ?? [])
        .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n")
        .slice(0, 6000);
      try {
        const one = await llm([
          {
            role: "system",
            content:
              "You are an analyst for a diabetes coaching business. Summarize this conversation in ONE plainspoken sentence (max 25 words). " +
              "Redact ALL PHI: never mention medications, A1C numbers, conditions, names, emails, or symptoms. " +
              "Focus on intent (e.g. 'asked about pricing', 'objected to cost', 'wanted to book', 'expressed skepticism'). " +
              "Note the outcome (purchased / didn't / unresolved).",
          },
          { role: "user", content: transcript },
        ]);
        if (one) summaries.push(one.trim());
      } catch (e) {
        console.warn("map summary failed for convo", c.id, e);
      }
    }

    // Counts
    const { count: ordersCount } = await supabase
      .from("orders").select("id", { count: "exact", head: true })
      .eq("status", "paid").gte("created_at", yStart).lt("created_at", yEnd);
    const { count: intakeCount } = await supabase
      .from("intake_submissions").select("id", { count: "exact", head: true })
      .gte("created_at", yStart).lt("created_at", yEnd);
    const { count: leadCount } = await supabase
      .from("leads").select("id", { count: "exact", head: true })
      .gte("created_at", yStart).lt("created_at", yEnd);

    const numbers = {
      conversations: convos?.length ?? 0,
      orders: ordersCount ?? 0,
      intake_submissions: intakeCount ?? 0,
      new_leads: leadCount ?? 0,
    };

    // REDUCE
    const reducePrompt =
      `You are writing today's operator digest for Gayon. Use ONLY the one-line summaries below — no PHI.\n\n` +
      `DATE: ${digestDate}\nNUMBERS: ${JSON.stringify(numbers)}\n\n` +
      `CONVERSATION SUMMARIES:\n${summaries.map((s, i) => `${i + 1}. ${s}`).join("\n") || "(none)"}\n\n` +
      `Return strict JSON with this shape:\n` +
      `{"actions_today":[string,string,string],"what_agent_heard":string,"anomalies":[string]}\n` +
      `- actions_today: exactly 3 short imperative actions Gayon should do today, drawn from the data.\n` +
      `- what_agent_heard: 2-3 sentence theme summary, plainspoken.\n` +
      `- anomalies: list of unusual patterns or zero if none (e.g. spike in price objections, sudden drop in chats).`;
    let reduced: any = { actions_today: [], what_agent_heard: "", anomalies: [] };
    try {
      const raw = await llm(
        [{ role: "system", content: "Output only valid JSON." }, { role: "user", content: reducePrompt }],
        true,
      );
      reduced = JSON.parse(raw);
    } catch (e) {
      console.warn("reduce failed", e);
    }

    // Persist
    const { data: row } = await supabase
      .from("daily_digest")
      .insert({
        digest_date: digestDate,
        actions_today: reduced.actions_today ?? [],
        what_agent_heard: reduced.what_agent_heard ?? "",
        numbers,
        anomalies: reduced.anomalies ?? [],
        conversation_count: convos?.length ?? 0,
      })
      .select("id").single();

    // Email
    const html = `
      <div style="font-family:'Open Sans',Arial,sans-serif;max-width:640px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
        <h1 style="font-family:'Montserrat',Arial,sans-serif;color:#7DAF76;font-size:24px;margin:0 0 8px;">Daily Digest · ${digestDate}</h1>
        <p style="color:#666;margin:0 0 24px;font-size:13px;">All names and health details redacted.</p>

        <h2 style="font-size:16px;color:#333;border-bottom:2px solid #F4E3B2;padding-bottom:6px;">3 Actions Today</h2>
        <ol style="font-size:15px;line-height:1.7;">
          ${(reduced.actions_today ?? []).map((a: string) => `<li>${a}</li>`).join("") || "<li>—</li>"}
        </ol>

        <h2 style="font-size:16px;color:#333;border-bottom:2px solid #F4E3B2;padding-bottom:6px;margin-top:24px;">What the agent heard</h2>
        <p style="font-size:15px;line-height:1.7;">${reduced.what_agent_heard || "—"}</p>

        <h2 style="font-size:16px;color:#333;border-bottom:2px solid #F4E3B2;padding-bottom:6px;margin-top:24px;">Numbers</h2>
        <table style="font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Conversations</td><td><strong>${numbers.conversations}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Paid orders</td><td><strong>${numbers.orders}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Intake submissions</td><td><strong>${numbers.intake_submissions}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">New leads</td><td><strong>${numbers.new_leads}</strong></td></tr>
        </table>

        <h2 style="font-size:16px;color:#333;border-bottom:2px solid #F4E3B2;padding-bottom:6px;margin-top:24px;">Anomalies</h2>
        <ul style="font-size:15px;line-height:1.7;">
          ${(reduced.anomalies ?? []).length ? reduced.anomalies.map((a: string) => `<li>${a}</li>`).join("") : "<li>None today.</li>"}
        </ul>

        <p style="font-size:12px;color:#888;margin-top:32px;">The Diabetes Reset Method · Internal operator digest. Do not forward.</p>
      </div>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [DIGEST_TO], subject: `Daily Digest · ${digestDate}`, html }),
    });
    const emailOk = resendRes.ok;
    if (emailOk && row?.id) {
      await supabase.from("daily_digest").update({ email_sent_at: new Date().toISOString() }).eq("id", row.id);
    }

    await supabase.from("activity_events").insert({
      event_type: "digest_generated",
      metadata: { digest_date: digestDate, conversation_count: convos?.length ?? 0, email_ok: emailOk },
    });

    return new Response(JSON.stringify({ ok: true, digest_date: digestDate, conversations: convos?.length ?? 0, email_ok: emailOk }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-digest fatal", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
