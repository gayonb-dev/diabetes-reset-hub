-- PREPARED, NOT APPLIED.
-- Neutralises glucose-effect claims stored in public.snack_library.nutritional_note.
-- This file lives OUTSIDE supabase/migrations/ on purpose: it must never be
-- picked up by automatic migration application. It requires separate owner
-- authorisation, manual execution and post-run verification.
--
-- Scope: 9 rows, `nutritional_note` only. Names, descriptions, timing, type,
-- unlock_day, sort_order and every other column are untouched. No member data,
-- meal plans or shopping lists are modified.
--
-- Safety model: single transaction, expected-current-copy guard on every
-- UPDATE, and an aborting row-count assertion at the end.

BEGIN;

UPDATE public.snack_library SET nutritional_note = 'Fruit with a source of fat and protein.'
 WHERE id = 'da81d827-6da4-4e71-a7bd-7f74d7cbc33a'
   AND nutritional_note = 'Fiber + healthy fat blunts the glucose response.';

UPDATE public.snack_library SET nutritional_note = 'Higher in protein, lower in added sugar.'
 WHERE id = 'd4bf62ca-5e1d-4606-bcba-042d140cda8d'
   AND nutritional_note = 'High protein, low sugar — steady energy.';

UPDATE public.snack_library SET nutritional_note = 'Protein with a water-rich vegetable.'
 WHERE id = '8dd0364f-c1ca-4c14-bb77-c7334be67d85'
   AND nutritional_note = 'Pure protein + water-rich veg, near-zero glucose impact.';

UPDATE public.snack_library SET nutritional_note = 'Vegetables with fibre and plant protein.'
 WHERE id = '4c484e54-1445-4182-85c8-978e1450b991'
   AND nutritional_note = 'Fiber, plant protein, slow carbs.';

UPDATE public.snack_library SET nutritional_note = 'A protein-containing dairy option with cinnamon.'
 WHERE id = '3e4816cb-dd5b-46c3-9b39-e513f956559f'
   AND nutritional_note = 'Casein protein keeps you full; cinnamon supports glucose control.';

UPDATE public.snack_library SET nutritional_note = 'Nuts provide fat, protein and magnesium.'
 WHERE id = 'a1da9085-31ed-495a-8817-bc94fbef9d13'
   AND nutritional_note = 'Magnesium + healthy fat — diabetes-friendly snack.';

UPDATE public.snack_library SET nutritional_note = 'Fruit combined with protein and fat.'
 WHERE id = 'a17a88d2-d8e0-4a13-a209-a4a6eaca407d'
   AND nutritional_note = 'Fiber + protein + fat combo prevents spikes.';

UPDATE public.snack_library SET nutritional_note = 'Whole-grain carbohydrate with a source of fat.'
 WHERE id = '7d002079-30f1-49de-9819-c804147e9644'
   AND nutritional_note = 'Healthy fat slows carb absorption.';

UPDATE public.snack_library SET nutritional_note = 'Fruit with chia seeds, a source of fibre.'
 WHERE id = '352bdd78-c3f1-49f9-9f91-ed3402791fb7'
   AND nutritional_note = 'Soluble fiber from chia steadies blood sugar.';

-- Expected affected rows: 9. Row 62080c98-25e3-4739-92a7-13d02a6fbaac
-- ("Edamame" — "Complete plant protein with fiber.") is a composition
-- statement with no glucose-effect claim and is intentionally unchanged.
DO $$
DECLARE remaining int;
BEGIN
  SELECT count(*) INTO remaining
  FROM public.snack_library
  WHERE nutritional_note IN (
    'Fiber + healthy fat blunts the glucose response.',
    'High protein, low sugar — steady energy.',
    'Pure protein + water-rich veg, near-zero glucose impact.',
    'Fiber, plant protein, slow carbs.',
    'Casein protein keeps you full; cinnamon supports glucose control.',
    'Magnesium + healthy fat — diabetes-friendly snack.',
    'Fiber + protein + fat combo prevents spikes.',
    'Healthy fat slows carb absorption.',
    'Soluble fiber from chia steadies blood sugar.'
  );
  IF remaining <> 0 THEN
    RAISE EXCEPTION 'Aborting: % claim row(s) did not match the expected current copy.', remaining;
  END IF;
END $$;

COMMIT;

-- ROLLBACK WORDING (run only to restore the pre-correction state):
-- BEGIN;
-- UPDATE public.snack_library SET nutritional_note = 'Fiber + healthy fat blunts the glucose response.' WHERE id = 'da81d827-6da4-4e71-a7bd-7f74d7cbc33a';
-- UPDATE public.snack_library SET nutritional_note = 'High protein, low sugar — steady energy.' WHERE id = 'd4bf62ca-5e1d-4606-bcba-042d140cda8d';
-- UPDATE public.snack_library SET nutritional_note = 'Pure protein + water-rich veg, near-zero glucose impact.' WHERE id = '8dd0364f-c1ca-4c14-bb77-c7334be67d85';
-- UPDATE public.snack_library SET nutritional_note = 'Fiber, plant protein, slow carbs.' WHERE id = '4c484e54-1445-4182-85c8-978e1450b991';
-- UPDATE public.snack_library SET nutritional_note = 'Casein protein keeps you full; cinnamon supports glucose control.' WHERE id = '3e4816cb-dd5b-46c3-9b39-e513f956559f';
-- UPDATE public.snack_library SET nutritional_note = 'Magnesium + healthy fat — diabetes-friendly snack.' WHERE id = 'a1da9085-31ed-495a-8817-bc94fbef9d13';
-- UPDATE public.snack_library SET nutritional_note = 'Fiber + protein + fat combo prevents spikes.' WHERE id = 'a17a88d2-d8e0-4a13-a209-a4a6eaca407d';
-- UPDATE public.snack_library SET nutritional_note = 'Healthy fat slows carb absorption.' WHERE id = '7d002079-30f1-49de-9819-c804147e9644';
-- UPDATE public.snack_library SET nutritional_note = 'Soluble fiber from chia steadies blood sugar.' WHERE id = '352bdd78-c3f1-49f9-9f91-ed3402791fb7';
-- COMMIT;
