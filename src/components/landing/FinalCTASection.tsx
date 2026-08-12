import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";

interface FinalCTASectionProps {
  onOpenPayment: () => void;
}

const FinalCTASection = ({ onOpenPayment }: FinalCTASectionProps) => {
  return (
    <section className="relative bg-gradient-to-r from-primary via-primary-dark to-primary py-14 overflow-hidden">
      <div className="container mx-auto px-4 text-center relative z-10">
        <ScrollReveal>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-primary-foreground mb-4">
            Ready for a simpler next step?
          </h2>
          <p className="text-primary-foreground/90 text-lg mb-8 max-w-xl mx-auto">
            Start with 14 days of guided actions and practical tools. Decide whether the membership
            fits your routine.
          </p>

          <Button
            onClick={onOpenPayment}
            className="min-h-[44px] bg-background text-primary hover:bg-background/90 px-8 py-5 text-lg font-bold rounded-xl h-auto shadow-2xl mb-5"
          >
            Start 14 days for $27
          </Button>

          <p className="text-primary-foreground font-medium">
            $27 today. Then $67/month until canceled. Cancel in the app.
          </p>
          <p className="text-primary-foreground/80 text-sm mt-2">
            Educational support—not medical care or emergency help.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default FinalCTASection;
