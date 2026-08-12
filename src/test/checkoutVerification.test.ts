import { describe, it, expect } from "vitest";
import {
  decideCheckoutState,
  MEMBERSHIP_OFFER,
  normalizeEmail,
  type LocalFacts,
  type OfferConfig,
  type SessionFacts,
} from "../../supabase/functions/_shared/membershipOffer";

/**
 * Prompt 4 payment-truth matrix. Mocks and synthetic fixtures only — no Stripe
 * call, no database, no real member.
 */

const CONFIG: OfferConfig = {
  productId: "prod_drm",
  monthlyPriceId: "price_monthly_67",
  stripeMode: "live",
  keyClassMismatch: null,
};

const SESSION_ID = "cs_live_a1b2c3d4e5f6g7h8";

const goodSession = (over: Partial<SessionFacts> = {}): SessionFacts => ({
  sessionId: SESSION_ID,
  status: "complete",
  paymentStatus: "paid",
  livemode: true,
  mode: "subscription",
  currency: "usd",
  amountTotal: 2700,
  email: "Member@Example.com",
  trialDays: 14,
  paymentIntentStatus: "succeeded",
  lineItems: [
    {
      priceId: null,
      productId: "prod_drm",
      unitAmount: 2700,
      currency: "usd",
      recurringInterval: null,
      quantity: 1,
    },
    {
      priceId: "price_monthly_67",
      productId: "prod_drm",
      unitAmount: 6700,
      currency: "usd",
      recurringInterval: "month",
      quantity: 1,
    },
  ],
  ...over,
});

const goodLocal = (over: Partial<LocalFacts> = {}): LocalFacts => ({
  orderCount: 1,
  orderEmail: "member@example.com",
  accountExists: true,
  roleAssigned: true,
  subscriptionPresent: true,
  ...over,
});

const decide = (s: Partial<SessionFacts> = {}, l: Partial<LocalFacts> = {}, c = CONFIG) =>
  decideCheckoutState(goodSession(s), goodLocal(l), c);

