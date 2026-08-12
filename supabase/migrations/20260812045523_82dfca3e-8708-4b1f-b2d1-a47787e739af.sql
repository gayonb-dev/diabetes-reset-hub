-- Tighten default PUBLIC execute on the new helpers.
REVOKE ALL ON FUNCTION public.deletion_lock_active(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.member_access_allowed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deletion_lock_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.member_access_allowed() TO authenticated, service_role;

-- ---------- atomic: delete one anonymous session's data ----------
CREATE OR REPLACE FUNCTION public.delete_visitor_session_data(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid;
  v_msgs int := 0;
  v_convs int := 0;
  v_consent int := 0;
  v_events int := 0;
  v_scores int := 0;
  v_profile_deleted boolean := false;
  v_bound uuid;
BEGIN
  SELECT visitor_profile_id INTO v_profile
  FROM public.visitor_sessions
  WHERE id = p_session_id AND revoked_at IS NULL AND expires_at > now();

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'no_active_session' USING ERRCODE = '42501';
  END IF;

  WITH d AS (DELETE FROM public.messages WHERE visitor_profile_id = v_profile RETURNING 1)
  SELECT count(*) INTO v_msgs FROM d;

  WITH d AS (DELETE FROM public.conversations WHERE visitor_profile_id = v_profile RETURNING 1)
  SELECT count(*) INTO v_convs FROM d;

  WITH d AS (DELETE FROM public.consent_records
             WHERE visitor_session_id = p_session_id OR visitor_profile_id = v_profile RETURNING 1)
  SELECT count(*) INTO v_consent FROM d;

  WITH d AS (DELETE FROM public.activity_events WHERE visitor_profile_id = v_profile RETURNING 1)
  SELECT count(*) INTO v_events FROM d;

  WITH d AS (DELETE FROM public.visitor_engagement_scores WHERE visitor_profile_id = v_profile RETURNING 1)
  SELECT count(*) INTO v_scores FROM d;

  -- The visitor profile itself is only removed when it is not a member record.
  SELECT user_id INTO v_bound FROM public.visitor_profiles WHERE id = v_profile;
  IF v_bound IS NULL THEN
    DELETE FROM public.visitor_profiles WHERE id = v_profile;
    v_profile_deleted := true;
  END IF;

  UPDATE public.visitor_sessions
     SET revoked_at = now()
   WHERE visitor_profile_id = v_profile AND revoked_at IS NULL;

  RETURN jsonb_build_object(
    'messages', v_msgs,
    'conversations', v_convs,
    'consent_records', v_consent,
    'activity_events', v_events,
    'engagement_scores', v_scores,
    'visitor_profile_deleted', v_profile_deleted,
    'sessions_revoked', true
  );
END;
$$;
REVOKE ALL ON FUNCTION public.delete_visitor_session_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_visitor_session_data(uuid) TO service_role;

-- ---------- atomic, once-only anonymous -> member merge ----------
CREATE OR REPLACE FUNCTION public.merge_visitor_session_into_member(
  p_session_id uuid, p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid;
  v_existing_user uuid;
  v_merged timestamptz;
  v_other int;
BEGIN
  -- Lock the session row for the duration of the transaction.
  SELECT visitor_profile_id, merged_at INTO v_profile, v_merged
  FROM public.visitor_sessions
  WHERE id = p_session_id AND revoked_at IS NULL AND expires_at > now()
  FOR UPDATE;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'no_active_session' USING ERRCODE = '42501';
  END IF;
  IF v_merged IS NOT NULL THEN
    RAISE EXCEPTION 'session_already_merged' USING ERRCODE = '42501';
  END IF;

  SELECT user_id INTO v_existing_user
  FROM public.visitor_profiles WHERE id = v_profile FOR UPDATE;

  -- Never overwrite an existing binding.
  IF v_existing_user IS NOT NULL THEN
    IF v_existing_user = p_user_id THEN
      RAISE EXCEPTION 'already_bound' USING ERRCODE = '42501';
    END IF;
    RAISE EXCEPTION 'already_bound' USING ERRCODE = '42501';
  END IF;

  -- Never silently merge two established identities.
  SELECT count(*) INTO v_other
  FROM public.visitor_profiles WHERE user_id = p_user_id;
  IF v_other > 0 THEN
    RAISE EXCEPTION 'already_bound' USING ERRCODE = '42501';
  END IF;

  UPDATE public.visitor_profiles SET user_id = p_user_id, updated_at = now()
   WHERE id = v_profile AND user_id IS NULL;

  UPDATE public.consent_records SET user_id = p_user_id, subject_kind = 'member'
   WHERE visitor_session_id = p_session_id AND user_id IS NULL;

  UPDATE public.visitor_sessions
     SET user_id = p_user_id, merged_at = now()
   WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'visitor_profile_id', v_profile,
    'user_id', p_user_id,
    'merged_at', now()
  );
END;
$$;
REVOKE ALL ON FUNCTION public.merge_visitor_session_into_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_visitor_session_into_member(uuid, uuid) TO service_role;

-- One member may only ever hold one bound visitor profile.
CREATE UNIQUE INDEX IF NOT EXISTS uq_visitor_profiles_user
  ON public.visitor_profiles(user_id) WHERE user_id IS NOT NULL;