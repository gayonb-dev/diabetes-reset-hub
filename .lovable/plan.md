# Batch 1 Closeout Correction

Approving this runs the correction exactly as specified — no publication, no clinical research reopened, no doctor sign-off gate.

## 1. Hydration — remove every universal numeric target

- Rewrite `src/lib/hydration.ts` as logging-only: delete `DEFAULT_WATER_TARGET_OZ`; export a `waterLoggedLabel(oz)` helper and a `waterAwardIdempotencyKey(calendarDayKey)` helper. No numeric default anywhere.
- `HabitLogging.tsx`: water status becomes "N oz logged today" — no `/ 64oz`, no percentage. Keep the fluid-restriction guidance sentence, with the "64oz marker" wording removed.
- `Dashboard.tsx` + `HabitRing.tsx`: water ring switches to log-only mode (`target: null`) — no progress arc, no completion bloom, no `oz / 64oz` unit; caption and aria-label read the logged amount only. Other rings keep their existing targets.
- Points: remove the threshold-triggered award. The first water entry of the member's calendar day fires a once-daily `log_water` action representing logging, not target achievement.
- No new questionnaire and no prompt to set a target.

## 2. Hydration regression scan

New focused scan (in the expanded content scan) that rejects hydration-**target** semantics only:
- `DEFAULT_WATER_TARGET_OZ` or any `water*target` constant,
- "64 oz target", `/ 64oz`, `oz / <n>oz` water strings,
- body-weight formulas ("half your body weight in ounces", pounds ÷ 2, oz-per-pound) and equivalent target calculations.

Explicitly allowed and covered by assertions: "N oz logged today", `+8oz` quick-add buttons, recipe quantities, line/file positions and any other unrelated use of the number 64.

## 3. Idempotent once-daily water award

- Server-side remains the authority: a new `award_points_v2` RPC performs `INSERT ... ON CONFLICT DO NOTHING RETURNING` and reports whether the row was actually inserted, so duplicates award no legacy XP either.
- `gamify-action` computes the ledger day from the member's `profiles.timezone` via the shared `calendarDay` helper and uses the stable key `log_water:<member-calendar-day>`.
- The React ref stays only as a within-session call suppressor, never the sole safeguard.
- Tests cover: first entry, refresh/reload replay, two rapid concurrent entries, later same-day entry — each yields exactly one award; plus a new local calendar day starts a new award.

## 4. Baseline evidence preservation

Copy these five files byte-identically (no header lines, no byte changes) under `*-BASELINE` names:
`active-content-inventory.json`, `active-content-inventory.csv`, `content-replacement-matrix.md`, `clinical-review-pack.md`, `BATCH-1-COMPLETION-REPORT.md`.
`BATCH-1-APPENDIX-IMPLEMENTATION-REPORT.md` is post-implementation evidence and is NOT labelled BASELINE.
Add `BASELINE-MANIFEST.md` listing each filename, its pre-implementation status and SHA-256.

## 5. POST-IMPLEMENTATION artifacts

Regenerate from the current database and source:
`active-content-inventory-POST.json`, `active-content-inventory-POST.csv`, `content-replacement-matrix-POST.md`, `content-evidence-pack-POST.md`, `BATCH-1-COMPLETION-REPORT-POST.md`.

They must show the 24 active replacement VITA quotes, 105 retired quotes, current daily-action wording and current dispositions; no worksheet, no "93 awaiting clinician approval" framing. Totals reconciled exactly across all five; SHA-256 reported for every artifact. Delivered under `/mnt/documents/batch1-doctor-review/`.

## 6. Documentation corrections

- Day 14 ID recorded as `ec4ea88d-6773-43c5-8ef9-6248b02e963d`.
- Stated plainly: no client publication; production database content was updated; `ask-vita`, `support-assistant` and `create-checkout-session` were deployed.
- Doctor review described as a lightweight finished-app review only.

## 7. Verification

Focused hydration tests, expanded content scan, `tsgo --noEmit`, lint on touched files, full Vitest, production build. Confirm 180 active + 7 historical daily actions, 24/105 VITA reconciliation and zero active banned-content hits. Return one corrected closeout report plus the downloadable files.
