# Agentic Commerce Ecosystem — The Diabetes Reset Method

## Terminology
- **Agentic commerce ecosystem** — the whole system (chat + intelligence + autonomous actions)
- **Conversational commerce agent** — the chat layer specifically

---

## Phase A — Foundation: Identity, Agent, and PHI Gate  ✅ SHIPPED

**Goal:** Every visitor recognized, every conversation captured, every health data point handled lawfully.

### A1. Visitor identity
- `visitor_profiles` (anonymous_id, optional user_id, first_seen_at, last_activity_at, source, **date_of_birth**)
- Three visitor states handled explicitly:
  1. **Anonymous** — localStorage `drm_visitor_id` only
  2. **Returning anonymous** — recognized across sessions via persistent id
  3. **Authenticated** — linked to `auth.users` after login/checkout
- **Anon → auth merge**: at Stripe checkout, the widget's `anonymous_id` is passed as session metadata. The `stripe-webhook` looks up the auth user by email and sets `visitor_profiles.user_id`. Pre-purchase chat history is preserved.
- Misidentification hard stop: never auto-merge profiles on weak signals.

### A2. Conversational commerce agent
- Chat widget on landing + key pages (`src/components/chat/ChatWidget.tsx`)
- Lovable AI Gateway (`google/gemini-2.5-flash`)
- System prompt: brand voice (short, direct, sales-aware, plainspoken), product knowledge, $27 → 14-day → $67/mo path
- All turns logged to `conversations` + `messages` with `visitor_profile_id`
- Classifier extracts in one call: `intent`, `topic`, `objection_type`, `sentiment`, `health_signals`, `contains_phi`, **`confidence` (0-1)**
- **Medical-question hard handoff**: classifier emits `intent: "medical_question"` → canned reply, no LLM call, pivot to lifestyle scope
- **Purchase-intent CTA**: when classifier returns `intent: "purchase_intent"`, edge function returns `cta: {type: "checkout", label, url}` and widget renders it as a button below the assistant message. Hash URLs scroll in-page; external URLs open in new tab.

### A3. PHI Gate (HARD PREREQUISITE — launch blocker)
- **Consent UI** — explicit opt-in before first health-related message; plain language; stored in `phi_consent` with timestamp + version + ip + ua.
- **Coverage**: chat AND `intake_submissions` (intake_submissions has `phi_consent_required` flag; coaching_agreement checkbox is the consent record).
- **Retention**: fixed at **730 days from last meaningful activity**. Activity = login, chat_turn, content_view, content_complete, purchase, intake_submit. Cron `purge-inactive-visitors` runs nightly.
- **Deletion endpoint** — `request-data-deletion` (24h SLA, logged).
- **Access logging** — every PHI row read by an admin flows through `read-phi-data` edge function which requires a `reason` and writes `phi_access_log`.
- **Admin surfaces routed through `read-phi-data`** (locked in this patch):
  - `src/pages/admin/AdminQaQueue.tsx` — qa_submissions (questions often contain meds, A1C, symptoms)
  - `src/pages/admin/AdminWaitlist.tsx` — coaching_waitlist.why_now, phone
  - `src/pages/AdminDashboard.tsx` — intake_submissions only (orders, leads, challenge_progress are not PHI under our definition)
  - **Phase B conversation viewer** — built on `read-phi-data` from day one
  - **Phase C `/admin/top-customers`** — uses `read-phi-data` only if it surfaces health_signals
- **30-minute legal review** by a qualified attorney before launch (~$150–400 USD). Not optional.

### Phase A graduation tests
1. **Recognition** — returning visitor recognized across sessions and devices (when authenticated)
2. **Deletion** — deletion request fully purges PHI within 24h, verified by query
3. **Transcript read** — Gayon reads 30 random conversation transcripts and signs off on tone

---

## Activity events (added in Phase A, used heavily from Phase C on)

`activity_events` table is the single source of truth for engagement signals.

Columns: `visitor_profile_id, user_id, event_type, event_at, metadata, created_at`.

Event types tracked:
- `login` — from `useAuth.onAuthStateChange` SIGNED_IN
- `chat_turn` — from `chat-agent` on every user message
- `purchase` — from `stripe-webhook` checkout.session.completed
- `intake_submit` — from `IntakeForm.handleSubmit`
- `content_view`, `content_complete` — wired when content_items get views (Phase B)
- `consent_granted`, `consent_revoked` — wired in PHI consent flows

`visitor_profiles.last_activity_at` is the denormalized cache used by the 730-day purge. `activity_events` rows give multi-signal inputs to the Phase C ranking.

Indexes (composites; ranking query always filters by visitor/user + recent window):
- `(visitor_profile_id, event_at DESC)`
- `(user_id, event_at DESC) WHERE user_id IS NOT NULL`
- `(event_type, event_at DESC)`
- `(event_at)` — drives the purge cron

Future scale: partition by month when the table crosses ~5M rows. Not yet.

---

