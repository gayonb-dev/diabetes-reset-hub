
-- ============================================================
-- Phase A: Visitor identity + conversations + PHI gate
-- ============================================================

-- VISITOR PROFILES
CREATE TABLE public.visitor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT,
  confidence NUMERIC NOT NULL DEFAULT 1.0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_visitor_profiles_user_id ON public.visitor_profiles(user_id);
CREATE INDEX idx_visitor_profiles_last_activity ON public.visitor_profiles(last_activity_at);

ALTER TABLE public.visitor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own visitor profile"
  ON public.visitor_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins manage visitor profiles"
  ON public.visitor_profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages visitor profiles"
  ON public.visitor_profiles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_visitor_profiles_updated
  BEFORE UPDATE ON public.visitor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CONVERSATIONS
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_profile_id UUID NOT NULL REFERENCES public.visitor_profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_visitor ON public.conversations(visitor_profile_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own conversations"
  ON public.conversations FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.visitor_profiles vp
      WHERE vp.id = conversations.visitor_profile_id AND vp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage conversations"
  ON public.conversations FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages conversations"
  ON public.conversations FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_conversations_updated
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  visitor_profile_id UUID NOT NULL REFERENCES public.visitor_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  classifier JSONB NOT NULL DEFAULT '{}'::jsonb,
  contains_phi BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_visitor ON public.messages(visitor_profile_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own messages"
  ON public.messages FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.visitor_profiles vp
      WHERE vp.id = messages.visitor_profile_id AND vp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage messages"
  ON public.messages FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages messages"
  ON public.messages FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- PHI CONSENT
CREATE TABLE public.phi_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_profile_id UUID NOT NULL REFERENCES public.visitor_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  policy_version TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_phi_consent_visitor ON public.phi_consent(visitor_profile_id);
CREATE INDEX idx_phi_consent_user ON public.phi_consent(user_id);

ALTER TABLE public.phi_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own consent"
  ON public.phi_consent FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins manage phi_consent"
  ON public.phi_consent FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages phi_consent"
  ON public.phi_consent FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- PHI ACCESS LOG
CREATE TABLE public.phi_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_kind TEXT NOT NULL DEFAULT 'service', -- 'service' | 'admin' | 'system'
  visitor_profile_id UUID REFERENCES public.visitor_profiles(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  row_id UUID,
  reason TEXT NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_phi_access_visitor ON public.phi_access_log(visitor_profile_id);
CREATE INDEX idx_phi_access_time ON public.phi_access_log(accessed_at);

ALTER TABLE public.phi_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read phi_access_log"
  ON public.phi_access_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role writes phi_access_log"
  ON public.phi_access_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- DELETION REQUESTS
CREATE TABLE public.deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_profile_id UUID REFERENCES public.visitor_profiles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_deletion_requests_status ON public.deletion_requests(status);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own deletion requests"
  ON public.deletion_requests FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins manage deletion_requests"
  ON public.deletion_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages deletion_requests"
  ON public.deletion_requests FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_deletion_requests_updated
  BEFORE UPDATE ON public.deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
