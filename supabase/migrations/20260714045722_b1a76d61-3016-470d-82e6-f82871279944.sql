
-- 1) dexcom_connections
CREATE TABLE public.dexcom_connections (
  member_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token_enc bytea NOT NULL,
  refresh_token_enc bytea NOT NULL,
  token_iv bytea NOT NULL,
  refresh_iv bytea NOT NULL,
  expires_at timestamptz NOT NULL,
  dexcom_user_id text,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','production')),
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  earliest_egv_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dexcom_connections TO authenticated;
GRANT ALL ON public.dexcom_connections TO service_role;

ALTER TABLE public.dexcom_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own dexcom connection"
  ON public.dexcom_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id);

CREATE TRIGGER update_dexcom_connections_updated_at
  BEFORE UPDATE ON public.dexcom_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) state_nonces (OAuth replay protection, service-role only)
CREATE TABLE public.state_nonces (
  nonce text PRIMARY KEY,
  member_id uuid NOT NULL,
  purpose text NOT NULL DEFAULT 'dexcom_oauth',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.state_nonces TO service_role;

ALTER TABLE public.state_nonces ENABLE ROW LEVEL SECURITY;
-- No policies: authenticated/anon have no access; service role bypasses RLS.

CREATE INDEX state_nonces_expires_at_idx ON public.state_nonces(expires_at);

-- 3) blood_sugar_readings extensions
ALTER TABLE public.blood_sugar_readings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id text;

ALTER TABLE public.blood_sugar_readings
  DROP CONSTRAINT IF EXISTS blood_sugar_readings_source_chk;
ALTER TABLE public.blood_sugar_readings
  ADD CONSTRAINT blood_sugar_readings_source_chk
  CHECK (source IN ('manual','dexcom'));

ALTER TABLE public.blood_sugar_readings
  DROP CONSTRAINT IF EXISTS blood_sugar_readings_reading_type_check;
ALTER TABLE public.blood_sugar_readings
  ADD CONSTRAINT blood_sugar_readings_reading_type_check
  CHECK (reading_type IN ('fasting','post_meal','bedtime','other','cgm'));

CREATE UNIQUE INDEX IF NOT EXISTS blood_sugar_readings_dexcom_extid
  ON public.blood_sugar_readings (member_id, external_id)
  WHERE source = 'dexcom' AND external_id IS NOT NULL;
