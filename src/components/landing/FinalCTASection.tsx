import { Button } from "@/components/ui/button";

interface FinalCTASectionProps {
  onOpenPayment: () => void;
  onOpenEmail: () => void;
}

const FinalCTASection = ({ onOpenPayment, onOpenEmail }: FinalCTASectionProps) => {
  return (
    <section className="relative bg-gradient-to-r from-primary via-primary-dark to-primary py-20 overflow-hidden">
      {/* Decorative Blur Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="container mx-auto px-4 text-center relative z-10">
        <h2 className="font-heading font-bold text-4xl sm:text-5xl text-primary-foreground mb-4">
          This is your moment.
        </h2>
        <p className="font-heading text-3xl sm:text-4xl text-primary-foreground/90 mb-8">
          Reverse Diabetes. Reclaim Your Life.
        </p>

        <Button
          onClick={onOpenPayment}
          className="bg-background text-primary hover:bg-background/90 px-8 py-6 text-xl font-bold rounded-xl transition-all transform hover:scale-105 shadow-2xl h-auto mb-6"
        >
          Start My 5-Day Reset — $27
        </Button>

        <div className="mb-8">
          <button
            onClick={onOpenEmail}
            className="text-primary-foreground hover:text-secondary underline transition-colors"
          >
            Or get the Free 2-Day Meal Plan
          </button>
        </div>

        <p className="text-primary-foreground/80 text-sm italic max-w-2xl mx-auto">
          Educational coaching only. We do not diagnose or treat disease. Always consult with your healthcare provider before making changes to your diabetes management plan.
        </p>
      </div>
    </section>
  );
};

export default FinalCTASection;
