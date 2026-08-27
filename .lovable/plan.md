# Batch 2 — Experience, Design and Admin Consolidation

One continuous implementation run of Parts A–H from the prelaunch audit. Nothing is published. Batch 1 corrections (clinical content, timezone, glucose, hydration, habit concurrency, workouts, support tickets, Activity Score ledger, badges, privacy) are preserved and regression-tested, not rebuilt.

## Preflight

- Confirm production project ref `wqennhjdojjqmmqzjhti` and domain `https://diabetesresetmethod.com`.
- Record starting code SHA and current production bundle name.
- Capture before-state screenshots for every surface materially changed.
- Stop only on a project mismatch, destructive-data risk, or contradiction of Batch 1 evidence.

## A — Stable app shell, nonblank navigation

- Replace `null` Suspense fallbacks with route-shaped skeletons plus an accessible loading status; keep shell, nav and heading visible during transitions.
- Page-specific skeletons for Today, Meals, Progress, Learn, Ask, Profile, Settings, Billing, Support, Admin.
- Prefetch route chunks on hover, keyboard focus and browser idle, without duplicate requests.
- Tune query cache/stale times; optimistic local states for small saves.
- Access decisions (auth, deletion, billing restriction) always re-evaluated; no private caching outside app state.
- Measure cold `/app`, first navigation, return navigation, time-to-useful-content and request counts; report as evidence only.

## B — Typography, contrast, interaction

- Inter/system sans for all authenticated controls, body, small headings, forms, tables, numbers. Fraunces only for marketing and large (24–28px+) headings; no small bold serif.
- 16px body, ≥14px secondary, 15–16px nav; remove pale 10–12px meaningful text.
- WCAG 2.2 AA contrast; fix sidebar group labels and account text.
- ~44px nav rows and controls; visible focus, skip link, one H1, correct landmarks, no colour-only status, reduced-motion respected.
- No horizontal overflow at 320/390/768/1280 and 200% zoom; VITA, sticky bars, toasts and sheets never cover actions.
- Route-wide typography scan, not dashboard-only.

## C — Today, Profile, notifications

- `Day X of 180` plus separate `Phase N — [name], day X of Y`, with plain-language phase explanation; phase end never shown as programme end.
- Locked next day stays locked; one-primary-action hierarchy kept; catch-up collapsed and neutral.
- "Log habits" scrolls to and focuses the habit heading; Mindset becomes an explicit Read/Hide reflection disclosure; VITA prev/next hidden with one active quote.
- Activity Score: explain source and earning, recent points from the ledger only, or an honest migration state; retired badges stay absent; no new badge catalogue.
- Toasts: success 4–6s, info 6–8s, actionable errors 8–10s or persistent with dismiss; pause on hover/focus; polite live region.
- Notifications: labelled unread count, per-item read on open, mark-all-read clears, live count updates, honest empty/loading/error states.

## D — Meals and shopping list

- `By meal` first and default, scoped to the selected day/meals; `By category` second; explicit whole-week expansion.
- Lazy-render meal-day sections; preserve selections across view switches.
- Ingredient parser fixes (`arge eggs`, `s broccoli florets`, etc.) with fixtures for quantities, fractions, Unicode fractions, plurals, optional and numeric prefixes; unit-compatible dedupe only.
- Neutral wording (`plate-method aligned`); report — not rewrite — any contradictory clinical instruction.
- Verify rapid selection/typing never loses characters and 3/3 plate components persist after reload.

## E — Learn, Ask, Support, Settings

- `Return to Guides` restores list, URL and focus; back/forward stays in sync.
- Fasting guide is education-only: no questionnaire/scheduler implication, return actions lead to Learn → Guides.
- Mindset relabelled `Six-week mindset collection`, replayable; every Read/Open/Printable action opens a real destination or the card is retired.
- One primary nav destination `Ask` (remove duplicate Community item); inside Ask, distinct `Ask VITA` and `Post to community` with an explanation of the difference; deterministic VITA safety routing preserved; honest community pending/moderation/report/failure states; no external model call on community health text.
- Support: sample prompts move into placeholder/chips, success only after the ticket exists, show reference number and honest email state, `info@diabetesresetmethod.com`, "We aim to respond within one business day", `/admin/support` verified.
- Settings: remove cheat-meal/fasting/supplement leftovers, describe real delivery channels, magic link stays on, restricted-billing members keep Billing/Settings/Support/export/deletion, explain owner `No subscription found`, MCP behind an Advanced flag.

