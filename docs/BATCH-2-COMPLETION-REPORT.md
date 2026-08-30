# Batch 2 — Completion report (authoritative)

Date: 2026-08-30 (UTC). Project ref: `wqennhjdojjqmmqzjhti`. Domain: https://diabetesresetmethod.com.
**Nothing was published in this pass.** No live Stripe, Resend, Dexcom or AI call was made.

This report supersedes and retires:

* `docs/BATCH-2-COMPLETION-REPORT-REJECTED-WRONG-MATRIX.md` — rejected, must not be cited.
* `docs/BATCH-2-STATUS.md` — interim status, now retired.
* `docs/BATCH-2-EVIDENCE-RECONCILIATION.md` — interim reconciliation, now retired.

## 1. Result summary

| Gate | Result | Executed | Source |
|---|---|---|---|
| Binding 24-task matrix (48 records) | PASS — 46 PASS / 0 FAIL / 2 BLOCKED / 0 NOT TESTED | 2026-08-28 (reused) | `task-matrix.json` |
| 390 px mobile viewport | PASS | 2026-08-28 (reused) | `task-matrix.json`, `screenshots/index.md` |
| Performance (14 routes, 5+5 runs) | PASS | 2026-08-28 (reused) | `performance.json`, `route-loading.json` |
| Accessibility 320–1280 + 200 % zoom | PASS | 2026-08-28 (reused) | `accessibility.json`, `zoom-200-reflow.json` |
| Progress-day fail-closed guard | PASS 20/20 | 2026-08-28 (reused) | `progress-day-guard.json` |
| Prompt 3 inventory completeness | PASS | 2026-08-30 | `prompt3-inventory-reconciliation.json` |
| RLS principal matrix | PASS 16/16 | 2026-08-29/30 | `rls-principal-matrix.md` |
| Immutable order ownership | PASS | 2026-08-29 | `orders-immutable-ownership.md` |
| Deno check (changed functions) | PARTIAL | 2026-08-29 | `gates.json` |
| CORS / boot smoke (deployed function) | PASS | 2026-08-29 | `gates.json` |
| Export / deletion / retention | PARTIAL | 2026-08-30 | `data-lifecycle.json` |
| Auth audit | **BLOCKED** | 2026-08-30 | `auth-audit.md` |
| Synthetic cleanup | PASS | 2026-08-30 | `synthetic-cleanup.json` |
| TypeScript / Vitest / build / lint / bundle purity | PASS | 2026-08-28/29 | `gates.json` |
| Publication | none performed | — | — |

Two BLOCKED items remain, both independent platform limitations, each with its consequence and
post-publication step recorded: Task 16 Support end-to-end (production origin allow-list rejects
`http://localhost:8080` at preflight) and the Auth audit-log window (`auth.audit_log_entries` empty).
Two PARTIAL items are stated honestly rather than claimed as PASS. No in-scope FAIL and no
NOT TESTED gate remains.

## 2. Backend work executed in this pass

### 2.1 Immutable order ownership (correction)

The member `orders` SELECT policy previously authorised on a mutable attribute (JWT email claim).
Migration `drizzle/migrations/0005_orders_immutable_ownership_only.sql` removed it. A member now reads
an order only through `orders.user_id = auth.uid()` or `orders.subscription_id` → a subscription owned
by the caller. Member INSERT/UPDATE/DELETE revoked, `anon` has no privilege, `service_role` retains
ALL, Admin predicate `has_role(auth.uid(),'admin')` unchanged. No row was backfilled or mutated.

Future orders receive an owner on both provisioning paths: `stripe-subscription-webhook` already bound
`user_id`/`subscription_id`; `stripe-webhook` now calls `_shared/orderOwnership.ts#assignImmutableOwner`,
resolving the account from the signed Stripe session address only (never caller metadata), writing
conditionally on `user_id IS NULL` (replay- and concurrency-safe), and leaving the order ownerless when
no account matches. Legacy ownerless orders (7) stay member-inaccessible and Admin-visible.

Full record, rollback notes and hashes: `docs/batch2-evidence/orders-immutable-ownership.md`.

### 2.2 Prompt 3 inventory reconciliation

