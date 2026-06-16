// VITA Concerned error card — shown on AI generation failures and 90s timeouts.
// Wired by MealSetupTransition, Settings (Regenerate), and Meals.tsx (stale pending).

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Vita from "@/components/vita/Vita";
import { RefreshCw } from "lucide-react";

interface VitaErrorCardProps {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export default function VitaErrorCard({
  title = "Something didn't work",
  message = "VITA hit a snag. Try again — it usually clears right up.",
  retryLabel = "Try again",
  onRetry,
  retrying = false,
}: VitaErrorCardProps) {
  return (
    <Card
      role="alert"
      aria-live="polite"
      className="max-w-md mx-auto p-6 text-center space-y-4 bg-card border-border"
    >
      <div className="flex justify-center">
        <Vita posture="concerned" size={72} />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-heading font-semibold text-base text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button
          onClick={onRetry}
          disabled={retrying}
          className="min-h-11 min-w-11"
          aria-label={retryLabel}
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? "Retrying…" : retryLabel}
        </Button>
      )}
    </Card>
  );
}
