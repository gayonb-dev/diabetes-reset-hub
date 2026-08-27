CREATE TABLE IF NOT EXISTS public.coaching_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  status text NOT NULL DEFAULT 'interested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coaching_interest_status_chk CHECK (status IN ('interested','withdrawn','contacted','closed')),
  CONSTRAINT coaching_interest_one_per_user UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_interest TO authenticated;
GRANT ALL ON public.coaching_interest TO service_role;

ALTER TABLE public.coaching_interest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coaching_interest_self_manage" ON public.coaching_interest;
CREATE POLICY "coaching_interest_self_manage" ON public.coaching_interest
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "coaching_interest_admin_manage" ON public.coaching_interest;
CREATE POLICY "coaching_interest_admin_manage" ON public.coaching_interest
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS coaching_interest_status_idx ON public.coaching_interest (status, created_at DESC);

DROP TRIGGER IF EXISTS coaching_interest_set_updated_at ON public.coaching_interest;
CREATE TRIGGER coaching_interest_set_updated_at
  BEFORE UPDATE ON public.coaching_interest
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();