
-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  date_of_birth date,
  program_start_date date,
  community_display_name text,
  notification_prefs jsonb NOT NULL DEFAULT '{
    "daily_action": true,
    "water": true,
    "streak_at_risk": true,
    "measurement": true,
    "workout": true,
    "a1c": true,
    "vita_morning": true,
    "cheat_meal": true,
    "community_mission": true,
    "birthday": true,
    "level_up": true
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Members mark own notifications read" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all notifications" ON public.notifications
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Backfill profile rows for existing auth users
INSERT INTO public.profiles (user_id, first_name)
SELECT id, COALESCE(raw_user_meta_data->>'first_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
