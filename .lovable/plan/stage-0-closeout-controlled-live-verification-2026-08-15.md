# Stage 0 closeout — controlled live verification

Scope: controlled live verification. The only permitted writes are (a) publishing the already-approved Stage 0 client, (b) creating one synthetic anonymous chat session and its normal derived chat rows, and (c) deleting those exact test records. No code changes unless a check fails.

## 1. Finish the in-flight publication
Publish the current project state (Stage 0 chat-agent copy, safe CTA client change, corrected `llms.txt` / LLM info page), then wait for the deploy to complete before any live check.

## 2. Live confirmation on https://diabetesresetmethod.com

| # | Check | Evidence to capture |
|---|---|---|
| 1 | Apex domain serves the new client bundle | Fetch the apex HTML, record the hashed JS bundle name, and scan the served bundle: reject "7-Day Reset", "7-Day Reset Sprint" and positive reversal-benefit claims; explicitly allow the approved negative disclaimer "does not diagnose, treat or promise to reverse diabetes." |
| 2 | Full three-turn transcript | Drive the live widget with Playwright using the exact turns, with no label inserted into any message: "What is this program all about and how do I sign up?" → "yes" → "yes how?" — capture each reply verbatim |
| 3 | Concise replies, CTA renders | Confirm each reply is short, no sales loop, and the final turn renders a visible "View membership and pricing" button (screenshot) |
| 4 | CTA destination | Click it and confirm it lands on `https://diabetesresetmethod.com/#pricing` and scrolls to the pricing section |
| 5 | Plain-text fallback visible | Confirm the literal `https://diabetesresetmethod.com/#pricing` text is displayed under the button |
| 6 | No external model call | Inspect `chat-agent` logs and AI gateway request logs for the narrow UTC test window; confirm zero gateway requests for the deterministic About/affirmative/signup answers |

Identification: record the generated session ID, visitor-profile ID, conversation ID and the narrow UTC start/end of the test window. No marker text is written into any message.

## 3. Delete the test records and prove zero residue
Delete only rows proven to belong exclusively to the recorded IDs (visitor session, visitor profile, conversation, messages, and activity events keyed to those IDs), then re-query each table for those IDs and confirm zero rows remain.

Rate-limit counters are not deleted: shared or IP-partitioned buckets stay and expire through their normal TTL. They are reported as security metadata, not chat residue.

## 4. Report
Per-item PASS / FAIL / NOT TESTED with the captured evidence, plus a residue-zero confirmation. No session tokens, raw IP values, secret values or private message data appear in the report. If every check passes, Stage 0 is closed with no further implementation plan. If any item fails, stop, report the failure and the proposed minimal fix, and make no change until approved.
