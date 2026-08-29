-- Batch 2 closeout: make the programme-day guard fail closed.
--
-- Previous behaviour referenced NEW.user_id unconditionally, which does not exist on
-- public.member_daily_progress (that table uses member_id), and it accepted any value
-- current_program_day() returned without validating it. This version:
--   * resolves the subject from user_id OR member_id via to_jsonb(NEW);
--   * refuses the write when no subject can be resolved;
--   * refuses the write when the programme day is NULL, non-positive or cannot be computed;
--   * refuses invalid or future day_number values;
--   * keeps service_role deliberately exempt (backfills / server jobs).
CREATE OR REPLACE FUNCTION public.enforce_member_progress_day_unlocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_day int;
  v_subject uuid;
  v_row jsonb;
BEGIN
  -- service_role remains deliberately separate and exempt.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  v_row := to_jsonb(NEW);
  BEGIN
    v_subject := COALESCE(NULLIF(v_row->>'user_id',''), NULLIF(v_row->>'member_id',''))::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_subject := NULL;
  END;

  IF v_subject IS NULL THEN
    RAISE EXCEPTION 'Progress write refused: no member subject on this row.'
      USING ERRCODE = '42501';
  END IF;

  BEGIN
    v_day := public.current_program_day(v_subject);
  EXCEPTION WHEN OTHERS THEN
    v_day := NULL;
  END;

  IF v_day IS NULL OR v_day < 1 THEN
    RAISE EXCEPTION 'Progress write refused: no valid programme-day state for this member.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.day_number IS NULL OR NEW.day_number < 1 THEN
    RAISE EXCEPTION 'Progress write refused: day_number must be a positive integer.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.day_number > v_day THEN
    RAISE EXCEPTION 'Day % has not unlocked yet (currently on day %).', NEW.day_number, v_day
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;