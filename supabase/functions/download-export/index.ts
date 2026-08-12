// P3: one-time export download.
//
// The link is single-use and lives at most five minutes. Consumption is atomic,
// so two simultaneous uses of the same link yield exactly one success.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsFor, preflight } from "../_shared/cors.ts";
import { sha256Hex } from "../_shared/session.ts";

function fromHex(hex: string): Uint8Array {
  const h = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}

const SECURITY_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const cors = corsFor(req);
  const fail = (code: string, status: number) =>
    new Response(JSON.stringify({ error: code }), {
      status,
      headers: { ...cors, ...SECURITY_HEADERS, "Content-Type": "application/json" },
    });

  if (req.method !== "GET") return fail("method_not_allowed", 405);

  const token = new URL(req.url).searchParams.get("t") ?? "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return fail("invalid_link", 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const hash = await sha256Hex(token);
  const { data, error } = await admin.rpc("consume_export_artifact", { p_token_hash: hash });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return fail("link_expired_or_already_used", 410);

  const { data: art } = await admin
    .from("export_artifacts").select("content, format, user_id").eq("id", row.id).single();
  if (!art) return fail("link_expired_or_already_used", 410);

  const bytes = fromHex(art.content as string);
  const isZip = art.format === "zip";

  // The artifact is destroyed immediately after it is served once.
  await admin.from("export_artifacts").delete().eq("id", row.id);

  return new Response(bytes, {
    status: 200,
    headers: {
      ...cors,
      ...SECURITY_HEADERS,
      "Content-Type": isZip ? "application/zip" : "application/json",
      "Content-Disposition":
        `attachment; filename="drm-export-${art.user_id}.${isZip ? "zip" : "json"}"`,
      "Content-Length": String(bytes.length),
    },
  });
});
