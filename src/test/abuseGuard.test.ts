// Part 7, abuse-control proportionality.
//
// The point of these tests is not that limits exist, but that they are the
// RIGHT SHAPE: money-movement endpoints are tight, rights endpoints are a
// short temporary throttle that expires on its own and says so, and no limit
// can turn into a permanent refusal of a legal right.
//
// The policy module is pure by design so it can be asserted here directly.
// The runtime wrapper does nothing but consume a counter and hand back these
// exact values.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  LIMITS,
  rateLimitedBody,
  SUPPORT_EMAIL,
} from "../../supabase/functions/_shared/abusePolicy";

describe("abuse-control limits are proportionate", () => {
  it("bounds money movement more tightly than ordinary member writes", () => {
    const checkoutRate = LIMITS.checkout.limit / LIMITS.checkout.windowSeconds;
    const writeRate = LIMITS.memberWrite.limit / LIMITS.memberWrite.windowSeconds;
    expect(checkoutRate).toBeLessThan(writeRate);
  });

  it("keeps every window short enough to expire on its own", () => {
    for (const [name, cfg] of Object.entries(LIMITS)) {
      expect(cfg.windowSeconds, name).toBeLessThanOrEqual(3600);
      expect(cfg.limit, name).toBeGreaterThan(0);
    }
  });

  it("always reports a finite retry delay rather than an open-ended refusal", () => {
    const body = rateLimitedBody({ windowSeconds: LIMITS.checkout.windowSeconds });
    expect(body.error).toBe("rate_limited");
    expect(body.retry_after_seconds).toBe(LIMITS.checkout.windowSeconds);
  });

  it("tells a rights-endpoint caller the pause is temporary and offers a human route", () => {
    const body = rateLimitedBody({
      windowSeconds: LIMITS.rights.windowSeconds,
      rightsEndpoint: true,
    });
    expect(body.message).toMatch(/temporary/i);
    expect(body.message).toMatch(/has not been refused/i);
    expect(body.message).toContain(SUPPORT_EMAIL);
    // A rights endpoint must never be described in refusal language.
    expect(body.message).not.toMatch(/denied|blocked|forbidden|permanently/i);
  });
});

describe("rights endpoints are throttled, never denied", () => {
  const rightsFunctions = ["export-my-data", "request-account-deletion"];

  it("uses the rightsEndpoint wording on export and deletion", () => {
    for (const fn of rightsFunctions) {
      const src = readFileSync(
        resolve(process.cwd(), `supabase/functions/${fn}/index.ts`),
        "utf8",
      );
      expect(src, fn).toContain("abuseGuard.ts");
      expect(src, fn).toContain("rightsEndpoint: true");
      expect(src, fn).toContain("LIMITS.rights");
    }
  });
});

describe("server-to-server callers are not throttled", () => {
  // Stripe webhooks and cron have no browser origin and are authenticated by
  // signature or shared secret. Throttling them would drop real lifecycle
  // events, so they must not import the guard.
  const roots = ["stripe-subscription-webhook", "stripe-webhook", "notifications-cron"];

  it("does not apply origin-based abuse limits to webhook or cron entrypoints", () => {
    for (const fn of roots) {
      let src: string;
      try {
        src = readFileSync(
          resolve(process.cwd(), `supabase/functions/${fn}/index.ts`),
          "utf8",
        );
      } catch {
        continue; // function not present in this deployment
      }
      expect(src, fn).not.toContain("abuseGuard.ts");
    }
  });
});

describe("money-movement endpoints are guarded", () => {
  const guarded = [
    "create-checkout-session",
    "create-subscription-checkout",
    "verify-checkout-session",
    "customer-portal",
    "cancel-subscription",
    "support-request",
    "ask-vita",
  ];

  it("consumes a rate-limit bucket before doing chargeable work", () => {
    for (const fn of guarded) {
      const src = readFileSync(
        resolve(process.cwd(), `supabase/functions/${fn}/index.ts`),
        "utf8",
      );
      expect(src, fn).toContain("guardRequest(");
    }
  });
});
