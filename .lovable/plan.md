Diff vs. last approved plan: nothing dropped. Only the migration statement ordering (backfill now runs before the guard trigger exists), the corrected depth comment, and the strengthened backfill verification.

Confirmed: `Ask.tsx:65` hardcodes a four-item `REACTIONS` array and line 379 renders from it (`w.reaction_counts?.[r.key] ?? 0`), so a `{}` value never hides buttons.

Depth note, corrected: `pg_trigger_depth()` returns **1** inside a trigger fired by a direct statement, not 0. So a member's direct UPDATE fires the guard at depth 1 → reverted; the sync trigger's nested UPDATE fires it at depth 2 → passes. The backfill is therefore ordered to run before the guard trigger exists, rather than relying on `auth.role()` being NULL in a migration.

## Part 1 — Security findings (one migration, in this exact order)

### Step 1 — sync function + trigger
```sql
CREATE OR REPLACE FUNCTION public.sync_win_post_reactions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_target uuid;
  v_vote_type text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target := OLD.target_id;  v_vote_type := OLD.vote_type;
  ELSE
    v_target := NEW.target_id;  v_vote_type := NEW.vote_type;
  END IF;

  IF v_vote_type <> 'reaction' THEN RETURN NULL; END IF;

  UPDATE public.win_posts w
     SET reaction_counts = COALESCE((
       SELECT jsonb_object_agg(v.reaction_emoji, v.c)
       FROM (SELECT reaction_emoji, count(*) AS c
               FROM public.community_votes
              WHERE target_id = v_target AND target_type = 'answer'
                AND vote_type = 'reaction' AND reaction_emoji IS NOT NULL
              GROUP BY reaction_emoji) v
     ), '{}'::jsonb)
   WHERE w.id = v_target;

  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.sync_win_post_reactions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_win_post_reactions() TO service_role;
DROP TRIGGER IF EXISTS trg_sync_win_post_reactions ON public.community_votes;
CREATE TRIGGER trg_sync_win_post_reactions
  AFTER INSERT OR DELETE ON public.community_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_win_post_reactions();
```

### Step 2 — one-time backfill (runs while no guard trigger exists on win_posts)
```sql
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
```

### Step 3 — guard function + trigger
```sql
CREATE OR REPLACE FUNCTION public.guard_win_post_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- pg_trigger_depth() = 1 means this UPDATE came directly from a client statement.
  -- The sync trigger's nested UPDATE runs at depth 2 and is intentionally allowed
  -- through, because it recomputes counts from community_votes rather than
  -- accepting caller-supplied values.
  IF pg_trigger_depth() = 1
     AND auth.role() <> 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.reaction_counts  := OLD.reaction_counts;
    NEW.milestone_type   := OLD.milestone_type;
    NEW.stat_improvement := OLD.stat_improvement;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_win_post_update ON public.win_posts;
CREATE TRIGGER guard_win_post_update BEFORE UPDATE ON public.win_posts
  FOR EACH ROW EXECUTE FUNCTION public.guard_win_post_update();
```

### Step 4 — revokes
```sql
REVOKE EXECUTE ON FUNCTION public.guard_win_post_update() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_win_post_update() TO service_role;

REVOKE EXECUTE ON FUNCTION public.enforce_member_progress_day_unlocked() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_member_progress_day_unlocked() TO service_role;
```

### `dexcom_connections` — marked **ignored**
SELECT-only for members with all writes through service-role edge functions is intentional and fail-closed. No write policy added.

### Frontend — `src/pages/app/Ask.tsx`
- Remove the direct `win_posts.update({ reaction_counts })` (line 258).
- Guard changes from "has this emoji" to "has reacted to this post at all", matching `UNIQUE (voter_id, target_type, target_id, vote_type)`.
- Surface the insert's error via toast instead of failing silently; apply optimistic `setMyVotes` / `setWins` only on success.
- `REACTIONS` list and rendering untouched.

### Verification (rollback-wrapped where it writes; real member identity)
1. **Backfill correctness** — pick a specific win post that has `reaction` rows in `community_votes`, then `SELECT w.id, w.reaction_counts` alongside the grouped actual counts for that post; assert non-empty and matching. Paste the row. (Row count alone is not used, since a reverted UPDATE still reports as updated.)
2. React to **another member's** win post → `reaction_counts` increments (proves the depth-2 pass-through).
3. Second reaction with a **different emoji** on the same post → report exactly what happens.
4. Direct `UPDATE win_posts SET reaction_counts` on own post → reverts; `UPDATE milestone_label` → persists.
5. `member_daily_progress`: today's day → success; day + 1 → `42501`. Both reported; if either misbehaves, restore `GRANT EXECUTE ... TO authenticated` on that function only and say so.
6. `proacl` for all three functions and the `pg_trigger` rows.

## Part 2 — Dexcom bytea write bug
- New `supabase/functions/_shared/dexcom-crypto.ts` exporting `hexToBytes`, `bytesToPgHex`, `coerceBytea`, `aesGcmEncrypt`, `aesGcmDecrypt`.
  ```ts
  export const bytesToPgHex = (b: Uint8Array) =>
    "\\x" + [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  ```
- `dexcom-auth/index.ts` — drop inline crypto, import shared, wrap all four encrypted fields (`access_token_enc`, `refresh_token_enc`, `token_iv`, `refresh_iv`) with `bytesToPgHex` in the upsert.
- `dexcom-sync/index.ts` — same import swap; wrap all four fields in the token-refresh write.
- Grep both files for any remaining raw `Uint8Array` bytea write; paste output.
- Graceful decrypt failure in `dexcom-sync`: set `last_sync_status='error'`, `last_sync_error='Your Dexcom connection needs to be reconnected — please disconnect and connect again in Settings.'`, skip that member instead of throwing.
- Verification: round-trip encrypt → write → read → `coerceBytea` → decrypt → assert equal, raw output pasted; then confirm sync `ok` and CGM-tagged rows in `blood_sugar_readings` after your reconnect.

## Not touched
CORS module, `verify_jwt` settings, Dexcom auth flow logic, notification copy, freeze/streak logic, `x-internal-secret` gating.
