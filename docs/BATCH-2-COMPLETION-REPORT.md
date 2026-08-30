# Batch 2 Final Evidence Correction — Completion Report

**Project:** wqennhjdojjqmmqzjhti  
**Domain:** https://diabetesresetmethod.com  
**Report date:** 2026-08-30  
**Starting Git SHA:** `70e044795a0bb6b39634a7b685d46321e996f725`  
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
  - Added parent-match support.
  - Reclassified `support_ticket_notes` from `reference_only` to `export_redacted_and_delete`, parent-owned through `support_tickets.user_id`, redacting `author_id` and `body`.
- `supabase/functions/_shared/exportBuild.ts`
  - Resolves parent ticket IDs for `support_ticket_notes`.
  - Emits neutral metadata (`body_included: false`, `author_id_included: false`, `manual_privacy_review_required: true`) instead of raw note text or staff identifiers.
- `supabase/functions/process-deletion-job/index.ts`
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
| Artifact SHA-256 manifest | `docs/batch2-evidence/ARTIFACT-SHA256.txt` | Regenerated |

## Key verification results

### Prompt 3 inventory reconciliation

- 73 public tables inspected.
- 60 personal-data tables, 13 non-personal tables.
- 0 fail-closed failures.
- `support_ticket_notes` correctly classified as parent-owned personal data.
- Every member-linked surface (community questions, answers, votes, win posts, conversations, messages, support tickets, support notes) is accurately classified.

### Synthetic export/deletion

- Member A (never-billed) received a real ZIP and JSON export from a single snapshot.
- Separate single-use reauthentication tickets were consumed for ZIP and JSON; replay was rejected.
- Export headers included `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
- Member B records did not appear in Member A's export.
- Real deletion state machine ran for Member A.
- Member B records remained byte-for-byte unchanged, except for the documented relational cascade: B's answer on A's question was removed when A's question was deleted.
- `support_ticket_notes`: raw body and author ID excluded from export; notes deleted with their member-owned ticket.
- Zero synthetic residue after exact-ID cleanup.

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
| eslint | PASS_FOR_CHANGED_FILES (reused) |
| bundle_purity | PASS |
| safe_content_source | PASS (reused) |
| safe_content_database | PASS (reused) |
| orders_immutable_ownership | PASS (reused) |
| deno_check_changed_functions | BLOCKED — accepted pre-existing stripe-webhook Supabase-js type-resolution conflict at line 29, unchanged by this work; affected functions pass |
| cors_boot_smoke | PASS |
| prompt3_inventory_completeness | PASS |
| rls_principal_matrix | PASS (reused) |
| progress_day_guard | PASS (reused) |
| export_deletion_retention | PASS |
| auth_audit | BLOCKED — accepted historical platform limitation (auth.audit_log_entries empty) |
| synthetic_cleanup | PASS |
| redaction | PASS |
| publication | PASS (nothing published) |

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
