
CREATE TABLE IF NOT EXISTS public.vita_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vita_quotes_category ON public.vita_quotes(category) WHERE is_active = true;

GRANT SELECT ON public.vita_quotes TO authenticated;
GRANT ALL ON public.vita_quotes TO service_role;

ALTER TABLE public.vita_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active quotes"
  ON public.vita_quotes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage quotes"
  ON public.vita_quotes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_vita_quotes_updated_at
  BEFORE UPDATE ON public.vita_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
