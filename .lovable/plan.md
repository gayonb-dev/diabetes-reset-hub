## Diagnosis

- The deployed `OPTIONS /dexcom-auth` currently returns **HTTP 200** with the expected CORS headers, so the preflight is not failing in a direct test.
- An unauthenticated `POST /dexcom-auth` returns the platform gateway response **HTTP 401** with `UNAUTHORIZED_NO_AUTH_HEADER`; it never reaches `dexcom-auth`'s own `requireUser` gate. This confirms `verify_jwt = true` enforces authentication ahead of the function.
- Recent function logs show only isolate boot/shutdown events and no request handling, consistent with requests rejected before function code runs.
- The browser failure is therefore the gateway JWT layer rejecting the request before the function runs — not a missing secret or boot failure. Removing the redundant gateway check makes CORS and auth responses come consistently from the function itself.

## Fix

1. Change only the function-specific configuration in `supabase/config.toml`:
   - `[functions.dexcom-auth] verify_jwt = false`
2. Keep `dexcom-auth`'s existing `requireUser()` validation unchanged — every non-`OPTIONS` action still requires and cryptographically validates a bearer token via `getClaims()` before any Dexcom or database operation.
3. Do not weaken `dexcom-sync`, OAuth state/nonce validation, token encryption, or any Dexcom secret handling.

## Verification

1. Confirm browser-style `OPTIONS` returns **200** with allowed origin, methods, and all requested headers — report raw status and body.
2. Confirm unauthenticated `POST` now reaches function code and returns its JSON **401 `{"error":"unauthorized"}`** instead of the gateway's `UNAUTHORIZED_NO_AUTH_HEADER` — report raw status and body.
3. From an authenticated session, invoke `authorize_url` and confirm a 200 with a Dexcom sandbox URL containing valid `client_id`, `redirect_uri`, `state`, and no `undefined` segments.
4. Exercise Settings → Connect Dexcom and verify it reaches the Dexcom authorization page without `FunctionsFetchError`.
5. Review fresh `dexcom-auth` logs to confirm requests reach the handler; report exact HTTP results and files changed.

**Security rationale:** equivalent security — the function handles `OPTIONS` before auth, and `requireUser()` rejects every unauthenticated or invalid-JWT request before dispatching any action.