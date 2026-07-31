import { useState } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClockSkew } from "@/hooks/useClockSkew";

const THRESHOLD_MS = 120_000;

/**
 * Warns members whose device clock is off far enough to break sign-in.
 * Dismissal lives in memory only (never localStorage) so the warning returns
 * next session while the clock is still wrong.
 */
export default function ClockSkewBanner() {
  const { skewMs, checked } = useClockSkew();
  const [dismissed, setDismissed] = useState(false);

  if (!checked || skewMs === null || dismissed) return null;
  if (Math.abs(skewMs) <= THRESHOLD_MS) return null;

  const minutes = Math.max(1, Math.round(Math.abs(skewMs) / 60000));

  return (
    <div
      role="alert"
      className="bg-accent-muted border-b border-accent/30 text-foreground px-4 py-3"
    >
      <div className="mx-auto max-w-5xl flex flex-wrap items-center gap-3 text-sm">
        <AlertTriangle className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
        <p className="flex-1 min-w-[16rem]">
          Your device clock is off by about {minutes} minute{minutes === 1 ? "" : "s"}, which can
          stop you from signing in. Set your device date and time to update automatically, then
          reload this page.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => window.location.reload()}
          className="rounded-lg"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reload
        </Button>
        <button
          type="button"
          aria-label="Dismiss clock warning"
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