## F — Admin consolidation

- Persistent `Back to member app`; admin-role check preserved.
- Intake Forms and Challenge Progress removed from active navigation (records retained, archived wording); confirm no app writes to challenge progress.
- Billing metrics rebuilt on the canonical order/subscription/billing-event model with as-of timestamp and distinct loading/empty/error states; reconciled against read-only queries; no unnecessary Stripe identifiers.
- Support Queue reachable and permission-protected with reference, created time, category, coarse platform/viewport, email state, status, filters; no raw user agent.
- Coaching interest list: minimal member surface ("Interested in future coaching?", no availability promise, consent + timestamp only, remove-my-interest) and admin view with status/withdrawal; RLS for self-manage + admin manage; included in export/deletion/retention inventory.
- Retire Top Customers card, refresh action and WhatsApp scripts from active Admin; no cron secret in the browser; historical data retained.
- Daily Digest stays local-only and disabled unless the approved flag enables it; document remaining AI/Edge/email/DB cost surfaces; PHI audit kept with safe indexes/pagination; icon-only controls named; destructive actions confirmed.

## G — Database and security

- Additive migration only if needed for the coaching-interest list, with rollback notes, before/after schema and row counts.
- RLS verified as anonymous, Member A, Member B, admin; write/deletion/admin restrictions intact.
- Synthetic records tagged with a run ID and deleted by exact ID.
- No secret, cron secret, Stripe identifier or service-role credential in the bundle.
- Deploy only Edge Functions that materially changed, after their focused tests pass.

## H — Verification and report

Gates: TypeScript, full Vitest, focused Deno checks for changed functions, ESLint on touched files, production build, bundle scan (no source maps/fixtures/secrets/staging refs/retired copy), safe-claims scan across source and DB-managed UI content, CORS/boot smoke, RLS principal matrix, export/deletion/retention coverage, synthetic cleanup proof.

Then the 24-item signed-in task matrix on desktop and mobile, and the responsive/accessibility matrix at 320/390/768/1280, 200% zoom, keyboard-only, reduced motion and landmark inspection.

Deliverable: `BATCH-2-COMPLETION-REPORT.md` with starting/final SHAs, production confirmation, all files/migrations/functions changed, items preserved, before/after evidence and screenshot locations, performance numbers, DB/RLS evidence, cleanup proof, PASS/FAIL/BLOCKED/NOT TESTED per gate, Batch 3 carry-over, Batch 1 controls green, and confirmation that no publication occurred.

Out of scope: PWA/service worker, publication, clinician feedback, Day-181 programme, large badge catalogue, new paid services, personalized health AI, broad dependency upgrades.

## Approved additions (final requirements)

**Boundaries.** The only permitted production writes are additive migrations for an approved Batch 2 data surface, deployment of materially changed Edge Functions, and labelled synthetic records deleted by exact ID. No real emails, health-AI calls, Stripe mutations, refunds, deletions or real member-record changes. Batch 1 clinical copy, fasting/supplement/cheat-meal disablement, Prompt 3 privacy, Prompt 4 payment/legal truth and Prompt 5 billing lifecycle are preserved and regression-tested only.

**Route loading.** Workouts is included in the page-specific skeleton and prefetch coverage. Every authenticated route keeps shell, navigation and an accessible loading state visible, retains safe cached data while revalidating, and never bypasses authentication, billing or deletion restrictions.

**Meals.** Additionally: quantity-less ingredients stay readable; no combined quantity is shown when units are incompatible; switching shopping-list views cannot lose selections; parser correction cannot silently alter a legitimate ingredient; the selected day stays the default after reload.

**Learn / Community / Support / Settings.** Mindset creates no Weeks 7+ and no new required task stream. Empty community states fabricate nothing. Personalized health AI is not promoted. Common support/navigation answers stay deterministic and non-AI. Meal-plan regeneration stays capped with usage/cost visible only in Admin reporting. Every Learn Read, Open, Printable, Back and Return action is exercised in the route test matrix, not by static link inspection.

**Admin evidence.** Billing metrics reconcile orders, active subscriptions, cancellations, refunds, disputes and payment failures separately; a backend/Edge failure renders an error, never zero revenue. Support Queue gains accessible filter, status and reply-state controls and stays covered by export, deletion and retention. The coaching-interest list uses authenticated identity/email, collects no health narrative or free-text health information, makes no urgency/deposit/checkout/availability/launch promise, and gets an authorized export only if the existing safe admin export pattern supports it. Top Customers never ranks members from health conversations, its browser refresh path is removed entirely, and no cron secret is weakened or exposed. Daily Digest verification proves zero raw transcript/question/answer/health text leaves the backend and zero external AI calls. PHI audit may gain safe indexes and pagination only — no purge, no new destructive retention rule.

