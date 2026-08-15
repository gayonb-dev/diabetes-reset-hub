# Prompt 6 — Member Experience, Accessibility, Security and Release-Candidate Pass (Parts A–G)

PRE-PART A is complete, deployed, live-verified and approved. Stage 0 and PRE-PART A
are not repeated. This plan is re-surfaced only because the editor is in plan mode and
file edits are blocked until it is approved; execution then runs continuously from
Part A through Part G and ends with the release-candidate report.

## Authority and baseline

- Production project `wqennhjdojjqmmqzjhti`, domain `https://diabetesresetmethod.com`.
  Preflight already confirmed; if the connected project differs, stop.
- Baseline = current working tree, Prompts 1–5 and PRE-PART A. Where an older audit
  conflicts with the current verified implementation, the current implementation wins.
- Baseline captured: 288 Vitest tests green, production entry bundle 425.36 kB.

Preserved without change: blood-glucose safety and validation; low and urgent-low
classifications; fasting scheduling disabled and absent from the default journey;
supplements absent from onboarding and primary navigation; current health-AI
boundaries and reporting; corrected VITA feature/tracking routing; opaque public-chat
sessions; consent, chat deletion and export controls; production RLS and deletion
restrictions; verified checkout and Stripe lifecycle; refund/dispute handling;
magic-link sign-in; billing-restricted and deletion-restricted account access; legal
pages owner-reviewed 12 August 2026; no counsel-approval or unpublished-release gate
in code; pending UK company details as an owner follow-up; US$27 for the first 14 days
then US$67/month until cancelled; DRM visual identity (deep green, typography, VITA
personality, cards, warmth). Hierarchy and usability refinement only — not a redesign.

## Global constraints

No publication. No additional production Edge Function deployment unless a genuine new
Prompt 6 security regression requires it. No real Stripe transaction, refund, dispute,
cancellation or customer creation. No real email, account deletion, export, health-data
entry or community post. No mutation of production-member records. Production database
checks read-only. State-changing tests use mocks, intercepted requests and synthetic
in-memory fixtures. No new paid service, monitoring vendor, AI-credit-dependent feature
or new product feature. No database migration unless a security defect cannot be fixed
safely without one — in that case report and stop only that isolated item. Prompts 1–5
are not reopened unless this pass reveals or introduces a real regression. No promotion
ZIP, duplicated function directory, SHA package or evidence archive. One concise final
report plus the requested screenshots. A blocked platform item is recorded accurately
and every independent section continues. Safe in-scope failures are fixed and only the
affected checks rerun.

## Already applied in the working tree during this run

- Settings: WhatsApp broadcast opt-in card, its state and its save handler removed —
  no WhatsApp delivery channel is enabled, so the app must not promise one.
- `/app/coaching-waitlist` route retired and `CoachingWaitlist.tsx` deleted (coaching
  and one-to-one support are outside the membership).
- `public/llms.txt`: "expert-reviewed answers" claim removed.
- `vite.config.ts`: production source maps disabled (`sourcemap: mode !== "production"`).
- `public/_headers` added with CSP, HSTS, frame-ancestors none, nosniff,
  Referrer-Policy, Permissions-Policy, COOP and CORP.

## PART A — Member-app simplicity and design

**A1 Product rule and baseline.** The member always understands the single most useful
next thing. Before editing: assess the released member experience, capture baseline
desktop and 390px screenshots of every surface that materially changes, and record the
current dashboard hierarchy and navigation. Use existing components, routes, tokens and
functionality. No working feature is deleted merely to simplify — use grouping,
progressive disclosure, collapsing and relocation.

