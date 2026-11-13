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

---

# Final Fasting and Public-Claim Reconciliation

Audited commit at start: `cb76ef0480ca572a843ee74ecb5f280d2e5e1183` (clean, later than snack-gate commit `23bc7695381adf0c932d272208fb9aa245e25130`).
Final commit / build identity: `3a1f8008d8fafd381bfb7ae06e7a40bb1ef2480d`, production build PASS.
Backend project: `wqennhjdojjqmmqzjhti` (shared by preview and published client).

## Environment truth

| Item | Status |
| --- | --- |
| Prior snack SQL applied to shared production database | YES (9 `nutritional_note` fields, earlier task) |
| This task's database writes | Only a temporary verification profile change on the review account `ce55d7b0…`, restored to its exact prior values (`needs_doctor`, target `0`, `fasting_started_on` NULL). No snack rows, no member history rows, no schema changes. |
| Client code changed | YES (source only) |
| Client published | NO |
| Published client build replaced | NO |
| Edge Function source changed | YES (`award-badges`, `_shared/fastingTarget`, `ask-vita`, `support-assistant`) |
| Edge Functions deployed | NO |

## Changes

- `supabase/functions/award-badges/index.ts`: removed awarding of retired `night-faster` and `cheat-and-fast` badges from `if_fasting_log`. Previously awarded rows preserved.
- `supabase/functions/_shared/fastingTarget.ts`: all `TARGET_LABEL` values now render "Not fasting"; no window labels remain.
- `src/pages/app/Meals.tsx`: always uses `STANDARD_SLOTS`; legacy `IF_SLOTS` branch removed.
- `src/pages/app/CheatMeal.tsx`: removed the "Fast started" chip. The insert still writes `fast_start_at: null` only.
- `src/lib/mealTiming.ts`, `src/lib/mealTiming.test.ts`: comments and a test title no longer reference fasting windows.
- `supabase/functions/support-assistant/index.ts`: Fasting route described as education and safety only, explicitly no timer, schedule or target.
- `supabase/functions/ask-vita/index.ts`: snack guidance no longer points members to a "schedule on the Fasting tab".
- `src/pages/LLMInfo.tsx` and `public/llms.txt`: unsupported outcome claims (glucose spikes, gut health, insulin sensitivity, hunger hormones, comparative claims) replaced with descriptive feature copy and an explicit no-outcome statement.
- `src/test/fastingOperationalGate.test.ts`: new behavioral gate (17 tests).

## Acceptance gate results

| Requirement | Result |
| --- | --- |
| No member control can start, schedule, select, extend, complete or reward a fast | PASS |
| No onboarding/settings control records fasting eligibility, confirmation, target or window for operational use | PASS |
| Cheat Meal writes no `if_fasting_log` row and no non-null `fast_start_at` | PASS |
| No meal plan, slot layout, notification, badge or assistant response operationalizes fasting | PASS |
| `/app/fasting` remains education only | PASS |
| Historical rows preserved, no new rows | PASS (2 `if_fasting_log` rows, both `completed`, before and after) |
| No calorie targets, goal weights or restrictive-eating features added | PASS |

Synthetic verification: review account temporarily set to eligible, doctor-confirmed, target 3, prior history. `canFast()` false, `effectiveTarget()` 0, `getFastingWindow()` null, `/app/meals` rendered standard slots (Breakfast/Lunch/Dinner), no fasting control, countdown, target, start button or encouragement on `/app/fasting`, `/app/today`, `/app/meals`, off-plan meal or `/app/settings`. Row counts unchanged after the run. Screenshots: `docs/evidence/fasting-gate/`.

## Verification

