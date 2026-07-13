
## Fix the three reviewer findings (revised per your answers)

### 1. `voice-of-the-community` — admin-only, matches badge copy

In `supabase/functions/award-badges/index.ts` `evaluateSlugs()`:

```ts
const { data: myQs } = await admin
  .from("community_questions").select("id").eq("author_id", uid);
const qIds = (myQs ?? []).map(q => q.id);
let voiceCount = 0;
if (qIds.length) {
  const { data: ansRows } = await admin
    .from("community_answers")
    .select("question_id")
    .in("question_id", qIds)
    .eq("is_admin_response", true);
  voiceCount = new Set((ansRows ?? []).map(r => r.question_id)).size;
}
add("voice-of-the-community", voiceCount >= 5);
```

VITA and verified peer answers do NOT count. Strict match to the badge's displayed description.

### 2. Backfill migration for `full-house` and `voice-of-the-community`

New migration `supabase/migrations/<ts>_badge_backfill_extras.sql`:

- **voice-of-the-community**: award to any user whose `community_questions` have ≥ 5 distinct entries answered by an `is_admin_response = true` row.
- **full-house**: mirror the edge function's ring logic exactly (this is the drift risk the reviewer flagged). Per date, the four rings:
  - **water**: `SUM(water_logs.ounces) ≥ GREATEST(64, ROUND(weight_on_that_day / 2))`, where `weight_on_that_day` is the most recent `health_logs.weight` (LATERAL lookup) on or before that date; when no weight is known, target is 64.
  - **meals**: ≥ 3 distinct `meal_type` in `meal_logs` for that date with `vegetables AND protein AND complex_carbs`.
  - **move**: derived from program day (`current_program_day(user_id) - ((now()::date) - date)`): days 15–28 → ≥ 3 distinct `post_meal_walks.slot`; otherwise → ≥ 1 walk OR any `workout_sessions` with `status='completed'` completed_at on that date.
  - **mind**: any `mindset_reads` for that date.
  - Find any 7 consecutive dates where all four rings closed via a windowed CTE (rank consecutive closed dates using `date - row_number * interval '1 day'` grouping trick), award when a group's size ≥ 7.
- `INSERT ... ON CONFLICT (user_id, badge_id) DO NOTHING`. No XP replay. No notifications.
- Mirror any inserted slugs into `visitor_profiles.badges_earned` / `community_badges_earned`.

I will keep the SQL ring rules and the TS ring rules identical (same water floor, same meal predicate, same movement branches, same mindset rule) and cross-diff them before shipping.

### 3. `Ask.tsx` helpful-vote → tighten trust boundary

- `award-badges/index.ts`: accept optional `body.for_answer_id` when caller is a member (not service-role). Server-side:
  1. Fetch the answer row → get `author_id`. If missing, 400.
  2. Verify the caller cast the vote: `select 1 from community_votes where voter_id = <caller uid> and target_id = for_answer_id and target_type = 'answer' and vote_type = 'helpful' limit 1`. If none, 403.
  3. Set `uid = author_id` and evaluate normally.
- `src/pages/app/Ask.tsx`: helpful-vote handler passes `{ for_answer_id: target_id }`.

Caller can only trigger a recheck for an author they've actually voted helpful on; any other value is rejected server-side.

### Files changed

- `supabase/functions/award-badges/index.ts` — add `voice-of-the-community` (admin-only); accept `for_answer_id` with vote-existence check.
- `supabase/migrations/<ts>_badge_backfill_extras.sql` — retroactive `full-house` (matching TS ring logic exactly) and `voice-of-the-community`.
- `src/pages/app/Ask.tsx` — helpful-vote passes `{ for_answer_id: target_id }`.

After deploy + migration approval I'll run the same DB inspection (which users, which slugs, which timestamps) so you can hand the reviewer a diff against 025363d.
