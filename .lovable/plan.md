# Prompt 6 — Stage 0: live VITA claims and signup-link correction

Fix the live public chat so it never makes reversal claims, never mentions a "7-Day Reset Sprint", and always returns a real, server-approved signup action instead of pointing at a button that does not exist.

## 1. Active sources found (all will be corrected)

| Source | Offending content |
|---|---|
| `supabase/functions/chat-agent/index.ts` — `SYSTEM_PROMPT` | "REVERSE their type 2 diabetes", "manage… we're built to help people reverse it", "7-Day Reset Sprint", "keep the $27 7-Day Reset for life", "the backend will attach a one-tap checkout button below your message" |
| `supabase/functions/chat-agent/index.ts` — `buildCta()` | Only fires on `purchase_intent`; label "Start the 7-Day Reset — $27" |
| `supabase/functions/chat-agent/index.ts` — memory/objection block | "the keep-the-reset-if-you-cancel safety net" |
| `supabase/functions/_shared/copy.ts` — FAQ `price` | "unlocks the membership and the 7-Day Reset Sprint", "you keep the 7-Day Reset" |
| `supabase/functions/_shared/copy.ts` — FAQ `cancel` CTA | points to `/refund-terms`, which is not a live route (live route is `/refunds`) |
| `src/pages/LLMInfo.tsx` and `public/llms.txt` | Repeated "7-Day Reset Sprint" and "keep the $27 7-Day Reset" wording (machine-readable product description, publicly served) |

No other active hits: remaining matches are CSS/animation `reverse`, unrelated code comments, historical migrations and evidence files, which stay untouched.

## 2. Approved deterministic answer (new FAQ key `about`)

Add an `about` FAQ entry in `_shared/copy.ts` matching questions like "what is this program", "what is DRM", "what's this all about", "how do I sign up / join / get started", "tell me about the membership". Body is the approved text verbatim:

> Diabetes Reset Method is a self-guided educational membership for adults managing Type 2 diabetes or prediabetes. It offers small daily actions, meal ideas, tracking tools, educational membership support and printable reports for health visits. It does not diagnose, treat or promise to reverse diabetes.
>
> Your first 14 days cost US$27. After that, membership is US$67 per month until canceled. You can review the membership and get started below.

Action: label "View membership and pricing", destination `/#pricing`, plus plain-text fallback `https://diabetesresetmethod.com/#pricing`.

Rewrite the `price` FAQ body to the same truthful pricing sentence (US$27 first 14 days, then US$67/month until canceled, cancel any time) with no Sprint language, and repoint the `cancel` CTA to `/refunds`.

## 3. Follow-up behaviour (new FAQ key `signup_followup`)

Short affirmatives and link requests — `yes`, `yes how?`, `how?`, `where do I start`, `send me the link`, `how do I join`, `I'm ready`, `sign me up`, `ok` — return:

> You can review the membership and start here:

with the same structured CTA and plain-text fallback. Matched deterministically before any model call, so there is no sales-script restart and no readiness loop.

## 4. Safe link implementation

- Server returns `action: { label, path, href }` where `path` comes from a fixed allow-list: `/#pricing`, `/login`, `/refunds`, `/privacy`. Anything else is dropped server-side.
- Client re-validates the path against the same allow-list before rendering; unknown, absolute, `javascript:` or encoded destinations render nothing but still show the plain-text URL.
- `ChatWidget` renders the action as an anchor-styled button: keyboard focusable, visible focus ring, `min-h-[44px]`, explicit accessible name, and the plain `https://diabetesresetmethod.com/#pricing` text underneath as fallback.
- Model output is never parsed for links; no general link-rendering capability is added.
- No auto-checkout — the visitor taps the CTA themselves.

## 5. Safety controls preserved

`ai_health_enabled` stays false; health messages keep returning the boundary copy with no external AI call; opaque session tokens, consent boundaries, exact-origin CORS, rate limits and chat deletion are untouched. No browser UUID authorization is reintroduced.

## 6. Tests and verification

New `src/test/vitaMembershipAnswers.test.ts` plus additions to the existing chat tests covering:
- The exact transcript ("What is this program all about and how do I sign up?" → "yes" → "yes how?") and wording variants.
- Zero reversal/cure/treatment claims and zero "7-Day Reset" strings across active chat copy (string scan).
- Correct pricing sentence; price/login/cancel answers still correct.
- CTA present on the about + follow-up answers; no conversational loop.
- Allow-list: approved paths render, arbitrary/`javascript:`/external URLs do not.
- Health question returns the boundary answer with no gateway call.
- Accessibility assertions: role/name, keyboard reachability, 44px minimum target.

Then: TypeScript, focused chat tests, lint on touched files, production build. Deploy `chat-agent` and the shared copy module, publish the minimal client change, verify on the live domain with one labelled synthetic session, then delete that session and all derived rows by exact ID and confirm zero residue.

The broader Prompt 6 redesign does not start until this is verified live.
