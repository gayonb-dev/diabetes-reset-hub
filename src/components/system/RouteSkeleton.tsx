/**
 * Batch 2 Part A — route-shaped Suspense fallbacks.
 *
 * A lazy route must never blank the content region. Each variant mirrors the
 * rough shape of the page it stands in for, and every variant exposes an
 * accessible loading status so assistive technology is told the page is
 * preparing rather than empty.
 */
export type RouteSkeletonVariant =
  | "dashboard"
  | "list"
  | "tabs"
  | "article"
  | "form"
  | "chat"
  | "admin";

const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`rounded bg-muted animate-pulse ${className}`} />
);

const Block = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-xl bg-muted animate-pulse ${className}`} />
);

function Body({ variant }: { variant: RouteSkeletonVariant }) {
  switch (variant) {
    case "dashboard":
      return (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Block key={i} className="h-24" />
            ))}
          </div>
          <Block className="h-40" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Block key={i} className="h-16" />
            ))}
          </div>
        </>
      );
    case "tabs":
      return (
        <>
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bar key={i} className="h-9 w-24" />
            ))}
          </div>
          <Block className="h-56" />
          <Block className="h-40" />
        </>
      );
    case "article":
      return (
        <>
          <Bar className="h-4 w-11/12" />
          <Bar className="h-4 w-10/12" />
          <Bar className="h-4 w-9/12" />
          <Block className="h-48" />
        </>
      );
    case "form":
      return (
        <>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Bar className="h-3.5 w-32" />
              <Bar className="h-11 w-full" />
            </div>
          ))}
        </>
      );
    case "chat":
      return (
        <>
          <Block className="h-24" />
          <Block className="h-32" />
          <Bar className="h-12 w-full" />
        </>
      );
    case "admin":
      return (
        <>
          <Bar className="h-4 w-64" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Block key={i} className="h-20" />
          ))}
        </>
      );
    case "list":
    default:
      return (
        <>
          {Array.from({ length: 5 }).map((_, i) => (
            <Block key={i} className="h-20" />
          ))}
        </>
      );
  }
}

export default function RouteSkeleton({
  variant = "list",
  label = "Loading page",
}: {
  variant?: RouteSkeletonVariant;
  label?: string;
}) {
  return (
    <div className="space-y-5" aria-busy="true" data-testid="route-skeleton">
      <span className="sr-only" role="status" aria-live="polite">
        {label}…
      </span>
      <Bar className="h-8 w-1/2 max-w-xs" />
      <Body variant={variant} />
    </div>
  );
}
