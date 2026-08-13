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

Resolution keeps the full trusted chain, never a guess: `refund -> charge -> payment_intent -> invoice/order -> subscription -> entitlement period`. Current charge/refund state is retrieved from Stripe whenever the event is stale, tied, or lacks aggregate amounts.

| Current Stripe state | Order status | Entitlement |
| --- | --- | --- |
| Refund `succeeded`, `amount_refunded >= amount` | `refunded` | recompute entitlement across all independently valid payments/subscriptions |
| Refund `succeeded`, `0 < amount_refunded < amount` | `partially_refunded` | unchanged, owner-review flag raised |
| Refund `pending` / `requires_action` | unchanged | unchanged |
| Refund `failed` / `canceled` | unchanged (never `refunded`) | unchanged |

A full refund does **not** assume the refunded charge is the payment currently supporting access. After marking the order, entitlement is recomputed from the current set of paid periods:

- Refunding the $27 introductory payment revokes introductory access only while that payment is still the one supporting the current entitlement.
- Refunding an older renewal never revokes access supported by a later valid paid renewal.
- Refunding the currently qualifying renewal revokes only that entitlement, unless another independently valid entitlement covers the period.
- A live subscription row alone is not sufficient: if its current qualifying payment has been fully refunded, entitlement fails.
- A historical refunded payment never overrides a later verified paid period.

Full-vs-partial is decided from Stripe's **current aggregate** `amount_refunded`, so several partials that add up to the full amount correctly become `refunded`. The raw Stripe status is stored alongside the canonical status for reconciliation. The webhook never issues a refund.

## Dispute mapping

Resolution path: dispute -> `charge` -> `payment_intent` -> order/subscription. There is one access-state vocabulary; the dispute state is the existing canonical `suspended_dispute`, used identically by the SQL functions, the shared evaluator and presentation copy. No new value is introduced.

| Current verified dispute status | Effect |
| --- | --- |
| `needs_response`, `under_review` | formal dispute: active hold; `suspended_dispute` for only the associated entitlement |
| `warning_needs_response`, `warning_under_review` | inquiry/early warning: owner-review flag only, paid access **not** suspended |
| `warning_closed` | inquiry closed without becoming a formal dispute: resolve hold/review, reevaluate from current independent payment and subscription state |
| `prevented` | dispute prevented: resolve hold/review, reevaluate independent entitlement |
| `won` | resolve the hold, then restore access only if current payment/subscription state independently qualifies |
| `lost` | no automatic restore of the associated entitlement |
| unknown/unmapped | fail closed into owner review: no guess, no new access granted, no permanent revocation of unrelated access |

While `suspended_dispute` applies, Billing, Settings, support, cancellation, authenticated export and account deletion all remain available. The dispute ID and verified state are stored server-side only; no Stripe identifier reaches the browser. The webhook never submits evidence or accepts a dispute. The Prompt 3 deletion restriction continues to override every billing outcome.


## Technical changes

**Migration (additive only, no rewrite of existing rows):**
- `orders`: `stripe_charge_id`, `stripe_invoice_id`, `amount_refunded` (default 0), `raw_refund_status`, `period_start`/`period_end` (the entitlement period the payment funds), `refund_review_required` (bool) — all nullable/defaulted so existing rows are untouched.
- New `public.billing_holds` (user_id, order_id, hold_type `dispute`, stripe_dispute_id, dispute_status, raw_status, review_only bool, opened_at, resolved_at) with RLS: no client read of Stripe IDs, service_role full, admin read.
- `membership_access_state(uuid)` extended with the existing canonical `suspended_dispute` state: an unresolved, non-review-only dispute hold on the entitlement backing the current qualifying payment returns `suspended_dispute`; a fully refunded qualifying payment with no other valid paid period falls through to the existing blocked path. Billing/settings/support/export/deletion surfaces are already outside the membership gate, so neither state touches them.

**Shared modules:**
- `_shared/billingCanonical.ts`: add `canonicalRefundOutcome()` and `canonicalDisputeOutcome()` pure mappers (aggregate-refund helper included), with the exact dispute-status table above and an explicit fail-closed owner-review branch for unknown statuses.
- `_shared/membershipLifecycle.ts`: add `suspended_dispute` to `AccessState` and accept `disputeHold` plus the set of qualifying paid periods, so server, SQL and client presentation share one vocabulary and one entitlement recomputation.

**Webhook:** four new `case` branches following the existing pattern (`decision` -> optional refetch -> mutate -> `finalize(...)`). Unsupported events keep falling through to `finalize("ignored")`.

## Verification (synthetic only)

New `src/test/billingRefundDispute.test.ts` plus Deno-level fixture tests covering: full refund; partial refund; multiple partials summing to full; pending/failed/canceled refunds; full refund of the introductory payment during the first 14 days; refund of the introductory payment after a later renewal has independently paid; refund of an older renewal while a newer renewal is valid; refund of the currently qualifying renewal; two independent qualifying entitlements where only one is refunded; live subscription whose qualifying payment was fully refunded; dispute created (`needs_response`, `under_review`); `warning_needs_response` and `warning_under_review` raising review without suspension; `warning_closed`; `prevented`; dispute won with and without independently valid access; dispute lost; unknown dispute status failing closed to owner review; duplicate delivery; concurrent delivery; reverse ordering; same-second events; stale payload corrected by retrieval; wrong endpoint secret, forged signature, missing signature; unknown event; and no mutation of unrelated orders/subscriptions/members.

Then rerun the existing subscription, lifecycle, checkout, deletion-cancellation and magic-link regressions, TypeScript, lint on touched files, and build. Deploy only `stripe-subscription-webhook`. No client publish, no real Stripe object touched, no real member row mutated; synthetic rows are removed and residue re-checked.

## Owner action after deployment

Enable exactly these four events on `https://wqennhjdojjqmmqzjhti.supabase.co/functions/v1/stripe-subscription-webhook`: `charge.refunded`, `refund.updated`, `charge.dispute.created`, `charge.dispute.closed`. Until a genuine event arrives, live delivery remains unobserved.
