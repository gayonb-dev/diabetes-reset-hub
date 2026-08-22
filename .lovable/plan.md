# Batch 1 Completeness Correction (POST-v2)

Verified against the live database before writing this plan: 180 active + 7 inactive daily actions, 24 active + 105 retired VITA quotes. Scanning all five text fields of the 180 active daily actions (not just `action_description`) currently returns 38 records with hydration-target wording, 1 with snack-window wording, 67 with all-rings / all-walks / every-meal / log-everything wording, and 12 with A1C or test-day wording. The previous "zero active banned-content hits" claim is therefore wrong, and the closeout stays open until these are zero.

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

Changes are applied as a single idempotent migration that updates rows in place (no day is deleted, no `is_active` flip for the 180), preserving the `daily_actions_one_active_per_day` index and the 7 historical E1–E7 rows.

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
- `REWRITE — CLINICIAN REVIEW` is removed from the current-state vocabulary; safe corrected boundary/education text becomes `KEEP — APPROVED EDUCATION`.
- Genuinely unresolved active wording stays a failing closeout item and is reported as such, not as approved.

## 5. Fail-closed scans over database *and* source

Extend the content scan so it queries the live `daily_actions`, `vita_quotes`, `content_items` and `badges` tables in addition to source files, covering every text column and each JSON `sub_tasks` element. New Vitest/script gate fails unless all of the following hold:

- 0 active/member-reachable hydration-target references
- 0 active/member-reachable fixed snack-window references
- 0 active/member-reachable mandatory all-rings / all-walks / log-everything wording
- 0 active mechanism or guaranteed-result claims
- 0 active/member-reachable `RETIRE` dispositions
- 0 active/member-reachable `REWRITE — CLINICIAN REVIEW` dispositions
- 180 active guided days + 7 inactive historical records
- 24 active replacement VITA quotes + 105 retired/unreachable quotes

The existing hydration-target regression scan and the appendix content scan stay in place and are folded into this gate.

## 6. Final evidence — only after every gate passes

Regenerate from the corrected database and source:
`active-content-inventory-POST-v2.json`, `active-content-inventory-POST-v2.csv`, `content-replacement-matrix-POST-v2.md`, `content-evidence-pack-POST-v2.md`, `BATCH-1-COMPLETION-REPORT-POST-v2.md`.

Totals reconciled exactly across all five; SHA-256 reported for every artifact including the frozen v1 files; Day 14 recorded as `ec4ea88d-6773-43c5-8ef9-6248b02e963d`; the report states plainly that no client publication occurred, that production database content was updated, and that `ask-vita`, `support-assistant` and `create-checkout-session` were deployed. Doctor review remains a lightweight finished-app review — no worksheet, no sign-off gate. Delivered under `/mnt/documents/batch1-doctor-review/`.

Verification run: focused hydration tests, expanded database+source content scan, `tsgo --noEmit`, lint on touched files, full Vitest, production build. If any gate fails, the report states the failure rather than claiming closure.
