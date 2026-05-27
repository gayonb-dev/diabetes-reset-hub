CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workout_slug TEXT NOT NULL,
  workout_name TEXT NOT NULL,
  track TEXT NOT NULL CHECK (track IN ('A','B')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','paused','completed','abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  exercises_completed INTEGER NOT NULL DEFAULT 0,
  exercises_total INTEGER,
  cool_down_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own workout sessions" ON public.workout_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own workout sessions" ON public.workout_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own workout sessions" ON public.workout_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own workout sessions" ON public.workout_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON public.workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON public.workout_sessions(user_id, status) WHERE status IN ('in_progress','paused');

CREATE TRIGGER trg_workout_sessions_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();