**A2 Navigation.** One hierarchy across desktop and mobile with five primary
destinations: Today, Meals, Progress, Ask/Help, More. Existing routes only, no
duplicates. More is grouped as: Learn and tools (Learn, Library where active, Workouts
where active); Community (existing member community); Account and help (Profile,
Billing, Settings, Support). Maximum five primary mobile destinations; desktop and
mobile share the same mental model and naming; every destination has an accurate
accessible label and active state. Billing, Settings, Support, data export and account
deletion stay reachable during billing restriction; Settings stays reachable during
deletion restriction. Restriction routing continues to come from `src/lib/appSurfaces.ts`
and `src/lib/membership.ts` — no component re-derives membership or restriction status.
Fasting scheduling and Supplements do not return to primary navigation, onboarding,
Today or the first-14-day journey; the education-only fasting guide stays reachable
through Learn. No disabled or empty advanced tools surfaced to fill space. No coaching,
WhatsApp, supplement, fasting-scheduling or personalized-health-AI promises restored.

**A3 Today dashboard.** Order: calm greeting and concise orientation; one visually
dominant Today's Action card; a small row of existing logging shortcuts; one compact
progress summary; secondary or optional information below. Only one primary CTA above
the fold. Today's Action stays usable when catch-up work exists. Logging shortcuts reuse
existing actions (blood glucose, meals, activity/habit logging); no new data fields.
Repeated streak, ring, level, XP and phase summaries are combined; no competing progress
systems shown simultaneously. Wording is Daily Action Streak, never Reversal Streak.
Detailed levels, badges and streak history move to Profile or a collapsed secondary
section. Habit rings remain as supporting detail below the action card. Upcoming days
and journey previews sit below the current action or inside a collapsed journey section.
Catch-up is collapsed by default with a neutral count and optional disclosure, never
blocks Today's Action, never looks like an alarming backlog, and never uses shame,
urgency or failure language. Completed states, database fields, achievement history and
member data are preserved.

**A4 First use and Days 1–3.** First use is manageable for an older adult, a mobile
user, someone newly diagnosed and someone unfamiliar with health apps. Onboarding
collects only what the currently working membership needs — no fasting, supplement,
medication-clearance or unnecessary health questions. The current step and what remains
are clearly shown; setup is not medically invasive or unnecessarily long; completion
leads directly to Today's Action. Days 1–3 each present one main action, supporting
explanation and optional logging, never several equally urgent assignments. Guidance is
concise and inline through existing UI patterns — no new tutorial system. Empty states
explain the next useful action; error states offer recovery and preserve entered
information where safe; loading states never resemble empty data or failure; catch-up
content stays optional and collapsed.

**A5 Core screens.**
- *Meals*: meal plans, meal ideas and recipes stay easy to find; the next useful meal
  action is obvious; AI-generated labels, safety notes and reporting controls preserved;
  advanced generation and export controls move behind a secondary action where
  appropriate; no supplement meal plans, no fasting meal-plan modes, no medical outcome claims.
- *Progress*: one clear summary before detailed charts; blood glucose, A1C, weight,
  measurements and habits remain understandable; the printable doctor report stays inside
  Progress; all S1 low and urgent-low classifications preserved; no unreviewed urgent-high
  rule; charts carry text summaries; legends never rely on colour alone; accessible table
  equivalents where practical; units stay clear; no interpretation of a member's result as
  medical advice and no promise of improvement.
- *Ask/Help*: public VITA widget stays distinct from the signed-in Ask experience and
  remains the corrected deterministic membership, feature, tracking, pricing, login and
  navigation helper. The signed-in Ask screen describes only currently enabled
  capabilities; with health AI disabled it promises no personalized health guidance and is
  not positioned as a central feature. Emergency, result-interpretation and medication
  boundaries preserved, as are educational/AI-generated labelling and reporting controls.
  Safe paths to program support and community questions kept. No invented credentials, no
  "expert-reviewed" unless the exact content and review process are documented, no
  WhatsApp, coaching, fasting, supplement or device-sync claims.
- *Community*: no fabricated activity, members, posts, answers or popularity; honest and
  useful empty state; stays under More until real usage justifies promotion; moderation and
  privacy controls preserved; no fake examples mistakable for real members.
