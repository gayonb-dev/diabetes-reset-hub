## 1. Program day: server matches client (blocking)

Rewrite `current_program_day(p_user_id)` (migration) to compute today's date in the member's own timezone:

- Read `profiles.timezone`, fall back to `'America/New_York'` (same fallback streak-rollover uses).
- Keep the existing start-date fallback chain (`profiles.program_start_date` → earliest subscription `created_at` → today).
- **Keep the `GREATEST(1, ...)` wrapper**: `GREATEST(1, ((now() AT TIME ZONE tz)::date - start_date) + 1)` so a future or malformed start date can never yield 0 or a negative day.

This is the only change to the function. The day-unlock trigger (`enforce_member_progress_day_unlocked`) inherits it, so client (`useProgramDay`, local midnight) and server agree.

Verification: run the function against a simulated member with `timezone = 'America/Jamaica'` at a UTC instant where the local date differs from the UTC date, and confirm the returned day matches the local date.

## 2 & 3. Meal names: wrap, and swaps stop overwriting

`src/pages/app/Meals.tsx`:
- Remove `truncate` from the meal title and any fixed-height clipping on the row; allow up to two lines (wrapping / `line-clamp-2`) in the collapsed row, the expanded detail, and the alternatives list.
- `handleSwap` no longer rewrites `meal.name`. It stores the substitute on the meal object alongside the original name, and still writes the `meal_swaps` row.
- The row title stays the original meal name; beneath it a muted second line renders `Swapped for: {substitute name}`, with an "Undo swap" affordance so the swap remains reversible.

## 4. Week start becomes a member choice

- Migration: `profiles.week_start_day integer not null default 0` (0 = Sunday, 1 = Monday).
- Data: set `gayonb@gmail.com` to `0`.
- New shared helper `src/lib/weekStart.ts` (ordered weekday keys, week-start date for a given date) plus a small hook to read the preference.
- Onboarding (`src/pages/app/Onboarding.tsx`): new step "Which day does your week start?", Sunday preselected.
- Settings (`src/pages/app/Settings.tsx` → Account): same control.
- Grids audited and updated: Meals week view (`DAY_KEYS` ordering), Cheat Meal day columns (`getDay`-based week math and column order), Habits heatmap (`src/components/progress/HabitsTab.tsx`), plus any other weekday grid found in the audit. Each is listed in the report.

## 5. Shopping list: by category / by meal

In the Meals shopping tab:
- Toggle above the list: **By category** (current behaviour, default) and **By meal**.
- By-meal view groups ingredients under each meal name for the selected week, with a per-meal include/exclude checkbox. Excluded meals drop their ingredients; an ingredient disappears once no included meal needs it.
- Live count line: `{N} ingredients for {M} meals selected.`
- Existing per-item check-off behaviour (and checked-items-to-bottom) works in both views.

## 6. Levels become earned, not elapsed

Level source changes from calendar day to **completed days** = count of distinct dates with a `member_daily_progress` row at `status = 'completed'`.

- `supabase/functions/gamify-action/index.ts`: replace the `current_program_day` call in the level block with the completed-day count; keep thresholds `[0,14,45,90,135,180,270,365,450,540]` and the level names/messages. Persist with `GREATEST(stored, computed)` — never demote.
- `src/hooks/useGamificationProfile.tsx`: may compute the completed-day level solely to raise the stored value via `GREATEST`, but **the value returned for display is always the stored `visitor_profiles.level`** — the freshly computed number is never rendered. So a member who is Level 3 by calendar with fewer completed days keeps showing Level 3.
- Every UI level display (Profile hero, `LevelBadge`, level-up overlay) reads the stored value.
- Report will state the account's stored level and computed level after the change.
- `current_program_day` stays calendar-based apart from item 1.

## 7. Catch-up section on Today

`src/pages/app/Dashboard.tsx`: below Today's action, a "Catch up" section listing the three most recent days before the current program day with no completed `member_daily_progress` row — each a tappable row (day number + action title) linking to that day's detail. One muted line above: "You can pick these up anytime — nothing expires." Hidden entirely when there are none. `program_start_date` is never touched.

## 8. Premium pass on remaining tabs

Apply the existing dashboard system — `font-heading` on page/section headings, card treatment (`rounded-xl`, `shadow-warm`, consistent border), 16px section spacing, `.stat-value`/tabular numerals on prominent numbers (streak counts, badge totals) — to: Meals, Learn, Profile, Settings, Support, Workouts (library + session + complete). Browse-oriented lists stay at body scale; no hero-scale numerics there. **Fasting is excluded.** Report notes per-screen changes.

## Technical notes

- Two migrations: the `current_program_day` rewrite (with `GREATEST(1, ...)` preserved), and `profiles.week_start_day`; the `gayonb@gmail.com` value set via a data write.
- Regenerated backend types needed before the client reads `week_start_day`.
- No changes to notification copy, freeze logic, or `x-internal-secret` gating.
