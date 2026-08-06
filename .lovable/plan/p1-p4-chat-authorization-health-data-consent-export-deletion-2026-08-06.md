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
- Completeness checks do **not** rely on `information_schema` alone. They combine `information_schema`, `pg_catalog` (including `pg_class`/`pg_attribute`/`pg_proc`), the policy and grant catalogs (`pg_policies`, `pg_policy`, table/column/routine privileges), Storage metadata and object policies, Realtime publications, function/RPC execute grants, and the Edge-function inventory — so no table, view, function, bucket, publication, or function-held data path can escape export/deletion.

### 2. P1 — opaque sessions, ownership, CORS, atomic rate limits
- Migration: `visitor_sessions` (id, `token_hash`, visitor_profile_id, user_id, timestamps, idle/absolute expiry, revoked_at/reason, consent link), `rate_limit_events` (atomic increment, 24h purge), and an **unused** `visitor_profiles.quarantined_at` column. Service-role only; no anon/authenticated grants.
- **Legacy quarantine is report-only.** The migration adds the column but marks **zero** production rows. A read-only report produces per-cohort counts of unlinked legacy anonymous profiles. Marking and the 30-day purge are separate, later migrations requiring your approval after you review the counts. Code stops trusting legacy UUIDs immediately regardless.
- New `supabase/functions/visitor-session/index.ts`: CSPRNG opaque token, only its hash stored, 30-min idle / 24-h absolute, rotation on sign-in, sign-out, consent change, merge.
- `_shared/session.ts`, `_shared/rateLimit.ts` (atomic SQL), `_shared/cors.ts` (exact origin allowlist replacing `*`), `_shared/ip.ts` (HMAC-keyed hash from the trusted ingress header only; new secret).
- Subject resolved only from the verified session/JWT; `conversation.visitor_profile_id` ownership verified server-side; 401 vs 403 without existence disclosure; body/length/method/content-type limits; no message content, tokens, or headers logged.
- `ChatWidget.tsx` deletes `drm_visitor_id` from storage on start and holds the token in a ref only. `useAuth.tsx`, `Onboarding.tsx`, `IntakeForm.tsx`, `SixWeekReset.tsx`, `PaymentModal.tsx`, `Settings.tsx`, `Privacy.tsx`, and `stripe-webhook` stop reading/writing it.

### 3. P2 — AI boundary across every AI Gateway caller
Applies to **all** gateway callers, not just public chat. Inventory and disposition covers at minimum: `chat-agent`, `ask-vita`, `generate-meal-plan`, `support-assistant`, `summarize-conversation`, `daily-digest`, `verify-community-answer`, and embedding generation. Each gets a documented row: purpose key, data sent before/after, consent requirement, and disabled-until-gate status.

- `consent_records` migration supports **separate purpose keys**: `public_chat_ai_health`, `ask_vita_ai_health`, `meal_plan_ai_health`, `support_ai_health`, community-embedding paths (extensible), with notice version, hash of displayed text, processor list/version, granted_at, revoked_at, source surface; no IP, no full UA. No feature may treat membership payment or public-chat consent as authorization for another AI use.
- **Consent copy is never invented.** Only the supplied public-chat consent copy is implemented. `ask_vita_ai_health`, `meal_plan_ai_health`, `support_ai_health`, community embedding generation, and every other health-sensitive AI path stay **server-disabled** until Codex supplies their exact just-in-time wording or confirms an approved common notice. The database may carry the purpose keys now; the UI for them ships later.
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
- Migration: `deletion_jobs` with `requested → identity_verified → access_blocked → in_progress → waiting_for_processor → reconciled → completed`, plus `partial`/`failed`, per-category expected/actual counts, retry cursor.
- **Durable deletion lock, not `profiles.deletion_pending`.** A server-controlled `account_lifecycle` record (subject user ID, state `active`/`deletion_pending`/`deleted`, timestamps, service-role writes only) is the authority, because the profile row may be deleted before the Auth user while an unexpired JWT remains usable. The lifecycle row (or a locked profile tombstone) survives until Auth deletion completes.
- **RLS fails closed:** every relevant policy requires an `account_lifecycle` row that exists **and** is `active`; a missing, non-active, or deleted lifecycle record denies the write. Enforced in RLS/direct PostgREST policies first, with Edge-function checks as a second layer.
- **Worker security:** pg_cron only triggers the Edge worker over HTTP. Stripe, Dexcom, Resend, service-role, and every other processor secret stays in the Edge-function secret environment — never in SQL, cron job definitions, or cron arguments.
- `delete-my-account` (creates/queries the job only) plus `deletion-worker` executing §6.4 order: subject resolution, block + session revoke, deliberate Stripe cancellation, queue stop, dependency-ordered deletion with counts, Dexcom local token/data deletion with `action_required_by_member`, processor tracking, Storage objects, Auth user last, reconciliation. No-op and partial are failures; timeouts cannot produce a false completion.
- Deletion dialog uses the verbatim §6.5 copy (reauth + typed `DELETE`, accepted/completed/partial messages).

### 7. Retention — report-only
`purge-inactive-visitors` becomes a manifest-driven retention worker in **report-only** mode with the §6.7 per-category schedule and the "meaningful activity" definition. Counts only; no deletion activated. `/privacy` copy limited to authority-supplied wording.

