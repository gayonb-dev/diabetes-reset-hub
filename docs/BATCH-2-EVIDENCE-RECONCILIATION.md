# Batch 2 — Final Evidence Reconciliation

Generated: 2026-08-28 (UTC) · Nothing published · No Stripe, email or external-AI mutation performed in this pass.

**Verdict: Batch 2 is NOT complete.** The binding 24-task matrix was not executed as approved, and
several required evidence artifacts do not exist. Details below, with no relabelling of unrelated evidence.

---

## 1. Task-matrix reconciliation — FAIL

`docs/batch2-evidence/task-matrix.json` holds the frozen, approved 24 tasks. It was compared, text-for-text,
against the 24-row table published in `docs/BATCH-2-COMPLETION-REPORT.md`.

**The two sets are different matrices.** The report did not execute the approved tasks; it executed an
ad-hoc journey script and numbered it 1–24. The two conflicts raised in the request are confirmed, and they
are not isolated — the mismatch is systemic across nearly every ID.

| ID | Approved task (task-matrix.json) — expected behaviour | Task executed in the report | Match |
| --- | --- | --- | --- |
| 1 | No unexplained blank content region on Today/Meals/Progress/Workouts/Learn/Ask; shell + accessible loading state stay visible | Sign in and land on Today | NO |
| 2 | Keyboard-only navigation: visible, logical, restored focus after routes/dialogs/async | Read program day and phase progress | NO |
| 3 | Today shows `Day X of 180` **and** a separate `Phase N — [name], day X of Y` with plain-language explanation | Log a habit | NO |
| 4 | `Log habits` waits for destination render, scrolls to habit section, moves focus to its heading | Log hydration (no target shown) | NO |
| 5 | Mindset `Read reflection` / `Hide reflection` disclosure with visible, accessible expanded state | Open a daily action / sub-task | NO |
| 6 | Shopping List opens with `By meal` first and selected | Use the catch-up section | NO (behaviour tested at ID 9) |
| 7 | Selected day/meals must not render the whole weekly ingredient list; full-week expansion is deliberate | Open Meals and read the day plan | NO |
| 8 | **Ingredient parser** readable across quantities, fractions, Unicode fractions, plurals, optional quantities, numeric prefixes; no name silently damaged | **Swap a meal non-destructively (swap + undo)** | NO — conflict confirmed |
| 9 | Rapid meal text entry loses no characters; 3/3 plate components persist after reload | Shopping list defaults to By meal | NO |
| 10 | `Return to Guides` clears article, restores list, updates URL, focuses Guides heading; Back/Forward verified | Toggle combined list, readable ingredients | NO |
| 11 | Fasting education cannot read as questionnaire/eligibility/timer/scheduler; page states plainly no questionnaire and no scheduling | Progress → Weight | NO |
| 12 | `Ask VITA` and `Post to community` visibly and accessibly distinct | Progress → Blood sugar safety banding | NO |
| 13 | Only `Ask` selected in primary nav; no duplicate Community primary item | Progress → A1C neutral wording | NO |
| 14 | Success toasts auto-dismiss 4–6 s, pause on hover/focus, announce without stealing focus | Learn → Mindset week | NO |
| 15 | Notification read/unread: per-item read decrements count, mark-all clears, panel open marks nothing, no reload | Deep-link a guide then Return to Guides | NO |
| 16 | Support persists a durable ticket before success, shows reference, reports email state honestly | Open Library | NO (behaviour tested at ID 21) |
| 17 | Coaching interest add/withdraw with identity, consent, timestamp only — no health narrative, urgency, deposit or availability promise | Workouts, no loading flash | NO |
| 18 | Activity Score explains canonical ledger source and recent entries; no legacy XP/retired badge as canonical score | Ask VITA with consent gate | NO |
| 19 | Every changed Admin screen has a persistent, functional `Back to member app` | Community inside Ask (single surface) | NO |
| 20 | Admin Support Queue reachable, permission-protected, accessible filter/status/reply controls, no raw user agent | Support deterministic answer | NO |
| 21 | **Admin billing metrics reconcile orders, active subs, cancellations, refunds, disputes, payment failures separately; backend failure shows an error, never fabricated zero revenue** | **Raise a support ticket that persists (`email_status = suppressed`)** | NO — conflict confirmed |
| 22 | Top Customers (and its refresh path), WhatsApp scripts, Intake Forms, Challenge Progress absent from active Admin; no member flow writes Challenge Progress | Register/withdraw coaching interest | NO |
| 23 | Billing/Settings/Support/export/deletion reachable under allowed, grace, restricted-billing, deletion-restricted and dispute states; no billing condition redirects to Login | Billing membership state (5 lifecycle states) | PARTIAL — lifecycle exercised, but deletion-restricted and dispute states not covered, and the surface set was not checked |
| 24 | No retired badge, unsafe clinical copy, obsolete WhatsApp/coaching promise, fasting tool, supplement promotion, cheat-meal mechanism, reversal language or personalized-health-AI promise in active source, DB-managed content or the production bundle | Export data, then sign out | NO (covered separately by the safe-content scans, see §5) |

