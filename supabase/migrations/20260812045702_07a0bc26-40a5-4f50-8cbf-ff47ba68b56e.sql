ALTER TABLE public.deletion_jobs ADD COLUMN IF NOT EXISTS subject_ref uuid;

UPDATE public.deletion_jobs SET subject_ref = user_id WHERE subject_ref IS NULL;

ALTER TABLE public.deletion_jobs ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.deletion_jobs DROP CONSTRAINT IF EXISTS deletion_jobs_user_id_fkey;

ALTER TABLE public.deletion_jobs
  ADD CONSTRAINT deletion_jobs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_deletion_job_subject_ref()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.subject_ref := COALESCE(NEW.subject_ref, NEW.user_id, OLD.subject_ref);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deletion_job_subject_ref ON public.deletion_jobs;
CREATE TRIGGER trg_deletion_job_subject_ref
BEFORE INSERT OR UPDATE ON public.deletion_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_deletion_job_subject_ref();

CREATE OR REPLACE FUNCTION public.sync_deletion_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_locked boolean;
BEGIN
  IF NEW.state = 'access_blocked' AND NEW.access_blocked_at IS NULL THEN
    NEW.access_blocked_at := now();
  END IF;

  v_locked := NEW.state IN ('access_blocked','in_progress','waiting_for_processor',
                            'reconciled','partial','failed');

  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles SET deletion_pending = v_locked WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;