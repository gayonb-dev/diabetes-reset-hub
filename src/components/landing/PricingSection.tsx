import { Check, Lock, MessageCircle, Zap, Clock, UtensilsCrossed, Activity, Bell, Target, Gift, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingSectionProps {
  onOpenPayment: () => void;
}

const PricingSection = ({ onOpenPayment }: PricingSectionProps) => {
  const features = [
    { text: "Daily 10-min action steps for 5 days" },
    { text: "Diabetic-friendly plate guide" },
    { text: "Safe, joint-friendly movement plan" },
    { text: "Daily accountability nudges" },
    { text: "Quick Wins Tracker worksheet" },
    { text: "BONUS: 2-Day Meal Plan included free" },
  ];

  const trustBadges = [
    { icon: Lock, text: "Secure Checkout" },
    { icon: MessageCircle, text: "24/7 Support" },
    { icon: Zap, text: "Instant Access" },
  ];

  return (
    <section id="pricing" className="bg-gradient-to-b from-primary/5 to-background py-10">
      <div className="container mx-auto px-4">
        <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-gray-900 mb-2">
          Start Today — Lock In Your Spot
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Join 156+ people who've already transformed their health
        </p>

        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-3xl border-4 border-primary shadow-2xl relative mt-6">
            {/* Most Popular Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="bg-secondary text-secondary-foreground px-5 py-1.5 rounded-full text-sm font-bold shadow-md">
                Most Popular
              </span>
            </div>

            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary-dark p-6 pt-8 text-center text-primary-foreground">
              <h3 className="font-heading font-bold text-2xl mb-1">
                5-Day Diabetes Reset Challenge
              </h3>
              <p className="opacity-90">Everything you need to start seeing results</p>
            </div>

            {/* Price */}
            <div className="p-8 text-center">
              <div className="mb-1">
                <span className="text-2xl text-gray-400 line-through">$47</span>
                <span className="ml-2 text-sm font-semibold text-primary bg-primary/10 px-2 py-1 rounded">SAVE 43%</span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-6xl font-bold text-primary">$27</span>
              </div>
              <p className="text-gray-600">one-time payment</p>
              <p className="text-sm text-primary font-medium mt-2 flex items-center justify-center gap-1">
                <Gift className="h-4 w-4" />
                This $27 is credited toward the 6-Week Reset
              </p>
            </div>

            {/* Features */}
            <div className="px-8 pb-6">
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <span className={`text-gray-700 ${index === features.length - 1 ? "font-semibold text-primary" : ""}`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="px-8 pb-4">
              <Button
                onClick={onOpenPayment}
                className="w-full bg-primary hover:bg-primary-dark text-primary-foreground py-6 text-xl font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg h-auto"
              >
                Start My 5-Day Reset — $27
              </Button>
            </div>

            {/* Guarantee */}
            <div className="px-8 pb-4">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Shield className="h-4 w-4 text-primary" />
                <span>30-day money-back guarantee — zero risk</span>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="px-8 pb-8">
              <div className="grid grid-cols-3 gap-4">
                {trustBadges.map((badge, index) => {
                  const Icon = badge.icon;
                  return (
                    <div key={index} className="text-center">
                      <Icon className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">{badge.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
