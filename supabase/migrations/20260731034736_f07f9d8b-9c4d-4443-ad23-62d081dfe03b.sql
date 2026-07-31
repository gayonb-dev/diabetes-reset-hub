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