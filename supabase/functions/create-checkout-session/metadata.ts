// P1 legacy retirement: Stripe metadata is built from an explicit allowlist of
// non-identity fields. Caller-provided metadata objects are never spread or
// forwarded, so no browser-generated identifier (anonymousId, anonymous_id,
// visitor_id, visitor_profile_id, …) can ever reach Stripe.

/** The only keys that may ever appear in Stripe metadata from this function. */
export const METADATA_ALLOWLIST = [
  "customerName",
  "customerPhone",
  "productId",
  "paymentPlan",
] as const;

export type CheckoutMetadataField = (typeof METADATA_ALLOWLIST)[number];

/** Builds Stripe metadata from server-derived values, filtered by allowlist. */
export function buildCheckoutMetadata(
  fields: Partial<Record<string, unknown>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of METADATA_ALLOWLIST) {
    const value = fields[key];
    out[key] = typeof value === "string" ? value : "";
  }
  return out;
}
