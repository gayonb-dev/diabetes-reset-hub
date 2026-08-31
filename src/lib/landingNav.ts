/**
 * Landing-page anchor navigation — one shared implementation.
 *
 * Every in-page control (header nav, hero, product tour, footer) routes
 * through `goToSection` so behaviour is identical everywhere:
 *   - the URL hash is updated (so reload and back/forward reproduce the view)
 *   - scrolling honours `prefers-reduced-motion`
 *   - the sticky header never covers the destination heading (`scroll-mt-24`
 *     is applied to each landing section)
 *   - keyboard focus moves to the destination heading
 */

export const LANDING_SECTIONS = [
  "how-it-works",
  "inside-the-membership",
  "pricing",
  "faq",
] as const;

export type LandingSectionId = (typeof LANDING_SECTIONS)[number];

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Moves focus to the section (or its heading) without scrolling a second time. */
export function focusSection(id: string): boolean {
  const section = document.getElementById(id);
  if (!section) return false;
  const heading = section.querySelector<HTMLElement>("h1, h2, h3") ?? section;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  // The heading is only focusable programmatically, so it never needs the
  // default focus ring; the scroll position already shows where focus landed.
  heading.classList.add("outline-none");
  heading.focus({ preventScroll: true });
  return true;
}

/**
 * Scrolls to a landing section, updates the hash and focuses the heading.
 * Returns false when the destination does not exist, so callers can never
 * silently do nothing.
 */
export function goToSection(id: string, options: { updateHash?: boolean } = {}): boolean {
  const section = document.getElementById(id);
  if (!section) return false;

  section.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });

  if (options.updateHash !== false && typeof history !== "undefined") {
    const next = `${window.location.pathname}${window.location.search}#${id}`;
    if (window.location.hash !== `#${id}`) history.pushState(null, "", next);
  }

  focusSection(id);
  return true;
}

/** Handles direct hash entry / reload / back-forward navigation. */
export function syncSectionFromHash(): boolean {
  const id = window.location.hash.replace(/^#/, "");
  if (!id) return false;
  const section = document.getElementById(id);
  if (!section) return false;
  section.scrollIntoView({ behavior: "auto", block: "start" });
  focusSection(id);
  return true;
}
