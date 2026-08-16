-- Prompt 6 Part G: least-privilege EXECUTE on security-definer routines.
-- Internal ledger + maintenance routines: backend only.
REVOKE EXECUTE ON FUNCTION public.claim_billing_event(text, text, timestamptz, text, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_billing_event(text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_expired_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_billing_event(text, text, timestamptz, text, text, boolean, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_billing_event(text, text, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_expired_rate_limits() TO service_role;

-- Trigger-only routines are never called directly by a client.
REVOKE EXECUTE ON FUNCTION public.block_phi_consent_writes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profile_deletion_flags() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_deletion_pending() FROM PUBLIC, anon, authenticated;

-- Member-state helpers stay available to signed-in members only.
REVOKE EXECUTE ON FUNCTION public.deletion_restricted_active(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.member_write_allowed() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.membership_access_state(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.membership_write_allowed() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_deletion_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deletion_restricted_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.member_write_allowed() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.membership_access_state(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.membership_write_allowed() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_deletion_status() TO authenticated, service_role;