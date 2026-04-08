import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";

interface FinalCTASectionProps {
  onOpenPayment: () => void;
}

const FinalCTASection = ({ onOpenPayment }: FinalCTASectionProps) => {
  return (
    <section className="relative bg-gradient-to-r from-primary via-primary-dark to-primary py-12 overflow-hidden">
      {/* Decorative Blur Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-foreground/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="container mx-auto px-4 text-center relative z-10">
        <ScrollReveal>
          <p className="text-sm font-semibold tracking-widest uppercase text-primary-foreground/70 mb-3">The Diabetes Reset Method</p>
          <h2 className="font-heading font-bold text-4xl sm:text-5xl text-primary-foreground mb-4">
            This is your moment.
          </h2>
          <p className="font-heading text-2xl sm:text-3xl text-primary-foreground/90 mb-3">
            Reverse Diabetes. Reclaim Your Life.
          </p>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
            In just 5 days, you'll have the clarity, momentum, and results to prove that change is possible — for only $27.
          </p>

          <Button
            onClick={onOpenPayment}
            className="bg-background text-primary hover:bg-background/90 px-8 py-6 text-xl font-bold rounded-xl transition-all transform hover:scale-105 shadow-2xl h-auto mb-4"
          >
            Start My 5-Day Reset — $27
          </Button>

          <div className="flex items-center justify-center gap-2 text-primary-foreground/80 text-sm mb-8">
            <Shield className="h-4 w-4" />
            <span>30-day money-back guarantee — if it doesn't work, you pay nothing</span>
          </div>

          <p className="text-primary-foreground/70 text-sm italic max-w-2xl mx-auto">
            Educational coaching only. We do not diagnose or treat disease. Always consult with your healthcare provider before making changes to your diabetes management plan.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default FinalCTASection;
