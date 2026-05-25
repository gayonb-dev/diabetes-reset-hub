-- 1. visitor_profiles.date_of_birth
ALTER TABLE public.visitor_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date;

-- 2. intake_submissions.phi_consent_required (gate flag)
ALTER TABLE public.intake_submissions
  ADD COLUMN IF NOT EXISTS phi_consent_required boolean NOT NULL DEFAULT true;

-- 3. activity_events table
CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_profile_id uuid REFERENCES public.visitor_profiles(id) ON DELETE CASCADE,
  user_id uuid,
  event_type text NOT NULL CHECK (event_type IN (
    'login','chat_turn','content_view','content_complete',
    'purchase','intake_submit','consent_granted','consent_revoked'
  )),
  event_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes (composites — see plan.md ranking formula)
CREATE INDEX IF NOT EXISTS idx_activity_events_visitor_event_at
  ON public.activity_events (visitor_profile_id, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_user_event_at
  ON public.activity_events (user_id, event_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_events_type_event_at
  ON public.activity_events (event_type, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_event_at
  ON public.activity_events (event_at);

-- RLS
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read activity_events"
  ON public.activity_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages activity_events"
  ON public.activity_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);