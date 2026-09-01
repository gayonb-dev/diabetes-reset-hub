import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";
import { useCheckout } from "./CheckoutContext";

const FinalCTASection = () => {
  const { openCheckout } = useCheckout();

  return (
    <section className="relative bg-gradient-to-r from-primary via-primary-dark to-primary py-14 overflow-hidden">
      <div className="container mx-auto px-4 text-center relative z-10">
        <ScrollReveal>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-primary-foreground mb-4">
            Stop carrying the whole diabetes to-do list in your head.
          </h2>
          <div className="text-primary-foreground/90 text-lg mb-8 max-w-xl mx-auto space-y-3">
            <p>Tomorrow will still bring meals, readings, questions, movement, and decisions.</p>
            <p>
              You can face them as another scattered list, or open DRM and see one clear place to
              begin.
            </p>
            <p>
              Start with a guided daily action and practical tools you can use between healthcare
              visits.
            </p>
          </div>

          <Button
            onClick={openCheckout}
            className="min-h-[44px] bg-background text-primary hover:bg-background/90 px-8 py-5 text-lg font-bold rounded-xl h-auto shadow-2xl mb-5"
          >
            Start my 14 days, $27
          </Button>

          <p className="text-primary-foreground font-medium">
            $27 charged today for your first 14 days. Then $67/month until canceled.
          </p>
          <p className="text-primary-foreground/80 text-sm mt-2">
            Each charge has a 30-day refund-request window.{" "}
            <Link to="/refunds" className="underline underline-offset-4">
              Refund Terms
            </Link>{" "}
            apply.
          </p>
          <p className="text-primary-foreground/80 text-sm mt-2">
            Self-guided education, not diagnosis, treatment, prescriptions, or emergency care.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default FinalCTASection;
