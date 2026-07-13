## Fix NULL-safe visitor_profiles mirror in badge backfill

The prior backfill migration (already applied, do NOT edit) contained two `UPDATE public.visitor_profiles` statements that mirror newly-awarded badge slugs into `badges_earned` and `community_badges_earned`. Both are unsafe when the target jsonb column is NULL:

- `NULL || '["slug"]'::jsonb` → NULL (would blank the column)
- `NOT (NULL @> '["slug"]'::jsonb)` → NULL (silently skips the row, so it never mirrors)

### Change

Create ONE new migration containing only the two re-run UPDATEs, both wrapped in `COALESCE(col, '[]'::jsonb)` on every read of the jsonb column.

**Statement 1 — `full-house` → `badges_earned`:**

```sql
UPDATE public.visitor_profiles vp
SET badges_earned = (
  SELECT jsonb_agg(DISTINCT x)
  FROM jsonb_array_elements_text(
    COALESCE(vp.badges_earned, '[]'::jsonb) || '["full-house"]'::jsonb
  ) AS x
)
FROM public.user_badges ub
JOIN public.badges b ON b.id = ub.badge_id
WHERE ub.user_id = vp.user_id
  AND b.slug = 'full-house'
  AND NOT (COALESCE(vp.badges_earned, '[]'::jsonb) @> '["full-house"]'::jsonb);
```

**Statement 2 — `voice-of-the-community` → `community_badges_earned`:** same pattern, swapping the slug and column name.

Both are idempotent — safe to re-run against current data.

### Files

- **New:** `supabase/migrations/<ts>_visitor_profiles_mirror_null_safe.sql` — the two UPDATEs above.
- No changes to `award-badges/index.ts` (its TS mirror already handles NULL correctly).
- No changes to the previously-applied backfill migration.