- *Account screens*: consistent headings, actions and status language across Billing,
  Profile, Settings and Support, all using the shared membership evaluator. Signed-in
  members are never sent to Login solely because of billing status. Billing-restricted,
  dispute-restricted and deletion-restricted states get calm explanations and clear
  recovery actions. Billing, cancellation, export, deletion and support stay findable.
  Deletion-state precedence intact. No internal reason codes in URLs or member-facing copy.
  No redirect loops.

**A6 Terminology and public-description regression.** Consistent use of: Today's Action,
Daily Action Streak, Progress, Meals, Ask VITA or Help (per actual enabled capability),
Build Your Routine, Educational membership. Active member-facing remnants removed for:
Reversal Streak; Phase 3 — Reversal; reverse/reversal as a promised benefit; 7-Day Reset;
7-Day Reset Sprint; guaranteed or typical medical outcomes; unsupported expert claims;
unsupported ratings; fabricated testimonials; unsupported member counts; mandatory
fasting; mandatory supplements; WhatsApp broadcasts; coaching or one-to-one support;
automatic device syncing unless proven enabled; personalized health AI while disabled.
Negative safety statements ("does not diagnose, treat or promise to reverse diabetes")
are allowed — the scan distinguishes a prohibited positive claim from an approved
negative disclaimer. Dispositions recorded for active client copy, public pages, member
pages, `public/llms.txt`, `src/pages/LLMInfo.tsx`, structured product data, active
administrator-editable product/chat copy and public feature lists. Stale WhatsApp or
unsupported feature language is corrected in the unpublished working tree. Historical
migrations and evidence documents untouched.

## PART B — Accessibility, mobile and performance

**B1 Accessibility** across public and signed-in core routes: one logical page-level
heading; semantic landmarks; programmatic labels and descriptions; visible keyboard
focus; logical focus order; dialog and sheet focus containment; Escape behaviour; focus
return after closing dialogs and sheets; errors associated with their fields; status and
urgent messages announced appropriately; no information by colour alone; meaningful
accessible names for icon buttons; keyboard-operable tabs, menus, accordions, charts and
actions; interactive targets at least 44×44 CSS px; sufficient text and control contrast
within the existing brand palette; reduced-motion respected; readable body text without
zoom; usable at 200% zoom; no unexpected focus movement. No forced focus added to glucose
warnings unless testing proves it is needed — the approved live-region behaviour is preserved.

**B2 Mobile** at 320px, 390×844, 768px and 1280px+: no horizontal overflow; no clipped
cards, tables, dialogs or charts; VITA, sticky actions, cookie/privacy controls and bottom
navigation never collide; opening VITA hides or repositions conflicting fixed controls;
the software keyboard never hides the active chat/input action; safe-area padding works;
long legal, email, URL and health-unit text wraps safely; bottom navigation stays readable
and reachable; Today exposes its primary action without excessive scrolling.

**B3 Performance**: no large UI or chart dependency added for anything achievable with
the existing stack; route lazy loading preserved; before/after production bundle sizes and
largest chunks recorded and unexpected growth investigated; avoidable duplicate queries and
repeated dashboard fetches prevented; Billing race and unmount protections preserved;
dimensions set for important images to reduce layout shift; no heavy media autoplay; no
meaningful route-loading or interaction regression.

## PART C — Dependencies and lint

**C1 Dependency reachability.** Run a production-only audit and a complete audit. For
every high or critical advisory report: package and advisory; direct or transitive;
runtime or build/test-only; the actual dependency/import path; whether the vulnerable
behaviour is reachable in DRM; the smallest safe fixed version; action taken or reason
deferred. React Router and other demonstrably reachable browser/runtime risks are
prioritised if still present; the previously reported Supabase transitive `ws` path is
reassessed rather than assumed vulnerable. Smallest compatible upgrade set only — no blind
forced audit fix, no unrelated upgrades to lower the count, no unplanned major framework
migration. Build-only tooling moves out of production dependencies where safe; the lockfile
updates normally. After each related upgrade group, run focused tests, TypeScript and a
browser smoke check. Build/test-only advisories may be deferred with clear reachability
evidence. A reachable unresolved critical or high production vulnerability is a release blocker.

