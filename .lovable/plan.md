# P1–P4: chat authorization, health-data consent, export/deletion/retention, live RLS

Authority: `DRM_P1_P4_Privacy_Security_Implementation_Authority.md`. Where the earlier draft plan conflicted, the authority wins — the signed HMAC capability, `sessionStorage`, the legacy-UUID one-time claim, and the local-prescreen-then-classifier design are all withdrawn. No redesign: brand, VITA, typography, navigation, and cards are untouched; visible change is limited to consent, privacy, export, deletion, and status surfaces. Nothing is published.

## Platform limitations to decide before/while building

1. **Same-site cookie / BFF.** Edge functions run on a different origin than the app, so a `SameSite=Strict` HttpOnly session cookie cannot be demonstrated. Per §4.1 this means the **in-memory launch mode** (opaque token held only in page JavaScript memory, no cross-session anonymous memory). No `sessionStorage` fallback. Owner decision needed only if a same-site API domain becomes available.
2. **Test member creation for P4 probes.** Creating Member A/B needs either the service-role admin API (not reachable from this environment on Lovable Cloud) or a signup that sends a real confirmation email (prohibited in testing). Read-only enumeration will run regardless; the four-principal probe stays **BLOCKED** until you choose one: (a) temporarily enable auto-confirm signup so two labelled test accounts can be created without email, (b) supply two pre-created test-account credentials, or (c) run probes against a staging clone. I will not mark P4 passed without them.
3. **Reauthentication for export/deletion** uses email OTP; in tests it is mocked, so the live reauth path is verified only in preview by you.
4. **Stripe redaction / Dexcom revocation / Resend erasure** are processor actions that cannot be proven from code; they are implemented as tracked states, never as claimed completions.

## Gates left visibly open (reported as BLOCKED — OWNER/PROFESSIONAL DECISION REQUIRED)

AI processor contract/DPA gate, email processor gate, financial-record retention gate, privacy-notice/counsel gate, HBNR incident-response gate, production identity gate. Per §5.3, if the AI processor gate is unproven, the consent panel ships **without** `Agree and continue` and offers only deterministic non-health mode; that switch is a single server-read flag so you can flip it once the DPA is confirmed.

## Order of work (authority §8)

### 1. Manifest and tests first (no data touched)
- `supabase/functions/_shared/dataInventory.ts` — the single manifest (category, tables/vendor, subject keys, export fields, delete action, retention rule, processor action, dependency order, reconciliation query) covering every category in §6.2.
- `src/lib/dataInventory.spec.ts` + Deno tests: manifest completeness against live `information_schema` table/view/function/Storage/Realtime enumeration, so a new table cannot silently escape export/deletion.

### 2. P1 — opaque sessions, ownership, CORS, atomic rate limits
- Migration: `visitor_sessions` (id, `token_hash`, visitor_profile_id, user_id, created_at, last_seen_at, idle_expires_at, absolute_expires_at, revoked_at, revoked_reason, consent link), `rate_limit_events` (atomic upsert-increment, 24h purge), legacy `visitor_profiles.quarantined_at`. RLS: no anon/authenticated grants; service-role only.
- New `supabase/functions/visitor-session/index.ts`: CSPRNG opaque token, only its hash stored, 30-min idle / 24-h absolute, rotation on sign-in, sign-out, consent change, merge.
- `supabase/functions/_shared/session.ts`, `_shared/rateLimit.ts` (atomic SQL), `_shared/cors.ts` (exact origin allowlist, replacing `*`), `_shared/ip.ts` (HMAC-keyed hash from the trusted ingress header only; new secret for the key).
- `chat-agent`, `grant-phi-consent`, `request-data-deletion`: resolve subject only from the verified session/JWT; verify `conversation.visitor_profile_id` ownership; 401 vs 403 without existence disclosure; body/length/method/content-type limits; no message content, tokens, or headers in logs.
- `ChatWidget.tsx`: delete `drm_visitor_id` from storage on start, hold the token in a ref only. `useAuth.tsx`, `Onboarding.tsx`, `IntakeForm.tsx`, `SixWeekReset.tsx`, `PaymentModal.tsx`, `Settings.tsx`, `Privacy.tsx`, `stripe-webhook` stop reading/writing it. Quarantine migration for unlinked legacy profiles with before/after counts, 30-day purge.

