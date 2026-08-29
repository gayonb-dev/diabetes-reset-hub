# Batch 2 — Final Backend Closeout

Backend and documentation work only. The approved matrix (46 PASS / 0 FAIL / 2 BLOCKED),
performance, accessibility, responsive and screenshot evidence are reused exactly as they
stand, with their original execution dates. No Playwright, no performance or accessibility
reruns unless a backend defect found here changes visible client behaviour. Nothing is
published and no ZIP is produced.

## 0. Production preflight (before any synthetic principal or database change)

Confirm the production project ref `wqennhjdojjqmmqzjhti` and the domain
`https://diabetesresetmethod.com`; record the pre-run baseline of `ai_health_enabled`,
`dexcom_enabled`, `email_delivery_enabled`, `transactional_automation_enabled`,
`marketing_email_enabled`, `retention_mode`, `stripe_deletion_enabled` and the production Auth
auto-confirm state. The identical set is re-recorded after cleanup and must retain the same
values. Stop on a project mismatch or if synthetic records cannot be isolated safely. Global
Auth auto-confirm, secrets, origins, Stripe flags, email flags and retention mode are not
changed at any point.



## 1. Changed-function verification

- Reconcile every Edge Function and shared Deno module changed from the resolved Batch 2
  starting commit through the current tested tree; record the file list and per-file SHA-256.
- Run `deno check` and any Deno tests over that exact set.
- Boot/CORS smoke per changed deployed function using preflight, auth rejection or harmless
  malformed input only — never a request that can send email, call AI, touch Stripe, delete
  data or emit notifications. Record approved-origin, disallowed-origin, missing-origin and
  boot/503 outcomes. `ALLOWED_ORIGINS` is not modified.

## 2. Prompt 3 inventory completeness

Enumerate every Batch 2-created or altered table, column, function/RPC, policy, Storage
surface, Edge Function data operation and Admin data operation from catalogue/schema
information and allowlisted non-personal configuration only. No member-generated content is
read or exported. Each item is reconciled against the Prompt 3 manifest with its export,
deletion and retention disposition into `prompt3-inventory-reconciliation.json`.

## 3. Complete RLS principal matrix

Executable probes as anonymous, synthetic Member A, synthetic Member B, synthetic Admin
holding a normal authenticated JWT with the real application admin role, and service role
recorded separately (never counted as Admin). Every read/insert/update/delete attempt
re-reads the target row and records the actual result across `activity_events`,
`member_progress` and the programme-day trigger, coaching interest, support tickets and
permitted note/status operations, points/Activity Score data, altered notification surfaces,
every new order and billing-email policy, plus anything the inventory surfaces.

Programme-day proofs: unlocked own day succeeds; future day fails; missing/NULL programme
state fails closed; cross-member write fails; deletion-restricted write fails; service-role
behaviour deliberately separate.

### Order ownership must fail closed

Email-only RLS is not accepted as a follow-up risk. A new source-controlled migration replaces
the JWT-email fallback so a member may read an order only through an immutable,
server-established ownership relationship — `orders.user_id = auth.uid()`, or an immutable
order-to-subscription relationship whose subscription belongs to `auth.uid()`. Request-body
email, URL email, browser state and bare JWT-email comparison are removed as authorization
rules. Legacy orders with no immutable owner become inaccessible to ordinary members while
Admin access is preserved; Billing/Support show an honest state; a separate authenticated
claim/reconciliation path is documented for later. No real legacy order is backfilled or
mutated during this closeout.

Proofs recorded in the matrix: anonymous denied; A cannot reach B and B cannot reach A; a
changed, recycled or newly registered matching email cannot expose a legacy order; member
access read-only unless an existing authorized operation requires otherwise; deletion
restrictions effective; Admin uses the application admin predicate; service role separate.
Output: `rls-principal-matrix.md`, plus rollback notes and the migration source hash.

### Immutable ownership for future orders

Before choosing the migration design, inspect the canonical checkout, payment webhook,
subscription webhook and order schema so removing the legacy JWT-email policy cannot leave
newly created orders ownerless. Reuse an existing immutable relationship if one already works
safely (`orders.user_id = auth.uid()`, or `orders.subscription_id` → canonical subscription →
authenticated `user_id`). If neither is populated reliably, make the smallest safe server-side
correction so every newly provisioned order receives immutable ownership through the trusted
checkout/webhook process.

