// Route -> surface mapping for the member app.
//
// Authentication and entitlement are separate decisions. This module answers
// only the second half of the second one: "which surface does this path belong
// to?". Whether that surface is reachable is decided exclusively by the shared
// evaluator's `allowed_surfaces` — no component re-derives a status list.

import type { Surface } from "@/lib/membership";

/** Longest-prefix wins, so `/app/settings/billing` is billing, not settings. */
const ROUTE_SURFACES: Array<{ prefix: string; surface: Surface }> = [
  { prefix: "/app/settings/billing", surface: "billing" },
  { prefix: "/app/billing", surface: "billing" },
  { prefix: "/app/settings", surface: "settings" },
  { prefix: "/app/support", surface: "support" },
  { prefix: "/app/profile", surface: "profile" },
];

export function surfaceForPath(pathname: string): Surface {
  const path = pathname.replace(/\/+$/, "") || pathname;
  let best: { prefix: string; surface: Surface } | null = null;
  for (const entry of ROUTE_SURFACES) {
    if (path === entry.prefix || path.startsWith(`${entry.prefix}/`)) {
      if (!best || entry.prefix.length > best.prefix.length) best = entry;
    }
  }
  // Everything else in the member app is paid programme content.
  return best?.surface ?? "programme";
}

/** Where a member is sent when the surface they asked for is unavailable. */
export function recoveryPathFor(allowedSurfaces: readonly Surface[]): string {
  if (allowedSurfaces.includes("billing")) return "/app/billing";
  if (allowedSurfaces.includes("settings")) return "/app/settings";
  if (allowedSurfaces.includes("support")) return "/app/support";
  return "/app/settings";
}
