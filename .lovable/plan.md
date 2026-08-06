# P1–P4: chat authorization, health-data consent, export/deletion/retention, live RLS

Authority: `DRM_P1_P4_Privacy_Security_Implementation_Authority.md`, plus the mandatory corrections in this revision. Where the earlier draft conflicted, both the authority and these corrections win — the signed HMAC capability, `sessionStorage`, the legacy-UUID one-time claim, and the local-prescreen-then-classifier design are withdrawn. No redesign: brand, VITA, typography, navigation, and cards are untouched; visible change is limited to consent, privacy, export, deletion, and status surfaces. Nothing is published.

## Step 0 — staging must exist and be proven before any implementation

Implementation does not begin until a staging clone is provisioned and I have recorded its **project/environment fingerprint** (project ref, database host, environment label, UTC timestamp) in `docs/staging-fingerprint-<date>.md`, together with written confirmation that Lovable's connected backend, all migrations, Edge functions, cron jobs, test accounts, and processor test-mode calls target that staging clone — not production. Creating a preview must not apply migrations to the production project. **If the connected target is production, or the target cannot be proven, I stop and report instead of editing.**

## Environment split (corrected)

- **Production: read-only only.** Live work is limited to read-only RLS/grant/policy enumeration. No migrations applied, no auto-confirm signup, no test member creation, no mutation probes, no deletion runs, no email OTP sends, no Stripe calls, no Dexcom sync. Production changes wait for separate deployment approval.
- **Staging clone: everything else.** Migrations, Edge functions, cron, Member A / Member B / admin-JWT mutation probes, deletion state-machine runs, export runs, email OTP reauth tests, Stripe test-mode behavior, retention dry runs, and cleanup verification all run there with synthetic accounts and a unique run ID.
- Without a proven staging clone, P4 behavioral probes are **BLOCKED — staging clone required**; only read-only production enumeration ships. P4 never passes on enumeration alone.


## Platform limitations to decide

1. **Same-site cookie / BFF.** Edge functions run on a different origin than the app, so a `SameSite=Strict` HttpOnly session cookie cannot be demonstrated. Per §4.1 this means the **in-memory launch mode** (opaque token held only in page JavaScript memory), no cross-session anonymous memory, and no `sessionStorage` fallback.
2. **Reauthentication for export/deletion** uses email OTP; verified in staging only.
3. **Stripe redaction / Dexcom revocation / Resend erasure** are processor actions that cannot be proven from code; implemented as tracked states, never claimed completions.

## Gates left visibly open (BLOCKED — OWNER/PROFESSIONAL DECISION REQUIRED)

AI processor contract/DPA gate, email processor gate, financial-record retention gate, privacy-notice/counsel gate, HBNR incident-response gate, production identity gate. Per §5.3, while the AI processor gate is unproven the consent panel ships **without** `Agree and continue` and offers only deterministic non-health mode; that switch is a single server-read flag.

**Privacy Notice:** this phase does **not** author privacy-notice copy. It removes the unsafe browser-UUID actions from `/privacy` and renders only wording supplied verbatim by the authority. Final legal copy will be supplied separately by Codex.

## Order of work (authority §8)

### 1. Manifest and tests first (no data touched)
- `supabase/functions/_shared/dataInventory.ts` — single manifest (category, tables/vendor, subject keys, export fields, delete action, retention rule, processor action, dependency order, reconciliation query) covering every category in §6.2.
- Completeness tests against live `information_schema` (tables, views, functions, Storage, Realtime) so a new table cannot escape export/deletion.

