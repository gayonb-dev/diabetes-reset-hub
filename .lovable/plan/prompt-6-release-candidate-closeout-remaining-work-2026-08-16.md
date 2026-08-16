# Prompt 6 — Release-candidate closeout (remaining work)

Approving this card is what unlocks execution: the tap-target fixes, the added regression tests and the final gates are all code/command work, which the current mode blocks. Nothing here publishes anything.

## 0. Production target confirmation (verification only)

Confirm before executing: backend project `wqennhjdojjqmmqzjhti`, production domain `https://diabetesresetmethod.com`, and that the staging project is not the connected target. Verification only — no publication, no production-data mutation.


## Verified already this turn (evidence collected)

Synthetic authenticated fixture — Playwright-only. The signed-in state comes entirely from a fake session written to `localStorage` plus network interception of the backend origin. No app source is involved, so no fixture, bypass parameter or synthetic member data can ship in a production bundle. No production credential, member row, Stripe object or email was touched; all writes were absorbed by the interceptor.

Screenshots captured at 1280px desktop and 390px mobile in `/tmp/browser/prompt6/shots/`: Today (raw, overlay-dismissed, catch-up expanded), Meals, Progress, Ask, Support, Billing, Settings, Learn, Profile, Onboarding, More navigation sheet, billing-restricted, grace, suspended-dispute, deletion-restricted, landing hero, pricing, Terms, login, public VITA signup CTA, public VITA feature/tracking answer. Also `vp320/390/768/1280`, `zoom200`, `reducedmotion`.

Route and state matrix, using only the canonical state names (destination observed, no redirect loops, zero page errors on any run). No billing state ever returns an authenticated member to Login:

```text
state                requested   destination     notes
allowed              /app        /app            full app reachable
grace                /app        /app            app usable, billing notice shown
restricted_billing   /app        /app/billing    billing, settings, support, profile, export, cancellation reachable
suspended_dispute    /app        /app/billing    programme paused, account surfaces reachable
restricted_deletion  /app        /app/settings   deletion status surface, settings + support reachable
```

Re-confirm each row against the shared lifecycle evaluator (`surfaceAllowed`) so the observed destinations and the evaluator agree.


Accessibility/responsive results: single `<main>`, single H1, skip link present, `lang="en"`, no positive tabindex, no unlabelled icon buttons, no images missing alt, visible 2px focus ring, one live region, no horizontal scroll at 320/390/768/1280 or at 200% zoom, reduced-motion renders cleanly.

## 1. Fix the tap targets found under 44px on mobile (390px, touch emulation)

Measured violations, all outside the WCAG inline-link exception:

- `src/pages/app/AppLayout.tsx` — bottom-nav items render 36px wide (`mobileNavClass`). Add `min-h-11 min-w-11 justify-center`.
- `src/pages/app/Progress.tsx` — "Print report for my doctor" is 224x36. Give the button `min-h-11`.
- `src/pages/app/Settings.tsx` — "Open billing" is 138x20 because the `Link` wraps a `size="sm"` button. Give it `min-h-11`.
- The `Close` control measured 16x44 on Today; widen its hit area to 44x44.
- Exempt and left as-is: inline text links inside sentences ("privacy policy", the support email address) and the 1x1 visually-hidden skip link, which expands on focus.

Desktop sidebar rows are 36px tall; that is a fine-pointer surface and meets the 24px minimum, so no change.

## 2. Named regression evidence (not a bare test total)

For each area below, name the test or check that proves it, and add the smallest focused regression test where one is missing. No real payments, refunds, disputes, emails, deletions or health-AI requests — mocks and synthetic fixtures only.

Public routes; authenticated member routes; retired-route redirects; safe `next` handling; payment truth; webhook idempotency and refund/dispute linkage; billing-restricted account access; magic-link access; public-chat authorization and consent; deterministic VITA About/signup/pricing/features/tracking answers; health-boundary precedence; zero external model calls for deterministic VITA answers; chat deletion; member export and account deletion; glucose safety boundaries; fasting scheduling disabled and unreachable; legal-page gates; safe-claims and banned-content scans.

