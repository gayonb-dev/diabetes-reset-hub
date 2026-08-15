# Prompt 6 — Parts A–G Execution (re-issued for build approval)

PRE-PART A is complete, deployed and live-verified. It is not repeated. This is the
same approved Prompt 6 scope, re-surfaced only because the editor is currently in
plan mode and file edits are blocked until it is approved.

Preflight already confirmed: production project `wqennhjdojjqmmqzjhti`, domain
`diabetesresetmethod.com`. Baseline captured: 288 tests green, production entry
bundle 425.36 kB.

## Already applied in the working tree (this run)

- Settings: removed the WhatsApp broadcast opt-in card, its state and its save
  handler (no WhatsApp delivery channel is enabled, so the app must not promise one).
- `/app/coaching-waitlist` route retired and `CoachingWaitlist.tsx` deleted
  (coaching and one-to-one support are outside the membership).
- `public/llms.txt`: "expert-reviewed answers" claim removed.
- `vite.config.ts`: production source maps disabled (`sourcemap: mode !== "production"`).
- `public/_headers` added: CSP, HSTS, frame-ancestors none, nosniff, Referrer-Policy,
  Permissions-Policy, COOP/CORP, built from observed DRM/Supabase/Stripe/font origins.

## Part A — Member-app simplicity

- A2 Navigation: one hierarchy across desktop and mobile — Today, Meals, Progress,
  Ask, More. Sidebar regrouped into Primary / Learn and tools (Learn, Library,
  Workouts) / Community / Account and help (Profile, Billing, Settings, Support).
  Existing routes only; no duplicates. Restriction routing stays in
  `appSurfaces.ts` + `membership.ts`; no component re-derives status.
- A3 Today: greeting → dominant Today's Action → logging shortcut row → one compact
  progress summary → secondary below. Habit rings demoted under the action card;
  catch-up collapsed by default with a neutral count; streak/level/badge detail
  consolidated (Daily Action Streak wording only). No new data fields.
- A4 First use: onboarding step indicator, completion lands on Today's Action,
  no fasting/supplement/medication-clearance questions, calm empty/error/loading states.
- A5 Core screens: Meals, Progress (summary before charts, doctor report retained,
  S1 classifications untouched), Ask (enabled capabilities only), Community (honest
  empty state, stays under More), account screens with consistent status language.
- A6 Terminology and public-description scan across active client copy, public and
  member pages, `public/llms.txt`, `LLMInfo.tsx`, structured data and admin-editable
  copy; negative safety disclaimers are preserved, not flagged.

## Part B — Accessibility, mobile, performance

Headings and landmarks, icon-button names, focus visibility and return, dialog/sheet
containment, field-associated errors, live regions preserved as approved, no
colour-only meaning, 44×44 targets, reduced motion, 200% zoom. Widths 320 / 390×844 /
768 / 1280+: no overflow or clipping, no fixed-layer collisions with VITA, sticky
CTAs and bottom nav, keyboard-safe inputs, safe-area padding. Bundle before/after
recorded; lazy routes and Billing race/unmount protections preserved; no new UI
or chart dependency.

## Part C — Dependencies and lint

Production-only and full audits with a reachability table (package, advisory,
direct/transitive, runtime vs build-only, import path, reachable in DRM, smallest
safe fix, action). Smallest compatible upgrades only; no forced audit fix, no major
migration. Repo-wide ESLint on active source, excluding historical evidence copies;
zero errors in active runtime source, every remaining warning listed with reason.

## Part D — Headers and source maps

Hosting mechanism inspected; prepared headers are reported as prepared, not live.
Post-publication verification lists the exact header and `.map` URL checks. No
publication in this run.

## Part E — Regression

Full existing Vitest suite plus new tests for navigation hierarchy, dashboard order,
catch-up collapse, target sizes, safe-claims scan, headers file and source-map
absence. Route/state matrix across public routes, signed-in routes and membership
states (allowed, grace, restricted billing, suspended dispute, restricted deletion)
using mocks and synthetic fixtures only. Human usability tasks recorded. Commands
run and reported separately: TypeScript, Vitest, Deno, Playwright, ESLint, both
audits, production build, source-map scan, fixture/bypass scan, safe-claims scan,
read-only RLS drift check.

## Part F — Screenshots

Desktop and 390px captures of Today, Meals, Progress, Ask, More, Onboarding,
Community empty state, billing restriction, Settings; regression captures of landing
hero, landing pricing, public VITA CTA and feature answer, one legal page. Real UI
with synthetic data; nothing fabricated.

## Part G — Report

One concise release-candidate report: passed / failed / fixed / blockers / clinician
items / owner follow-ups / Stripe live-observation / post-publication verification /
non-blocking improvements, plus files changed, before-after hierarchy, moved-not-deleted
features, scan disposition, dependency table, lint totals, test and build totals,
accessibility results, route/state matrix, usability results, bundle comparison,
header and source-map status, preview URL and screenshot locations — with explicit
confirmation that nothing beyond the approved PRE-PART A deployment was deployed,
the client was not published, and no real member, Stripe, email or health data was mutated.
