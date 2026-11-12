CREATE OR REPLACE FUNCTION public.clinical_review_content_allowed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL
   AND public.complimentary_access_active(auth.uid())
   AND public.member_write_allowed()
   AND public.membership_access_state(auth.uid()) = 'allowed'
$$;
REVOKE ALL ON FUNCTION public.clinical_review_content_allowed() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.clinical_review_content_allowed() TO authenticated;
ALTER POLICY "Clinical reviewers read active content" ON public.content_items USING (is_active = true AND public.clinical_review_content_allowed());
ALTER POLICY "Clinical reviewers read daily_actions" ON public.daily_actions USING (public.clinical_review_content_allowed());
ALTER POLICY "Clinical reviewers read published answers" ON public.qa_submissions USING (status = 'published' AND publish_anonymously = true AND public.clinical_review_content_allowed());
ALTER POLICY "Clinical reviewers read community_questions" ON public.community_questions USING (public.clinical_review_content_allowed());
ALTER POLICY "Clinical reviewers read community_answers" ON public.community_answers USING (public.clinical_review_content_allowed());
ALTER POLICY "Clinical reviewers read community_votes" ON public.community_votes USING (public.clinical_review_content_allowed());
ALTER POLICY "Clinical reviewers read win_posts" ON public.win_posts USING (public.clinical_review_content_allowed());
ALTER POLICY "Clinical reviewers read embeddings" ON public.community_answer_embeddings USING (public.clinical_review_content_allowed());