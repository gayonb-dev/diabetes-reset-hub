GRANT SELECT, INSERT ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;

CREATE POLICY "Members manage own activity_events"
ON public.activity_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members read own activity_events"
ON public.activity_events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());