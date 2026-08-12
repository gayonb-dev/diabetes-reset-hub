import ScrollReveal from "./ScrollReveal";

const AudienceFitSection = () => {
  return (
    <section className="bg-gradient-to-b from-background to-primary/5 py-12" aria-labelledby="fit-heading">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 id="fit-heading" className="sr-only">
          Who the membership is for
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <ScrollReveal>
            <div className="h-full bg-card border border-border rounded-xl p-6">
              <h3 className="font-heading font-bold text-2xl text-foreground mb-3">Who DRM is for</h3>
              <p className="text-muted-foreground leading-relaxed">
                Adults with Type 2 diabetes or prediabetes who want a practical, self-guided
                structure between healthcare visits.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <div className="h-full bg-card border border-border rounded-xl p-6">
              <h3 className="font-heading font-bold text-2xl text-foreground mb-3">
                Who DRM is not for
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                DRM is not for Type 1 diabetes, emergency care, diagnosis, medication decisions, or
                anyone seeking one-on-one clinical treatment.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                If you have urgent symptoms or need medical advice, contact a qualified healthcare
                professional or emergency services.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default AudienceFitSection;
