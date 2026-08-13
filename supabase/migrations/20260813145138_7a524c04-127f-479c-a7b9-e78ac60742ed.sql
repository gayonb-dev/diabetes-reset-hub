-- Additive only. No existing row is rewritten.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS stripe_charge_id text,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
  ADD COLUMN IF NOT EXISTS amount_refunded integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raw_refund_status text,
  ADD COLUMN IF NOT EXISTS period_start timestamptz,
  ADD COLUMN IF NOT EXISTS period_end timestamptz,
  ADD COLUMN IF NOT EXISTS refund_review_required boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_stripe_charge_id_idx ON public.orders (stripe_charge_id);

CREATE TABLE IF NOT EXISTS public.billing_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  hold_type text NOT NULL DEFAULT 'dispute',
  stripe_dispute_id text,
  stripe_charge_id text,
  dispute_status text,
  raw_status text,
  review_only boolean NOT NULL DEFAULT false,
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_holds_dispute_uidx
  ON public.billing_holds (stripe_dispute_id) WHERE stripe_dispute_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS billing_holds_user_open_idx
  ON public.billing_holds (user_id) WHERE resolved_at IS NULL;

-- Stripe identifiers must never reach browser code: the base table is
-- service_role only. Admins read the sanitised view below.
GRANT ALL ON public.billing_holds TO service_role;

ALTER TABLE public.billing_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_holds service role only"
  ON public.billing_holds FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_billing_holds_updated_at
  BEFORE UPDATE ON public.billing_holds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sanitised admin projection: no stripe_dispute_id, no stripe_charge_id.
CREATE OR REPLACE VIEW public.admin_billing_holds
WITH (security_invoker = false) AS
  SELECT h.id,
         h.user_id,
         h.order_id,
         h.hold_type,
         h.dispute_status,
         h.review_only,
         h.opened_at,
         h.resolved_at,
         h.created_at,
         h.updated_at
    FROM public.billing_holds h
   WHERE public.has_role(auth.uid(), 'admin');

REVOKE ALL ON public.admin_billing_holds FROM PUBLIC;
GRANT SELECT ON public.admin_billing_holds TO authenticated, service_role;

-- Membership gate: dispute suspension and refunded-entitlement revocation.
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

  -- An unresolved FORMAL dispute (not an inquiry/early warning) on an
  -- entitlement that still covers now suspends programme access only.
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

  -- A fully refunded payment revokes only the entitlement it funded, and only
  -- when no other independently valid paid period covers now.
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
    RETURN 'blocked';
  END IF;

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

-- A dispute suspension withholds programme writes exactly like a block.
CREATE OR REPLACE FUNCTION public.membership_write_allowed()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
  SELECT auth.role() = 'service_role'
      OR public.has_role(auth.uid(), 'admin')
      OR public.membership_access_state(auth.uid()) NOT IN ('blocked','suspended_dispute')
$fn$;

REVOKE ALL ON FUNCTION public.membership_write_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.membership_write_allowed() TO authenticated, service_role;