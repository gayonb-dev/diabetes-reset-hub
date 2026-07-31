## 1. Fix the dexcom-auth boot crash

`supabase/functions/dexcom-auth/index.ts` line 10 imports `corsHeaders` from `npm:@supabase/supabase-js@2/cors`, which is not a real package export — the isolate dies at module load, so the browser sees "Failed to send a request to the Edge Function" and logs show boot/shutdown with no output.

- Delete that import; define `corsHeaders` inline as a plain object exactly as `support-request/index.ts` does: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`, `Access-Control-Allow-Methods: POST, OPTIONS`.
- **Same bug in `supabase/functions/dexcom-sync/index.ts` line 10** — identical fake subpath, same fix.
- Grep of all `npm:` imports under `supabase/functions/`: the only invalid subpath is `@supabase/supabase-js@2/cors` in those two Dexcom functions. `mcp/index.ts` uses `npm:@lovable.dev/mcp-js@0.24.0/stacks/supabase`, a real published subpath export — left as-is. Everything else imports bare package roots.
- Add to `supabase/config.toml`:
  ```toml
  [functions.dexcom-auth]
  verify_jwt = true
  ```
- Redeploy both functions, curl deployed `dexcom-auth` with no auth, and report the raw HTTP status and body (expect JSON 401, proving it boots).

## 2. Device clock-skew guard

New hook `src/hooks/useClockSkew.ts`:
- One request to `${VITE_SUPABASE_URL}/auth/v1/health?_=${Date.now()}` using `fetch(url, { method: 'HEAD', cache: 'no-store' })` — cache-busting param plus `no-store` so a cached `Date` header can never trigger a false banner.
- If the response is non-2xx, the fetch throws, or the `Date` header is missing → treat as a failed check, no banner.
- Compares the server `Date` against `Date.now()` captured when the response resolves; returns `{ skewMs, checked }`.
- Logs the measurement once: `console.warn('[clock] skew', { skewMs, serverTime, deviceTime })`.

New component `src/components/ClockSkewBanner.tsx`:
- Renders only when the check succeeded and `Math.abs(skewMs) > 120000`.
- Copy: "Your device clock is off by about {N} minutes, which can stop you from signing in. Set your device date and time to update automatically, then reload this page."
- **Reload** button (`window.location.reload()`) plus a dismiss control.
- Dismissal in React state only — never localStorage — so it reappears next session while the clock is still wrong.
- Brand tokens only (`bg-accent-muted`, `border-accent/30`, `text-foreground`), no raw hex.

Mounting:
- `src/App.tsx` — global, on app load.
- `src/pages/Login.tsx` — at the top of the login card, where the failure is reported.

Re-check runs on reload; banner disappears once skew is under threshold.

### Not changed
Auth logic, `[auth-debug]` instrumentation, magic-link function, or any Dexcom behavior beyond the import fix.
