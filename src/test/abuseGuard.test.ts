// Part 7 — abuse-control proportionality.
//
// The point of these tests is not that limits exist, but that they are the
// RIGHT SHAPE: money-movement endpoints are tight, rights endpoints are a
// short temporary throttle that expires on its own and says so, and no limit
// can turn into a permanent refusal of a legal right.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { guardRequest, LIMITS } from "../../supabase/functions/_shared/abuseGuard";

function fakeAdmin(allow: boolean) {
  return {
    rpc: async () => ({ data: allow, error: null }),
  } as unknown as Parameters<typeof guardRequest>[0];
}

const req = new Request("https://diabetesresetmethod.com/x", {
  method: "POST",
  headers: { "cf-connecting-ip": "203.0.113.9" },
});

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

  it("allows a request under the limit", async () => {
    const r = await guardRequest(fakeAdmin(true), req, { scope: "t", ...LIMITS.checkout });
    expect(r.allowed).toBe(true);
  });

  it("returns 429, never a permanent status, when over the limit", async () => {
    const r = await guardRequest(fakeAdmin(false), req, { scope: "t", ...LIMITS.checkout });
    expect(r.allowed).toBe(false);
    expect(r.status).toBe(429);
    expect(r.body.retry_after_seconds).toBeGreaterThan(0);
  });

  it("tells a rights-endpoint caller the pause is temporary and offers a human route", async () => {
    const r = await guardRequest(fakeAdmin(false), req, {
      scope: "export-my-data",
      userId: "u1",
      rightsEndpoint: true,
      ...LIMITS.rights,
    });
    expect(r.allowed).toBe(false);
    expect(r.body.message).toMatch(/temporary/i);
    expect(r.body.message).toMatch(/has not been refused/i);
    expect(r.body.message).toContain("info@diabetesresetmethod.com");
    // A rights endpoint must never be described in refusal language.
    expect(r.body.message).not.toMatch(/denied|blocked|forbidden/i);
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
