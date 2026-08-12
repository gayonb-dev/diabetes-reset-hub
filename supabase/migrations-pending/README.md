# migrations-pending — now empty (both Prompt 4 migrations applied)

Both Prompt 4 §12 migrations were applied to production and now live in the
normal source-controlled history:

| Prepared file | Applied migration |
| --- | --- |
| `01_profiles_column_grants.sql` | `supabase/migrations/20260812205011_1e466ae5-8ffc-4b86-92dd-d43a3cc3cd12.sql` |
| `02_win_posts_reaction_counts.sql` | `supabase/migrations/20260812205011_1e466ae5-8ffc-4b86-92dd-d43a3cc3cd12.sql` (same transaction) |
| follow-up: remove leftover `anon` grant on `profiles` | `supabase/migrations/20260812205044_e08d0972-4131-4ea4-8c03-1749bf511cac.sql` |

## Rollback SQL (kept verbatim)

```sql
-- 01 rollback: restore the previous broader grant
BEGIN;
  REVOKE ALL ON public.profiles FROM authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
  GRANT ALL ON public.profiles TO service_role;
COMMIT;

-- follow-up rollback (only if the previous anon grant is ever needed again)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon;

-- 02 rollback
BEGIN;
  DROP TRIGGER IF EXISTS guard_win_post_insert ON public.win_posts;
  DROP FUNCTION IF EXISTS public.guard_win_post_insert();
COMMIT;
```

No synthetic users, rows, or test artifacts were created; verification was done
with catalog/privilege introspection only (`has_column_privilege`,
`has_table_privilege`, `pg_trigger`), so no real member data was touched.