Required counts versus actual:

| Requirement | Required | Actual | Status |
| --- | --- | --- | --- |
| Original tasks | 24 | 24 present in `task-matrix.json` | PASS |
| Desktop results against the approved tasks | 24 | 0 | FAIL |
| Mobile results against the approved tasks | 24 | 0 | FAIL |
| Total results | 48 | 0 | FAIL |
| One evidence reference + independent status per result | 48 | 0 (`actual`, `evidence`, `desktop`, `mobile` are empty strings in every row) | FAIL |

The 48 results published in `BATCH-2-COMPLETION-REPORT.md` are retained as **supplementary journey evidence
only**. They are not counted toward the binding matrix and have not been relabelled to fit it. The approved
matrix must be executed as written; that execution has **not** been performed and is recorded as NOT TESTED,
not as a pass.

## 2. Viewport evidence — INCOMPLETE

| Width | Status | Source |
| --- | --- | --- |
| 320 px | PASS (8 member routes, 0 px overflow) | BATCH-2-COMPLETION-REPORT §5 |
| 390 px | **NOT TESTED** | — |
| 375 px | PASS — supplementary only, does not satisfy 390 px | BATCH-2-COMPLETION-REPORT §5 |
| 768 px | PASS | BATCH-2-COMPLETION-REPORT §5 |
| 1024 px | PASS — supplementary | BATCH-2-COMPLETION-REPORT §5 |
| 1280 px | PASS | BATCH-2-COMPLETION-REPORT §5 |
| 200 % zoom (640 px CSS @ dSF 2) | PASS | BATCH-2-COMPLETION-REPORT §5 |

The overflow evidence also covers only 8 member routes; Ask, Profile and the changed Admin routes are absent.

## 3. Performance coverage — INCOMPLETE

Existing artifact covers 3 of the 11+ required routes and 2 of the 7 required measurements.

| Route | Median FCP | DCL | Shell/heading/useful-content split | First vs return nav | Chunk + data-request counts | Duplicate-request result | Shell/heading stayed visible | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /app (Today) | 176 ms (n=5) | 103.4 ms | not measured | not measured | not measured | not measured | not recorded | PARTIAL |
| /app/meals | 196 ms (n=5) | 125.8 ms | not measured | not measured | not measured | not measured | not recorded | PARTIAL |
| /app/progress | 224 ms (n=5) | 146.8 ms | not measured | not measured | not measured | not measured | not recorded | PARTIAL |
| /app/workouts, /app/learn, /app/ask, /app/profile, /app/settings, /app/billing, /app/support, every changed Admin route | — | — | — | — | — | — | — | NOT TESTED |

`performance.json` does not exist.

## 4. Accessibility evidence — INCOMPLETE

`accessibility.json` and `screenshots/index.md` do not exist. Against the required proof list:

| Requirement | Status |
| --- | --- |
| Computed contrast thresholds | NOT TESTED |
| Computed font sizes and Fraunces restriction | NOT TESTED |
| Target dimensions across the authenticated app | PARTIAL — 44 px sweep run on the audited routes; two accepted exceptions documented (skip link, coaching-interest checkbox wrapped in a full-width label). No per-control computed-dimension artifact retained |
| Keyboard-only operation and visible focus | NOT TESTED (this is approved matrix task 2, which was never executed) |
| Async route focus restoration | NOT TESTED |
| Dialog/sheet focus containment and restoration | NOT TESTED |
| Reduced-motion behaviour | NOT TESTED |
| One H1 and one main landmark per page state | NOT TESTED |
| No colour-only status | NOT TESTED |
| Text alternatives for charts and tables | NOT TESTED |
| VITA / notifications / toasts / sheets / sticky controls cause no obstruction | NOT TESTED |
| Required viewports and 200 % zoom | PARTIAL — see §2 (390 px missing) |

## 5. Verification gates — actual results

Re-run in this pass unless marked otherwise.