**C2 Lint.** Repository-wide lint across active source and runtime files, excluding
historical evidence/package copies that are not compiled or deployed. All errors in touched
files fixed, plus correctness, security, accessibility, Rules-of-Hooks and stale-effect
findings across active source. Safe mechanical typing fixes grouped. No business behaviour
changed merely to silence lint. Target zero errors across active runtime source; every
remaining warning listed with rule, location and safe deferral reason. Duplicated historical
evidence findings are not described as new production debt.

## PART D — Security headers and source maps

**D1 Headers.** Inspect the actual hosting mechanism; never claim an HTML meta tag provides
protection that requires an HTTP response header. Prepare the least-permissive compatible
production policy for CSP, frame-ancestors or equivalent anti-framing, Permissions Policy,
COOP and CORP where compatible, existing HSTS, `X-Content-Type-Options: nosniff` and the
existing referrer policy. The CSP is built from observed production connections and assets:
DRM origins, Supabase, Stripe, required font and image assets, and only currently approved
API connections. No broad `*` source, no new analytics or reporting vendor, no weakening of
exact-origin CORS. Test magic-link login, Stripe redirect and return, VITA, Supabase
requests, downloads, printing and normal navigation. If COOP or CORP breaks an approved flow,
use the safest compatible setting and document it. If Lovable hosting cannot apply a required
header before publication, the supported configuration is prepared and the exact
post-publication verification listed — a prepared header is never presented as live.

**D2 Source maps.** Production builds publish no source maps; production source-map output is
disabled (no private monitoring destination exists and no paid monitoring service is added).
Confirm the production build contains no deployable `.map` files. The live `.map` URL check is
recorded as post-publication verification. No publication during this prompt.

## PART E — Complete automated and browser regression

Existing tests are reused rather than rewritten, and no test triggers a real production action.

**E1 Required coverage confirmed passing:** glucose thresholds and units; low and urgent-low
UI; invalid glucose values; future glucose timestamps; fasting scheduling disabled and
unreachable; supplements absent from onboarding and the main journey; chat ownership; opaque
sessions; consent; fail-closed health handling; chat deletion; Stage 0 About/signup
conversation; context-aware signup follow-ups; PRE-PART A feature/tracking answers;
A1C/HbA1c/AC1/AIC routing; capability-versus-health precedence; safe CTA allow-list; no
external model call for deterministic answers; deterministic public answers unstored;
export/deletion inventory and authorization; production RLS drift by read-only enumeration;
Stripe checkout verification; payment-truth states; webhook signature separation; webhook
idempotency; event ordering; all ten configured subscription/refund/dispute handlers; trusted
refund linkage; seven-day grace; canonical membership states; Billing Hook state and race
behaviour; account-surface access; deletion-state precedence; user lookup beyond 200 accounts;
magic-link safe-next behaviour; neutral magic-link enumeration response; legacy-route
redirects; retired offer rejection; accessibility labels; focus behaviour; live regions;
target sizes; mobile overflow; fixed-layer collisions; safe-claims regression; placeholder
regression; production-bundle absence of test fixtures and bypasses.

**E2 Route and state matrix.**
- Public: landing, login, privacy, terms, refunds, AI use, consumer health-data privacy, data
  rights, payment success (checking, verified, processing, unverified, failed — mocks or
  synthetic fixtures only), payment cancelled, retired-route redirects, public VITA open and
  closed, and the deterministic About, signup, pricing, login, cancellation, feature and
  tracking flows.
- Signed-in: onboarding, Today, Days 1–3, Meals, Progress and every active tab, printable
  doctor report, Ask, Learn, Library where active, Workouts, Community empty synthetic state,
  Community populated synthetic state, Profile, Billing, Settings, Support, member 404.
