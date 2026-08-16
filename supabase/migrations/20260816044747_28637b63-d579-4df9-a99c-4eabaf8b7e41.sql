-- Batch 1 — Part A/H: duplicate-day reconciliation + immediate safe containment.
ALTER TABLE public.daily_actions
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.content_containment_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  field text NOT NULL,
  before_copy text,
  after_copy text,
  reason text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_name, record_id, field, reason)
);
GRANT SELECT ON public.content_containment_log TO authenticated;
GRANT ALL ON public.content_containment_log TO service_role;
ALTER TABLE public.content_containment_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read containment log" ON public.content_containment_log;
CREATE POLICY "Admins read containment log" ON public.content_containment_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.content_containment_log (table_name, record_id, field, before_copy, after_copy, reason)
SELECT 'daily_actions', id, 'is_active', 'true', 'false',
       'HISTORICAL — UNREACHABLE: legacy Phase 1 extension duplicate on a guided day'
FROM public.daily_actions
WHERE is_extension_day AND is_active
ON CONFLICT DO NOTHING;

UPDATE public.daily_actions SET is_active = false
WHERE is_extension_day AND is_active;

CREATE UNIQUE INDEX IF NOT EXISTS daily_actions_one_active_per_day
  ON public.daily_actions (day_number) WHERE is_active;

WITH target(record_id) AS (
  SELECT '40dda16e-af13-48f1-b9f1-65b1a844e1cd'::uuid
  UNION ALL SELECT '177e9f10-972f-48af-ac68-fc5b59eb59af'::uuid
  UNION ALL SELECT id FROM public.daily_actions WHERE day_number = 64 AND NOT is_extension_day
)
INSERT INTO public.content_containment_log (table_name, record_id, field, before_copy, after_copy, reason)
SELECT 'daily_actions', d.id, f.field,
       CASE f.field WHEN 'action_title' THEN d.action_title
                    WHEN 'action_description' THEN d.action_description
                    ELSE d.sub_tasks::text END,
       CASE f.field WHEN 'action_title' THEN 'Review one routine that helped'
                    WHEN 'action_description' THEN 'Look back at the routines you have used so far and note one that helped you stay consistent. Keep using that routine this week.'
                    ELSE '["Review one routine that helped", "Note why it worked for you", "Walks or workout"]' END,
       'TEMPORARY FALLBACK APPLIED: references a removed fasting/cheat-meal feature; awaiting owner-approved appendix copy'
FROM public.daily_actions d
JOIN target t ON t.record_id = d.id
CROSS JOIN (VALUES ('action_title'), ('action_description'), ('sub_tasks')) AS f(field)
ON CONFLICT DO NOTHING;

UPDATE public.daily_actions d
SET action_title = 'Review one routine that helped',
    action_description = 'Look back at the routines you have used so far and note one that helped you stay consistent. Keep using that routine this week.',
    sub_tasks = '["Review one routine that helped", "Note why it worked for you", "Walks or workout"]'::jsonb,
    action_detail_content = '{}'::jsonb
WHERE (d.id IN (
    '40dda16e-af13-48f1-b9f1-65b1a844e1cd',
    '177e9f10-972f-48af-ac68-fc5b59eb59af'
  ) OR (d.day_number = 64 AND NOT d.is_extension_day))
  AND d.action_title <> 'Review one routine that helped';