Live catalogue introspection only — no member-generated content read or exported. 73 public tables
(53 classified personal-data), 268 policies, 47 public functions (41 security-definer, 5 anon-executable),
1 storage bucket, 0 tables without RLS. Every table carries an export, deletion and retention disposition.

### 2.3 Data lifecycle

Retention ran report-only and deleted nothing (`retention_mode=report_only`, unchanged). Deletion was
executed against synthetic fixtures with expected-versus-actual counts. Export dispositions are mapped
for every personal-data surface; no export archive was produced after cleanup, so that gate is PARTIAL.
Fixtures were never-billed with no Stripe customer, subscription, charge or processor identifier.

### 2.4 Synthetic cleanup

Four synthetic accounts on `@example.invalid` created by the 2026-08-29 harness were still resident and
have been deleted by exact ID, together with 553 orphaned activity rows they owned. Every affected
surface was re-queried: 0 synthetic residue, 0 orphan rows, `real_accounts_remaining: 1`,
`real_member_rows_unchanged: true`. All safety flags re-read at their recorded pre-run values:
`ai_health_enabled=false`, `dexcom_enabled=false`, `email_delivery_enabled=false`,
`transactional_automation_enabled=false`, `marketing_email_enabled=false`,
`retention_mode=report_only`, `stripe_deletion_enabled=true`, `stripe_mode=live`,
`auth_email_enabled=true`, `phi_notice_version=2026-08-07.1`, empty email allowlist.

### 2.5 Auth audit — BLOCKED

Global auto-confirm remains off and unchanged. `auth.audit_log_entries` holds 0 rows, so the
2026-08-27 → 2026-08-31 window cannot be independently reconstructed. Accounts were not recreated to
reproduce timestamps. Consequence and post-publication step in `auth-audit.md`.

## 3. Change and deployment record

**Applied migrations (Batch 2):**

| Migration | Purpose |
|---|---|
| `0000_harden_progress_day_guard_fail_closed.sql` | programme-day guard fails closed |
| `0001_progress_day_guard_require_programme_anchor.sql` | requires a programme anchor |
| `0002_orders_member_read_without_auth_users.sql` | removes `auth.users` subquery |
| `0003_email_policies_use_jwt_not_auth_users.sql` | JWT email claim in member email policies |
| `0004_orders_prefer_immutable_ownership_and_tighten_grants.sql` | prefers immutable ownership, tightens grants |
| `0005_orders_immutable_ownership_only.sql` | removes the email fallback entirely |

**Deployed Edge Functions (this pass): `stripe-webhook` only**, from the exact tested source.

| File | SHA-256 |
|---|---|
| supabase/functions/stripe-webhook/index.ts | 5b8f5e30a1876758b2bd6a4d5151d3ee557ea139a52a33b120532ffa7a4d434d |
| supabase/functions/_shared/orderOwnership.ts | ecb17a68f5eed4a38755d7fe257aa026a5d6dfa24bdc4581fc48399ba6799fc2 |

Safe smoke: unsigned POST → HTTP 400 `{"error":"No signature provided"}`. No Stripe object created.

**Client:** the live published bundle is unchanged by this pass. The tested unpublished bundle is
`index` 429.47 kB (production build, 2026-08-29). Client changes made earlier in Batch 2 remain
unpublished.

## 4. Reused versus newly executed evidence

Reused exactly as executed on 2026-08-28: the 24-task matrix (48 records), performance,
accessibility, 200 % zoom, responsive screenshots and the progress-day guard. Executed in this pass:
Prompt 3 inventory, RLS principal matrix, immutable-ownership migration/tests/deployment, data
lifecycle, Auth audit, redaction and synthetic cleanup. The ownership correction changed no
member-visible behaviour — no member surface reads `orders`; Admin Billing uses the unchanged admin
policy — so the focused client regression is limited to that finding and no broad rerun was required.

## 5. Artifact inventory

SHA-256 values for every artifact are in `docs/batch2-evidence/ARTIFACT-SHA256.txt`, generated with
the final content of each file listed there.

## 6. Closing statement

Batch 2 is closed for all in-scope work. Two BLOCKED items remain, both platform limitations recorded
with their exact consequence and post-publication step; two gates are honestly reported PARTIAL.
Nothing was published, no real member data was mutated, and every safety flag is at its pre-run value.
