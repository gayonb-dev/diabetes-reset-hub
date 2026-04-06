
CREATE TABLE public.challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 5),
  win_text TEXT NOT NULL,
  mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 5),
  energy_rating INTEGER CHECK (energy_rating BETWEEN 1 AND 5),
  water_glasses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (email, day_number)
);

ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert challenge progress"
  ON public.challenge_progress FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read challenge progress"
  ON public.challenge_progress FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update their own progress"
  ON public.challenge_progress FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
