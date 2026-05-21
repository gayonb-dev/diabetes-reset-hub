-- ================================================================
-- USER ROLES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    text NOT NULL CHECK (role IN ('member','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = p_role
  );
$$;

-- Admins manage all roles; no self-grant path for regular users
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ================================================================
-- SUBSCRIPTIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id   text UNIQUE NOT NULL,
  stripe_customer_id       text NOT NULL,
  status                   text NOT NULL CHECK (status IN ('trialing','active','past_due','cancelled','incomplete','unpaid')),
  tier                     text NOT NULL DEFAULT 'standard',
  trial_end_date           timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean NOT NULL DEFAULT false,
  day_number               integer NOT NULL DEFAULT 1,
  last_active_at           timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all subscriptions"
  ON public.subscriptions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================================
-- CONTENT ITEMS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.content_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL CHECK (type IN ('recipe','plate_method','movement','mini_challenge','article','reset_day')),
  slug        text UNIQUE NOT NULL,
  title       text NOT NULL,
  summary     text,
  body        text,
  hero_image  text,
  day_unlock  integer NOT NULL DEFAULT 0,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members read active content"
  ON public.content_items FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.status IN ('trialing','active','past_due')
    )
  );

CREATE POLICY "Admins manage content"
  ON public.content_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================================
-- MEMBER PROGRESS (guided 7-Day Reset Sprint)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.member_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number   integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  notes        text,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_number)
);
ALTER TABLE public.member_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own progress"
  ON public.member_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Members insert own progress"
  ON public.member_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members update own progress"
  ON public.member_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all progress"
  ON public.member_progress FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ================================================================
-- Q&A SUBMISSIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.qa_submissions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question                text NOT NULL,
  question_type           text NOT NULL CHECK (question_type IN ('quick','detailed')),
  points_cost             integer NOT NULL CHECK (points_cost IN (1,2)),
  status                  text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','answered','published','rejected')),
  answer                  text,
  answered_at             timestamptz,
  publish_anonymously     boolean NOT NULL DEFAULT false,
  category                text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.qa_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own questions"
  ON public.qa_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Members insert own questions"
  ON public.qa_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Published-anonymously answers visible to any active member
CREATE POLICY "Active members read published answers"
  ON public.qa_submissions FOR SELECT
  USING (
    status = 'published'
    AND publish_anonymously = true
    AND EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.status IN ('trialing','active','past_due')
    )
  );

CREATE POLICY "Admins manage Q&A"
  ON public.qa_submissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_qa_submissions_updated_at
  BEFORE UPDATE ON public.qa_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================================
-- Q&A MONTHLY USAGE (cap = 4 points/month)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.qa_monthly_usage (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month    date NOT NULL, -- always first of month
  points_used     integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_month)
);
ALTER TABLE public.qa_monthly_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own Q&A usage"
  ON public.qa_monthly_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage Q&A usage"
  ON public.qa_monthly_usage FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_qa_monthly_usage_updated_at
  BEFORE UPDATE ON public.qa_monthly_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================================
-- WHATSAPP CONSENT (explicit opt-in, ToS compliance)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_consent (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number  text NOT NULL,
  opted_in_at   timestamptz NOT NULL DEFAULT now(),
  opt_in_ip     text,
  revoked_at    timestamptz,
  revoke_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE public.whatsapp_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own consent"
  ON public.whatsapp_consent FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Members insert own consent"
  ON public.whatsapp_consent FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members update own consent"
  ON public.whatsapp_consent FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all consent"
  ON public.whatsapp_consent FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ================================================================
-- BROADCAST LOG (admin record of sent broadcasts)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.broadcast_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel     text NOT NULL CHECK (channel IN ('whatsapp','email')),
  audience    text NOT NULL,
  subject     text,
  body        text NOT NULL,
  sent_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipients_count integer NOT NULL DEFAULT 0,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.broadcast_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage broadcast log"
  ON public.broadcast_log FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ================================================================
-- DUNNING ATTEMPTS (failed payment retries)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.dunning_attempts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id  text,
  attempt_number     integer NOT NULL DEFAULT 1,
  status             text NOT NULL CHECK (status IN ('pending','succeeded','failed','abandoned')),
  failure_reason     text,
  attempted_at       timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dunning_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own dunning"
  ON public.dunning_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage dunning"
  ON public.dunning_attempts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_content_items_type_active ON public.content_items(type, is_active);
CREATE INDEX IF NOT EXISTS idx_content_items_day_unlock ON public.content_items(day_unlock);
CREATE INDEX IF NOT EXISTS idx_member_progress_user ON public.member_progress(user_id, day_number);
CREATE INDEX IF NOT EXISTS idx_qa_submissions_user ON public.qa_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_submissions_status ON public.qa_submissions(status);
CREATE INDEX IF NOT EXISTS idx_qa_usage_user_month ON public.qa_monthly_usage(user_id, period_month);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);