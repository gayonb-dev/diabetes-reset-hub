## Verified current state

- `blood_sugar_readings` has one relevant unique index: `blood_sugar_readings_dexcom_extid` on `(member_id, external_id) WHERE source='dexcom' AND external_id IS NOT NULL` — partial, so PostgREST's `onConflict` can never infer it. Diagnosis confirmed.
- Duplicate check already run: **0 duplicate `(member_id, source, external_id)` groups** with non-null `external_id`. No dedupe step needed.
- `dexcom_connections` currently has **0 rows** — the live double-sync can only run after you reconnect.

## 1. Migration (idempotent)

```sql
DROP INDEX IF EXISTS public.blood_sugar_readings_dexcom_extid;

CREATE UNIQUE INDEX IF NOT EXISTS blood_sugar_readings_source_extid
  ON public.blood_sugar_readings (member_id, source, external_id);
```

Safe for manual readings: `external_id` is NULL for them and Postgres treats NULLs as distinct in unique indexes, so manual rows never collide with each other or with CGM rows. Both statements are replay-safe.

## 2. Edge function

`supabase/functions/dexcom-sync/index.ts` (~line 192):

```ts
.upsert(rows, { onConflict: "member_id,source,external_id", ignoreDuplicates: true });
```

`ignoreDuplicates: true` unchanged; nothing else in the file changes. Deploy `dexcom-sync` after the edit.

## 3. Verification report (after you reconnect)

Run the sync, then report:

- raw first EGV record verbatim + its actual `systemTime` format
- token response `expires_in` value and `typeof`
- **one inserted CGM row's stored `measured_at` shown next to the raw `systemTime` it came from**, to prove the conversion is numerically correct and not merely non-throwing
- insert count on run 1
- final `last_sync_status` / `last_sync_error`
- `count(*)` where `source='dexcom'`

Then run the sync a second time and confirm **0 new rows**, proving the dedupe index works rather than just silencing the error.

## Files changed

- `supabase/migrations/<new>.sql` (new)
- `supabase/functions/dexcom-sync/index.ts`
