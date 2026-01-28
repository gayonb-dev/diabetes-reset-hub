import { Button } from "@/components/ui/button";

const scrollToPricing = () => {
  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
};

const StickyBottomCTA = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-gray-200 p-4 md:hidden shadow-lg z-40">
      <Button
        onClick={scrollToPricing}
        className="w-full bg-primary hover:bg-primary-dark text-primary-foreground font-bold py-4 px-6 rounded-lg text-center transition-colors h-auto"
      >
        Start My 5-Day Reset — $27
      </Button>
    </div>
  );
};

export default StickyBottomCTA;
