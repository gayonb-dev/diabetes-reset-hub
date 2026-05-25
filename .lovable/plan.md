# Agentic Commerce Ecosystem — The Diabetes Reset Method

## Terminology
- **Agentic commerce ecosystem** — the whole system (chat + intelligence + autonomous actions)
- **Conversational commerce agent** — the chat layer specifically

---

## Phase A — Foundation: Identity, Agent, and PHI Gate

**Goal:** Every visitor recognized, every conversation captured, every health data point handled lawfully.

### A1. Visitor identity
- `visitor_profiles` table (anonymous id, optional linked user_id, first_seen, last_seen, source)
- Three visitor states handled explicitly:
  1. **Anonymous** — cookie/localStorage id only
  2. **Returning anonymous** — recognized across sessions via persistent id
  3. **Authenticated** — linked to `auth.users` after email/login
- Misidentification hard stop: if confidence in identity match < threshold, treat as new visitor. Never merge profiles automatically on weak signals.

### A2. Conversational commerce agent
- Chat widget on landing + key pages
- Lovable AI Gateway (default `google/gemini-2.5-flash`)
- System prompt: brand voice (warm, plainspoken, coaching-not-medical), product knowledge, pricing, FAQs
- All turns logged to `conversations` + `messages` tables with visitor_profile_id
- Classifier extracts: intent, topic, objection type, health signals mentioned, sentiment

### A3. PHI Gate (HARD PREREQUISITE — launch blocker)
The agent collects Protected Health Information (A1C, meds, hospitalizations, complications). Before going live:
- **Consent UI** — explicit opt-in before first health-related message; plain language; stored with timestamp + version
- **Retention policy — fixed at 730 days (2 years) from last meaningful activity.** Meaningful activity = any conversation turn, login, or purchase. The clock resets on each activity. Inactive-for-730-days profiles are auto-purged via scheduled job. This number is locked in the spec; changing it later means losing data we can't get back.
- **Deletion endpoint** — user can request full purge; completes within 24h; logged
- **Redaction** — PHI redacted in any logs/digests sent outside the secure DB
- **Access logging** — every read of a PHI-bearing row logged with actor + reason
- **30-minute legal review** by a qualified attorney before launch (~$150–400 USD). Not optional.

### Phase A graduation tests (all three must pass)
1. **Recognition test** — returning visitor recognized across sessions and devices (when authenticated)
2. **Deletion test** — deletion request fully purges PHI within 24h, verified by query
3. **Transcript read** — **Gayon personally reads 30 random conversation transcripts** and signs off on tone, accuracy, and brand voice. Not a summary. Not Lovable's assessment. Gayon reads them.

---

## Phase B — Recognition, Memory, and Hospitality Triggers

**Goal:** The agent remembers who it's talking to, what was said before, and treats every returning visitor with unreasonable hospitality.

### B1. Memory
- Persistent conversation memory per visitor_profile
- Summarization job collapses long histories into rolling summaries
- Cross-session continuity ("Last time you mentioned your A1C was 8.2 — how's that going?")
- Memory horizon bounded by the 730-day retention window
- Misidentification hard stop reinforced: agent must confirm identity before referencing prior PHI

### B2. Hospitality Triggers (named, distinct behaviors)
Each is its own rule with its own trigger, content logic, and success metric:

1. **Greet returning visitor by name** — recognized authenticated visitor lands → personalized greeting referencing last topic
2. **Birthday recognition** — birthday on file → branded birthday email + optional gesture (no upsell that day)
3. **Pricing-objection return** — visitor previously asked about price + didn't convert → value-framed return message specific to the objection raised (not generic discount)
4. **Paid-member routing** — active customer hits sales page → auto-redirect to dashboard / next-step action, never re-pitched
5. **Long-absent member check-in** — paid member silent N days → "we noticed you've been quiet" human-toned check-in, no offer attached

### Phase B graduation test
Returning visitor in a new session gets contextually accurate recall on first message, with zero misattribution across 20 test cases. Each of the 5 hospitality triggers fires correctly in a staged scenario.

---

## Phase C — Intelligence Core, Daily Digest, and Operator Tools

