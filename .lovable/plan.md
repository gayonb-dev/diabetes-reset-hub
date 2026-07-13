
## 1. Seed Days 43–90 into `daily_actions` + blog entries 6–7 (verbatim)

Insert Days 43–90 via `supabase--insert`, mapping the doc verbatim: `day_number` 43..90, `action_title` = bolded heading, `action_description` = paragraph after the heading, `sub_tasks` = bullets as string array, `is_extension_day=false`, `phase_number`/`action_type`/`day_name` matching the Days 15–42 convention (re-verified against the Day 42 row before insert). Also insert blog entries **6** (Weill Cornell) and **7** (Clemson HGIC) into `content_items` (`type='blog'`) verbatim — URLs pre-verified, insert as-is.

**Report:** `daily_actions` non-extension count (target 90); `content_items` `type='blog'` count after item 1 (target 7 before item 2 runs).

## 2. Add 3 more blog entries — mandatory URL verification

Before each insert, fetch the URL with `code--fetch_website`, confirm **HTTP 200** and that the returned page title matches the topic. Any URL that fails is **skipped and reported, not inserted**.

Candidates:
1. **"Stress Raises Blood Sugar — Even Without Food"** · Cleveland Clinic · `https://health.clevelandclinic.org/stress-and-diabetes`
2. **"Why Strength Training Is Blood Sugar Medicine"** · DiaTribe · `https://diatribe.org/exercise/benefits-strength-training-diabetes`
3. **"10 Surprising Things That Spike Blood Sugar"** · CDC · `https://www.cdc.gov/diabetes/living-with/10-things-that-spike-blood-sugar.html`

Same column shape as existing blog rows (`title`, `summary`, `is_active=true`, `metadata` with `source_name` + `external_url`), confirmed against one existing blog row first.

**Report:** each URL's HTTP status and matched page title; inserted vs skipped; final `content_items` `type='blog'` count (target ≤ 10).

## 3. Fix the inaccurate founder story

Sole match (already scanned across `vita_quotes` all categories and `content_items.body`): `vita_quotes.id = c3e99342-db08-435f-ae13-d1e3f227aa4f` (`gayon_says` → becomes `founder_says` in item 4).

**Exact replacement text, no gendered pronoun:**

> I did not build this program because I read a study. I built it after helping a friend who lived with Type 2 diabetes for years — and eventually reversed it. The standard advice was never going to get them there; it was designed to manage, maintain, live with. I refused to accept that. Every single feature in this app exists because of that refusal. Use it like your health depends on it. Because it does.

**Report:** row id updated + before/after text.

## 4. Rename GAYON → FOUNDER

"Coach" was purged product-wide in the coaching-copy sweep; the label on the daily quote card is **FOUNDER**, rendering **"FROM THE FOUNDER"**.

**Migration:** `UPDATE vita_quotes SET category='founder_says' WHERE category='gayon_says'`. Re-verify no CHECK/enum constraint before running; adjust migration if one is found.

**Code:**
- `src/components/dashboard/VitaQuoteCard.tsx`: `QuoteSpeaker = "VITA" | "FOUNDER"`. When `current.speaker === "FOUNDER"`, render label `FROM THE FOUNDER` (VITA still renders `VITA says`).
- `src/pages/app/Dashboard.tsx` (line 101): map `q.category === "founder_says" ? "FOUNDER" : "VITA"`.
- `src/hooks/useVitaQuotes.tsx`: rename union member + bucket + weights key `gayon_says` → `founder_says` (weight 0.025 preserved).

**Not touched:** `CoachingWaitlist.tsx` WhatsApp/Gayon copy.

## 5. Fix Day-29 workout flow + no "locked" flash

**Root cause (verified):** `useProgramDay` calls `computeDay(subscription?.created_at)` during load, returning `1` when subscription is nullish. `WorkoutSession`'s redirect fires with `programDay=1`, kicking Day-29 users back to the library before the session insert. The session-creation `useEffect` also omits `programDay` from its deps.

**Fix:**
1. **`src/hooks/useProgramDay.ts`** — return sentinel `0` while `!loaded` (do NOT compute from subscription during load). Keeps `number` return type; consumers already treat `0` as "not ready" for the `> 0 && < 29` and `>= 29` checks.
2. **`src/pages/app/WorkoutLibrary.tsx`** — when `programDay === 0`, render a loading skeleton (Vita + skeleton rows), **never the locked panel**. Locked panel renders only when `programDay > 0 && programDay < 29`.
3. **`src/pages/app/WorkoutSession.tsx`** — when `programDay === 0`, render a loading skeleton and skip the redirect/insert effects. Redirect fires only when `programDay > 0 && programDay < 29`. Add `programDay` to the session-creation `useEffect` deps.

No Day-29+ member sees "locked" flash even for one frame; loading is a neutral skeleton.

**Playwright verification (before + after):**
- Baseline (before fix): log in test member seeded at Day 29 (`profiles.program_start_date = today - 28 days` via `supabase--insert`), navigate `/app/workouts` → tap "Begin workout" → confirm current bounce back to library and no `workout_sessions` insert. Screenshot.
- After fix: same flow → confirm session screen renders, first exercise visible, and `workout_sessions` row with `status='in_progress'` exists. Screenshot.
- Also confirm on the same Day-29 account: no "Workouts unlock at Day 29" text ever appears in the library while `useProgramDay` is loading (skeleton only).

## 6. Helper-badge author fix

**Bug:** `src/pages/app/Ask.tsx` helpful-vote calls `award-badges` with `body: {}` — evaluates the voter, not the answer author, so the author's `helper` badge only updates on the next cron.

**Fix:**
- `supabase/functions/award-badges/index.ts`: accept optional `{ answer_id: string }` (Zod-validated). When present, resolve `community_answers.user_id` server-side and evaluate that user; unknown answer_id → 404. This is safe (evaluation reads truthful state, idempotent, no identity assertion).
- `src/pages/app/Ask.tsx`: helpful-vote call site passes `body: { answer_id: <voted answer id> }`. Question-post and win-post call sites unchanged.

**Report:** confirm via a DB check that voting helpful on an answer triggers the author's `helper` badge insert into `user_badges` in the same request cycle.

## Files changed

- `src/components/dashboard/VitaQuoteCard.tsx`
- `src/pages/app/Dashboard.tsx`
- `src/hooks/useVitaQuotes.tsx`
- `src/hooks/useProgramDay.ts`
- `src/pages/app/WorkoutLibrary.tsx` (add loading-skeleton branch)
- `src/pages/app/WorkoutSession.tsx` (loading-skeleton branch + fixed deps)
- `src/pages/app/Ask.tsx` (pass `answer_id`)
- `supabase/functions/award-badges/index.ts` (accept `answer_id`)
- New migration: `vita_quotes.category gayon_says → founder_says`
- Data-only (via `supabase--insert`): Days 43–90 into `daily_actions`; blog entries 6–7 (item 1) + up to 3 verified blogs (item 2); founder-story `vita_quotes` row updated

## Reports delivered at end

- `daily_actions` non-extension count (target 90)
- `content_items` `type='blog'` count after item 1 (target 7) and after item 2 (≤ 10, with per-URL HTTP status + page title)
- Founder-story row id + before/after text
- Playwright before/after screenshots for Day-29 workout flow + inserted `workout_sessions` row
- Confirmation that no "locked" text ever renders during `useProgramDay` load
- Helper-badge fix DB verification (voter → author badge award in same request)
