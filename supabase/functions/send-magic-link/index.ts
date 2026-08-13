// Magic-link sign-in (required core DRM login method).
//
// Authentication email is gated ONLY by `auth_email_enabled` (default true).
// It is independent of `email_delivery_enabled`, `transactional_automation_enabled`
// and `marketing_email_enabled` — a member-requested sign-in link is not an
// automated member email.
//
// Enumeration safety: every accepted request returns the SAME neutral body,
// whether or not an account exists and whether or not the provider succeeded
// after a match. Provider failures found after account lookup are recorded
// internally with a status only. No raw email, link, token or token hash is
// ever logged.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendAuthEmail } from "../_shared/email.ts";
import { authEmailEnabled } from "../_shared/config.ts";
import { corsFor, preflight, requireAllowedOrigin } from "../_shared/cors.ts";
import { consumeRateLimit } from "../_shared/ratelimit.ts";
import { findUserByEmail, normalizeEmail } from "../_shared/findUserByEmail.ts";
import { safeNextServer, DEFAULT_NEXT } from "../_shared/safeNext.ts";

/** Identical accepted response for every request. Never claims a send happened. */
const NEUTRAL_MESSAGE =
  "If an account matches that email and email delivery is available, your secure sign-in link should arrive shortly. Please check your inbox and spam folder. If it does not arrive, wait a moment and try again or contact info@diabetesresetmethod.com.";

/** Keyed digest of the normalized email. The raw address is never a bucket key. */
async function emailDigest(email: string): Promise<string | null> {
  const secret = Deno.env.get("IP_HMAC_KEY");
  if (!secret) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const originDenied = requireAllowedOrigin(req);
  if (originDenied) return originDenied;
  const corsHeaders = corsFor(req);

  const neutral = () =>
    new Response(JSON.stringify({ message: NEUTRAL_MESSAGE }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { email, next: rawNext } = await req.json();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = normalizeEmail(email);
    // Strict same-site validation; anything invalid falls back to /app.
    const nextPath = safeNextServer(rawNext, DEFAULT_NEXT);

    if (!emailRe.test(cleanEmail)) return neutral();

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Global, pre-lookup conditions return the same body for EVERY email, so
    // they cannot be used to probe account existence.
    if (!(await authEmailEnabled(sb))) {
      console.warn("magic link: auth_email_enabled is false");
      return neutral();
    }
    if (!Deno.env.get("RESEND_API_KEY")) {
      console.error("magic link: no email provider credential configured");
      return neutral();
    }

    // ── RATE LIMITS ─────────────────────────────────────────────
    // Per keyed IP, and per hashed email. Both fail closed into the same
    // neutral response.
    const ipOk = await consumeRateLimit(sb, {
      scope: "magic_link_ip",
      principal: { kind: "ip", req },
      windowSeconds: 900,
      limit: 10,
    });
    if (!ipOk) return neutral();

    const digest = await emailDigest(cleanEmail);
    if (!digest) return neutral(); // no keyed digest → cannot rate-limit → refuse

    const emailOk = await consumeRateLimit(sb, {
      scope: "magic_link_email",
      principal: { kind: "global", scope: `e:${digest}` },
      windowSeconds: 3600,
      limit: 5,
    });
    if (!emailOk) return neutral();

    // Duplicate-click suppression: one send per hashed email per 60s.
    const notDuplicate = await consumeRateLimit(sb, {
      scope: "magic_link_dupe",
      principal: { kind: "global", scope: `e:${digest}` },
      windowSeconds: 60,
      limit: 1,
    });
    if (!notDuplicate) return neutral();

    // ── ACCESS GATE ─────────────────────────────────────────────
    // Only an existing user who is EITHER an admin OR has an active
    // subscription may receive a login link. Identity is resolved server-side
    // from the normalized email — a client-supplied user id is never accepted.
    // No auth user is ever created here.
    let allowedUserId: string | null = null;
    try {
      const found = await findUserByEmail(sb as never, cleanEmail);
      if (!found) return neutral();
      const uid = found.userId;

      const { data: roleRow } = await sb
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();

      const { data: subRow } = await sb
        .from("subscriptions")
        .select("status")
        .eq("user_id", uid)
        .in("status", ["trialing", "active", "past_due"])
        .maybeSingle();

      if (!roleRow && !subRow) return neutral();
      allowedUserId = uid;
    } catch (gateErr) {
      console.error("send-magic-link gate error:", (gateErr as Error)?.name ?? "error");
      return neutral();
    }

    if (!allowedUserId) return neutral();

    const APP_URL = Deno.env.get("APP_URL") || "https://diabetesresetmethod.com";
    const nextParam = encodeURIComponent(nextPath);
    const { data: linkData, error } = await sb.auth.admin.generateLink({
      type: "magiclink",
      email: cleanEmail,
      options: { redirectTo: `${APP_URL}/auth/callback?next=${nextParam}` },
    });

    // Our own confirm URL built from token_hash. This avoids the Supabase
    // /verify GET endpoint that email prefetchers/scanners (Gmail, Outlook
    // safe links) consume before the user clicks: verifyOtp runs as a client
    // POST, so a scanner cannot burn the one-time, short-lived token.
    const tokenHash = (linkData as any)?.properties?.hashed_token;
    const loginUrl = tokenHash
      ? `${APP_URL}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${nextParam}`
      : (linkData as any)?.properties?.action_link;

    if (!error && loginUrl) {
      const result = await sendAuthEmail(sb, {
        from: "The Diabetes Reset Method <hello@diabetesresetmethod.com>",
        to: cleanEmail,
        subject: "Your login link — Diabetes Reset Method",
        html: `
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
      });
      if (!result.sent) {
        // Recorded internally only — reason/status carry no email or token data,
        // and the public response stays identical so nothing is disclosed.
        console.error("magic link delivery failed:", result.reason, result.status ?? "");
      }
    } else if (error) {
      console.error("magic link generation failed:", (error as Error)?.name ?? "error");
    }

    return neutral();
  } catch (err) {
    console.error("send-magic-link error:", (err as Error)?.name ?? "error");
    return new Response(JSON.stringify({ message: NEUTRAL_MESSAGE }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
