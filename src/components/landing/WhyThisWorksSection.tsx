import { Flame, Sprout, Target, ArrowRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const WhyThisWorksSection = () => {
  const reasons = [
    {
      icon: Flame,
      title: "Insulin & Inflammation",
      description: "Target the root cause — not just symptoms. Stabilize blood sugar swings and reduce chronic inflammation that drives diabetes progression.",
      gradient: "from-primary/15 to-primary/5",
    },
    {
      icon: Sprout,
      title: "Gut & Hormones",
      description: "Support the gut-hormone connection that controls hunger, cravings, and energy. Better gut health = better blood sugar control.",
      gradient: "from-primary/10 to-secondary/10",
    },
    {
      icon: Target,
      title: "Tiny Wins = Momentum",
      description: "Small daily actions build unstoppable momentum. Each win proves change is possible — no willpower required, just a 10-minute commitment.",
      gradient: "from-secondary/15 to-secondary/5",
    },
  ];

  return (
    <section className="bg-background py-10">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-2">
            Why The Diabetes Reset Method Works
          </h2>
          <p className="text-center text-muted-foreground mb-8">(When Nothing Else Did)</p>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {reasons.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <ScrollReveal key={index} delay={index * 0.15}>
                <div
                  className={`bg-gradient-to-br ${reason.gradient} rounded-2xl p-8 text-center transition-transform hover:scale-105 h-full`}
                >
                  <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-heading font-bold text-xl text-foreground mb-3">
                    {reason.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{reason.description}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal>
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-2xl p-8 text-center">
            <p className="font-heading font-bold text-2xl text-foreground mb-2">
              No extremes. No starvation. Just results you can keep.
            </p>
            <a
              href="#pricing"
              className="inline-flex items-center text-primary hover:text-primary-dark font-semibold transition-colors"
            >
              See the plan
              <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default WhyThisWorksSection;