| Check | Result |
| --- | --- |
| `src/test/fastingOperationalGate.test.ts` + `fastingDisabled` | PASS (23 tests) |
| Safe-claims, content scan, public chat copy, inventory tests | PASS (32 tests) |
| TypeScript (`tsgo --noEmit`) | PASS |
| Touched-file lint | PASS (2 pre-existing warnings in `CheatMeal.tsx`) |
| Production build | PASS |
| `deno check` of `_shared/fastingTarget.ts` | PASS |
| Bundle scan for `12:12` / `14:10` / `16:8` and glucose-spike claims | 0 matches |
| Database content scan (`daily_actions`, `content_items`, `meal_plans`) | 0 fasting matches, 49 standard plans |
| Snack assertions | 10 rows, 10 active, 0 inactive, 0 prohibited claims (no rows rewritten) |

## Remaining classifications and limitations

- Neutral fasting education and safety-detection terms retained by design in `src/pages/app/Fasting.tsx`, `src/data/learnGuides.ts`, `_shared/medicalSafety.ts`, feature-flag comments and `useFastingProfile`/`mealTiming` compatibility code. None instructs fasting.
- One historical `cheat_meals` row retains a non-null `fast_start_at`. Preserved as member history; no code reads or displays it.
- Active-only snack filters in `SnackLibrary.tsx` and `HabitLogging.tsx` remain unpublished until a client release.
- NOT TESTED: full `deno check` of `award-badges` and `generate-meal-plan` (sandbox cannot resolve their `npm:` specifiers); `deno lint` reports only pre-existing style rules there. Edge Function behavior therefore verified by source review and client-side gate tests only.
- Nothing published, no functions deployed, no emails, payments or external AI calls.

---

# Private clinical-review access continuation

Status: PARTIAL IMPLEMENTATION. Reviewer provisioning is BLOCKED pending mandatory gates.

## Preflight, 2026-11-12

- Authoritative source: `b2024452ed195a82f26063e30a5004257a1cf54a`.
- Hosted preview serves the same SHA, confirmed by `lovable build status`, run `br_16bffa0c-1dcc-4230-95c5-072f1e10244c`, succeeded 2026-11-11 23:57:29 UTC.
- Exact review URL: https://id-preview--187534ee-b3c7-4a03-a061-621309d24e10.lovable.app . This is the preview entry, not a separate access-restricted hosting deployment; member pages require authentication.
- Backend: `wqennhjdojjqmmqzjhti`, shared production instance.
- Previously applied: `0006_complimentary_clinical_review_access.sql` and `0007_complimentary_review_community_reads.sql`. Catalogue inspection confirms the eight reviewer policies and current evaluator definition.
- Existing-member identical-behavior claim: UNVERIFIED. No before/after per-member snapshot was captured.
- Previous fasting correction was reported deployed; deployed version and controlled runtime verification are NOT TESTED in this continuation.
- No synthetic grant or identity created in this continuation; no invitation, marketing, Stripe, payment, client publication or cleanup operation performed.
- Recipient addresses are not available in the current working context as verified private inputs. Only placeholders and historical claims of retention are visible. No address will be inferred or reconstructed into source/evidence.

## Deployment inventory and rollback

Migration 0006 created `complimentary_access`, immutable-row trigger, `complimentary_access_active`, `complimentary_status_row`, `my_complimentary_access`, `activate_my_complimentary_access`, `anchor_my_review_programme`, and admin grant/revoke functions. It replaced `membership_access_state` and added reviewer SELECT policies on `content_items` and `daily_actions`. Migration 0007 added reviewer SELECT policies on `qa_submissions`, `community_questions`, `community_answers`, `community_votes`, `win_posts`, and `community_answer_embeddings`. Existing write gates call the modified evaluator indirectly through `membership_write_allowed`.

Rollback is owner-authorized only, never executed as a test: remove just the eight named reviewer policies using a new migration; restore `membership_access_state` from the 0006 definition with only its complimentary-access branch removed; revoke authenticated EXECUTE on activation/anchor/admin grant/revoke functions to stop new reviewer operations. Keep the entitlement table and historical rows intact. Restore the unpublished client access consumers to the pre-review source using the platform's version controls, not by deploying an old evaluator into production. Capture exact function source/version before any function rollback; versions are not yet independently available. Do not roll back the approved fasting correction. No rollback has run.

