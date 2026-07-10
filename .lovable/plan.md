## Final approved plan

### Item 1 — Consolidate day-completion to `member_daily_progress` + move trigger
Single migration:
- Backfill `member_daily_progress` from `member_progress` joined to `daily_actions` on `day_number` (preserve `completed_at`, `notes`; skip days without a matching action row).
- `DROP TRIGGER … ON public.member_progress`.
- Update `enforce_member_progress_day_unlocked` to reference `NEW.member_id` (the column on `member_daily_progress`) instead of `NEW.user_id`; keep `current_program_day` check and `service_role` bypass.
- Attach trigger to `public.member_daily_progress` (BEFORE INSERT OR UPDATE).
- Leave `member_progress` table in place for rollback safety.

Code:
- `src/pages/app/DayDetail.tsx`: remove hardcoded `DAY_CONTENT`. Fetch `daily_actions` row for `dayN` (`day_number = dayN AND is_extension_day = false`). Render `action_title` / `action_description` / `sub_tasks`. Keep `useProgramDay` lock UI + disabled button. Load existing completion from `member_daily_progress` (by `member_id`, `day_number`). On complete, upsert into `member_daily_progress` with `{ member_id, action_id, day_number, status:'completed', completed_at, notes }` using the existing unique constraint.

### Item 2 — Level source of truth = program day
- `supabase/functions/gamify-action/index.ts`: compute `newLevel` from `public.current_program_day(uid)` via inlined `[0,14,45,90,135,180,270,365,450,540]` thresholds. Ignore `award_xp`'s returned level. Read `visitor_profiles.level` as `priorLevel`; if `newLevel > priorLevel`, fire `level_up` notification then `UPDATE visitor_profiles SET level = newLevel, level_earned_at = now()`.
- Migration: change `public.award_xp` to stop writing `user_streaks.level` (keep column, no-op the update).
- `useGamificationProfile` day-based level sync stays as client backstop.

### Item 3 — Workout session gating
- `src/pages/app/WorkoutSession.tsx`: `useProgramDay()` guard. If `programDay < 29`, `navigate("/app/workouts", { replace: true })` before any `workout_sessions` insert/resume. No duplicated locked panel — `WorkoutLibrary.tsx` already renders it.

### Item 4 — Support actions actually work
- `src/pages/app/Support.tsx`:
  - On invoke failure, read `FunctionsHttpError.context.text()` and surface real error in toast.
  - Always-visible mailto fallback under both primary buttons: `Or email info@diabetesresetmethod.com`.
- Verify `support-request` is deployed via `curl_edge_functions`; redeploy if missing.

### Item 5 — Hide Blog tab when empty
- `src/pages/app/Learn.tsx`: only render Blog `TabsTrigger` + `TabsContent` when `blogPosts.length > 0`. Default tab stays `mindset`. Adding an active `content_items` row with `type='blog'` makes the tab appear automatically.

### Addition A — Unify streak/level read-write paths
- **Streak writer parity:** In `gamify-action`, after `bump_streak` returns `current_streak`, `UPDATE visitor_profiles SET streak_count = <current_streak> WHERE user_id = uid` in the same invocation.
- **Sidebar level reader:** `src/pages/app/AppLayout.tsx` — sidebar level reads `visitor_profiles.level` (day-derived, maintained by Item 2), not `user_streaks.level`. Streak still reads `user_streaks.current_streak` (kept in sync by writer above).

### Addition B — DayDetail missing-action fallback
- `src/pages/app/DayDetail.tsx`: when `daily_actions` fetch for `dayN` returns no row (Day 15+ until admin adds content), render a graceful neutral card:
  - `<Vita posture="neutral" size={96} />` + heading "Today's action is being prepared."
  - Body: "Check back shortly — new days are added regularly."
  - No completion button, no crash.
- Verify `src/pages/app/Dashboard.tsx` action card handles the same missing-row case; add the same neutral fallback there if needed.

### Explicitly NOT redone
Guides tab label, Workouts locked page, 30-second countdown, Mindset completion copy.

### Verification (before/after read-only) — my account
1. `SELECT program_start_date, public.current_program_day(user_id) FROM profiles WHERE user_id = <me>;`
2. `SELECT day_number, status, completed_at FROM member_daily_progress WHERE member_id = <me> ORDER BY day_number;`
3. `SELECT day_number, completed_at FROM member_progress WHERE user_id = <me> ORDER BY day_number;`
4. `SELECT current_streak, longest_streak, last_active_date, total_xp, level FROM user_streaks WHERE user_id = <me>;`
5. `SELECT streak_count, level, level_earned_at FROM visitor_profiles WHERE user_id = <me>;`
6. `SELECT count(*) FROM content_items WHERE type='blog' AND is_active;`
7. `SELECT day_number, action_title FROM daily_actions WHERE is_extension_day=false ORDER BY day_number;`

Preview checks:
- `/app/day/<currentDay+1>` → locked UI; trigger rejects forged inserts.
- Completing today → dashboard + sidebar streak both bump by 1.
- Sidebar level chip and dashboard level badge match `levelFromDay(currentProgramDay)`.
- `/app/workouts/<slug>` before Day 29 → redirects to `/app/workouts` locked view; no session insert.
- Support dialog forced failure → real error text + mailto visible.
- Blog tab absent until a blog `content_items` row exists.
- `/app/day/15` (no action row) → neutral "being prepared" card.

### Report format
Grouped by item (1, 2, 3, 4, 5, A, B): files changed, migration SQL verbatim, before/after results for all 7 queries.