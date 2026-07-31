import { useEffect } from "react";

/**
 * Tracks the mobile soft keyboard via window.visualViewport.
 *
 * - Adds `keyboard-open` to <body> while the keyboard covers >120px of the
 *   layout viewport, so fixed chrome (bottom nav) can hide itself.
 * - Publishes the keyboard height as `--kb-inset` for sticky submit bars.
 * - Scrolls the focused field into view once the viewport settles, so inputs
 *   near the bottom of long forms aren't hidden behind the keyboard.
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

        if (inset > 120) {
          const el = document.activeElement as HTMLElement | null;
          if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }
      });
    };

    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    window.addEventListener("focusin", apply);
    apply();

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      window.removeEventListener("focusin", apply);
      document.body.classList.remove("keyboard-open");
      document.documentElement.style.removeProperty("--kb-inset");
    };
  }, []);
}
