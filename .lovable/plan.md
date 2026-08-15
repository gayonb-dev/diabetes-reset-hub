# Stage 0 closeout — finish publication, then read-only live confirmation

No code changes unless a check fails.

## 1. Finish the in-flight publication
Publish the current project state (Stage 0 chat-agent copy, safe CTA client change, corrected `llms.txt` / LLM info page), then wait for the deploy to complete before any live check.

## 2. Read-only live confirmation on https://diabetesresetmethod.com

| # | Check | Evidence to capture |
|---|---|---|
| 1 | Apex domain serves the new client bundle | Fetch the apex HTML, record the hashed JS bundle name, and confirm the served bundle contains the corrected CTA/allow-list code and no "7-Day Reset" / reversal strings |
| 2 | Full three-turn transcript | Drive the live widget with Playwright: "What is this program all about and how do I sign up?" → "yes" → "yes how?" — capture each reply verbatim |
| 3 | Concise replies, CTA renders | Confirm each reply is short, no sales loop, and the final turn renders a visible "View membership and pricing" button (screenshot) |
| 4 | CTA destination | Click it and confirm it lands on `https://diabetesresetmethod.com/#pricing` and scrolls to the pricing section |
| 5 | Plain-text fallback visible | Confirm the literal `https://diabetesresetmethod.com/#pricing` text is displayed under the button |
| 6 | No external model call | Inspect `chat-agent` logs and AI gateway request logs for the labelled session window; confirm zero gateway requests for the deterministic About/affirmative/signup answers |

The synthetic session is labelled with a unique recognisable marker so every derived row can be located by exact ID.

## 3. Delete the synthetic session and prove zero residue
Delete the labelled session and all derived rows (visitor session, visitor profile, conversation, messages, activity events, rate-limit rows) by exact ID, then re-query each table for that ID and the label and confirm zero rows remain.

## 4. Report
Per-item PASS / FAIL / NOT TESTED with the captured evidence, plus a residue-zero confirmation. If any item fails, stop, report the failure and the proposed minimal fix, and make no change until approved.
