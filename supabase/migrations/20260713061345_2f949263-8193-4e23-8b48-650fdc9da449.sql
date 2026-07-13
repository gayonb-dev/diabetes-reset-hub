WITH user_start AS (
  SELECT
    u.id AS user_id,
    COALESCE(
      p.program_start_date,
      (SELECT MIN(s.created_at)::date FROM public.subscriptions s WHERE s.user_id = u.id),
      CURRENT_DATE
    ) AS start_date
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
),
water AS (
  SELECT member_id AS user_id, log_date, SUM(ounces)::int AS oz
  FROM public.water_logs GROUP BY member_id, log_date
),
meals AS (
  SELECT member_id AS user_id, log_date, COUNT(DISTINCT meal_type) AS n
  FROM public.meal_logs
  WHERE vegetables AND protein AND complex_carbs
  GROUP BY member_id, log_date
),
walks AS (
  SELECT member_id AS user_id, log_date, COUNT(DISTINCT slot) AS n
  FROM public.post_meal_walks GROUP BY member_id, log_date
),
workouts AS (
  SELECT user_id, (completed_at AT TIME ZONE 'utc')::date AS log_date
  FROM public.workout_sessions
  WHERE status = 'completed' AND completed_at IS NOT NULL
  GROUP BY user_id, (completed_at AT TIME ZONE 'utc')::date
),
minds AS (
  SELECT member_id AS user_id, log_date FROM public.mindset_reads
),
candidates AS (
  SELECT user_id, log_date FROM water
  UNION SELECT user_id, log_date FROM meals
  UNION SELECT user_id, log_date FROM walks
  UNION SELECT user_id, log_date FROM workouts
  UNION SELECT user_id, log_date FROM minds
),
closed AS (
  SELECT c.user_id, c.log_date
  FROM candidates c
  JOIN user_start us ON us.user_id = c.user_id
  LEFT JOIN water    w  ON w.user_id  = c.user_id AND w.log_date  = c.log_date
  LEFT JOIN meals    m  ON m.user_id  = c.user_id AND m.log_date  = c.log_date
  LEFT JOIN walks    wk ON wk.user_id = c.user_id AND wk.log_date = c.log_date
  LEFT JOIN workouts wo ON wo.user_id = c.user_id AND wo.log_date = c.log_date
  LEFT JOIN minds    mi ON mi.user_id = c.user_id AND mi.log_date = c.log_date
  LEFT JOIN LATERAL (
    SELECT h.weight FROM public.health_logs h
    WHERE h.user_id = c.user_id
      AND h.log_date <= c.log_date
      AND h.weight IS NOT NULL
    ORDER BY h.log_date DESC LIMIT 1
  ) wt ON true
  WHERE COALESCE(w.oz, 0) >= GREATEST(64, COALESCE(ROUND(wt.weight / 2)::int, 64))
    AND COALESCE(m.n, 0) >= 3
    AND (
      CASE
        WHEN (c.log_date - us.start_date + 1) BETWEEN 15 AND 28
          THEN COALESCE(wk.n, 0) >= 3
        ELSE (COALESCE(wk.n, 0) >= 1 OR wo.log_date IS NOT NULL)
      END
    )
    AND mi.log_date IS NOT NULL
),
grouped AS (
  SELECT
    user_id, log_date,
    log_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY log_date))::int AS grp
  FROM closed
),
runs AS (
  SELECT user_id, grp, COUNT(*) AS run_len
  FROM grouped GROUP BY user_id, grp
),
full_house_users AS (
  SELECT DISTINCT user_id FROM runs WHERE run_len >= 7
),
voice_users AS (
  SELECT q.author_id AS user_id
  FROM public.community_questions q
  JOIN public.community_answers a
    ON a.question_id = q.id AND a.is_admin_response = true
  GROUP BY q.author_id
  HAVING COUNT(DISTINCT q.id) >= 5
),
fh_badge    AS (SELECT id FROM public.badges WHERE slug = 'full-house'),
voice_badge AS (SELECT id FROM public.badges WHERE slug = 'voice-of-the-community'),
inserts AS (
  SELECT user_id, (SELECT id FROM fh_badge) AS badge_id
  FROM full_house_users
  WHERE (SELECT id FROM fh_badge) IS NOT NULL
  UNION ALL
  SELECT user_id, (SELECT id FROM voice_badge) AS badge_id
  FROM voice_users
  WHERE (SELECT id FROM voice_badge) IS NOT NULL
)
INSERT INTO public.user_badges (user_id, badge_id)
SELECT user_id, badge_id FROM inserts
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Mirror slugs into visitor_profiles (jsonb arrays). Append when missing.
UPDATE public.visitor_profiles vp
SET badges_earned = (
  SELECT jsonb_agg(DISTINCT x)
  FROM jsonb_array_elements_text(vp.badges_earned || '["full-house"]'::jsonb) AS x
)
FROM public.user_badges ub
JOIN public.badges b ON b.id = ub.badge_id
WHERE ub.user_id = vp.user_id
  AND b.slug = 'full-house'
  AND NOT (vp.badges_earned @> '["full-house"]'::jsonb);

UPDATE public.visitor_profiles vp
SET community_badges_earned = (
  SELECT jsonb_agg(DISTINCT x)
  FROM jsonb_array_elements_text(vp.community_badges_earned || '["voice-of-the-community"]'::jsonb) AS x
)
FROM public.user_badges ub
JOIN public.badges b ON b.id = ub.badge_id
WHERE ub.user_id = vp.user_id
  AND b.slug = 'voice-of-the-community'
  AND NOT (vp.community_badges_earned @> '["voice-of-the-community"]'::jsonb);