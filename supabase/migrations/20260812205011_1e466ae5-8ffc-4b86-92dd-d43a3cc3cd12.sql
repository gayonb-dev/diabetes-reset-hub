-- Prompt 4 §12.2 — PREPARED, NOT APPLIED TO PRODUCTION.
-- Close the win_posts insert path that lets a member submit forged
-- reaction_counts / milestone_type / stat_improvement values. The existing
-- BEFORE UPDATE guard already handles updates; this adds the insert side.
--
-- Apply only at publication, together with 01_profiles_column_grants.sql.
-- Reversible: see the rollback block at the bottom.

BEGIN;

CREATE OR REPLACE FUNCTION public.guard_win_post_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    -- Counts are derived from community_votes by the sync trigger, never supplied.
    NEW.reaction_counts  := '{}'::jsonb;
    NEW.milestone_type   := NULL;
    NEW.stat_improvement := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_win_post_insert ON public.win_posts;
CREATE TRIGGER guard_win_post_insert
  BEFORE INSERT ON public.win_posts
  FOR EACH ROW EXECUTE FUNCTION public.guard_win_post_insert();

REVOKE EXECUTE ON FUNCTION public.guard_win_post_insert() FROM PUBLIC, anon, authenticated;

COMMIT;

-- ROLLBACK:
-- BEGIN;
--   DROP TRIGGER IF EXISTS guard_win_post_insert ON public.win_posts;
--   DROP FUNCTION IF EXISTS public.guard_win_post_insert();
-- COMMIT;
