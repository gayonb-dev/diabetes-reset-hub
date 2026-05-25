-- Allow members to update their own challenge_progress rows
CREATE POLICY "Members update own challenge progress"
  ON public.challenge_progress FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid())::text);

-- Add explicit restrictive policy preventing non-admin role inserts
CREATE POLICY "Only admins insert user_roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins update user_roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins delete user_roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Revoke EXECUTE on has_role from the authenticated/anon roles; it's used by RLS (security definer) only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO service_role;