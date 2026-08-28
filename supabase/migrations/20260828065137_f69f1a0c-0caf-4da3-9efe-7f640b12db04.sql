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