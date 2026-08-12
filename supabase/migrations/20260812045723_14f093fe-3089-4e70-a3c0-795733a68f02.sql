-- Audit remediation: rate-limit retention + new server-controlled gates.

-- 1) New gates. Defaults are the restrictive values.
INSERT INTO public.app_config (key, value)
VALUES ('stripe_deletion_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2) Indexed 24-hour purge for rate-limit rows.
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON public.rate_limits (window_start);

CREATE OR REPLACE FUNCTION public.purge_expired_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_n integer;
BEGIN
  WITH d AS (
    DELETE FROM public.rate_limits
     WHERE window_start < now() - interval '24 hours'
    RETURNING 1
  )
  SELECT count(*) INTO v_n FROM d;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_rate_limits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_expired_rate_limits() TO service_role;

-- 3) Remove legacy rate-limit rows whose bucket embedded a raw network address.
DELETE FROM public.rate_limits
 WHERE bucket LIKE 'session_start:%'
    OR (bucket LIKE 'chat:%' AND bucket !~ '^chat\|');