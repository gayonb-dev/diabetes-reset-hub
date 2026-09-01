import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";
import { useCheckout } from "./CheckoutContext";

const INCLUDED = [
  "One guided daily action",
  "Meal planning, recipes, and meal swaps",
  "Shopping-list tools",
  "Water, meal, movement, mindset, and progress logging",
  "Blood sugar, A1C, weight, and measurement records",
  "Educational guides",
  "Ask VITA and published educational answers",
  "Optional member-community participation",
  "Printable progress reports",
  "Guided workouts as they unlock from Day 29",
  "In-app support",
  "Cancellation through Settings or Billing",
];

const PricingSection = () => {
  const { openCheckout } = useCheckout();

  return (
    <section id="pricing" className="scroll-mt-24 bg-gradient-to-b from-primary/5 to-background py-12">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <p className="text-sm font-semibold tracking-widest uppercase text-primary text-center mb-2">
            Simple membership pricing
          </p>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-8">
            Start with 14 days for $27.
          </h2>
        </ScrollReveal>

        <ScrollReveal>
          <div className="max-w-md mx-auto">
            <div className="bg-card rounded-xl border-2 border-primary shadow-xl overflow-hidden">
              <div className="p-8 text-center border-b border-border">
                <p className="text-5xl font-heading font-bold text-primary tabular-nums">
                  $27 charged today
                </p>
                <p className="text-muted-foreground mt-3 tabular-nums">
                  That works out to approximately $1.93 per day for the initial 14-day period.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Equivalent daily cost only. You are billed once at $27.
                </p>
              </div>

              <div className="px-8 py-6 border-b border-border text-center">
                <p className="text-foreground font-medium tabular-nums">
                  Then $67/month until canceled
                </p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  The $67 monthly membership begins after your first 14 days unless you cancel
                  beforehand.
                </p>
              </div>

              <div className="px-8 py-6">
                <p className="font-heading font-semibold text-foreground mb-4">
                  Your membership includes:
                </p>
                <ul className="space-y-3">
                  {INCLUDED.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 text-primary-foreground" aria-hidden="true" />
                      </span>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-8 pb-8">
                <Button
                  onClick={openCheckout}
                  className="w-full min-h-[44px] bg-primary hover:bg-primary-dark text-primary-foreground py-5 text-lg font-bold rounded-xl h-auto shadow-lg"
                >
                  Continue to secure checkout — $27 today
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  You will be charged $27 today. Your membership renews at $67/month after 14 days
                  unless you cancel.
                </p>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Each charge has a 30-day refund-request window.{" "}
                  <Link to="/refunds" className="underline underline-offset-4">
                    Refund Terms
                  </Link>{" "}
                  apply.
                </p>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Access begins after payment is confirmed.
                </p>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already a member?{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Log in here
              </Link>
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default PricingSection;
