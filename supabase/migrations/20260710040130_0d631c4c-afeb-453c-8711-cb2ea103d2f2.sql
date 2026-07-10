-- 1) Backfill member_daily_progress from member_progress
INSERT INTO public.member_daily_progress (member_id, day_number, action_id, status, completed_at, notes)
SELECT mp.user_id, mp.day_number, da.id, 'completed', mp.completed_at, mp.notes
FROM public.member_progress mp
JOIN public.daily_actions da ON da.day_number = mp.day_number AND da.is_extension_day = false
ON CONFLICT (member_id, action_id) DO NOTHING;

-- 2) Drop old trigger on member_progress
DROP TRIGGER IF EXISTS enforce_member_progress_day_unlocked_trigger ON public.member_progress;
DROP TRIGGER IF EXISTS enforce_day_unlocked ON public.member_progress;

-- 3) Rewrite guard function to use NEW.member_id
CREATE OR REPLACE FUNCTION public.enforce_member_progress_day_unlocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_day int;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  v_day := public.current_program_day(NEW.member_id);
  IF NEW.day_number > v_day THEN
    RAISE EXCEPTION 'Day % has not unlocked yet (currently on day %).', NEW.day_number, v_day
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

-- 4) Attach guard to member_daily_progress
DROP TRIGGER IF EXISTS enforce_day_unlocked ON public.member_daily_progress;
CREATE TRIGGER enforce_day_unlocked
BEFORE INSERT OR UPDATE ON public.member_daily_progress
FOR EACH ROW EXECUTE FUNCTION public.enforce_member_progress_day_unlocked();

-- 5) award_xp no longer writes user_streaks.level (level is now day-derived).
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id uuid, p_amount integer)
RETURNS TABLE(total_xp integer, level integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_total INTEGER;
  v_level INTEGER;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_streaks (user_id, total_xp, level)
  VALUES (p_user_id, GREATEST(p_amount, 0), 1)
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = public.user_streaks.total_xp + GREATEST(p_amount, 0),
        updated_at = now()
  RETURNING public.user_streaks.total_xp, public.user_streaks.level INTO v_total, v_level;

  RETURN QUERY SELECT v_total, v_level;
END;
$function$;