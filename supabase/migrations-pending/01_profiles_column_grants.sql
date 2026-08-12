-- Prompt 4 §12.1 — PREPARED, NOT APPLIED TO PRODUCTION.
-- Restrict the profiles grant to specific columns so the Data API cannot expose
-- or accept writes to lifecycle/deletion columns that only the server owns.
--
-- Apply only at publication, together with 02_win_posts_reaction_counts.sql.
-- Reversible: see the rollback block at the bottom.

BEGIN;

REVOKE ALL ON public.profiles FROM authenticated;

GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (
  user_id, first_name, last_name, email, phone, timezone, week_start_day,
  program_start_date, avatar_url, notification_preferences, units
) ON public.profiles TO authenticated;
GRANT UPDATE (
  first_name, last_name, phone, timezone, week_start_day,
  avatar_url, notification_preferences, units
) ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

COMMIT;

-- ROLLBACK (restores the previous, broader grant):
-- BEGIN;
--   REVOKE ALL ON public.profiles FROM authenticated;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
--   GRANT ALL ON public.profiles TO service_role;
-- COMMIT;
