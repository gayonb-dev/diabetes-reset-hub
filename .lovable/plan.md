# Batch 2 — Final Backend Closeout

Backend and documentation work only. The approved matrix (46 PASS / 0 FAIL / 2 BLOCKED),
performance, accessibility, responsive and screenshot evidence are reused exactly as they
stand, with their original execution dates. No Playwright, no performance or accessibility
reruns unless a backend defect found here changes visible client behaviour. Nothing is
published and no ZIP is produced.

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

Order/email proofs: anonymous denied; A cannot reach B and B cannot reach A; authorization
never trusts request-body, URL or browser-supplied email; any JWT email is verified-identity
and normalized; member access read-only unless an existing authorized operation requires
otherwise; deletion restrictions effective; Admin uses the application admin predicate;
immutable `user_id` ownership preferred where safely available. Where email remains part of
authorization (legacy NULL-owner orders), the reason is documented as a follow-up risk.
Output: `rls-principal-matrix.md`.

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
(`real_accounts_remaining: 1`, `real_member_rows_unchanged: true`). Exact synthetic IDs live
only in the internal cleanup manifest. Every new synthetic record and identity is deleted by
exact ID, every affected surface re-queried, zero run-specific residue proven, and all safety
flags confirmed at their recorded pre-run values. Output: `synthetic-cleanup.json`.

## 8. Final artifacts

`gates.json`, `prompt3-inventory-reconciliation.json`, `rls-principal-matrix.md`,
`data-lifecycle.json`, `auth-audit.md`, `synthetic-cleanup.json` and an authoritative
`docs/BATCH-2-COMPLETION-REPORT.md` that preserves the approved matrix result, carries
original dates for reused evidence, separates reused evidence from gates executed now,
clearly retires every superseded report (including
`BATCH-2-COMPLETION-REPORT-REJECTED-WRONG-MATRIX.md` and the interim `BATCH-2-STATUS.md`),
distinguishes code changes / applied migrations / deployed functions / unpublished client
changes, reports every gate as PASS / FAIL / BLOCKED / NOT TESTED with references resolving
to real files, and confirms nothing was published.

Batch 2 closes only when no in-scope FAIL or NOT TESTED remains; independent platform
limitations may stay BLOCKED with their exact consequence and post-publication step.
