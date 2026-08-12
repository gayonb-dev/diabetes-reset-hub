ALTER TABLE public.visitor_sessions ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');

DROP POLICY IF EXISTS "Admins read bs_readings" ON public.blood_sugar_readings;
DROP POLICY IF EXISTS "Admins read all logs" ON public.health_logs;