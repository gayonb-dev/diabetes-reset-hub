## Plan

Implement the magic-link bounce fix exactly where requested, without touching magic-link sending, sign-out behavior, or OAuth consent.

### 1. Make `AuthCallback` idempotent
- Add a `useRef` guard and run counter to `src/pages/AuthCallback.tsx`.
- Ensure the verification flow executes exactly once per component mount; any duplicate effect invocation logs and returns immediately.
- In the `verifyOtp` error branch, call `supabase.auth.getSession()` before treating the token as expired.
  - If a session exists, treat the used-token error as success and navigate to `safeNext`.
  - If no session exists, navigate to `/login?expired=1`.

### 2. Add temporary `[auth-debug]` instrumentation
Add `console.info` logs at the requested points:
- `AuthCallback` effect entry with run counter.
- `verifyOtp` result.
- Every `navigate` call in `AuthCallback`, including target and reason.
- `AuthGuard` redirect-to-login decision, including user presence, loading state, subscription status, and exact reason.
- Every auth state change event in `useAuth`, including event name.

### 3. Keep scope restricted
- No changes to `send-magic-link`.
- No changes to sign-out behavior.
- No changes to OAuth consent flow.

### 4. Verification/reporting
- Report the changed files.
- Summarize the diff so you can reproduce with the console open and confirm the `[auth-debug]` sequence.