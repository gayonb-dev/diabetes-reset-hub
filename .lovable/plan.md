# Batch 1 Completeness Correction (POST-v2)

Verified against the live database before writing this plan: 180 active + 7 inactive daily actions, 24 active + 105 retired VITA quotes. Scanning all five text fields of the 180 active daily actions (not just `action_description`) currently returns hydration-target wording in 38 distinct records / 43 individual field strings, snack-window wording in 1 record / 3 field strings, and mandatory all-rings / all-walks / every-meal / log-everything wording in 67 records / 92 field strings, plus 12 records with A1C or test-day wording. Both counting methods are preserved in the pre-correction report and both must reach zero after remediation. The previous "zero active banned-content hits" claim is therefore wrong, and the closeout stays open until these are zero.

No new research phase, no doctor approval gate, no change to the completed hydration UI/points work, no publication.

## 1. Freeze the failed evidence

Copy the five current POST artifacts byte-identically to `*-POST-v1-FAILED-AUDIT.*` and record their SHA-256 in the manifest, labelled as evidence of a false-negative scanner. They are not the final current-state artifacts.

## 2. Remediate all 180 active daily-action records, every field

Fields covered: `day_name`, `action_title`, `action_description`, `learning_objective`, `sub_tasks` (each JSON element).

Applied rewrite rules:

- Water instructions become optional logging: "Log the water you drink today if that is useful to you." No target, deadline, percentage or completion requirement. Keep the fluid-restriction / professional-guidance note.
- "all rings", "all four rings", "log everything", "all meals" and similar perfection requirements become "Choose and log one useful routine today."
- "all 3 walks" / "3 walks" / "all walks" become "Choose one comfortable movement option if it is safe for you."
- "protein at every meal" becomes "Include a protein food at one meal if it fits your preferences and meal plan."
- Added-set, every-waking-hour and forced-progression instructions become optional comfortable movement with gradual, self-paced progression.
- Fixed snack windows become: snacks are optional, and timing depends on hunger, medicines, activity and the member's care plan.
- All test-preparation instructions and all requirements to log or compare an A1C or glucose result are removed.
- Sharing, Ask/community participation, measurements and tracking are stated as optional everywhere.

Named day corrections:

| Day | Correction |
| --- | --- |
| 2 | Title "Log Water"; objective "Practise recording the water you drink." |
| 7 | Title "Using the Glucose Log"; recording applies only when glucose checking is already part of the member's care plan |
| 8 | Approved optional comfortable-movement wording; no promised glucose effect |
| 11 | Approved hydration wording plus fluid-restriction exception; no craving claim |
| 24 | Neutral sleep-support title; sleep is not framed as a blood-sugar tool |
| 67 | "Snack Window" removed from title and every task |
| 69 | Neutral stress-support title; keep only the individualized body copy |
| 153 | "hit the target cleanly" removed |
| 166 | Replaced with a neutral movement-time day so the 180-day sequence stays complete; not left active with a RETIRE disposition |
| 179 | Test-preparation language removed |

Changes are applied by a fail-closed, ID-addressed migration — never an unrestricted substring or global search-and-replace. Before applying: every intended record ID, field, old value and new value is enumerated; the expected record and field counts are asserted; the run stops on any missing, duplicate or unexpected current value (each update is guarded by the expected current value). After applying: every changed field is re-read by exact ID, expected versus actual row/field counts are reported, no unintended daily-action record may differ, and 180 active guided days plus the 7 inactive historical records are confirmed. No day is deleted and no `is_active` flag on the 180 is flipped, preserving the `daily_actions_one_active_per_day` index and the E1–E7 history.

## 3. Active source wording

- `src/data/workouts.ts`: "Insulin-sensitivity boost" replaced with neutral strength/mobility wording.
- `src/data/learnGuides.ts`: drop "while screening is reviewed"; state that fasting is optional and that scheduling/timers are unavailable.
- `src/lib/mealTiming.ts`: remove the universal "three meals across a twelve-hour day" instruction; defer meal timing to the member's routine and care plan.
- `src/components/progress/A1CTab.tsx`: "Your first A1C result anchors everything" becomes optional recording language.

