# Prompt 5 final correction — account access, trusted refund linkage, missing proofs

Four corrections only. No publication, no Stripe event enablement, no real Stripe object or real member touched. Backend deploys limited to the changed webhook and shared modules; client route changes stay in preview.

## 1. Account controls stay reachable when billing is restricted

Today `AuthGuard` collapses two separate questions into one: a signed-in member whose entitlement is withheld is sent to `/login?inactive=1`, which locks them out of the very pages they need to fix it.

Split the decisions:

- **Authentication** — is there a valid session? No session, any route: go to Login (unchanged).
- **Entitlement** — what surfaces does the shared evaluator permit?

The shared evaluator gains a single source of truth, `allowed_surfaces`, derived from the access state. Route components consume that list; no component re-derives status arrays.

| State | Surfaces permitted |
|---|---|
| allowed / grace | all programme + account surfaces |
| restricted_billing | billing, settings, support, profile |
| suspended_dispute | billing, settings, support, profile |
| restricted_deletion | only what the deletion lifecycle already permits (unchanged, and never widened) |

Behaviour:

- Signed-in member on a permitted surface: renders normally, with the existing calm notice.
- Signed-in member on a paid programme route while restricted: redirect to `/app/billing` carrying explanatory router state — never to Login.
- Anonymous: Login, as now.
- No Stripe identifier and no internal reason code is rendered or placed in the URL.

Deletion restrictions from Prompt 3 keep priority: when a deletion lock is active, the deletion lifecycle's surface list wins over any billing-derived list.

## 2. Canonical vocabulary reconciliation

The approved vocabulary is `allowed`, `grace`, `restricted_billing`, `restricted_deletion`, `suspended_dispute`. The internal `blocked` value disappears as a canonical result:

- Shared evaluator returns the approved names; refund revocation returns `restricted_billing`, not `blocked`.
- SQL `membership_access_state()` returns the same names; `membership_write_allowed()` denies programme writes for `restricted_billing`, `restricted_deletion` and `suspended_dispute`.
- Any historical `blocked` string read from stored rows is mapped at the read boundary only; nothing writes it again.
- Client presentation, route guards, edge functions and tests are updated to the same names in the same pass.

## 3. Trusted refund relationship

Refund entitlement decisions must walk the full chain: refund → charge → PaymentIntent → invoice/order → subscription → entitlement period → member.

Additive schema:

- `orders.stripe_subscription_id` plus an immutable local `subscriptions` foreign key on the order. The local FK is the authoritative link; the Stripe ID is retained for reconciliation. This relationship is documented in the migration and in the webhook module header.
- An owner-review marker on the order (reusing the existing review flag) and a review reason recorded on the ledger event — no raw personal data.

Webhook behaviour on refund events:

1. Retrieve the current charge and invoice from Stripe (never trust the stale payload).
2. Confirm the invoice belongs to the expected subscription.
3. Confirm order and subscription belong to the same member.
4. Confirm the payment funds the DRM membership product/price and the identified entitlement period.
5. Only then apply the existing full-vs-partial refund logic.

If the chain is missing, contradictory or ambiguous: record an owner-review item, leave entitlement untouched, do not guess the member, do not resolve by email, do not create or link an account. One-off, unrelated or retired product payments never move membership.

Existing introductory, older-renewal, current-renewal and independent-entitlement behaviour is preserved. The seven existing orders are **not** backfilled in this task; the plan reports their count only and proposes a separate reconciliation.

## 4. Missing executable proofs

New function-level tests exercising the real webhook entry path (not just the pure mappers):

**Signature isolation** — correct subscription secret accepts a correctly signed synthetic event; payment-webhook secret, forged signature and missing signature are each rejected before any database or Stripe call, with zero mutation calls observed and nothing sensitive logged.

**Concurrent delivery** — two simultaneous claims for the same synthetic event ID against the real ledger claim function: exactly one applies the lifecycle mutation, the other is a successful idempotent no-op, with no duplicate hold, order transition or access transition.

Synthetic rows (ledger, hold, order, subscription) are removed by exact ID and residue is proven to be zero.

Reruns: reverse-order and same-second delivery, stale-object retrieval, refund/dispute mappers, subscription and lifecycle, checkout, deletion-cancellation, magic-link, TypeScript, Deno tests, lint on touched files, production build.

## Technical notes

- `supabase/functions/_shared/membershipLifecycle.ts` — rename states, add `allowedSurfaces`.
- `src/lib/membership.ts` — re-export and notice copy follow the new names (member-facing wording unchanged in tone).
- `src/components/AuthGuard.tsx` — split auth vs entitlement; new surface check; redirect target `/app/billing`.
- `src/App.tsx` — account routes declare their surface; paid routes stay behind the entitlement check.
- Migration (additive): order → subscription linkage columns/FK + index, and updated `membership_access_state` / `membership_write_allowed`.
- `supabase/functions/stripe-subscription-webhook/index.ts` — chain verification and safe-failure path.
- New tests: route-access matrix (anonymous, allowed, grace, restricted_billing, suspended_dispute, restricted_deletion across allowed and paid routes, direct entry, SPA navigation, refresh, sign-out) and the two webhook proofs.

## Completion report

PASS/FAIL will be reported for: route access per state, vocabulary reconciliation, invoice/order/subscription/member linkage, safe failure on ambiguity, the four signature cases, the real simultaneous ledger claim, exact synthetic cleanup, every gate, backend deployed, client not published, no real member or Stripe object changed, and live refund/dispute delivery still unobserved.

The four Stripe events stay disabled. They may be enabled only after these corrections pass and the route correction ships in a controlled client publication.
