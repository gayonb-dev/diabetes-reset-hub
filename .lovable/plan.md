# Session Plan: MealSetupTransition Hooks Fix + Dexcom CGM Auto-Sync

Two tasks executed in one session. Task 1 is a 1-file safety fix; Task 2 is the full approved Dexcom build.

---

## Task 1 — MealSetupTransition hooks-order fix

**File:** `src/pages/app/MealSetupTransition.tsx`

**Bug:** `const subText = useMemo(...)` and `const progressPct = ...` sit **after** the `if (forcedAdvance && completedCount < TOTAL_WEEKS) return (...)` early-return. When `forcedAdvance` flips true, that `useMemo` is skipped → React "rendered fewer hooks than expected" crash.

**Fix:** Move the `useMemo(subText)` block (and the trivial `progressPct` line if needed only for the main render) to sit immediately **before** the `if (forcedAdvance && …)` early return. Every other hook (`useState`, `useRef`, `useEffect`) is already correctly above it.

**Out of scope (flagged, not doing):** codebase-wide `any` cleanup; `components/ui/*` helper extraction for fast-refresh warnings (shadcn-generated files intentionally co-locate variant constants).

**Verification:** `rg -n "useMemo|forcedAdvance|return \(" src/pages/app/MealSetupTransition.tsx`, typecheck, Playwright loads onboarding completion path, forces the 4-min timeout branch → no hook-order error in console.

---

## Task 2 — Dexcom CGM auto-sync (approved plan)

Sandbox-first (`sandbox-api.dexcom.com`).

### 2.1 Secrets
- `DEXCOM_CLIENT_ID` = `GfRf6Z72wO2d7FbgZNkTEJtMYEF7YJ6i` (`set_secret`)
- `DEXCOM_CLIENT_SECRET` = `cyhHTw2m4Z0rQ9ZE` (`set_secret`)
- `DEXCOM_ENVIRONMENT` = `sandbox` (`set_secret`)
- `DEXCOM_REDIRECT_URI` = `<APP_URL>/app/settings/dexcom/callback` (`set_secret`)
- `DEXCOM_TOKEN_ENC_KEY` — 64-hex random via `generate_secret` (AES-GCM at-rest token encryption)
- `DEXCOM_STATE_SIGNING_KEY` — 64-hex random via `generate_secret` (HMAC-SHA256 state signing)

Reused: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `CRON_SECRET`, `SUPABASE_ANON_KEY`.

### 2.2 Migration
`public.dexcom_connections` (`member_id uuid PK REFERENCES auth.users ON DELETE CASCADE`, `access_token_enc bytea`, `refresh_token_enc bytea`, `token_iv bytea`, `expires_at timestamptz`, `dexcom_user_id text`, `environment text NOT NULL DEFAULT 'sandbox'`, `last_sync_at`, `last_sync_status`, `last_sync_error`, `earliest_egv_at`, timestamps + `update_updated_at_column` trigger). Grants: `SELECT` to authenticated, `ALL` to service_role. RLS on; only policy is authenticated `SELECT WHERE member_id = auth.uid()` — no insert/update/delete policies (service-role only).

`public.state_nonces` (`nonce text PK`, `member_id uuid NOT NULL`, `expires_at timestamptz NOT NULL`, `used_at timestamptz`). Grants: `ALL` to service_role only. RLS enabled, no policies.

`blood_sugar_readings` changes:
- `ADD COLUMN source text NOT NULL DEFAULT 'manual'`
- `ADD COLUMN external_id text`
- `ADD CONSTRAINT blood_sugar_readings_source_chk CHECK (source IN ('manual','dexcom'))`
- **Drop + recreate** existing `reading_type` CHECK to include `'cgm'`: `CHECK (reading_type IN ('fasting','post_meal','bedtime','other','cgm'))`
- `CREATE UNIQUE INDEX blood_sugar_readings_dexcom_extid ON public.blood_sugar_readings (member_id, external_id) WHERE source='dexcom' AND external_id IS NOT NULL`

