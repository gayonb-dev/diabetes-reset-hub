CREATE TABLE public.complimentary_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL DEFAULT 'clinical_review' CHECK (purpose = 'clinical_review'),
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid NOT NULL,
  access_started_at timestamptz,
  access_expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  revocation_reason text,
  CONSTRAINT ca_access_pair CHECK ((access_started_at IS NULL) = (access_expires_at IS NULL)),
  CONSTRAINT ca_access_len CHECK (access_started_at IS NULL OR (access_expires_at = access_started_at + interval '336 hours' AND access_started_at >= granted_at)),
  CONSTRAINT ca_revoke_all CHECK ((revoked_at IS NULL) = (revoked_by IS NULL) AND (revoked_at IS NULL) = (revocation_reason IS NULL)),
  CONSTRAINT ca_revoke_order CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

REVOKE ALL ON public.complimentary_access FROM anon, authenticated, public;
GRANT ALL ON public.complimentary_access TO service_role;
ALTER TABLE public.complimentary_access ENABLE ROW LEVEL SECURITY;
-- No policies: authenticated users have no direct table access.

CREATE OR REPLACE FUNCTION public.guard_complimentary_access_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.user_id <> OLD.user_id OR NEW.purpose <> OLD.purpose
     OR NEW.granted_at <> OLD.granted_at OR NEW.granted_by <> OLD.granted_by THEN
    RAISE EXCEPTION 'complimentary_access identity fields are immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_complimentary_access_immutable BEFORE UPDATE ON public.complimentary_access
FOR EACH ROW EXECUTE FUNCTION public.guard_complimentary_access_immutable();

CREATE OR REPLACE FUNCTION public.complimentary_access_active(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.complimentary_access c
     WHERE c.user_id = p_user_id AND c.revoked_at IS NULL
       AND c.access_started_at IS NOT NULL AND now() < c.access_expires_at)
