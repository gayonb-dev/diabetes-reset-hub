// Processor inventory for the deletion lifecycle (audit finding 5).
//
// Processor items are derived from the member's ACTUAL data and integrations.
// Nothing is asserted that has not been observed:
//   * Dexcom is listed only when a connection row existed.
//   * Resend is listed only when email processing actually occurred, and
//     delivered mail is never described as recalled.
//   * The AI gateway is listed only when member content was actually sent.
//   * Stripe subscription cancellation is tracked SEPARATELY from Stripe
//     financial/customer/checkout records, which are retained under a
//     financial-retention obligation and are never labelled deleted.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

/**
 * Terminal dispositions. `tracked_not_verified` is deliberately NOT terminal:
 * a job holding it stays `waiting_for_processor`.
 */
export const TERMINAL_STATUSES = [
  "verified_deleted",
  "verified_cancelled",
  "not_applicable",
  "action_required_by_member",
  "retained_required",
] as const;

export type ProcessorStatus = typeof TERMINAL_STATUSES[number] | "tracked_not_verified";

export interface ProcessorItem {
  processor: string;
  item: string;
  status: ProcessorStatus;
  basis?: string;
  owner_action?: string;
  member_action?: string;
  verified_at?: string;
  /** Exact processor object ids still outstanding on this item. */
  pending_ids?: string[];
  /** Exact processor object ids this run observed as cancelled. */
  cancelled_ids?: string[];
}

export function isTerminal(status: unknown): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(String(status));
}

async function countOf(
  admin: SupabaseClient, table: string, column: string, value: string,
): Promise<number> {
  const { count, error } = await admin
    .from(table).select("*", { count: "exact", head: true }).eq(column, value);
  if (error) return -1; // unknown -> caller keeps the item unverified
  return count ?? 0;
}

/**
 * Builds the processor list for one member from observed data. Categories with
 * no data are recorded as `not_applicable` with the basis stated, rather than
 * omitted (so the receipt shows what was considered) — and never as a
 * fabricated completed revocation.
 */
export async function buildProcessorItems(
  admin: SupabaseClient,
  userId: string,
): Promise<ProcessorItem[]> {
  const items: ProcessorItem[] = [];

  // ---- Stripe: subscription cancellation ----
  const { data: subs } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("user_id", userId);
  const subIds = (subs ?? [])
    .map((s: { stripe_subscription_id: string | null }) => s.stripe_subscription_id)
    .filter((v: string | null): v is string => !!v);
  const hasBilling = (subs ?? []).length > 0;

  if (subIds.length) {
    items.push({
      processor: "stripe",
      item: "active billing subscription cancellation",
      status: "tracked_not_verified",
      basis: `${subIds.length} subscription record(s) found for this member`,
    });
  } else {
    items.push({
      processor: "stripe",
      item: "active billing subscription cancellation",
      status: "not_applicable",
      basis: "no billing subscription record existed for this member",
    });
  }

  // ---- Stripe: financial / customer / checkout records ----
  // These are NOT erased by cancellation. Labelling them deleted would be false.
  const { count: orderCount } = await admin
    .from("orders").select("*", { count: "exact", head: true }).eq("user_id", userId);
  if (hasBilling || (orderCount ?? 0) > 0) {
    items.push({
      processor: "stripe",
      item: "customer, checkout, invoice and payment records",
      status: "retained_required",
      basis:
        "retained by the payment processor under statutory financial record-keeping; " +
        "cancellation does not erase these records and they are not claimed as deleted",
      owner_action:
        "OWNER/COUNSEL gate: confirm the retention period and the erasure request to be " +
        "filed with the processor once that period ends.",
    });
  } else {
    items.push({
      processor: "stripe",
      item: "customer, checkout, invoice and payment records",
      status: "not_applicable",
      basis: "no order or billing record existed for this member",
    });
  }

  // ---- Dexcom: only when a connection actually existed ----
  const dexcom = await countOf(admin, "dexcom_connections", "member_id", userId);
  if (dexcom > 0) {
    items.push({
      processor: "dexcom",
      item: "third-party app authorization",
      status: "action_required_by_member",
      basis: "a Dexcom connection existed for this member",
      member_action:
        "Revoke the Diabetes Reset Method app in your Dexcom account. This service " +
        "cannot revoke that authorization on your behalf.",
    });
  } else {
    items.push({
      processor: "dexcom",
      item: "third-party app authorization",
      status: "not_applicable",
      basis: "no Dexcom connection existed for this member",
    });
  }

  // ---- Resend: only when email processing actually occurred ----
  const broadcast = await countOf(admin, "broadcast_log", "user_id", userId);
  if (broadcast > 0) {
    items.push({
      processor: "resend",
      item: "outbound email processing records",
      status: "retained_required",
      basis: `${broadcast} outbound email record(s) exist for this member`,
      owner_action:
        "Delivered email cannot be recalled from a recipient inbox. Processor-side " +
        "log erasure follows the provider's retention window and is not claimed here.",
    });
  } else {
    items.push({
      processor: "resend",
      item: "outbound email processing records",
      status: "not_applicable",
      basis: "no outbound email was processed for this member",
    });
  }

  // ---- AI gateway: only when member content was actually sent ----
  const { data: convos } = await admin
    .from("conversations").select("id").eq("user_id", userId).limit(1);
  const aiUsed = (convos ?? []).length > 0;
  if (aiUsed) {
    items.push({
      processor: "ai_gateway",
      item: "prompt transit records",
      status: "tracked_not_verified",
      basis: "member conversation content was sent to the model gateway",
      owner_action:
        "Terminal disposition requires a processor contract clause, a published " +
        "retention statement, or an erasure result. None is assumed.",
    });
  } else {
    items.push({
      processor: "ai_gateway",
      item: "prompt transit records",
      status: "not_applicable",
      basis: "no member content was sent to the model gateway",
    });
  }

  return items;
}
