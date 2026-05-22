import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  requireAdmin?: boolean;
  requireActiveSub?: boolean;
}

export default function AuthGuard({ children, requireAdmin, requireActiveSub = true }: Props) {
  const { user, loading, isAdmin, subscription } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/app" replace />;
  }

  if (requireActiveSub && !isAdmin) {
    const active =
      subscription &&
      ["trialing", "active", "past_due"].includes(subscription.status);
    if (!active) {
      return <Navigate to="/login?expired=1" replace />;
    }
  }

  return <>{children}</>;
}
