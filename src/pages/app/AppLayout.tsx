import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Home,
  BookOpen,
  MessageCircleQuestion,
  LineChart,
  Settings,
  LogOut,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function navClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
    isActive
      ? "bg-primary/10 text-primary font-medium"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
  }`;
}

function mobileNavClass({ isActive }: { isActive: boolean }) {
  return `flex flex-col items-center text-[11px] p-2 ${
    isActive ? "text-primary" : "text-muted-foreground"
  }`;
}

export default function AppLayout() {
  const { signOut, subscription, isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const trialBanner =
    subscription?.status === "trialing" &&
    subscription.trial_end_date && (
      <div className="bg-muted/60 text-foreground px-4 py-2 text-center text-xs">
        Trial — renews at $67/mo on{" "}
        {new Date(subscription.trial_end_date).toLocaleDateString()}.{" "}
        <Link to="/app/billing" className="text-primary underline">
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
        {/* Sidebar */}
        <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card/40 p-4">
          <Link
            to="/app"
            className="font-heading font-semibold text-base text-foreground mb-6 px-2"
          >
            Diabetes Reset
          </Link>
          <nav className="flex-1 space-y-1">
            <NavLink to="/app" end className={navClass}>
              <Home className="h-4 w-4" /> Today
            </NavLink>
            <NavLink to="/app/progress" className={navClass}>
              <LineChart className="h-4 w-4" /> Progress
            </NavLink>
            <NavLink to="/app/library" className={navClass}>
              <BookOpen className="h-4 w-4" /> Library
            </NavLink>
            <NavLink to="/app/ask" className={navClass}>
              <MessageCircleQuestion className="h-4 w-4" /> Ask
            </NavLink>
            <NavLink to="/app/coaching-waitlist" className={navClass}>
              <Sparkles className="h-4 w-4" /> 1:1 Coaching
            </NavLink>
            <NavLink to="/app/billing" className={navClass}>
              <Settings className="h-4 w-4" /> Billing
            </NavLink>

            {isAdmin && (
              <NavLink to="/admin" className={navClass}>
                <Shield className="h-4 w-4" /> Admin
              </NavLink>
            )}
          </nav>
          <div className="border-t border-border pt-3 mt-3">
            <p className="text-[11px] text-muted-foreground truncate px-2 mb-1">
              {user?.email}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start text-muted-foreground text-xs"
            >
              <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
            </Button>
          </div>
        </aside>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 flex justify-around py-1.5">
          <NavLink to="/app" end className={mobileNavClass}>
            <Home className="h-5 w-5" />
            Today
          </NavLink>
          <NavLink to="/app/progress" className={mobileNavClass}>
            <LineChart className="h-5 w-5" />
            Progress
          </NavLink>
          <NavLink to="/app/library" className={mobileNavClass}>
            <BookOpen className="h-5 w-5" />
            Library
          </NavLink>
          <NavLink to="/app/ask" className={mobileNavClass}>
            <MessageCircleQuestion className="h-5 w-5" />
            Ask
          </NavLink>
          <NavLink to="/app/billing" className={mobileNavClass}>
            <Settings className="h-5 w-5" />
            Billing
          </NavLink>
        </div>

        {/* Main */}
        <main className="flex-1 px-4 md:px-8 py-6 md:py-10 pb-24 md:pb-10 max-w-3xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
