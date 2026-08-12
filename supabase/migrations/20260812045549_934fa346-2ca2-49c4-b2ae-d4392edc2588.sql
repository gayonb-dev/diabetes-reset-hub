-- Export artifacts: one-time, short-lived download links.
CREATE TABLE public.export_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  format text NOT NULL CHECK (format IN ('json','zip')),
  token_hash text NOT NULL UNIQUE,
  content bytea NOT NULL,
  byte_size integer NOT NULL,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.export_artifacts TO service_role;

ALTER TABLE public.export_artifacts ENABLE ROW LEVEL SECURITY;

-- No member-facing policy at all: the table is reachable only through the
-- service-role download endpoint, which enforces the one-time token.
CREATE POLICY "export_artifacts_no_client_access"
  ON public.export_artifacts FOR SELECT TO authenticated, anon USING (false);

CREATE INDEX idx_export_artifacts_expiry ON public.export_artifacts (expires_at);

-- Five-minute lifetime is enforced by trigger (CHECK cannot use now()).
CREATE OR REPLACE FUNCTION public.enforce_export_artifact_lifetime()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at > NEW.created_at + interval '5 minutes' THEN
    RAISE EXCEPTION 'export artifact lifetime may not exceed 5 minutes';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_export_artifact_lifetime
  BEFORE INSERT ON public.export_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_export_artifact_lifetime();

-- Atomic single-use consumption: exactly one caller can win.
CREATE OR REPLACE FUNCTION public.consume_export_artifact(p_token_hash text)
RETURNS TABLE(id uuid, user_id uuid, format text, byte_size integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.export_artifacts a
     SET consumed_at = now()
   WHERE a.token_hash = p_token_hash
     AND a.consumed_at IS NULL
     AND a.expires_at > now()
  RETURNING a.id, a.user_id, a.format, a.byte_size;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_export_artifact(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.purge_expired_export_artifacts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_n integer;
BEGIN
  WITH d AS (DELETE FROM public.export_artifacts WHERE expires_at <= now() RETURNING 1)
  SELECT count(*) INTO v_n FROM d;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_export_artifacts() FROM PUBLIC, anon, authenticated;

-- Deletion job reconciliation + minimal receipt.
ALTER TABLE public.deletion_jobs
  ADD COLUMN IF NOT EXISTS reconciliation jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS receipt jsonb;