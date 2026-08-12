// P1: retired endpoint.
//
// This endpoint used to accept a browser-supplied `anonymous_id` as
// authorization and purge records for it. That is an authorization bypass and
// the identifier itself is retired. The endpoint now returns 410 Gone and
// never reads a request body.
//
// Replacements:
//   - anonymous chat: `visitor-session` action "delete_chat" (active session required)
//   - member account: `request-account-deletion` (verified JWT + reauth ticket)

import { corsFor, preflight } from "../_shared/cors.ts";

Deno.serve((req) => {
  const pre = preflight(req);
  if (pre) return pre;

  return new Response(
    JSON.stringify({
      error: "gone",
      message:
        "This endpoint is retired. Use the Delete this chat action for an active chat session, or account deletion from Settings for a signed-in member.",
      replacements: ["visitor-session#delete_chat", "request-account-deletion"],
    }),
    {
      status: 410,
      headers: { ...corsFor(req), "Content-Type": "application/json" },
    },
  );
});
