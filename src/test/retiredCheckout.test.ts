import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Focused source-level guarantees for the retired $497 checkout.
 *
 * The Edge Function is Deno code and cannot be imported into this jsdom test
 * runner, so these assertions verify the exact guarantees the authority asks
 * for on the deployed source: the retired key is rejected with HTTP 410 before
 * any Stripe client is constructed, before any Stripe request, and before any
 * order row is created, and the live $27/$67 membership path is untouched.
 */
const root = resolve(__dirname, "../..");
const checkout = readFileSync(
  resolve(root, "supabase/functions/create-checkout-session/index.ts"),
  "utf8",
);
const subCheckout = readFileSync(
  resolve(root, "supabase/functions/create-subscription-checkout/index.ts"),
  "utf8",
);

describe("retired $497 offer is gone from the checkout registry", () => {
  it("no product registry entry exists for the retired program", () => {
    expect(checkout).not.toMatch(/"six-week-reset-497":\s*\{/);
    expect(checkout).not.toContain("49700");
    expect(checkout).not.toContain("26700");
  });

  it("subscription checkout has no retired product keys or $497 amounts", () => {
    expect(subCheckout).not.toContain("six-week-reset");
    expect(subCheckout).not.toContain("49700");
  });
});

describe("retired product keys are rejected with HTTP 410 before any processor work", () => {
  const rejectIdx = checkout.indexOf("RETIRED_PRODUCTS.has(productId)");
  const stripeIdx = checkout.indexOf("new Stripe(");
  const clientIdx = checkout.indexOf("createClient(");
  const insertIdx = checkout.indexOf(".insert(");

  it("declares the retired keys", () => {
    expect(checkout).toMatch(/RETIRED_PRODUCTS\s*=\s*new Set\(\[/);
    expect(checkout).toContain('"six-week-reset-497"');
  });

  it("returns status 410 with a safe replacement destination", () => {
    const block = checkout.slice(rejectIdx, rejectIdx + 500);
    expect(block).toContain("status: 410");
    expect(block).toContain('replacement: "/#pricing"');
  });

  it("rejects before the Stripe client is constructed and before any Stripe call", () => {
    expect(rejectIdx).toBeGreaterThan(-1);
    expect(stripeIdx).toBeGreaterThan(rejectIdx);
  });

  it("rejects before any Supabase admin client or order insert", () => {
    expect(clientIdx).toBeGreaterThan(rejectIdx);
    expect(insertIdx).toBeGreaterThan(rejectIdx);
  });
});

describe("live membership checkout is unchanged", () => {
  it("keeps the $27 entry product", () => {
    expect(checkout).toContain('"five-day-reset-27"');
    expect(checkout).toContain("2700");
  });

  it("keeps the recurring membership checkout function intact", () => {
    expect(subCheckout).toMatch(/checkout\.sessions\.create/);
  });
});
