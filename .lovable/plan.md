## 0. Carryover: remove `[auth-debug]` logging

Delete the `console.info("[auth-debug]", …)` calls in `src/pages/AuthCallback.tsx`, `src/components/AuthGuard.tsx`, `src/hooks/useAuth.tsx`. Keep permanently: the `useRef` run-once guard, the used-token-with-live-session success branch, `refreshAuthState`, and AuthGuard's wait-before-redirect.

## 1. Diagnose the Dexcom Connect failure (raw output)

`supabase/functions/dexcom-auth/index.ts`:
- Outer catch: `console.error("[dexcom-auth]", action, e)` (hoist `action` into scope). Add `console.error("[dexcom-auth] nonce_insert_failed", error)` plus logs on `token_exchange_failed` / `upsert_failed`.
- Boot-time presence map — name → `{ present, len }`, never values — for `DEXCOM_CLIENT_ID`, `DEXCOM_CLIENT_SECRET`, `DEXCOM_ENVIRONMENT`, `DEXCOM_REDIRECT_URI`, `DEXCOM_TOKEN_ENC_KEY`, `DEXCOM_STATE_SIGNING_KEY`, `CRON_SECRET`, `SUPABASE_ANON_KEY`. These are read with `!` at module top level today, so a missing one can kill the isolate before any handler runs; switch to non-throwing lookups so the handler returns a clear error instead of dying silently.
- Deploy, invoke with `{"action":"authorize_url"}` as a real member, report the exact status, full body, the returned `url` on 200 (checked for `undefined` segments), and matching log lines on error.

OAuth logic itself unchanged.

## 2. Surface the silent failures

`src/hooks/useDexcomConnection.ts` — add `catch` to `connect`, `syncNow`, `disconnect`:
- Real message via `await error.context.text()` when the error carries a `context` Response (parse a JSON `error` field if present), else `error.message`.
- Destructive toast with that message.
- `connect`: 200 with no `data.url` → "Could not start Dexcom connection — please contact support."
- `syncNow`: success toast on completion.

## 3. Settings → "Connect an AI assistant"

**Claim-name check first.** Inspect a real Supabase OAuth client access token to determine which claim carries client identity (`client_id`, `azp`, or `cid`). Policies key on whichever is present. **If no client-identity claim exists on those tokens, the `IS NULL` write guard is a no-op and assistant tokens can write `oauth_client_grants` — the report will say exactly that rather than presenting the policy as protective.**

**Migration:**

```
public.oauth_client_grants(
  id uuid pk default gen_random_uuid(),
  member_id uuid not null, client_name text, client_id text not null,
  scopes text[], approved_at timestamptz not null default now(),
  created_at, updated_at, unique(member_id, client_id))

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_client_grants TO authenticated;
GRANT ALL ON public.oauth_client_grants TO service_role;
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;

SELECT (authenticated): auth.uid() = member_id
INSERT / UPDATE / DELETE (authenticated):
  auth.uid() = member_id AND (auth.jwt() ->> '<claim>') IS NULL
  (UPDATE has the guard in both USING and WITH CHECK)
```

UPDATE is required so the consent upsert succeeds on re-approval and refreshes `approved_at`. `updated_at` trigger included.

`src/pages/OAuthConsent.tsx`: on **successful approve only**, upsert one row (`onConflict: member_id,client_id`, refreshing `approved_at`) before the existing redirect. Deny, redirect targets, and all other behavior unchanged.

New `src/components/settings/AIAssistantCard.tsx`, mounted below `<ConnectedDevicesCard />` in `src/pages/app/Settings.tsx`. Brand tokens only, existing Card/Button/Collapsible:
- Heading + "Use Claude, ChatGPT, or another AI assistant to log your numbers and check your program by voice or chat."
- Read-only MCP URL + Copy. **URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp`**, with `VITE_SUPABASE_PROJECT_ID` → `https://<ref>.supabase.co/functions/v1/mcp` as secondary fallback. If neither resolves cleanly (empty, `undefined`, `project-ref-unset`), hide the field and Copy and show "Connection link unavailable — please contact support."
- Collapsible "How to connect" (five steps as written).
- "What your assistant can do" — the seven tools, your wording.
- Muted security note as written.
- Authorized assistants: rows from `oauth_client_grants` (client name + approved date), per-row Revoke (confirm → delete). Empty state: "No assistants connected yet."

## 4. Make Revoke actually revoke (conditional)

Check at runtime whether `ToolContext.getClientId()` returns a real value. If it does, add one shared pre-flight helper in `src/lib/mcp/`, called at the top of each tool handler — no change to tool logic, inputs, outputs, or the consent screen — verifying a matching `oauth_client_grants` row for `(ctx.getUserId(), ctx.getClientId())` and returning an auth error when absent. Then redeploy the `mcp` function.

If the context carries no client identity, enforcement is dropped, UI copy stays honest, and the report states plainly that revocation is cosmetic until the MCP layer can enforce it.

## Reporting

Final message: every file changed; raw `authorize_url` status + body (+ `url` on 200); secret presence/length map; the JWT claim the policies key on — or an explicit statement that no such claim exists and the write guard is therefore a no-op; and the revoke enforced-or-cosmetic verdict.
