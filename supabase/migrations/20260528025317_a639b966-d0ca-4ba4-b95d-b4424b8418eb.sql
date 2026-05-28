
DO $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'gayonb@gmail.com';
  IF uid IS NULL THEN RAISE NOTICE 'user not found'; RETURN; END IF;

  DELETE FROM public.meal_plans WHERE member_id = uid;
  DELETE FROM public.health_logs WHERE user_id = uid;
  DELETE FROM public.user_streaks WHERE user_id = uid;

  UPDATE public.visitor_profiles
  SET metadata = '{}'::jsonb,
      date_of_birth = NULL
  WHERE user_id = uid;
END $$;
