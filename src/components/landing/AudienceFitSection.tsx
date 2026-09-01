import { Check, X } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const FIT = [
  "You are an adult managing Type 2 diabetes or prediabetes.",
  "You want help deciding what to focus on today.",
  "You prefer self-guided support you can use on your own schedule.",
  "You want meal, movement, tracking, educational, and reporting tools in one place.",
  "You want your healthcare professional—not an app—to remain in charge of medical decisions.",
  "You want to see the real product before deciding whether to join.",
];

const NOT_FIT = [
  "You are looking for diagnosis, treatment, prescriptions, or medication instructions.",
  "You want a guaranteed glucose, A1C, weight, remission, or medication outcome.",
  "You need emergency help or urgent medical advice.",
  "You need one-to-one care from a doctor, dietitian, diabetes educator, or other healthcare professional.",
  "You are looking for a program designed for Type 1 diabetes.",
];

const AudienceFitSection = () => {
  return (
    <section
      id="who-its-for"
      className="scroll-mt-24 bg-gradient-to-b from-background to-primary/5 py-12"
      aria-labelledby="fit-heading"
    >
      <div className="container mx-auto px-4 max-w-4xl">
        <ScrollReveal>
          <h2
            id="fit-heading"
            className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-8"
          >
            DRM may fit your routine—but it is not for everyone.
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-6">
          <ScrollReveal>
            <div className="h-full bg-card border border-border rounded-xl p-6">
              <h3 className="font-heading font-bold text-2xl text-foreground mb-4">
                DRM may be right for you if:
              </h3>
              <ul className="space-y-3">
                {FIT.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5 text-primary-foreground" aria-hidden="true" />
                    </span>
                    <span className="text-muted-foreground leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <div className="h-full bg-card border border-border rounded-xl p-6">
              <h3 className="font-heading font-bold text-2xl text-foreground mb-4">
                Do not join DRM if:
              </h3>
              <ul className="space-y-3">
                {NOT_FIT.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-muted rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    </span>
                    <span className="text-muted-foreground leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>

        <p className="text-center text-muted-foreground mt-8">
          DRM is a self-guided educational membership. It supports your routine; it does not replace
          your healthcare team.
        </p>
      </div>
    </section>
  );
};

export default AudienceFitSection;
