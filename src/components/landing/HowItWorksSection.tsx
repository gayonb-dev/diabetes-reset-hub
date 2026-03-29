import { Zap, TrendingUp, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const scrollToPricing = () => {
  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
};

const HowItWorksSection = () => {
  const steps = [
    {
      icon: Zap,
      iconBg: "bg-primary",
      iconColor: "text-primary-foreground",
      number: "01",
      title: "5-Day Tiny Challenge",
      description: "Reset your habits with targeted food, movement, and mindset actions. See real wins fast.",
      price: "Only $27",
      priceNote: "Your $27 is credited toward the 6-Week Reset",
      highlight: true,
    },
    {
      icon: TrendingUp,
      iconBg: "bg-secondary",
      iconColor: "text-secondary-foreground",
      number: "02",
      title: "6-Week Reset",
      description: "Go deeper. Lose 10–30 lbs, lower blood sugar consistently, and regain lasting energy.",
    },
    {
      icon: Award,
      iconBg: "bg-secondary",
      iconColor: "text-secondary-foreground",
      number: "03",
      title: "12-Week Transformation",
      description: "Full metabolic reset. Heal gut & hormones for lasting diabetes reversal.",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-background to-primary/5 py-10">
      <div className="container mx-auto px-4">
        <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-gray-900 mb-2">
          Your Path to Reversal
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Start small, build momentum, transform your health
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className={`bg-card rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6 relative ${
                  step.highlight ? "border-2 border-primary ring-2 ring-primary/20" : ""
                }`}
              >
                {step.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
                      START HERE
                    </span>
                  </div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div className={`${step.iconBg} p-3 rounded-full`}>
                    <Icon className={`h-6 w-6 ${step.iconColor}`} />
                  </div>
                  <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium text-gray-600">
                    {step.number}
                  </span>
                </div>

                <h3 className="font-heading font-bold text-xl text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 mb-3 text-sm">{step.description}</p>

                {step.price && (
                  <div className="border-2 border-primary rounded-xl p-3 mt-3 bg-primary/5">
                    <p className="font-bold text-lg text-primary">{step.price}</p>
                    <p className="text-sm text-gray-600">{step.priceNote}</p>
                  </div>
                )}

                {!step.highlight && (
                  <div className="mt-3">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Coming after the challenge</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Connector arrow visual cue */}
        <div className="text-center space-y-3">
          <Button
            onClick={scrollToPricing}
            className="bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-5 text-lg font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg h-auto"
          >
            Start With the 5-Day Challenge — $27
          </Button>
          <p className="text-sm text-gray-600 italic">
            Always consult your doctor before changing medications.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