$$;
REVOKE ALL ON FUNCTION public.complimentary_access_active(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.complimentary_access_active(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complimentary_status_row(c public.complimentary_access)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE
    WHEN c.id IS NULL THEN jsonb_build_object('state','absent','grant_id',NULL,'access_started_at',NULL,'access_expires_at',NULL)
    ELSE jsonb_build_object(
      'state', CASE WHEN c.revoked_at IS NOT NULL THEN 'revoked'
                    WHEN c.access_started_at IS NULL THEN 'pending_activation'
                    WHEN now() >= c.access_expires_at THEN 'expired'
                    ELSE 'active' END,
      'grant_id', c.id, 'access_started_at', c.access_started_at, 'access_expires_at', c.access_expires_at)
  END
$$;
REVOKE ALL ON FUNCTION public.complimentary_status_row(public.complimentary_access) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_complimentary_access()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.complimentary_access;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO c FROM public.complimentary_access WHERE user_id = auth.uid();
  RETURN public.complimentary_status_row(c);
END $$;
REVOKE ALL ON FUNCTION public.my_complimentary_access() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_complimentary_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.activate_my_complimentary_access()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.complimentary_access;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  UPDATE public.complimentary_access
     SET access_started_at = COALESCE(access_started_at, now()),
         access_expires_at = COALESCE(access_expires_at, now() + interval '336 hours')
   WHERE user_id = auth.uid() AND revoked_at IS NULL
  RETURNING * INTO c;
  IF c.id IS NULL THEN
    SELECT * INTO c FROM public.complimentary_access WHERE user_id = auth.uid();
  END IF;
  RETURN public.complimentary_status_row(c);
END $$;
REVOKE ALL ON FUNCTION public.activate_my_complimentary_access() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.activate_my_complimentary_access() TO authenticated;

-- Reviewer programme anchor: set Day 1 once, at onboarding, only for active reviewers
-- without a subscription. Never resets an existing anchor.
CREATE OR REPLACE FUNCTION public.anchor_my_review_programme()
RETURNS date LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_tz text; v_date date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT public.complimentary_access_active(v_uid) OR EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = v_uid) THEN
    SELECT program_start_date INTO v_date FROM public.profiles WHERE user_id = v_uid;
    RETURN v_date;
  END IF;
  SELECT COALESCE(NULLIF(timezone,''),'America/New_York') INTO v_tz FROM public.profiles WHERE user_id = v_uid;
  UPDATE public.profiles
     SET program_start_date = COALESCE(program_start_date, (now() AT TIME ZONE COALESCE(v_tz,'America/New_York'))::date)
   WHERE user_id = v_uid
  RETURNING program_start_date INTO v_date;
  RETURN v_date;
END $$;
REVOKE ALL ON FUNCTION public.anchor_my_review_programme() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.anchor_my_review_programme() TO authenticated;

-- Admin-only grant and revoke. Actor is the verified admin session, never a parameter.
CREATE OR REPLACE FUNCTION public.admin_grant_clinical_review(p_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.complimentary_access (user_id, granted_by) VALUES (p_user_id, auth.uid())
  ON CONFLICT (user_id) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN SELECT id INTO v_id FROM public.complimentary_access WHERE user_id = p_user_id; END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_grant_clinical_review(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_clinical_review(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_revoke_clinical_review(p_user_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN RAISE EXCEPTION 'reason_required'; END IF;
  UPDATE public.complimentary_access SET revoked_at = now(), revoked_by = auth.uid(), revocation_reason = p_reason
   WHERE user_id = p_user_id AND revoked_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.admin_revoke_clinical_review(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_clinical_review(uuid, text) TO authenticated;

-- Server-side entitlement: complimentary access sits below deletion and dispute, above billing.
CREATE OR REPLACE FUNCTION public.membership_access_state(p_user_id uuid)
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r record; v_status text; v_grace_end timestamptz;
BEGIN
  IF p_user_id IS NULL THEN RETURN 'restricted_billing'; END IF;
  IF public.deletion_restricted_active(p_user_id) THEN RETURN 'restricted_deletion'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.billing_holds h LEFT JOIN public.orders o ON o.id = h.order_id
     WHERE h.user_id = p_user_id AND h.hold_type = 'dispute' AND h.resolved_at IS NULL
       AND h.review_only = false AND (o.id IS NULL OR o.period_end IS NULL OR now() < o.period_end)
  ) THEN RETURN 'suspended_dispute'; END IF;

  IF public.complimentary_access_active(p_user_id) THEN RETURN 'allowed'; END IF;

  IF EXISTS (
        SELECT 1 FROM public.orders o WHERE o.user_id = p_user_id
           AND public.canonical_order_status(o.status) = 'refunded'
           AND o.period_start IS NOT NULL AND o.period_end IS NOT NULL
           AND now() >= o.period_start AND now() < o.period_end)
     AND NOT EXISTS (
        SELECT 1 FROM public.orders o2 WHERE o2.user_id = p_user_id
           AND public.canonical_order_status(o2.status) IN ('paid','partially_refunded')
           AND o2.period_start IS NOT NULL AND o2.period_end IS NOT NULL
           AND now() >= o2.period_start AND now() < o2.period_end)
  THEN RETURN 'restricted_billing'; END IF;

  SELECT s.status, s.cancel_at_period_end, s.current_period_end, s.grace_started_at INTO r
    FROM public.subscriptions s WHERE s.user_id = p_user_id ORDER BY s.created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN 'restricted_billing'; END IF;
  v_status := public.canonical_subscription_status(r.status);
  IF v_status = 'trialing' THEN RETURN 'allowed'; END IF;
  IF v_status = 'active' THEN
    IF r.cancel_at_period_end AND r.current_period_end IS NOT NULL AND now() >= r.current_period_end THEN
      RETURN 'restricted_billing'; END IF;
    RETURN 'allowed';
  END IF;
  IF v_status IN ('past_due','unpaid') THEN
    IF r.grace_started_at IS NULL THEN
      IF r.current_period_end IS NULL OR now() >= r.current_period_end + interval '7 days' THEN
        RETURN 'restricted_billing'; END IF;
      RETURN 'grace';
    END IF;
    v_grace_end := r.grace_started_at + interval '7 days';
    IF now() < v_grace_end THEN RETURN 'grace'; END IF;
    RETURN 'restricted_billing';
  END IF;
  IF v_status = 'cancelled' THEN
    IF r.current_period_end IS NOT NULL AND now() < r.current_period_end THEN RETURN 'allowed'; END IF;
    RETURN 'restricted_billing';
  END IF;
  RETURN 'restricted_billing';
EXCEPTION WHEN OTHERS THEN
  RETURN 'grace';
END;
$function$;

-- Additive read policies for programme tables gated directly on subscriptions.
CREATE POLICY "Clinical reviewers read active content" ON public.content_items FOR SELECT TO authenticated
  USING (is_active = true AND public.complimentary_access_active(auth.uid()) AND NOT public.deletion_lock_active(auth.uid()));
CREATE POLICY "Clinical reviewers read daily_actions" ON public.daily_actions FOR SELECT TO authenticated
  USING (public.complimentary_access_active(auth.uid()) AND NOT public.deletion_lock_active(auth.uid()));