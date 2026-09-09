# Final Fasting and Public-Claim Reconciliation

Narrow safety correction on the current post-snack-gate code state. No publish, no function deploy, no snack-row writes, no emails, payments or external AI calls.

## Preflight: authoritative state (re-verified directly, not carried over)

- Audited commit: `cb76ef0480ca572a843ee74ecb5f280d2e5e1183`, working tree clean. This is later than the snack-gate commit `23bc769...` because of the intervening landing/mobile and build-script work; it is the current post-snack-gate state serving the preview.
- Backend project: `wqennhjdojjqmmqzjhti`, shared by preview and published client.
- Database content changed previously: YES (approved snack SQL applied to the shared production backend). Client published: NO. Published client build replaced: NO. Functions deployed: NO.

Corrections to the earlier inventory, from re-reading the authoritative files:

- `src/components/fasting/`, `src/components/safety/FastingScreening.tsx` and `src/components/settings/FastingSettingsSection.tsx` do not exist. There is no screening questionnaire, no settings fasting section, no start/extend/complete control anywhere in the client.
- Real operational finding missed earlier: `supabase/functions/award-badges/index.ts` still **rewards fasting**. Line 83 awards `night-faster` from a completed `if_fasting_log` row, and lines 124-126 award `cheat-and-fast` from a cheat meal plus a completed fast. Both badges are `is_retired = true` in the database and `BadgeGallery` filters retired badges out, but the function still writes `user_badges` rows. One row of each already exists.
- `src/pages/app/CheatMeal.tsx` cannot start a fast: the only write is `cheat_meals.insert({... fast_start_at: null })` at line 85-91, there is no `if_fasting_log` write anywhere in the client, and no control sets `fast_start_at`. The only fasting artefact is the "Fast started" chip at line 224.
- `src/pages/app/Settings.tsx:405` reads `if_fasting_log` for the data-rights CSV export only. That is history export, not operational, and stays.
- Window labels `12:12 / 14:10 / 16:8` exist only in `TARGET_LABEL` in `supabase/functions/_shared/fastingTarget.ts` (plus comments there and in `src/lib/mealTiming.ts`, a test name, and the detection regex in `supabase/functions/_shared/medicalSafety.ts:47`). They reach `dist/assets/Dashboard-*.js` through the `src/lib/mealTiming.ts` re-export.
- Gate behavior confirmed in source: `canFast()` returns false unconditionally while `FASTING_SCHEDULING_ENABLED` is false, so `effectiveTarget()` is 0 and `getFastingWindow()` is null for every profile. Client consumers: `src/hooks/useFastingProfile.ts` (read-only profile select) and `src/components/today/HabitLogging.tsx` (neutral meal-slot times only). Server consumer: `supabase/functions/generate-meal-plan/index.ts`, which gates `isIfMode` on the same flag.
- Database-managed content is clean: zero `daily_actions` and zero `content_items` rows matching "fast"; all 49 `meal_plans` rows are `plan_type = 'standard'`; `if_fasting_log` holds 2 rows, both `status = 'completed'`, none active or broken.
- `src/pages/app/Fasting.tsx` is already education only, ADA/NIDDK sourced, no timer, no screening, no write.
- Public claim: `src/pages/LLMInfo.tsx` "Why It Works" section, lines 82-86, carries outcome and comparative claims, not only line 84.

## Changes to make

### A. Remove every remaining operational fasting path

