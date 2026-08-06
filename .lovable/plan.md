# P1–P4: Chat authorization, consent, deletion/export, and RLS verification

Security- and privacy-sensitive remediation. No publishing. No real member data touched — all runtime tests use freshly created, clearly labelled test accounts and are cleaned up afterwards.

## Threats being corrected

| # | Threat (today) | Correction |
|---|---|---|
| T1 | A browser-generated UUID in `localStorage` (`drm_visitor_id`) is accepted by a service-role function as identity. Anyone can send another person's ID and read/extend their visitor profile. | Server-minted, signed, expiring visitor capability. The raw browser UUID stops being authorization. |
| T2 | `conversation_id` from the client is used without checking it belongs to the visitor — cross-visitor message injection and history read. | Ownership check on every conversation reference; reject non-owned IDs with 403. |
| T3 | Chat silently relinks an existing visitor profile to whatever account is signed in (`user_id` overwrite). | Never relink a profile already bound to a different user; start a new profile instead. |
| T4 | Public chat endpoint has no rate limiting. | Per-capability and per-IP rate limits with a fail-closed cap. |
| T5 | Consent is a `localStorage` flag; the server consent endpoint is never called from the widget; the raw message is sent to an external AI classifier *before* any consent exists; classifier failure returns `contains_phi: false` (fail-open). | Versioned server-side consent tied to the capability; deterministic local pre-screen runs before any external call; classifier failure and low confidence both fail closed. |
| T6 | Signed-in deletion passes `user.id` as `anonymous_id`, matches nothing, and still reports success; it only removes visitor/chat rows, leaving health, community, device, and consent data. | Authenticated deletion orchestrator with an explicit category inventory, per-category reconciliation, and no success response on unresolved target or partial failure. |
| T7 | Exports are partial and inconsistent between the CSV zip and the "developer JSON". | One human-readable export and one complete machine-readable export, both driven by the same inventory. |
| T8 | The 730-day purge covers only visitor profiles while the privacy notice implies all personal health data. | Retention job and notice both expressed against the real category list; 730 days stated as a maximum. |
| T9 | RLS intent has never been checked against what is actually installed. | Enumerated live policy inventory plus runtime probes as anonymous / member A / member B / admin. |

## P1 — Chat ownership and server-side authorization

New edge function `visitor-session` mints a capability:

- Payload `{ vid: <visitor_profile_id>, uid: <user_id|null>, iat, exp }`, HMAC-SHA256 signed with a new secret `VISITOR_CAPABILITY_KEY`, 24h expiry, returned to the browser and stored in `sessionStorage`.
- The legacy `drm_visitor_id` value may be presented once to *claim* an existing anonymous profile, only when that profile has `user_id IS NULL`. A profile bound to a user can only be resumed by that same authenticated user.
- Signing in issues a new capability; it does not mutate an existing anonymous profile's `user_id` when that profile is already claimed by someone else.

`chat-agent`, `grant-phi-consent`, and `request-data-deletion` change to:

- require a valid capability (and, where the profile is member-bound, a matching bearer token);
- resolve `visitor_profile_id` from the verified capability only — never from the request body;
- verify `conversation_id` belongs to the resolved profile before reading history or inserting messages;
- return 401 on invalid/expired capability, 403 on ownership mismatch.

Rate limiting: new table `rate_limit_events` (key, window_start, count) checked in `chat-agent` — 20 messages / 10 min per capability and 60 / 10 min per IP hash; over-limit returns 429 without calling any AI.

## P2 — Health-data consent before external AI processing

