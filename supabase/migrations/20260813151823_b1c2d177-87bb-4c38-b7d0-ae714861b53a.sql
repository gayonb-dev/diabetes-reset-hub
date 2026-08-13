-- Additive: trusted refund relationship (order -> subscription -> member).
-- The internal subscription_id is authoritative; the Stripe id is retained
-- for reconciliation only.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_id uuid,
  ADD COLUMN IF NOT EXISTS linkage_review_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_subscription_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_subscription_id_fkey
      FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_subscription_id_idx ON public.orders (subscription_id);
CREATE INDEX IF NOT EXISTS orders_stripe_subscription_id_idx ON public.orders (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS orders_stripe_invoice_id_idx ON public.orders (stripe_invoice_id);

-- Canonical access vocabulary:
--   allowed | grace | restricted_billing | restricted_deletion | suspended_dispute
CREATE OR REPLACE FUNCTION public.membership_access_state(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_status text;
  v_grace_end timestamptz;
BEGIN
  IF p_user_id IS NULL THEN RETURN 'restricted_billing'; END IF;

  -- Prompt 3 deletion lifecycle keeps priority over any billing decision.
  IF public.deletion_restricted_active(p_user_id) THEN
    RETURN 'restricted_deletion';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.billing_holds h
      LEFT JOIN public.orders o ON o.id = h.order_id
     WHERE h.user_id = p_user_id
       AND h.hold_type = 'dispute'
       AND h.resolved_at IS NULL
       AND h.review_only = false
       AND (o.id IS NULL OR o.period_end IS NULL OR now() < o.period_end)
  ) THEN
    RETURN 'suspended_dispute';
  END IF;

  IF EXISTS (
        SELECT 1 FROM public.orders o
         WHERE o.user_id = p_user_id
           AND public.canonical_order_status(o.status) = 'refunded'
           AND o.period_start IS NOT NULL AND o.period_end IS NOT NULL
           AND now() >= o.period_start AND now() < o.period_end
     )
     AND NOT EXISTS (
        SELECT 1 FROM public.orders o2
         WHERE o2.user_id = p_user_id
           AND public.canonical_order_status(o2.status) IN ('paid','partially_refunded')
           AND o2.period_start IS NOT NULL AND o2.period_end IS NOT NULL
           AND now() >= o2.period_start AND now() < o2.period_end
     )
  THEN
    RETURN 'restricted_billing';
  END IF;

  SELECT s.status, s.cancel_at_period_end, s.current_period_end, s.grace_started_at
    INTO r
    FROM public.subscriptions s
   WHERE s.user_id = p_user_id
   ORDER BY s.created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN RETURN 'restricted_billing'; END IF;

  v_status := public.canonical_subscription_status(r.status);

  IF v_status = 'trialing' THEN RETURN 'allowed'; END IF;

  IF v_status = 'active' THEN
    IF r.cancel_at_period_end AND r.current_period_end IS NOT NULL
       AND now() >= r.current_period_end THEN
      RETURN 'restricted_billing';
    END IF;
    RETURN 'allowed';
  END IF;

  IF v_status IN ('past_due','unpaid') THEN
    IF r.grace_started_at IS NULL THEN
      IF r.current_period_end IS NULL
         OR now() >= r.current_period_end + interval '7 days' THEN
        RETURN 'restricted_billing';
      END IF;
      RETURN 'grace';
    END IF;
    v_grace_end := r.grace_started_at + interval '7 days';
    IF now() < v_grace_end THEN RETURN 'grace'; END IF;
    RETURN 'restricted_billing';
  END IF;

  IF v_status = 'cancelled' THEN
    IF r.current_period_end IS NOT NULL AND now() < r.current_period_end THEN
      RETURN 'allowed';
    END IF;
    RETURN 'restricted_billing';
  END IF;

  RETURN 'restricted_billing';
EXCEPTION WHEN OTHERS THEN
  RETURN 'grace';
END;
$function$;

REVOKE ALL ON FUNCTION public.membership_access_state(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.membership_access_state(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.membership_write_allowed()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.role() = 'service_role'
      OR public.has_role(auth.uid(), 'admin')
      OR public.membership_access_state(auth.uid()) IN ('allowed','grace')
$function$;

REVOKE ALL ON FUNCTION public.membership_write_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.membership_write_allowed() TO authenticated, service_role;