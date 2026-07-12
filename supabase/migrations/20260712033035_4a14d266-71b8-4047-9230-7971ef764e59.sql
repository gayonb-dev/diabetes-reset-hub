
-- 1. Community trust-flag guard
CREATE OR REPLACE FUNCTION public.guard_community_answer_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_admin_response := false;
    NEW.is_vita_response := false;
    NEW.is_verified := false;
    NEW.helpful_count := 0;
    NEW.display_name := NULLIF(NEW.display_name, 'Diabetes Reset Method');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_community_answer_insert ON public.community_answers;
CREATE TRIGGER trg_guard_community_answer_insert
BEFORE INSERT ON public.community_answers
FOR EACH ROW EXECUTE FUNCTION public.guard_community_answer_insert();

CREATE OR REPLACE FUNCTION public.guard_community_question_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_question_of_day := false;
    NEW.question_of_day_date := NULL;
    NEW.is_verified_answered := false;
    NEW.answer_count := 0;
    NEW.upvote_count := 0;
    NEW.metoo_count := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_community_question_insert ON public.community_questions;
CREATE TRIGGER trg_guard_community_question_insert
BEFORE INSERT ON public.community_questions
FOR EACH ROW EXECUTE FUNCTION public.guard_community_question_insert();

-- Also guard updates to trust fields on community rows (non-admins can't flip them)
CREATE OR REPLACE FUNCTION public.guard_community_answer_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_admin_response := OLD.is_admin_response;
    NEW.is_vita_response := OLD.is_vita_response;
    NEW.is_verified := OLD.is_verified;
    NEW.helpful_count := OLD.helpful_count;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_community_answer_update ON public.community_answers;
CREATE TRIGGER trg_guard_community_answer_update
BEFORE UPDATE ON public.community_answers
FOR EACH ROW EXECUTE FUNCTION public.guard_community_answer_update();

CREATE OR REPLACE FUNCTION public.guard_community_question_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_question_of_day := OLD.is_question_of_day;
    NEW.question_of_day_date := OLD.question_of_day_date;
    NEW.is_verified_answered := OLD.is_verified_answered;
    NEW.answer_count := OLD.answer_count;
    NEW.upvote_count := OLD.upvote_count;
    NEW.metoo_count := OLD.metoo_count;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_community_question_update ON public.community_questions;
CREATE TRIGGER trg_guard_community_question_update
BEFORE UPDATE ON public.community_questions
FOR EACH ROW EXECUTE FUNCTION public.guard_community_question_update();

-- 2. qa_submissions publish guard
CREATE OR REPLACE FUNCTION public.guard_qa_submission_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status := 'pending';
    NEW.answer := NULL;
    NEW.answered_at := NULL;
    NEW.publish_anonymously := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_qa_submission_insert ON public.qa_submissions;
CREATE TRIGGER trg_guard_qa_submission_insert
BEFORE INSERT ON public.qa_submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_qa_submission_insert();

CREATE OR REPLACE FUNCTION public.guard_qa_submission_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status := OLD.status;
    NEW.answer := OLD.answer;
    NEW.answered_at := OLD.answered_at;
    NEW.publish_anonymously := OLD.publish_anonymously;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_qa_submission_update ON public.qa_submissions;
CREATE TRIGGER trg_guard_qa_submission_update
BEFORE UPDATE ON public.qa_submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_qa_submission_update();

-- 3. Revoke public/anon EXECUTE on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.award_xp(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.award_helpful_points(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bump_streak(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_program_day(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_verified_answers(extensions.vector, double precision, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.award_xp(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_helpful_points(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bump_streak(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_program_day(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_verified_answers(extensions.vector, double precision, integer) TO authenticated, service_role;
