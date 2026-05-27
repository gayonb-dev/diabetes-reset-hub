import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Home,
  BookOpen,
  MessageCircleQuestion,
  LineChart,
  Activity,
  UtensilsCrossed,
  Menu,
  LogOut,
  Shield,
  LifeBuoy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Vita } from "@/components/vita/Vita";

function navClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
    isActive
      ? "bg-white/15 text-white font-medium"
      : "text-white/60 hover:text-white hover:bg-white/8"
  }`;
}

function mobileNavClass({ isActive }: { isActive: boolean }) {
  return `flex flex-col items-center text-[10px] gap-0.5 p-2 ${
    isActive ? "text-primary" : "text-tertiary-fg"
  }`;
}

export default function AppLayout() {
  const { signOut, subscription, isAdmin, user } = useAuth();
  const navigate = useNavigate();

  // TODO: pull these from real data later
  const streakDays = 12;
  const levelName = "Level 2: The Builder";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const trialBanner =
    subscription?.status === "trialing" &&
    subscription.trial_end_date && (
      <div className="bg-accent-muted text-foreground px-4 py-2 text-center text-xs">
        Trial — renews at $67/mo on{" "}
        {new Date(subscription.trial_end_date).toLocaleDateString()}.{" "}
        <Link to="/app/billing" className="text-primary underline font-medium">
          Manage
        </Link>
      </div>
    );

  const pastDueBanner = subscription?.status === "past_due" && (
    <div className="bg-destructive/10 text-destructive px-4 py-2 text-center text-xs font-medium">
      Payment failed.{" "}
      <Link to="/app/billing" className="underline">
        Update card
      </Link>{" "}
      to keep access.
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {trialBanner}
      {pastDueBanner}
      <div className="flex flex-1">
        {/* Sidebar — dark green */}
        <aside className="hidden md:flex w-[240px] flex-col bg-sidebar text-sidebar-foreground p-4 shrink-0">
          <Link to="/app" className="flex items-center gap-3 mb-4">
            <Vita size={32} className="shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-white/35">Diabetes Reset</p>
              <p className="text-base font-semibold text-white">Method</p>
            </div>
          </Link>

          {/* Streak badge */}
          <div className="bg-accent/15 border border-accent/30 rounded-lg px-3 py-2 mb-5">
            <p className="text-lg font-semibold text-accent leading-none">🔥 {streakDays}</p>
            <p className="text-[10px] text-white/45 mt-1">day streak</p>
          </div>

          <nav className="flex-1 space-y-0.5">
            <NavLink to="/app" end className={navClass}>
              <Home className="h-4 w-4" /> Today
            </NavLink>
            <NavLink to="/app/progress" className={navClass}>
              <LineChart className="h-4 w-4" /> Progress
            </NavLink>
            <NavLink to="/app/library" className={navClass}>
              <BookOpen className="h-4 w-4" /> Learn
            </NavLink>
            <NavLink to="/app/library?tab=workouts" className={navClass}>
              <Activity className="h-4 w-4" /> Workouts
            </NavLink>
            <NavLink to="/app/library?tab=meals" className={navClass}>
              <UtensilsCrossed className="h-4 w-4" /> Meals
            </NavLink>
            <NavLink to="/app/ask" className={navClass}>
              <MessageCircleQuestion className="h-4 w-4" /> Ask
            </NavLink>
            <NavLink to="/app/settings" className={navClass}>
              <Menu className="h-4 w-4" /> Settings
            </NavLink>
            <a
              href="mailto:support@diabetesresetmethod.com?subject=App%20Support%20Request"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/60 hover:text-white hover:bg-white/8 transition-colors"
            >
              <LifeBuoy className="h-4 w-4" /> Get Support
            </a>
            {isAdmin && (
              <NavLink to="/admin" className={navClass}>
                <Shield className="h-4 w-4" /> Admin
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

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 flex justify-around py-1.5">
          <NavLink to="/app" end className={mobileNavClass}>
            <Home className="h-5 w-5" /> Today
          </NavLink>
          <NavLink to="/app/progress" className={mobileNavClass}>
            <LineChart className="h-5 w-5" /> Progress
          </NavLink>
          <NavLink to="/app/library" className={mobileNavClass}>
            <BookOpen className="h-5 w-5" /> Learn
          </NavLink>
          <NavLink to="/app/ask" className={mobileNavClass}>
            <MessageCircleQuestion className="h-5 w-5" /> Ask
          </NavLink>
          <NavLink to="/app/settings" className={mobileNavClass}>
            <Menu className="h-5 w-5" /> Settings
          </NavLink>
        </div>

        {/* Main */}
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-10 max-w-3xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
