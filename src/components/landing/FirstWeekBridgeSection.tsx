import ScrollReveal from "./ScrollReveal";

const FirstWeekBridgeSection = () => (
  <section className="bg-background pb-12" aria-labelledby="first-week-heading">
    <div className="container mx-auto px-4 max-w-3xl">
      <ScrollReveal>
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
          <h2
            id="first-week-heading"
            className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-4"
          >
            By the end of your first week, you will know what DRM actually feels like to use.
          </h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              You will have seen the daily-action structure, explored the practical tools, and
              experienced how the membership fits, or does not fit, into your routine.
            </p>
            <p>That is the decision your first 14 days are designed to help you make.</p>
            <p>No inflated promises. No mystery product. No need to commit blindly.</p>
          </div>
        </div>
      </ScrollReveal>
    </div>
  </section>
);

export default FirstWeekBridgeSection;
