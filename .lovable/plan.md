# Fix: magic link kicks back to login after partial dashboard load

## Root cause

In `src/pages/AuthCallback.tsx`, after `supabase.auth.verifyOtp(...)` succeeds we call `navigate(next)` on the next line. But `onAuthStateChange(SIGNED_IN)` — the event that populates `user`/`session` inside `AuthProvider` (and flips `loading` back to `true` while it fetches roles + subscription) — fires **asynchronously** after `verifyOtp` resolves.

Timeline today:
1. `verifyOtp` resolves ✅
2. `navigate("/app")` runs
3. `AuthGuard` renders with the still-stale `user = null`, `loading = false` (left over from the initial `getSession` that ran before login) → redirects to `/login?next=/app`
4. One tick later, `SIGNED_IN` fires and `user` is set — but the URL is already `/login`

The initial `getSession()` path in `AuthProvider` doesn't help here because it only runs once on mount, before the token exists.

## Fix

Make `AuthCallback` wait until the session is actually persisted before navigating.

**File:** `src/pages/AuthCallback.tsx`
- After a successful `verifyOtp`, poll `supabase.auth.getSession()` (short loop, ~50 ms interval, ~3 s cap) until `data.session` is present, then `navigate(next, { replace: true })`.
- If the poll times out, fall back to `/login?expired=1` (same behavior as today's failure branch).
- Keep the legacy hash-fragment branch behavior; it already waits 600 ms + checks `getSession`, but tighten it to the same poll helper so both paths are consistent.

No changes to `AuthProvider`, `AuthGuard`, `send-magic-link`, or any OAuth/MCP code — the guard logic is correct; it just needs the session to exist before the route mounts.

## Verification

1. Sign in via magic link → should land on `/app` (or `next`) without a flash back to `/login`.
2. Expired/used link → still redirects to `/login?expired=1`.
3. OAuth consent flow (`/.lovable/oauth/consent?...`) still works: unauthenticated visit → `/login?next=...consent...` → magic link → returns to the consent URL (unchanged, same code path).
4. No regression for users with an active subscription vs. inactive (guard behavior unchanged).

## Files changed

- `src/pages/AuthCallback.tsx` (only)
