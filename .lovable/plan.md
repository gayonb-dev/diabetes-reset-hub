## 1. Badge award engine + backfill

**New edge function `award-badges`** (`supabase/functions/award-badges/index.ts`):

**Identity resolution (adjustment 1):**
- If `Authorization: Bearer <SERVICE_ROLE_KEY>` (or `apikey` == service role) → trusted caller, use `body.user_id`.
- Otherwise → derive `uid` from the caller's JWT via `auth.getUser()`. `body.user_id` is ignored on this path.

**Behavior:** evaluates every criterion, diffs against `user_badges`, inserts the delta, mirrors slugs into `visitor_profiles.badges_earned` / `.community_badges_earned`, awards `badges.xp_reward` via `award_xp`, and inserts a `template_key='badge_unlocked'` notification per new badge. `body.notify=false` suppresses notifications (used by the backfill).

**Program criteria:**
- `first-drop` — any `blood_sugar_readings`
- `full-plate` — any `meal_logs` with `vegetables && protein && complex_carbs`
- `hydrated` — any `water_logs` day summing ≥ 64 oz
- `week-one-warrior` / `freeze-earned` / `thirty-day-streak` — streak ≥ 7 / 14 / 30
- `14-day-foundation` / `90-day-warrior` / `full-6-months` — program day ≥ 15 / 90 / 180
- `a1c-entry`, `move-it` (`workout_sessions.status='completed'`), `night-faster` (`if_fasting_log.status='completed'`)
- `cheat-and-fast` — any `cheat_meals` AND any completed fast
- `month-1-complete` — any `member_measurements` AND program day ≥ 30
- `dropping` / `pre-diabetic-zone` / `normal-zone` — `a1c_logs`: first→last drop ≥ 0.5 / latest < 6.5 / latest < 5.7
- `weight-milestone` — earliest `health_logs.weight` minus any later weight ≥ 5 lb
- **`full-house` (adjustment: 7 consecutive days, all 4 rings — matches the badge description):**
  For each `log_date`, a day is "closed" only if **all four** are true:
    1. **Water** — SUM(`water_logs.ounces`) on that date ≥ round(profile weight lb / 2), with a floor of 64 oz when weight unknown. Weight source: latest `health_logs.weight` at or before that date.
    2. **Meals** — 3 `meal_logs` rows on that date (one per `meal_type`), each with all three components true.
    3. **Movement (phase-aware)** — for program day 15–28 on that date: 3 `post_meal_walks` rows covering `after_breakfast`, `after_lunch`, `after_dinner`. For program day ≥ 29: at least one `post_meal_walks` row OR a `workout_sessions` completed on that date. For program day ≤ 14: at least one `post_meal_walks` row OR a completed workout (any movement counts pre-walking phase).
    4. **Mindset** — a `mindset_reads` row on that date.
  Award when there exists any window of **7 consecutive dates** all satisfying the above. Backfill uses the same rule; sparse historical water is acceptable and awards conservatively — going forward, `award-badges` (called after every relevant mutation) will pick up qualifying weeks the moment they close.

**Community criteria:**
- `first-question` — any `community_questions` by user
- `helper` — any own `community_answers` with `helpful_count > 0`
- `voice-of-the-community` — ≥ 10 such answers
- `win-sharer` — any `win_posts`
- `featured` — any of user's questions with `is_question_of_day = true`
- `day-90/180/270-wisdom` — program day thresholds

**Client/edge call sites** (all JWT-derived unless service-role):
- `supabase/functions/gamify-action/index.ts` — after streak/XP, service-role POST with `body.user_id = uid`.
- `supabase/functions/select-question-of-day/index.ts` — after pinning QotD, service-role POST for that question's `author_id`.
- `src/pages/app/Ask.tsx` — after question insert, win insert, and helpful-vote insert: `supabase.functions.invoke('award-badges', { body: {} })` (identity from JWT).
- `src/pages/app/DayDetail.tsx` — the existing `recordAction('daily_action')` already routes through `gamify-action`, which now chains to `award-badges` — no extra client call needed.

