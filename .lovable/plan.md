# Final Fasting and Public-Claim Reconciliation

Narrow safety correction on the current post-snack-gate code state. No publish, no function deploy, no snack-row writes, no emails, payments or external AI calls.

## Environment truth (recorded verbatim in the report)

- Backend project: `wqennhjdojjqmmqzjhti` (shared by preview and published client).
- Database content changed: YES (approved snack SQL already applied to the shared production backend).
- Snack correction applied to shared production backend: YES.
- Client code published: NO. Current published client build replaced: NO.

## What the pre-plan audit already found

Verified by reading source, the database and the built bundle:

1. Fasting-window labels `12:12 / 14:10 / 16:8` exist in exactly one runtime location: `TARGET_LABEL` in `supabase/functions/_shared/fastingTarget.ts` (plus two explanatory comments in the same file and in `src/lib/mealTiming.ts`). That module is re-exported to the browser by `src/lib/mealTiming.ts`, which is why the strings appear in `dist/assets/Dashboard-*.js`.
2. No screen renders those labels. `canFast()` returns false unconditionally while `FASTING_SCHEDULING_ENABLED` is false, so `effectiveTarget()` is always 0 and `getFastingWindow()` always null. The only runtime consumer in the client is `src/components/today/HabitLogging.tsx`, which calls `scheduleForProfile()` for neutral meal-slot times, never the fasting labels. `supabase/functions/generate-meal-plan/index.ts` also gates on the same flag.
3. `src/pages/app/Fasting.tsx` is already education only, sourced to ADA and NIDDK.
4. Database-managed program content is clean: zero `daily_actions`, zero `content_items` rows matching "fast"; all 49 `meal_plans` rows are `plan_type = 'standard'`. `if_fasting_log` holds 2 historical member rows.
5. Two fasting badges exist in `badges` (`night-faster`, `cheat-and-fast`) and both are already `is_retired = true`; `BadgeGallery` filters `is_retired = false`, so they are unreachable.
6. `src/pages/LLMInfo.tsx:84` reads: "**Insulin & Inflammation:** Targeted food choices reduce post-meal glucose spikes and lower inflammation." It sits under "Why It Works", a product-benefit section on a public page, so it reads as an implied DRM outcome claim.
7. `supabase/functions/_shared/medicalSafety.ts:47` contains the window strings inside a detection regex that blocks fasting advice. That is safety machinery and must be kept.

## Changes to make

### A. Fasting labels and dead scheduling reachability

- `supabase/functions/_shared/fastingTarget.ts`: remove the member-facing window strings from `TARGET_LABEL` so no fasting window label can ever be rendered or bundled. Keep the numeric target type and the always-false gate for compatibility; label values become non-actionable internal text with a comment stating DRM does not prescribe or schedule fasting and why the shape remains. No schema change, no data deletion.
- Update the two explanatory comments in `fastingTarget.ts` and `src/lib/mealTiming.ts` that spell out the old ramp schedule.
- `src/hooks/useFastingProfile.ts` and `src/lib/mealTiming.ts` `rampStatus`: keep as compatibility code, no behavior change, add a short comment recording that they are unreachable while the flag is false.
- `src/pages/app/Meals.tsx:716`: the `intermittent_fasting` slot branch is dead (no such rows exist). Make it non-actionable by always using the standard slots, keeping the legacy `plan_type` value readable without driving layout.
- `src/pages/app/CheatMeal.tsx`: the "Fast started" status chip is the last member-visible fasting operational string; remove the chip while leaving the stored `fast_start_at` history untouched.
- Do not touch `medicalSafety.ts`, do not add calorie targets, goal weights or any replacement restrictive-eating feature, do not remove member history, do not change schema.

### B. Public glucose claim

- `src/pages/LLMInfo.tsx:84`: replace the outcome claim with a descriptive statement of what the software contains, e.g. "**Meals:** Meal-planning tools built around the plate method." Wording will match the surrounding grammar and the real feature.
- Scan active source, `public/llms.txt`, `index.html` metadata, JSON-LD and database-managed public content for materially equivalent versions of the same claim, and report exact hits. No rewrite of unrelated educational lessons.

### C. Snack gate preservation

No snack rows are written. Re-run only the cheap assertions: 10 active snack rows, 0 inactive, zero prohibited strings in database, active source and the new production build, and the `is_active` filters still present in `SnackLibrary.tsx` and `HabitLogging.tsx`. Existing rendered snack evidence stays valid because these changes do not touch those surfaces.

## Verification (proportionate only)

- Focused tests: `src/test/fastingDisabled.test.ts`, `src/lib/mealTiming.test.ts`, safe-claims/snack content tests. `mealTiming.test.ts` references `16:8` in a test name and will be updated to match the new labels.
- TypeScript, lint on touched files, production build.
- Scans on the rebuilt bundle and on the database for active fasting-window offerings and for the glucose-spike claim.
- Direct route checks for the affected reachable screens: `/app/today`, `/app/meals`, `/app/cheat-meal`, `/app/fasting`, `/llms.txt` page route.

## Report

Update `docs/BATCH-2-COMPLETION-REPORT.md` with a new final section (no competing new report), separating: snack database correction applied; code changed; client unpublished; functions undeployed; each fasting reference removed / retained as neutral education / proven unreachable; the public glucose claim outcome; remaining items for qualified doctor review; and any BLOCKED or NOT TESTED item.