**Goal:** Turn conversation data into decisions and into tools Gayon actually uses as an operator.

### C1. Daily digest
- Nightly aggregation over `messages` + classifier output
- `daily_digest` table; email to Gayon each morning
- Sections:
  1. **3 Actions Today** — AI-chosen, not metric-driven. Specific, doable today.
  2. **What the agent heard today** — themed qualitative summary (top objections, recurring questions, emotional patterns)
  3. **Numbers** — conversations, qualified leads, conversions, drop-off points
  4. **Anomalies** — anything statistically off vs. 7-day baseline
- All PHI redacted in the digest email

### C2. Top 100 Customers — operator call list
- Ranked list (engagement + tenure + spend) refreshed nightly
- Per-person card with:
  - Last conversation theme
  - Last purchase + days since
  - Open questions they asked the agent that never got resolved
  - Suggested talking points
  - Draft call/WhatsApp script
- Exportable to CSV; one-click "mark contacted" + outcome capture
- Lives in `/admin/top-customers`

### Phase C graduation tests (both must pass)
1. **Signal test** — Gayon can answer "what did customers care about this week?" in 60 seconds using only the digest
2. **Reliability test** — **14 consecutive days of on-time, complete digest delivery** with no missing sections and no broken sends. Phase D cannot start until this passes.

---

## Phase D — Autonomous Segmentation, Re-engagement, Offers, and Product Validation

**Goal:** The system acts on what it learns — within guardrails Gayon controls.

### D1. Dynamic segmentation
- Segments computed nightly from conversation + purchase data
- Each segment is queryable and addressable by campaigns

### D2. Re-engagement campaigns (two named, distinct plays)
- **Retention play — "Bought once, went quiet"**
  - Trigger: paid customer, no activity 14 days
  - Goal: keep them engaged with their program / next step
  - Success metric: re-engagement rate, not revenue
- **Conversion play — "Never converted, went quiet"**
  - Trigger: high-intent visitor (asked pricing or had ≥3 turns) silent 7 days
  - Goal: address the specific objection they raised in their own conversation
  - Success metric: conversion rate per segment
- **Bonus trigger: Intake abandon** — started intake, didn't finish, 48h → finish-the-form nudge
- Content drawn from the visitor's own conversation history, not a template blast

### D3. Offer Rules Engine (non-negotiable guardrail)
**Gayon writes the rules. AI executes.**
- Admin UI where Gayon sets:
  - Max discount % per segment
  - Frequency cap per visitor (e.g., max 1 offer / 30 days)
  - Eligible segments per offer
  - Expiry windows
  - Blackout rules (e.g., never offer discount to a visitor within 7 days of full-price purchase)
- AI's only job: pick which existing rule applies to this visitor right now. Never invents a rule, never sets a price, never extends an expiry.
- Every offer fired is logged with the rule_id that authorized it.

### D4. Product Validation Loop
- New product idea → preview email to top 20 (or top 100, configurable) most engaged customers
- Structured response capture: interested / not interested / would pay / would not pay + free-text "what would make this a yes"
- AI summarizes responses into a one-page validation report to Gayon
- Report feeds directly into the Phase E 90-day review
- No product ships without running this loop

### Phase D graduation test
A re-engagement send goes out, gets a reply, the agent handles the reply in-thread under the Offer Rules Engine, the loop closes without Gayon touching it, and the outcome is captured.

---

## Phase E — Continuous Product Evolution

**Goal:** The store reshapes itself based on real signal.

- 90-day product review driven by:
  - Intelligence core (what customers asked for that isn't offered; what's offered that nobody asks about)
  - Product Validation Loop outputs from the quarter
- No graduation. This phase never ends.

---

## What I can build alone vs. what needs outside help

**I can build:** every table, RLS policy, edge function, chat widget, classifier, digest job, top-100 list, consent UI, deletion endpoint, retention cron (730-day rolling-activity window), segment engine, re-engagement sequences, offer rules engine + admin UI, product validation flow, admin controls.

**You need outside help for one thing:** the 30-minute legal review in A3. Budget ~$150–400 USD.

---

Say **go** to start Phase A with the PHI gate built in from day one.
