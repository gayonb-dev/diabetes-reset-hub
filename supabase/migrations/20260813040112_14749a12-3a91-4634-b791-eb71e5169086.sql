-- =====================================================================
-- B4 + B5. ADDITIVE ONLY.
-- No existing orders/subscriptions row is rewritten or backfilled here.
-- Raw Stripe vocabulary stays exactly as it is on those tables; the
-- canonical projection lives in the new ledger and the new views.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.billing_events (
  id                             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id                text        NOT NULL,
  event_type                     text        NOT NULL,
  stripe_created                 timestamptz,
  received_at                    timestamptz NOT NULL DEFAULT now(),
  applied_at                     timestamptz,
  object_id                      text,
  object_type                    text,
  canonical_order_status         text,
  canonical_subscription_status  text,
  subscription_conditions        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  processing_state               text        NOT NULL DEFAULT 'claimed',
  decision_reason                text,
  livemode                       boolean,
  is_synthetic                   boolean     NOT NULL DEFAULT false,
  CONSTRAINT billing_events_event_id_key UNIQUE (stripe_event_id),
  CONSTRAINT billing_events_state_chk CHECK (processing_state IN
    ('claimed','applied','skipped_duplicate','refetched_current','ignored','failed'))
);

CREATE INDEX IF NOT EXISTS billing_events_object_created_idx
  ON public.billing_events (object_id, stripe_created DESC);
CREATE INDEX IF NOT EXISTS billing_events_synthetic_idx
  ON public.billing_events (is_synthetic) WHERE is_synthetic;