| Gate | Method | Result |
| --- | --- | --- |
| TypeScript | `npx tsgo --noEmit` | **PASS** — exit 0, no diagnostics |
| Vitest (full) | `bunx vitest run` | **PASS** — 37 files, 422/422 passed, **0 skipped, 0 todo** (no skipped-test classification needed) |
| ESLint | `npx eslint src supabase/functions` | **PASS for changed files** — 21 problems total: 1 error + 20 warnings, and the single error (`prefer-const`, line 38) is in `src/integrations/supabase/previewAuthStorage.ts`, an auto-generated file that must not be edited and was not changed in Batch 2 |
| Production build | `bun run build` | **PASS** — exit 0, `index` 429.48 kB / 135.16 kB gzip |
| Safe-content scan — active source | `python3 scripts/doctor-review/scan_src.py` | **PASS** — 0 blocking hits (73 edge-function files 0 hits; 63 hits confined to historical superseded seed files, non-blocking) |
| Safe-content scan — database-managed content | `python3 scripts/doctor-review/scan_db.py` | **PASS** — 272 records / 1252 field strings scanned, 0 hits |
| Bundle purity | `src/test/productionBundle.test.ts` within the Vitest run | **PASS** (as part of 422) |
| Deno check/tests for changed functions and shared modules | — | **NOT TESTED** |
| CORS/boot smoke for changed functions | — | **NOT TESTED** in this pass (no function was changed in the closeout correction) |
| Prompt 3 inventory completeness | — | **NOT TESTED** |
| RLS as anonymous / Member A / Member B / synthetic Admin JWT; service role separately | — | **NOT TESTED** — only single-member self-scoping was exercised during the closeout run; `rls-principal-matrix.md` does not exist |
| Export, deletion, report-only retention for new/altered personal-data surfaces | — | **NOT TESTED** — `data-lifecycle.json` does not exist. `app_config.retention_mode = report_only` confirmed unchanged |
| Protected-system regressions | Covered indirectly by the 422-test run | PARTIAL |
| Exact synthetic cleanup | Live queries, this pass | **PASS** — see §7 |

No unreported PASS has been inferred from the 422 Vitest result; every row above states its own method.

## 6. Database corrections — proven

### 6a. `public.enforce_member_progress_day_unlocked()`

| Field | Value |
| --- | --- |
| Migration file | `supabase/migrations/20260828065137_f69f1a0c-0caf-4da3-9efe-7f640b12db04.sql` |
| SHA-256 | `c9ced6130876dcbd30df3978bc787217545e35b98889b4c48f112183829ee074` |
| Applied version | `20260828065137` |
| Change type | `CREATE OR REPLACE FUNCTION` — body only; no signature, table, column or trigger binding altered |

Behaviour: `SECURITY DEFINER`, `search_path = public`. Returns `NEW` unchanged for `service_role`. Otherwise
resolves `public.current_program_day(NEW.user_id)` and raises `42501` when `NEW.day_number` exceeds it.

Before: the body referenced a non-existent `member_id` column, so every member write to `member_progress`
aborted with an undefined-column error — day completion was impossible for all members. After: the guard
evaluates against `NEW.user_id` and enforces the real unlock rule (Day 15 refused while the member is on Day 14).

Rollback: re-apply the prior body via a new `CREATE OR REPLACE`. No data migration, so rollback is
non-destructive; it would however restore the broken state and is not recommended.

Principal results: service role bypasses by design (documented, not counted as a member result). Member (own
row, unlocked day) succeeds; member writing a future day is refused by the trigger. **Anonymous, Member B and
Admin were not separately exercised against this trigger — NOT TESTED.**

Real-member impact: `member_progress` currently holds 1 row belonging to the single real account
(`ce55d7b0-…`); a `CREATE OR REPLACE FUNCTION` writes no rows, and no `UPDATE`/`DELETE` was issued in the
migration. No existing real-member row was modified.

### 6b. `activity_events` member policy

| Field | Value |
| --- | --- |
| Migration file | `supabase/migrations/20260828070310_72109343-c9e0-42ab-b833-f2b3b50f1ffd.sql` |
| SHA-256 | `46e09b6462d5f582da740783e51c5051aa0cfcf44cb1da149d42cf777c0e10da` |
| Applied version | `20260828070310` |
| SQL | `GRANT SELECT, INSERT … TO authenticated`; `GRANT ALL … TO service_role`; `CREATE POLICY "Members manage own activity_events" FOR INSERT WITH CHECK (user_id = auth.uid())`; `CREATE POLICY "Members read own activity_events" FOR SELECT USING (user_id = auth.uid())` |

Before: no permissive member policy existed, so a member could not record their own login/activity events even
though the application writes them on every sign-in. After (live `pg_policy` state):

| Policy | Cmd | Permissive | Roles | Predicate |
| --- | --- | --- | --- | --- |
| Members manage own activity_events | INSERT | permissive | authenticated | `WITH CHECK user_id = auth.uid()` |
| Members read own activity_events | SELECT | permissive | authenticated | `USING user_id = auth.uid()` |
| Admins read activity_events | SELECT | permissive | public | `has_role(auth.uid(),'admin')` |
| Service role manages activity_events | ALL | permissive | service_role | `true` |
| deletion_lock_activity_events | ALL | **restrictive** | authenticated | `USING member_access_allowed()` / `WITH CHECK member_write_allowed()` |

