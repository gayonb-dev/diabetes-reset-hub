import { Card } from "@/components/ui/card";
import { AlertCircle, X } from "lucide-react";

interface Props {
  onDismiss?: () => void;
  dismissible?: boolean;
}

export default function LowBloodSugarCard({ onDismiss, dismissible = true }: Props) {
  return (
    <Card className="p-4 border-border rounded-xl shadow-warm bg-accent-muted">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <p className="text-sm text-accent">
          Know the signs of low blood sugar: shakiness, sweating, confusion, a racing heart, or sudden intense
          hunger. If you feel them, stop fasting and eat something. Then tell your doctor — it may mean your
          medication needs review. Never adjust a dose yourself.
        </p>
        {dismissible && (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="shrink-0 min-h-11 min-w-11 -mr-2 -mt-2 flex items-center justify-center text-accent"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </Card>
  );
}
