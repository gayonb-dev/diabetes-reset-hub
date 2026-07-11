import { Clock, UtensilsCrossed, Activity, MessageCircle, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";

const scrollToPricing = () => {
  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
};

const WhatYouGetSection = () => {
  const benefits = [
    {
      icon: Clock,
      title: "7-Day Reset Sprint",
      description: "Daily 10-minute actions to lower blood sugar and prove change is possible.",
    },
    {
      icon: UtensilsCrossed,
      title: "Diabetic Recipe Library",
      description: "Real-food recipes, plate guides, and grocery lists — all blood-sugar friendly.",
    },
    {
      icon: Activity,
      title: "Safe Movement Plans",
      description: "Joint-friendly routines designed for real bodies, no gym required.",
    },
    {
      icon: MessageCircle,
      title: "Expert Q&A Library",
      description: "Ask anything — get an expert-reviewed answer added to your member library.",
    },
    {
      icon: BookOpen,
      title: "Weekly Accountability",
      description: "WhatsApp nudges and broadcasts that keep you focused without nagging.",
    },
    {
      icon: Users,
      title: "1-on-1 Support Sessions Waitlist",
      description: "Priority access to 1-on-1 support sessions when new spots open up.",
    },

  ];

  return (
    <section className="bg-background py-10">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-2">
            Everything Inside the Membership
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Unlock all of it today for $27 — and decide in 14 days if you want to keep it.
          </p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div className="rounded-xl p-5 transition-all hover:shadow-md h-full bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20 hover:border-primary">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg flex-shrink-0 bg-primary">
                      <Icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">{benefit.title}</p>
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
              Unlock Everything for $27
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default WhatYouGetSection;