Initial policy audit: FAIL, the eight new permissive read policies checked deletion lock but not deletion restriction or dispute suspension. Correction and authenticated proof remain required. Existing content-visibility predicates must be retained.

## Continuation implementation and evidence

- Applied `0008_reviewer_read_safety_precedence.sql` to the shared production database. All eight policies now call `clinical_review_content_allowed`, combining an active grant, canonical membership evaluation and member write safety (deletion lock and restriction). Existing active-content and anonymously-published-answer predicates remain. Catalogue readback confirms 8 hardened policies. Ordinary authenticated probes remain BLOCKED, not implied by catalogue inspection.
- Shared inventory now exports and deletes the reviewer entitlement, redacting `granted_by`, `revoked_by`, and `revocation_reason`. The deletion worker consumes that inventory. Retention remains report-only at the existing 730-day cutoff; expiry is not automatic account deletion. Owner is responsible for arranging later deletion after review and documenting applicable retained audit records.
- Shared reviewer population includes every grant, pending, active, expired or revoked. Lookup errors stop population processing. Notifications, birthdays, engagement-score generation, digest conversations and digest business counts exclude that population. Non-essential shared email excludes reviewer addresses server-side; authentication email remains separate. No scheduled jobs were invoked to prove suppression, because doing so could contact ordinary members.
- Prior evaluator fixture is extracted from `d442f0fa66598f6ca13f8e8fbded50f761e37541^` and compared to current source for identical inputs in isolation. No production evaluator was restored. PASS for 19 compatibility inputs including grace boundary, cancellation, refunds, dispute/inquiry and deletion, plus reviewer dispute precedence. This is source-evaluator compatibility, not a production before/after snapshot or proof that every existing member is unchanged.
- No client presentation was changed in this continuation. Existing unpublished reviewer UI is preserved. No pricing changes.

### Function deployments

Final checked function dependency state: source commit `615b4a7f0ee689cf3a6fc17613957db44caff211` (before this documentation update). Deployment tool confirmed submission of all affected consumers. Submitted source hashes identify code/settings, not independently inspected live revision IDs. No numeric deployed-version read is available in this evidence.

| Function | Submitted source SHA-256 |
| --- | --- |
| notifications-cron | 858bb209521c238d3dee1cf9ef92654cc756006f84e5b823225f3be836b43ddd |
| send-notification | 33a0854828733464d3ba24cc77559c58d05b28da8c28f74f690fe96e51268b2e |
| birthday-greetings | 7d6a547a4ffce4429bce288dba4b6f57383624069fa859d4d8359e7d6fefd26a |
| compute-engagement-scores | 3196a61f6a10bb54f72d139950ade1fda6b02b052ce71a63fa0917e123e20c98 |
| daily-digest | 099c1a007e23eef4a4a1e10f8d60b3a6dab9f3e0828215aa6c848f7c545893eb |
| retention-report | 53a1f6373cbd5e70323e7399643f16e2209d9eedfe2278689e2f5c39c939d24e |
| export-my-data | 765628da84ee9271f62f1f5dfb9521f0adff3f0422a862930c7a8fbafa751710 |
| process-deletion-job | db5215a2a3cc953325fefb5f65bce0f0d053acf44cd6a5cd68d642bc3f4fd020 |
| award-badges | 993da6a8ee8ecc0cb5f4666cdcbd97e64f8a0fb9ba18359d28f6bda9700285f9 |
| member-checkin | 311d2bfeb9ee54a0783064787a042a90599079c1228f729b6422e84156038297 |
| notify-qa-answered | 5dc536fd55e9521f3ce145d295054bca4ce95e93f32aa42d0aea1b6eef248bc8 |
| send-meal-plan | a74e2c4753e07d3a85f952b2489b4fde39e82d3f8861fec4d1bc5e01e3aa6c24 |
| send-progress-summary | aa580bc13a898539ef76aa22cd1b5b348b0eec526baf85753337f6792db7b0a6 |
| support-request | 6431d7f5a91254c83750054b47159a730883a9b350c44403cd9304ef74cb7190 |
| stripe-webhook | b88cdee0dd31495dc53d94aadda8c3a18a61ba6aaa761845b162a1ae57b74f7d |
| stripe-subscription-webhook | 5005e773e5d98685c7457d93fbb8912387ad4e8a7e03532210dc9013e95f26e1 |

