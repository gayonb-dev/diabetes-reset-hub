import { Clock, UtensilsCrossed, Activity, Bell, Target, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const scrollToPricing = () => {
  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
};

const WhatYouGetSection = () => {
  const benefits = [
    { icon: Clock, text: "Daily 10-min actions" },
    { icon: UtensilsCrossed, text: "Diabetic-friendly plate guide" },
    { icon: Activity, text: "Safe, joint-friendly movements" },
    { icon: Bell, text: "Accountability nudges" },
    { icon: Target, text: "Quick Wins Tracker" },
  ];

  return (
    <section className="bg-background py-10">
      <div className="container mx-auto px-4">
        <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-gray-900 mb-8">
          What You'll Get in the 5-Day Reset
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20 hover:border-primary rounded-xl p-5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary p-2 rounded-lg flex-shrink-0">
                    <Check className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-medium text-gray-900">{benefit.text}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            onClick={scrollToPricing}
            className="bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-5 text-lg font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg h-auto"
          >
            Start My 5-Day Reset — $27
          </Button>
        </div>
      </div>
    </section>
  );
};

export default WhatYouGetSection;
