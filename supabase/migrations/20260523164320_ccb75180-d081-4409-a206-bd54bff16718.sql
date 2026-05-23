
CREATE TABLE public.health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  weight numeric(5,1),
  blood_sugar integer,
  energy smallint CHECK (energy BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own logs" ON public.health_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Members insert own logs" ON public.health_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members update own logs" ON public.health_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Members delete own logs" ON public.health_logs
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins read all logs" ON public.health_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_health_logs_updated_at
  BEFORE UPDATE ON public.health_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_health_logs_user_date ON public.health_logs(user_id, log_date DESC);
