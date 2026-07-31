import { useEffect, useState } from "react";

export interface ClockSkew {
  /** Milliseconds the device clock is ahead (+) or behind (-) server time. */
  skewMs: number | null;
  /** True once a successful measurement completed. */
  checked: boolean;
}

let loggedOnce = false;

/**
 * Measures the device clock against Supabase server time by reading the `Date`
 * response header. A wrong device clock silently invalidates auth tokens, which
 * surfaces to members as an unexplainable "it won't let me log in".
 *
 * The request must never be served from cache — a stale `Date` header would
 * produce a false positive — so it uses `cache: 'no-store'` plus a cache-busting
 * query param. Any failure (network error, non-2xx, missing header) is treated
 * as "unknown" and shows nothing.
 */
export function useClockSkew(): ClockSkew {
  const [state, setState] = useState<ClockSkew>({ skewMs: null, checked: false });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const base = import.meta.env.VITE_SUPABASE_URL;
      if (!base) return;
      try {
        const url = `${base}/auth/v1/health?_=${Date.now()}`;
        const res = await fetch(url, { method: "HEAD", cache: "no-store" });
        if (!res.ok) return; // non-2xx → treat as failed check, no banner
        const deviceTime = Date.now();
        const header = res.headers.get("Date");
        if (!header) return;
        const serverTime = new Date(header).getTime();
        if (!Number.isFinite(serverTime)) return;

        const skewMs = deviceTime - serverTime;
        if (!loggedOnce) {
          loggedOnce = true;
          console.warn("[clock] skew", {
            skewMs,
            serverTime: new Date(serverTime).toISOString(),
            deviceTime: new Date(deviceTime).toISOString(),
          });
        }
        if (!cancelled) setState({ skewMs, checked: true });
      } catch {
        // Failed request → no banner.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
