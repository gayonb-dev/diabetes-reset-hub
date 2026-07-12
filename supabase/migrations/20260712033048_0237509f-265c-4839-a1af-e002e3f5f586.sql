
REVOKE ALL ON FUNCTION public.guard_community_answer_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_community_answer_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_community_question_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_community_question_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_qa_submission_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_qa_submission_update() FROM PUBLIC, anon, authenticated;
