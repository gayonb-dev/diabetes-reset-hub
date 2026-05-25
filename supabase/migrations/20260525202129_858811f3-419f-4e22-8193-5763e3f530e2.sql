
-- Allow authenticated users to submit their own deletion request
CREATE POLICY "Users insert own deletion request"
  ON public.deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Revoke EXECUTE on has_role from public roles; only service_role / definer context needs it
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO service_role;
