// Part 7, abuse-control POLICY (pure).
//
// Deliberately free of Deno and network types so it can be unit-tested in the
// same suite as the rest of the app. The runtime half lives in
// `abuseGuard.ts`, which does nothing but look up a counter and ask this
// module what to say.
//
// "No-cost" is literal: every control is arithmetic against a counter row
// that already exists. No CAPTCHA vendor, no bot-detection subscription, no
// per-request charge.
//
// PROPORTIONALITY
// ---------------
// Rights endpoints, data export and account deletion, get a TEMPORARY limit
// only. A person exercising a legal right must never be permanently refused
// because they clicked twice, so those buckets are short, generous, and always
// expire on their own. They are throttles, not denials, and the wording says
// so and offers a human route.

export interface RateLimitBody {
  error: "rate_limited";
  message: string;
  retry_after_seconds: number;
}

export const SUPPORT_EMAIL = "info@diabetesresetmethod.com";

/** The member-facing body for a throttled request. Never a refusal for rights. */
export function rateLimitedBody(opts: {
  windowSeconds: number;
  rightsEndpoint?: boolean;
}): RateLimitBody {
  return {
    error: "rate_limited",
    message: opts.rightsEndpoint
      ? "You've made several requests in a row. This is a short, temporary pause, " +
        "your request has not been refused. Please try again shortly, or email " +
        `${SUPPORT_EMAIL} and we'll complete it for you.`
      : "Too many requests in a short time. Please wait a moment and try again.",
    retry_after_seconds: opts.windowSeconds,
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
  /** Free text to a human inbox, the classic spam target. */
  support: { windowSeconds: 3600, limit: 6 },
  /** Model-backed answers. Bounded because each call has real cost. */
  assistant: { windowSeconds: 300, limit: 20 },
  /** Ordinary member writes. Generous; only stops runaway loops. */
  memberWrite: { windowSeconds: 60, limit: 60 },
  /** Rights endpoints. TEMPORARY throttle only, never a denial. */
  rights: { windowSeconds: 900, limit: 5 },
} as const;

export type LimitName = keyof typeof LIMITS;