GRANT SELECT ON public.billing_events TO authenticated;
GRANT ALL    ON public.billing_events TO service_role;

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_events_admin_read ON public.billing_events;
CREATE POLICY billing_events_admin_read ON public.billing_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.claim_billing_event(
  p_event_id    text,
  p_event_type  text,
  p_created     timestamptz,
  p_object_id   text,
  p_object_type text,
  p_livemode    boolean DEFAULT NULL,
  p_synthetic   boolean DEFAULT false
) RETURNS TABLE(claimed boolean, last_applied_created timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v_rows int := 0; v_last timestamptz;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT max(e.stripe_created) INTO v_last
    FROM public.billing_events e
   WHERE e.object_id = p_object_id
     AND e.processing_state IN ('applied','refetched_current');

  INSERT INTO public.billing_events
    (stripe_event_id, event_type, stripe_created, object_id, object_type,
     livemode, is_synthetic)
  VALUES
    (p_event_id, p_event_type, p_created, p_object_id, p_object_type,
     p_livemode, COALESCE(p_synthetic, false))
  ON CONFLICT (stripe_event_id) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN QUERY SELECT (v_rows > 0), v_last;
END;
$fn$;

REVOKE ALL ON FUNCTION public.claim_billing_event(text,text,timestamptz,text,text,boolean,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_billing_event(text,text,timestamptz,text,text,boolean,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_billing_event(
  p_event_id      text,
  p_state         text,
  p_reason        text  DEFAULT NULL,
  p_order_status  text  DEFAULT NULL,
  p_sub_status    text  DEFAULT NULL,
  p_conditions    jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.billing_events
     SET processing_state = p_state,
         decision_reason  = p_reason,
         canonical_order_status = COALESCE(p_order_status, canonical_order_status),
         canonical_subscription_status = COALESCE(p_sub_status, canonical_subscription_status),
         subscription_conditions = COALESCE(p_conditions, subscription_conditions),
         applied_at = CASE WHEN p_state IN ('applied','refetched_current')
                           THEN now() ELSE applied_at END
   WHERE stripe_event_id = p_event_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.finalize_billing_event(text,text,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_billing_event(text,text,text,text,text,jsonb) TO service_role;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS grace_started_at timestamptz;

COMMENT ON COLUMN public.subscriptions.grace_started_at IS
  'First verified payment failure of the current failure episode. Starts the 7-day grace window. Cleared on a successful payment.';

CREATE OR REPLACE FUNCTION public.canonical_subscription_status(p_raw text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $fn$
  SELECT CASE lower(btrim(coalesce(p_raw,'')))
    WHEN 'trialing' THEN 'trialing'
    WHEN 'active' THEN 'active'
    WHEN 'past_due' THEN 'past_due'
    WHEN 'unpaid' THEN 'unpaid'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'canceled' THEN 'cancelled'
    WHEN 'incomplete' THEN 'incomplete'
    WHEN 'incomplete_expired' THEN 'incomplete_expired'
    WHEN 'paused' THEN 'paused'
    ELSE 'none' END
$fn$;

CREATE OR REPLACE FUNCTION public.canonical_order_status(p_raw text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $fn$
  SELECT CASE lower(btrim(coalesce(p_raw,'')))
    WHEN 'paid' THEN 'paid'
    WHEN 'completed' THEN 'paid'
    WHEN 'complete' THEN 'paid'
    WHEN 'succeeded' THEN 'paid'
    WHEN 'refunded' THEN 'refunded'
    WHEN 'partially_refunded' THEN 'partially_refunded'
    WHEN 'failed' THEN 'failed'
    WHEN 'payment_failed' THEN 'failed'
    WHEN 'requires_payment_method' THEN 'failed'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'canceled' THEN 'cancelled'
    WHEN 'expired' THEN 'cancelled'
    ELSE 'pending' END
$fn$;

CREATE OR REPLACE FUNCTION public.membership_access_state(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE
  r record;
  v_status text;
  v_grace_end timestamptz;
BEGIN
  IF p_user_id IS NULL THEN RETURN 'blocked'; END IF;

  SELECT s.status, s.cancel_at_period_end, s.current_period_end, s.grace_started_at
    INTO r
    FROM public.subscriptions s
   WHERE s.user_id = p_user_id
   ORDER BY s.created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN RETURN 'blocked'; END IF;

  v_status := public.canonical_subscription_status(r.status);

  IF v_status = 'trialing' THEN RETURN 'full'; END IF;

  IF v_status = 'active' THEN
    IF r.cancel_at_period_end AND r.current_period_end IS NOT NULL
       AND now() >= r.current_period_end THEN
      RETURN 'blocked';
    END IF;
    RETURN 'full';
  END IF;

  IF v_status IN ('past_due','unpaid') THEN
    IF r.grace_started_at IS NULL THEN
      IF r.current_period_end IS NOT NULL
         AND now() >= r.current_period_end + interval '7 days' THEN
        RETURN 'blocked';
      END IF;
      RETURN 'grace';
    END IF;
    v_grace_end := r.grace_started_at + interval '7 days';
    IF now() < v_grace_end THEN RETURN 'grace'; END IF;
    RETURN 'blocked';
  END IF;

  IF v_status = 'cancelled' THEN
    IF r.current_period_end IS NOT NULL AND now() < r.current_period_end THEN
      RETURN 'full';
    END IF;
    RETURN 'blocked';
  END IF;

  RETURN 'blocked';
EXCEPTION WHEN OTHERS THEN
  RETURN 'grace';
END;
$fn$;

REVOKE ALL ON FUNCTION public.membership_access_state(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.membership_access_state(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.membership_write_allowed()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
  SELECT auth.role() = 'service_role'
      OR public.has_role(auth.uid(), 'admin')
      OR public.membership_access_state(auth.uid()) <> 'blocked'
$fn$;

REVOKE ALL ON FUNCTION public.membership_write_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.membership_write_allowed() TO authenticated, service_role;

DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'a1c_logs','blood_sugar_readings','cheat_meals','community_answers',
    'community_questions','community_votes','health_logs','if_fasting_log',
    'meal_logs','meal_plans','meal_swaps','member_daily_progress',
    'member_measurements','member_progress','mindset_reads','mood_logs',
    'post_meal_walks','qa_submissions','shopping_lists','snack_logs',
    'user_badges','user_streaks','water_logs','win_posts','workout_sessions'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('DROP POLICY IF EXISTS membership_gate_insert ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS membership_gate_update ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY membership_gate_insert ON public.%I AS RESTRICTIVE '
        'FOR INSERT TO authenticated WITH CHECK (public.membership_write_allowed())', t);
      EXECUTE format(
        'CREATE POLICY membership_gate_update ON public.%I AS RESTRICTIVE '
        'FOR UPDATE TO authenticated USING (public.membership_write_allowed())', t);
    END IF;
  END LOOP;
END $do$;

CREATE OR REPLACE VIEW public.v_canonical_subscriptions
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.user_id,
  s.stripe_subscription_id,
  s.stripe_customer_id,
  s.status AS raw_status,
  public.canonical_subscription_status(s.status) AS subscription_status,
  jsonb_build_object(
    'cancel_at_period_end', s.cancel_at_period_end,
    'in_trial', public.canonical_subscription_status(s.status) = 'trialing',
    'in_grace', public.canonical_subscription_status(s.status) IN ('past_due','unpaid')
                AND s.grace_started_at IS NOT NULL
                AND now() < s.grace_started_at + interval '7 days'
  ) AS subscription_conditions,
  s.grace_started_at,
  CASE WHEN s.grace_started_at IS NULL THEN NULL
       ELSE s.grace_started_at + interval '7 days' END AS grace_ends_at,
  s.trial_end_date,
  s.current_period_end,
  s.created_at,
  s.updated_at
FROM public.subscriptions s;

GRANT SELECT ON public.v_canonical_subscriptions TO authenticated, service_role;

CREATE OR REPLACE VIEW public.v_canonical_orders
WITH (security_invoker = true) AS
SELECT
  o.id,
  o.customer_email,
  o.amount,
  o.currency,
  o.status AS raw_status,
  public.canonical_order_status(o.status) AS order_status,
  o.stripe_session_id,
  o.stripe_payment_intent_id,
  o.product_id,
  o.created_at,
  o.updated_at
FROM public.orders o;

GRANT SELECT ON public.v_canonical_orders TO authenticated, service_role;