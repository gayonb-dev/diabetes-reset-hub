import { useEffect } from "react";

/**
 * Tracks the mobile soft keyboard via window.visualViewport.
 *
 * - Adds `keyboard-open` to <body> while the keyboard covers >120px of the
 *   layout viewport, so fixed chrome (bottom nav) can hide itself.
 * - Publishes the keyboard height as `--kb-inset` for sticky submit bars.
 * - Scrolls a newly focused field into view exactly once, on focusin — never
 *   from the resize/scroll handler, so it cannot re-run while typing.
 *
 * Deliberately does nothing else: no preventDefault, no scroll locking, no
 * history/popstate/overlay behaviour.
 */
export function useVisualViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;

    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        document.documentElement.style.setProperty("--kb-inset", `${Math.round(inset)}px`);
        document.body.classList.toggle("keyboard-open", inset > 120);
      });
    };

    // One-shot: bring the just-focused field into view after the keyboard settles.
    let focusTimer: number | undefined;
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        if (document.activeElement === el) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }, 300);
    };

    vv.addEventListener("resize", apply);
    window.addEventListener("focusin", onFocusIn);
    apply();

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(focusTimer);
      vv.removeEventListener("resize", apply);
      window.removeEventListener("focusin", onFocusIn);
      document.body.classList.remove("keyboard-open");
      document.documentElement.style.removeProperty("--kb-inset");
    };
  }, []);
}
