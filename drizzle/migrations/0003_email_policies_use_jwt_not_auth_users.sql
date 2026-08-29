-- Same defect class as public.orders: every remaining email-matched policy
-- subselected auth.users, which `authenticated` may not read, so the whole
-- table read/write failed with "permission denied for table users". Resolve
-- the caller's email from the request JWT instead.

DROP POLICY IF EXISTS "Members read own intake" ON public.intake_submissions;
CREATE POLICY "Members read own intake"
  ON public.intake_submissions FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL AND email IS NOT NULL
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Authenticated insert own intake" ON public.intake_submissions;
CREATE POLICY "Authenticated insert own intake"
  ON public.intake_submissions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND email IS NOT NULL
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Members read own challenge progress" ON public.challenge_progress;
CREATE POLICY "Members read own challenge progress"
  ON public.challenge_progress FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL AND email IS NOT NULL
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- challenge_progress is a retired surface: reads stay possible for a member's
-- own historical rows, but the member app must not create or amend rows.
DROP POLICY IF EXISTS "Members insert own challenge progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "Members update own challenge progress" ON public.challenge_progress;