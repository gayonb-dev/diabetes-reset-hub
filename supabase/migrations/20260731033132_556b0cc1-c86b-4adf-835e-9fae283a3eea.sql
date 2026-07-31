-- Step 1: server-side reaction counting
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

-- Step 2: one-time backfill (runs while no guard trigger exists on win_posts)
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

-- Step 3: column-forgery guard on win_posts
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

-- Step 4: revokes
REVOKE EXECUTE ON FUNCTION public.guard_win_post_update() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_win_post_update() TO service_role;

REVOKE EXECUTE ON FUNCTION public.enforce_member_progress_day_unlocked() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_member_progress_day_unlocked() TO service_role;