Proven with synthetic mocked Stripe objects only — no live Stripe object created or modified:
a newly created order receives the correct immutable owner; webhook replay does not change or
duplicate ownership; concurrent verification and webhook handling do not duplicate orders or
subscriptions; request-body or metadata email cannot select the owner; Member A cannot claim
Member B's order; a legacy NULL-owner order stays inaccessible to ordinary members; Admin can
still investigate a legacy order; no real legacy order is backfilled or changed.

### Deployment of the ownership correction

After the immutable-ownership migration and any required checkout/webhook correction: run the
focused ownership, replay, concurrency and RLS tests; run Deno checks/tests for every changed
function and shared module; deploy only the materially changed Edge Functions from the exact
tested source; record source SHA-256 and deployment receipts; run safe boot/auth/CORS smoke
that creates no Stripe object; and prove through synthetic mocked provisioning that the
deployed server path assigns immutable ownership to future orders.

### Focused visible regression (mandatory, not conditional)

The ownership correction always triggers this rerun. Rerun only: Task 23 on desktop and mobile
across its five canonical lifecycle states; Billing loading, owned-order,
legacy-unowned-order and backend-error states; required Settings, Support, export and deletion
reachability; and proof that no authenticated billing state redirects to Login. The other 23
matrix tasks, broad performance testing, accessibility testing and unrelated screenshots are
not rerun. Preserved matrix totals are updated only from this focused evidence.




## 4. Export, deletion and retention execution

New, isolated, labelled synthetic fixtures only. Export inclusion/exclusion is tested for
every new or altered personal-data surface; deletion is tested with expected-versus-actual
row counts; retention runs in report-only mode and is proven to delete nothing. The deletion
fixture is never-billed with no Stripe customer, subscription, charge or processor
identifier. No live Stripe, Resend, Dexcom or AI call. `stripe_deletion_enabled`, retention
mode, email flags, secrets and origin configuration are unchanged. Output: `data-lifecycle.json`.

## 5. Auth audit

Global auto-confirm stays off and is confirmed off. Available Auth audit logs are used to
recover synthetic-account creation and deletion timestamps and whether any other account was
created in the relevant interval. If the logs cannot reconstruct the window, that is recorded
honestly as independent BLOCKED evidence; accounts are not recreated to reproduce timestamps.
Any synthetic account needed in this pass is created and individually confirmed through the
administrative no-email path. Output: `auth-audit.md`.

## 6. Corrections found during this pass

Smallest safe correction only, with a source-controlled migration when database behaviour
changes, rollback notes, SHA-256 of the tested migration/function source, focused tests, and
reruns of only the RLS/lifecycle/Deno gates the change could affect. No unrelated cleanup,
refactoring or dependency upgrades.

## 7. Redaction and cleanup

Downloadable evidence carries no real email, auth UUID, member identifier, session token,
cookie, magic link, IP, secret, or real health/support text — aggregate statements only
(`real_accounts_remaining: 1`, `real_member_rows_unchanged: true`). Cleanup evidence reports
before / created / deleted / remaining counts for every synthetic surface, redacted in the
downloadable copy; exact synthetic IDs live only in the internal manifest. Every new synthetic
record and identity is deleted by exact ID, every affected surface re-queried, zero
run-specific residue proven, and all safety flags confirmed at their recorded pre-run values.
Output: `synthetic-cleanup.json`.

## 8. Final artifacts and reconciliation

Final inventory hashes both the reused client evidence and the new backend evidence:
`task-matrix.json`, `performance.json`, `accessibility.json`, `route-loading.json`,
`screenshots/index.md`, `gates.json`, `prompt3-inventory-reconciliation.json`,
`rls-principal-matrix.md`, `data-lifecycle.json`, `auth-audit.md`, redacted
`synthetic-cleanup.json` and the authoritative `docs/BATCH-2-COMPLETION-REPORT.md`.

The report additionally records the full 40-character Batch 2 starting SHA, the full tested
final SHA (or an honest working-tree digest if uncommitted), the complete changed-file list,
every applied migration with its source hash, every deployed Edge Function with its source
hash, the current live client bundle, the tested unpublished bundle, original execution dates
for reused evidence, and SHA-256 for every final artifact. It preserves the approved matrix
result, separates reused evidence from gates executed in this pass, clearly retires every
superseded report (including `BATCH-2-COMPLETION-REPORT-REJECTED-WRONG-MATRIX.md` and the
interim `BATCH-2-STATUS.md`), distinguishes code changes / applied migrations / deployed
functions / unpublished client changes, reports every gate as PASS / FAIL / BLOCKED / NOT
TESTED with references resolving to real files, and confirms nothing was published.

Batch 2 closes only when no in-scope FAIL or NOT TESTED remains; independent platform
limitations may stay BLOCKED with their exact consequence and post-publication step.
