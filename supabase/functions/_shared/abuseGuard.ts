// Part 7 — deterministic, no-cost abuse protections.
//
// "No-cost" is literal: every control here is arithmetic against a counter row
// that already exists. There is no third-party service, no CAPTCHA vendor, no
// bot-detection subscription and no per-request charge.
//
// PROPORTIONALITY
// ---------------
// Rights endpoints — data export and account deletion — are protected by a
// TEMPORARY limit only. A person exercising a legal right must never be
// permanently refused because they clicked twice, so those buckets are short,
// generous, and always expire on their own. They are throttles, not denials,
// and the message says so.
//
// Server-to-server callers (Stripe webhooks, scheduled cron) are deliberately
// NOT routed through here: they have no browser origin, their authenticity is
// established by signature or shared secret, and throttling them would drop
// legitimate lifecycle events.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { consumeRateLimit, type Principal } from "./ratelimit.ts";

export interface GuardOptions {
  scope: string;
  windowSeconds: number;
  limit: number;
  /** Present for authenticated endpoints; falls back to the keyed ingress IP. */
  userId?: string | null;
  /** True for export/deletion: changes the wording to a temporary throttle. */
  rightsEndpoint?: boolean;
}

export interface GuardResult {
  allowed: boolean;
  status: number;
  body: { error: string; message: string; retry_after_seconds: number };
}

const TOO_MANY = "rate_limited";

/**
 * Consumes one unit from the caller's bucket. Returns `allowed: false` with a
 * ready-to-send body when the caller is over the limit.
 *
 * The principal is the verified user when there is one, because a per-user
 * bucket cannot be escaped by changing network, and only falls back to the
 * keyed ingress address for unauthenticated callers.
 */
export async function guardRequest(
  admin: SupabaseClient,
  req: Request,
  opts: GuardOptions,
): Promise<GuardResult> {
  const principal: Principal = opts.userId
    ? { kind: "user", id: opts.userId }
    : { kind: "ip", req };

  const ok = await consumeRateLimit(admin, {
    scope: opts.scope,
    principal,
    windowSeconds: opts.windowSeconds,
    limit: opts.limit,
  });

  if (ok) {
    return {
      allowed: true,
      status: 200,
      body: { error: "", message: "", retry_after_seconds: 0 },
    };
  }

  return {
    allowed: false,
    status: 429,
    body: {
      error: TOO_MANY,
      message: opts.rightsEndpoint
        ? "You've made several requests in a row. This is a short, temporary pause — " +
          "your request has not been refused. Please try again shortly, or email " +
          "info@diabetesresetmethod.com and we'll complete it for you."
        : "Too many requests in a short time. Please wait a moment and try again.",
      retry_after_seconds: opts.windowSeconds,
    },
  };
}

/** Standard limits, kept in one place so they can be reviewed together. */
export const LIMITS = {
  /** Money movement. Tight: a real person checks out once. */
  checkout: { windowSeconds: 600, limit: 8 },
  /** Reading a Stripe session after redirect; polled by the success page. */
  checkoutVerify: { windowSeconds: 300, limit: 30 },
  /** Billing portal / cancel / reactivate. */
  billingAction: { windowSeconds: 300, limit: 12 },
  /** Free-text to a human inbox — the classic spam target. */
  support: { windowSeconds: 3600, limit: 6 },
  /** Model-backed answers. Bounded because each call has real cost. */
  assistant: { windowSeconds: 300, limit: 20 },
  /** Ordinary member writes. Generous; only stops runaway loops. */
  memberWrite: { windowSeconds: 60, limit: 60 },
  /** Rights endpoints. TEMPORARY throttle only — never a denial. */
  rights: { windowSeconds: 900, limit: 5 },
} as const;
