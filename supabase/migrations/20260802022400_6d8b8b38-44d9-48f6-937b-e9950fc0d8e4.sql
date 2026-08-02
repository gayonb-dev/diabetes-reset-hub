ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS week_start_day integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.current_program_day(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT GREATEST(
    1,
    ((now() AT TIME ZONE COALESCE(
        (SELECT NULLIF(timezone, '') FROM public.profiles WHERE user_id = p_user_id),
        'America/New_York'
      ))::date - COALESCE(
      (SELECT program_start_date FROM public.profiles WHERE user_id = p_user_id),
      (SELECT MIN(created_at)::date FROM public.subscriptions WHERE user_id = p_user_id),
      (now() AT TIME ZONE COALESCE(
        (SELECT NULLIF(timezone, '') FROM public.profiles WHERE user_id = p_user_id),
        'America/New_York'
      ))::date
    )) + 1
  )::integer
$function$;