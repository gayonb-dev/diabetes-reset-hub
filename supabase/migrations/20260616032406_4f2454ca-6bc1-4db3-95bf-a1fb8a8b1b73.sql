
ALTER TABLE public.vita_quotes RENAME COLUMN content TO quote_text;
ALTER TABLE public.vita_quotes DROP COLUMN IF EXISTS sort_order;
ALTER TABLE public.vita_quotes ADD COLUMN IF NOT EXISTS day_range_start INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.vita_quotes ADD COLUMN IF NOT EXISTS day_range_end INTEGER NOT NULL DEFAULT 180;
