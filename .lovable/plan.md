## Three micro-fixes (approved adjustments applied)

**1. Remove streak card from sidebar** — `src/pages/app/AppLayout.tsx`
Delete the amber `🔥 {streakDays} day streak` block between header and nav. Drop the `streakDays` state and the `user_streaks` fetch (collapse Promise.all to a single `visitor_profiles` query). Header flame + right-rail streak card remain the sources of truth.

**2. GettingStartedChecklist auto-collapse + 3-day grace hide** — `src/components/dashboard/GettingStartedChecklist.tsx`
- Compute `allAcquired = ITEMS.every(i => state[i.slug])`.
- On first `allAcquired` transition, persist `getting_started_completed_at = now()` into `visitor_profiles.metadata` (JSON — no migration).
- Load `completed_at` from metadata alongside checklist state.
- If `allAcquired` and `Date.now() - completed_at > 3 days` → return `null` (permanent hide). Existing `currentProgramDay > 29` hide stays.
- When `allAcquired` inside the 3-day grace: default `open = false`, header row shows `Getting Ready` + amber `✓ complete` on the right, chevron kept but subtle (`text-tertiary-fg/60`), still tappable to expand/collapse the item list.

**3. Confirm right-rail sticky** — `src/pages/app/Dashboard.tsx`
Already `sticky top-6` on the `lg:block` aside wrapper (verified line 442). No change; noted in report.

### Files to change
- `src/pages/app/AppLayout.tsx`
- `src/components/dashboard/GettingStartedChecklist.tsx`