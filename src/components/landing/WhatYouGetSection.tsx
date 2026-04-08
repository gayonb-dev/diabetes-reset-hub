import { Clock, UtensilsCrossed, Activity, Bell, Target, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";

const scrollToPricing = () => {
  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
};

const WhatYouGetSection = () => {
  const benefits = [
    { icon: Clock, title: "Daily 10-Min Actions", description: "Simple, guided steps that fit into any schedule — no overwhelm" },
    { icon: UtensilsCrossed, title: "Diabetic-Friendly Plate Guide", description: "Know exactly what to eat to stabilize blood sugar" },
    { icon: Activity, title: "Safe Movement Plan", description: "Joint-friendly exercises designed for real bodies" },
    { icon: Bell, title: "Accountability Nudges", description: "Daily check-ins that keep you on track without nagging" },
    { icon: Target, title: "Quick Wins Tracker", description: "See your progress and build momentum day by day" },
    { icon: Gift, title: "BONUS: 2-Day Meal Plan", description: "A complete meal plan with recipes and grocery list — free with your challenge" },
  ];

  return (
    <section className="bg-background py-10">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-2">
            Everything Inside the 5-Day Reset
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            All of this for just $27 — less than a single doctor's copay
          </p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            const isBonus = index === benefits.length - 1;
            return (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div
                  className={`rounded-xl p-5 transition-all hover:shadow-md h-full ${
                    isBonus 
                      ? "bg-gradient-to-br from-secondary/30 to-secondary/10 border-2 border-secondary" 
                      : "bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20 hover:border-primary"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${isBonus ? "bg-secondary" : "bg-primary"}`}>
                      <Icon className={`h-5 w-5 ${isBonus ? "text-secondary-foreground" : "text-primary-foreground"}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">
                        {isBonus && "🎁 "}{benefit.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal>
          <div className="text-center">
            <Button
              onClick={scrollToPricing}
              className="bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-5 text-lg font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg h-auto"
            >
              Get All of This for $27
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default WhatYouGetSection;
