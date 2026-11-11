CREATE POLICY "Clinical reviewers read published answers" ON public.qa_submissions FOR SELECT TO authenticated
  USING (status = 'published' AND publish_anonymously = true AND public.complimentary_access_active(auth.uid()) AND NOT public.deletion_lock_active(auth.uid()));
CREATE POLICY "Clinical reviewers read community_questions" ON public.community_questions FOR SELECT TO authenticated
  USING (public.complimentary_access_active(auth.uid()) AND NOT public.deletion_lock_active(auth.uid()));
CREATE POLICY "Clinical reviewers read community_answers" ON public.community_answers FOR SELECT TO authenticated
  USING (public.complimentary_access_active(auth.uid()) AND NOT public.deletion_lock_active(auth.uid()));
CREATE POLICY "Clinical reviewers read community_votes" ON public.community_votes FOR SELECT TO authenticated
  USING (public.complimentary_access_active(auth.uid()) AND NOT public.deletion_lock_active(auth.uid()));
CREATE POLICY "Clinical reviewers read win_posts" ON public.win_posts FOR SELECT TO authenticated
  USING (public.complimentary_access_active(auth.uid()) AND NOT public.deletion_lock_active(auth.uid()));
CREATE POLICY "Clinical reviewers read embeddings" ON public.community_answer_embeddings FOR SELECT TO authenticated
  USING (public.complimentary_access_active(auth.uid()) AND NOT public.deletion_lock_active(auth.uid()));