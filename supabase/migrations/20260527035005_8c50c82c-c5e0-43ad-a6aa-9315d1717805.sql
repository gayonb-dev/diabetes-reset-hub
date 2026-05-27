ALTER TABLE public.visitor_profiles
  ADD COLUMN IF NOT EXISTS knee_friendly boolean NOT NULL DEFAULT false;