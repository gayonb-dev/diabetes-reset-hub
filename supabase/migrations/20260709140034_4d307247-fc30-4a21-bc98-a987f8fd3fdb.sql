
-- Backfill program_start_date where missing
UPDATE public.profiles p
SET program_start_date = LEAST(
  COALESCE((SELECT MIN(s.created_at)::date FROM public.subscriptions s WHERE s.user_id = p.user_id), p.created_at::date),
  p.created_at::date
)
WHERE p.program_start_date IS NULL;

-- Ensure every auth.users has a profiles row so program_start_date is always available
INSERT INTO public.profiles (user_id, program_start_date)
SELECT u.id, u.created_at::date
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- Helper: current program day for a user (1-indexed)
CREATE OR REPLACE FUNCTION public.current_program_day(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    1,
    ((now() AT TIME ZONE 'utc')::date - COALESCE(
      (SELECT program_start_date FROM public.profiles WHERE user_id = p_user_id),
      (SELECT MIN(created_at)::date FROM public.subscriptions WHERE user_id = p_user_id),
      (now() AT TIME ZONE 'utc')::date
    )) + 1
  )::integer
$$;

-- Server-side guard on member_progress: reject completions for days that haven't unlocked
CREATE OR REPLACE FUNCTION public.enforce_member_progress_day_unlocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day int;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  v_day := public.current_program_day(NEW.user_id);
  IF NEW.day_number > v_day THEN
    RAISE EXCEPTION 'Day % has not unlocked yet (currently on day %).', NEW.day_number, v_day
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS member_progress_day_guard ON public.member_progress;
CREATE TRIGGER member_progress_day_guard
BEFORE INSERT OR UPDATE ON public.member_progress
FOR EACH ROW EXECUTE FUNCTION public.enforce_member_progress_day_unlocked();
