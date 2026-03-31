import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import PaymentResult from "@/components/landing/PaymentResult";

const Index = () => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentStatus = searchParams.get("payment") as "success" | "cancelled" | null;

  const clearPaymentParam = () => {
    setSearchParams({}, { replace: true });
  };

  const handleRetry = () => {
    clearPaymentParam();
    setIsPaymentModalOpen(true);
  };

  return (
    <main className="min-h-screen">
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

      {paymentStatus && (
        <PaymentResult
          status={paymentStatus}
          onClose={clearPaymentParam}
          onRetry={handleRetry}
        />
      )}
    </main>
  );
};

export default Index;
