
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS meal_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill from visitor_profiles.metadata for existing members
UPDATE public.profiles p
SET meal_preferences = jsonb_strip_nulls(jsonb_build_object(
    'cuisine_preferences', vp.metadata->'cuisine_preferences',
    'protein_preferences', vp.metadata->'protein_preferences',
    'foods_to_avoid',      vp.metadata->'foods_to_avoid',
    'allergies',           vp.metadata->'allergies',
    'cooking_time',        vp.metadata->'cooking_time'
  ))
FROM public.visitor_profiles vp
WHERE vp.user_id = p.user_id
  AND p.meal_preferences = '{}'::jsonb
  AND vp.metadata IS NOT NULL;