**Backfill migration** (`supabase/migrations/<ts>_backfill_badges.sql`): per-user SQL CTEs evaluate every criterion above (including the 7-day full-house window over `generate_series` of the user's log dates), `INSERT ... ON CONFLICT DO NOTHING` into `user_badges`, and update `visitor_profiles.badges_earned` / `.community_badges_earned` with the union. No `notifications` rows and no XP replay.

## 2. Sub-tasks become real

`src/pages/app/DayDetail.tsx`:
- Fetch `sub_tasks_completed` alongside `status`/`notes`. Sub-tasks are string arrays; each string is the stable key.
- Render each sub-task as a full-width tappable row (min-h-11) with a shadcn `Checkbox`. Toggle optimistically updates local state and upserts `member_daily_progress` (`member_id,action_id`) with `sub_tasks_completed` and `status='in_progress'` (unless already `completed`).
- When every sub-task is checked, auto-invoke the existing `handleComplete()`.
- `handleComplete` also writes `sub_tasks_completed = action.sub_tasks` so the Dashboard counter can never disagree with the completed state.
- After every save, dispatch `window.dispatchEvent(new CustomEvent('drm:habits-changed'))`.

`src/pages/app/Dashboard.tsx`: add `useEffect` listening to `drm:habits-changed` and `window` focus that refetches today's `member_daily_progress`.

## 3. CSV-first export (adjustment 2 applied)

`src/pages/app/Settings.tsx` — `jszip` already installed:
- Primary button `Export my data (CSV)` produces a zip containing:
  - `readings.csv` (`blood_sugar_readings`)
  - `weights.csv` (`health_logs` filtered `weight IS NOT NULL`) — new dataset
  - `a1c.csv` (`a1c_logs`) — new dataset
  - `measurements.csv` (`member_measurements`)
  - `meals.csv` (`meal_logs`)
  - `fasts.csv` (`if_fasting_log`)
  - `actions_completed.csv` (`member_daily_progress` joined with `daily_actions.action_title`)
- Human column headers throughout; downloads as `drm-export-<YYYY-MM-DD>.zip`.
- Secondary text link `Developer format (JSON)` retains the existing single-JSON export.

## 4. Phone helper text

Under every phone `<Input>`:
`<p className="text-xs text-tertiary-fg mt-1">Optional — used only for WhatsApp accountability messages if you opt in. Never for calls or marketing.</p>`
- `src/pages/IntakeForm.tsx` (Phone input, step 0)
- `src/pages/app/CoachingWaitlist.tsx` (WhatsApp number)
- `src/pages/app/Settings.tsx` (WhatsApp Number input)

## 5. Merge Get Support entry points

`src/pages/app/Support.tsx`:
- Delete the separate Billing card.
- Update the `Something not working right?` card body to `"Report bugs, crashes, billing questions, or anything behaving unexpectedly."` The support dialog already has `Billing` in its category dropdown.

## 6. Verify blog rendering

`src/pages/app/Learn.tsx` Blog tab already loads `content_items` where `type='blog'` and renders title, summary, source, and external link (new tab). No code change. Playwright screenshot included in the completion report.

## Files changed
- **new** `supabase/functions/award-badges/index.ts`
- **new** `supabase/migrations/<ts>_backfill_badges.sql`
- edited `supabase/functions/gamify-action/index.ts`
- edited `supabase/functions/select-question-of-day/index.ts`
- edited `src/pages/app/Ask.tsx`
- edited `src/pages/app/DayDetail.tsx`
- edited `src/pages/app/Dashboard.tsx`
- edited `src/pages/app/Settings.tsx`
- edited `src/pages/IntakeForm.tsx`
- edited `src/pages/app/CoachingWaitlist.tsx`
- edited `src/pages/app/Support.tsx`
- `package.json` (`jszip` — already installed)
