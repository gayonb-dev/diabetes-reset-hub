import ScrollReveal from "./ScrollReveal";

const STEPS = [
  {
    label: "Start",
    body: "Set your preferences, review the safety boundaries, and find your first Today action.",
  },
  {
    label: "Days 1–7",
    body: "Practice daily actions and explore meal, movement, and tracking tools at your own pace.",
  },
  {
    label: "Days 8–14",
    body: "Review what you used, adjust your routine, and prepare questions or a printable report for a healthcare visit.",
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
            What happens during your first 14 days
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
            Your first 14 days are for learning the app, trying the tools that fit your routine, and
            deciding whether the membership is useful to you.
          </p>
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
          These are participation milestones, not promised medical results.
        </p>
      </div>
    </section>
  );
};

export default FirstFourteenDaysSection;
