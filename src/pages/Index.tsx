import { useState } from "react";
import { Helmet } from "react-helmet-async";
import SiteHeader from "@/components/landing/SiteHeader";
import HeroSection from "@/components/landing/HeroSection";
import ProblemPromiseSection from "@/components/landing/ProblemPromiseSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import WhatYouGetSection from "@/components/landing/WhatYouGetSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import WhyThisWorksSection from "@/components/landing/WhyThisWorksSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import Footer from "@/components/landing/Footer";
import StickyBottomCTA from "@/components/landing/StickyBottomCTA";
import PaymentModal from "@/components/landing/PaymentModal";
import { usePaidMemberRedirect } from "@/hooks/usePaidMemberRedirect";

const FAQS = [
  { q: "What exactly am I paying for at $27?", a: "Your $27 unlocks immediate access to the Diabetes Reset Method membership: the 7-Day Reset Sprint, the recipe library (unlocks Day 6), coach Q&A, and 14 days of full access. After 14 days the membership renews at $67/month unless you cancel before day 15." },
  { q: "What happens after my 14 days of full access?", a: "If you do nothing, your membership continues at $67/month, charged automatically. You can cancel anytime before day 15 from your member dashboard — one click, no call required. If you cancel inside the 14 days, no monthly charges are made and you keep your $27 7-Day Reset program." },
  { q: "Is there a money-back guarantee?", a: "Yes. 30-day money-back guarantee on every charge — including the initial $27 and any monthly renewal. Email Info@diabetesresetmethod.com and we refund within 5 business days." },
  { q: "Do I need special foods, supplements, or a gym?", a: "No. Everything uses real food from your regular grocery store and simple at-home movements." },
  { q: "Can I do this while taking diabetes medication?", a: "Yes. The program complements medical care. Always consult your doctor before changing medications." },
  { q: "Is this for Type 1 Diabetes?", a: "No. The Diabetes Reset Method is built specifically for Type 2 Diabetes and prediabetes." },
];

const Index = () => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  return (
    <main className="min-h-screen">
      <Helmet>
        <title>Diabetes Reset Method — Lower Blood Sugar Membership ($27)</title>
        <meta
          name="description"
          content="Membership built for Type 2 Diabetes and prediabetes. Start for $27 today, 14 days of full access, then $67/mo. 7-Day Reset Sprint, recipes, coach Q&A. Cancel anytime."
        />
        <link rel="canonical" href="https://diabetesresetmethod.com/" />
        <meta property="og:url" content="https://diabetesresetmethod.com/" />
        <meta property="og:title" content="Diabetes Reset Method — Lower Blood Sugar Membership" />
        <meta
          property="og:description"
          content="$27 today, 14 days of full access, then $67/mo. A diabetes-specific membership for real results. Cancel anytime."
        />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Diabetes Reset Method Membership",
          description:
            "Monthly membership for people with Type 2 Diabetes and prediabetes: 7-Day Reset Sprint, recipe library, coach Q&A, WhatsApp accountability. $27 to start with 14 days of full access, then $67/month.",
          brand: { "@type": "Brand", name: "The Diabetes Reset Method" },
          offers: {
            "@type": "Offer",
            price: "27.00",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url: "https://diabetesresetmethod.com/",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "67.00",
              priceCurrency: "USD",
              billingDuration: "P1M",
              billingIncrement: 1,
              referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
            },
          },
          aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "156" },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        })}</script>
      </Helmet>

      <SiteHeader />
      <HeroSection />
      <ProblemPromiseSection />
      <HowItWorksSection />
      <WhatYouGetSection />
      <TestimonialsSection />
      <WhyThisWorksSection />
      <PricingSection onOpenPayment={() => setIsPaymentModalOpen(true)} />
      <FAQSection />
      <FinalCTASection onOpenPayment={() => setIsPaymentModalOpen(true)} />
      <Footer />

      <StickyBottomCTA />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />
    </main>
  );
};

export default Index;