**Zone-badge coordination (echoed to both sessions' reports):** The in-flight badge-truth session must filter `reading_type='fasting'` explicitly on the pre-diabetic-zone and normal-zone criteria so `reading_type='cgm'` rows can never satisfy or pollute those badges. Verified today: `BloodSugarTab.tsx` fasting-streak filters `reading_type='fasting'`; `award-badges/index.ts` uses readings only for `first-drop` existence check. Any future averaging code must include `.eq('reading_type','fasting')`.

### 2.3 `dexcom-auth` (`verify_jwt = true` default)
Actions: `authorize_url`, `exchange`, `disconnect`, `status`, `sync_now`.

- **`authorize_url`** — Validates JWT. **Opportunistic purge:** `DELETE FROM state_nonces WHERE expires_at < now()` (single statement, non-blocking). Generates `nonce = crypto.randomUUID()`, `exp = now+600s`, inserts nonce row. Signs `state = base64url({member_id, nonce, exp}).<HMAC-SHA256(DEXCOM_STATE_SIGNING_KEY)>`. Returns Dexcom `https://sandbox-api.dexcom.com/v2/oauth2/login?client_id=...&redirect_uri=...&response_type=code&scope=offline_access&state=<state>`.
- **`exchange`** — Verifies HMAC signature (constant-time compare), checks `exp > now`, atomically marks nonce `used_at = now() WHERE used_at IS NULL RETURNING nonce` (zero rows → reject as replay). Confirms JWT `sub === payload.member_id`. POSTs `/v2/oauth2/token grant_type=authorization_code`. Encrypts tokens with `DEXCOM_TOKEN_ENC_KEY`. Upserts `dexcom_connections` (service role). **On success, deletes the consumed `state_nonces` row** (single-use enforced by both `used_at` marker and the delete). Fires one internal `dexcom-sync` for that member with `x-cron-secret`.
- **`disconnect`** — Deletes `dexcom_connections` row for JWT member.
- **`status`** — Returns `{connected, environment, last_sync_at, last_sync_status, last_sync_error}`.
- **`sync_now`** — Internal `dexcom-sync` call with `x-cron-secret` for that JWT member only.

### 2.4 `dexcom-sync` (`verify_jwt = false` — auth in code, three branches)
No fallthrough:
1. `x-cron-secret` header present AND constant-time equals `Deno.env.get('CRON_SECRET')` → **cron mode**: iterate all `dexcom_connections` rows, ignore body.
2. Else `Authorization: Bearer <jwt>` → `supabase.auth.getClaims(token)`; on success sync **only** `claims.sub`. `body.member_id` ignored entirely.
3. Else → `401`.

Per member: refresh token if `expires_at < now+120s` (POST `/v2/oauth2/token grant_type=refresh_token`, re-encrypt, persist). GET `/v3/users/self/egvs?startDate=<last_sync_at || now-24h>&endDate=<now>` with pagination. Insert `{member_id, measured_at: systemTime, value_mgdl: value, reading_type:'cgm', source:'dexcom', external_id: systemTime.toISOString()}` — collisions caught by partial unique index. Update `last_sync_at/status/error`.

`verify_jwt=false` documented in file header comment as intentional (cron has no JWT); the three-branch chain enforces auth in code.

### 2.5 Cron (via `supabase--insert`)
`pg_cron` `*/30 * * * *`. Cron secret pulled from `vault.decrypted_secrets` at runtime (mirrors `streak-rollover`) so no literal secret lands in `cron.job`:
```sql
select cron.schedule('dexcom-sync-every-30-min','*/30 * * * *', $$
  select net.http_post(
    url := 'https://wqennhjdojjqmmqzjhti.supabase.co/functions/v1/dexcom-sync',
    headers := jsonb_build_object(
      'content-type','application/json',
      'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='CRON_SECRET' limit 1)
    ),
    body := '{}'::jsonb
  );
$$);
```
Verify `CRON_SECRET` exists in `vault.decrypted_secrets` before scheduling.

### 2.6 Frontend
- **`src/components/settings/ConnectedDevicesCard.tsx`** (new) — Dexcom row: not-connected → **Connect Dexcom** (calls `authorize_url`, redirects); connected → `Sandbox` chip when env=sandbox, `Last synced <relative>`, error line if any, **Sync now** + **Disconnect**. Fine print under Dexcom row: *"Apple Health and other meters are coming with our mobile app release."*
- **`src/pages/app/DexcomCallback.tsx`** (new) at `/app/settings/dexcom/callback` — reads `code`+`state`, calls `exchange`, redirects to `/app/settings` with success/error toast.
- **`src/hooks/useDexcomConnection.ts`** (new) — wraps status / authorize / sync_now / disconnect via `supabase.functions.invoke`.
- **`src/pages/app/Settings.tsx`** — mount Connected Devices section above Data/Account.
- **`src/App.tsx`** — register `/app/settings/dexcom/callback` under `AuthGuard` `/app` layout, matching the top-level `/app/progress/report` pattern.
- **`src/components/progress/BloodSugarTab.tsx`** — small `CGM` pill when `r.source === 'dexcom'`; manual entry UI unchanged.
- **`supabase/config.toml`** — add `[functions.dexcom-sync] verify_jwt = false`.

### 2.7 Sandbox verification evidence
1. `set_secret` × 4 fixed values, `generate_secret` × 2 keys; `fetch_secrets` confirms all 6.
2. Deploy `dexcom-auth`, `dexcom-sync`. Curl `dexcom-sync` three ways: no headers → 401; bogus `x-cron-secret` → 401; valid `x-cron-secret` + `{}` → 200 (empty iteration OK).
3. Playwright:
   - Login as seeded Day-29 member, Settings → Connected Devices → **Connect Dexcom** → Dexcom sandbox login (`SandboxUser1` / any password) → land on Settings showing Connected + `Sandbox` chip + timestamp. Screenshot.
   - `read_query` verifies `dexcom_connections` row and `blood_sugar_readings WHERE source='dexcom'` count.
   - `/app/progress` Blood Sugar tab shows CGM-tagged rows alongside any manual ones. Screenshot.
   - **Sync now** → `last_sync_at` advances, row count grows.
   - Trigger cron path via `supabase--curl_edge_functions` with `x-cron-secret` → logs show per-member iteration + inserts.
   - **Replay attack:** call `exchange` twice with same `state` → second call rejected (and the row is gone after the first success, so second call fails signature/nonce lookup).
   - **Nonce purge check:** after opportunistic purge on a fresh `authorize_url`, `SELECT COUNT(*) FROM state_nonces WHERE expires_at < now()` returns 0.
   - **Disconnect** → `dexcom_connections` row deleted → cron trigger → zero further inserts for that member.
4. Manual (non-CGM) readings still insertable through existing form; fasting streak unchanged; medication prompt count unaffected by CGM rows.

### 2.8 Files created / edited
**Created**
- `supabase/migrations/<ts>_dexcom_connections_and_reading_source.sql`
- `supabase/functions/dexcom-auth/index.ts`
- `supabase/functions/dexcom-sync/index.ts`
- `src/pages/app/DexcomCallback.tsx`
- `src/hooks/useDexcomConnection.ts`
- `src/components/settings/ConnectedDevicesCard.tsx`

**Edited**
- `src/pages/app/MealSetupTransition.tsx` (Task 1)
- `src/pages/app/Settings.tsx`
- `src/App.tsx`
- `src/components/progress/BloodSugarTab.tsx`
- `supabase/config.toml`

**Data ops (`supabase--insert`)**
- `cron.schedule('dexcom-sync-every-30-min', ...)` sourcing `CRON_SECRET` from `vault.decrypted_secrets`

## Completion report will include
Every file changed (actual list), migration diff, cron job row, all 6 `fetch_secrets` names, three-branch auth curl outputs, replay-attack rejection, before/after Playwright screenshots (Settings + Progress), `blood_sugar_readings` counts by `source` before/after each sync, `state_nonces` purge verification, disconnect-then-cron zero-insert verification, **and the zone-badge coordination note echoed to both sessions** confirming `reading_type='fasting'` filtering keeps CGM rows out of pre-diabetic / normal-zone criteria.
