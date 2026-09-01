import { Button } from "@/components/ui/button";
import { useCheckout } from "./CheckoutContext";

/**
 * Mobile-only purchase CTA. Prompt 4 §15 requires exactly one fixed-bottom
 * layer on mobile: `body.drm-chat-open` (set by ChatWidget) hides this bar
 * while the chat panel is open. See src/index.css.
 */
const StickyBottomCTA = () => {
  const { openCheckout } = useCheckout();
  return (
    <div className="sticky-bottom-cta fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden shadow-lg z-40">
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