### 8. P4 — read-only enumeration, staging probes, then post-deployment production match
- `scripts/rls/enumerate.sql` + `scripts/rls/report.ts`: read-only, dated, environment-fingerprinted inventory of RLS state, forced state, grants, every `USING`/`WITH CHECK`, views and `security_invoker`, security-definer functions and execute grants, Storage buckets/policies, Realtime publications, secret-using edge functions, and the admin-role source; flags RLS off, no policy, public grants, `USING (true)`, missing `WITH CHECK`, unsafe views, user-editable role sources; migration-intent diff; no row contents or real identifiers.
- Policy fixes land as forward migrations **applied to staging only**, then `scripts/rls/probe.ts` runs anonymous / Member A / Member B / admin JWT in staging (service role tested separately, never as an admin pass), verifying the target row after each request, run-ID scoped, with proven cleanup.
- **Post-deployment match (required for P4 to pass):** after you separately approve deploying those migrations to production, production read-only enumeration runs again and the installed production policy definitions are diffed against the exact staging-tested definitions. **P4 does not pass until that final comparison is attached and clean.** Output: `docs/rls-verification-<date>.md`.


## Final implementation addendum (no architecture change)

**A. Retire every legacy authorization and consent path.**
- Delete and clear the legacy visitor UUID (`drm_visitor_id`) and the local health-consent flag (`drm_landing_chat_consent`) from `ChatWidget.tsx`, `Privacy.tsx`, and every other reader/writer; the widget actively removes both from browser storage on load.
- `request-data-deletion` is retired: it returns **410 Gone** and never accepts `anonymous_id` again.
- `grant-phi-consent` is rewritten to require the verified opaque session (or JWT), an explicit purpose key, and the current notice version; requests missing any of these are rejected.
- Codebase-wide sweep for legacy identifiers and consent flags across `src/`, built output, all Edge functions, database functions, checkout/Stripe metadata, and tests. Every hit is listed in the report with its disposition.

**B. Legacy `phi_consent` rows are not valid consent.** The old UI and server paths were disconnected, so existing rows cannot authorize AI processing. New writes to that table stop. The rows are included in export and deletion as a clearly **labelled legacy record**, with raw IP and full user-agent excluded from member exports. A read-only production count and disposition report is produced; no migration, purge, or conversion of old rows into active consent happens without your later approval.

**C. Gate-closed chat copy (exact).** While the AI contract gate is closed, the normal consent body is never shown with a missing button. A separate unavailable state is displayed verbatim:
- Title: `Health questions are not available in this chat yet`
- Body: `I can still help with the membership, price, login, and where to find things. For questions about your health, medications, symptoms, or results, contact a qualified healthcare professional. If you think this may be an emergency, contact emergency services now.`
- Button: `Continue with membership questions`

The server AI-health flag **defaults to false** and lives in server-controlled configuration that members and browser code cannot modify.

**D. Active anonymous-session deletion.** The chat Privacy options include **Delete this chat**. It requires a valid active visitor session, deletes and reconciles that session's conversation, messages, consent, and derived records, revokes the session token, and never accepts a visitor or conversation ID as authorization. Processor deletion is never claimed unless that processor step is verified.

**E. Explicit anonymous-to-member merge.** A merge is allowed **once**, inside a single transaction, only when: the anonymous session is valid and active; the visitor profile is unbound; the authenticated JWT is valid; both are presented in the same request; and no record is already bound to another user. The session is rotated afterward. An existing `user_id` is never overwritten and two established identities are never silently merged.

**F. Lifecycle lock covers all personal access, not only writes.** When `account_lifecycle` is not `active`, member-facing SELECT, INSERT, UPDATE, DELETE, RPC, Storage, and Realtime access to personal records is denied; missing lifecycle state fails closed. Public reference content stays readable. The lock persists until Auth deletion completes, so an old JWT cannot read data.

**G. Server-verifiable recent reauthentication.** Export and account deletion require either a freshly issued authenticated session or a single-use **server action ticket** bound to the verified user, the specific action (`export` or `delete`), with a maximum ten-minute lifetime, consumed once. Client timestamps, booleans, local-storage values, and a typed `DELETE` alone are never trusted.

**H. Deterministic emergency line (exact).** For a possible emergency before consent, the server returns exactly: `I can't assess symptoms or emergencies. If you think this may be an emergency, contact emergency services now. Otherwise, contact a healthcare professional promptly.` The triggering message is not stored and is not sent to AI, analytics, email, embeddings, or any other processor.

All of the above are added to the authorization, consent, export, and deletion test suites and to the completion report. No production mutation. No publish.


### 9. Verification
Authorization tests (§4.5), consent tests including a network assertion that no free text reaches an external domain pre-consent (§5.7), export/deletion/retention tests on a seeded synthetic staging user (§6.8), then **`tsc --noEmit`** (tsgo is not installed or configured in this project), `eslint` on touched files, Vitest, and `vite build`. No publish.

## Rollback (corrected)

`-- rollback` SQL comments are documentation, not an executable rollback, and will not be presented as one. Each schema migration ships with a **tested forward/compensating migration** (drop the added table/column, restore the prior *safe* definition) plus a written manual rollback procedure in `docs/`. A policy identified as insecure is never automatically restored — its compensating migration installs the corrected policy, and reverting to the insecure original requires an explicit, separately authored migration by you. Data-affecting steps (legacy quarantine, deletion worker, retention) run report-only first and require your approval of the counts before any marking or purge.

## Completion report

Per §9: staging fingerprint and target proof, files/migrations/functions changed, behaviors removed and replacements, proof no browser UUID or web-storage capability remains as authorization, consent notice version and processor names with gate status plus the list of AI paths left server-disabled pending Codex copy, per-caller AI data flows before/after, Resend caller audit with health/non-health split and disabled flows, full manifest, export inclusion/exclusion report, deletion state-machine and reconciliation evidence including the lifecycle-lock behavior, retention dry-run counts with confirmation nothing was deleted, production RLS enumeration plus staging principal matrix, cleanup evidence, the pending post-deployment production match (or the exact blocker), test/type/lint/build results, and the preview URL.
