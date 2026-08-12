import { Check, Lock, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";

interface PricingSectionProps {
  onOpenPayment: () => void;
}

const INCLUDED = [
  "Guided Today actions",
  "Meal-planning tools and recipes",
  "Movement and habit tools",
  "Progress tracking",
  "Ask/VITA educational support",
  "Community features",
  "Printable healthcare-visit report",
];

const TRUST_BADGES = [
  { icon: Lock, text: "Secure checkout" },
  { icon: Zap, text: "Instant access" },
  { icon: Shield, text: "Cancel in the app" },
];

const PricingSection = ({ onOpenPayment }: PricingSectionProps) => {
  return (
    <section id="pricing" className="bg-gradient-to-b from-primary/5 to-background py-12">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <p className="text-sm font-semibold tracking-widest uppercase text-primary text-center mb-2">
            Simple membership pricing
          </p>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-8">
            Start with 14 days for $27
          </h2>
        </ScrollReveal>

        <ScrollReveal>
          <div className="max-w-md mx-auto">
            <div className="bg-card rounded-xl border-2 border-primary shadow-xl overflow-hidden">
              <div className="p-8 text-center border-b border-border">
                <p className="text-5xl font-heading font-bold text-primary tabular-nums">
                  $27 charged today
                </p>
                <p className="text-muted-foreground mt-2">Your first 14 days</p>
                <p className="text-foreground font-medium mt-1 tabular-nums">
                  Then $67/month until canceled
                </p>
              </div>

              <div className="px-8 py-6 border-b border-border">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your membership renews automatically at $67 per month after day 14 unless you
                  cancel. Cancel inside the app at any time. When you cancel, access continues
                  through the period you already paid for.
                </p>
              </div>

              <div className="px-8 py-6">
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

              <div className="px-8 pb-4">
                <Button
                  onClick={onOpenPayment}
                  className="w-full min-h-[44px] bg-primary hover:bg-primary-dark text-primary-foreground py-5 text-lg font-bold rounded-xl h-auto shadow-lg"
                >
                  Start 14 days for $27
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Secure payment processing by Stripe. Full renewal terms appear before payment.
                </p>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  30-day refund guarantee on each charge. Request it within 30 days under the{" "}
                  <Link to="/refunds" className="underline underline-offset-4">
                    Refund Terms
                  </Link>
                  .
                </p>
              </div>

              <div className="px-8 pb-8 pt-2">
                <div className="grid grid-cols-3 gap-4">
                  {TRUST_BADGES.map(({ icon: Icon, text }) => (
                    <div key={text} className="text-center">
                      <Icon className="h-5 w-5 text-muted-foreground mx-auto mb-1" aria-hidden="true" />
                      <p className="text-xs text-muted-foreground">{text}</p>
                    </div>
                  ))}
                </div>
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
