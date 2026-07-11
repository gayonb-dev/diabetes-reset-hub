import { Zap, BookOpen, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";

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
      title: "7-Day Reset Sprint",
      description:
        "Daily 10-minute actions for food, movement, and mindset — designed specifically for Type 2 Diabetes. Get a tangible win by Day 3.",
      highlight: true,
    },
    {
      icon: BookOpen,
      iconBg: "bg-secondary",
      iconColor: "text-secondary-foreground",
      number: "02",
      title: "Full Library Unlocks",
      description:
        "After Day 6 you unlock the recipe library, plate guides, and joint-friendly movements you can keep coming back to.",
    },
    {
      icon: MessageCircle,
      iconBg: "bg-secondary",
      iconColor: "text-secondary-foreground",
      number: "03",
      title: "Ongoing Support",
      description:
        "Submit questions to the expert Q&A library, get optional WhatsApp accountability nudges, and get priority access to 1-on-1 support sessions when you're ready.",
    },

  ];

  return (
    <section className="bg-gradient-to-b from-background to-primary/5 py-10">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <p className="text-sm font-semibold tracking-widest uppercase text-primary text-center mb-2">
            How the Membership Works
          </p>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-2">
            From First Win to Lasting Change
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            One $27 payment unlocks everything for 14 days. Stay only if it's working.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <ScrollReveal key={index} delay={index * 0.15}>
                <div
                  className={`bg-card rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6 relative h-full ${
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
                    <span className="bg-muted px-3 py-1 rounded-full text-sm font-medium text-muted-foreground">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-xl text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal>
          <div className="text-center space-y-3">
            <Button
              onClick={scrollToPricing}
              className="bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-5 text-lg font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg h-auto"
            >
              Start My Membership — $27
            </Button>
            <p className="text-sm text-muted-foreground italic">
              Always consult your doctor before changing medications.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default HowItWorksSection;
