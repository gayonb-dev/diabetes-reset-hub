import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  Home,
  BookOpen,
  MessageCircleQuestion,
  LineChart,
  Activity,
  UtensilsCrossed,
  LogOut,
  Shield,
  LifeBuoy,
  User,
  Library,
  CreditCard,
  MoreHorizontal,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Vita } from "@/components/vita/Vita";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { OfflineBanner } from "@/components/system/OfflineBanner";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import { MORE_GROUPS } from "@/lib/appNav";
import { Suspense } from "react";
import { useLocation } from "react-router-dom";
import RouteSkeleton, { type RouteSkeletonVariant } from "@/components/system/RouteSkeleton";
import { prefetchOnIdle, prefetchHandlers } from "@/lib/routePrefetch";

/** Page-shaped loading fallback per destination. */
function skeletonVariantFor(pathname: string): RouteSkeletonVariant {
  const p = pathname.replace(/\/+$/, "");
  if (p === "/app" || p.startsWith("/app/today")) return "dashboard";
  if (p.startsWith("/app/workouts") || p.startsWith("/app/workout")) return "list";
  if (p.startsWith("/app/meals") || p.startsWith("/app/progress") || p.startsWith("/app/fasting"))
    return "tabs";
  if (p.startsWith("/app/learn") || p.startsWith("/app/library") || p.startsWith("/app/day"))
    return "article";
  if (p.startsWith("/app/ask") || p.startsWith("/app/support")) return "chat";
  if (p.startsWith("/app/settings") || p.startsWith("/app/profile") || p.startsWith("/app/billing"))
    return "form";
  return "list";
}

function navClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2.5 pl-[10px] pr-3 py-2 rounded-lg text-[13px] border-l-2 transition-colors ${
    isActive
      ? "border-accent bg-white/5 text-white font-medium"
      : "border-transparent text-white/60 hover:text-white hover:bg-white/8"
  }`;
}

function mobileNavClass({ isActive }: { isActive: boolean }) {
  // Prompt 6 B — every bottom-nav destination is a 44x44 touch target.
  return `flex flex-col items-center justify-center text-[10px] gap-0.5 p-2 min-h-11 min-w-11 ${
    isActive ? "text-primary" : "text-tertiary-fg"
  }`;
}


export default function AppLayout() {
  useVisualViewport();
  const { signOut, subscription, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const skeletonVariant = skeletonVariantFor(location.pathname);
  // Warm the common destination chunks once the browser is idle. Code only —
  // access is still decided by AuthGuard when the route renders.
  useEffect(() => prefetchOnIdle(), []);
  const [levelName, setLevelName] = useState("Level 1: Getting Started");
  const [moreOpen, setMoreOpen] = useState(false);
  useBackButtonClose(moreOpen, () => setMoreOpen(false));



  // Onboarding gate: redirect new users (no onboarded_at) to /app/onboarding.
  const [onboardCheck, setOnboardCheck] = useState<"loading" | "needs" | "done">("loading");
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("visitor_profiles")
        .select("metadata, level")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const meta = (data?.metadata as Record<string, unknown> | null) || {};
      const level = data?.level ?? 1;
      setLevelName(level <= 1 ? "Level 1: Getting Started" : `Level ${level}: The Builder`);
      setOnboardCheck(meta.onboarded_at ? "done" : "needs");
    })();
    return () => { cancelled = true; };
  }, [user?.id]);


  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };


  const trialBanner =
    subscription?.status === "trialing" &&
    subscription.trial_end_date && (() => {
      const endMs = new Date(subscription.trial_end_date).getTime();
      const diffMs = Math.max(0, endMs - Date.now());
      const days = Math.floor(diffMs / 86400000);
      const hours = Math.floor((diffMs % 86400000) / 3600000);
      return (
        <div className="bg-accent-muted border-b border-accent/30 text-foreground px-4 py-2 flex items-center justify-center gap-3 text-xs">
          <span className="tabular-nums">
            Trial ends in <strong className="font-semibold">{days}d {hours}h</strong> — renews at $67/mo.
          </span>
          <Button asChild size="sm" className="h-7 px-3 text-xs">
            <Link to="/app/billing">Manage</Link>
          </Button>
        </div>
      );
    })();

  const pastDueBanner = subscription?.status === "past_due" && (
    <div className="bg-destructive/10 text-destructive px-4 py-2 text-center text-xs font-medium">
      Payment failed.{" "}
      <Link to="/app/billing" className="underline">
        Update card
      </Link>{" "}
      to keep access.
    </div>
  );

  if (onboardCheck === "loading") {
    return (
      <div className="min-h-dvh bg-background flex" aria-busy="true" aria-label="Loading">
        {/* Sidebar rail skeleton */}
        <aside className="hidden lg:flex w-[240px] flex-col bg-sidebar p-4 shrink-0 gap-3 pb-[env(safe-area-inset-bottom)]">
          <div className="h-10 rounded bg-white/10 animate-pulse" />
          <div className="h-14 rounded bg-white/10 animate-pulse" />
          <div className="space-y-2 mt-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-7 rounded bg-white/8 animate-pulse" />
            ))}
          </div>
        </aside>
        {/* Content skeleton */}
        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8 max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full space-y-5 safe-x">
          <div className="h-8 w-1/2 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }
  if (onboardCheck === "needs") {
    return <Navigate to="/app/onboarding" replace />;
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Prompt 6 B1 — keyboard users can jump straight past the navigation. */}
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:ring-2 focus:ring-primary"
      >
        Skip to main content
      </a>
      <OfflineBanner />
      {trialBanner}

      {pastDueBanner}
      <div className="flex flex-1">
        {/* Sidebar — dark green */}
        <aside className="hidden lg:flex w-[240px] flex-col bg-sidebar text-sidebar-foreground p-4 shrink-0 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="flex items-center justify-between mb-4">
            <Link to="/app" className="flex items-center gap-3">
              <Vita size={32} className="shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.1em] text-white/35">Diabetes Reset</p>
                <p className="text-base font-semibold text-white">Method</p>
              </div>
            </Link>
            <NotificationsBell variant="dark" />
          </div>



          {/* Prompt 6 A2 — one hierarchy on desktop and mobile.
              Primary: Today, Meals, Progress, Ask. Everything else is grouped
              exactly as the mobile "More" sheet groups it, so the two surfaces
              share a single mental model and identical naming. */}
          <nav className="flex-1 space-y-0.5" aria-label="Member navigation">
            <NavLink to="/app" end {...prefetchHandlers("/app")} className={navClass}>
              <Home className="h-4 w-4" aria-hidden /> Today
            </NavLink>
            <NavLink to="/app/meals" {...prefetchHandlers("/app/meals")} className={navClass}>
              <UtensilsCrossed className="h-4 w-4" aria-hidden /> Meals
            </NavLink>
            <NavLink to="/app/progress" {...prefetchHandlers("/app/progress")} className={navClass}>
              <LineChart className="h-4 w-4" aria-hidden /> Progress
            </NavLink>
            <NavLink to="/app/ask" {...prefetchHandlers("/app/ask")} className={navClass}>
              <MessageCircleQuestion className="h-4 w-4" aria-hidden /> Ask
            </NavLink>

            <p className="label-caps text-white/30 px-[10px] pt-4 pb-1" id="nav-group-learn">
              Learn &amp; tools
            </p>
            <NavLink to="/app/learn" {...prefetchHandlers("/app/learn")} className={navClass}>
              <BookOpen className="h-4 w-4" aria-hidden /> Learn
            </NavLink>
            <NavLink to="/app/library" {...prefetchHandlers("/app/library")} className={navClass}>
              <Library className="h-4 w-4" aria-hidden /> Library
            </NavLink>
            <NavLink to="/app/workouts" {...prefetchHandlers("/app/workouts")} className={navClass}>
              <Activity className="h-4 w-4" aria-hidden /> Workouts
            </NavLink>

            <p className="label-caps text-white/30 px-[10px] pt-4 pb-1" id="nav-group-account">
              Account &amp; help
            </p>
            <NavLink to="/app/profile" {...prefetchHandlers("/app/profile")} className={navClass}>
              <User className="h-4 w-4" aria-hidden /> Profile
            </NavLink>
            <NavLink to="/app/billing" {...prefetchHandlers("/app/billing")} className={navClass}>
              <CreditCard className="h-4 w-4" aria-hidden /> Billing
            </NavLink>
            <NavLink to="/app/settings" {...prefetchHandlers("/app/settings")} className={navClass}>
              <SettingsIcon className="h-4 w-4" aria-hidden /> Settings
            </NavLink>
            <NavLink to="/app/support" {...prefetchHandlers("/app/support")} className={navClass}>
              <LifeBuoy className="h-4 w-4" aria-hidden /> Support
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navClass}>
                <Shield className="h-4 w-4" aria-hidden /> Admin
              </NavLink>
            )}
          </nav>


          <div className="border-t border-white/10 pt-3 mt-3 space-y-2">
            <p className="text-[10px] text-white/40 truncate">{user?.email}</p>
            <span className="inline-block bg-accent/15 border border-accent/30 text-accent text-[10px] px-2 py-0.5 rounded-full">
              {levelName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start text-white/50 hover:text-white hover:bg-white/10 text-xs px-2"
            >
              <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
            </Button>
          </div>
        </aside>

        <nav
          aria-label="Primary"
          className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 flex justify-around py-1.5 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] px-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] keyboard-hide"
        >
          <NavLink to="/app" end {...prefetchHandlers("/app")} className={mobileNavClass}>
            <Home className="h-5 w-5" aria-hidden /> Today
          </NavLink>
          <NavLink to="/app/meals" {...prefetchHandlers("/app/meals")} className={mobileNavClass}>
            <UtensilsCrossed className="h-5 w-5" aria-hidden /> Meals
          </NavLink>
          <NavLink to="/app/progress" {...prefetchHandlers("/app/progress")} className={mobileNavClass}>
            <LineChart className="h-5 w-5" aria-hidden /> Progress
          </NavLink>
          <NavLink to="/app/ask" {...prefetchHandlers("/app/ask")} className={mobileNavClass}>
            <MessageCircleQuestion className="h-5 w-5" aria-hidden /> Ask
          </NavLink>
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger
              aria-label="More destinations"
              className={`${mobileNavClass({ isActive: false })} min-h-11 min-w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg`}
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden /> More
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[80dvh] overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle>More</SheetTitle>
              </SheetHeader>
              {/* Prompt 6 A2 — same groups, same names as the desktop sidebar. */}
              {MORE_GROUPS.map((group) => (
                <div key={group.title} className="pt-4">
                  <p className="label-caps text-tertiary-fg mb-2">{group.title}</p>
                  <nav aria-label={group.title} className="grid grid-cols-3 gap-2">
                    {group.items
                      .filter((item) => item.adminOnly !== true || isAdmin)
                      .map((item) => (
                        <SheetClose asChild key={item.to + item.label}>
                          <NavLink
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                              `flex flex-col items-center justify-center gap-1 rounded-xl p-3 min-h-[64px] text-[12px] text-center transition-colors ${
                                isActive
                                  ? "bg-primary-muted text-primary"
                                  : "bg-muted/40 text-secondary-fg hover:bg-muted"
                              }`
                            }
                          >
                            <item.icon className="h-5 w-5" aria-hidden />
                            <span className="font-medium">{item.label}</span>
                          </NavLink>
                        </SheetClose>
                      ))}
                  </nav>
                </div>
              ))}
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full text-secondary-fg mt-5 mb-6 min-h-11"
              >
                <LogOut className="h-4 w-4 mr-2" aria-hidden /> Sign out
              </Button>
            </SheetContent>
          </Sheet>
        </nav>


        {/* Main */}
        <main id="app-main" tabIndex={-1} className="flex-1 px-4 lg:px-8 py-6 lg:py-8 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:pb-10 max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full safe-x">
          {/* Mobile notifications entry point — the sidebar bell is lg-only. */}
          <div className="lg:hidden flex justify-end -mt-2 mb-2">
            <NotificationsBell />
          </div>
          {/* A lazily loaded page renders a page-shaped skeleton, never a blank
              content region. Keyed by pathname so the skeleton switches shape
              with the destination. */}
          <Suspense key={location.pathname} fallback={<RouteSkeleton variant={skeletonVariant} />}>
            <Outlet />
          </Suspense>
        </main>

      </div>
    </div>
  );
}
