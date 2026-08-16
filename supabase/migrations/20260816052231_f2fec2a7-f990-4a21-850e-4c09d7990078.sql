DO $$
DECLARE v_exists boolean; v_nonnull bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'user_agent'
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'fail_closed: public.support_tickets.user_agent does not exist; refusing to proceed';
  END IF;

  EXECUTE 'SELECT count(*) FROM public.support_tickets WHERE user_agent IS NOT NULL' INTO v_nonnull;
  RAISE NOTICE 'observed non-null support_tickets.user_agent count = %', v_nonnull;

  IF v_nonnull <> 0 THEN
    RAISE EXCEPTION 'fail_closed: % non-null user_agent values present; refusing destructive removal', v_nonnull;
  END IF;

  EXECUTE 'ALTER TABLE public.support_tickets DROP COLUMN user_agent';
END $$;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS client_platform text,
  ADD COLUMN IF NOT EXISTS client_viewport text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_client_platform_check') THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_client_platform_check
      CHECK (client_platform IS NULL OR client_platform IN ('web','ios','android','unknown'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_client_viewport_check') THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_client_viewport_check
      CHECK (client_viewport IS NULL OR client_viewport IN ('mobile','desktop'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS daily_actions_one_active_per_day
  ON public.daily_actions (day_number) WHERE is_active;