**Data manifest and security.** Every new or altered table, column, storage surface, function or admin operation — not only coaching interest — is added to the Prompt 3 inventory and verified for export, deletion and retention. Retention stays in its currently approved mode. RLS is verified as anonymous, Member A, Member B and admin. No browser bundle contains a client secret, cron secret, service-role credential, unnecessary Stripe identifier or staging reference.

**Acceptance evidence.** The 24 signed-in tasks and the responsive/accessibility matrix are binding; each numbered task is executed and reported individually. Also proven: before/after screenshots for every materially changed authenticated surface on desktop and mobile; keyboard focus after asynchronous navigation; no obstruction from VITA, sheets, toasts or sticky controls; readable chart alternatives and no colour-only status; reduced-motion behaviour; exact synthetic-record cleanup counts; and no unsafe or retired Batch 1 content in source, database-managed UI content or the production bundle.

Batch 2 is not reported complete while any in-scope gate is FAIL or NOT TESTED; in-scope failures are fixed and the focused plus full gates rerun in the same run. BLOCKED is used only for independent platform limitations, after every unaffected requirement is finished. Nothing is published.

## Final completeness requirements (cumulative)

**Continuous execution.** Parts A–H run without stopping, without new prompts, without a ZIP and without publication. An independent platform limitation makes that single item BLOCKED while all unaffected work continues. The whole run stops only for a production-project mismatch, destructive risk to real data, an irreconcilable Batch 1 conflict, or a required owner decision that would materially change product behaviour.

**Exact thresholds.** WCAG 2.2 AA verified at ≥4.5:1 normal text, ≥3:1 large text and meaningful interface graphics; ~44px primary targets; no essential authenticated text below 14px; one clear page heading and one main landmark per page state; visible keyboard focus; chart text alternatives; no colour-only status. 200% zoom is tested on meaningful content, not just the outer layout.

**Safety details, stated not inferred.** No fasting, cheat-meal, diagnostic-zone, A1C-improvement, weight-loss or other medical-outcome badge is created, restored, shown active or awarded. Any "Open the fasting page" action implying a questionnaire, timer, scheduler or eligibility flow is removed or renamed, and fasting copy says plainly that there is no questionnaire and scheduling is unavailable. Support never states or implies an email was sent when delivery is disabled, suppressed or failed. Connect an AI assistant/MCP stays disabled and hidden from the normal member journey; this batch performs no activation. No broad database search-and-replace, deletion or rewriting of real member rows; schema changes are additive and source-controlled; synthetic rows use exact IDs and are removed by exact ID.

**Binding signed-in matrix.** All 24 tasks are executed and reported individually on desktop and mobile — no aggregate pass statement.

**Learn action inventory.** Every active Learn/Guide/Library/Mindset action labelled Read, Open, Printable, Back, Return, Previous or Next is inventoried with visible label, source surface, expected destination/state and actual result. Each must work or its nonfunctional member-facing card is removed from active display. Static href inspection is not sufficient.

**Responsive and accessibility evidence.** At 320/390/768/1280px plus 200% zoom, keyboard-only and reduced motion, record actual results for heading order, landmarks, focus order and restoration, contrast values, font sizes, tap-target dimensions, horizontal overflow, sticky/fixed-layer collisions, VITA open and closed, notification panel open and closed, toast live-region behaviour, modal/sheet focus handling, chart and table text alternatives, loading-skeleton announcements, authenticated mobile navigation, and Admin navigation and tables. Before/after screenshots cover Today, Meals, Progress, Workouts, Learn, Ask, Profile, Settings, Billing, Support and every changed Admin page.

**Completion truthfulness.** `BATCH-2-COMPLETION-REPORT.md` carries one row per task and gate marked PASS, FAIL, BLOCKED or NOT TESTED, and distinguishes client code changed but unpublished, migrations actually applied, Edge Functions actually deployed, surfaces verified only with mocks, surfaces verified against production with synthetic fixtures, and platform items left for Batch 3. Batch 2 is not complete with any in-scope FAIL or NOT TESTED; failures are fixed and both focused and full gates rerun in the same run. Nothing is published.
