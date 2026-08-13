DROP VIEW IF EXISTS public.admin_billing_holds;

-- Admin read of dispute records, without any Stripe identifier.
CREATE POLICY "billing_holds admin read"
  ON public.billing_holds FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Column-level grant: the Stripe identifier columns are simply not grantable
-- to browser clients, so no policy mistake can expose them.
GRANT SELECT (id, user_id, order_id, hold_type, dispute_status, review_only,
              opened_at, resolved_at, created_at, updated_at)
  ON public.billing_holds TO authenticated;

CREATE VIEW public.admin_billing_holds
WITH (security_invoker = true) AS
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
    FROM public.billing_holds h;

REVOKE ALL ON public.admin_billing_holds FROM PUBLIC;
GRANT SELECT ON public.admin_billing_holds TO authenticated, service_role;