Preserved unchanged: the neutral supplement-safety guide, medication boundaries, remission education. Keyword hits inside safety warnings or historical evidence are classified by context, not stripped.

## 4. Inventory semantics and disposition vocabulary

In `scripts/doctor-review/build-inventory.py` and `classify.py`:

- Retired VITA quotes and retired badges emit `active=false` and `reachable_by_member=false`.
- No item may be active/member-reachable while its state text says it becomes inactive or unreachable — this becomes a fail-closed gate.
- Retired unsafe wording is labelled "Retired historical evidence; not approved for member display", never "appendix-approved".
- Every unresolved `REWRITE` disposition (`REWRITE — CLINICIAN REVIEW`, `REWRITE — OWNER APPROVAL`) is removed from the current-state vocabulary for active items; safe corrected boundary/education text becomes `KEEP — APPROVED EDUCATION`.
- Genuinely unresolved active wording stays a failing closeout item and is reported as such, not as approved.

## 5. Fail-closed scans over database *and* source

Extend the content scan so it queries the live `daily_actions`, `vita_quotes`, `content_items` and `badges` tables in addition to source files, covering every text column and each JSON `sub_tasks` element. New Vitest/script gate fails unless all of the following hold:

- 0 active/member-reachable hydration-target references — by distinct record **and** by individual field string
- 0 active/member-reachable fixed snack-window references — both counts
- 0 active/member-reachable mandatory all-rings / all-walks / log-everything wording — both counts
- 0 active mechanism or guaranteed-result claims
- 0 active/member-reachable `RETIRE` dispositions
- 0 active/member-reachable unresolved `REWRITE` dispositions of any kind, including `REWRITE — CLINICIAN REVIEW` and `REWRITE — OWNER APPROVAL`. The owner has accepted the evidence authority and its editorial decisions: safe false positives are corrected to `KEEP — APPROVED EDUCATION`, genuinely unsafe wording is remediated before closure, and anything truly unresolved makes Batch 1 report **FAIL** rather than close.
- 180 active guided days + 7 inactive historical records
- 24 active replacement VITA quotes + 105 retired/unreachable quotes

The existing hydration-target regression scan and the appendix content scan stay in place and are folded into this gate.

## 6. Final evidence — only after every gate passes

Regenerate from the corrected database and source:
`active-content-inventory-POST-v2.json`, `active-content-inventory-POST-v2.csv`, `content-replacement-matrix-POST-v2.md`, `content-evidence-pack-POST-v2.md`, `BATCH-1-COMPLETION-REPORT-POST-v2.md`.

Totals reconciled exactly across all five; SHA-256 reported for every artifact including the frozen v1 files; Day 14 recorded as `ec4ea88d-6773-43c5-8ef9-6248b02e963d`; the report states plainly that no client publication occurred, that production database content was updated, and that `ask-vita`, `support-assistant` and `create-checkout-session` were deployed. Doctor review remains a lightweight finished-app review — no worksheet, no sign-off gate. Delivered under `/mnt/documents/batch1-doctor-review/`.

Verification run: focused hydration tests, expanded database+source content scan, `tsgo --noEmit`, lint on touched files, full Vitest, production build. If any gate fails, the report states the failure rather than claiming closure.

## 7. Completeness addendum (approved)

**Additional zero-count gates** (each counted by distinct record *and* individual field string, before and after): A1C/glucose test-preparation requirements; requirements to log or compare A1C/glucose results (the 12 pre-correction A1C/test-day records are enumerated both ways before remediation and proved zero after); universal meal requirements ("every meal", "all meals", "protein at every/all meal"); forced activity progression, added-set requirements, every-waking-hour movement, fixed walk counts; mandatory sharing, Ask/community participation, measurements or tracking; perfection/shame wording ("all rings", "log everything", "hit the target", judgmental "cleanly"/"honestly").

**Full surface coverage.** The scan uses the complete inventory content-coverage manifest; `daily_actions`, `vita_quotes`, `content_items`, `badges` are mandatory minimums. It also covers every declared database-managed member-facing, notification, admin-editable, prompt, seed/default and fallback surface. A declared surface yielding zero items must retain its documented reason. Scanned layers: live database content, source, Edge Function prompts and deterministic copy, notification defaults and admin previews, seed/default and fallback content, and the freshly built production `dist/` bundle. Historical evidence is permitted only when proven `active=false`, `reachable_by_member=false`, unselectable by every member read path, and absent from the production bundle.

