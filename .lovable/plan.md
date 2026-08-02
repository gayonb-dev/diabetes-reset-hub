
# Session 1 — Safety screening, timing engine, conditional snacks (revised)

## 1. Database migration

Add to `profiles`:
- `medication_class` text — `insulin` | `sulfonylurea` | `glinide` | `none` | `unsure`
- `fasting_eligibility` text default `'unscreened'` — `eligible` | `needs_doctor` | `not_eligible` | `unscreened`
- `doctor_confirmed_at` timestamptz (set only when the member ticks the doctor checkbox)
- `fasting_exclusions` jsonb default `'{}'` — `{type1, pregnant_or_nursing, disordered_eating}`
- `bedtime_hour` int default 22
- `fasting_target` int default 0 (0 none, 1 = 12:12, 2 = 14:10, 3 = 16:8)
- `fasting_started_on` date
- `window_start_hour` int default 8
- `low_bs_card_seen_at` timestamptz

No new tables, so no new grants; existing `profiles` self read/write policies cover these columns.

Data update (separate insert-tool call): rewrite snack-window copy in seeded `daily_actions`. Verified affected rows: **days 12, 23, 53, 67** (day 23 is the one named in the brief; the others carry the same 2.5–3 hr rule and would fail the grep check). New rule text: "Snacks work best 3–4 hours after a main meal, and are mainly for bridging gaps longer than 5 hours."

## 2. Safety screening (built first — everything gates on it)

New shared component `src/components/safety/FastingScreening.tsx`, rendered as an onboarding step (`src/pages/app/Onboarding.tsx`), as a Settings section (`src/pages/app/Settings.tsx`), **and inline on the Fasting tab for any member whose eligibility is `unscreened`** — existing members all default to unscreened, so the Fasting tab shows them the screening itself rather than a dead-end lock.

- Medication question with the five options and the educational paragraph above it, plus the "I'm not sure" explainer beneath.
- Separate yes/no questions: type 1 diabetes, pregnancy or breastfeeding, history of disordered eating.
- Derivation: any exclusion → `not_eligible` (no override, respectful explanation copy). Otherwise insulin / sulfonylurea / glinide / unsure → `needs_doctor` with the doctor-conversation copy and an "I've discussed fasting with my doctor" checkbox that sets `doctor_confirmed_at`. Otherwise `eligible`.
- All screening copy written into the screens verbatim as specified.
- Hard rule: no screen, string, or computation anywhere mentions or derives a medication dose change.

New hook `src/hooks/useFastingProfile.ts` exposes eligibility, target, window, bedtime, and derived `canFast`. **`canFast` is false for `unscreened`, `not_eligible`, and `needs_doctor` without `doctor_confirmed_at`** — only `eligible`, or `needs_doctor` with the confirmation, returns true. Eligibility is evaluated before target in every consumer.

## 3. Meal-timing engine

New `src/lib/mealTiming.ts` — pure, unit-testable, single source of truth:

```
buildSchedule({ windowStartHour, windowHours, bedtimeHour }) -> ScheduleItem[]
effectiveTarget(profile, today) -> 0 | 1 | 2 | 3
```
Rules: meals spaced 4–5 h apart inside the eating window; meal count derived so spacing stays in range; a snack inserted only when a gap between consecutive meals exceeds 5 h, at that gap's midpoint; the last meal pulled earlier so it ends ≥3 h before bedtime; non-fasting members default to a 12-hour window with three meals.

`effectiveTarget` returns 0 whenever eligibility disallows fasting, regardless of the stored `fasting_target` — eligibility overrides target, never the reverse.

Consumers read from the engine instead of local constants: `src/pages/app/Fasting.tsx` (replacing the hardcoded 0 / 2.5 / 4 / 6.5 offsets), `src/components/today/HabitLogging.tsx`, and the Meals schedule display.

## 4. Target selection with ramp

New `src/components/fasting/FastingTargetCard.tsx`, surfaced at Day 21 on the Dashboard and always available in Settings for members who pass eligibility.

- Three options with plain descriptions, preceded by the "a longer fast isn't automatically better" copy.
- Ramp in `mealTiming.ts`: standard — week one always 12:12, chosen target from day 8. `needs_doctor` + confirmed — 12:12 for 2 weeks → 14:10 for 2 weeks → target.
- Selection screen carries the "we start everyone at twelve hours" explanation verbatim.
- Change target or stop at any time, no penalty; stopping sets `fasting_target = 0`.
- `window_start_hour` adjustable 6am–11am, duration fixed by target; later than 9am shows the "eating earlier tends to work better" line.

## 5. Conditional snacks + one-time low-blood-sugar card

- `src/components/today/HabitLogging.tsx`: snack rows render only when today's schedule contains snacks; otherwise the single muted "meals are spaced closely enough" line. Snack Library stays fully accessible.
- Snack copy replaced with the 3–4 hr / >5 hr gap wording in `HabitLogging.tsx` and `src/components/meals/SnackLibrary.tsx`.
- New `src/components/fasting/LowBloodSugarCard.tsx` with the verbatim warning text — shown once on first window activation (guarded by `low_bs_card_seen_at`), dismissible, thereafter reachable from the Fasting tab.

## Verification

Vitest (`src/lib/mealTiming.test.ts`):
- 16:8 → three meals at 4-hour spacing, zero snacks.
- Non-fasting 12 h → three meals, snack only where a gap exceeds 5 h.
- Bedtime buffer respected.
- **A `not_eligible` profile produces no fasting window for every `fasting_target` value 0–3, including the case where a target was set before an exclusion was later reported.**
- An `unscreened` profile yields `canFast === false`.

Playwright at 390px: insulin answer blocks Fasting until the doctor checkbox; type 1 answer blocks it permanently with no checkbox; an unscreened member landing on Fasting sees the screening; low-blood-sugar card appears exactly once. Final `rg` over `src/` and the database confirms no remaining 2.5–3 hour snack copy.

## Files to change

- migration + data update (seeded `daily_actions` days 12, 23, 53, 67)
- `src/lib/mealTiming.ts`, `src/lib/mealTiming.test.ts` (new)
- `src/hooks/useFastingProfile.ts` (new)
- `src/components/safety/FastingScreening.tsx` (new)
- `src/components/fasting/FastingTargetCard.tsx`, `src/components/fasting/LowBloodSugarCard.tsx` (new)
- `src/pages/app/Onboarding.tsx`, `src/pages/app/Settings.tsx`, `src/pages/app/Fasting.tsx`, `src/pages/app/Dashboard.tsx`, `src/pages/app/AppLayout.tsx`
- `src/components/today/HabitLogging.tsx`, `src/components/meals/SnackLibrary.tsx`
