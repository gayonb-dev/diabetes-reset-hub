import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  requireAdmin?: boolean;
  requireActiveSub?: boolean;
}

export default function AuthGuard({ children, requireAdmin, requireActiveSub = true }: Props) {
  const { user, loading, isAdmin, subscription, refreshAuthState } = useAuth();
  const loc = useLocation();
  const [authRecheck, setAuthRecheck] = useState<"idle" | "checking" | "failed">("idle");

  // When we'd otherwise block due to inactive sub, check onboarding state:
  // a new user with no onboarded_at gets routed to onboarding instead of login.
  const [onboardState, setOnboardState] = useState<"unknown" | "needs" | "done">("unknown");
  const needSubCheck = !loading && !!user && !!requireActiveSub && !isAdmin;
  const inactive =
    needSubCheck &&
    !(subscription && ["trialing", "active", "past_due"].includes(subscription.status));

  useEffect(() => {
    if (!inactive || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("visitor_profiles")
        .select("metadata")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const meta = (data?.metadata as Record<string, unknown> | null) || {};
      setOnboardState(meta.onboarded_at ? "done" : "needs");
    })();
    return () => {
      cancelled = true;
    };
  }, [inactive, user?.id]);

  useEffect(() => {
    if (loading || user || authRecheck !== "idle") return;

    const callbackJustFinished = (() => {
      try {
        const raw = window.sessionStorage.getItem("drm_auth_callback_completed_at");
        if (!raw) return false;
        const completedAt = Number(raw);
        return Number.isFinite(completedAt) && Date.now() - completedAt < 10000;
      } catch {
        return false;
      }
    })();

    setAuthRecheck("checking");
    refreshAuthState().then((ok) => {
      if (ok) {
        try {
          window.sessionStorage.removeItem("drm_auth_callback_completed_at");
        } catch {}
        setAuthRecheck("idle");
        return;
      }
      setAuthRecheck(callbackJustFinished ? "checking" : "failed");
      if (callbackJustFinished) {
        window.setTimeout(() => setAuthRecheck("idle"), 400);
      }
    });
  }, [authRecheck, loading, refreshAuthState, user]);

  useEffect(() => {
    if (user && authRecheck !== "idle") setAuthRecheck("idle");
  }, [authRecheck, user]);

  if (loading || authRecheck === "checking") {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const next = `${loc.pathname}${loc.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/app" replace />;
  }

  if (inactive) {
    if (onboardState === "unknown") {
      return (
        <div className="min-h-dvh flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    if (onboardState === "needs") {
      return <Navigate to="/app/onboarding" replace />;
    }
    return <Navigate to="/login?inactive=1" replace />;
  }

  return <>{children}</>;
}