**Permanent false-negative fixtures.** Tests include the exact previously missed strings — "Water Target", "Hit your full water goal before 6 PM", "All four rings closed", "Complete all 3 walks", "Log everything", "Protein at every meal", "Teach the Snack Window", "moves glucose into your muscles instead of your bloodstream", "front-loading hydration prevents evening cravings", "Insulin-sensitivity boost", "Movement Before the First Meal", "prepare for tomorrow's test", "Your first A1C result anchors everything" — each failing when active/member-reachable. Safe-control fixtures prove the scanner still allows logged water amounts without targets, optional comfortable movement, optional tracking under a care plan, neutral remission education, supplement-safety warnings, medication boundaries, and safe negatives such as "DRM does not promise remission." The test fails if it scans zero database rows, zero source files, or omits any required surface.

**Whole-day coherence.** No mechanical single-sentence bulk replacement. For every changed day, `day_name`, `action_title`, `action_description`, `learning_objective` and each `sub_tasks` element are reviewed together so they describe one coherent, achievable, optional daily action with no contradiction and no repetitive or nonsensical task lists. Each changed record ID, field, exact before copy and exact after copy is reported.

**Transaction and rollback safety.** The guarded migration runs in a single transaction; all expected-value and expected-count assertions run before mutation; any mismatch aborts the whole migration with no partial updates. Exact before/after row and field counts are recorded. Tested rollback SQL restoring only the exact changed content is included, with its target count verified without executing it. The report confirms no member-owned health, profile, billing, conversation or support data was read or changed.

**Deployment-state honesty.** POST-v2 artifacts distinguish production database content made live by the migration, deployed Edge Function wording, client source/build changes that remain unpublished, and the currently served public bundle. Unpublished client copy is labelled "release-candidate source, not yet published". The completion report provides before/after distinct-record and field-string counts per banned category, all changed IDs and fields, database/source/bundle scan totals, actual active/reachable/retired counts, zero unresolved active REWRITE dispositions of any kind, zero active/member-reachable RETIRE dispositions, SHA-256 for all frozen POST-v1 and final POST-v2 artifacts, and explicit PASS/FAIL per gate.

**Protected scope — unchanged.** Hydration UI/points, glucose S1 safety, fasting feature flags, supplement-safety education, authentication, consent, privacy, deletion/export, billing, RLS, Stripe, email and VITA authorization behavior are not modified; their existing regression tests are run to prove it.

If any gate fails: report FAIL, no closeout claim. Nothing published.

## 8. Authority-conformance addendum (approved)

**`authority_conformance` gate (fail-closed).** Bound to the exact owner-approved `DRM_Batch1_Clinical_and_Owner_Approval_Appendix.md` version and its SHA-256. Verified by stable ID and field: every canonical daily-action replacement listed in section 7; all 24 replacement VITA quote texts from section 8; every content-item title and summary in section 9; every source-code correction in section 10; and the corrected Day 14 ID `ec4ea88d-6773-43c5-8ef9-6248b02e963d`. Where the authority supplies exact wording, current content must match it exactly. Where this POST-v2 plan newly authorizes a contextual rewrite for previously missed fields, the migration manifest records the exact approved rule, old copy and resulting copy. Any missing record, duplicate record, text mismatch, silent substitution or unmapped deviation is a FAIL.

**Exact VITA set equality.** Counts alone are not accepted. Proof required that the 24 active quotes form an exact, duplicate-free text set matching the 24 approved authority quotes; each active quote is eligible for selection; all 105 old quotes are retired and ineligible; no retired quote can be returned by Dashboard, VITA selection logic, database RPC, fallback, seed or admin-preview read path; retired stored text is labelled historical evidence only, never approved wording. Reported: exact-set equality (must be true), duplicate count, missing approved quotes, unexpected active quotes, retired-read-path results (all must be zero).

