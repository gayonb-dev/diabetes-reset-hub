import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendResend(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "The Diabetes Reset Method <hello@diabetesresetmethod.com>",
      to: [to],
      subject,
      html,
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = String(email || "").trim().toLowerCase();

    // Always return 200 to prevent enumeration
    const okResponse = new Response(
      JSON.stringify({ message: "If that email is registered, a link is on its way." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

    if (!emailRe.test(cleanEmail)) return okResponse;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const APP_URL = Deno.env.get("APP_URL") || "https://diabetesresetmethod.com";

    const { data: linkData, error } = await sb.auth.admin.generateLink({
      type: "magiclink",
      email: cleanEmail,
      options: { redirectTo: `${APP_URL}/auth/callback?next=/app` },
    });

    // Build our own confirm URL using token_hash. This avoids the
    // Supabase /verify GET endpoint that email prefetchers/scanners
    // (Gmail, Outlook safe-links, etc.) consume before the user clicks.
    // verifyOtp runs as a client POST, so prefetchers can't burn the token.
    const tokenHash = (linkData as any)?.properties?.hashed_token;
    const loginUrl = tokenHash
      ? `${APP_URL}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=/app`
      : (linkData as any)?.properties?.action_link;

    if (!error && loginUrl) {
      await sendResend(
        cleanEmail,
        "Your login link — Diabetes Reset Method",
        `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
          <h2 style="color:#7DAF76;">Log in to your Reset dashboard</h2>
          <p style="font-size:16px;color:#333;line-height:1.6;">Click below to log in:</p>
          <p style="text-align:center;margin:24px 0;">
            <a href="${loginUrl}" style="display:inline-block;background:#7DAF76;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Log in →
            </a>
          </p>
          <p style="font-size:13px;color:#666;">This link expires in 1 hour. For your security, only click it from the device you'll use to log in.</p>
        </div>`,
      );
    }

    return okResponse;
  } catch (err) {
    console.error("send-magic-link error:", err);
    return new Response(
      JSON.stringify({ message: "If that email is registered, a link is on its way." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
