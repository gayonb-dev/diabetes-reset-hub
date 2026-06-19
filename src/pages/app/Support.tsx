import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles } from "lucide-react";

export default function Support() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const email = user?.email ?? "";

  const appBody = encodeURIComponent(
    `Hi, I'm experiencing an issue with:\n\n\n\nDevice: ${navigator.userAgent}\nApp version: web`,
  );
  const billingBody = encodeURIComponent(
    `Hi, I have a question about my subscription:\n\n\n\nAccount email: ${email}`,
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold text-primary">We're here to help.</h1>
        <div className="my-4 inline-flex h-16 w-16 rounded-full bg-accent items-center justify-center text-white">
          <Sparkles className="h-8 w-8" />
        </div>
        <p className="text-sm text-muted-foreground">Choose what you need help with below.</p>
      </div>

      <Card className="p-5 space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">App Issues</p>
        <h2 className="text-base font-semibold">Something not working right?</h2>
        <p className="text-sm text-muted-foreground">Report bugs, crashes, or anything behaving unexpectedly in the app.</p>
        <p className="text-xs text-accent">⏱ We respond to app issues within 24 hours.</p>
        <Button
          asChild
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <a href={`mailto:info@diabetesresetmethod.com?subject=${encodeURIComponent("App Support")}&body=${appBody}`}>
            Report an issue →
          </a>
        </Button>
      </Card>

      <Card className="p-5 space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Billing</p>
        <h2 className="text-base font-semibold">Questions about your subscription?</h2>
        <p className="text-sm text-muted-foreground">Payment issues, plan changes, or anything billing-related.</p>
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <a href={`mailto:info@diabetesresetmethod.com?subject=${encodeURIComponent("Billing Question")}&body=${billingBody}`}>
            Contact billing support →
          </a>
        </Button>
      </Card>

      <Card className="p-5 space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Program Questions</p>
        <h2 className="text-base font-semibold">Have a question about how the program works?</h2>
        <p className="text-sm text-muted-foreground">
          Questions about meals, workouts, blood sugar, IF, supplements — ask the community and VITA for the fastest answer.
        </p>
        <Button
          variant="outline"
          className="w-full border-primary text-primary"
          onClick={() => navigate("/app/ask")}
        >
          Ask the community →
        </Button>
      </Card>
    </div>
  );
}
