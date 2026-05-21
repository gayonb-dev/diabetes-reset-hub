import { useState } from "react";
import { Helmet } from "react-helmet-async";
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

const FAQS = [
  { q: "I've tried everything — will this actually work?", a: "The Diabetes Reset Method is designed specifically for Type 2 Diabetes and prediabetes. You'll see real wins within 5 days because the actions are small, specific, and proven. Plus, with our 30-day money-back guarantee, there's zero risk." },
  { q: "Do I need special foods or a gym membership?", a: "No. Everything uses real food from your regular grocery store and simple at-home movements — no equipment needed." },
  { q: "Can I do this while taking medications?", a: "Yes — the program complements medical care. Always consult your doctor before changing medications." },
  { q: "How much time does it take each day?", a: "Just 10–20 minutes a day for 5 days." },
  { q: "What happens after the 5 days?", a: "You can continue with our 6-Week Reset or 12-Week Transformation. Your $27 is credited toward the 6-Week Reset." },
  { q: "What if it doesn't work for me?", a: "30-day money-back guarantee. No questions, no hoops — email us and we refund every penny." },
];

const Index = () => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  return (
    <main className="min-h-screen">
      <Helmet>
        <title>Diabetes Reset Method - Reverse Diabetes in 5 Days</title>
        <meta name="description" content="The 5-Day Diabetes Reset Challenge: lower blood sugar, jumpstart weight loss, restore energy. Start today for $27." />
        <link rel="canonical" href="https://diabetesresetmethod.com/" />
        <meta property="og:url" content="https://diabetesresetmethod.com/" />
        <meta property="og:title" content="Diabetes Reset Method - Reverse Diabetes in 5 Days" />
        <meta property="og:description" content="The 5-Day Diabetes Reset Challenge for $27. Lower blood sugar, restore energy." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "5-Day Diabetes Reset Challenge",
          description: "Quick wins that lower blood sugar, jumpstart weight loss, and restore energy in 5 days.",
          brand: { "@type": "Brand", name: "The Diabetes Reset Method" },
          offers: { "@type": "Offer", price: "27.00", priceCurrency: "USD", availability: "https://schema.org/InStock", url: "https://diabetesresetmethod.com/" },
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

      <HeroSection />
      <ProblemPromiseSection />
      <HowItWorksSection />
      <WhatYouGetSection />
      <TestimonialsSection />
      <WhyThisWorksSection />
      <PricingSection 
        onOpenPayment={() => setIsPaymentModalOpen(true)}
      />
      <FAQSection />
      <FinalCTASection 
        onOpenPayment={() => setIsPaymentModalOpen(true)}
      />
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
