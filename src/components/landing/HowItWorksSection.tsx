import { Zap, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

const scrollToPricing = () => {
  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
};

const HowItWorksSection = () => {
  const steps = [
    {
      icon: Zap,
      iconBg: "bg-secondary",
      iconColor: "text-gray-900",
      number: "01",
      title: "5-Day Tiny Challenge",
      description: "Reset habits fast with food, movement, mindset.",
      price: "USD $27",
      priceNote: "credited toward 6-Week Reset",
      hasBorder: true,
    },
    {
      icon: TrendingUp,
      iconBg: "bg-primary",
      iconColor: "text-primary-foreground",
      number: "02",
      title: "6-Week Reset",
      description: "Lose 10–30 lbs, lower blood sugar, regain energy.",
    },
    {
      icon: Award,
      iconBg: "bg-secondary",
      iconColor: "text-gray-900",
      number: "03",
      title: "12-Week Transformation",
      description: "Heal gut & hormones for lasting reversal.",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-background to-primary/5 py-10">
      <div className="container mx-auto px-4">
        <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-gray-900 mb-8">
          How It Works
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="bg-card rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6 relative"
              >
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
                <p className="text-gray-600 mb-3">{step.description}</p>

                {step.price && (
                  <div className={`border-2 ${step.hasBorder ? "border-primary" : "border-gray-200"} rounded-xl p-3 mt-3`}>
                    <p className="font-bold text-lg text-gray-900">{step.price}</p>
                    <p className="text-sm text-gray-600">{step.priceNote}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center space-y-3">
          <Button
            onClick={scrollToPricing}
            className="bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-5 text-lg font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg h-auto"
          >
            Start My 5-Day Reset — $27
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
