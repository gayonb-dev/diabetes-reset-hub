-- Batch 2 closeout RLS audit.
-- 1) Prefer immutable ownership: public.orders.user_id is the long-term
--    authorization key. It is currently NULL on every existing row (Stripe
--    checkout only captured customer_email), so the verified JWT email claim
--    stays as a fallback until orders carry user_id. Ownership is checked
--    first and email is only consulted for rows with no user_id.
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
        user_id IS NULL
        AND customer_email IS NOT NULL
        AND lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    )
  );

-- 2) Members must never write billing rows. Table-level grants were broad even
--    though no policy permitted the write; remove the privilege as well.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.orders FROM authenticated;
REVOKE ALL ON public.orders FROM anon;
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

-- 3) challenge_progress is retired: reads of a member's own historical rows
--    remain, writes are removed at the privilege level too.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.challenge_progress FROM authenticated;
REVOKE ALL ON public.challenge_progress FROM anon;
GRANT SELECT ON public.challenge_progress TO authenticated;
GRANT ALL ON public.challenge_progress TO service_role;

-- 4) intake_submissions keeps member self-insert + self-read only.
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.intake_submissions FROM authenticated;
REVOKE ALL ON public.intake_submissions FROM anon;
GRANT SELECT, INSERT ON public.intake_submissions TO authenticated;
GRANT ALL ON public.intake_submissions TO service_role;