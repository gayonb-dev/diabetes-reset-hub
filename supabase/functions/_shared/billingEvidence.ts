// Billing evidence for the deletion precondition.
//
// The absence of a `subscriptions` row is NOT proof that a member was never
// billed: a previous interrupted run may have deleted it, or a webhook may
// never have written it. A member may only proceed with destructive deletion
// while `stripe_deletion_enabled` is false when local evidence positively
// proves the account was never connected to the payment processor.
//
// Anything else, evidence present, conflicting, or a lookup that could not be
// completed, fails closed.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export interface BillingEvidence {
  /** True only when every source was readable AND none showed processor linkage. */
  neverBilled: boolean;
  /** True when at least one source could not be read; callers must fail closed. */
  indeterminate: boolean;
  /** Human-readable evidence lines. Never returned to the member. */
  reasons: string[];
  /** Exact outstanding Stripe subscription ids, owner-only. */
  pendingIds: string[];
}

/** Subscription ids carried on a job's Stripe cancellation processor item. */
export function carriedPendingIds(processorItems: unknown): string[] {
  const items = Array.isArray(processorItems) ? processorItems : [];
  const item = items.find((p) => {
    const r = p as Record<string, unknown>;
    return r?.processor === "stripe" &&
      /subscription cancellation/i.test(String(r?.item ?? ""));
  }) as Record<string, unknown> | undefined;
  const ids = item?.pending_ids;
  return Array.isArray(ids) ? ids.filter((v): v is string => typeof v === "string") : [];
}

export async function collectBillingEvidence(
  admin: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<BillingEvidence> {
  const reasons: string[] = [];
  const pendingIds: string[] = [];
  let indeterminate = false;

  // 1. Subscription rows (any state, cancelled included).
  {
    const { data, error } = await admin.from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id, status").eq("user_id", userId);
    if (error) {
      indeterminate = true;
      reasons.push(`subscriptions lookup failed: ${error.message}`);
    } else if ((data ?? []).length) {
      reasons.push(`${data!.length} subscription record(s) exist`);
      for (const s of data!) {
        if (s.stripe_subscription_id) pendingIds.push(s.stripe_subscription_id);
      }
    }
  }

  // 2. Ids carried on any active deletion job for this member.
  {
    const { data, error } = await admin.from("deletion_jobs")
      .select("processor_items").eq("user_id", userId);
    if (error) {
      indeterminate = true;
      reasons.push(`deletion_jobs lookup failed: ${error.message}`);
    } else {
      for (const j of data ?? []) {
        for (const id of carriedPendingIds(j.processor_items)) {
          if (!pendingIds.includes(id)) pendingIds.push(id);
        }
      }
      if (pendingIds.length) reasons.push("outstanding processor subscription id(s) recorded");
    }
  }

  // 3. Orders / payment records, matched on the account email.
  if (email) {
    const { data, error } = await admin.from("orders")
      .select("id, amount, status, stripe_payment_intent_id, stripe_session_id")
      .ilike("customer_email", email);
    if (error) {
      indeterminate = true;
      reasons.push(`orders lookup failed: ${error.message}`);
    } else if ((data ?? []).length) {
      reasons.push(`${data!.length} order record(s) exist for this account email`);
    }
  } else {
    // No readable email means the order source could not be checked at all.
    indeterminate = true;
    reasons.push("account email unavailable; order records could not be checked");
  }

  // 4. Dunning / invoice attempts.
  {
    const { count, error } = await admin.from("dunning_attempts")
      .select("id", { count: "exact", head: true }).eq("user_id", userId);
    if (error) {
      indeterminate = true;
      reasons.push(`dunning_attempts lookup failed: ${error.message}`);
    } else if ((count ?? 0) > 0) {
      reasons.push(`${count} dunning attempt(s) exist`);
    }
  }

  return {
    neverBilled: !indeterminate && reasons.length === 0,
    indeterminate,
    reasons,
    pendingIds,
  };
}
