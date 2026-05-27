
-- Profile flag for sulfonylurea / insulin disclaimer
ALTER TABLE public.visitor_profiles
  ADD COLUMN IF NOT EXISTS lowers_blood_sugar_meds boolean NOT NULL DEFAULT false;

-- ============ blood_sugar_readings ============
CREATE TABLE IF NOT EXISTS public.blood_sugar_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  value_mgdl integer NOT NULL,
  reading_type text NOT NULL CHECK (reading_type IN ('fasting','post_meal','bedtime','other')),
  measured_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bsr_member_time ON public.blood_sugar_readings(member_id, measured_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_sugar_readings TO authenticated;
GRANT ALL ON public.blood_sugar_readings TO service_role;
ALTER TABLE public.blood_sugar_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own bs_readings" ON public.blood_sugar_readings
  FOR ALL USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Admins read bs_readings" ON public.blood_sugar_readings
  FOR SELECT USING (has_role(auth.uid(),'admin'));

-- ============ a1c_logs ============
CREATE TABLE IF NOT EXISTS public.a1c_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  value_percent numeric NOT NULL,
  value_mmol_mol numeric,
  measured_on date NOT NULL,
  source text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_a1c_member_date ON public.a1c_logs(member_id, measured_on DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.a1c_logs TO authenticated;
GRANT ALL ON public.a1c_logs TO service_role;
ALTER TABLE public.a1c_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own a1c" ON public.a1c_logs
  FOR ALL USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Admins read a1c" ON public.a1c_logs
  FOR SELECT USING (has_role(auth.uid(),'admin'));

-- ============ water_logs ============
CREATE TABLE IF NOT EXISTS public.water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  ounces integer NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_water_member_date ON public.water_logs(member_id, log_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_logs TO authenticated;
GRANT ALL ON public.water_logs TO service_role;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own water" ON public.water_logs
  FOR ALL USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Admins read water" ON public.water_logs
  FOR SELECT USING (has_role(auth.uid(),'admin'));

-- ============ meal_logs ============
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  vegetables boolean NOT NULL DEFAULT false,
  protein boolean NOT NULL DEFAULT false,
  complex_carbs boolean NOT NULL DEFAULT false,
  free_text text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, log_date, meal_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_logs TO authenticated;
GRANT ALL ON public.meal_logs TO service_role;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own meal_logs" ON public.meal_logs
  FOR ALL USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Admins read meal_logs" ON public.meal_logs
  FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_meal_logs_updated BEFORE UPDATE ON public.meal_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ snack_logs ============
CREATE TABLE IF NOT EXISTS public.snack_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  slot text NOT NULL CHECK (slot IN ('snack_1','snack_2')),
  snack_name text,
  eaten boolean NOT NULL DEFAULT true,
  eaten_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, log_date, slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.snack_logs TO authenticated;
GRANT ALL ON public.snack_logs TO service_role;
ALTER TABLE public.snack_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own snacks" ON public.snack_logs
  FOR ALL USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Admins read snacks" ON public.snack_logs
  FOR SELECT USING (has_role(auth.uid(),'admin'));

-- ============ post_meal_walks ============
CREATE TABLE IF NOT EXISTS public.post_meal_walks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  slot text NOT NULL CHECK (slot IN ('after_breakfast','after_lunch','after_dinner')),
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, log_date, slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_meal_walks TO authenticated;
GRANT ALL ON public.post_meal_walks TO service_role;
ALTER TABLE public.post_meal_walks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own walks" ON public.post_meal_walks
  FOR ALL USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Admins read walks" ON public.post_meal_walks
  FOR SELECT USING (has_role(auth.uid(),'admin'));

-- ============ mood_logs ============
CREATE TABLE IF NOT EXISTS public.mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  mood smallint NOT NULL CHECK (mood BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mood_logs TO authenticated;
GRANT ALL ON public.mood_logs TO service_role;
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own mood" ON public.mood_logs
  FOR ALL USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Admins read mood" ON public.mood_logs
  FOR SELECT USING (has_role(auth.uid(),'admin'));

-- ============ mindset_reads ============
CREATE TABLE IF NOT EXISTS public.mindset_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mindset_reads TO authenticated;
GRANT ALL ON public.mindset_reads TO service_role;
ALTER TABLE public.mindset_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own mindset" ON public.mindset_reads
  FOR ALL USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Admins read mindset" ON public.mindset_reads
  FOR SELECT USING (has_role(auth.uid(),'admin'));
