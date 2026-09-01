import ProductTourSection from "./ProductTourSection";

/**
 * Prompt 4 §5 — product proof.
 *
 * One coherent product area. The interactive tour is the single source of
 * product description here, so this wrapper carries no duplicate heading copy.
 * No fabricated dashboards, no member data, no health-outcome claims.
 */
const InsideMembershipSection = () => (
  <section
    id="inside-the-membership"
    className="scroll-mt-24 bg-gradient-to-b from-background to-primary/5 py-12"
    aria-labelledby="inside-heading"
  >
    <div className="container mx-auto px-4">
      <h2 id="inside-heading" className="sr-only">
        See the actual membership
      </h2>
      <ProductTourSection />
    </div>
  </section>
);

export default InsideMembershipSection;
