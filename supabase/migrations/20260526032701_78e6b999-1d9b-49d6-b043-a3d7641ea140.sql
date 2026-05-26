-- Streaks per user
CREATE TABLE public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own streak" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins manage streaks" ON public.user_streaks
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages streaks" ON public.user_streaks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Badge catalog
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'bronze',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads badges" ON public.badges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage badges" ON public.badges
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Badges earned by users
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own badges" ON public.user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins manage user_badges" ON public.user_badges
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages user_badges" ON public.user_badges
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Helper: award XP and recompute level (level = 1 + floor(xp/100))
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id UUID, p_amount INTEGER)
RETURNS TABLE(total_xp INTEGER, level INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_level INTEGER;
BEGIN
  INSERT INTO public.user_streaks (user_id, total_xp, level)
  VALUES (p_user_id, GREATEST(p_amount, 0), 1)
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = public.user_streaks.total_xp + GREATEST(p_amount, 0),
        updated_at = now()
  RETURNING public.user_streaks.total_xp INTO v_total;

  v_level := 1 + (v_total / 100);

  UPDATE public.user_streaks
  SET level = v_level
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_total, v_level;
END;
$$;

-- Helper: bump streak after a daily action (idempotent per day)
CREATE OR REPLACE FUNCTION public.bump_streak(p_user_id UUID)
RETURNS TABLE(current_streak INTEGER, longest_streak INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_last DATE;
  v_cur INTEGER;
  v_long INTEGER;
BEGIN
  SELECT s.last_active_date, s.current_streak, s.longest_streak
  INTO v_last, v_cur, v_long
  FROM public.user_streaks s WHERE s.user_id = p_user_id;

  IF v_last IS NULL THEN
    v_cur := 1;
  ELSIF v_last = v_today THEN
    -- already counted today
    RETURN QUERY SELECT v_cur, v_long;
    RETURN;
  ELSIF v_last = v_today - 1 THEN
    v_cur := COALESCE(v_cur, 0) + 1;
  ELSE
    v_cur := 1;
  END IF;

  v_long := GREATEST(COALESCE(v_long, 0), v_cur);

  INSERT INTO public.user_streaks
    (user_id, current_streak, longest_streak, last_active_date)
  VALUES (p_user_id, v_cur, v_long, v_today)
  ON CONFLICT (user_id) DO UPDATE
    SET current_streak = v_cur,
        longest_streak = v_long,
        last_active_date = v_today,
        updated_at = now();

  RETURN QUERY SELECT v_cur, v_long;
END;
$$;

-- Seed starter badges
INSERT INTO public.badges (slug, name, description, icon, xp_reward, tier, sort_order) VALUES
  ('first-drop',     'First Drop',       'Logged your first day.',                     'droplet',  10, 'bronze', 1),
  ('week-strong',    'Week Strong',      '7-day streak.',                              'flame',    50, 'silver', 2),
  ('thirty-reset',   '30-Day Reset',     '30-day streak — habit is forming.',          'trophy',  200, 'gold',   3),
  ('hydration-hero', 'Hydration Hero',   'Hit your water goal 5 days in a row.',       'glass-water', 30, 'bronze', 4),
  ('glucose-tracker','Glucose Tracker',  'Logged blood sugar 7 days in a row.',        'activity', 40, 'silver', 5);