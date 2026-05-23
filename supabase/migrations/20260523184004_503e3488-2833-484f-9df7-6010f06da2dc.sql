
-- LEADS
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can read leads" ON public.leads;
CREATE POLICY "Admins read leads" ON public.leads FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- INTAKE_SUBMISSIONS
DROP POLICY IF EXISTS "Anyone can insert intake submissions" ON public.intake_submissions;
DROP POLICY IF EXISTS "Anyone can read intake submissions" ON public.intake_submissions;
CREATE POLICY "Admins read intake" ON public.intake_submissions FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read own intake" ON public.intake_submissions FOR SELECT USING (auth.uid() IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Authenticated insert own intake" ON public.intake_submissions FOR INSERT TO authenticated WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- ORDERS
DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
CREATE POLICY "Admins read orders" ON public.orders FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read own orders" ON public.orders FOR SELECT USING (auth.uid() IS NOT NULL AND customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- CHALLENGE_PROGRESS
DROP POLICY IF EXISTS "Anyone can insert challenge progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "Anyone can read challenge progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "Anyone can update their own progress" ON public.challenge_progress;
CREATE POLICY "Admins all challenge_progress" ON public.challenge_progress FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read own challenge progress" ON public.challenge_progress FOR SELECT USING (auth.uid() IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Members insert own challenge progress" ON public.challenge_progress FOR INSERT TO authenticated WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
