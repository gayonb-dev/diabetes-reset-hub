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
- **Retention policy** — written, published, enforced: PHI auto-purged after N days (default 365) via scheduled job
- **Deletion endpoint** — user can request full purge; completes within 24h; logged
- **Redaction** — PHI redacted in any logs/digests sent outside the secure DB
- **Access logging** — every read of a PHI-bearing row logged with actor + reason
- **30-minute legal review** by a qualified attorney before launch (~$150–400 USD). Not optional.

### Phase A graduation tests (all three must pass)
1. **Recognition test** — returning visitor recognized across sessions and devices (when authenticated)
2. **Deletion test** — deletion request fully purges PHI within 24h, verified by query
3. **Transcript read** — **Gayon personally reads 30 random conversation transcripts** and signs off on tone, accuracy, and brand voice. Not a summary. Not Lovable's assessment. Gayon reads them.

---

## Phase B — Recognition & Memory

**Goal:** The agent remembers who it's talking to and what was said before.

- Persistent conversation memory per visitor_profile
- Summarization job collapses long histories into rolling summaries
- Cross-session continuity ("Last time you mentioned your A1C was 8.2 — how's that going?")
- Misidentification hard stop reinforced: agent must confirm identity before referencing prior PHI

### Phase B graduation test
Returning visitor in a new session gets contextually accurate recall on first message, with zero misattribution across 20 test cases.

---

## Phase C — Intelligence Core & Daily Digest

**Goal:** Turn conversation data into decisions.

- Nightly aggregation job over `messages` + classifier output
- `daily_digest` table; email to Gayon each morning
- Digest sections:
  1. **3 Actions Today** — AI-chosen, not metric-driven. Specific, doable today.
  2. **What the agent heard today** — themed qualitative summary (top objections, recurring questions, emotional patterns)
  3. **Numbers** — conversations, qualified leads, conversions, drop-off points
  4. **Anomalies** — anything statistically off vs. 7-day baseline
- All PHI redacted in the digest email

### Phase C graduation test
Gayon can answer "what did customers care about this week?" in 60 seconds using only the digest, with no dashboard lookup.

---

## Phase D — Autonomous Segmentation & Re-engagement

**Goal:** The system acts on what it learns without Gayon prompting it.

- Dynamic segments computed nightly (e.g., "asked about insulin + didn't buy", "bought 5-day + went quiet at day 3")
- Segment-triggered sequences (email/WhatsApp) with per-segment content logic
- **Named campaign type: "Why didn't you come back"** — personalized re-engagement
  - Trigger A: bought once, no activity 14 days → check-in + next-step offer
  - Trigger B: high-intent visitor (asked pricing or had ≥3 turns) who never converted, 7 days silent → objection-specific message based on what they actually said
  - Trigger C: started intake, didn't finish, 48h → finish-the-form nudge
  - Content drawn from the visitor's own conversation history, not a template blast
- Every autonomous send logged + reversible; Gayon can pause any campaign from admin

### Phase D graduation test
A re-engagement send goes out, gets a reply, the agent handles the reply in-thread, and the loop closes without Gayon touching it.

---

## Phase E — Continuous Product Evolution

**Goal:** The store reshapes itself based on what customers actually want.

- 90-day product review driven by the intelligence core:
  - What did customers ask for this quarter that isn't offered?
  - What's offered that nobody asks about anymore?
- No graduation. This phase never ends.

---

## What I can build alone vs. what needs outside help

**I can build:** every table, RLS policy, edge function, chat widget, classifier, digest job, consent UI, deletion endpoint, retention cron, segment engine, re-engagement sequences, admin controls.

**You need outside help for one thing:** the 30-minute legal review in A3. Budget ~$150–400 USD.

---

Say **go** to start Phase A with the PHI gate built in from day one.
