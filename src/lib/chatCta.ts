/**
 * Public-chat call-to-action safety.
 *
 * The public VITA widget renders links ONLY from this fixed allow-list, and
 * only from the structured `cta` object the server attaches. Model-generated
 * text is never turned into a link: this is deliberately not a general
 * link-rendering capability for untrusted output.
 */
export const APPROVED_CHAT_PATHS = ["/#pricing", "/login", "/refunds", "/privacy"] as const;

export type ApprovedChatPath = (typeof APPROVED_CHAT_PATHS)[number];

export type ChatCta = {
  type: "link";
  label: string;
  path: string;
  href?: string;
} | null;

export function isApprovedChatPath(path: unknown): path is ApprovedChatPath {
  return typeof path === "string" && (APPROVED_CHAT_PATHS as readonly string[]).includes(path);
}

/** Returns a renderable CTA, or null when the server payload is not approved. */
export function safeCta(cta: unknown): { label: string; path: ApprovedChatPath } | null {
  if (!cta || typeof cta !== "object") return null;
  const c = cta as Record<string, unknown>;
  if (c.type !== "link") return null;
  if (typeof c.label !== "string" || !c.label.trim()) return null;
  if (!isApprovedChatPath(c.path)) return null;
  return { label: c.label, path: c.path };
}
