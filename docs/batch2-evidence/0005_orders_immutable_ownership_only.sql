-- Batch 2 closeout: order reads must fail closed on immutable ownership.
--
-- The previous member policy allowed a read when orders.user_id IS NULL and the
-- JWT email claim matched orders.customer_email. That made a mutable, reusable
-- attribute (email) the long-term authorization key: a changed, recycled or
-- newly registered matching address could expose a legacy order.
--
-- A member may now read an order ONLY through a server-established immutable
-- relationship:
--   * orders.user_id = auth.uid(), or
--   * orders.subscription_id -> public.subscriptions.user_id = auth.uid().
--
-- Legacy orders with no immutable owner become inaccessible to ordinary
-- members. Admin access (has_role(auth.uid(),'admin')) and service_role are
-- unchanged. No order row is read, written or backfilled by this migration.
--
-- ROLLBACK:
--   DROP POLICY "Members read own orders" ON public.orders;
--   CREATE POLICY "Members read own orders" ON public.orders FOR SELECT TO authenticated
--   USING (auth.uid() IS NOT NULL AND (user_id = auth.uid()
--     OR (user_id IS NULL AND customer_email IS NOT NULL
--         AND lower(customer_email) = lower(COALESCE(auth.jwt() ->> 'email','')))));

DROP POLICY IF EXISTS "Members read own orders" ON public.orders;

CREATE POLICY "Members read own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR (
      subscription_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.id = public.orders.subscription_id
          AND s.user_id = auth.uid()
      )
    )
  )
);

-- Members remain read-only on billing records: no INSERT/UPDATE/DELETE policy
-- exists for them and the table grants stay as recorded.
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM authenticated;
REVOKE ALL ON public.orders FROM anon;
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;