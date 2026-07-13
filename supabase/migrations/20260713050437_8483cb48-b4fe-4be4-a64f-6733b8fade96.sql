
DO $$
DECLARE
  u RECORD;
  prog_day int;
  streak_val int;
  slugs text[];
  new_prog jsonb;
  new_comm jsonb;
  a_first numeric;
  a_last  numeric;
BEGIN
  FOR u IN SELECT id FROM auth.users LOOP
    slugs := ARRAY[]::text[];
    prog_day := public.current_program_day(u.id);

    SELECT GREATEST(COALESCE(current_streak,0), COALESCE(longest_streak,0))
      INTO streak_val FROM public.user_streaks WHERE user_id = u.id;
    streak_val := COALESCE(streak_val, 0);

    IF prog_day >= 15  THEN slugs := array_append(slugs, '14-day-foundation'); END IF;
    IF prog_day >= 90  THEN slugs := array_append(slugs, '90-day-warrior'); slugs := array_append(slugs, 'day-90-wisdom'); END IF;
    IF prog_day >= 180 THEN slugs := array_append(slugs, 'full-6-months'); slugs := array_append(slugs, 'day-180-wisdom'); END IF;
    IF prog_day >= 270 THEN slugs := array_append(slugs, 'day-270-wisdom'); END IF;

    IF streak_val >= 7  THEN slugs := array_append(slugs, 'week-one-warrior'); END IF;
    IF streak_val >= 14 THEN slugs := array_append(slugs, 'freeze-earned'); END IF;
    IF streak_val >= 30 THEN slugs := array_append(slugs, 'thirty-day-streak'); END IF;

    IF EXISTS (SELECT 1 FROM public.blood_sugar_readings WHERE member_id = u.id) THEN
      slugs := array_append(slugs, 'first-drop'); END IF;
    IF EXISTS (SELECT 1 FROM public.a1c_logs WHERE member_id = u.id) THEN
      slugs := array_append(slugs, 'a1c-entry'); END IF;
    IF EXISTS (SELECT 1 FROM public.workout_sessions WHERE user_id = u.id AND status = 'completed') THEN
      slugs := array_append(slugs, 'move-it'); END IF;
    IF EXISTS (SELECT 1 FROM public.if_fasting_log WHERE member_id = u.id AND status = 'completed') THEN
      slugs := array_append(slugs, 'night-faster'); END IF;
    IF EXISTS (SELECT 1 FROM public.win_posts WHERE author_id = u.id) THEN
      slugs := array_append(slugs, 'win-sharer'); END IF;
    IF EXISTS (SELECT 1 FROM public.community_questions WHERE author_id = u.id) THEN
      slugs := array_append(slugs, 'first-question'); END IF;
    IF EXISTS (SELECT 1 FROM public.community_answers WHERE author_id = u.id AND helpful_count > 0) THEN
      slugs := array_append(slugs, 'helper'); END IF;
    IF EXISTS (SELECT 1 FROM public.community_questions WHERE author_id = u.id AND is_question_of_day = true) THEN
      slugs := array_append(slugs, 'featured'); END IF;

    IF EXISTS (
      SELECT 1 FROM public.meal_logs
      WHERE member_id = u.id AND vegetables AND protein AND complex_carbs
    ) THEN slugs := array_append(slugs, 'full-plate'); END IF;

    IF EXISTS (
      SELECT 1 FROM public.water_logs
      WHERE member_id = u.id
      GROUP BY log_date HAVING SUM(ounces) >= 64
    ) THEN slugs := array_append(slugs, 'hydrated'); END IF;

    IF EXISTS (SELECT 1 FROM public.cheat_meals WHERE member_id = u.id)
       AND EXISTS (SELECT 1 FROM public.if_fasting_log WHERE member_id = u.id AND status = 'completed')
    THEN slugs := array_append(slugs, 'cheat-and-fast'); END IF;

    IF prog_day >= 30 AND EXISTS (SELECT 1 FROM public.member_measurements WHERE member_id = u.id) THEN
      slugs := array_append(slugs, 'month-1-complete'); END IF;

    IF EXISTS (SELECT 1 FROM public.a1c_logs WHERE member_id = u.id) THEN
      SELECT value_percent INTO a_first FROM public.a1c_logs
        WHERE member_id = u.id ORDER BY measured_on ASC LIMIT 1;
      SELECT value_percent INTO a_last FROM public.a1c_logs
        WHERE member_id = u.id ORDER BY measured_on DESC LIMIT 1;
      IF a_first - a_last >= 0.5 THEN slugs := array_append(slugs, 'dropping'); END IF;
      IF a_last < 6.5 THEN slugs := array_append(slugs, 'pre-diabetic-zone'); END IF;
      IF a_last < 5.7 THEN slugs := array_append(slugs, 'normal-zone'); END IF;
    END IF;

    IF EXISTS (
      WITH baseline AS (
        SELECT weight AS w FROM public.health_logs
        WHERE user_id = u.id AND weight IS NOT NULL
        ORDER BY log_date ASC LIMIT 1
      )
      SELECT 1
        FROM public.health_logs h, baseline b
        WHERE h.user_id = u.id AND h.weight IS NOT NULL
          AND b.w - h.weight >= 5
    ) THEN slugs := array_append(slugs, 'weight-milestone'); END IF;

    IF COALESCE(array_length(slugs, 1), 0) > 0 THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      SELECT u.id, b.id
        FROM public.badges b
        WHERE b.slug = ANY(slugs)
      ON CONFLICT DO NOTHING;

      SELECT to_jsonb(ARRAY(
        SELECT DISTINCT s FROM (
          SELECT jsonb_array_elements_text(
            COALESCE(
              (SELECT badges_earned FROM public.visitor_profiles WHERE user_id = u.id),
              '[]'::jsonb
            )
          ) AS s
          UNION
          SELECT slug FROM public.badges WHERE slug = ANY(slugs) AND category = 'program'
        ) x
      )) INTO new_prog;

      SELECT to_jsonb(ARRAY(
        SELECT DISTINCT s FROM (
          SELECT jsonb_array_elements_text(
            COALESCE(
              (SELECT community_badges_earned FROM public.visitor_profiles WHERE user_id = u.id),
              '[]'::jsonb
            )
          ) AS s
          UNION
          SELECT slug FROM public.badges WHERE slug = ANY(slugs) AND category = 'community'
        ) x
      )) INTO new_comm;

      UPDATE public.visitor_profiles
         SET badges_earned = new_prog,
             community_badges_earned = new_comm
       WHERE user_id = u.id;
    END IF;
  END LOOP;
END $$;