These additional email consumers were deployed because shared email/config code ships separately with each function. No webhook, payment or email-send endpoint was invoked. Rollback of these consumers requires restoring their pre-continuation shared dependencies plus entrypoints as one tested unit, then owner-authorized deployment. Do not remove reviewer exclusions while any review grants exist. Do not roll back the fasting reward correction.

### Gates, honest current status

| Gate | Result |
| --- | --- |
| Eight reviewer policy safety predicates and visibility, catalogue readback | PASS, not authenticated execution |
| Ordinary authenticated A/B, deletion-restricted and dispute-suspended reviewer probes | BLOCKED, no disposable identities/grants created |
| Intended writes, RPCs, Storage, complete must-accept dependency inventory | NOT TESTED, inventory coverage remains incomplete |
| Focused access/lifecycle/compatibility/inventory tests | PASS, 90 tests |
| Deno classification tests | PASS, 5 tests |
| Deno checks on 16 deployed consumers | PASS on final source with temporary auto npm resolution; no project dependency configuration changed |
| Touched-file lint | PASS |
| Automatic preview compiler checks | PASS, latest local log 2026-11-13 01:14:43 UTC, build OK |
| Final hosted production build identity | NOT TESTED for final source; hosted status still reports `8df5cb8da662e8aaac8189ec3c603ddc5f12bdc0`, run `br_e9ddfd4c-9608-4ae4-825f-2056de62da00`. Do not equate this with final checked source SHA |
| Direct routes, signed out | PASS: fasting, billing, onboarding redirect to login with intended path; zero page errors |
| Invitation delivery/redemption/security | BLOCKED, verified private owner test address unavailable |
| First authenticated load, concurrency and unchanged 336-hour timestamps | NOT TESTED live |
| Onboarding, Day 1, progression, payment-free journey and ended account surfaces | NOT TESTED live |
| Export/deletion/retention synthetic runtime cleanup | NOT TESTED; inventory implementation only |
| Non-essential communication exclusion | PASS source/classification tests, NOT TESTED scheduled runtime |
| All business metrics and admin population exclusion | NOT TESTED comprehensively; existing subscription/order dashboards have no reviewer purchase records, but this is not full exclusion proof |
| Fasting-badge correction deployment | PASS, checked source submitted |
| Fasting-badge controlled synthetic runtime | BLOCKED, synthetic identity not established |
| Client publication / clinical invitations | PASS, neither authorized nor performed |

No new synthetic accounts, grants, owned data or audit metadata were created, so cleanup has not begun. No synthetic residue claim is made. Eventual cleanup must list security/authentication/email-delivery records retained by the providers and their verified retention rule; provider retention remains NOT TESTED.

Prior snack database correction: YES, shared production backend, unchanged by this task. This continuation database change: YES, policy/helper migration 0008, no snack rows or reviewer data rows. Client publication: NO. Function deployments: YES, listed above. Invitations: zero. Marketing messages: zero. Payments/Stripe objects: zero.

Next boundary: owner must sign in personally through the trusted preview admin interface; no password, MFA code, token or service-role credential requested. Private owner test address must be supplied again because current retained-input availability cannot be confirmed. Two group category labels are required only before real reviewer provisioning, followed by masked confirmation and separate explicit invitation authorization. Doctor provisioning remains BLOCKED until every mandatory runtime gate passes.
