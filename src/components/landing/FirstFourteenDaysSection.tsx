import ScrollReveal from "./ScrollReveal";

const STEPS = [
  {
    label: "Day 1",
    body: "Open Today, see your first action, and explore the tools already available.",
  },
  {
    label: "Days 2–7",
    body: "Use the meal, logging, educational, and progress tools that fit your routine. You do not have to complete everything.",
  },
  {
    label: "Days 8–14",
    body: "Continue the daily actions, review what you recorded, and decide whether you want to continue into the monthly membership.",
  },
];

const FirstFourteenDaysSection = () => {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-background py-12" aria-labelledby="first14-heading">
      <div className="container mx-auto px-4 max-w-4xl">
        <ScrollReveal>
          <h2
            id="first14-heading"
            className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-4"
          >
            Your first 14 days are for one thing: deciding whether DRM earns a place in your
            routine.
          </h2>
          <div className="text-center text-muted-foreground max-w-2xl mx-auto mb-10 space-y-3">
            <p>You are not buying a promised health result.</p>
            <p>
              You are paying for access to the real membership so you can use the tools, experience
              the daily structure, and decide whether it is useful to you.
            </p>
          </div>
        </ScrollReveal>

        <ol className="grid md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <ScrollReveal key={s.label} delay={i * 0.08}>
              <li className="h-full bg-card border border-border rounded-xl p-6">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary font-heading font-bold tabular-nums mb-4">
                  {i + 1}
                </span>
                <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                  {s.label}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.body}</p>
              </li>
            </ScrollReveal>
          ))}
        </ol>

        <p className="text-center text-sm text-muted-foreground mt-8">
          This is not a test. There is no prize for using every feature. Use what helps and leave
          the rest.
        </p>
      </div>
    </section>
  );
};

export default FirstFourteenDaysSection;
