-- 1. member_measurements table (Item 1)
CREATE TABLE IF NOT EXISTS public.member_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at timestamptz NOT NULL DEFAULT now(),
  waist numeric,
  hips numeric,
  chest numeric,
  thigh numeric,
  arm numeric,
  neck numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_measurements TO authenticated;
GRANT ALL ON public.member_measurements TO service_role;

ALTER TABLE public.member_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage own measurements"
  ON public.member_measurements
  FOR ALL
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

CREATE INDEX IF NOT EXISTS member_measurements_member_measured_at_idx
  ON public.member_measurements (member_id, measured_at DESC);

CREATE TRIGGER update_member_measurements_updated_at
  BEFORE UPDATE ON public.member_measurements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Meal-plan regeneration cap (Item 4)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS regenerations_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regen_month date;
