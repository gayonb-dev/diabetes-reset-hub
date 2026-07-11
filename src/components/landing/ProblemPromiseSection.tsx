import { X, Check, ArrowRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const ProblemPromiseSection = () => {
  const doesntWork = [
    "Generic diets that spike your blood sugar",
    "Apps that track everything and change nothing",
    "Overwhelming 90-day plans that kill motivation by week 2",
    "Cutting out entire food groups and feeling deprived",
  ];

  const doesWork = [
    "Small, diabetes-specific actions you can start today",
    "Meals that stabilize blood sugar AND taste good",
    "10 minutes a day — not a lifestyle overhaul",
    "Ask anything — get an expert-reviewed answer within 48 hours",
  ];

  return (
    <section className="bg-background py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <ScrollReveal>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-8">
            Why Most Diabetes Plans Fail
            <br />
            <span className="text-primary">(and What Actually Works)</span>
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-8">
          <ScrollReveal delay={0.1} direction="left">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <X className="h-6 w-6 text-destructive" />
                <h3 className="font-heading font-semibold text-lg">What Doesn't Work</h3>
              </div>
              <ul className="space-y-3">
                {doesntWork.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <X className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2} direction="right">
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Check className="h-6 w-6 text-primary" />
                <h3 className="font-heading font-semibold text-lg">The Diabetes Reset Method</h3>
              </div>
              <ul className="space-y-3 mb-4">
                {doesWork.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#pricing"
                className="inline-flex items-center text-primary hover:text-primary-dark font-semibold transition-colors"
              >
                Start for $27 today
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default ProblemPromiseSection;
