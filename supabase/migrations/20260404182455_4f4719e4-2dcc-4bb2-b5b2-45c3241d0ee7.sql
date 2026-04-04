
CREATE POLICY "Anyone can read orders"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can read leads"
ON public.leads
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can read intake submissions"
ON public.intake_submissions
FOR SELECT
TO anon, authenticated
USING (true);