### 2. P1 — opaque sessions, ownership, CORS, atomic rate limits
- Migration: `visitor_sessions` (id, `token_hash`, visitor_profile_id, user_id, timestamps, idle/absolute expiry, revoked_at/reason, consent link), `rate_limit_events` (atomic increment, 24h purge), and an **unused** `visitor_profiles.quarantined_at` column. Service-role only; no anon/authenticated grants.
- **Legacy quarantine is report-only.** The migration adds the column but marks **zero** production rows. A read-only report produces per-cohort counts of unlinked legacy anonymous profiles. Marking and the 30-day purge are separate, later migrations requiring your approval after you review the counts. Code stops trusting legacy UUIDs immediately regardless.
- New `supabase/functions/visitor-session/index.ts`: CSPRNG opaque token, only its hash stored, 30-min idle / 24-h absolute, rotation on sign-in, sign-out, consent change, merge.
- `_shared/session.ts`, `_shared/rateLimit.ts` (atomic SQL), `_shared/cors.ts` (exact origin allowlist replacing `*`), `_shared/ip.ts` (HMAC-keyed hash from the trusted ingress header only; new secret).
- Subject resolved only from the verified session/JWT; `conversation.visitor_profile_id` ownership verified server-side; 401 vs 403 without existence disclosure; body/length/method/content-type limits; no message content, tokens, or headers logged.
- `ChatWidget.tsx` deletes `drm_visitor_id` from storage on start and holds the token in a ref only. `useAuth.tsx`, `Onboarding.tsx`, `IntakeForm.tsx`, `SixWeekReset.tsx`, `PaymentModal.tsx`, `Settings.tsx`, `Privacy.tsx`, and `stripe-webhook` stop reading/writing it.

### 3. P2 — AI boundary across every AI Gateway caller
Applies to **all** gateway callers, not just public chat. Inventory and disposition covers at minimum: `chat-agent`, `ask-vita`, `generate-meal-plan`, `support-assistant`, `summarize-conversation`, `daily-digest`, `verify-community-answer`, and embedding generation. Each gets a documented row: purpose key, data sent before/after, consent requirement, and disabled-until-gate status.

- `consent_records` migration supports **separate purpose keys**: `public_chat_ai_health`, `ask_vita_ai_health`, `meal_plan_ai_health`, `support_ai_health` (extensible), with notice version, hash of displayed text, processor list/version, granted_at, revoked_at, source surface; no IP, no full UA. No feature may treat membership payment or public-chat consent as authorization for another AI use; before the applicable consent, each feature uses deterministic handling or its health-processing path is disabled.
- `_shared/chatFaq.ts`: deterministic local answers for membership, price, cancellation, login, membership status, navigation, plus the verbatim pre-consent fallback and deterministic emergency handoff. No external classifier on the pre-consent path.
- **No raw pre-consent storage.** Before consent, the public chat writes only an approved structured FAQ key plus non-sensitive operational metadata. Raw free text never reaches Supabase, logs, analytics, email, summaries, embeddings, or any external processor; the possible-health message stays in volatile browser memory and is discarded if consent is declined.
- `ChatWidget.tsx` consent panel uses the verbatim §5.3 copy — no preselection, equal visual weight, existing tokens. Pending message sent at most once after a successful consent write. Consent-write failure shows the verbatim error copy.
- Withdrawal (verbatim §5.6) in Settings and in the chat's Privacy options, per purpose key.
- Minimization: name/email removed from prompts; `summarize-conversation` public raw-transcript path disabled; `daily-digest` rebuilt from local structured counts with no raw conversation leaving Supabase. Classifier/model failure and uncertainty fail closed.

### 4. Resend audit (all callers)
Full report of every Resend caller, split into **non-health transactional** (authentication, billing/receipts, account notices — allowed to continue) and **health-containing** (`send-progress-summary`, `send-meal-plan`, support/QA mail, daily digest, member check-ins, and any other flow carrying meal plans, questions, progress, symptoms, or health values). Health-containing flows — especially anything to an admin/founder inbox — are **server-disabled behind a flag** until the email-processor and consent gates pass. Tracking disabled on health-related mail.

### 5. P3 — export
- New `export-my-data`: authenticated, recent-reauth required, subject from the verified JWT and verified account emails only, one snapshot feeding a readable ZIP (`README.txt`, named CSVs, UTC, units) and a machine-readable JSON (schema version, category, source table). §6.3 exclusion list enforced by test. `no-store`/`nosniff`/attachment headers, five-minute one-time link, rate limited.
- `Settings.tsx`: `Download my data` and `Machine-readable JSON` plus the verbatim status line, replacing the current client-side exporters.

