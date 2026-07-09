import { Button } from "@/components/ui/button";

const scrollToPricing = () => {
  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
};

const StickyBottomCTA = () => {
  return (
    <div className="sticky-bottom-cta fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden shadow-lg z-40">
      <Button
        onClick={scrollToPricing}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-6 rounded-lg text-center transition-colors h-auto"
      >
        Start My Reset — $27 (14 days full access)
      </Button>
    </div>
  );
};

export default StickyBottomCTA;
