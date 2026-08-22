# Batch 1 Closeout Correction

Plan mode requires approval before edits. Approving this runs the correction exactly as specified — no publication, no clinical research reopened, no doctor sign-off gate.

## 1. Hydration — remove every universal numeric target

- Delete `DEFAULT_WATER_TARGET_OZ` and reduce `src/lib/hydration.ts` to logging-only helpers/comments (no numeric default anywhere).
- `HabitLogging.tsx`: water status becomes "N oz logged today" — no `/ 64oz`, no percentage. Keep the fluid-restriction guidance sentence, minus the "64oz marker" wording.
- `Dashboard.tsx`: water tile/ring shows logged amount only; remove target-completion ring and `oz / 64oz` unit.
- Points: remove the threshold-triggered award. Award a once-daily "logged water" action the first time a member records any water that day (logging, not target achievement).
- No new questionnaire, no prompt to set a target. If a member-supplied target ever exists it is out of scope here.

## 2. Regression scan

Extend `src/test/appendixContentScan.test.ts` (or a focused `hydration` test file) to fail on:
- body-weight hydration formulas (`weight * 0.5`, "half your body weight", oz-per-pound patterns),
- fixed default hydration targets (`64`, `DEFAULT_WATER_TARGET_OZ`, `/ \d+oz` water strings) in active source.

## 3. Evidence regeneration

- Preserve the six existing artifacts as BASELINE: rename/copy to `*-BASELINE.*` with a header line marking them pre-implementation evidence.
- Re-run `scripts/doctor-review/build-inventory.py` against the current database and source, and emit:
  - `active-content-inventory-POST.json`
  - `active-content-inventory-POST.csv`
  - `content-replacement-matrix-POST.md`
  - `content-evidence-pack-POST.md` (replaces the worksheet-style clinical pack; no spreadsheet, no sign-off gate)
  - `BATCH-1-COMPLETION-REPORT-POST.md`
- POST artifacts must reflect current state: 24 active VITA quotes, 105 retired, current daily-action wording, current dispositions, and no "93 awaiting clinician approval" framing.
- Totals reconciled exactly across JSON, CSV, matrix, evidence pack and report; SHA-256 reported for each.
- Delivered under `/mnt/documents/batch1-doctor-review/` so downloads work.

## 4. Documentation corrections

- Day 14 ID recorded as `ec4ea88d-6773-43c5-8ef9-6248b02e963d`.
- State plainly: no client publication; production database content was updated; `ask-vita`, `support-assistant`, `create-checkout-session` were deployed.
- Doctor review described as a lightweight finished-app review only.

## 5. Verification

Focused hydration tests, expanded content scan, `tsgo --noEmit`, lint on touched files, full Vitest, production build. Confirm 180 active + 7 historical daily actions, 24/105 VITA reconciliation, zero active banned-content hits. Report results in one corrected closeout report.
