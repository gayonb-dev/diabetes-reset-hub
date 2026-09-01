import { CalendarCheck, FileText, Sparkles } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const CARDS = [
  {
    icon: Sparkles,
    title: "Stop starting from a blank page",
    body: "Open Today and see the action in front of you instead of rebuilding your plan every morning.",
  },
  {
    icon: CalendarCheck,
    title: "Keep the practical tools together",
    body: "Plan meals, record the information you choose, explore educational guides, and follow your progress without juggling disconnected tools.",
  },
  {
    icon: FileText,
    title: "Bring something useful to your next visit",
    body: "Turn selected entries and questions into a printable report you can discuss with your healthcare professional.",
  },
];

const SimplerStepSection = () => {
  return (
    <section className="bg-background py-12" aria-labelledby="simpler-step-heading">
      <div className="container mx-auto px-4 max-w-4xl">
        <ScrollReveal>
          <h2
            id="simpler-step-heading"
            className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-4"
          >
            Diabetes advice is everywhere. A clear plan for today is harder to find.
          </h2>
          <div className="text-center text-muted-foreground max-w-2xl mx-auto mb-10 space-y-3">
            <p>
              Meals. Movement. Readings. Appointments. Questions. The list can follow you through
              the entire day.
            </p>
            <p>
              When everything feels important, it is easy to finish the day still wondering whether
              you focused on the right thing.
            </p>
            <p>You do not need another pile of information. You need a simple place to begin.</p>
            <p>DRM turns the daily diabetes to-do list into one useful next step at a time.</p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6">
          {CARDS.map(({ icon: Icon, title, body }, i) => (
            <ScrollReveal key={title} delay={i * 0.08}>
              <div className="h-full bg-card border border-border rounded-xl p-6">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-heading font-semibold text-lg text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <p className="text-center text-muted-foreground mt-8">
          You should not have to carry the whole diabetes to-do list in your head.
        </p>
      </div>
    </section>
  );
};

export default SimplerStepSection;
