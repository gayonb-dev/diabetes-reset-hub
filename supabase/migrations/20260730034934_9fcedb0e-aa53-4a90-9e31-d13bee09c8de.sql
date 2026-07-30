CREATE TABLE public.oauth_client_grants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL,
  client_id text NOT NULL,
  client_name text,
  scopes text[] NOT NULL DEFAULT '{}',
  approved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, client_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_client_grants TO authenticated;
GRANT ALL ON public.oauth_client_grants TO service_role;

ALTER TABLE public.oauth_client_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own assistant grants"
  ON public.oauth_client_grants FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

CREATE POLICY "First-party sessions insert own assistant grants"
  ON public.oauth_client_grants FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = member_id
    AND (auth.jwt() ->> 'client_id') IS NULL
    AND (auth.jwt() ->> 'azp') IS NULL
  );

CREATE POLICY "First-party sessions update own assistant grants"
  ON public.oauth_client_grants FOR UPDATE TO authenticated
  USING (
    auth.uid() = member_id
    AND (auth.jwt() ->> 'client_id') IS NULL
    AND (auth.jwt() ->> 'azp') IS NULL
  )
  WITH CHECK (
    auth.uid() = member_id
    AND (auth.jwt() ->> 'client_id') IS NULL
    AND (auth.jwt() ->> 'azp') IS NULL
  );

CREATE POLICY "First-party sessions delete own assistant grants"
  ON public.oauth_client_grants FOR DELETE TO authenticated
  USING (
    auth.uid() = member_id
    AND (auth.jwt() ->> 'client_id') IS NULL
    AND (auth.jwt() ->> 'azp') IS NULL
  );

CREATE TRIGGER update_oauth_client_grants_updated_at
  BEFORE UPDATE ON public.oauth_client_grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();