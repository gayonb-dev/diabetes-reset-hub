
-- Coaching waitlist for high-ticket 1:1 program
CREATE TABLE IF NOT EXISTS public.coaching_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  why_now text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','enrolled','declined')),
  eligible_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.coaching_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see own waitlist row"
  ON public.coaching_waitlist FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Members insert own waitlist row"
  ON public.coaching_waitlist FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members update own waitlist row"
  ON public.coaching_waitlist FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admin full access to waitlist"
  ON public.coaching_waitlist FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_coaching_waitlist_updated_at
  BEFORE UPDATE ON public.coaching_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin RLS on all Phase 5 tables (members already covered; ensure admin can read)
CREATE POLICY "Admin read subscriptions"
  ON public.subscriptions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin all qa_submissions"
  ON public.qa_submissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin all content_items"
  ON public.content_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin all broadcast_log"
  ON public.broadcast_log FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin read dunning_attempts"
  ON public.dunning_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
