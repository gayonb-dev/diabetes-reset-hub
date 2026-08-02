ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS medication_class text,
  ADD COLUMN IF NOT EXISTS fasting_eligibility text NOT NULL DEFAULT 'unscreened',
  ADD COLUMN IF NOT EXISTS doctor_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS fasting_exclusions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS bedtime_hour integer NOT NULL DEFAULT 22,
  ADD COLUMN IF NOT EXISTS fasting_target integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fasting_started_on date,
  ADD COLUMN IF NOT EXISTS window_start_hour integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS low_bs_card_seen_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_fasting_eligibility_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_fasting_eligibility_check
      CHECK (fasting_eligibility IN ('unscreened','eligible','needs_doctor','not_eligible'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_medication_class_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_medication_class_check
      CHECK (medication_class IS NULL OR medication_class IN ('insulin','sulfonylurea','glinide','none','unsure'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_fasting_target_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_fasting_target_check
      CHECK (fasting_target BETWEEN 0 AND 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_window_start_hour_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_window_start_hour_check
      CHECK (window_start_hour BETWEEN 6 AND 11);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_bedtime_hour_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_bedtime_hour_check
      CHECK (bedtime_hour BETWEEN 18 AND 23);
  END IF;
END $$;