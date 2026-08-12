-- =========================================================
-- P1–P4 privacy/security foundation (staging)
-- =========================================================

-- ---------- server-controlled configuration ----------
CREATE TABLE public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_config TO service_role;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated: members and browser code cannot read or write.

CREATE TRIGGER trg_app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_config (key, value, description) VALUES
  ('ai_health_enabled', 'false'::jsonb, 'Server AI-health gate. Defaults false. Requires processor/DPA approval.'),
  ('email_delivery_enabled', 'false'::jsonb, 'Staging: outbound email disabled.'),
  ('email_test_allowlist', '[]'::jsonb, 'Explicitly approved test recipients.'),
  ('dexcom_enabled', 'false'::jsonb, 'Dexcom integration disabled in staging.'),
  ('stripe_mode', '"test"'::jsonb, 'Staging must be Stripe test mode only.'),
  ('phi_notice_version', '"2026-08-07.1"'::jsonb, 'Current privacy notice version for consent capture.'),
  ('retention_mode', '"report_only"'::jsonb, 'Retention worker reports counts and purges nothing.');

CREATE OR REPLACE FUNCTION public.get_app_config(p_key text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT value FROM public.app_config WHERE key = p_key $$;
REVOKE ALL ON FUNCTION public.get_app_config(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_config(text) TO service_role;

-- ---------- opaque server-side visitor sessions ----------
CREATE TABLE public.visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  visitor_profile_id uuid NOT NULL REFERENCES public.visitor_profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_hmac text,
  user_agent_hash text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at timestamptz,
  rotated_from uuid,
  merged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_visitor_sessions_profile ON public.visitor_sessions(visitor_profile_id);
GRANT ALL ON public.visitor_sessions TO service_role;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: sessions are resolved server-side only.

-- ---------- purpose-keyed consent ----------
CREATE TABLE public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_kind text NOT NULL CHECK (subject_kind IN ('member','visitor')),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_session_id uuid REFERENCES public.visitor_sessions(id) ON DELETE CASCADE,
  visitor_profile_id uuid REFERENCES public.visitor_profiles(id) ON DELETE CASCADE,
  purpose_key text NOT NULL,
  notice_version text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  source text NOT NULL DEFAULT 'server',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_subject_present CHECK (
    (subject_kind = 'member' AND user_id IS NOT NULL)
    OR (subject_kind = 'visitor' AND visitor_session_id IS NOT NULL)
  )
);
CREATE INDEX idx_consent_records_user ON public.consent_records(user_id);
CREATE INDEX idx_consent_records_session ON public.consent_records(visitor_session_id);
GRANT SELECT ON public.consent_records TO authenticated;
GRANT ALL ON public.consent_records TO service_role;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own consent records"
  ON public.consent_records FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------- legacy phi_consent becomes read-only ----------
REVOKE INSERT, UPDATE ON public.phi_consent FROM authenticated, anon;
DROP POLICY IF EXISTS "Users can insert own consent" ON public.phi_consent;
DROP POLICY IF EXISTS "Users insert own consent" ON public.phi_consent;
DROP POLICY IF EXISTS "Anyone can insert consent" ON public.phi_consent;
DROP POLICY IF EXISTS "insert own phi consent" ON public.phi_consent;

CREATE OR REPLACE FUNCTION public.block_phi_consent_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'phi_consent is retired legacy history and accepts no new writes'
    USING ERRCODE = '42501';
END;
$$;
CREATE TRIGGER trg_block_phi_consent_writes
  BEFORE INSERT OR UPDATE ON public.phi_consent
  FOR EACH ROW EXECUTE FUNCTION public.block_phi_consent_writes();

-- ---------- deletion lifecycle ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_pending boolean NOT NULL DEFAULT false;

CREATE TABLE public.deletion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'requested'
    CHECK (state IN ('requested','access_blocked','in_progress','waiting_for_processor',
                     'reconciled','partial','failed','completed','reversed')),
  identity_verified_at timestamptz,
  requested_at timestamptz NOT NULL DEFAULT now(),
  access_blocked_at timestamptz,
  completed_at timestamptz,
  reversed_at timestamptz,
  reversal_authorized_by uuid,
  failure_reason text,
  processor_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deletion_jobs_user_state ON public.deletion_jobs(user_id, state);
GRANT SELECT ON public.deletion_jobs TO authenticated;
GRANT ALL ON public.deletion_jobs TO service_role;
ALTER TABLE public.deletion_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own deletion jobs"
  ON public.deletion_jobs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_deletion_jobs_updated_at
  BEFORE UPDATE ON public.deletion_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- profiles.deletion_pending is set atomically at the access_blocked transition
CREATE OR REPLACE FUNCTION public.sync_deletion_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_locked boolean;
BEGIN
  IF NEW.state = 'access_blocked' AND NEW.access_blocked_at IS NULL THEN
    NEW.access_blocked_at := now();
  END IF;

  v_locked := NEW.state IN ('access_blocked','in_progress','waiting_for_processor',
                            'reconciled','partial','failed');

  UPDATE public.profiles SET deletion_pending = v_locked WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sync_deletion_pending
  BEFORE INSERT OR UPDATE ON public.deletion_jobs
  FOR EACH ROW EXECUTE FUNCTION public.sync_deletion_pending();

-- Fail-closed deletion lock check.
CREATE OR REPLACE FUNCTION public.deletion_lock_active(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_locked boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN true;  -- cannot determine subject -> fail closed
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.deletion_jobs j
    WHERE j.user_id = p_user_id
      AND j.identity_verified_at IS NOT NULL
      AND j.state IN ('access_blocked','in_progress','waiting_for_processor',
                      'reconciled','partial','failed')
  ) INTO v_locked;

  IF v_locked IS NULL THEN
    RETURN true;  -- indeterminate -> fail closed
  END IF;
  RETURN v_locked;
EXCEPTION WHEN OTHERS THEN
  RETURN true;    -- lookup failure -> fail closed
END;
$$;
GRANT EXECUTE ON FUNCTION public.deletion_lock_active(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.member_access_allowed()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT auth.uid() IS NOT NULL AND NOT public.deletion_lock_active(auth.uid()) $$;
GRANT EXECUTE ON FUNCTION public.member_access_allowed() TO authenticated, service_role;

-- ---------- single-use reauthentication tickets ----------
CREATE TABLE public.reauth_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('export','delete')),
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
GRANT ALL ON public.reauth_tickets TO service_role;
ALTER TABLE public.reauth_tickets ENABLE ROW LEVEL SECURITY;
-- No member-facing policies: tickets are minted and consumed server-side only.

CREATE OR REPLACE FUNCTION public.enforce_reauth_ticket_lifetime()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at > NEW.created_at + interval '10 minutes' THEN
    RAISE EXCEPTION 'reauth ticket lifetime may not exceed 10 minutes';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_reauth_ticket_lifetime
  BEFORE INSERT ON public.reauth_tickets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_reauth_ticket_lifetime();

CREATE OR REPLACE FUNCTION public.consume_reauth_ticket(p_token_hash text, p_user_id uuid, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  UPDATE public.reauth_tickets
     SET consumed_at = now()
   WHERE token_hash = p_token_hash
     AND user_id = p_user_id
     AND action = p_action
     AND consumed_at IS NULL
     AND expires_at > now()
  RETURNING id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_reauth_ticket(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_reauth_ticket(text, uuid, text) TO service_role;

-- ---------- atomic rate limiting ----------
CREATE TABLE public.rate_limits (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, window_start)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_bucket text, p_window_seconds integer, p_limit integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
BEGIN
  INSERT INTO public.rate_limits (bucket, window_start, count)
  VALUES (p_bucket, v_window, 1)
  ON CONFLICT (bucket, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;
  RETURN v_count <= p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;

-- ---------- deletion lifecycle lock applied as RESTRICTIVE policies ----------
-- Restrictive policies AND with every existing permissive policy, so normal
-- members with no verified deletion job keep their existing access, and a
-- locked member loses select/insert/update/delete on personal records.
DO $$
DECLARE
  t text;
  personal_tables text[] := ARRAY[
    'a1c_logs','activity_events','blood_sugar_readings','cheat_meals','coaching_waitlist',
    'community_answers','community_questions','community_votes','consent_records',
    'conversations','deletion_requests','dexcom_connections','dunning_attempts',
    'health_logs','if_fasting_log','intake_submissions','meal_logs','meal_plans',
    'meal_swaps','member_daily_progress','member_measurements','member_progress',
    'messages','mindset_reads','mood_logs','notifications','oauth_client_grants',
    'phi_access_log','phi_consent','post_meal_walks','product_validation_tokens',
    'profiles','qa_monthly_usage','qa_submissions','shopping_lists','snack_logs',
    'subscriptions','user_badges','user_streaks','visitor_engagement_scores',
    'visitor_profiles','vita_similarity_log','water_logs','whatsapp_consent',
    'win_posts','workout_sessions'
  ];
BEGIN
  FOREACH t IN ARRAY personal_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
        || 'USING (public.member_access_allowed()) WITH CHECK (public.member_access_allowed())',
        'deletion_lock_' || t, t
      );
    END IF;
  END LOOP;
END $$;