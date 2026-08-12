// Server-held DRM membership offer definition + the pure verification decision.
//
// Nothing in this module reads request input. The Edge Function gathers facts
// from Stripe and the database and hands them to `decideCheckoutState`, which
// is a pure function so it can be unit tested from both Deno and Vitest.

export const MEMBERSHIP_OFFER = {
  /** Introductory charge taken immediately, in cents. */
  initialAmount: 2700,
  /** Recurring charge after the introductory period, in cents. */
  renewalAmount: 6700,
  currency: "usd",
  interval: "month",
  trialDays: 14,
  checkoutMode: "subscription",
} as const;

export type CheckoutState = "verified" | "processing" | "unverified" | "error";

export interface OfferConfig {
  /** Server-held Stripe product id for the membership (STRIPE_PRODUCT_ID). */
  productId: string;
  /** Server-held recurring price id (STRIPE_PRICE_ID_MONTHLY). */
  monthlyPriceId: string;
  /** "test" | "live" from app_config.stripe_mode. */
  stripeMode: string;
  /** Non-null when the configured key class disagrees with stripeMode. */
  keyClassMismatch: string | null;
}

export interface LineItemFacts {
  priceId: string | null;
  productId: string | null;
  unitAmount: number | null;
  currency: string | null;
  recurringInterval: string | null;
  quantity: number | null;
}

export interface SessionFacts {
  sessionId: string;
  status: string | null;
  paymentStatus: string | null;
  livemode: boolean;
  mode: string | null;
  currency: string | null;
  amountTotal: number | null;
  email: string | null;
  trialDays: number | null;
  paymentIntentStatus?: string | null;
  lineItems: LineItemFacts[];
}

export interface LocalFacts {
  /** Number of local orders whose stripe_session_id equals this exact session. */
  orderCount: number;
  /** Normalized email on that single order, when exactly one exists. */
  orderEmail: string | null;
  /** Local provisioning completed by the signed webhook. */
  accountExists: boolean;
  roleAssigned: boolean;
  subscriptionPresent: boolean;
}

/** Stripe Checkout Session id shape. */
export const SESSION_ID_RE = /^cs_[A-Za-z0-9_]{10,200}$/;

export function normalizeEmail(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return v.length > 0 ? v : null;
}

/**
 * The single decision point. Returns "verified" only when every applicable
 * server-side condition holds. Anything unknown, mismatched or client-shaped
 * degrades to "unverified" (or "processing" where Stripe says the money is
 * genuinely still settling, or local provisioning has not finished yet).
 */
export function decideCheckoutState(
  session: SessionFacts,
  local: LocalFacts,
  config: OfferConfig,
): CheckoutState {
  // 0. Shape.
  if (!SESSION_ID_RE.test(session.sessionId)) return "unverified";

  // 1. Environment agreement. A test-mode session can never verify in live mode.
  if (config.keyClassMismatch) return "unverified";
  const expectLive = config.stripeMode === "live";
  if (session.livemode !== expectLive) return "unverified";

  // 2. Offer structure — server-held values only.
  if (session.mode !== MEMBERSHIP_OFFER.checkoutMode) return "unverified";
  if ((session.currency || "").toLowerCase() !== MEMBERSHIP_OFFER.currency) return "unverified";

  const items = session.lineItems ?? [];
  if (items.length !== 2) return "unverified";

  const oneTime = items.find((i) => i.recurringInterval == null);
  const recurring = items.find((i) => i.recurringInterval != null);
  if (!oneTime || !recurring) return "unverified";

  const okCurrency = (c: string | null) => (c || "").toLowerCase() === MEMBERSHIP_OFFER.currency;

  if (
    oneTime.productId !== config.productId ||
    oneTime.unitAmount !== MEMBERSHIP_OFFER.initialAmount ||
    !okCurrency(oneTime.currency) ||
    (oneTime.quantity ?? 1) !== 1
  ) {
    return "unverified";
  }

  if (
    recurring.priceId !== config.monthlyPriceId ||
    (recurring.productId != null && recurring.productId !== config.productId) ||
    recurring.unitAmount !== MEMBERSHIP_OFFER.renewalAmount ||
    !okCurrency(recurring.currency) ||
    recurring.recurringInterval !== MEMBERSHIP_OFFER.interval ||
    (recurring.quantity ?? 1) !== 1
  ) {
    return "unverified";
  }

  if (session.amountTotal !== MEMBERSHIP_OFFER.initialAmount) return "unverified";

  // 3. Local order binding: exactly one order for this exact session id, and the
  //    normalized checkout email must match it.
  if (local.orderCount !== 1) return "unverified";
  const checkoutEmail = normalizeEmail(session.email);
  const orderEmail = normalizeEmail(local.orderEmail);
  if (!checkoutEmail || !orderEmail || checkoutEmail !== orderEmail) return "unverified";

  // 4. Payment truth. `no_payment_required` is never accepted for a paid
  //    membership: the $27 must actually have been taken.
  if (session.status === "complete" && session.paymentStatus === "paid") {
    // The introductory period must be exactly the approved 14 days.
    if (session.trialDays !== MEMBERSHIP_OFFER.trialDays) return "unverified";
    // 5. Local provisioning must be complete before we claim membership access.
    const provisioned = local.accountExists && local.roleAssigned && local.subscriptionPresent;
    return provisioned ? "verified" : "processing";
  }

  // Delayed-settlement methods: Stripe still has the payment in flight.
  if (session.paymentIntentStatus === "processing") return "processing";

  return "unverified";
}
