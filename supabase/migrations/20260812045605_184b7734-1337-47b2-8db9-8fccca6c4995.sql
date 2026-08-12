CREATE POLICY "member_uploads_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'member-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.member_access_allowed()
  );

CREATE POLICY "member_uploads_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'member-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.member_access_allowed()
  );

CREATE POLICY "member_uploads_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'member-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.member_access_allowed()
  );

CREATE POLICY "member_uploads_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'member-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.member_access_allowed()
  );