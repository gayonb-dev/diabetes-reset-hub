import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  GLUCOSE_MEDICATION_WARNING,
  GlucoseStatus,
  glucoseSafetyCopy,
} from "@/lib/glucose";

/**
 * Low / urgent-low safety card.
 *
 * `announce` is true ONLY for a reading the member has just entered — that card
 * gets role="alert" so it is announced without moving focus. Previously saved
 * readings render the same card with icon + text but no assertive announcement.
 */
export default function GlucoseSafetyCard({
  status,
  announce = false,
  className = "",
}: {
  status: GlucoseStatus;
  announce?: boolean;
  className?: string;
}) {
  const copy = glucoseSafetyCopy(status);
  if (!copy) return null;

  return (
    <Card
      {...(announce ? { role: "alert" as const } : {})}
      className={`p-4 border-2 border-status-danger bg-status-danger/5 rounded-xl shadow-warm ${className}`}
    >
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-status-danger mt-0.5" aria-hidden="true" />
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-status-danger">{copy.title}</p>
          <p className="text-sm text-foreground leading-relaxed">{copy.message}</p>
          <p className="text-[12px] text-secondary-fg">{GLUCOSE_MEDICATION_WARNING}</p>
        </div>
      </div>
    </Card>
  );
}
