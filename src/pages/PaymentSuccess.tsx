import { CheckCircle2, Mail, ClipboardList, MessageCircle, Calendar, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentSuccess = () => {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full py-12">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>

          <p className="text-sm font-semibold tracking-widest uppercase text-primary mb-3">The Diabetes Reset Method</p>

          <h1 className="font-heading font-bold text-4xl text-foreground mb-3">
            You're In! 🎉
          </h1>

          <p className="text-foreground text-lg font-medium mb-1">
            Welcome to The Diabetes Reset Challenge.
          </p>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your payment was successful. This 5-day challenge is your first step toward lowering your blood sugar, losing weight, and feeling better in your body.
          </p>
        </div>

        <div className="bg-background border border-border rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="font-heading font-semibold text-xl text-foreground mb-5">
            Here's what happens next:
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Check your email</p>
                <p className="text-sm text-muted-foreground">
                  Your <strong>Starter Kit</strong> with everything you need before Day 1 is on its way.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Check WhatsApp</p>
                <p className="text-sm text-muted-foreground">
                  Your welcome message is waiting — this is your main support channel.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Complete your intake form</p>
                <p className="text-sm text-muted-foreground">
                  Help us personalize your challenge experience.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Book your Day 1 session</p>
                <p className="text-sm text-muted-foreground">
                  30–45 min daily sessions for 5 days.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Use the Progress Tracker</p>
                <p className="text-sm text-muted-foreground">
                  Log your daily wins and build momentum throughout the challenge.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            asChild
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 font-bold rounded-xl h-auto text-lg"
          >
            <a href="/intake" target="_blank" rel="noopener noreferrer">
              <ClipboardList className="mr-2 h-5 w-5" />
              Complete Your Intake Form
            </a>
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
            asChild
            variant="outline"
            className="w-full py-3 font-semibold rounded-xl h-auto border-primary/30 hover:bg-primary/5"
          >
            <a href="/book" target="_blank" rel="noopener noreferrer">
              <Calendar className="mr-2 h-5 w-5" />
              Book Your First Session
            </a>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full py-3 font-semibold rounded-xl h-auto border-primary/30 hover:bg-primary/5"
          >
            <a href="/progress" target="_blank" rel="noopener noreferrer">
              <Trophy className="mr-2 h-5 w-5" />
              Open Progress Tracker
            </a>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Didn't get the email? Check your spam folder or contact support@diabetesresetmethod.com
        </p>
      </div>
    </main>
  );
};

export default PaymentSuccess;