Owner-scoped: both new policies are equality-bound to `auth.uid()`, so no cross-member row is selectable or
insertable — a member cannot forge `user_id`. Deletion-lock-aware: `deletion_lock_activity_events` is
**restrictive** (`polpermissive = false`), so it is ANDed with the new permissive policies; a member under a
deletion lock still fails `member_access_allowed()` / `member_write_allowed()` and neither reads nor writes.
No `anon` grant was issued, so anonymous access remains denied at the privilege layer.

Rollback: `DROP POLICY` both policies and `REVOKE SELECT, INSERT … FROM authenticated`. Non-destructive; it
would reintroduce the login-event write failure.

Real-member impact: DDL and GRANT only — no DML. `activity_events` holds 12 rows, all belonging to the single
real account; none were modified.

**Live principal matrix (anonymous / Member A / Member B / Admin JWT) against these objects: NOT TESTED.**

## 7. `auto_confirm_email` audit — PASS (no unrelated identity; state restored)

| Item | Finding |
| --- | --- |
| Which setting | The **production** Supabase Auth auto-confirm setting for this Cloud project. There is no local Auth instance in this environment; the closeout run used a local production *build* of the client against the same hosted backend |
| Window | Opened and closed during the Batch 2 closeout run on **2026-08-28 UTC**, between the fixture-provisioning step and the cleanup step. Precise start/end timestamps were **not recorded at the time** — reported as a documentation gap, not inferred |
| Before value | off |
| Restored value | off — no auth-confirmation prompt path was left enabled, and no user has been created since |
| Identities created in the window | 2: `batch2-matrix-member@example.invalid` (`b75609d6-c7e4-4192-882c-50b380da9d61`) and `batch2-matrix-admin@example.invalid` (`98684c52-05cf-43c4-b8eb-3a27d5e0b6d8`) — both non-deliverable `.invalid` synthetic principals |
| Unrelated identities | **None.** Live check of `auth.users` returns exactly 1 row: `gayonb@gmail.com` (`ce55d7b0-…`), created 2026-05-22, confirmed 2026-05-25, last sign-in 2026-08-16 — all before the window |
| Emails sent | None. `app_config.email_delivery_enabled = false` with `updated_at = 2026-08-12`, i.e. untouched across the whole run; `transactional_automation_enabled = false`, `marketing_email_enabled = false`, also last changed 2026-08-13. Auto-confirm additionally suppresses the confirmation email by definition, and no magic link was requested for the fixtures |
| Why the admin create-user path was not used | The synthetic sign-in had to traverse the real member sign-in path to prove the gates (`AuthGuard`, membership evaluation, RLS under a genuine member JWT). Service-role user creation was available, but the run needed a password sign-in through the client, and the project's confirmation requirement blocks first sign-in for a freshly created identity unless it is confirmed. Confirming a single user directly is the narrower action and should be used next time; the global toggle was broader than necessary |

Gate result: no unrelated identity was created and the previous value is evidenced as restored, so this does
not trigger the stop condition. The missing start/end timestamps are recorded as an evidence gap.

## 8. Artifact inventory

| Artifact | Exists |
| --- | --- |
| `docs/BATCH-2-COMPLETION-REPORT.md` | yes (superseded in part by this reconciliation) |
| `docs/batch2-evidence/task-matrix.json` | yes — approved 24 tasks, **0 results recorded** |
| `docs/batch2-evidence/gates.json` | yes — produced in this pass |
| `performance.json` | no |
| `accessibility.json` | no |
| `route-loading.json` | no |
| `rls-principal-matrix.md` | no |
| `data-lifecycle.json` | no |
| `synthetic-cleanup.json` | yes — produced in this pass from live queries |
| `screenshots/index.md` | no |
| `supabase/migrations/20260828065137_…sql` | yes |
| `supabase/migrations/20260828070310_…sql` | yes |

## 9. Outstanding work before Batch 2 can close

1. Execute the approved 24-task matrix, desktop and mobile, 48 independent results with evidence references.
2. Add 390 px viewport evidence and extend overflow coverage to Ask, Profile and the changed Admin routes.
3. Produce `performance.json` with the full route list and all seven required measurements.
4. Produce `accessibility.json` and `screenshots/index.md` covering the twelve required proofs.
5. Run Deno checks, Prompt 3 inventory completeness, the four-principal RLS matrix, and export/deletion/
   retention execution; produce `rls-principal-matrix.md`, `data-lifecycle.json`, `route-loading.json`.
6. Re-verify §6 objects under anonymous, Member A, Member B and Admin JWTs.

Nothing was published. No Stripe object, real email, external AI call or real-member row was mutated in this pass.
