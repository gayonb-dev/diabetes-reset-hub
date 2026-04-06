import { CheckCircle2, XCircle, ArrowRight, Mail, Clock, ClipboardList, MessageCircle, Calendar, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PaymentResultProps {
  status: "success" | "cancelled";
  onClose: () => void;
  onRetry?: () => void;
}

const PaymentResult = ({ status, onClose, onRetry }: PaymentResultProps) => {
  const navigate = useNavigate();

  if (status === "success") {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-background rounded-2xl shadow-2xl max-w-lg w-full p-8 relative animate-in fade-in zoom-in duration-300 my-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>

            <h2 className="font-heading font-bold text-3xl text-foreground mb-3">
              You're In! 🎉
            </h2>

            <p className="text-foreground text-lg font-medium mb-1">
              Welcome to The Diabetes Reset Tiny Challenge.
            </p>
            <p className="text-muted-foreground mb-6">
              Your payment was successful. This 5-day challenge is your first step toward lowering your blood sugar, losing weight, and feeling better in your body.
            </p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-6 text-left space-y-3">
            <h3 className="font-heading font-semibold text-foreground">Here's what happens next:</h3>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Check your email for your <strong className="text-foreground">Starter Kit</strong> with everything you need before Day 1.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Check <strong className="text-foreground">WhatsApp</strong> for your welcome message — this is your main support channel.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <ClipboardList className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Complete your <strong className="text-foreground">intake form</strong> today so we can personalize your experience.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Book your Day 1 session</strong> — 30–45 min daily sessions for 5 days.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mb-6">
            You'll be starting a 5-day one-on-one challenge with daily support through WhatsApp. Sessions are 30–45 minutes each.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => { onClose(); navigate("/intake"); }}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 font-bold rounded-xl h-auto text-lg"
            >
              <ClipboardList className="mr-2 h-5 w-5" />
              Complete Your Intake Form
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full py-3 font-semibold rounded-xl h-auto border-primary/30 hover:bg-primary/5"
            >
              <a href="https://wa.me/18768822547?text=Hi!%20I%20just%20purchased%20the%205-Day%20Reset!" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" />
                Check WhatsApp Now
              </a>
            </Button>

            <Button
              onClick={() => { onClose(); navigate("/book"); }}
              variant="outline"
              className="w-full py-3 font-semibold rounded-xl h-auto border-primary/30 hover:bg-primary/5"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Book Your First Session
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Didn't get the email? Check your spam folder or contact support@diabetesresetmethod.com
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-lg w-full p-8 relative animate-in fade-in zoom-in duration-300 text-center">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="h-12 w-12 text-destructive" />
        </div>

        <h2 className="font-heading font-bold text-3xl text-foreground mb-3">
          Payment Cancelled
        </h2>

        <p className="text-muted-foreground text-lg mb-6">
          No worries — your spot is still available. Nothing was charged.
        </p>

        <div className="bg-muted/50 rounded-xl p-5 mb-6 text-left">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Still thinking it over?</span> Remember, the 5-Day Reset comes with a
            30-day money-back guarantee. If you don't see results, you get a full refund — no questions asked.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onRetry}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 font-bold rounded-xl h-auto text-lg"
          >
            Try Again — Start My Reset ($27)
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground py-3 h-auto"
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;
