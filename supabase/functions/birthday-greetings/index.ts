// Phase B2.2 — Birthday recognition
// Cron-invokable (run nightly). Finds visitor_profiles whose date_of_birth's
// month+day matches today, joins to auth.users for email, sends a warm
// brand email via Resend. Idempotency: writes an activity_events row of type
// 'birthday_email_sent' for the day, skips anyone who already has one today.
// NO UPSELL on this day per Phase B spec.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const today = new Date();
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(today.getUTCDate()).padStart(2, "0");

    // Pull candidate profiles (with dob); month/day match done in JS
    const { data: profiles } = await supabase
      .from("visitor_profiles")
      .select("id, user_id, date_of_birth")
      .not("date_of_birth", "is", null)
      .not("user_id", "is", null);

    const matches = (profiles ?? []).filter((p) => {
      if (!p.date_of_birth) return false;
      const s = String(p.date_of_birth); // YYYY-MM-DD
      return s.slice(5, 7) === mm && s.slice(8, 10) === dd;
    });

    if (matches.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString();

    let sent = 0;
    for (const p of matches) {
      // Idempotency check
      const { data: prior } = await supabase
        .from("activity_events")
        .select("id")
        .eq("visitor_profile_id", p.id)
        .eq("event_type", "birthday_email_sent")
        .gte("event_at", todayStart)
        .maybeSingle();
      if (prior) continue;

      // Resolve email + name via admin getUserById
      const { data: userResp } = await supabase.auth.admin.getUserById(p.user_id);
      const email = userResp?.user?.email;
      const name =
        (userResp?.user?.user_metadata?.full_name as string | undefined) ??
        (userResp?.user?.user_metadata?.name as string | undefined) ??
        "friend";
      if (!email) continue;

      const firstName = String(name).split(" ")[0];
      const subject = `Happy birthday, ${firstName} 🎂`;
      const html = `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
          <h1 style="font-family:'Inter',Arial,sans-serif;color:#085041;font-size:28px;margin:0 0 16px;">Happy birthday, ${firstName}.</h1>
          <p style="font-size:16px;line-height:1.6;">Just a quick note — no offer, no ask. Today's yours. Enjoy the people, eat the cake, take the walk after if you can.</p>
          <p style="font-size:16px;line-height:1.6;">We're glad you're here.</p>
          <p style="font-size:16px;line-height:1.6;margin-top:24px;">— Gayon &amp; the Diabetes Reset team</p>
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
        console.warn("birthday send failed", email, await resendRes.text());
        continue;
      }

      await supabase.from("activity_events").insert({
        visitor_profile_id: p.id,
        user_id: p.user_id,
        event_type: "birthday_email_sent",
        metadata: { email },
      });
      sent++;
    }

    return new Response(JSON.stringify({ ok: true, sent, candidates: matches.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("birthday-greetings fatal", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
