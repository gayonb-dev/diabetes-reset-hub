import { ReactNode } from "react";
import { Vita, VitaPosture } from "@/components/vita/Vita";

interface EmptyStateProps {
  title: string;
  description?: string;
  posture?: VitaPosture;
  vitaSize?: number;
  action?: ReactNode;
  className?: string;
}

/**
 * Reusable empty-state block featuring the VITA mascot.
 * Used across Progress, Fasting, CheatMeal, Ask, Billing, Notifications, etc.
 */
export default function EmptyState({
  title,
  description,
  posture = "encouraging",
  vitaSize = 72,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center text-center gap-3 py-8 px-4 ${className}`}
    >
      <Vita posture={posture} size={vitaSize} />
      <p className="text-[15px] font-medium text-foreground max-w-xs">{title}</p>
      {description && (
        <p className="text-[13px] text-secondary-fg max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
