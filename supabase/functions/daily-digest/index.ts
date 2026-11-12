// Daily digest, local, structured counts only.
//
// H. This function MUST NOT send conversation transcripts, message content or
// any member text to an external model. The previous map-reduce design did and
// has been removed. The digest is now computed entirely in this function from
// counts and classifier labels that already exist in the database.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { sendEmail } from "../_shared/email.ts";
import { corsFor, preflight } from "../_shared/cors.ts";
import { reviewerIds, reviewerEmails } from "../_shared/reviewerPopulation.ts";


const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = "Diabetes Reset <hello@diabetesresetmethod.com>";
const DIGEST_TO = Deno.env.get("DIGEST_RECIPIENT") ?? "hello@diabetesresetmethod.com";

interface DigestReduction {
  actions_today: string[];
  what_agent_heard: string;
  anomalies: string[];
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const corsHeaders = corsFor(req);

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

    const reviewers = await reviewerIds(supabase);
    const excludedEmails = await reviewerEmails(supabase, reviewers);
    const excludedVisitorIds = new Set<string>();
    for (const userId of reviewers) {
      const { data, error } = await supabase.from("visitor_profiles").select("id").eq("user_id", userId);
      if (error) throw new Error("reviewer_visitor_population_unavailable");
      for (const row of data ?? []) excludedVisitorIds.add(row.id);
    }

    // Conversations active yesterday, excluding reviewer-owned visitors.
    const { data: candidates } = await supabase
      .from("conversations")
      .select("id, visitor_profile_id, summary, last_message_at")
      .gte("last_message_at", yStart)
      .lt("last_message_at", yEnd);
    const convos = candidates?.filter((c) => !excludedVisitorIds.has(c.visitor_profile_id));

    // H. Structured, local aggregation. Message CONTENT is never read here and
    // never leaves the database.
    const conversationIds = (convos ?? []).map((c: { id: string }) => c.id);
    const classifierCounts: Record<string, number> = {};
    let messageCount = 0;
    if (conversationIds.length > 0) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("classifier, conversation_id")
        .in("conversation_id", conversationIds)
        .limit(5000);
      for (const m of msgs ?? []) {
        messageCount += 1;
        const label = (m as { classifier: string | null }).classifier ?? "unclassified";
        classifierCounts[label] = (classifierCounts[label] ?? 0) + 1;
      }
    }

    // Counts
    // Keep exact server counts, excluding immutable user IDs and legacy emails.
    let ordersQuery = supabase.from("orders").select("id", { count: "exact", head: true })
      .eq("status", "paid").gte("created_at", yStart).lt("created_at", yEnd);
    let intakeQuery = supabase.from("intake_submissions").select("id", { count: "exact", head: true })
      .gte("created_at", yStart).lt("created_at", yEnd);
    let leadQuery = supabase.from("leads").select("id", { count: "exact", head: true })
      .gte("created_at", yStart).lt("created_at", yEnd);
    for (const userId of reviewers) {
      ordersQuery = ordersQuery.or(`user_id.is.null,user_id.neq.${userId}`);
    }
    for (const email of excludedEmails) {
      ordersQuery = ordersQuery.not("customer_email", "ilike", email.replace(/[%_]/g, "\\$&"));
      intakeQuery = intakeQuery.not("email", "ilike", email.replace(/[%_]/g, "\\$&"));
      leadQuery = leadQuery.not("email", "ilike", email.replace(/[%_]/g, "\\$&"));
    }
    const [ordersResult, intakeResult, leadResult] = await Promise.all([ordersQuery, intakeQuery, leadQuery]);
    if (ordersResult.error || intakeResult.error || leadResult.error) throw new Error("digest_population_unavailable");
    const ordersCount = ordersResult.count;
    const intakeCount = intakeResult.count;
    const leadCount = leadResult.count;

    const numbers = {
      conversations: convos?.length ?? 0,
      orders: ordersCount ?? 0,
      intake_submissions: intakeCount ?? 0,
      new_leads: leadCount ?? 0,
    };

    const topics = Object.entries(classifierCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => `${label}: ${count}`);

    const reduced: DigestReduction = {
      actions_today: [],
      what_agent_heard: topics.length
        ? `Message topics by classifier, ${topics.join(", ")}.`
        : "No conversation activity yesterday.",
      anomalies: [],
    };

    // Persist
    const { data: row } = await supabase
      .from("daily_digest")
      .insert({
        digest_date: digestDate,
        actions_today: reduced.actions_today ?? [],
        what_agent_heard: reduced.what_agent_heard ?? "",
        numbers: { ...numbers, messages: messageCount, topics: classifierCounts },
        anomalies: reduced.anomalies ?? [],
        conversation_count: convos?.length ?? 0,
      })
      .select("id").single();

    // Email
    const html = `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:640px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
        <h1 style="font-family:'Inter',Arial,sans-serif;color:#085041;font-size:24px;margin:0 0 8px;">Daily Digest · ${digestDate}</h1>
        <p style="color:#666;margin:0 0 24px;font-size:13px;">All names and health details redacted.</p>

        <h2 style="font-size:16px;color:#333;border-bottom:2px solid #F4E3B2;padding-bottom:6px;margin-top:24px;">Topic counts</h2>
        <p style="font-size:15px;line-height:1.7;">${reduced.what_agent_heard || ", "}</p>

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

    const sendResult = await sendEmail(supabase, {
      from: FROM_EMAIL, to: DIGEST_TO, subject: `Daily Digest · ${digestDate}`, html,
    });
    const emailOk = sendResult.sent;
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
