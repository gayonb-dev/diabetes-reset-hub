-- Prompt 6 Part G: trigger-only routines are never called directly by a client.
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_community_vote_counts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_question_answer_count() FROM PUBLIC, anon, authenticated;