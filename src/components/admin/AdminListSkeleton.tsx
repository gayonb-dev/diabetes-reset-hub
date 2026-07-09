import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  rows?: number;
  rowHeight?: string;
  showStats?: boolean;
}

/**
 * Shared skeleton for admin list surfaces (subscriptions, Q&A, broadcasts, etc.).
 * Replaces the previous mid-page spinner so the page structure stays visible while data loads.
 */
export default function AdminListSkeleton({ rows = 5, rowHeight = "h-16", showStats = false }: Props) {
  return (
    <div className="space-y-4">
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-12" />
            </div>
          ))}
        </div>
      )}
      <Skeleton className="h-6 w-40" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className={`${rowHeight} w-full rounded-xl`} />
        ))}
      </div>
    </div>
  );
}
