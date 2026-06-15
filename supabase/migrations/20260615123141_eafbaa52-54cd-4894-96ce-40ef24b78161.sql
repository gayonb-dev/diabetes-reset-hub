
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id uuid, p_amount integer)
 RETURNS TABLE(total_xp integer, level integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  RETURNING public.user_streaks.total_xp INTO v_total;

  v_level := 1 + (v_total / 100);

  UPDATE public.user_streaks SET level = v_level WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_total, v_level;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bump_streak(p_user_id uuid)
 RETURNS TABLE(current_streak integer, longest_streak integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_last DATE;
  v_cur INTEGER;
  v_long INTEGER;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT s.last_active_date, s.current_streak, s.longest_streak
  INTO v_last, v_cur, v_long
  FROM public.user_streaks s WHERE s.user_id = p_user_id;

  IF v_last IS NULL THEN
    v_cur := 1;
  ELSIF v_last = v_today THEN
    RETURN QUERY SELECT v_cur, v_long;
    RETURN;
  ELSIF v_last = v_today - 1 THEN
    v_cur := COALESCE(v_cur, 0) + 1;
  ELSE
    v_cur := 1;
  END IF;

  v_long := GREATEST(COALESCE(v_long, 0), v_cur);

  INSERT INTO public.user_streaks
    (user_id, current_streak, longest_streak, last_active_date)
  VALUES (p_user_id, v_cur, v_long, v_today)
  ON CONFLICT (user_id) DO UPDATE
    SET current_streak = v_cur,
        longest_streak = v_long,
        last_active_date = v_today,
        updated_at = now();

  RETURN QUERY SELECT v_cur, v_long;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_helpful_points(p_user_id uuid, p_amount integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_total int;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_streaks (user_id, helpful_points)
  VALUES (p_user_id, GREATEST(p_amount, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET helpful_points = public.user_streaks.helpful_points + GREATEST(p_amount, 0),
        updated_at = now()
  RETURNING helpful_points INTO v_total;
  RETURN v_total;
END;
$function$;
