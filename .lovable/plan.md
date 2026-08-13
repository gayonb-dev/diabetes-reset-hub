# Prompt 5 closeout — refund and dispute lifecycle

Scope: add refund and dispute handling to the existing subscription webhook and lifecycle. Nothing else in Prompt 5 is reopened.

## What gets added

Four events handled inside the existing `stripe-subscription-webhook`, reusing the current signature verification, `claim_billing_event` ledger, ordering decision and current-object retrieval:

- `charge.refunded`
- `refund.updated`
- `charge.dispute.created`
- `charge.dispute.closed`

No second event system, no new endpoint.

## Refund mapping

Resolution path: refund/charge -> `payment_intent` -> `orders.stripe_payment_intent_id` (existing trusted identifier) -> that order's entitlement only. Current charge is retrieved from Stripe when the event is stale, tied, or missing aggregate amounts.

| Current Stripe state | Order status | Entitlement |
| --- | --- | --- |
| Refund `succeeded`, `amount_refunded >= amount` | `refunded` | revoke only the entitlement that this payment supplied |
| Refund `succeeded`, `0 < amount_refunded < amount` | `partially_refunded` | unchanged, owner-review flag raised |
| Refund `pending` / `requires_action` | unchanged | unchanged |
| Refund `failed` / `canceled` | unchanged (never `refunded`) | unchanged |

- Full-vs-partial is decided from Stripe's **current aggregate** `amount_refunded`, so several partial refunds that add up to the full amount correctly become `refunded`.
- Revocation never touches access supported by an independently valid paid order or a live subscription: the subscription row is only affected when the refunded charge is the one backing it.
- The raw Stripe status string is stored alongside the canonical status for reconciliation.
- The webhook never issues a refund.

## Dispute mapping

Resolution path: dispute -> `charge` -> `payment_intent` -> order/subscription.

| Dispute state | Effect |
| --- | --- |
| `charge.dispute.created` (any reason) | temporary suspension of only the disputed paid entitlement; Billing, Settings, support, cancellation, authenticated export and account deletion stay available |
| closed `won` | access restored **only if** current payment + subscription state independently qualifies (re-evaluated, not assumed) |
| closed `lost` | no automatic restore |
| `warning_needs_response`, `warning_under_review`, `warning_closed`, `needs_response`, `under_review` | mapped explicitly to a conservative "under review" hold; never silently treated as won or lost |

Dispute ID and verified state are stored server-side only; no Stripe identifier is exposed to the browser. The webhook never submits evidence or accepts a dispute. The Prompt 3 deletion restriction continues to override every billing outcome.

## Technical changes

**Migration (additive only, no rewrite of existing rows):**
- `orders`: `stripe_charge_id`, `amount_refunded` (default 0), `raw_refund_status`, `refund_review_required` (bool), all nullable/defaulted so existing rows are untouched.
- New `public.billing_holds` (user_id, order_id, hold_type `dispute`, stripe_dispute_id, dispute_status, raw_status, opened_at, resolved_at) with RLS: no client read of Stripe IDs, service_role full, admin read.
- `membership_access_state(uuid)` extended: an open dispute hold on the entitlement backing the current subscription returns `blocked`; the billing/settings/support/export/deletion surfaces are already outside the membership gate, so suspension does not touch them.

**Shared modules:**
- `_shared/billingCanonical.ts`: add `canonicalRefundOutcome()` and `canonicalDisputeOutcome()` pure mappers (plus refund-aggregate helper). Pure, unit-testable.
- `_shared/membershipLifecycle.ts`: accept an optional `disputeHold` fact in the evaluator so client presentation matches the server.

**Webhook:** four new `case` branches following the existing pattern (`decision` -> optional refetch -> mutate -> `finalize(...)`). Unsupported events keep falling through to `finalize("ignored")`.

## Verification (synthetic only)

New `src/test/billingRefundDispute.test.ts` plus Deno-level fixture tests covering: full refund; partial refund; multiple partials summing to full; pending/failed/canceled refunds; refund isolated to its own entitlement; dispute created; dispute won with and without independently valid access; dispute lost; warning/enquiry states; duplicate delivery; concurrent delivery; reverse ordering; same-second events; stale payload corrected by retrieval; wrong endpoint secret, forged signature, missing signature; unknown event; and no mutation of unrelated orders/subscriptions/members.

Then rerun the existing subscription, lifecycle, checkout, deletion-cancellation and magic-link regressions, TypeScript, lint on touched files, and build. Deploy only `stripe-subscription-webhook`. No client publish, no real Stripe object touched, no real member row mutated; synthetic rows are removed and residue re-checked.

## Owner action after deployment

Enable exactly these four events on `https://wqennhjdojjqmmqzjhti.supabase.co/functions/v1/stripe-subscription-webhook`: `charge.refunded`, `refund.updated`, `charge.dispute.created`, `charge.dispute.closed`. Until a genuine event arrives, live delivery remains unobserved.
