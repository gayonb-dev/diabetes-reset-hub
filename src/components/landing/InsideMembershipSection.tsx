import ScrollReveal from "./ScrollReveal";
import ProductTourSection from "./ProductTourSection";

/**
 * Prompt 4 §5 — product proof.
 *
 * One coherent product area. The previous text-card list duplicated the tour,
 * so its wording now lives in the tour captions and the interactive tour is the
 * single source of product description here. No fabricated dashboards, no
 * member data, no health-outcome claims.
 */
const InsideMembershipSection = () => (
  <section
    id="inside-the-membership"
    className="scroll-mt-24 bg-gradient-to-b from-background to-primary/5 py-12"
    aria-labelledby="inside-heading"
  >
    <div className="container mx-auto px-4">
      <ScrollReveal>
        <h2
          id="inside-heading"
          className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-3"
        >
          Inside your membership
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          See the tools members can use from the first 14 days onward. These are product
          views—not promised health results.
        </p>
      </ScrollReveal>

      <ProductTourSection />
    </div>
  </section>
);

export default InsideMembershipSection;
