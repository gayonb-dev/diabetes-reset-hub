## Session 2 — Fasting tab, Learn guide, copy audit

### 6. Fasting tab rebuild (`src/pages/app/Fasting.tsx`)

Replace the free-form "choose a window and press Begin fast" entry (the `windowChoice` buttons and manual window picker) with a schedule-driven view derived entirely from `mealTiming.ts` and the member's profile.

New structure, top to bottom:
1. **Current window + ramp status** — "You're on 12:12 today. Your 14:10 target starts in 4 days." Derived from `effectiveTarget` vs `storedTarget` and `fasting_started_on` (standard 1-week ramp; 2+2-week gradual ramp for confirmed `needs_doctor`).
2. **Horizontal timeline** — new `src/components/fasting/FastingTimeline.tsx`: a single bar showing the eating window filled and the fast muted, with meal and snack markers positioned from `scheduleForProfile()`, plus a "now" indicator. Scales down on mobile with labels below markers.
3. **Countdown** — new `src/components/fasting/WindowCountdown.tsx`: counts down to the next window open or close, labelled "Eating window opens in" / "Fasting begins in", at the existing `countdown-hero` scale. Non-fasting members (target 0) see no countdown.
4. **Target card** — existing `FastingTargetCard`, with the "what changes and when" line made explicit.
5. **Low-blood-sugar card** — permanently accessible here (already `dismissible={false}`), plus the one-time dismissible activation card.
6. **Recent fasts history + IF rules** — kept as-is; `if_fasting_log` writes remain available from the history card but no longer drive the tab.

`not_eligible` members keep the respectful explanation and see no timeline, countdown, or target card. `unscreened` members keep the inline screening.

### 7. New Learn guide (`src/data/learnGuides.ts`)

Add `fasting-and-meal-timing` — "Fasting and meal timing", six short sections at 6th–8th grade level: why *when* you eat matters; why earlier windows suit type 2 diabetes; why we start at twelve hours; when a snack helps and when it doesn't (wording from the `mealTiming.ts` copy constants); the medication warning and the doctor's role; and what the research shows — including the required verbatim ADA Standards of Care paragraph. Sources cited by name only, no titles, DOIs, or URLs. The existing `intermittent-fasting` entry points at the new guide rather than duplicating it.

### 8. Copy audit

| Location | Now | After |
|---|---|---|
| `generate-meal-plan/index.ts` L137–141 | "Snack 1 is eaten 2.5–3 hours after breakfast" etc. | 3–4 hours after a main meal; snacks only where a gap exceeds 5 hours |
| `generate-meal-plan/index.ts` L283–291 (IF block + fixed "10:00am → 12:30pm → …" example) | hardcoded clock times | times injected from the member's computed schedule; fixed example removed |
| `HabitLogging.tsx` snack slot labels | hardcoded "Mid-morning" / "Afternoon" | derived from the schedule's snack items |
| `Fasting.tsx` "Today's eating schedule" | engine-driven | folded into the new timeline |
| `SnackLibrary.tsx`, `learnGuides.ts` | updated in session 1 | re-verified |
| Seeded `daily_actions`, `snack_library` | updated in session 1 | re-verified by query; any stragglers fixed in a migration |

Final greps for `2.5`, `3 hrs`, `3 hours`, `snack`, and fixed clock times across `src/`, `supabase/functions/`, and seeded content, each hit reported as engine-derived or intentionally static.

### 9. Addition — stale-plan notice on Meals

Stored `meal_plans.plan_data` from before this change still carries the old 2.5–3 hour snack text, so a member's current plan would contradict the new guidance until they regenerate.

- Stamp newly generated plans with a timing version (`plan_data.timing_version = 2`, written by `generate-meal-plan`).
- On the Meals tab, when the active plan lacks that marker — or its snack description text matches the old-timing pattern — render one muted line above the plan: *"Your plan was built with our previous snack timing. Regenerate in Settings to match your current schedule."*
- No auto-regeneration, no background write. The member's monthly regeneration allowance is untouched unless they act.

### 10. Addition — effective-target semantics server-side

`generate-meal-plan` must not read `fasting_target` directly: a `not_eligible` or `unscreened` member with a stale stored target would otherwise get a fasting plan.

- Extract the pure gate + ramp logic (`canFast`, `effectiveTarget`, `eatingHoursForTarget`) into a **single shared source file**, `supabase/functions/_shared/fastingTarget.ts`, written as dependency-free TypeScript.
- `src/lib/mealTiming.ts` re-exports those three functions from that shared file (Vite resolves the relative path fine), so there is exactly one implementation compiled into both the client bundle and the Deno function — no port, no copy to drift.
- `generate-meal-plan` fetches the profile's `fasting_eligibility`, `doctor_confirmed_at`, `fasting_target`, `fasting_started_on`, `window_start_hour`, `bedtime_hour`, computes `effectiveTarget`, and only then chooses the fasting vs. three-meal prompt and fills `{{WINDOW_HOURS}}` / `{{FAST_HOURS}}`.
- **Consistency guarantee, stated in the report:** identical module, not a copy. Backed by the existing `mealTiming.test.ts` suite (which will now be exercising the shared file) plus new cases asserting `not_eligible`, `unscreened`, and unconfirmed `needs_doctor` all resolve to target 0 / a 12-hour three-meal window regardless of stored `fasting_target`.
- Fallback if the shared-path import proves awkward for the Deno bundler: keep the shared file and have the client import it, and add a test that fails if the two files ever diverge. The report will state which arrangement shipped.

### Technical notes
- No schema changes; session 1's profile columns are sufficient.
- The schedule math in `mealTiming.ts` is unchanged, so the existing 9 tests stay green; new tests cover the ramp description and the eligibility-gate cases above.
