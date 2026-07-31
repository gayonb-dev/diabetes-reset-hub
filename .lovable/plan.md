## Goal

Stop `dexcom-sync` from throwing `Invalid time value`, and make the failure mode observable instead of generic. Three distinct code paths can produce that identical error: record timestamps, the sync cursor, and token-expiry arithmetic.

Confirmed against the current file: line 132 is `new Date(rec.systemTime + "Z").toISOString().replace("ZZ", "Z")` — the `.replace` runs on the *result* of `toISOString()`, so it can never repair a double-`Z` input; `toISOString()` throws first. Lines 108–110 build the cursor from `conn.last_sync_at` with no validity check, and line 116 calls `cursor.toISOString()` unconditionally. Line 90 computes `new Date(Date.now() + (t.expires_in - 30) * 1000).toISOString()` with no numeric validation, and line 70 compares `conn.expires_at` as a raw string.

## 1. New shared time module

Create `supabase/functions/_shared/dexcom-time.ts`:

- `parseDexcomTime(s: unknown): Date | null`
  - Return `null` for non-strings / empty after `trim()`.
  - Append `Z` **only** when the trimmed string does not already end in `Z`/`z` or a `±HH:MM` / `±HHMM` offset (regex `/(?:[Zz]|[+-]\d{2}:?\d{2})$/`).
  - Construct the `Date`; return `null` when `isNaN(getTime())`.
- `toIsoOrNull(s: unknown): string | null` — thin wrapper used at the mapping site.
- `safeExpiresInSeconds(raw: unknown, tag: string): number` — `Number(raw)`; if not finite or not `> 0`, log `console.warn(\`[${tag}] invalid expires_in\`, JSON.stringify(raw))` and return `3600`.

Kept separate from `dexcom-crypto.ts` so crypto stays single-purpose.

## 2. Use it at the record mapping site (lines 126–136)

Replace the `.filter().map()` with a loop that:
- parses `rec.systemTime` via `parseDexcomTime`;
- **skips** records that parse to `null` rather than throwing;
- counts skips, and on the **first** skip logs `console.warn("[dexcom-sync] unparseable systemTime", JSON.stringify(rec.systemTime))` (raw value, once per invocation).

Insert count reported becomes the number of rows actually built.

## 3. Cursor guard (lines 107–116)

- Parse `conn.last_sync_at` through `parseDexcomTime`.
- If present but unparseable, fall back to `now - 24h` and log `console.warn("[dexcom-sync] invalid last_sync_at cursor, falling back to now-24h", conn.member_id, conn.last_sync_at)`.
- Only a valid Date ever reaches `toISOString()` at line 116.

## 4. Real error text on failure

`syncOne` throws bare strings that the catch block already writes verbatim via `markError`. Tighten it so the cause is always attached:

- Wrap the mapping/insert block so any throw is re-raised as `Error("<original message> | firstBadSystemTime=<raw>")` when a bad timestamp was seen in that chunk.
- The member-facing "please disconnect and connect again" copy stays gated on `TokenDecryptError` only — unchanged.
- `markError` continues truncating at 500 chars.

## 5. Log the raw shape once

On the first chunk returning a non-empty `records` array, log `console.info("[dexcom-sync] first EGV record", JSON.stringify(records[0]))` — one-shot flag per invocation so it does not spam.

## 6. Token-expiry arithmetic guard (both functions)

`dexcom-sync` line 90 and the equivalent token-write in `dexcom-auth`:

- Replace `(t.expires_in - 30)` with `safeExpiresInSeconds(t.expires_in, "dexcom-sync" | "dexcom-auth") - 30`, so a missing, non-numeric, or string `expires_in` can never yield `NaN`.
- Log the raw token response's `expires_in` value and `typeof` once per token exchange: `console.info("[dexcom-*] expires_in", JSON.stringify(t.expires_in), typeof t.expires_in)`.

`dexcom-sync` line 68–72 (`refreshIfNeeded`):

- Parse `conn.expires_at` via `parseDexcomTime`. If it is `null` (invalid), treat the token as **expired** and take the refresh branch, logging `console.warn("[dexcom-sync] invalid expires_at, forcing refresh", conn.member_id, conn.expires_at)`.
- Replace the current string comparison with a numeric `Date` comparison against `now + 120s`.

## 7. Deploy and verify

- Deploy `dexcom-sync` and `dexcom-auth`.
- Invoke sync for your connection with your member JWT.
- Report:
  - the raw first EGV record verbatim and the actual v3 `systemTime` format it revealed,
  - the token response's `expires_in` value **and its type**,
  - the `expires_at` currently stored on your `dexcom_connections` row (read before and after the run),
  - how many readings were inserted,
  - the final `last_sync_status` / `last_sync_error`,
  - a count of CGM-tagged rows in `blood_sugar_readings`.

## Files changed

- `supabase/functions/_shared/dexcom-time.ts` (new)
- `supabase/functions/dexcom-sync/index.ts`
- `supabase/functions/dexcom-auth/index.ts`

Not touched: `_shared/dexcom-crypto.ts`, `_shared/cors.ts`, `config.toml`, the reconnect copy, or the auth branches.
