// P1: legacy identifier retirement.
//
// `drm_visitor_id` and `drm_landing_chat_consent` are retired. Nothing reads or
// writes them any more, and this module actively clears them from browser
// storage on every app load so a stale value cannot be replayed.

export const RETIRED_STORAGE_KEYS = [
  "drm_visitor_id",
  "drm_landing_chat_consent",
] as const;

export function purgeLegacyStorage(): string[] {
  if (typeof window === "undefined") return [];
  const cleared: string[] = [];
  for (const key of RETIRED_STORAGE_KEYS) {
    try {
      if (window.localStorage.getItem(key) !== null) {
        window.localStorage.removeItem(key);
        cleared.push(key);
      }
      if (window.sessionStorage.getItem(key) !== null) {
        window.sessionStorage.removeItem(key);
        if (!cleared.includes(key)) cleared.push(key);
      }
    } catch {
      // storage unavailable (private mode / blocked) — nothing to clear
    }
  }
  return cleared;
}
