// Batch 2 closeout, immutable order ownership.
//
// `orders` RLS now grants a member read access only through an immutable,
// server-established relationship (`orders.user_id`, or `orders.subscription_id`
// -> a subscription owned by the member). The subscription webhook already binds
// both. The one-time payment webhook did not, which would leave every newly
// provisioned one-time order ownerless.
//
// This helper closes that gap. It is deliberately narrow:
//
//   * the email is taken from the SERVER-retrieved Stripe session or from the
//     stored order row, never from a request body, URL, browser state or
//     caller-supplied metadata;
//   * the account is resolved through the shared admin resolver, so an account
//     past the first Auth page is still found;
//   * the write is conditional on `user_id IS NULL`, so a replayed webhook can
//     neither change nor duplicate an existing owner;
//   * when no account matches, the order is left ownerless (fail closed) and
//     stays visible to Admin only.

import { findUserByEmail, type AdminListUsersClient } from "./findUserByEmail.ts";

export interface OwnershipClient {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
      };
    };
    update: (values: Record<string, unknown>) => {
      eq: (col: string, val: string) => {
        is: (col: string, val: null) => {
          select: (cols: string) => Promise<{ data: unknown[] | null; error: unknown }>;
        };
      };
    };
  };
}

export type OwnershipReason =
  | "assigned"
  | "already_owned"
  | "no_order"
  | "no_email"
  | "no_account"
  | "raced"
  | "error";

export interface OwnershipResult {
  changed: boolean;
  reason: OwnershipReason;
  /** Present only when this call assigned the owner. */
  userId?: string;
}

/** Lower-cased, trimmed email, or null when unusable. */
export function normalizeOwnerEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return v.includes("@") ? v : null;
}

/**
 * Assign immutable ownership to the order behind a completed Stripe session.
 *
 * `sessionEmail` must come from the Stripe session object retrieved from Stripe
 * (or the signed event payload), never from anything a browser supplied.
 */
export async function assignImmutableOwner(
  admin: OwnershipClient & AdminListUsersClient,
  sessionId: string,
  sessionEmail: unknown,
): Promise<OwnershipResult> {
  try {
    const { data: order } = await admin
      .from("orders")
      .select("id, user_id, customer_email")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (!order) return { changed: false, reason: "no_order" };
    if (order.user_id) return { changed: false, reason: "already_owned" };

    const email = normalizeOwnerEmail(sessionEmail) ?? normalizeOwnerEmail(order.customer_email);
    if (!email) return { changed: false, reason: "no_email" };

    const found = await findUserByEmail(admin, email);
    if (!found?.userId) return { changed: false, reason: "no_account" };

    // Conditional on user_id IS NULL: replay and concurrency safe.
    const { data: updated, error } = await admin
      .from("orders")
      .update({ user_id: found.userId, updated_at: new Date().toISOString() })
      .eq("stripe_session_id", sessionId)
      .is("user_id", null)
      .select("id");

    if (error) return { changed: false, reason: "error" };
    if (!updated || updated.length === 0) return { changed: false, reason: "raced" };
    return { changed: true, reason: "assigned", userId: found.userId };
  } catch {
    return { changed: false, reason: "error" };
  }
}
