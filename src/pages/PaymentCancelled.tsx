import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PaymentCancelled = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    navigate("/");
    setTimeout(() => {
      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  return (
    <main className="min-h-dvh bg-gradient-to-b from-muted/30 to-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full py-12 text-center">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="h-12 w-12 text-destructive" />
        </div>

        <h1 className="font-heading font-bold text-4xl text-foreground mb-3">
          Payment Cancelled
        </h1>

        <p className="text-muted-foreground text-lg mb-8">
          No worries — your spot is still available. Nothing was charged.
        </p>

        <div className="bg-background border border-border rounded-2xl shadow-lg p-6 mb-8 text-left">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Still thinking it over?</span> Remember, the 5-Day Reset comes with a
            30-day money-back guarantee. If you don't see results, you get a full refund — no questions asked.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleRetry}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 font-bold rounded-xl h-auto text-lg"
          >
            Try Again — Start My Reset ($27)
          </Button>

          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground py-3 h-auto"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </main>
  );
};

export default PaymentCancelled;
