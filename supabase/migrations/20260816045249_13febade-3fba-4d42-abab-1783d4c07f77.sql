-- Batch 1 Parts E, F, G
-- E. Truthful support-ticket persistence
-- F. Atomic workout completion + history
-- G. Canonical participation ledger + badge retirement

-- ============ E. support tickets ============
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('Bug','Question','Feedback','Billing')),
  message text NOT NULL,
  page_context text,
  user_agent text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_member','resolved','closed')),
  email_status text NOT NULL DEFAULT 'not_attempted'
    CHECK (email_status IN ('not_attempted','sent','suppressed','failed')),
  program_day integer,
  first_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON public.support_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status, created_at DESC);

GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT UPDATE (status, first_response_at, resolved_at, updated_at) ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_member_select" ON public.support_tickets;
CREATE POLICY "support_tickets_member_select" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "support_tickets_member_insert" ON public.support_tickets;
CREATE POLICY "support_tickets_member_insert" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "support_tickets_admin_update" ON public.support_tickets;
CREATE POLICY "support_tickets_admin_update" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin-only notes / replies. Never readable by members.
CREATE TABLE IF NOT EXISTS public.support_ticket_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_ticket_notes_ticket_idx ON public.support_ticket_notes (ticket_id, created_at);

GRANT SELECT, INSERT ON public.support_ticket_notes TO authenticated;
GRANT ALL ON public.support_ticket_notes TO service_role;

ALTER TABLE public.support_ticket_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_ticket_notes_admin_select" ON public.support_ticket_notes;
CREATE POLICY "support_ticket_notes_admin_select" ON public.support_ticket_notes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "support_ticket_notes_admin_insert" ON public.support_ticket_notes;
CREATE POLICY "support_ticket_notes_admin_insert" ON public.support_ticket_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND author_id = auth.uid());

-- ============ G. canonical participation ledger ============
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  points integer NOT NULL,
  idempotency_key text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS points_ledger_user_idx ON public.points_ledger (user_id, created_at DESC);

GRANT SELECT ON public.points_ledger TO authenticated;
GRANT ALL ON public.points_ledger TO service_role;

ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "points_ledger_own_select" ON public.points_ledger;
CREATE POLICY "points_ledger_own_select" ON public.points_ledger
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- One-time carry-in so the ledger total reconciles with the score members
-- already see. Recorded explicitly rather than silently recomputed.
INSERT INTO public.points_ledger (user_id, kind, points, idempotency_key, detail)
SELECT vp.user_id, 'baseline_carry_in', GREATEST(COALESCE(vp.reset_points, 0), 0),
       'baseline_carry_in', 'Activity Score carried in from the pre-ledger total'
FROM public.visitor_profiles vp
WHERE vp.user_id IS NOT NULL
  AND COALESCE(vp.reset_points, 0) > 0
ON CONFLICT (user_id, idempotency_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id uuid,
  p_kind text,
  p_points integer,
  p_idempotency_key text,
  p_detail text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  INSERT INTO public.points_ledger (user_id, kind, points, idempotency_key, detail)
  VALUES (p_user_id, p_kind, GREATEST(COALESCE(p_points, 0), 0), p_idempotency_key, p_detail)
  ON CONFLICT (user_id, idempotency_key) DO NOTHING;

  SELECT COALESCE(SUM(points), 0) INTO v_total
  FROM public.points_ledger WHERE user_id = p_user_id;

  -- Keep the legacy display column in sync with the ledger so no surface can
  -- contradict another.
  UPDATE public.visitor_profiles SET reset_points = v_total WHERE user_id = p_user_id;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.award_points(uuid, text, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_points(uuid, text, integer, text, text) TO service_role;

-- Retire outcome / fasting / cheat-meal badges. History is preserved; the
-- badge simply stops being displayed or announced.
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS is_retired boolean NOT NULL DEFAULT false;

UPDATE public.badges SET is_retired = true
WHERE slug IN (
  'night-faster', 'cheat-and-fast', 'dropping',
  'pre-diabetic-zone', 'normal-zone', 'weight-milestone', 'a1c-entry'
);

-- ============ F. atomic workout completion ============
CREATE TABLE IF NOT EXISTS public.workout_completion_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  workout_slug text NOT NULL,
  workout_name text NOT NULL,
  track text,
  duration_seconds integer,
  points_awarded integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS workout_receipts_user_idx
  ON public.workout_completion_receipts (user_id, completed_at DESC);

GRANT SELECT ON public.workout_completion_receipts TO authenticated;
GRANT ALL ON public.workout_completion_receipts TO service_role;

ALTER TABLE public.workout_completion_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_receipts_own_select" ON public.workout_completion_receipts;
CREATE POLICY "workout_receipts_own_select" ON public.workout_completion_receipts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.complete_workout_session(
  p_session_id uuid,
  p_idempotency_key text,
  p_duration_seconds integer DEFAULT NULL
)
RETURNS public.workout_completion_receipts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_session public.workout_sessions;
  v_receipt public.workout_completion_receipts;
  v_points constant integer := 15;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 THEN
    RAISE EXCEPTION 'invalid_idempotency_key' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_receipt FROM public.workout_completion_receipts
  WHERE user_id = v_uid AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_receipt;
  END IF;

  SELECT * INTO v_session FROM public.workout_sessions
  WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND OR v_session.user_id <> v_uid THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.workout_sessions
     SET status = 'completed',
         completed_at = COALESCE(completed_at, now()),
         duration_seconds = COALESCE(p_duration_seconds, duration_seconds),
         exercises_completed = GREATEST(COALESCE(exercises_completed, 0), COALESCE(exercises_total, 0)),
         updated_at = now()
   WHERE id = p_session_id;

  INSERT INTO public.workout_completion_receipts (
    user_id, session_id, idempotency_key, workout_slug, workout_name, track,
    duration_seconds, points_awarded, completed_at
  )
  VALUES (
    v_uid, p_session_id, p_idempotency_key, v_session.workout_slug, v_session.workout_name,
    v_session.track, COALESCE(p_duration_seconds, v_session.duration_seconds), v_points, now()
  )
  RETURNING * INTO v_receipt;

  INSERT INTO public.points_ledger (user_id, kind, points, idempotency_key, detail)
  VALUES (v_uid, 'workout_completed', v_points, 'workout:' || p_idempotency_key,
          'Completed ' || v_session.workout_name)
  ON CONFLICT (user_id, idempotency_key) DO NOTHING;

  UPDATE public.visitor_profiles
     SET reset_points = (SELECT COALESCE(SUM(points), 0) FROM public.points_ledger WHERE user_id = v_uid)
   WHERE user_id = v_uid;

  RETURN v_receipt;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_workout_session(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_workout_session(uuid, text, integer) TO authenticated, service_role;