- Membership states by mock: allowed, grace, restricted billing, suspended dispute, restricted
  deletion. Each verifies expected destination, readable explanation, recovery controls, no
  redirect loop and that account controls remain available where required.

**E3 Human-oriented usability tasks** (synthetic states only): new member signs in and finds
Today's Action; completes or opens the first action; logs an existing supported item; finds a
meal; views Progress; finds the doctor report; finds Help/Ask; finds Billing and cancellation;
finds export and deletion; recovers from a billing restriction. Each records whether the
destination is evident without searching unrelated screens.

**E4 Commands and gates, reported separately:** TypeScript via the project's established
command; full Vitest suite; relevant Deno tests; browser/Playwright suite; repository-wide
active-source ESLint; production-only dependency audit; complete dependency audit; production
build; production-bundle source-map scan; production-bundle fixture/bypass scan; safe-claims
scan; read-only production RLS drift check; Edge Function boot/CORS smoke only where existing
tooling can do it without deployment or mutation. An already-green expensive phase is not
rerun merely to regenerate totals; only phases affected by later changes are rerun.

## PART F — Screenshot review

Direct preview locations plus desktop and 390px mobile screenshots for every materially
changed member surface: Today, Meals, Progress, Ask/Help, More navigation, Onboarding,
Community empty state, billing restriction, Settings/account controls. Regression screenshots
for: landing hero, landing pricing, public VITA with the corrected signup CTA, public VITA
feature/tracking answer, one representative legal page. Real UI states with synthetic or
mocked data; never fabricated testimonials, ratings, members, community activity presented as
real, or medical outcomes.

## PART G — Final release-candidate report

One concise Prompt 6 Release-Candidate Report in chat, no ZIP or promotion package,
separating: passed; failed; fixed during this run; remaining release blockers; clinician
review items; owner follow-ups; Stripe live-observation items; post-publication verification;
recommended non-blocking improvements.

Interpretation carried into the report: legal pages owner-reviewed 12 August 2026 with no
counsel-approval gate created and future legal review deferred until revenue permits; pending
UK company registration details remain an owner follow-up, not a code/build gate; clinician
review still applies to the implemented low-glucose thresholds/messages and whether an
urgent-high rule should exist; fasting scheduling remains disabled and no approval to activate
it is requested; real Stripe refund/dispute delivery may remain unobserved until a genuine
future event and no Stripe event is manufactured; production RLS was previously verified so
only a read-only drift check runs; production HTTP-header and source-map results that cannot
be observed without publication belong under post-publication verification.

The report includes: files changed grouped by purpose; visible before/after hierarchy;
features moved, collapsed or delayed but not deleted; disposition of the scan covering
`public/llms.txt`, `LLMInfo.tsx`, structured product data and public feature lists; dependency
reachability table; active-source lint totals; test and build totals; accessibility results;
route/state matrix; human usability-task results; bundle-size comparison; header and
source-map status; preview URL; screenshot locations; the PRE-PART A live-verification result
as already completed (not rerun unless a later change affects its code); and explicit
confirmation that nothing beyond the approved PRE-PART A chat-agent deployment was deployed,
that the broader client was not published, and that no real member, Stripe, email or health
data was mutated.

## Completion rule

Parts A–G run continuously in one pass: no further plan, no mid-way check-in, no stopping
after an individual part, no repeat of PRE-PART A or Stage 0, no ZIP, no publication, and no
rerun of an expensive green phase unless later code changes affect it. A platform-blocked item
is recorded accurately while every independent item continues. Execution stops only for: a
different connected production project; a genuinely destructive production action outside
approved scope; a decision that would change approved clinical, legal, privacy, billing or
pricing policy; a reachable unresolved critical or high production vulnerability requiring an
owner decision; or a newly discovered P0 safety or authorization failure. Otherwise it stops
after delivering the complete preview and release-candidate report for owner review.
