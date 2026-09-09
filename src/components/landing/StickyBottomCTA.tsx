import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCheckout } from "./CheckoutContext";

/**
 * Mobile-only purchase CTA. Prompt 4 §15 requires exactly one fixed-bottom
 * layer on mobile: `body.drm-chat-open` (set by ChatWidget) hides this bar
 * while the chat panel is open. See src/index.css.
 *
 * The bar also retracts once the final CTA or the footer is on screen, so it
 * never duplicates the visible CTA or covers footer and legal links.
 */
const StickyBottomCTA = () => {
  const { openCheckout } = useCheckout();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const targets = [
      document.getElementById("final-cta"),
      document.querySelector("footer"),
    ].filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const visible = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        setHidden(visible.size > 0);
      },
      { threshold: 0 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (hidden) return null;

  return (
    <div className="sticky-bottom-cta fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:hidden shadow-lg z-40">
      <Button
        onClick={openCheckout}
        className="w-full min-h-[44px] bg-primary hover:bg-primary-dark text-primary-foreground font-bold py-4 px-6 rounded-lg h-auto"
      >
        Start my 14 days, $27
      </Button>
      <p className="text-center text-[11px] text-muted-foreground mt-1.5">
        Then $67/month until canceled.
      </p>
    </div>
  );
};

export default StickyBottomCTA;
