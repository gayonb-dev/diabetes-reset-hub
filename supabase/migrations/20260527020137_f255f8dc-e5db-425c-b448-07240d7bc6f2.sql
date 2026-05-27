
-- =========================================================
-- Phase 3 — DRM Section 25 schema additions
-- =========================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------- visitor_profiles: new member profile fields ----------
ALTER TABLE public.visitor_profiles
  ADD COLUMN IF NOT EXISTS streak_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_freeze_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS level_earned_at timestamptz,
  ADD COLUMN IF NOT EXISTS reset_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS helpful_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badges_earned jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS community_badges_earned jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_ring_close_at timestamptz,
  ADD COLUMN IF NOT EXISTS streak_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS served_meals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS community_display_name text,
  ADD COLUMN IF NOT EXISTS lowers_blood_sugar_meds boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS if_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS if_window_hours integer,
  ADD COLUMN IF NOT EXISTS cheat_meal_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cheat_meal_day_of_week integer,
  ADD COLUMN IF NOT EXISTS phase_1_extension_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_program_phase integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS getting_started_checklist jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ---------- meal_plans ----------
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  plan_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  valid_from date NOT NULL,
  valid_until date NOT NULL,
  generation_trigger text NOT NULL CHECK (generation_trigger IN ('onboarding','scheduled','preference_change')),
  preferences_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  generation_status text NOT NULL DEFAULT 'pending' CHECK (generation_status IN ('pending','complete','failed')),
  plan_type text NOT NULL DEFAULT 'standard' CHECK (plan_type IN ('standard','intermittent_fasting')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
GRANT ALL ON public.meal_plans TO service_role;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own meal_plans" ON public.meal_plans FOR SELECT USING (auth.uid() = member_id);
CREATE POLICY "Admins manage meal_plans" ON public.meal_plans FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Service role manages meal_plans" ON public.meal_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_meal_plans_member ON public.meal_plans(member_id, valid_until DESC);

-- ---------- meal_swaps ----------
CREATE TABLE IF NOT EXISTS public.meal_swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  day text NOT NULL CHECK (day IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','meal_1','meal_2','snack_1','snack_2')),
  swapped_to jsonb NOT NULL,
  swapped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_swaps TO authenticated;
GRANT ALL ON public.meal_swaps TO service_role;
ALTER TABLE public.meal_swaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own meal_swaps" ON public.meal_swaps FOR ALL USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Admins read meal_swaps" ON public.meal_swaps FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_meal_swaps_plan ON public.meal_swaps(plan_id);

-- ---------- shopping_lists ----------
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  week_start_date date NOT NULL,
  list_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO authenticated;
GRANT ALL ON public.shopping_lists TO service_role;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own shopping_lists" ON public.shopping_lists FOR ALL USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Admins read shopping_lists" ON public.shopping_lists FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_shopping_lists_member_week ON public.shopping_lists(member_id, week_start_date DESC);

-- ---------- daily_actions ----------
CREATE TABLE IF NOT EXISTS public.daily_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number integer NOT NULL,
  phase_number integer NOT NULL,
  day_name text NOT NULL,
  action_title text NOT NULL,
  action_description text NOT NULL,
  action_detail_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_type text NOT NULL CHECK (action_type IN ('education','habit','challenge','reflection','measurement')),
  sub_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_extension_day boolean NOT NULL DEFAULT false,
  learning_objective text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_actions TO authenticated;
GRANT ALL ON public.daily_actions TO service_role;
ALTER TABLE public.daily_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active members read daily_actions" ON public.daily_actions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = auth.uid() AND s.status IN ('trialing','active','past_due'))
);
CREATE POLICY "Admins manage daily_actions" ON public.daily_actions FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_daily_actions_day ON public.daily_actions(day_number);
CREATE TRIGGER trg_daily_actions_updated_at BEFORE UPDATE ON public.daily_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- member_daily_progress ----------
CREATE TABLE IF NOT EXISTS public.member_daily_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  day_number integer NOT NULL,
  action_id uuid NOT NULL REFERENCES public.daily_actions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  completed_at timestamptz,
  sub_tasks_completed jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, action_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_daily_progress TO authenticated;
GRANT ALL ON public.member_daily_progress TO service_role;
ALTER TABLE public.member_daily_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own daily_progress" ON public.member_daily_progress FOR ALL USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Admins read all daily_progress" ON public.member_daily_progress FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_mdp_member_day ON public.member_daily_progress(member_id, day_number);
CREATE TRIGGER trg_mdp_updated_at BEFORE UPDATE ON public.member_daily_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- community_questions ----------
CREATE TABLE IF NOT EXISTS public.community_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  content text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  is_anonymous boolean NOT NULL DEFAULT false,
  display_name text,
  author_day_in_program integer,
  upvote_count integer NOT NULL DEFAULT 0,
  metoo_count integer NOT NULL DEFAULT 0,
  answer_count integer NOT NULL DEFAULT 0,
  is_verified_answered boolean NOT NULL DEFAULT false,
  is_question_of_day boolean NOT NULL DEFAULT false,
  question_of_day_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_questions TO authenticated;
GRANT ALL ON public.community_questions TO service_role;
ALTER TABLE public.community_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active members read community_questions" ON public.community_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = auth.uid() AND s.status IN ('trialing','active','past_due'))
);
CREATE POLICY "Members insert own questions" ON public.community_questions FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update own questions" ON public.community_questions FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Admins manage community_questions" ON public.community_questions FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_cq_created ON public.community_questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cq_qotd ON public.community_questions(question_of_day_date) WHERE is_question_of_day = true;
CREATE TRIGGER trg_cq_updated_at BEFORE UPDATE ON public.community_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- community_answers ----------
CREATE TABLE IF NOT EXISTS public.community_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.community_questions(id) ON DELETE CASCADE,
  author_id uuid,
  is_admin_response boolean NOT NULL DEFAULT false,
  is_vita_response boolean NOT NULL DEFAULT false,
  content text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  display_name text,
  author_day_in_program integer,
  helpful_count integer NOT NULL DEFAULT 0,
  is_marked_helpful boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  related_content_slug text,
  admin_related_content_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_answers TO authenticated;
