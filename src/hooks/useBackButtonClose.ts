import { useEffect, useRef } from "react";

/**
 * While `open` is true, pushes a dummy history entry so that the Android /
 * browser back button closes the overlay instead of navigating away.
 */
export function useBackButtonClose(open: boolean, onClose: () => void) {
  const pushedRef = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const state = { __overlay: Date.now() };
    window.history.pushState(state, "");
    pushedRef.current = true;

    const handlePop = () => {
      pushedRef.current = false;
      closeRef.current();
    };
    window.addEventListener("popstate", handlePop);

    return () => {
      window.removeEventListener("popstate", handlePop);
      // Overlay closed by UI (not by back) — remove the dummy entry.
      if (pushedRef.current) {
        pushedRef.current = false;
        window.history.back();
      }
    };
  }, [open]);
}
