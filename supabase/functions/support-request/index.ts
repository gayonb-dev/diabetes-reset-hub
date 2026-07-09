// Edge function: support-request
// Sends a support/billing/feedback message from an authenticated member to the
// team inbox via Resend. Replaces the old mailto: links.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPPORT_INBOX = "info@diabetesresetmethod.com";
const FROM_EMAIL = "DRM Support <support@diabetesresetmethod.com>";

const CATEGORIES = new Set(["Bug", "Question", "Feedback", "Billing"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(auth.slice(7));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const category = String(body.category ?? "Question");
    const message = String(body.message ?? "").trim();
    const pageContext = String(body.pageContext ?? "").slice(0, 500);
    const userAgent = String(body.userAgent ?? "").slice(0, 500);

    if (!CATEGORIES.has(category)) {
      return new Response(JSON.stringify({ error: "invalid_category" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message.length < 5 || message.length > 5000) {
      return new Response(JSON.stringify({ error: "invalid_message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch program day + subscription
    const [{ data: profile }, { data: sub }] = await Promise.all([
      supabase.from("profiles").select("program_start_date, first_name").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status, current_period_end, cancel_at_period_end, created_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    let programDay = 1;
    const startIso = profile?.program_start_date ?? sub?.created_at ?? null;
    if (startIso) {
      const start = new Date(startIso);
      const diff = Math.floor((Date.now() - start.getTime()) / 86400000);
      programDay = Math.max(1, diff + 1);
    }

    const subLine = sub
      ? `${sub.status}${sub.cancel_at_period_end ? " (cancels at period end)" : ""} — ends ${sub.current_period_end ?? "n/a"}`
      : "none";

    const subject = `[DRM ${category}] from ${profile?.first_name ?? user.email}`;
    const escape = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;">
        <h2 style="color:#085041;margin:0 0 12px;">Support request — ${escape(category)}</h2>
        <p style="white-space:pre-wrap;background:#FAF7F2;border-radius:8px;padding:16px;color:#1a1a1a;">${escape(message)}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <table style="font-size:13px;color:#333;line-height:1.6;">
          <tr><td><b>Member email</b></td><td>${escape(user.email ?? "")}</td></tr>
          <tr><td><b>Member ID</b></td><td>${escape(user.id)}</td></tr>
          <tr><td><b>Program day</b></td><td>${programDay}</td></tr>
          <tr><td><b>Subscription</b></td><td>${escape(subLine)}</td></tr>
          <tr><td><b>Page</b></td><td>${escape(pageContext)}</td></tr>
          <tr><td><b>User agent</b></td><td>${escape(userAgent)}</td></tr>
        </table>
      </div>`;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY missing");

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [SUPPORT_INBOX],
        reply_to: user.email,
        subject,
        html,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error("Resend send failed", resp.status, errBody);
      return new Response(
        JSON.stringify({ error: "email_send_failed", details: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("support-request error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
