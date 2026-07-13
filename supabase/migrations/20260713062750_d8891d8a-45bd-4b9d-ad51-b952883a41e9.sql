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

UPDATE public.visitor_profiles vp
SET community_badges_earned = (
  SELECT jsonb_agg(DISTINCT x)
  FROM jsonb_array_elements_text(
    COALESCE(vp.community_badges_earned, '[]'::jsonb) || '["voice-of-the-community"]'::jsonb
  ) AS x
)
FROM public.user_badges ub
JOIN public.badges b ON b.id = ub.badge_id
WHERE ub.user_id = vp.user_id
  AND b.slug = 'voice-of-the-community'
  AND NOT (COALESCE(vp.community_badges_earned, '[]'::jsonb) @> '["voice-of-the-community"]'::jsonb);