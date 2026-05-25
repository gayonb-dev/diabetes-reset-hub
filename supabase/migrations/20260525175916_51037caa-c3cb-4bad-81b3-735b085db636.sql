
-- Extensions for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Allow Phase B + Phase C event types
ALTER TABLE public.activity_events DROP CONSTRAINT IF EXISTS activity_events_event_type_check;
ALTER TABLE public.activity_events ADD CONSTRAINT activity_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'login','chat_turn','content_view','content_complete','purchase',
    'intake_submit','consent_granted','consent_revoked',
    'birthday_email_sent','checkin_email_sent',
    'digest_generated','score_refreshed'
  ]));

-- Daily digest
CREATE TABLE IF NOT EXISTS public.daily_digest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_date DATE NOT NULL UNIQUE,
  actions_today JSONB NOT NULL DEFAULT '[]'::jsonb,
  what_agent_heard TEXT,
  numbers JSONB NOT NULL DEFAULT '{}'::jsonb,
  anomalies JSONB NOT NULL DEFAULT '[]'::jsonb,
  conversation_count INTEGER NOT NULL DEFAULT 0,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_digest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read daily_digest" ON public.daily_digest
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages daily_digest" ON public.daily_digest
  TO service_role USING (true) WITH CHECK (true);

-- Engagement scores (rebuilt nightly)
CREATE TABLE IF NOT EXISTS public.visitor_engagement_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  visitor_profile_id UUID REFERENCES public.visitor_profiles(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  spend_score NUMERIC NOT NULL DEFAULT 0,
  content_score NUMERIC NOT NULL DEFAULT 0,
  conversation_score NUMERIC NOT NULL DEFAULT 0,
  recency_score NUMERIC NOT NULL DEFAULT 0,
  consistency_score NUMERIC NOT NULL DEFAULT 0,
  total_paid_usd NUMERIC NOT NULL DEFAULT 0,
  days_since_last_activity INTEGER,
  last_conversation_theme TEXT,
  last_purchase_at TIMESTAMPTZ,
  open_unresolved_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  talking_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  draft_whatsapp_script TEXT,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ves_score_desc ON public.visitor_engagement_scores (score DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ves_visitor ON public.visitor_engagement_scores (visitor_profile_id);
ALTER TABLE public.visitor_engagement_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read engagement scores" ON public.visitor_engagement_scores
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages engagement scores" ON public.visitor_engagement_scores
  TO service_role USING (true) WITH CHECK (true);