GRANT ALL ON public.community_answers TO service_role;
ALTER TABLE public.community_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active members read community_answers" ON public.community_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = auth.uid() AND s.status IN ('trialing','active','past_due'))
);
CREATE POLICY "Members insert own answers" ON public.community_answers FOR INSERT WITH CHECK (auth.uid() = author_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "Authors update own answers" ON public.community_answers FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Admins manage community_answers" ON public.community_answers FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ca_question ON public.community_answers(question_id, created_at DESC);

-- ---------- community_votes ----------
CREATE TABLE IF NOT EXISTS public.community_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('question','answer')),
  target_id uuid NOT NULL,
  vote_type text NOT NULL CHECK (vote_type IN ('upvote','metoo','helpful','reaction')),
  reaction_emoji text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voter_id, target_type, target_id, vote_type)
);
GRANT SELECT, INSERT, DELETE ON public.community_votes TO authenticated;
GRANT ALL ON public.community_votes TO service_role;
ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own votes" ON public.community_votes FOR ALL USING (auth.uid() = voter_id) WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "Active members read community_votes" ON public.community_votes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = auth.uid() AND s.status IN ('trialing','active','past_due'))
);
CREATE POLICY "Admins manage community_votes" ON public.community_votes FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_cv_target ON public.community_votes(target_type, target_id);

-- ---------- win_posts ----------
CREATE TABLE IF NOT EXISTS public.win_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  milestone_type text NOT NULL CHECK (milestone_type IN ('prediabetic_range','normal_range','30_day_streak','10_percent_weight','a1c_below_6_5','other')),
  milestone_label text NOT NULL,
  stat_improvement text,
  share_stat boolean NOT NULL DEFAULT false,
  is_anonymous boolean NOT NULL DEFAULT false,
  display_name text,
  author_day_in_program integer,
  reaction_counts jsonb NOT NULL DEFAULT '{"muscle":0,"fist":0,"fire":0,"clap":0}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.win_posts TO authenticated;
GRANT ALL ON public.win_posts TO service_role;
ALTER TABLE public.win_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active members read win_posts" ON public.win_posts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = auth.uid() AND s.status IN ('trialing','active','past_due'))
);
CREATE POLICY "Members insert own wins" ON public.win_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update own wins" ON public.win_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Admins manage win_posts" ON public.win_posts FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_wp_created ON public.win_posts(created_at DESC);

-- ---------- community_answer_embeddings (pgvector) ----------
CREATE TABLE IF NOT EXISTS public.community_answer_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES public.community_answers(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.community_questions(id) ON DELETE CASCADE,
  embedding vector(1536),
  combined_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_answer_embeddings TO authenticated;
GRANT ALL ON public.community_answer_embeddings TO service_role;
ALTER TABLE public.community_answer_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active members read embeddings" ON public.community_answer_embeddings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = auth.uid() AND s.status IN ('trialing','active','past_due'))
);
CREATE POLICY "Admins manage embeddings" ON public.community_answer_embeddings FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_cae_ivfflat ON public.community_answer_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ---------- if_fasting_log ----------
CREATE TABLE IF NOT EXISTS public.if_fasting_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  fast_start_at timestamptz NOT NULL,
  fast_end_at timestamptz,
  planned_duration_hours integer NOT NULL,
  actual_duration_hours numeric,
  window_type text NOT NULL CHECK (window_type IN ('14_10','16_8','12_12')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','broken')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.if_fasting_log TO authenticated;
GRANT ALL ON public.if_fasting_log TO service_role;
ALTER TABLE public.if_fasting_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own if_fasting_log" ON public.if_fasting_log FOR ALL USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Admins read if_fasting_log" ON public.if_fasting_log FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_if_member_start ON public.if_fasting_log(member_id, fast_start_at DESC);

-- ---------- cheat_meals ----------
CREATE TABLE IF NOT EXISTS public.cheat_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  meal_description text,
  fast_start_at timestamptz,
  week_start_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, week_start_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cheat_meals TO authenticated;
GRANT ALL ON public.cheat_meals TO service_role;
ALTER TABLE public.cheat_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own cheat_meals" ON public.cheat_meals FOR ALL USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Admins read cheat_meals" ON public.cheat_meals FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_cheat_member ON public.cheat_meals(member_id, week_start_date DESC);

-- ---------- product_validation_tokens ----------
CREATE TABLE IF NOT EXISTS public.product_validation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  product_idea_id uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_validation_tokens TO authenticated;
GRANT ALL ON public.product_validation_tokens TO service_role;
ALTER TABLE public.product_validation_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own validation tokens" ON public.product_validation_tokens FOR SELECT USING (auth.uid() = member_id);
CREATE POLICY "Admins manage validation tokens" ON public.product_validation_tokens FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_pvt_token ON public.product_validation_tokens(token);

-- ---------- activity_events: add missing index for purge cron ----------
CREATE INDEX IF NOT EXISTS idx_ae_visitor_event_at ON public.activity_events(visitor_profile_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_user_event_at ON public.activity_events(user_id, event_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ae_type_event_at ON public.activity_events(event_type, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_event_at ON public.activity_events(event_at);
