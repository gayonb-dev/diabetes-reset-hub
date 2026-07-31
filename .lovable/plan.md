## Part A — Step 0 as a new idempotent migration

Direct edits to applied migration files are blocked by the platform, so Step 0 ships as a new migration instead. No checksum or migration-history mismatch occurred — the file write was refused before any mismatch could arise, and the original file and the live database are untouched.

New migration, verbatim:

```sql
-- Step 0 idempotency fix: the original migration ran its backfill while a
-- guard trigger from a prior run could still be attached, which would silently
-- revert the backfill at pg_trigger_depth() = 1. Re-establish the correct
-- order: drop -> backfill -> re-attach. Safe to re-run.
DROP TRIGGER IF EXISTS guard_win_post_update ON public.win_posts;

UPDATE public.win_posts w
   SET reaction_counts = COALESCE((
     SELECT jsonb_object_agg(cv.reaction_emoji, cv.c)
     FROM (SELECT target_id, reaction_emoji, count(*) AS c
             FROM public.community_votes
            WHERE target_type='answer' AND vote_type='reaction'
              AND reaction_emoji IS NOT NULL
            GROUP BY target_id, reaction_emoji) cv
     WHERE cv.target_id = w.id
   ), '{}'::jsonb);

CREATE TRIGGER guard_win_post_update
  BEFORE UPDATE ON public.win_posts
  FOR EACH ROW EXECUTE FUNCTION public.guard_win_post_update();
```

No function definitions, grants, or policies change.

## Part B — rollback-wrapped verification block

One `DO` block under a real member identity (`set_config('request.jwt.claims', …)` + `set_config('role','authenticated')`), ending in `RAISE EXCEPTION` so every write is undone:

1. Insert a `community_votes` reaction row (`target_type='answer'`, `vote_type='reaction'`, `reaction_emoji='fire'`) against win post `e5133869…`; read back `reaction_counts`, expect `fire` alongside `muscle: 1`.
2. `UPDATE win_posts SET reaction_counts = '{"hacked":999}'` on an own post; expect the guard to revert it.
3. `UPDATE win_posts SET milestone_label = 'edited label ok'`; expect it to persist.
4. `INSERT member_daily_progress` for `current_program_day()` (47) → success; the same for day 48 → `SQLSTATE 42501`. Both branches captured via `EXCEPTION WHEN OTHERS`.

## Already captured (read-only, no approval needed)

```text
[1] win post e5133869-4f90-431d-b2f8-8dbf07c79c66
    reaction_counts = {"muscle": 1}   actual grouped = {"muscle": 1}   matches = t

[5] proacl — no anon/authenticated/PUBLIC execute
 enforce_member_progress_day_unlocked | {postgres=X/postgres,service_role=X/postgres,sandbox_exec=X/postgres}
 guard_win_post_update                | {postgres=X/postgres,service_role=X/postgres,sandbox_exec=X/postgres}
 sync_win_post_reactions              | {postgres=X/postgres,service_role=X/postgres,sandbox_exec=X/postgres}

[5] pg_trigger (tgenabled = O)
 community_votes | trg_cv_counts               | AFTER INSERT OR DELETE ... sync_community_vote_counts()
 community_votes | trg_sync_win_post_reactions | AFTER INSERT OR DELETE ... sync_win_post_reactions()
 win_posts       | guard_win_post_update       | BEFORE UPDATE ... guard_win_post_update()

[ownership / FORCE RLS]
 sync_win_post_reactions | owner=postgres | prosecdef=t
 win_posts               | owner=postgres | relrowsecurity=t | relforcerowsecurity=f
 postgres                | rolbypassrls=t
```

All three ownership values are as expected: the trigger runs `SECURITY DEFINER` as `postgres`, which owns `win_posts`, has `rolbypassrls = t`, and `FORCE RLS` is off — the trigger's `UPDATE` never evaluates a win_posts RLS policy, so authorship cannot affect it. The single-member test is therefore equivalent to a cross-member one.

## Deliverable

Report with the raw `DO` block output, the captured items above, and the file-edit refusal note.
