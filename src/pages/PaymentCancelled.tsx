import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/**
 * Prompt 4 §10 — neutral cancelled-checkout page.
 * No guarantee claims, no urgency, no health-outcome language.
 */
const PaymentCancelled = () => {
  const navigate = useNavigate();

  const goToPricing = () => {
    navigate("/");
    setTimeout(() => {
      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  return (
    <main className="min-h-dvh bg-background flex items-center justify-center p-4">
      <Helmet>
        <title>Checkout cancelled | Diabetes Reset Method</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-lg w-full py-12 text-center">
        <h1 className="font-heading font-bold text-3xl sm:text-4xl text-foreground mb-3">
          Checkout cancelled
        </h1>

        <p className="text-muted-foreground text-lg mb-8">
          You were not charged. You can start again whenever you're ready.
        </p>

        <div className="space-y-3">
          <Button
            onClick={goToPricing}
            className="w-full min-h-[48px] font-semibold rounded-xl h-auto text-base"
          >
            Back to membership details
          </Button>

          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="w-full min-h-[44px] text-muted-foreground hover:text-foreground h-auto"
          >
            Return home
          </Button>
        </div>
      </div>
    </main>
  );
};

export default PaymentCancelled;
