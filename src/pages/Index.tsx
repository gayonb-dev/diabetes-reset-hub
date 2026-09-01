import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import SiteHeader from "@/components/landing/SiteHeader";
import HeroSection from "@/components/landing/HeroSection";
import SimplerStepSection from "@/components/landing/SimplerStepSection";
import InsideMembershipSection from "@/components/landing/InsideMembershipSection";
import DayOneSection from "@/components/landing/DayOneSection";
import FirstFourteenDaysSection from "@/components/landing/FirstFourteenDaysSection";
import AudienceFitSection from "@/components/landing/AudienceFitSection";
import PracticeSection from "@/components/landing/PracticeSection";
import FirstWeekBridgeSection from "@/components/landing/FirstWeekBridgeSection";
import RiskControlSection from "@/components/landing/RiskControlSection";
import ObjectionsSection from "@/components/landing/ObjectionsSection";
import FounderSection from "@/components/landing/FounderSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection, { FAQS } from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import Footer from "@/components/landing/Footer";
import StickyBottomCTA from "@/components/landing/StickyBottomCTA";
import PaymentModal from "@/components/landing/PaymentModal";
import ChatWidget from "@/components/chat/ChatWidget";
import { CheckoutProvider, useCheckout } from "@/components/landing/CheckoutContext";
import { syncSectionFromHash } from "@/lib/landingNav";
import { usePaidMemberRedirect } from "@/hooks/usePaidMemberRedirect";

const TITLE = "Diabetes Reset Method | One Clear Daily Step for Type 2 Diabetes";
const DESCRIPTION =
  "Stop wondering what to focus on today. Explore one guided daily action, practical meal tools, progress tracking, educational support, and printable reports. Start with 14 days for $27.";

const OG_TITLE = "Stop wondering what to focus on for your diabetes today";
const OG_DESCRIPTION =
  "See the real Diabetes Reset Method membership before joining. Start with one guided daily action and practical tools for meals, movement, tracking, learning, and healthcare visits.";

const LandingBody = () => {
  const { isOpen, closeCheckout } = useCheckout();

  // Direct hash entry, reload and browser back/forward all land on the section.
  useEffect(() => {
    const sync = () => {
      // Sections mount with content, so defer one frame before measuring.
      requestAnimationFrame(() => syncSectionFromHash());
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <main className="min-h-dvh pb-28 md:pb-0">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href="https://diabetesresetmethod.com/" />
        <meta property="og:url" content="https://diabetesresetmethod.com/" />
        <meta property="og:title" content={OG_TITLE} />
        <meta property="og:description" content={OG_DESCRIPTION} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Diabetes Reset Method membership",
            serviceType: "Self-guided educational membership",
            description:
              "A self-guided educational membership with daily actions, meal tools, progress tracking, educational support, and printable healthcare-visit reports for adults with Type 2 diabetes or prediabetes.",
            provider: { "@type": "Organization", name: "The Diabetes Reset Method" },
            url: "https://diabetesresetmethod.com/",
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          })}
        </script>
      </Helmet>

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <SiteHeader />
      <div id="main-content" tabIndex={-1} className="outline-none">
        <HeroSection />
        <SimplerStepSection />
        <DayOneSection />
        <PracticeSection />
        <FounderSection />
        <InsideMembershipSection />
        <AudienceFitSection />
        <FirstFourteenDaysSection />
        <FirstWeekBridgeSection />
        <RiskControlSection />
        <PricingSection />
        <ObjectionsSection />
        <FAQSection />
        <FinalCTASection />
      </div>
      <Footer />

      <StickyBottomCTA />

      <PaymentModal isOpen={isOpen} onClose={closeCheckout} />

      <ChatWidget />
    </main>
  );
};

const Index = () => {
  usePaidMemberRedirect("/app");
  return (
    <CheckoutProvider>
      <LandingBody />
    </CheckoutProvider>
  );
};

export default Index;
