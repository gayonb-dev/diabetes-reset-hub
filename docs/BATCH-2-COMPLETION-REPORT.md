# Batch 2 Final Evidence Correction — Completion Report

**Project:** wqennhjdojjqmmqzjhti  
**Domain:** https://diabetesresetmethod.com  
**Report date:** 2026-08-30  
**Starting Git SHA:** `70e044795a0bb6b39634a7b685d46321e996f725`  
**Final code SHA:** `69a452af295540dcb39ff95e6347ccb903e17cc5`  
**Client published:** No  
**Real member data changed:** No  

## Scope

Backend and documentation only. No design, accessibility, performance or 24-task browser-matrix work was rerun. The only production deployments were the affected Edge Functions identified below, deployed after exact-source testing and rollback capture.

## Safeguards enforced

- Project and domain verified before any write.
- Safety flags matched recorded pre-run values; global email auto-confirm remained disabled.
- No real email, Stripe, Resend, Dexcom or external-AI calls occurred.
- Two isolated synthetic members were used: Member A (deletion/export subject, never-billed) and Member B (untouched control).
- All synthetic records were removed by exact ID and residue was verified at zero.
- Access controls, grants and RLS policies were not broadened; anonymous access did not increase.

## What changed

### Application code

- `supabase/functions/_shared/inventory.ts`
  - Added relationship (parent/ownership) matching semantics: `order_ownership`, `cascade`, `export_redacted_and_retain`, `cascade_only_not_exported`.
  - `support_ticket_notes` is personal data, parent-owned through `support_tickets.user_id`, exported with `author_id` and `body` redacted.
  - `billing_holds` is personal data (`user_id`), exported redacted and **retained** under financial and anti-fraud retention.
  - `community_answer_embeddings` and `broadcast_log` are cascade-only: not exported, removed with their parent rows.
  - `billing_events` and `content_containment_log` carry no member ownership column and remain reference-only.
- `supabase/functions/_shared/exportBuild.ts`
  - Orders are matched **only** by immutable ownership (`orders.user_id` or a member-owned subscription). The previous `customer_email` / JWT-email fallback was removed.
  - One shared snapshot timestamp is used for the ZIP and the JSON artifact.
  - Resolves parent ticket IDs for `support_ticket_notes`.
  - Emits neutral metadata (`body_included: false`, `author_id_included: false`, `manual_privacy_review_required: true`) instead of raw note text or staff identifiers.
- `supabase/functions/process-deletion-job/index.ts`
  - Owned orders are resolved through immutable ownership in both the primary and reconciliation paths; email matching survives only for surfaces that are themselves email-keyed.
  - Resolves parent support-ticket IDs and deletes associated notes.
  - Counts and reconciles parent-owned rows.
- `src/test/inventory.test.ts`
  - Unit tests for the updated manifest and parent-match behavior.
- `tools/batch2/prompt3_reconcile.py`
  - Relationship-based, cycle-safe, fail-closed Prompt 3 classifier with positive/negative fixtures.
- `tools/batch2/export_deletion_ab_harness.py`
  - Local synthetic A/B harness for real ZIP/JSON export, deletion, isolation and cleanup.

### Edge Functions deployed

- `export-my-data` — deployed from tested source after `deno check` passed.
- `process-deletion-job` — deployed from tested source after `deno check` passed.
- Temporary `batch2-harness` — used only for local synthetic provisioning/cleanup; deleted after tests and verified 404.

### Migrations

No new migration was applied in this pass. The previously applied `0005_orders_immutable_ownership_only.sql` remains in force.

## Evidence produced

| Artifact | Path | Status |
|---|---|---|
| Completion report | `docs/BATCH-2-COMPLETION-REPORT.md` | New |
| Prompt 3 inventory reconciliation | `docs/batch2-evidence/prompt3-inventory-reconciliation.json` | Regenerated |
| Data lifecycle evidence | `docs/batch2-evidence/data-lifecycle.json` | Updated |
| Final gates | `docs/batch2-evidence/gates.json` | Updated |
| Synthetic cleanup | `docs/batch2-evidence/synthetic-cleanup.json` | Updated |
| RLS principal matrix | `docs/batch2-evidence/rls-principal-matrix.md` | Reused |
| Auth audit limitation | `docs/batch2-evidence/auth-audit.md` | Reused |
| Immutable-ownership migration | `drizzle/migrations/0005_orders_immutable_ownership_only.sql` | Reused |
| Immutable-ownership evidence | `docs/batch2-evidence/orders-immutable-ownership.md` | Reused |
| Deployment and rollback record | `docs/batch2-evidence/deployment-and-rollback.json` | New |
| Machine-readable export/deletion run | `docs/batch2-evidence/export-deletion-run.json` | New |
| Artifact SHA-256 manifest | `docs/batch2-evidence/ARTIFACT-SHA256.txt` | Regenerated |

## Key verification results

### Prompt 3 inventory reconciliation