### 3. P2 — pre-consent boundary, consent registry, AI minimization
- `supabase/functions/_shared/chatFaq.ts`: deterministic local answers for membership, price, cancellation, login, membership status, navigation, plus the verbatim pre-consent fallback and the deterministic emergency handoff. No free text leaves the server before consent — the external classifier call is removed from the pre-consent path entirely.
- Migration: `consent_records` (subject = user or visitor session, `purpose_key` `public_chat_ai_health`, notice version, hash of displayed text, processor list/version, granted_at, revoked_at, source surface; no IP, no full UA).
- `grant-phi-consent` rewritten to write purpose-based consent from the verified session and return the recorded version. Consent-write failure returns the verbatim error copy.
- `ChatWidget.tsx`: consent panel with the verbatim §5.3 title/body/buttons, no preselection, equal visual weight, existing card/typography tokens. Pending message stays in volatile memory, sent at most once after a successful consent write, never stored beforehand.
- Withdrawal (verbatim §5.6) in Settings and in the chat's Privacy options; `/privacy` stops accepting a browser UUID as authorization.
- Minimization: name/email removed from the public-chat prompt; `summarize-conversation` public raw-transcript path disabled; `daily-digest` rebuilt from local structured counts with no raw conversation leaving Supabase. Classifier/model failure and uncertainty fail closed.

### 4. P3 — export
- New `supabase/functions/export-my-data`: authenticated, recent-reauth required, subject from the verified JWT and verified account emails only, one snapshot feeding both a readable ZIP (`README.txt`, named CSVs, UTC, units) and one machine-readable JSON (schema version, category, source table). Exclusion list per §6.3 enforced by test. `no-store`/`nosniff`/attachment headers, five-minute one-time link, rate limited.
- `Settings.tsx`: replaces both current client-side exporters with `Download my data` and `Machine-readable JSON` plus the verbatim status line.

### 5. P3 — deletion state machine (built and proven in test/staging)
- Migration: `deletion_jobs` with states `requested → identity_verified → access_blocked → in_progress → waiting_for_processor → reconciled → completed`, plus `partial`/`failed`, per-category expected/actual counts, retry cursor; `profiles.deletion_pending` enforced by an authorization check that blocks writes, AI, notifications, email, sync, and purchases even for an unexpired JWT.
- New `delete-my-account` (creates/queries the job only) and `deletion-worker` (pg_cron) executing §6.4 order: subject resolution, block + session revoke, deliberate Stripe cancellation, queue stop, dependency-ordered deletion with counts, Dexcom local token/data deletion with `action_required_by_member`, processor tracking, Storage objects, Auth user last, reconciliation. No-op and partial are failures; timeouts cannot produce a false completion.
- `Settings.tsx` deletion dialog uses the verbatim §6.5 copy (reauth + typed `DELETE`, accepted/completed/partial messages).

### 6. Retention — report-only
- `purge-inactive-visitors` becomes a manifest-driven retention worker in **report-only** mode with the §6.7 per-category schedule and the "meaningful activity" definition. It produces counts only; no deletion is activated. `/privacy` copy rewritten to state 730 days as a maximum with the real category list.

### 7. P4 — RLS enumeration then isolated probes
- `scripts/rls/enumerate.sql` + `scripts/rls/report.ts`: read-only, dated, environment-fingerprinted inventory of RLS state, forced state, grants, every `USING`/`WITH CHECK`, views and `security_invoker`, security-definer functions and execute grants, Storage buckets/policies, Realtime publications, secret-using edge functions, and the admin-role source; flags RLS off, no policy, public grants, `USING (true)`, missing `WITH CHECK`, unsafe views, user-editable role sources; migration-intent diff; no row contents or real identifiers.
- Policy fixes land as migrations, then `scripts/rls/probe.ts` runs anonymous / Member A / Member B / admin JWT (service role tested separately, never as an admin pass) against every personal table and operation, verifying the target row after each request, with a unique run ID and proven cleanup. Output: `docs/rls-verification-<date>.md`.

### 8. Verification
Authorization tests (§4.5), consent tests including a network assertion that no free text reaches an external domain pre-consent (§5.7), export/deletion/retention tests on a seeded synthetic user (§6.8), then `tsgo`, ESLint on touched files, Vitest, and production build. No publish.

## Rollback and reconciliation

Every migration is additive-first with a paired `-- rollback` block: new tables are dropped, added columns dropped, altered policies restored from the enumerated pre-change definitions captured in step 7's report. Data-affecting steps (legacy quarantine, deletion worker, retention) run report-only first, record expected vs actual counts, and require reconciliation to zero before advancing state; the quarantine flag is reversible until the 30-day purge, which stays disabled until you approve the counts.

## Completion report

Delivered per §9: files/migrations/functions changed, behaviors removed and their replacements, proof no browser UUID or web-storage capability remains as authorization, consent notice version and processor names with gate status, external data flows before/after, full manifest, export inclusion/exclusion report, deletion state-machine and reconciliation evidence, retention dry-run counts with confirmation nothing was deleted, RLS inventory and principal matrix or the exact blocker, test/type/lint/build results, and the preview URL.
