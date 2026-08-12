-- 1. Limited pre-deletion restriction flag, separate from the full lock.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_restricted boolean NOT NULL DEFAULT false;

-- 2. Restriction predicate. Fails closed on an indeterminate lookup.
CREATE OR REPLACE FUNCTION public.deletion_restricted_active(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_r boolean;
BEGIN
  IF p_user_id IS NULL THEN RETURN true; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.deletion_jobs j
    WHERE j.user_id = p_user_id
      AND j.identity_verified_at IS NOT NULL
      AND j.state = 'blocked_on_processor'
  ) INTO v_r;
  IF v_r IS NULL THEN RETURN true; END IF;
  RETURN v_r;
EXCEPTION WHEN OTHERS THEN
  RETURN true;
END;
$$;

-- 3. Write predicate: full lock OR limited restriction denies new/changed data.
CREATE OR REPLACE FUNCTION public.member_write_allowed()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.member_access_allowed()
     AND NOT public.deletion_restricted_active(auth.uid())
$$;

-- 4. Apply the write predicate to every deletion-lock policy's WITH CHECK.
DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND policyname LIKE 'deletion_lock_%'
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON public.%I USING (public.member_access_allowed()) '
      'WITH CHECK (public.member_write_allowed())', r.policyname, r.tablename);
  END LOOP;
END
$do$;

-- 5. Lifecycle sync: blocked_on_processor restricts, it does not fully lock.
CREATE OR REPLACE FUNCTION public.sync_deletion_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_locked boolean;
  v_restricted boolean;
BEGIN
  IF NEW.state = 'access_blocked' AND NEW.access_blocked_at IS NULL THEN
    NEW.access_blocked_at := now();
  END IF;

  v_locked := NEW.state IN ('access_blocked','in_progress','waiting_for_processor',
                            'reconciled','partial','failed');
  v_restricted := NEW.state = 'blocked_on_processor';

  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
       SET deletion_pending = v_locked,
           deletion_restricted = v_restricted
     WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Members may not read the raw job row: it carries exact processor object ids.
DROP POLICY IF EXISTS "members read own deletion jobs" ON public.deletion_jobs;

-- 7. Sanitised member-facing status. No processor ids, no owner_action text.
CREATE OR REPLACE FUNCTION public.my_deletion_status()
RETURNS TABLE(state text, requested_at timestamptz, local_account_deletion text,
              processors_pending text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    j.state::text,
    j.requested_at,
    COALESCE(j.receipt->>'local_account_deletion', 'not_started'),
    COALESCE(
      (SELECT array_agg(
         CASE WHEN p->>'processor' = 'stripe'
                AND p->>'item' ILIKE '%subscription cancellation%'
              THEN 'Stripe subscription cancellation pending'
              ELSE (p->>'processor') || ': pending' END)
       FROM jsonb_array_elements(COALESCE(j.processor_items, '[]'::jsonb)) p
       WHERE p->>'status' = 'tracked_not_verified'),
      ARRAY[]::text[])
  FROM public.deletion_jobs j
  WHERE j.user_id = auth.uid()
  ORDER BY j.created_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.my_deletion_status() TO authenticated;

-- 8. Members may not set their own deletion flags; only the server may.
CREATE OR REPLACE FUNCTION public.guard_profile_deletion_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND pg_trigger_depth() = 1 THEN
    NEW.deletion_pending := OLD.deletion_pending;
    NEW.deletion_restricted := OLD.deletion_restricted;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_deletion_flags ON public.profiles;
CREATE TRIGGER trg_guard_profile_deletion_flags
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_deletion_flags();