### 6. P3 — deletion state machine (built and proven in staging)
- Migration: `deletion_jobs` with `requested → identity_verified → access_blocked → in_progress → waiting_for_processor → reconciled → completed`, plus `partial`/`failed`, per-category expected/actual counts, retry cursor; `profiles.deletion_pending`.
- **`deletion_pending` is enforced in RLS/PostgREST policies**, not only in Edge-function checks, so an unexpired JWT cannot write directly. Edge functions enforce it as a second layer.
- **Worker security:** pg_cron only triggers the Edge worker over HTTP. Stripe, Dexcom, Resend, service-role, and every other processor secret stays in the Edge-function secret environment — never in SQL, cron job definitions, or cron arguments.
- `delete-my-account` (creates/queries the job only) plus `deletion-worker` executing §6.4 order: subject resolution, block + session revoke, deliberate Stripe cancellation, queue stop, dependency-ordered deletion with counts, Dexcom local token/data deletion with `action_required_by_member`, processor tracking, Storage objects, Auth user last, reconciliation. No-op and partial are failures; timeouts cannot produce a false completion.
- Deletion dialog uses the verbatim §6.5 copy (reauth + typed `DELETE`, accepted/completed/partial messages).

### 7. Retention — report-only
`purge-inactive-visitors` becomes a manifest-driven retention worker in **report-only** mode with the §6.7 per-category schedule and the "meaningful activity" definition. Counts only; no deletion activated. `/privacy` copy limited to authority-supplied wording.

### 8. P4 — production enumeration (read-only) then staging probes
- `scripts/rls/enumerate.sql` + `scripts/rls/report.ts`: read-only, dated, environment-fingerprinted inventory of RLS state, forced state, grants, every `USING`/`WITH CHECK`, views and `security_invoker`, security-definer functions and execute grants, Storage buckets/policies, Realtime publications, secret-using edge functions, and the admin-role source; flags RLS off, no policy, public grants, `USING (true)`, missing `WITH CHECK`, unsafe views, user-editable role sources; migration-intent diff; no row contents or real identifiers.
- Policy fixes land as forward migrations, then `scripts/rls/probe.ts` runs anonymous / Member A / Member B / admin JWT **in staging** (service role tested separately, never as an admin pass), verifying the target row after each request, run-ID scoped, with proven cleanup. Output: `docs/rls-verification-<date>.md`.

### 9. Verification
Authorization tests (§4.5), consent tests including a network assertion that no free text reaches an external domain pre-consent (§5.7), export/deletion/retention tests on a seeded synthetic staging user (§6.8), then **`tsc --noEmit`** (tsgo is not installed or configured in this project), `eslint` on touched files, Vitest, and `vite build`. No publish.

## Rollback (corrected)

`-- rollback` SQL comments are documentation, not an executable rollback, and will not be presented as one. Each schema migration ships with a **tested forward/compensating migration** (drop the added table/column, restore the prior *safe* definition) plus a written manual rollback procedure in `docs/`. A policy identified as insecure is never automatically restored — its compensating migration installs the corrected policy, and reverting to the insecure original requires an explicit, separately authored migration by you. Data-affecting steps (legacy quarantine, deletion worker, retention) run report-only first and require your approval of the counts before any marking or purge.

## Completion report

Per §9: files/migrations/functions changed, behaviors removed and replacements, proof no browser UUID or web-storage capability remains as authorization, consent notice version and processor names with gate status, per-caller AI data flows before/after, Resend caller audit with health/non-health split and disabled flows, full manifest, export inclusion/exclusion report, deletion state-machine and reconciliation evidence, retention dry-run counts with confirmation nothing was deleted, production RLS enumeration plus staging principal matrix and cleanup evidence (or the exact blocker), test/type/lint/build results, and the preview URL.