**All inventory-generator gates preserved.** POST-v2 generation requires `classifier_fixtures`, `coverage_manifest`, `duplicate_day_reconciliation`, `no_personal_data`, `authority_conformance`, active/reachability consistency, distinct-record and field-string count reconciliation, and database/source/bundle nonzero-scope assertions to all pass. The inventory process queries and emits no member-owned health, profile, support, billing, conversation or identity data. The final report records production project ref `wqennhjdojjqmmqzjhti`, UTC generation time, migration identifier, authority filename and SHA, and every gate result.

**Actual member read-path tests.** Static flags are insufficient. Focused tests prove corrected content is what the product actually returns through Dashboard/Today, Day Detail, `get-today-action`, MCP today-action retrieval, VITA quote selection, Learn/content-card retrieval, notifications and admin previews, and seed/default/fallback paths. Representative corrected days 2, 7, 8, 11, 24, 67, 69, 153, 166 and 179 are tested, plus at least one formerly affected subtask from each banned category. Each asserts old copy absent and corrected copy returned; historical daily-action duplicates and retired VITA/badge content return no member-selectable result.

**Authority-wide banned-content gate.** Beyond the newly listed false-negative phrases, the entire authority prohibited-language set is enforced across active database content, source, Edge prompts, notifications, admin previews, seeds/fallbacks and `dist/`: positive reversal/cure claims; guaranteed, typical or predicted outcomes; fabricated member results; supplement products, brands, protocols or doses; diagnostic-zone gamification; universal hydration formulas or targets; fixed snack windows; mandatory logging or all-rings perfection; compliant/non-compliant; judgmental bad/good/clean/textbook/cheat food framing; "no exceptions", "hold the line", "earn your A1C", test-prep, "blood sugar medicine", "glucose repair"; unsupported founder monitoring or personal-review promises. Only context-tested safe negatives, source-linked neutral education and historical unreachable evidence are allowed.

**Verification completeness.** Run guarded migration assertions and post-migration reconciliation; rollback-target verification; authority-conformance tests; read-path tests; full database/source/bundle content scans; TypeScript; touched-file lint; full Vitest; production build; Deno check for any Edge Function changed as a result of the scan; and existing protected-system regression tests. No successful POST-v2 artifacts are written until every gate passes. If anything remains unresolved: report FAIL and stop, with no closeout claim.

All other approved plan requirements stand. No client publication, no new clinical research, no doctor worksheet, no unrelated system change.

## 9. Authority precedence, Day 14 erratum and execution-time preflight (approved)

**Authority precedence.** The `authority_conformance` gate uses `DRM_Batch1_Clinical_and_Owner_Approval_Appendix.md`, SHA-256 `a44e1f3cd599e6810dce140ad5b6a9f5046c23dbdd7f3c9772360c134b052788`, together with this approved POST-v2 plan and its approved addenda acting as a narrowly scoped implementation erratum.

**Day 14 erratum.** The original authority contains an incorrect Day 14 record ID. The erratum supersedes only that identifier:

- Incorrect historical reference: `ec4ea88d-6773-43c5-a4c1-151639681c97`
- Correct live Day 14 ID: `ec4ea88d-6773-43c5-8ef9-6248b02e963d`

The approved Day 14 replacement wording is unchanged. The incorrect ID is never searched for and never mutated.

The POST-v2 plan supersedes the authority only where it explicitly governs previously missed `day_name`, `action_title`, `learning_objective` or `sub_tasks` fields. For everything else the appendix remains authoritative. This precedence and erratum are recorded in the migration manifest, the authority-conformance test and the final report.

**Fresh execution-time production preflight.** Immediately before opening the migration transaction, reconfirm: the connected project is exactly `wqennhjdojjqmmqzjhti`; 180 active guided daily actions and 7 inactive historical records; 24 active replacement and 105 retired VITA quotes; `daily_actions_one_active_per_day` exists; every intended record ID is unique; every guarded old field value still matches the migration manifest; and no unexpected migration with the same identifier has already been applied. Any mismatch stops execution before mutation.

**Inside the transaction.** Lock only the intended content rows before updating; rerun the expected-value and expected-count assertions after locks are acquired; perform the guarded ID-and-field updates; re-read and reconcile every changed field before commit; roll back the complete transaction on any discrepancy. No broad table lock, no member-owned row lock, no unrelated data read or mutation.

Every other requirement in the approved POST-v2 plan and addenda is preserved. No publication.
