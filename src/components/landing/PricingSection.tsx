import { Check, Lock, MessageCircle, Zap, Clock, UtensilsCrossed, Activity, Bell, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingSectionProps {
  onOpenPayment: () => void;
  onOpenEmail: () => void;
}

const PricingSection = ({ onOpenPayment, onOpenEmail }: PricingSectionProps) => {
  const features = [
    { icon: Clock, text: "Daily 10-min actions" },
    { icon: UtensilsCrossed, text: "Diabetic-friendly plate guide" },
    { icon: Activity, text: "Safe, joint-friendly movements" },
    { icon: Bell, text: "Accountability nudges" },
    { icon: Target, text: "Quick Wins Tracker" },
    { icon: Check, text: "30-day money-back guarantee" },
  ];

  const trustBadges = [
    { icon: Lock, text: "Secure Checkout" },
    { icon: MessageCircle, text: "24/7 Support" },
    { icon: Zap, text: "Instant Access" },
  ];

  return (
    <section id="pricing" className="bg-gradient-to-b from-primary/5 to-background py-20">
      <div className="container mx-auto px-4">
        <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-gray-900 mb-12">
          Start Today — Lock In Your Spot
        </h2>

        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-3xl border-4 border-primary shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary-dark p-6 text-center text-primary-foreground">
              <h3 className="font-heading font-bold text-2xl mb-1">
                5-Day Diabetes Reset Challenge
              </h3>
              <p className="opacity-90">Quick wins in 5 days</p>
            </div>

            {/* Price */}
            <div className="p-8 text-center">
              <div className="mb-2">
                <span className="text-2xl text-gray-400 line-through">$47</span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-6xl font-bold text-primary">$27</span>
              </div>
              <p className="text-xl text-gray-600">USD</p>
              <p className="text-sm text-gray-600 mt-2">Credit applies to 6-Week Reset</p>
            </div>

            {/* Features */}
            <div className="px-8 pb-6">
              <ul className="space-y-4">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <li key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <span className="text-gray-700">{feature.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* CTA */}
            <div className="px-8 pb-8">
              <Button
                onClick={onOpenPayment}
                className="w-full bg-primary hover:bg-primary-dark text-primary-foreground py-6 text-xl font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg h-auto"
              >
                Start My 5-Day Reset — $27
              </Button>
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

            {/* Bottom Link */}
            <div className="border-t border-gray-200 p-6 text-center">
              <button
                onClick={onOpenEmail}
                className="text-primary hover:text-primary-dark underline text-sm transition-colors"
              >
                Not ready yet? Get the Free 2-Day Meal Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
