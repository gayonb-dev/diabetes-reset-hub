import { useEffect, useRef } from "react";

function currentLocationKey() {
  return window.location.pathname + window.location.search + window.location.hash;
}

/**
 * While `open` is true, pushes a dummy history entry so that the Android /
 * browser back button closes the overlay instead of navigating away.
 *
 * The dummy entry is only unwound on cleanup when no navigation happened while
 * the overlay was open. If a link inside the overlay navigated (React Router
 * pushes the new route before this cleanup runs), calling history.back() would
 * pop the *new* route and cancel the navigation, so we leave it alone.
 */
export function useBackButtonClose(open: boolean, onClose: () => void) {
  const pushedRef = useRef(false);
  const locationAtPushRef = useRef<string | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const state = { __overlay: Date.now() };
    locationAtPushRef.current = currentLocationKey();
    window.history.pushState(state, "");
    pushedRef.current = true;

    const handlePop = () => {
      pushedRef.current = false;
      locationAtPushRef.current = null;
      closeRef.current();
    };
    window.addEventListener("popstate", handlePop);

    return () => {
      window.removeEventListener("popstate", handlePop);
      if (!pushedRef.current) return;
      pushedRef.current = false;

      const recorded = locationAtPushRef.current;
      locationAtPushRef.current = null;

      // Navigation happened while the overlay was open, the dummy entry has
      // been superseded by the new route. Unwinding it would cancel the nav.
      if (recorded !== null && recorded !== currentLocationKey()) return;

      // Closed by UI (X, outside click, Escape) with no navigation, remove
      // the dummy entry so back-stack entries cannot accumulate.
      window.history.back();
    };
  }, [open]);
}
