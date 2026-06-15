
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.award_helpful_points(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_verified_answers(extensions.vector, double precision, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bump_streak(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_question_answer_count() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_community_vote_counts() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_helpful_points(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_verified_answers(extensions.vector, double precision, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.bump_streak(uuid) TO service_role;
