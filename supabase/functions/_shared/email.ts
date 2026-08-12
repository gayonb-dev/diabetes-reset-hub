// Central outbound-email gate (audit finding 3).
//
// EVERY Resend path in this project must go through `sendEmail`. With
// `email_delivery_enabled` false in app_config — or the recipient absent from
// `email_test_allowlist` — no request is made to Resend at all, even when a
// RESEND_API_KEY is present in the environment.
//
// No message body, subject, or recipient address is logged.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { emailAllowed } from "./config.ts";

export interface EmailPayload {
  to: string | string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
}

export interface EmailResult {
  sent: boolean;
  reason?: "gate_closed" | "no_api_key" | "provider_error" | "no_recipient";
  status?: number;
}

export async function sendEmail(
  admin: SupabaseClient,
  payload: EmailPayload,
): Promise<EmailResult> {
  const recipients = (Array.isArray(payload.to) ? payload.to : [payload.to])
    .map((r) => String(r ?? "").trim())
    .filter(Boolean);
  if (recipients.length === 0) return { sent: false, reason: "no_recipient" };

  // Gate is evaluated per recipient. One disallowed address blocks the send.
  for (const r of recipients) {
    if (!(await emailAllowed(admin, r))) {
      return { sent: false, reason: "gate_closed" };
    }
  }

  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { sent: false, reason: "no_api_key" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, to: recipients }),
  });

  if (!res.ok) {
    // Status only. The provider body can echo the recipient address.
    console.error("email provider rejected the send", res.status);
    return { sent: false, reason: "provider_error", status: res.status };
  }
  return { sent: true, status: res.status };
}
