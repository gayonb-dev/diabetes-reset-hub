
CREATE TABLE public.intake_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT NOT NULL,
  diabetes_type TEXT NOT NULL,
  diabetes_duration TEXT,
  current_medications TEXT,
  uses_insulin BOOLEAN DEFAULT false,
  willing_to_cook BOOLEAN DEFAULT true,
  availability TEXT,
  preferred_start_date TEXT,
  preferred_time TEXT,
  timezone TEXT DEFAULT 'America/Jamaica',
  why_now TEXT,
  health_goals TEXT,
  coaching_agreement BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert intake submissions"
ON public.intake_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Service role can manage intake submissions"
ON public.intake_submissions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_intake_submissions_updated_at
  BEFORE UPDATE ON public.intake_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
