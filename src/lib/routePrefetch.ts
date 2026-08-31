/**
 * Batch 2 Part A — route chunk prefetching.
 *
 * Every authenticated destination maps to the same dynamic import the router
 * uses, so warming a chunk here means the router's later import resolves from
 * the module cache instead of the network. `prefetchRoute` remembers what it
 * has already started, so hover + focus + idle on the same link cannot produce
 * duplicate requests.
 *
 * Prefetching loads CODE only. It performs no data fetch and therefore cannot
 * bypass an authentication, billing or deletion access decision — those are
 * still evaluated by AuthGuard when the route actually renders.
 */

type Loader = () => Promise<unknown>;

const LOADERS: Record<string, Loader> = {
  "/app": () => import("@/pages/app/Dashboard"),
  "/app/today": () => import("@/pages/app/Dashboard"),
  "/app/meals": () => import("@/pages/app/Meals"),
  "/app/progress": () => import("@/pages/app/Progress"),
  "/app/workouts": () => import("@/pages/app/WorkoutLibrary"),
  "/app/learn": () => import("@/pages/app/Learn"),
  "/app/ask": () => import("@/pages/app/Ask"),
  "/app/profile": () => import("@/pages/app/Profile"),
  "/app/settings": () => import("@/pages/app/Settings"),
  "/app/billing": () => import("@/pages/app/Billing"),
  "/app/support": () => import("@/pages/app/Support"),
};

/** Routes warmed during browser idle time, in priority order. */
const IDLE_ROUTES = ["/app/meals", "/app/progress", "/app/workouts", "/app/learn", "/app/ask"];

const started = new Set<string>();

export function prefetchRoute(path: string): void {
  const loader = LOADERS[path];
  if (!loader || started.has(path)) return;
  started.add(path);
  // A prefetch failure must never surface to the member; the router will retry
  // the same import when they actually navigate.
  void loader().catch(() => started.delete(path));
}

/** Handlers to spread onto a nav link: hover and keyboard focus both warm it. */
export function prefetchHandlers(path: string) {
  const run = () => prefetchRoute(path);
  return { onMouseEnter: run, onFocus: run, onTouchStart: run };
}

/** Warm the common destinations once the browser is genuinely idle. */
export function prefetchOnIdle(): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const run = () => IDLE_ROUTES.forEach(prefetchRoute);
  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(run, { timeout: 4000 });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = window.setTimeout(run, 2500);
  return () => window.clearTimeout(t);
}

export const __PREFETCHABLE_ROUTES = Object.keys(LOADERS);
