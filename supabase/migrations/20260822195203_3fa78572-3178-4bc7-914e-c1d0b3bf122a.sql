-- Batch 1 closeout correction: exactly ONE Activity Score award path.
-- award_points is updated in place. The ledger insert now uses
-- ON CONFLICT DO NOTHING ... RETURNING so callers learn whether the row was
-- actually inserted; legacy XP / display totals are only touched on a real
-- insert. Return type changes from integer to jsonb, which requires a drop.
DROP FUNCTION IF EXISTS public.award_points(uuid, text, integer, text, text);

CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id uuid,
  p_kind text,
  p_points integer,
  p_idempotency_key text,
  p_detail text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_inserted boolean := false;
  v_id uuid;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF auth.role() <> 'service_role' AND public.deletion_lock_active(p_user_id) THEN
    RAISE EXCEPTION 'account_deletion_in_progress' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.points_ledger (user_id, kind, points, idempotency_key, detail)
  VALUES (p_user_id, p_kind, GREATEST(COALESCE(p_points, 0), 0), p_idempotency_key, p_detail)
  ON CONFLICT (user_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_id;

  v_inserted := v_id IS NOT NULL;

  SELECT COALESCE(SUM(points), 0) INTO v_total
  FROM public.points_ledger WHERE user_id = p_user_id;

  -- Keep the legacy display column in sync only when the ledger actually moved.
  IF v_inserted THEN
    UPDATE public.visitor_profiles SET reset_points = v_total WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object('inserted', v_inserted, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.award_points(uuid, text, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_points(uuid, text, integer, text, text) TO service_role;