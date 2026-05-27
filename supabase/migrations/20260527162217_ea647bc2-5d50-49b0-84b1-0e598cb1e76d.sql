
-- Phase 3 Data API grants
GRANT SELECT ON public.meal_plans TO authenticated;
GRANT ALL ON public.meal_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_swaps TO authenticated;
GRANT ALL ON public.meal_swaps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO authenticated;
GRANT ALL ON public.shopping_lists TO service_role;
GRANT SELECT ON public.daily_actions TO authenticated;
GRANT ALL ON public.daily_actions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_daily_progress TO authenticated;
GRANT ALL ON public.member_daily_progress TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.community_questions TO authenticated;
GRANT ALL ON public.community_questions TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.community_answers TO authenticated;
GRANT ALL ON public.community_answers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_votes TO authenticated;
GRANT ALL ON public.community_votes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.win_posts TO authenticated;
GRANT ALL ON public.win_posts TO service_role;
GRANT SELECT ON public.community_answer_embeddings TO authenticated;
GRANT ALL ON public.community_answer_embeddings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.if_fasting_log TO authenticated;
GRANT ALL ON public.if_fasting_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cheat_meals TO authenticated;
GRANT ALL ON public.cheat_meals TO service_role;
GRANT SELECT ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;
GRANT SELECT ON public.visitor_engagement_scores TO authenticated;
GRANT ALL ON public.visitor_engagement_scores TO service_role;
GRANT SELECT ON public.product_validation_tokens TO authenticated;
GRANT ALL ON public.product_validation_tokens TO service_role;

-- Snack Library (Phase 9, Section 13)
CREATE TABLE public.snack_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  nutritional_note text NOT NULL,
  timing text NOT NULL CHECK (timing IN ('morning','afternoon','any')),
  type text NOT NULL CHECK (type IN ('fruit','protein','dairy','vegetable','grain')),
  unlock_day integer NOT NULL DEFAULT 3,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.snack_library TO authenticated;
GRANT ALL ON public.snack_library TO service_role;

ALTER TABLE public.snack_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated reads active snacks"
  ON public.snack_library FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage snack_library"
  ON public.snack_library FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER snack_library_updated_at
  BEFORE UPDATE ON public.snack_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 10 approved snacks, all unlock Day 3
INSERT INTO public.snack_library (name, description, nutritional_note, timing, type, unlock_day, sort_order) VALUES
  ('Apple with almond butter', 'One small apple sliced, with 1 tbsp natural almond butter.', 'Fiber + healthy fat blunts the glucose response.', 'afternoon', 'fruit', 3, 1),
  ('Greek yogurt with berries', '3/4 cup plain Greek yogurt topped with 1/4 cup mixed berries.', 'High protein, low sugar — steady energy.', 'morning', 'dairy', 3, 2),
  ('Boiled egg + cucumber sticks', 'One hard-boiled egg with a handful of cucumber sticks.', 'Pure protein + water-rich veg, near-zero glucose impact.', 'afternoon', 'protein', 3, 3),
  ('Carrots + hummus', 'Half cup baby carrots with 2 tbsp hummus.', 'Fiber, plant protein, slow carbs.', 'afternoon', 'vegetable', 3, 4),
  ('Cottage cheese + cinnamon', '1/2 cup low-fat cottage cheese sprinkled with cinnamon.', 'Casein protein keeps you full; cinnamon supports glucose control.', 'morning', 'dairy', 3, 5),
  ('Handful of almonds', '20 raw or dry-roasted unsalted almonds.', 'Magnesium + healthy fat — diabetes-friendly snack.', 'any', 'protein', 3, 6),
  ('Pear with cheese', '1 small pear with a 1 oz slice of cheddar.', 'Fiber + protein + fat combo prevents spikes.', 'afternoon', 'fruit', 3, 7),
  ('Edamame', '1/2 cup steamed edamame, lightly salted.', 'Complete plant protein with fiber.', 'afternoon', 'protein', 3, 8),
  ('Avocado on whole grain toast', '1/2 small avocado on one slice of whole-grain toast.', 'Healthy fat slows carb absorption.', 'morning', 'grain', 3, 9),
  ('Berry + chia parfait', '1/2 cup berries layered with 2 tbsp chia pudding.', 'Soluble fiber from chia steadies blood sugar.', 'morning', 'fruit', 3, 10);
