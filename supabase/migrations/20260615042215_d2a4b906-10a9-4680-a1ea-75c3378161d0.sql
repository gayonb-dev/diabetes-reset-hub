
-- 1) vita_similarity_log
CREATE TABLE public.vita_similarity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  question_text text NOT NULL,
  top_similarity numeric(5,4),
  matched_answer_id uuid,
  used_verified_answer boolean NOT NULL DEFAULT false,
  called_ask_vita boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.vita_similarity_log TO authenticated;
GRANT ALL ON public.vita_similarity_log TO service_role;
ALTER TABLE public.vita_similarity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members insert own similarity logs" ON public.vita_similarity_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read similarity logs" ON public.vita_similarity_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2) search_verified_answers RPC
CREATE OR REPLACE FUNCTION public.search_verified_answers(
  query_embedding extensions.vector(1536),
  similarity_threshold float DEFAULT 0.82,
  match_count int DEFAULT 1
)
RETURNS TABLE (
  answer_id uuid,
  question_id uuid,
  combined_text text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
  SELECT
    e.answer_id,
    e.question_id,
    e.combined_text,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.community_answer_embeddings e
  JOIN public.community_answers a ON a.id = e.answer_id
  WHERE a.is_verified = true
    AND 1 - (e.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
GRANT EXECUTE ON FUNCTION public.search_verified_answers(extensions.vector, float, int) TO authenticated, service_role;

-- 3) Counter triggers
CREATE OR REPLACE FUNCTION public.sync_question_answer_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_questions
      SET answer_count = answer_count + 1,
          is_verified_answered = is_verified_answered OR NEW.is_verified
      WHERE id = NEW.question_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_questions
      SET answer_count = GREATEST(answer_count - 1, 0)
      WHERE id = OLD.question_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    IF NEW.is_verified THEN
      UPDATE public.community_questions SET is_verified_answered = true WHERE id = NEW.question_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;$$;

DROP TRIGGER IF EXISTS trg_ca_count ON public.community_answers;
CREATE TRIGGER trg_ca_count
AFTER INSERT OR DELETE OR UPDATE OF is_verified ON public.community_answers
FOR EACH ROW EXECUTE FUNCTION public.sync_question_answer_count();

CREATE OR REPLACE FUNCTION public.sync_community_vote_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  delta int;
BEGIN
  IF TG_OP = 'INSERT' THEN delta := 1;
  ELSIF TG_OP = 'DELETE' THEN delta := -1;
  ELSE RETURN NEW; END IF;

  IF (COALESCE(NEW.target_type, OLD.target_type)) = 'question' THEN
    IF (COALESCE(NEW.vote_type, OLD.vote_type)) = 'upvote' THEN
      UPDATE public.community_questions SET upvote_count = GREATEST(upvote_count + delta, 0) WHERE id = COALESCE(NEW.target_id, OLD.target_id);
    ELSIF (COALESCE(NEW.vote_type, OLD.vote_type)) = 'metoo' THEN
      UPDATE public.community_questions SET metoo_count = GREATEST(metoo_count + delta, 0) WHERE id = COALESCE(NEW.target_id, OLD.target_id);
    END IF;
  ELSIF (COALESCE(NEW.target_type, OLD.target_type)) = 'answer' AND (COALESCE(NEW.vote_type, OLD.vote_type)) = 'helpful' THEN
    UPDATE public.community_answers SET helpful_count = GREATEST(helpful_count + delta, 0) WHERE id = COALESCE(NEW.target_id, OLD.target_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;$$;

DROP TRIGGER IF EXISTS trg_cv_counts ON public.community_votes;
CREATE TRIGGER trg_cv_counts
AFTER INSERT OR DELETE ON public.community_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_community_vote_counts();

-- 4) Helpful points column
ALTER TABLE public.user_streaks
  ADD COLUMN IF NOT EXISTS helpful_points integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.award_helpful_points(p_user_id uuid, p_amount integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total int;
BEGIN
  INSERT INTO public.user_streaks (user_id, helpful_points)
  VALUES (p_user_id, GREATEST(p_amount, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET helpful_points = public.user_streaks.helpful_points + GREATEST(p_amount, 0),
        updated_at = now()
  RETURNING helpful_points INTO v_total;
  RETURN v_total;
END;$$;
GRANT EXECUTE ON FUNCTION public.award_helpful_points(uuid, integer) TO authenticated, service_role;
