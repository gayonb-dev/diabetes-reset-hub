## Ten-item build — approved as written

### Locked changes
- support-assistant: `verify_jwt = true`, model `google/gemini-2.5-flash` via Lovable AI Gateway, mode json.
- Landing ChatWidget remains the only anonymous chatbot.
- Streak freeze cap stays a boolean (1 held).

### 1. Measurements — dedicated table
Migration: `public.member_measurements` (member_id → auth.users, measured_at, waist/hips/chest/thigh/arm/neck numeric nullable, notes, updated_at trigger). GRANTs + RLS `auth.uid() = member_id`. Rewrite `MeasurementsTab.tsx` to insert/read from this table; delete all `member_progress` writes.

### 2. Rings update without reload
`useDailyHabits.tsx`: dispatch `new CustomEvent("drm:habits-changed")` after every mutation (addWater, saveMeal, setSnack, toggleWalk, markMindsetRead, setMood). Add a `useEffect` in the same hook listening for the event and calling `refresh()` — Dashboard's separate hook instance receives it and re-fetches instantly.

### 3. Water Today tile
`Dashboard.tsx`: Water card `to="/app/today#water-logging"`. `HabitLogging.tsx`: `id="water-logging"` on the water section; mount effect scrolls it into view when hash matches.

### 4. Meal-plan regeneration cap (2/month)
Migration: `profiles.regenerations_this_month int default 0`, `regen_month date`. `Settings.regenerateMealPlan` reads, resets on month change, blocks at ≥ 2, increments then invokes. Show "X / 2 remaining"; disable at 0. `MealSetupTransition.tsx` adds "You get 2 fresh meal plans per month." `Meals.tsx` removes standalone Regenerate button; error retry links to Settings.

### 5. Swap verified AI-free
Already local-only in `Meals.handleSwap`. Report as verified, no code change.

### 6. Split chatbot
- `App.tsx`: remove global `<ChatWidget />`. Mount in `Index.tsx` (marketing).
- New `supabase/functions/support-assistant/index.ts` — `verify_jwt = true`, `google/gemini-2.5-flash` via Lovable AI Gateway, mode json. Rejects sales prompts; answers app navigation only.
- `Support.tsx`: add chat panel posting to `support-assistant`, render reply with react-markdown; keep existing Report/Billing buttons and mailto.

### 7. Streak freeze / streak break rollover
- New `supabase/functions/streak-rollover/index.ts` (service role, `verify_jwt = false`, `x-internal-secret` gated). For each profile evaluates yesterday's 4 rings:
  - completed → no-op;
  - missed + freeze available → set `streak_freeze_available=false`, keep streak, insert `streak_freeze_used` notification;
  - missed + no freeze → `user_streaks.current_streak=0` and mirror `visitor_profiles.streak_count=0`.
- After processing, if new `current_streak` is a positive multiple of 7 and `streak_freeze_available=false`, set true.
- pg_cron via `supabase--insert`: daily 07:00 UTC POST to `/functions/v1/streak-rollover` with `x-internal-secret`.

### 8. True in-app one-click cancel
- New `supabase/functions/cancel-subscription/index.ts` — `verify_jwt = true`. Validates JWT via `getClaims`, looks up user's subscription id (subscriptions table, fallback Stripe by email), calls `stripe.subscriptions.update(id, { cancel_at_period_end: body.cancel })`. Returns `{ cancel_at_period_end, current_period_end }`.
- `Billing.tsx`: "Cancel anyway" invokes `cancel-subscription` with `{ cancel: true }` — no redirect. Success copy: "Your subscription is cancelled. You keep full access until {current_period_end}. Reactivate anytime before then with one tap." When `cancel_at_period_end`, render visible "Reactivate" button invoking with `{ cancel: false }`.
- Verify `stripe-subscription-webhook` syncs `cancel_at_period_end` and `current_period_end` on `customer.subscription.updated`; add the sync if missing.
- `customer-portal` stays for payment-method/invoices only.

### 9. Coaching copy sweep
Edit landing components (`HeroSection`, `PricingSection`, `FAQSection`, `FinalCTASection`, `WhatYouGetSection`, `WhyThisWorksSection`, `Footer`, plus any card copy):
- `coach Q&A` → `expert Q&A`
- `Ongoing Coaching Support` → `Ongoing Support`
- `Priority access to 1-on-1 coaching` → `Priority access to 1-on-1 support sessions`
- `Ask the coach anything` → `Ask anything — get an expert-reviewed answer`
- Footer `Educational coaching only` → `Educational program only`

After sweep: `rg -i coach src/components/landing/ src/pages/Index.tsx` and list residuals with one-line justification. No DB identifier renames.

### 10. Wire three notifications
- (a) **streak-at-risk:** `notifications-cron` — extend to trigger when any of the 4 rings is still open at the local 20:00 hour; TZ fallback UTC-5 when `profiles.timezone` is null. Body: "Your {N}-day streak needs one more thing today." Confirm pg_cron hourly runner exists (add if missing).
- (b) **level-up:** verify `gamify-action` inserts `level_up` notification; force a level bump on test account, confirm bell renders it.
- (c) **freeze consumed:** `streak-rollover` (Item 7) inserts `streak_freeze_used` — "Your streak freeze saved your {N}-day streak."

### Verification (end of build)
- Measurements save row in `member_measurements`; history renders.
- Log water/meal/walk/mindset → all four Dashboard rings update without reload.
- Water Today tile lands on Today, scrolls to water card.
- Settings shows "2/2 remaining"; 3rd regen blocked. Meals has no Regenerate button.
- `rg 'invoke|ai\.gateway' src/pages/app/Meals.tsx` returns nothing for swap.
- `/app/*` no floating bubble; Support chat answers navigation, refuses sales.
- Force streak-rollover: freeze consumed + notification; second miss resets streak; 7-day multiple re-awards freeze.
- Cancel test sub in-app — no Stripe portal redirect; Reactivate button flips it back.
- `rg -i coach` residuals listed with justification.
- All three notification types render in bell popover.

### Files
- **New:** `supabase/migrations/<ts>_measurements_regen_cap.sql`, `supabase/functions/support-assistant/index.ts`, `supabase/functions/streak-rollover/index.ts`, `supabase/functions/cancel-subscription/index.ts`
- **Edited:** `src/components/progress/MeasurementsTab.tsx`, `src/hooks/useDailyHabits.tsx`, `src/components/today/HabitLogging.tsx`, `src/pages/app/Dashboard.tsx`, `src/pages/app/Settings.tsx`, `src/pages/app/MealSetupTransition.tsx`, `src/pages/app/Meals.tsx`, `src/pages/app/Billing.tsx`, `src/App.tsx`, `src/pages/Index.tsx`, `src/pages/app/Support.tsx`, `src/components/landing/{HeroSection,PricingSection,FAQSection,FinalCTASection,WhatYouGetSection,WhyThisWorksSection,Footer}.tsx`, `supabase/functions/notifications-cron/index.ts`, `supabase/functions/stripe-subscription-webhook/index.ts` (only if sync missing), `supabase/config.toml`