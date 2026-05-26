// Phase B2.5 — Long-absent paid member check-in (N=21 days)
// Cron-invokable (run nightly). Finds paid members (active/trialing/past_due)
// whose latest activity_event is >= 21 days ago, sends ONE human-toned
// check-in email via Resend. NO OFFER attached. Idempotency: skips anyone
// who already has a 'checkin_email_sent' event in the last 30 days.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "Gayon <hello@diabetesresetmethod.com>";
const N_DAYS = 21;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const now = Date.now();
    const cutoff = new Date(now - N_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const skipCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: subs } = await supabase
      .from("subscriptions")
      .select("user_id, status, last_active_at")
      .in("status", ["active", "trialing", "past_due"]);

    let sent = 0;
    for (const s of subs ?? []) {
      // Most recent activity event
      const { data: lastEvent } = await supabase
        .from("activity_events")
        .select("event_at")
        .eq("user_id", s.user_id)
        .order("event_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastTs = lastEvent?.event_at ?? s.last_active_at;
      if (!lastTs || lastTs > cutoff) continue;

      // Skip if already checked in recently
      const { data: recentCheckin } = await supabase
        .from("activity_events")
        .select("id")
        .eq("user_id", s.user_id)
        .eq("event_type", "checkin_email_sent")
        .gte("event_at", skipCutoff)
        .maybeSingle();
      if (recentCheckin) continue;

      const { data: userResp } = await supabase.auth.admin.getUserById(s.user_id);
      const email = userResp?.user?.email;
      const name =
        (userResp?.user?.user_metadata?.full_name as string | undefined) ??
        (userResp?.user?.user_metadata?.name as string | undefined) ??
        "friend";
      if (!email) continue;
      const firstName = String(name).split(" ")[0];

      const subject = `${firstName} — checking in`;
      const html = `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
          <p style="font-size:16px;line-height:1.6;">Hey ${firstName},</p>
          <p style="font-size:16px;line-height:1.6;">Noticed you haven't been around in a few weeks. No agenda here, no pitch — just checking you're alright.</p>
          <p style="font-size:16px;line-height:1.6;">If life got loud, that's normal. The work waits. Whenever you're ready, the next small step is still there.</p>
          <p style="font-size:16px;line-height:1.6;">If something specific is in the way, hit reply and tell me. I read everything.</p>
          <p style="font-size:16px;line-height:1.6;margin-top:24px;">— Gayon</p>
          <p style="font-size:12px;color:#888;margin-top:32px;">The Diabetes Reset Method · Educational, not medical advice.</p>
        </div>
      `;

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: FROM_EMAIL, to: [email], subject, html }),
      });
      if (!resendRes.ok) {
        console.warn("checkin send failed", email, await resendRes.text());
        continue;
      }

      await supabase.from("activity_events").insert({
        user_id: s.user_id,
        event_type: "checkin_email_sent",
        metadata: { email, days_since_last_activity: Math.floor((now - new Date(lastTs).getTime()) / 86400000) },
      });
      sent++;
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("member-checkin fatal", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
