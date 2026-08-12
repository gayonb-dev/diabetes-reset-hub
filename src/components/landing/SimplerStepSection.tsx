import { CalendarCheck, FileText, Sparkles } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const CARDS = [
  {
    icon: Sparkles,
    title: "Start with Today",
    body: "Open one guided daily action instead of facing a long checklist.",
  },
  {
    icon: CalendarCheck,
    title: "Use the tools you need",
    body: "Plan meals, record trends, or prepare questions without completing every feature.",
  },
  {
    icon: FileText,
    title: "Bring the summary to your visit",
    body: "Create a printable report to support a conversation with your healthcare professional.",
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
            One useful next step—not another overwhelming plan
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
            Diabetes management can involve meals, movement, readings, appointments, and more. DRM
            brings practical tools into one place so you can focus on the next action that feels
            useful today.
          </p>
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
      </div>
    </section>
  );
};

export default SimplerStepSection;
