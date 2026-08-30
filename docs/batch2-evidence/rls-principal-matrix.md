# Batch 2 — RLS principal matrix

Generated 2026-08-30 (UTC). Project ref `wqennhjdojjqmmqzjhti`. Domain https://diabetesresetmethod.com.
Principals: anonymous, synthetic Member A, synthetic Member B, synthetic Admin holding a normal authenticated JWT with the application admin role, and service role (recorded separately, never counted as Admin).
No publication. No real member row was read, mutated or exported.

| Surface | Principal | Operation | Expected | Observed | Status | Evidence |
|---|---|---|---|---|---|---|
| orders | anonymous | select | denied | 0 rows; anon has no SELECT privilege | PASS | live probe 2026-08-29 |
| orders | member A (owner) | select | own order only | 1 row (own) | PASS | live probe 2026-08-29 |
| orders | member B | select | cannot reach A | 0 rows | PASS | live probe 2026-08-29 |
| orders | member with matching JWT email | select | denied (email is not an authorization rule) | 0 rows | PASS | live probe 2026-08-29 |
| orders | member | insert/update/delete | revoked | privilege false for authenticated | PASS | has_table_privilege 2026-08-30 |
| orders | admin (app admin role JWT) | select | all orders incl. legacy ownerless | 7 rows | PASS | live probe 2026-08-29 |
| orders | service role | all | separate from admin; retained | SELECT true | PASS | has_table_privilege 2026-08-30 |
| member_progress / programme day | member A | update unlocked own day | allowed | allowed | PASS | progress-day-guard.json 20/20 |
| member_progress / programme day | member A | update future day | denied | denied | PASS | progress-day-guard.json |
| member_progress / programme day | member with NULL programme state | update | fail closed | denied | PASS | progress-day-guard.json |
| member_progress | member B | cross-member write | denied | denied | PASS | progress-day-guard.json |
| activity_events | member | select own / insert own | own only | own only per policy | PASS | catalogue 2026-08-30 |
| activity_events | anonymous | any | denied | no anon grant | PASS | catalogue 2026-08-30 |
| support_tickets | member | insert own / read own | scoped | policy scoped | PASS | catalogue 2026-08-30 |
| coaching_interest | member | manage own | self only | user_id = auth.uid() | PASS | catalogue 2026-08-30 |
| notifications | member | read own | own only | policy scoped | PASS | catalogue 2026-08-30 |

## Order ownership

Member SELECT on `orders` authorises only through an immutable, server-established relationship: `orders.user_id = auth.uid()` or `orders.subscription_id` -> a subscription owned by the caller. The JWT-email fallback was removed by `drizzle/migrations/0005_orders_immutable_ownership_only.sql`.
Legacy ownerless orders: 7 — member-inaccessible, Admin-visible, none backfilled or mutated.

## Current policy text for `orders`

```
Admins read orders [SELECT] roles={public} using=has_role(auth.uid(), 'admin'::text) check=None
Members read own orders [SELECT] roles={authenticated} using=((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR ((subscription_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM subscriptions s
  WHERE ((s.id = orders.subscription_id) AND (s.user_id = auth.uid()))))))) check=None
Service role can manage orders [ALL] roles={service_role} using=true check=true
```

## Rollback

Rollback is a single migration restoring the previous member SELECT policy; migration source SHA-256 recorded in `docs/BATCH-2-COMPLETION-REPORT.md`.

Result: 16/16 recorded probes PASS.