- 73 public tables inspected.
- 63 personal-data tables, 10 non-personal tables, 0 unclassified.
- 0 fail-closed failures; 6/6 negative fixtures rejected by the classifier.
- The manifest is loaded structurally (`tools/batch2/dump_inventory.ts`) rather than mirrored, so the generator and the manifest cannot drift.
- Earlier reports and the generated inventory disagreed on `support_ticket_notes` and `billing_holds`. Both are now personal data in the manifest, in the generator and in the independent ownership check; the classifier fails closed on any table with a member relationship that is labelled non-personal.
- The 10 remaining non-personal tables are catalogue/config/security-metadata tables with no member ownership column and no member relationship path: `app_config`, `badges`, `billing_events`, `content_containment_log`, `content_items`, `daily_actions`, `daily_digest`, `rate_limits`, `snack_library`, `vita_quotes`.
- Every member-linked surface (community questions, answers, votes, win posts, conversations, messages, support tickets, support notes) is accurately classified.

### Synthetic export/deletion

- Member A (never-billed) received a real ZIP and JSON export from a single snapshot.
- ZIP: **29236 bytes**, SHA-256 `e000ef79dd7ad93a7b7464ad1878b02bca40b7e8e95768ed8630f79a8f7cf55e`.
- JSON: **14177 bytes**, SHA-256 `c78edfbdf705d287f76baf8a695f676696ea7d014eef2717cfaf026595c8fed7`.
- Attachment headers recorded for both artifacts (`Content-Type`, `Content-Disposition: attachment`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`).
- Snapshot consistency proven: the `export.json` inside the ZIP matches the standalone JSON artifact on schema version, categories, per-category row counts and timestamps.
- Single-use reauthentication enforced: an expired ticket returned 401, ticket reuse returned 401, and both download links returned 410 on replay.
- Orders were matched by immutable ownership only: A's owned order was exported, while an ownerless legacy order sharing A's email address and B's owned order were both excluded.
- `billing_holds` exported once with dispute and charge identifiers redacted, and retained through deletion.
- `community_answer_embeddings` excluded from the export and removed by parent cascade.
- Deletion was retried and returned an idempotent terminal `completed` with zero remaining rows.
- Per-surface inclusion/exclusion, deletion and cleanup results are in `docs/batch2-evidence/export-deletion-run.json` (machine-readable), `data-lifecycle.json` and `synthetic-cleanup.json`.
- Member B records did not appear in Member A's export.
- Real deletion state machine ran for Member A.
- Member B records remained byte-for-byte unchanged, except for the documented relational cascade: B's answer on A's question was removed when A's question was deleted.
- `support_ticket_notes`: raw body and author ID excluded from export; notes deleted with their member-owned ticket.
- Zero synthetic residue after exact-ID cleanup: every seeded row removed by ID, 0 synthetic Auth users remaining, 0 Storage objects in `exports`, `avatars` and `uploads`, and `profiles`, `visitor_profiles`, `visitor_sessions`, `reauth_tickets`, `export_artifacts`, `deletion_jobs`, `subscriptions` and `consent_records` all verified empty of synthetic rows.
- Retained security metadata is recorded separately: hashed rate-limit buckets contain no synthetic identifier and are retained by design.
- The temporary `batch2-harness` function was found deployed at the start of this pass (an earlier report had recorded it as deleted). It has now been deleted, re-probed at **HTTP 404**, and its three temporary secrets were removed.

### Retention

- `retention_mode` remained `report_only`.
- Retention job deleted zero rows.

### Gates summary

All gates are `PASS` or accepted `BLOCKED`. There are zero `FAIL`, zero `NOT TESTED` and zero `PARTIAL` results.

| Gate | Result |
|---|---|
| binding_24_task_matrix | PASS (reused) |
| viewport_390px | PASS (reused) |
| performance_full_route_set | PASS (reused) |
| accessibility_full | PASS (reused) |
| typescript | PASS |
| vitest_full | PASS (446 passed, 0 failed) |
| production_build | PASS |
| eslint | PASS (changed files, this pass) |
| bundle_purity | PASS |
| safe_content_source | PASS (reused) |
| safe_content_database | PASS (reused) |
| orders_immutable_ownership | PASS (reused) |
| deno_check_changed_functions | PASS — all changed functions pass `deno check`; the unchanged `stripe-webhook` type-resolution conflict is an accepted historical limitation outside this pass |
| cors_boot_smoke | PASS |
| prompt3_inventory_completeness | PASS (regenerated this pass) |
| rls_principal_matrix | PASS (reused; policy/grant listings are catalogue inspection, not executed probes) |
| progress_day_guard | PASS (reused) |
| export_deletion_retention | PASS |
| auth_audit | BLOCKED — accepted historical platform limitation (auth.audit_log_entries empty) |
| synthetic_cleanup | PASS |
| redaction | PASS |
| publication | PASS (no client bundle published; only the affected Edge Functions deployed) |
| deployment_and_rollback | PASS |

## Closure determination

Batch 2 closes because:

- Zero in-scope `FAIL` results.
- Zero `NOT TESTED` results.
- Zero `PARTIAL` results.
- Accurate classifications for all member-linked surfaces.
- Successful readable and machine-readable exports.
- Successful deletion and reconciliation.
- Member B unchanged except the explicitly justified parent-cascade case.
- Zero unexplained synthetic residue.
- Safety flags restored.
- No client publication.

The only `BLOCKED` items are accepted historical/platform limitations that do not affect the correctness of the Batch 2 evidence correction.