- `supabase/functions/award-badges/index.ts`: stop awarding `night-faster` and `cheat-and-fast`. Remove both `add(...)` calls and the `if_fasting_log` reads that feed them, with a comment recording that DRM does not reward fasting. Existing awarded rows are left untouched. Source change only, not deployed in this task.
- `supabase/functions/_shared/fastingTarget.ts`: remove the member-facing window strings from `TARGET_LABEL` so no fasting window label can be rendered or bundled. Keep the type shape and the always-false gate as inert compatibility, with a comment stating DRM does not prescribe, schedule or operationalize fasting and why the shape remains. Update the ramp-schedule comments.
- `src/lib/mealTiming.ts`: update the ramp comment and mark `rampStatus` as unreachable compatibility code; keep `medicalSafety.ts` untouched (safety detection).
- `src/hooks/useFastingProfile.ts`: keep read-only, add the same unreachable-compatibility comment. No writes exist today and none are added.
- `src/pages/app/Meals.tsx:716`: the `intermittent_fasting` slot branch is dead (no such rows). Always use the standard slot layout so no meal-slot layout can operationalize fasting.
- `src/pages/app/CheatMeal.tsx`: remove the "Fast started" chip. No write change needed; the no-`if_fasting_log`-write property is asserted by a new test rather than assumed.
- No schema change, no member-row deletion, no calorie target, goal weight or other restrictive-eating replacement.

### B. Public-claim correction on the whole LLMInfo page

Rewrite the "Why It Works" block as a description of what the software contains, removing:

- the causal glucose-spike and inflammation claim;
- the gut-health / insulin-sensitivity / hunger-hormone causal chain;
- the comparative "faster than long, abstract programs" claim.

Replacement copy describes real features (plate-method meal planning tools, daily 10-minute actions, tracking and progress report), claims no glucose, A1C, weight or medication outcome, and matches the surrounding grammar. The section heading changes to a non-causal one such as "What the Membership Includes". Then scan `public/llms.txt`, `index.html` metadata, JSON-LD, built bundles and database-managed public content for materially equivalent claims and report exact hits, correcting only DRM claims and leaving properly sourced educational lessons alone.

### C. Snack gate preservation

No snack rows written. Re-run only the cheap assertions: 10 active snack rows, 0 inactive, zero prohibited strings in database, active source and the rebuilt bundle, and the `is_active` filters still present in `SnackLibrary.tsx` and `HabitLogging.tsx`. Existing rendered snack evidence stays valid; these changes do not touch those surfaces.

## Verification

Behavioral tests (new, in `src/test/`):

- `canFast()` false, `effectiveTarget()` 0, `getFastingWindow()` null for eligible, doctor-confirmed, not-eligible, unscreened and malformed profiles.
- `scheduleForProfile()` returns the standard 12-hour layout for the strongest formerly enabling profile.
- No client module writes `if_fasting_log` or sets `fast_start_at` to a non-null value: assert against the Cheat Meal path and the whole `src/` tree.
- `award-badges` no longer references `if_fasting_log`.
- No fasting window label remains in `TARGET_LABEL` or the built bundle.

Route proof with a synthetic member carrying eligible status, doctor-confirmation timestamp, nonzero target and prior fasting history: directly open `/app/fasting`, `/app/today`, `/app/meals`, `/app/cheat-meal`, `/app/settings`, capture the DOM, and prove no selector, countdown, target, start button or fasting encouragement appears and that ordinary Cheat Meal and meal-plan actions create no `if_fasting_log` row. The synthetic profile is created and removed by the harness; the two real historical rows are read as aggregate counts only and never modified.

Gates: focused fasting and public-information tests, snack assertions, TypeScript, lint on touched files, production build, `deno check` plus Deno tests for the changed shared module and its Edge Function consumers (`generate-meal-plan`, `award-badges`), and source / database / bundle scans for fasting-window offerings and the glucose-claim wording.

Every remaining fasting match is classified as safety detection, neutral education, historical compatibility or prohibited operational behavior. Any unexplained or operational match is a FAIL.

## Report

Update `docs/BATCH-2-COMPLETION-REPORT.md` with one final section, no competing report, stating separately: snack database correction applied; this task's database writes (expected: none); client code changed; client unpublished; function source changed; functions undeployed; exact final commit SHA and build identity; each fasting reference removed, retained as neutral education, or proven unreachable with evidence; the public-claim outcome; and every remaining BLOCKED or NOT TESTED item for doctor review.
