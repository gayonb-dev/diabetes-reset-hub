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

    // ── ACCESS GATE ─────────────────────────────────────────────
    // Only existing users who are EITHER an admin OR have an active
    // subscription may receive a login link. We never create new auth
    // users from this endpoint.
    let allowedUserId: string | null = null;
    try {
      // Find existing auth user by email (admin listUsers filtered)
      const { data: usersPage } = await sb.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const match = usersPage?.users?.find(
        (u: any) => (u.email || "").toLowerCase() === cleanEmail,
      );
      if (!match) {
        console.log("send-magic-link: no auth user for", cleanEmail);
        return okResponse;
      }
      const uid = match.id;

      // Check admin role
      const { data: roleRow } = await sb
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();

      // Check active subscription
      const { data: subRow } = await sb
        .from("subscriptions")
        .select("status")
        .eq("user_id", uid)
        .in("status", ["trialing", "active", "past_due"])
        .maybeSingle();

      if (!roleRow && !subRow) {
        console.log("send-magic-link: user not authorized", cleanEmail);
        return okResponse;
      }
      allowedUserId = uid;
    } catch (gateErr) {
      console.error("send-magic-link gate error:", gateErr);
      return okResponse;
    }

    if (!allowedUserId) return okResponse;

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
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#FAF7F2;color:#1a1a1a;">
          <p style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#085041;margin:0 0 8px;">The Diabetes Reset Method</p>
          <h2 style="color:#085041;font-size:22px;margin:0 0 16px;">Log in to your dashboard</h2>
          <p style="font-size:16px;color:#3a3a3a;line-height:1.6;margin:0 0 24px;">Tap the button below to log in. For best results, open this email on the device you'll use to log in.</p>
          <p style="text-align:center;margin:32px 0;">
            <a href="${loginUrl}" style="display:inline-block;background:#085041;color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;">
              Log in →
            </a>
          </p>
          <p style="font-size:13px;color:#6b6b6b;line-height:1.5;margin:24px 0 0;">This link expires in 1 hour and can only be used once. If it doesn't work, return to the login page and request a fresh link.</p>
          <hr style="border:none;border-top:1px solid #E8E4DD;margin:32px 0 16px;" />
          <p style="font-size:12px;color:#8a8a8a;margin:0;">Diabetes Reset Method · Educational support, not medical advice.</p>
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
