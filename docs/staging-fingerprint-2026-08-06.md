# Step 0 environment fingerprint — 2026-08-06

**Result: BLOCKED. The connected target is PRODUCTION. No staging clone exists. Implementation has not begun.**

## Recorded fingerprint of the connected backend

| Field | Value |
| --- | --- |
| Captured (UTC) | 2026-08-06T17:14:13Z |
| Supabase project ref | `wqennhjdojjqmmqzjhti` |
| `supabase/config.toml` `project_id` | `wqennhjdojjqmmqzjhti` |
| `.env` `VITE_SUPABASE_PROJECT_ID` | `wqennhjdojjqmmqzjhti` |
| `.env` `VITE_SUPABASE_URL` | `https://wqennhjdojjqmmqzjhti.supabase.co` |
| Database host | `aws-1-eu-west-1.pooler.supabase.com` |
| Database / role | `postgres` / `sandbox_exec.wqennhjdojjqmmqzjhti` |
| Environment label | none present — single project, no `staging`/`preview` variant |

This is the same project ref that serves the published site
(`diabetesresetmethod.lovable.app`, `diabetesresetmethod.com`).

## Proof it holds live data

Read-only counts, no rows read or modified:

| Table | Rows |
| --- | --- |
| `orders` | 7 |
| `conversations` | 10 |
| `messages` | 37 |
| `visitor_profiles` | 6 (5 unbound, 1 bound to a user) |
| `profiles` | 1 |
| `phi_consent` | 1 |
| `subscriptions` | 0 |

Real `orders` rows confirm this is the production project, not a clone.

## Consequence

Step 0 of the approved plan states: *"If the connected target is production,
or the target cannot be proven, I stop and report instead of editing."*
The stop condition is met. **No migration, Edge function, or source file has
been changed in this turn.** The only file written is this report.

## What is required to unblock

1. A separate Supabase project provisioned as the staging clone.
2. Lovable's connected backend, all migrations, Edge functions, cron jobs,
   test accounts, and processor **test-mode** credentials pointed at that
   clone — verified by the same fingerprint fields above resolving to the
   staging ref, not `wqennhjdojjqmmqzjhti`.
3. Written confirmation that creating a preview cannot apply migrations to
   `wqennhjdojjqmmqzjhti`.

Note: Lovable Cloud attaches one managed Supabase project per project. A
staging clone therefore has to be a second Lovable project (or an external
Supabase project connected in place of Cloud). This is an owner decision and
cannot be self-served from here.

---

# Read-only production reports permitted at this stage

These are the read-only outputs the addendum asks for. They are reports only —
nothing was migrated, purged, marked, or converted.

## Legacy `phi_consent` count and disposition

| policy_version | rows | first | last | revoked | with user_id | with raw IP | with full UA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `2026-05-25-v1` | 1 | 2026-05-25T17:11:14Z | 2026-05-25T17:11:14Z | 0 | 0 | 1 | 1 |

**Disposition (proposed, not applied):**

- The single row is **not** valid consent for any new AI processing purpose.
  The UI and server consent paths that produced it were disconnected, so it
  cannot authorize `public_chat_ai_health` or any other purpose key.
- New writes to `phi_consent` stop once implementation begins.
- The row is exported and deleted as a **labelled legacy record**
  (`legacy_phi_consent`), with `ip_address` and `user_agent` **excluded** from
  member exports.
- No migration, purge, or conversion into active consent without your later
  approval of these counts.

`deletion_requests`: **0 rows** in any status — retiring
`request-data-deletion` to `410 Gone` strands no in-flight request.

## Legacy identifier and consent-flag sweep

Full-tree search (source, Edge functions, migrations, generated types;
`node_modules`/`dist`/`.git` excluded).

### `drm_visitor_id` / browser visitor UUID — 7 source files
`src/hooks/useAuth.tsx`, `src/pages/app/Onboarding.tsx`, `src/pages/IntakeForm.tsx`,
`src/pages/SixWeekReset.tsx`, `src/pages/Privacy.tsx`,
`src/components/chat/ChatWidget.tsx`, `src/components/landing/PaymentModal.tsx`
→ *Disposition:* all reads/writes removed; `ChatWidget` actively clears the key
from browser storage on load.

### `drm_landing_chat_consent` local health-consent flag — 1 file
`src/components/chat/ChatWidget.tsx`
→ *Disposition:* removed and actively cleared from browser storage.

### `anonymous_id` accepted as authorization — server side
`supabase/functions/request-data-deletion/index.ts` → **retire, return 410 Gone**
`supabase/functions/grant-phi-consent/index.ts` → **rewrite** to require verified
session + purpose key + current notice version
`supabase/functions/chat-agent/index.ts` → subject resolved from verified session only
`supabase/functions/purge-inactive-visitors/index.ts` → manifest-driven, report-only

### `anonymousId` in checkout metadata — 4 files
`src/pages/SixWeekReset.tsx`, `src/components/landing/PaymentModal.tsx`,
`supabase/functions/create-checkout-session/index.ts`,
`supabase/functions/stripe-webhook/index.ts`
→ *Disposition:* stop sending the browser UUID as Stripe metadata; stop the
webhook binding an account on it. Historical Stripe metadata already sent is a
**processor-side value that cannot be edited from here** — recorded as a tracked
processor item, never claimed as erased.

### Reference-only (no change of behaviour)
`src/integrations/supabase/types.ts` (generated),
`supabase/migrations/20260525170308_*.sql`,
`supabase/migrations/20260525173932_*.sql` (historical migrations, not rewritten),
`src/pages/app/Settings.tsx` (`anonymous_id` display only).

Built output (`dist/`) is not present in the working tree; it is regenerated
from source, so removing the source references removes them from the bundle.
This will be re-verified against a fresh build during implementation.