## Phase B — Recognition, Memory, and Hospitality Triggers

**Goal:** The agent remembers who it's talking to and treats every returning visitor with unreasonable hospitality.

### B1. Memory
- Persistent conversation memory per `visitor_profile`
- Summarization job collapses long histories into rolling summaries
- Cross-session continuity, bounded by 730-day retention
- Agent must confirm identity before referencing prior PHI

### B2. Hospitality Triggers (named, distinct behaviors)
1. **Greet returning visitor by name** — recognized auth visitor lands → personalized greeting referencing last topic
2. **Birthday recognition** — `date_of_birth` on file → branded birthday email + optional gesture (no upsell that day)
3. **Pricing-objection return** — visitor previously asked about price + didn't convert → value-framed return message
4. **Paid-member routing** — active customer hits sales page → auto-redirect to dashboard
5. **Long-absent member check-in** — paid member silent **N=21 days** (locked) → human-toned check-in, no offer attached
6. **Re-engagement when history purged** — if visitor returns after 730-day purge, treat as new and explicitly say "we don't have history on you" rather than fake continuity

### Phase B graduation test
Returning visitor in a new session gets contextually accurate recall on first message, with zero misattribution across 20 test cases. Each of the 6 hospitality triggers fires correctly in a staged scenario.

---

## Phase C — Intelligence Core, Daily Digest, and Operator Tools

**Goal:** Turn conversation data into decisions and into tools Gayon actually uses.

### C1. Daily digest
- **Map-reduce digest** — for each conversation, generate a one-sentence summary (map); then synthesize all summaries into the digest (reduce). Avoids dumping every transcript into a single prompt.
- `daily_digest` table; email each morning. All PHI redacted in the email.
- Sections: 3 Actions Today, What the agent heard, Numbers, Anomalies.

### C2. Top 100 Customers — operator call list at `/admin/top-customers`
Refreshed nightly into a materialized `visitor_engagement_scores` table — `/admin/top-customers` reads the pre-computed table; never recomputes on page load.

**Engagement ranking formula (locked here, not at C build time):**
```
score =
   (0.30 × spend_score)         // total_paid_usd, log-normalized
 + (0.25 × content_score)       // distinct content_items completed in last 90d
 + (0.20 × conversation_score)  // user-role messages last 90d, capped at 50
 + (0.15 × recency_score)       // exp decay on days_since_last_activity, half-life 14d
 + (0.10 × consistency_score)   // distinct active days in last 30d / 30
```
All inputs sourced from `activity_events` aggregations + `orders.amount`. Per-person card surfaces: last conversation theme, last purchase + days since, open unresolved questions, suggested talking points, draft WhatsApp script. Read PHI fields via `read-phi-data`.

### Phase C graduation tests
1. Gayon can answer "what did customers care about this week?" in 60s using only the digest
2. **14 consecutive days of on-time, complete digest delivery** before Phase D begins

---

## Phase D — Autonomous Segmentation, Re-engagement, Offers, Product Validation

### D1. Dynamic segmentation
Segments computed nightly from `activity_events` + purchase data.

### D2. Re-engagement (two named plays)
- **Retention play — "Bought once, went quiet"** (paid, no activity 14d) — engagement metric, not revenue
- **Conversion play — "Never converted, went quiet"** (high-intent visitor silent 7d) — addresses their specific objection
- **Intake abandon** — started, didn't finish, 48h → nudge
- Content drawn from visitor's own conversation history, not template blast

### D3. Offer Rules Engine (non-negotiable guardrail)
**Gayon writes the rules. AI executes.** Admin UI to set: max discount % per segment, frequency cap, eligible segments, expiry windows, blackout rules. Every offer logged with the `rule_id` that authorized it.

### D4. Product Validation Loop
**Response capture mechanism:** new product idea → emails top N most-engaged customers with a structured one-click response form (interested / not interested / would pay / would not pay + free-text "what would make this a yes"). Responses land in `product_validation_responses` table; AI summarizes into a one-page report. No product ships without this loop.

### Phase D graduation test
A re-engagement send goes out, gets a reply, the agent handles it under the Offer Rules Engine, the loop closes without Gayon touching it, outcome captured.

---

## Phase E — Continuous Product Evolution

90-day product review driven by intelligence core + Product Validation Loop. No graduation. Never ends.

---

## Landing page policy

Adding `<ChatWidget />` to `App.tsx` is the only landing-page change permitted by Phase A. Hero copy, layout, sections, and CTAs remain frozen. Future agent surfaces (CTA buttons rendered in chat, mobile bubble positioning above sticky CTA) are allowed; landing-page DOM edits outside the widget are not.

---

## What I can build alone vs. need outside help

**Build alone:** every table, RLS policy, edge function, chat widget, classifier, digest job, top-100 list, consent UI, deletion endpoint, retention cron, segment engine, re-engagement sequences, offer rules engine, product validation, admin controls.

**Outside help:** the 30-minute legal review in A3. Budget ~$150–400 USD.