- Deterministic local pre-screen (`_shared/phiPrescreen.ts`, no network) flags likely health disclosure by pattern: lab values, A1C, glucose numbers, medication name list, diagnosis/symptom vocabulary.
- If the pre-screen flags health content **and** no active consent exists, the message is not stored as content and is never sent to the external model. The widget receives `needs_phi_consent` and shows the consent panel.
- The panel names: what is stored, who at DRM can see it, that an outside AI provider processes messages, the purpose, retention, how to delete, and links to `/privacy`. Buttons: **"Agree and continue"** and **"Continue without sharing health information."**
- "Agree" calls `grant-phi-consent` with the capability; the server writes a versioned `phi_consent` row (policy version bumped) and returns the recorded version. Local storage is a cache only and is never trusted.
- "Continue without sharing" sets a session-scoped non-health mode: pricing, product, and navigation questions still work, health content is declined with a short redirect line. Sales assistance is never blocked.
- Fail closed: classifier error, `confidence < 0.6`, or missing consent record all take the no-external-processing path.
- Withdrawal: Settings and `/privacy` gain a "Withdraw health-data consent" action that sets `revoked_at` server-side.

## P3 — Deletion, export, retention

Shared inventory module `_shared/dataInventory.ts` lists every category with its tables and disposition:

- **Deleted immediately** — profile, health logs, blood sugar / A1C / measurements / meals / water / mood / walks / snacks, progress, streaks, badges, community posts/answers/votes, chat conversations & messages, visitor profile, device connections, consent records, notifications, AI meal plans, derived engagement scores.
- **Sent to a processor** — Dexcom token revocation, Stripe customer detach.
- **Retained for a documented reason** — order/subscription financial records, `phi_access_log` audit entries, the deletion request record itself.

New authenticated edge function `delete-my-account`:

- resolves the target strictly from the verified bearer token (never from the body);
- requires typed confirmation echoed in the request;
- walks the inventory, records per-category row counts, and reconciles by re-querying after deletion;
- returns `partial` with the failing categories and HTTP 500 when anything remains; returns success only when every immediate category reconciles to zero;
- idempotent and retry-safe via the `deletion_requests` row.

New `export-my-data` edge function returns both artifacts from the same inventory: a readable multi-CSV zip with a `README.txt` explaining each file, and one complete `drm-export.json`. Settings replaces the two divergent client-side exporters with these.

Retention: `purge-inactive-visitors` extends to the same inventory for accounts with no activity, logs per-category counts, and the `/privacy` copy is rewritten to state 730 days as a maximum with the actual category list. Settings deletion confirmation copy is rewritten to state exactly what is deleted, what is sent onward, and what is retained and why.

## P4 — Live RLS verification

Direct read access to the live database is available from this environment (`pg_policies` returns 159 rows), so enumeration will be done against production, not source files.

1. `scripts/rls/enumerate.sql` dumps every table's `rowsecurity` flag, grants, and policy expressions for all personal/health/chat/order/subscription/community tables.
2. A diff report compares that inventory against migration intent and flags tables with RLS off, no policies, `USING (true)`, or anon grants.
3. `scripts/rls/probe.ts` runs behavioural probes through PostgREST as four principals: anonymous (publishable key), member A, member B, and admin — using two throwaway test accounts created for the run and deleted after. For each table it attempts select/insert/update/delete of the other member's row and records the result.
4. Output written to `docs/rls-verification-<date>.md` with date, environment, principal matrix, pass/fail per table, and reviewer line.

RLS is marked passed only if both enumeration and all four-principal probes complete. If test accounts cannot be created (signups disabled) the report will name that as the exact remaining blocker and the permission needed, and RLS stays failed.

## Verification

- Authorization tests (Vitest + Deno-side unit tests): anonymous A cannot access anonymous B; member A cannot claim B's profile; member A cannot inject into or read B's conversation; expired/tampered capability rejected; logout/login transitions.
- Consent tests: pre-screen boundary cases, no external call before consent, classifier-failure fail-closed, withdrawal, non-health sales path unaffected.
- Deletion tests: seeded-user reconciliation, downstream failure surfaces as failure, retry idempotency, unauthorized deletion rejected, no-op target returns failure not success.
- Export completeness test: every inventory category present in the JSON export.
- Then `tsgo` typecheck, ESLint, Vitest, and production build. No publish.

## Report delivered at the end

Threats corrected, full file/migration list, consent and deletion behaviour description, RLS evidence or the exact blocker with the permission required, test/build results, and the preview URL.
