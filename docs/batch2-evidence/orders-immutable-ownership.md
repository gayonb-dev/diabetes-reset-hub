# Batch 2 — Immutable order ownership (backend closeout)

Date: 2026-08-29 (UTC). Project ref: wqennhjdojjqmmqzjhti. Domain: https://diabetesresetmethod.com.
No publication was performed. No real (non-synthetic) order row was modified.

## Defect

`orders` member SELECT policy previously authorised on a mutable attribute:

```
(user_id = auth.uid())
OR (user_id IS NULL AND lower(customer_email) = lower(coalesce(auth.jwt()->>'email','')))
```

An email address is reusable and changeable, so a legacy ownerless order could be
exposed to any account that later held the same address.

## Correction

Migration `drizzle/migrations/0005_orders_immutable_ownership_only.sql`:

* member SELECT now requires an immutable, server-established relationship —
  `orders.user_id = auth.uid()` or `orders.subscription_id` -> a subscription owned
  by the caller;
* member INSERT/UPDATE/DELETE revoked; `anon` has no privilege; `service_role`
  retains ALL; Admin policy `has_role(auth.uid(),'admin')` unchanged;
* no data written, no backfill, no legacy row touched.

Effective privileges (production, verified):
`authenticated` SELECT=true, INSERT/UPDATE/DELETE=false; `anon` SELECT=false; `service_role` SELECT=true.

## Future orders receive ownership

* Subscription path (`stripe-subscription-webhook`) already binds `user_id`,
  `subscription_id` and `stripe_subscription_id` on `checkout.session.completed`.
* One-time payment path (`stripe-webhook`) did not, and now calls the new
  `_shared/orderOwnership.ts#assignImmutableOwner`. It resolves the account from the
  signed Stripe session address (or the stored order row) via the shared admin
  resolver — never from caller metadata — and writes `user_id` conditionally on
  `user_id IS NULL`. When no account matches, the order stays ownerless
  (fail closed, Admin-visible only).

## Proof — synthetic principals against production RLS

| Scenario | Orders visible |
|---|---|
| Owner principal (`sub` = order owner) | 1 (exactly its own) |
| Cross-member principal | 0 |
| Email-claim attack (JWT email = legacy order's customer_email) | 0 |

Legacy ownerless orders: 7 — member-inaccessible, Admin-visible.

## Focused regression

* `src/test/orderOwnership.test.ts` — 8/8 pass: assignment, replay safety
  (`already_owned`), concurrency loss (`raced`), no-account fail-closed,
  no-email fail-closed, unknown session, email normalisation.
* Full suite: 39 files / 446 tests pass. `tsgo --noEmit` clean. Production build clean (index 429.47 kB).
* `deno check _shared/orderOwnership.ts` clean. `stripe-webhook` retains one pre-existing,
  unrelated supabase-js typing conflict at line 29 (email gate), unchanged by this work.

## Deployment

Deployed from the exact tested source: `stripe-webhook` only.

| File | SHA-256 |
|---|---|
| supabase/functions/stripe-webhook/index.ts | 5b8f5e30a1876758b2bd6a4d5151d3ee557ea139a52a33b120532ffa7a4d434d |
| supabase/functions/_shared/orderOwnership.ts | ecb17a68f5eed4a38755d7fe257aa026a5d6dfa24bdc4581fc48399ba6799fc2 |

Safe smoke (no mutation): unsigned POST -> HTTP 400 `{"error":"No signature provided"}` — boots and rejects.

## Synthetic cleanup

Before: 10 orders (3 `synthetic-batch2`). Created this pass: 0. Deleted by exact id: 3
(`ea86c6a0-…`, `4a362cc5-…`, `3676444a-…`). Remaining: 7 orders, 0 synthetic.

## Safety flags — unchanged before and after

`ai_health_enabled=false`, `dexcom_enabled=false`, `email_delivery_enabled=false`,
`transactional_automation_enabled=false`, `marketing_email_enabled=false`,
`retention_mode=report_only`, `stripe_deletion_enabled=true`, `stripe_mode=live`,
`auth_email_enabled=true`, `phi_notice_version=2026-08-07.1`.

## Client impact

No client surface reads `orders` except Admin (`AdminDashboard`, `AdminSubscriptions`),
which uses the unchanged admin policy. Member Billing reads subscriptions and the
`list-invoices` function, so no member-visible behaviour changed.
