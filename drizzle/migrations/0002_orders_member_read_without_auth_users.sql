-- Batch 2 closeout — Admin billing reconciliation exposed a real authorization
-- defect: the member read policy on public.orders subselected auth.users, but
-- the `authenticated` role has no SELECT privilege on that table. PostgREST
-- evaluates every permissive policy, so ANY authenticated read of public.orders
-- failed with "permission denied for table users" — including admin billing
-- reads and a member's own Billing page. The email now comes from the request
-- JWT, the same identity the subselect was resolving, without touching auth.

DROP POLICY IF EXISTS "Members read own orders" ON public.orders;

CREATE POLICY "Members read own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND customer_email IS NOT NULL
    AND lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );