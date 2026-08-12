import ScrollReveal from "./ScrollReveal";
import Vita from "@/components/vita/Vita";

const FounderSection = () => {
  return (
    <section className="bg-background py-12" aria-labelledby="founder-heading">
      <div className="container mx-auto px-4 max-w-3xl">
        <ScrollReveal>
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <p className="text-sm font-semibold tracking-widest uppercase text-primary mb-2">
              A note from the founder
            </p>
            <h2
              id="founder-heading"
              className="font-heading font-bold text-3xl text-foreground mb-5"
            >
              Why I built DRM
            </h2>

            <div className="flex flex-col sm:flex-row gap-6">
              <div className="shrink-0 mx-auto sm:mx-0">
                <Vita posture="encouraging" size={96} />
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  I built Diabetes Reset Method because daily health habits can feel like another
                  full-time job. My goal is to make the next useful step easier to see: one action,
                  practical meal tools, simple tracking, and a report you can bring to a healthcare
                  visit.
                </p>
                <p>
                  DRM is deliberately self-guided. I am not presenting myself as your doctor, and I
                  cannot promise a medical result. I want members to feel supported, informed, and
                  able to keep their healthcare professional in charge.
                </p>
                <p className="text-foreground font-medium">
                  Gayon, Founder of Diabetes Reset Method
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default FounderSection;
