## Plan

Fix the remaining login bounce by making the auth callback wait for the app auth state, not just browser token storage.

### What I found
- The login URL `/login?next=%2Fapp` is produced by `AuthGuard` when `/app` is reached before `useAuth()` has finished recognizing the signed-in user.
- `AuthCallback.tsx` now waits for `getSession()`, but that only confirms token storage. It can still navigate to `/app` before the app-level auth context has completed its own `getSession()` / `loadUserData()` cycle, so `AuthGuard` can briefly see `user=null` and send the member back to login.

### Changes to make
1. **Harden `AuthCallback.tsx`**
   - After `verifyOtp`, explicitly call `supabase.auth.getUser()` to confirm the token is valid with the auth service.
   - Persist a short-lived same-tab flag before navigating, e.g. `drm_auth_callback_in_progress`, so guards know the callback just completed.
   - Keep the existing token-hash flow and legacy flow intact.

2. **Harden `AuthGuard.tsx`**
   - Before redirecting to `/login`, perform a direct session re-check with `supabase.auth.getSession()` / `getUser()` when the auth context says `user=null`.
   - While that re-check is pending, show the existing spinner instead of redirecting.
   - If a valid user is found, wait for the auth provider to catch up instead of bouncing to login.
   - Preserve `next` correctly including query string, not only pathname.

3. **Small cleanup in `useAuth.tsx` if needed**
   - Ensure initial session loading cannot finish before associated user data is loaded.
   - Avoid changing sign-out, subscription gating, onboarding gating, or OAuth consent behavior beyond the login race fix.

### Verification
- Test the callback URL flow in the browser and confirm it lands on `/app` without returning to `/login?next=%2Fapp`.
- Confirm unauthenticated visits to `/app` still redirect to `/login?next=%2Fapp`.
- Confirm inactive members still land on the existing inactive/login path.

### Files expected to change
- `src/pages/AuthCallback.tsx`
- `src/components/AuthGuard.tsx`
- Possibly `src/hooks/useAuth.tsx` only if the guard/callback fix exposes an auth-provider timing issue.