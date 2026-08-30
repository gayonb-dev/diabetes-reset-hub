# Batch 2 — Auth audit

Generated 2026-08-30 (UTC). Project ref `wqennhjdojjqmmqzjhti`.

## Global auto-confirm

Global email auto-confirm remains **off**; no change was made to Auth configuration in this pass.
Synthetic accounts required by the harness were created and individually confirmed through the
administrative no-email path (`email_delivery_enabled=false` throughout, 0 emails sent).

## Account window

| Fact | Value |
|---|---|
| Accounts before cleanup | 5 |
| Synthetic accounts (`@example.invalid`, created 2026-08-29 15:46 UTC by the harness) | 4 |
| Synthetic accounts deleted this pass | 4 |
| Accounts remaining | 1 (real, created 2026-05-22, predates the Batch 2 window) |
| Unconfirmed accounts remaining | 0 |

## Audit-log reconstruction — BLOCKED

`auth.audit_log_entries` is **empty** (0 rows overall; min and max timestamps NULL), so the platform
retention window does not cover 2026-08-27 → 2026-08-31 and creation/deletion timestamps for the
2026-08-28 synthetic accounts cannot be independently reconstructed from Auth logs.
This is recorded honestly as BLOCKED. Accounts were **not** recreated to reproduce timestamps.
Consequence: account-creation provenance for that window rests on the `auth.users` timestamps recorded
above and in `synthetic-cleanup.json`, not on an independent audit trail.
Post-publication step: enable/verify Auth log retention before any future synthetic-principal run.
