## Diff verification (already completed, read-only)

Compared the three auth files against commit `5345625` — their state immediately before the logging-removal session (which spanned `a17903c`, `a9ebbbd`, `467620c`, `880baa0`):

- **`src/hooks/useAuth.tsx`** — only the `onAuthStateChange` `console.info` was removed. `refreshAuthState` untouched.
- **`src/components/AuthGuard.tsx`** — only the two redirect `console.info` blocks were removed. The `authRecheck` wait-before-redirect, the `drm_auth_callback_completed_at` grace window, and the spinner branch are unchanged.
- **`src/pages/AuthCallback.tsx`** — removed `runCountRef`, the effect-entry log, the `verifyOtp` result log, and the `navigateWithDebug` wrapper (replaced with the identical direct `navigate(target, { replace: true })` calls). The `hasRunRef` run-once guard, `markCallbackComplete`, `waitForVerifiedSession`, and the used-token-with-live-session success branch are intact.

**Verdict: nothing beyond diagnostic logging changed; behavior is byte-identical.** The desktop regression is not explained by that diff.

## Console stripping

`vite.config.ts` sets no `esbuild.drop` and no terser `drop_console`; Vite does not strip `console.*` in production by default, so the logs will reach the published site. However, `console.info` maps to the "Info"/Verbose tier in some DevTools configurations and can be filtered out of view by default. To guarantee visibility on the live site, all diagnostics will use **`console.warn`** with the same `[auth-debug]` prefix and identical payloads.

## Restore the instrumentation

1. **`src/hooks/useAuth.tsx`** — re-add the `onAuthStateChange` log (`event`, `hasSession`, `hasUser`, `userId`).
2. **`src/components/AuthGuard.tsx`** — re-add both redirect logs (`target`, `reason`, `hasUser`, `loading`, `authRecheck`, `subscriptionStatus`, `requireAdmin`, `requireActiveSub`, `path`, `search`) before the `/login?next=` and `/login?inactive=1` redirects.
3. **`src/pages/AuthCallback.tsx`** — re-add `runCountRef`, the effect-entry log, the `verifyOtp` result log, and the `navigateWithDebug(target, reason)` wrapper with its four original reason strings. Guard and used-token branch stay exactly where they are.

## New: instrument `waitForVerifiedSession`

Inside the poll loop in `src/pages/AuthCallback.tsx`, per iteration log: attempt number, `elapsedMs` since start, `hasSession`, `hasUser`, and any `getUser()` error message. On success, one line with the elapsed time at which the session was confirmed. On timeout, one line: `reason: "timed out"`, total elapsed, attempt count, and the last observed session/user state — so an 8s desktop timeout versus an instant mobile success is immediately visible.

### Technical notes
- Log-only change: no logic, ordering, or dependency-array edits.
- `send-magic-link`, `Login.tsx`, sign-out, and the OAuth consent flow are untouched.
- Logs are removed in a follow-up once desktop login is confirmed working.