## 3. Remaining gates to execute and report separately

- Update `src/test/productionBundle.test.ts` to assert the built bundle contains no fixture marker, mock-auth or synthetic-member marker, bypass query parameter, or any trace of the Playwright authenticated fixture, and that no test mechanism can authenticate a production build.
- Deno tests for Edge Functions, plus a boot/CORS smoke where existing tooling allows it without deploying or mutating.
- Read-only production RLS drift check (section 4).
- Full safe-claims scan with dispositions over active public/member/admin copy, `public/llms.txt`, `LLMInfo.tsx`, structured product data and public feature lists.
- Dependency audit: retry production-only and full audits against the official registry. If the endpoint stays unreachable, record both as BLOCKED, make no vulnerability claim, and complete the reachability table from lockfile plus official advisory evidence (React Router, Supabase, ws and every package previously tied to a high advisory).
- Bundle-size comparison against the pre-Prompt-6 baseline; confirm zero production `.map` files.
- Header compatibility: exercise `public/_headers` policy locally against mocked login, Stripe return, VITA, backend requests, downloads, printing and navigation. Live enforcement stays a post-publication item.

## 4. RLS drift check (read-only, no users or rows created)

Compare the current production catalog against the previously verified baseline and current migrations across: RLS enabled and forced status; table and column grants; every USING and WITH CHECK policy; views and `security_invoker`; security-definer functions and execute grants; Storage buckets and policies; Realtime publications; deletion-restriction policies; protected profile safety fields; and the server-owned `win_posts` reaction and milestone fields. Report actual drift, accepted intentional differences, and anything unverifiable.

## 5. Final gates, run after every correction

Complete TypeScript check; complete Vitest suite; complete Playwright/browser suite; Deno tests; Edge Function boot/CORS smoke where safely available; repository-wide ESLint with active source separated from duplicated evidence files; and a fresh final production build. No affected-file-only runs and no reuse of an earlier build.

## 6. Owner-viewable screenshot delivery

Export every final screenshot from `/tmp` to `/mnt/documents/prompt6-evidence/` and reference them as viewable artifacts in the report — desktop and mobile, covering the authenticated routes, all five states, navigation, catch-up collapsed/expanded, legal/public pages and the responsive/zoom/reduced-motion checks. The owner is never asked to sign into preview.


## 7. Ten usability tasks

Run each against the synthetic fixture and record steps-to-complete and outcome: find Today's Action; open/complete the first action; log a supported item; find a meal; view Progress; find the doctor report; find Help/Ask; find Billing and cancellation; find export and deletion; recover from billing restriction.

## 8. Part G release-candidate report

Every result classified as PASS, FAIL, BLOCKED, NOT TESTED, OWNER FOLLOW-UP, CLINICIAN REVIEW or POST-PUBLICATION VERIFICATION. A blocked independent item does not stop the rest of the closeout.

Contents: passed, failed, fixed during the run, remaining blockers, clinician-review items, owner follow-ups, Stripe live-observation items, post-publication verification, non-blocking recommendations, dependency reachability table, active-source lint totals, every named regression check from section 2, accessibility and viewport results, route/state matrix, ten usability-task results, bundle-size comparison, header and source-map status, screenshot artifact links, and machine-readable-content scan dispositions.

The report must state explicitly: legal pages were owner-reviewed on 12 August 2026; no counsel-approval or unpublished-release gate remains; pending UK company details are owner follow-up items, not a hidden build gate; clinician review remains required for the low-glucose thresholds/messages and the future urgent-high decision; fasting scheduling remains disabled and unreachable; health AI and Dexcom remain disabled unless separately approved; no refund or dispute event was manufactured for verification; genuine live Stripe refund/dispute delivery is NOT YET OBSERVED if none has occurred; an unavailable dependency-audit endpoint is BLOCKED, not passed; header enforcement and live source-map absence remain post-publication checks; and nothing was published and no real member, Stripe, email or health record was mutated.

No publication, no ZIP, no further approval request.

