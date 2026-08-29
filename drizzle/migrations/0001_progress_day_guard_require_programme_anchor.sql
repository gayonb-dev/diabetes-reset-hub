-- Batch 2 closeout, part 2: the guard must fail closed when the member has no valid
-- programme-day state at all.
--
-- public.current_program_day() is a total function: its final COALESCE falls back to
-- "today", so it can never return NULL and would silently authorise day 1 for a member
-- with no programme anchor. The guard therefore checks the anchor explicitly instead of
-- trusting that fallback, while still fail-closing on NULL / exception for defence in depth.
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
  v_anchored boolean;
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
    SELECT EXISTS (
             SELECT 1 FROM public.profiles p
              WHERE p.user_id = v_subject AND p.program_start_date IS NOT NULL
           )
        OR EXISTS (
             SELECT 1 FROM public.subscriptions s WHERE s.user_id = v_subject
           )
      INTO v_anchored;
  EXCEPTION WHEN OTHERS THEN
    v_anchored := false;
  END;

  IF v_anchored IS NOT TRUE THEN
    RAISE EXCEPTION 'Progress write refused: no valid programme-day state for this member.'
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