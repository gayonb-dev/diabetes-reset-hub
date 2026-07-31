# Park the Dexcom integration (preserve for reactivation)

## Verified current state
- `ConnectedDevicesCard` is mounted once, at `src/pages/app/Settings.tsx:885`, imported at line 28.
- pg_cron job `dexcom-sync-every-30-min` (jobid 21, schedule `*/30 * * * *`) is **active**.
- `blood_sugar_readings` where `source='dexcom'`: **276 rows**.
- `dexcom_connections`: **1 row**.

## 1. Hide the card from Settings
`src/pages/app/Settings.tsx` — comment out the `<ConnectedDevicesCard />` mount and its import, each with a note:

```
// PARKED 2026-07-31 — Dexcom US partner applications are closed (Stelo only),
// so production access isn't available and members can't complete a connection.
// Reactivate by uncommenting this mount + rescheduling the dexcom-sync cron.
```

No other file is touched. `ConnectedDevicesCard.tsx`, `useDexcomConnection.ts`, `DexcomCallback.tsx`, and the `/app/settings/dexcom/callback` route all stay exactly as they are.

## 2. Unschedule the cron
Run `cron.unschedule('dexcom-sync-every-30-min')` via the data tool (job data, not schema). Both edge functions stay deployed, `config.toml` unchanged, all Dexcom secrets untouched. Reactivation is a single `cron.schedule` call with the same name and `*/30 * * * *`.

## 3. Delete sandbox test data
```sql
DELETE FROM public.blood_sugar_readings WHERE source = 'dexcom';   -- 276 expected
DELETE FROM public.dexcom_connections;                              -- 1 expected
```
Actual deleted counts reported back, plus a post-delete count confirming Progress now shows only manually-logged readings.

## 4. Explicitly untouched
`dexcom_connections` and `state_nonces` tables, every migration, `_shared/dexcom-crypto.ts`, `_shared/dexcom-time.ts`, the `source` / `external_id` columns, the `blood_sugar_readings_source_extid` unique index, and the CGM tag rendering in `BloodSugarTab.tsx` (it simply never matches once the rows are gone).

## 5. Untouched
The "Connect an AI assistant" card stays mounted and live.

## Files changed
- `src/pages/app/Settings.tsx` (only file edited)
- Plus one data operation (cron unschedule + two deletes) — no schema migration.
