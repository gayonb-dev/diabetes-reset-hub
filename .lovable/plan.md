Verified before writing this plan: none of the 11 named functions contain `x-supabase-client-platform` in their allow-headers, 24 other functions already do, and `supabase/functions/_shared/` does not yet exist. `customer-portal` already ships an extended static list, which is why the billing portal works while cancel does not.

## Item 1 — Drift-proof shared CORS module

**Root cause (confirmed by the preflight diff):** the browser client sends `x-supabase-client-platform` on the real POST, so the preflight requests permission for five headers. `dexcom-auth` grants four, the browser blocks the request before any POST is sent, and the SDK surfaces it as a generic `FunctionsFetchError`. My earlier curl passed only because it requested four headers. `gamify-action` works because it already allows the fifth.

**Create `supabase/functions/_shared/cors.ts` exporting two things, not one:**

1. `corsHeaders` — static object: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, x-supabase-client-platform`. Used on all non-OPTIONS responses; no call sites change shape.
2. `preflightHeaders(req: Request)` — the same object except `Access-Control-Allow-Headers` echoes `req.headers.get('Access-Control-Request-Headers')` when present, falling back to the static list when absent, plus `Vary: Access-Control-Request-Headers` (correct behaviour behind the Cloudflare edge cache).

**In each of the 11 functions**, import from `../_shared/cors.ts`, delete the inline `corsHeaders` copy, and change only the OPTIONS branch to `return new Response('ok', { headers: preflightHeaders(req) })`:
`cancel-subscription`, `support-assistant`, `dexcom-auth`, `dexcom-sync`, `notifications-cron`, `notify-qa-answered`, `regenerate-due-plans`, `send-notification`, `streak-rollover`, `stripe-subscription-webhook`, `stripe-webhook`.

Nothing else changes — no other response path, no auth logic, no `verify_jwt`. Local imports under `supabase/functions/` deploy with the function; if any deploy rejects the shared module I will inline it per-file and say so explicitly. Then redeploy all 11.

**Verification**
- Preflight `dexcom-auth` twice: once requesting the five real headers, once requesting those five plus an invented `x-future-header`. Confirm each response echoes back exactly what was requested. Paste both raw status lines and full header sets, not a summary.
- Then the three browser checks (Playwright, signed in): Connect Dexcom reaches Dexcom's login page; the Billing cancel flow invokes successfully; the support chat responds. Report the browser-side result for each.

## Item 2 — Session A mobile foundation

Built exactly as previously scoped, no changes.

1. **Single breakpoint.** Sidebar and its loading skeleton → `hidden lg:flex`; bottom nav → `flex lg:hidden`; Dashboard's `md:hidden` / `hidden md:block` pair and the right-rail split → `lg`. Audit remaining `md:` usages, moving only true shell switches and leaving ordinary content grids alone; report each decision. Explicit sweep of the 768–1023px band for shell-switch gaps.
2. **Layout and safe areas.** `viewport-fit=cover` on the viewport meta. Mobile content full width, 16px horizontal padding, no max-width until `lg`. Content bottom padding `calc(76px + env(safe-area-inset-bottom))`; bottom nav height `calc(60px + env(safe-area-inset-bottom))` with matching `padding-bottom`. Safe-area top padding where the shell renders flush to the top. Implemented as utilities in `index.css`, not repeated arbitrary values.
3. **Typography.** In `index.css` under 1024px: Display 32→26, H1 28→22, H2 22→18, H3 18→16; body, labels, captions unchanged. `.stat-value`, `.metric-hero`, `.countdown-hero` scale to ~80% on mobile, keeping tabular numerals. Desktop untouched, no per-component overrides.
4. **Forms (M19 items 1–5 and 8).** 52px minimum height on mobile text inputs and buttons; 44×44 checkbox/radio hit areas including label; a `visualViewport` + `focusin` hook mounted once in `AppLayout` to scroll the focused input above the keyboard; shared sticky-submit wrapper for forms taller than one viewport (Onboarding, Intake, blood-sugar log). Not doing M19 items 6–7.
5. **Preserved decisions.** Rings stay 88/112 with values visible; content widths and the 320px rail unchanged; sidebar streak badge stays removed; Cheat Meal stays a Meals tab; HSL tokens only.
6. **Verification.** Playwright screenshots of Today, Progress, Meals, Ask, Settings at 360/375/390px, asserting no horizontal scroll, nothing hidden behind the bottom nav, and no tap target under 44px. Report every file changed.
