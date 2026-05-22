import { Check, Lock, MessageCircle, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";

interface PricingSectionProps {
  onOpenPayment: () => void;
}

const PricingSection = ({ onOpenPayment }: PricingSectionProps) => {
  const features = [
    { text: "7-Day Reset Sprint (daily 10-min actions)" },
    { text: "Full recipe & plate-method library" },
    { text: "Safe, joint-friendly movement plans" },
    { text: "Coach Q&A — ask anything, get answers" },
    { text: "Optional WhatsApp accountability broadcasts (opt-in)" },
    { text: "Priority access to 1-on-1 coaching (coming soon)" },
  ];

  const trustBadges = [
    { icon: Lock, text: "Secure Checkout" },
    { icon: MessageCircle, text: "Email Support" },
    { icon: Zap, text: "Instant Access" },
  ];

  return (
    <section id="pricing" className="bg-gradient-to-b from-primary/5 to-background py-10">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-2">
            Start Your Reset Today
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            One simple price. Full access. Cancel anytime.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <div className="max-w-md mx-auto">
            <div className="bg-card rounded-3xl border-4 border-primary shadow-2xl relative mt-6">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-secondary text-secondary-foreground px-5 py-1.5 rounded-full text-sm font-bold shadow-md">
                  Most Popular
                </span>
              </div>

              <div className="bg-gradient-to-r from-primary to-primary-dark p-6 pt-8 text-center text-primary-foreground rounded-t-[1.25rem]">
                <h3 className="font-heading font-bold text-2xl mb-1">
                  Diabetes Reset Method Membership
                </h3>
                <p className="opacity-90">Everything you need, for as long as you need it.</p>
              </div>

              <div className="p-8 text-center">
                <div className="flex items-baseline justify-center gap-2 mb-1">
                  <span className="text-6xl font-bold text-primary">$27</span>
                  <span className="text-lg text-muted-foreground">today</span>
                </div>
                <p className="text-muted-foreground">
                  Then <strong className="text-foreground">$67/month</strong> after{" "}
                  <strong className="text-foreground">14 days of full access</strong>
                </p>
                <p className="text-sm text-primary font-medium mt-3">
                  Cancel during your 14 days and keep your $27 program — no further charges.
                </p>
              </div>

              <div className="px-8 pb-6">
                <ul className="space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                      <span className="text-muted-foreground">{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-8 pb-4">
                <Button
                  onClick={onOpenPayment}
                  className="w-full bg-primary hover:bg-primary-dark text-primary-foreground py-6 text-xl font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg h-auto"
                >
                  Start My Reset — $27
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Secure checkout via Stripe • Opens in a new tab
                </p>
              </div>

              <div className="px-8 pb-4">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>30-day money-back guarantee on every charge</span>
                </div>
              </div>

              <div className="px-8 pb-8">
                <div className="grid grid-cols-3 gap-4">
                  {trustBadges.map((badge, index) => {
                    const Icon = badge.icon;
                    return (
                      <div key={index} className="text-center">
                        <Icon className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">{badge.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already a member?{" "}
              <a href="/login" className="text-primary font-semibold hover:underline">
                Log in here
              </a>
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default PricingSection;
