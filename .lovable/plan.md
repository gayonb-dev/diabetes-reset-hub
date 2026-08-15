# Prompt 6 — Release-Candidate Closeout (Part G)

The previous report was an interim implementation update. This closeout runs the remaining verification, fixes the two named code gaps, and produces the full Part G report. No publication, no live payments, no real member/Stripe/email/health data mutation.

## 1. Synthetic authenticated fixture (dev-only)

Add a Playwright-only mock auth harness that cannot ship:

- A dev-only module that seeds a fake Supabase session plus mocked member state (profile, program day, habits, meals, billing state) through request interception in Playwright, not through app code branches.
- Where app code must cooperate, gate it behind `import.meta.env.DEV` so Vite statically drops it from the production bundle. No query-parameter bypass, no runtime env flag.
- Extend `src/test/productionBundle.test.ts` to scan `dist/assets/*.js` for fixture markers, mock session keys, bypass parameters and synthetic member strings, and to assert zero `.map` files.

## 2. Authenticated visual capture

Desktop (1280) and mobile (390x844) screenshots into `/tmp/browser/prompt6/`, one pair each for: Today, Meals, Progress, Ask/Help, More navigation, Onboarding, Community empty state, Billing restriction, Settings/account controls, public VITA signup CTA, public VITA feature/tracking answer, landing hero + pricing, one legal page.

## 3. Route and state matrix

Every public and signed-in route from Prompt 6, driven through mocked states: allowed, grace, restricted billing, suspended dispute, restricted deletion. Record for each: destination, on-screen explanation, recovery control, which account surfaces stay reachable, and absence of redirect loops (assert navigation settles within a bounded number of hops).

## 4. Ten human usability tasks

Run each as a scripted Playwright task and record steps-to-complete plus pass/fail: find Today's Action; open/complete first action; log a supported item; find a meal; view Progress; find the doctor report; find Help/Ask; find Billing and cancellation; find export and deletion; recover from billing restriction.

## 5. Accessibility and responsive testing (executed, not scanned)

Keyboard-only traversal, visible focus and focus order, dialog/sheet focus containment + Escape + focus return, field-error associations, live-region announcements, 44px targets measured from rendered boxes, color-independent labels, 200% zoom, reduced motion, and viewports 320 / 390x844 / 768 / 1280. Also: software-keyboard/chat-input behavior, VITA vs sticky controls vs bottom-nav collisions, and chart/table/long-content wrapping on member pages.

## 6. Gates, each reported separately

- Deno tests for Edge Functions (`supabase--test_edge_functions`).
- Vitest suite and the new Playwright suite.
- Read-only production RLS drift check (`supabase--linter` plus read-only policy queries).
- Production-bundle fixture/bypass scan.
- Full safe-claims scan with dispositions across active public/member/admin copy, `public/llms.txt`, `LLMInfo.tsx`, structured product data and public feature lists.
- Edge Function boot/CORS smoke where existing tooling permits without deployment or mutation.

Anything a tool cannot execute is reported BLOCKED or NOT TESTED with the exact reason.

## 7. Dependency audit

Retry production-only and full `npm audit` against the official registry explicitly. If the endpoint stays unavailable, record both as BLOCKED — no "no high/critical" claim — and instead build a reachability table from the lockfile: exact resolved versions and dependency paths for React Router, Supabase packages, `ws`, and every package previously tied to a high advisory, with official advisory ranges compared against those versions.

## 8. Active-source lint and typing

Fix the 26 `no-explicit-any` errors in active runtime source as one mechanical batch — precise types or narrow generics, no behavior change. Resolve the remaining hook-dependency warning or report its exact file, line, rule and evidence-based reason for deferral. Target zero active-runtime lint errors; historical evidence copies stay excluded. Then rerun TypeScript, lint, and only the tests/build affected.

## 9. Headers

No enforcement claim before publication. Verify `public/_headers` policy compatibility locally by serving the built bundle with those headers applied and exercising mocked login, Stripe return, VITA chat, backend requests, downloads, printing and navigation — confirming CSP/COOP/CORP block nothing legitimate. Live enforcement stays listed under post-publication verification.

## 10. Part G report

Single final report containing: passed, failed, fixed during the run, remaining blockers, clinician-review items, owner follow-ups, Stripe live-observation items, post-publication verification, non-blocking recommendations, dependency reachability table, active-source lint totals, every test/gate result, accessibility and viewport results, route/state matrix, ten usability-task results, bundle-size comparison against the 425.22 kB baseline, header and source-map status, preview URL and screenshot locations, machine-readable-content scan dispositions, and explicit confirmation that no broader client was published and no real member, Stripe, email or health data was mutated.

## Technical notes

- Playwright scripts and screenshots live under `/tmp/browser/prompt6/`; no Playwright dependency is added to `package.json`.
- Mocked billing/deletion states come from intercepted backend responses, so no database writes occur.
- `src/test/productionBundle.test.ts` becomes the enforcement point for the fixture-exclusion guarantee.
