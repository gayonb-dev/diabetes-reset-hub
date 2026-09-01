import ScrollReveal from "./ScrollReveal";

const OBJECTIONS = [
  {
    question: "Will I be charged again?",
    answer:
      "Yes. Unless you cancel, the membership renews at $67 per month after your first 14 days and continues monthly until canceled.",
  },
  {
    question: "Can I cancel easily?",
    answer:
      "Yes. Cancel directly from Settings or Billing inside the app. No phone call, cancellation email, retention survey, or additional offer is required.",
  },
  {
    question: "Is this instead of my doctor?",
    answer:
      "No. DRM is self-guided education. It does not diagnose, prescribe, change medication, or replace your healthcare professional.",
  },
  {
    question: "Do I have to use every feature?",
    answer:
      "No. Use the parts that fit your routine. You do not have to complete every tool, ring, action, or activity.",
  },
];

const ObjectionsSection = () => (
  <section className="bg-background pb-12" aria-labelledby="objections-heading">
    <div className="container mx-auto px-4 max-w-4xl">
      <h2 id="objections-heading" className="sr-only">
        Purchase questions
      </h2>
      <ul className="grid sm:grid-cols-2 gap-4">
        {OBJECTIONS.map(({ question, answer }, i) => (
          <ScrollReveal key={question} delay={i * 0.05}>
            <li className="h-full bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-semibold text-base text-foreground mb-2">
                {question}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{answer}</p>
            </li>
          </ScrollReveal>
        ))}
      </ul>
    </div>
  </section>
);

export default ObjectionsSection;