describe("checkout verification matrix", () => {
  it("fully matching, paid and provisioned → verified", () => {
    expect(decide()).toBe("verified");
  });

  it("offer constants are the approved $27 / $67 / 14-day structure", () => {
    expect(MEMBERSHIP_OFFER.initialAmount).toBe(2700);
    expect(MEMBERSHIP_OFFER.renewalAmount).toBe(6700);
    expect(MEMBERSHIP_OFFER.trialDays).toBe(14);
    expect(MEMBERSHIP_OFFER.currency).toBe("usd");
  });

  it("no_payment_required is never verified", () => {
    expect(decide({ paymentStatus: "no_payment_required" })).toBe("unverified");
  });

  it("unpaid → unverified", () => {
    expect(decide({ status: "open", paymentStatus: "unpaid" })).toBe("unverified");
  });

  it("payment intent processing → processing", () => {
    expect(decide({ status: "open", paymentStatus: "unpaid", paymentIntentStatus: "processing" })).toBe(
      "processing",
    );
  });

  it("expired session → unverified", () => {
    expect(decide({ status: "expired", paymentStatus: "unpaid", paymentIntentStatus: null })).toBe(
      "unverified",
    );
  });

  it("paid but webhook provisioning incomplete → processing", () => {
    expect(decide({}, { accountExists: false, roleAssigned: false, subscriptionPresent: false })).toBe(
      "processing",
    );
  });

  it("partially provisioned → processing", () => {
    expect(decide({}, { subscriptionPresent: false })).toBe("processing");
    expect(decide({}, { roleAssigned: false })).toBe("processing");
  });

  it("refresh after webhook completion flips processing → verified", () => {
    expect(decide({}, { roleAssigned: false })).toBe("processing");
    expect(decide()).toBe("verified"); // same session id, later read
  });

  it("test-mode session in live mode → unverified", () => {
    expect(decide({ livemode: false })).toBe("unverified");
  });

  it("stripe key class mismatch → unverified", () => {
    expect(decide({}, {}, { ...CONFIG, keyClassMismatch: "stripe_mode=live but key is test" })).toBe(
      "unverified",
    );
  });

  it("wrong checkout mode → unverified", () => {
    expect(decide({ mode: "payment" })).toBe("unverified");
  });

  it("wrong product → unverified", () => {
    const s = goodSession();
    s.lineItems[0].productId = "prod_other";
    expect(decideCheckoutState(s, goodLocal(), CONFIG)).toBe("unverified");
  });

  it("wrong initial price → unverified", () => {
    const s = goodSession({ amountTotal: 100 });
    s.lineItems[0].unitAmount = 100;
    expect(decideCheckoutState(s, goodLocal(), CONFIG)).toBe("unverified");
  });

  it("wrong recurring price id → unverified", () => {
    const s = goodSession();
    s.lineItems[1].priceId = "price_other";
    expect(decideCheckoutState(s, goodLocal(), CONFIG)).toBe("unverified");
  });

  it("wrong recurring amount → unverified", () => {
    const s = goodSession();
    s.lineItems[1].unitAmount = 4700;
    expect(decideCheckoutState(s, goodLocal(), CONFIG)).toBe("unverified");
  });

  it("wrong amount total → unverified", () => {
    expect(decide({ amountTotal: 9900 })).toBe("unverified");
  });

  it("wrong currency → unverified", () => {
    expect(decide({ currency: "eur" })).toBe("unverified");
    const s = goodSession();
    s.lineItems[1].currency = "gbp";
    expect(decideCheckoutState(s, goodLocal(), CONFIG)).toBe("unverified");
  });

  it("wrong interval or trial length → unverified", () => {
    const s = goodSession();
    s.lineItems[1].recurringInterval = "year";
    expect(decideCheckoutState(s, goodLocal(), CONFIG)).toBe("unverified");
    expect(decide({ trialDays: 30 })).toBe("unverified");
  });

  it("wrong line items (extra or missing) → unverified", () => {
    expect(decide({ lineItems: [goodSession().lineItems[0]] })).toBe("unverified");
    const s = goodSession();
    s.lineItems.push({ ...s.lineItems[0] });
    expect(decideCheckoutState(s, goodLocal(), CONFIG)).toBe("unverified");
  });

  it("wrong email/order binding → unverified", () => {
    expect(decide({}, { orderEmail: "someone.else@example.com" })).toBe("unverified");
    expect(decide({ email: null })).toBe("unverified");
  });

  it("normalized email comparison is case and whitespace insensitive", () => {
    expect(normalizeEmail("  Member@Example.COM ")).toBe("member@example.com");
    expect(decide({ email: " MEMBER@example.com " })).toBe("verified");
  });

  it("missing local order → unverified", () => {
    expect(decide({}, { orderCount: 0, orderEmail: null })).toBe("unverified");
  });

  it("duplicate/ambiguous local orders → unverified", () => {
    expect(decide({}, { orderCount: 2, orderEmail: null })).toBe("unverified");
  });

  it("malformed session id → unverified", () => {
    for (const id of ["", "abc", "cs_", "sess_1234567890", "cs_" + "x".repeat(400), "cs_;drop"]) {
      expect(decideCheckoutState(goodSession({ sessionId: id }), goodLocal(), CONFIG)).toBe(
        "unverified",
      );
    }
  });

  it("replay of another order's session (order bound elsewhere) → unverified", () => {
    expect(decide({}, { orderCount: 1, orderEmail: "other@example.com" })).toBe("unverified");
  });

  it("repeated verification is stable and side-effect free (page refresh, concurrency)", () => {
    const s = goodSession();
    const l = goodLocal();
    const results = [1, 2, 3, 4].map(() => decideCheckoutState(s, l, CONFIG));
    expect(results).toEqual(["verified", "verified", "verified", "verified"]);
    expect(s).toEqual(goodSession());
    expect(l).toEqual(goodLocal());
  });

  it("decision never returns anything outside the allowed states", () => {
    const allowed = new Set(["verified", "processing", "unverified", "error"]);
    for (const status of ["complete", "open", "expired", null]) {
      for (const pay of ["paid", "unpaid", "no_payment_required", null]) {
        expect(allowed.has(decide({ status, paymentStatus: pay }))).toBe(true);
      }
    }
  });
});
