import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { evaluateSubscriptionRow } from "@/lib/membership";

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
  // B5. One evaluator, shared with the server. The previous status allow-list
  // could not express grace at all: a member whose card failed was either
  // waved through indefinitely (because `past_due` was listed) or shut out
  // immediately. The evaluator distinguishes full / grace / blocked, and only
  // `blocked` withholds programme access.
  const inactive = needSubCheck && evaluateSubscriptionRow(subscription).state === "blocked";

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
    console.warn("[auth-debug] AuthGuard redirect", {
      target: `/login?next=${encodeURIComponent(next)}`,
      reason: "no user after loading + recheck",
      hasUser: false,
      loading,
      authRecheck,
      subscriptionStatus: subscription?.status ?? null,
      requireAdmin: !!requireAdmin,
      requireActiveSub,
      path: loc.pathname,
      search: loc.search,
    });

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
    console.warn("[auth-debug] AuthGuard redirect", {
      target: "/login?inactive=1",
      reason: "no active subscription",
      hasUser: true,
      loading,
      authRecheck,
      subscriptionStatus: subscription?.status ?? null,
      requireAdmin: !!requireAdmin,
      requireActiveSub,
      path: loc.pathname,
      search: loc.search,
    });
    return <Navigate to="/login?inactive=1" replace />;
  }


  return <>{children}</>;
}
