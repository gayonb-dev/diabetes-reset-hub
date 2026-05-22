import { ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Home,
  BookOpen,
  MessageCircleQuestion,
  Settings,
  LogOut,
  Calendar,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";


function navClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-foreground hover:bg-primary/10"
  }`;
}

export default function AppLayout() {
  const { signOut, subscription, isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const trialBanner = subscription?.status === "trialing" && subscription.trial_end_date && (
    <div className="bg-secondary/60 text-secondary-foreground px-4 py-2 text-center text-sm font-medium">
      Trial active — renews at $67/mo on{" "}
      {new Date(subscription.trial_end_date).toLocaleDateString()}.{" "}
      <Link to="/app/billing" className="underline font-bold">
        Manage
      </Link>
    </div>
  );

  const pastDueBanner = subscription?.status === "past_due" && (
    <div className="bg-destructive/10 text-destructive px-4 py-2 text-center text-sm font-medium">
      Payment failed. <Link to="/app/billing" className="underline font-bold">Update card</Link> to keep access.
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {trialBanner}
      {pastDueBanner}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-card p-4">
          <Link to="/app" className="font-heading font-bold text-lg text-primary mb-6 px-2">
            Diabetes Reset
          </Link>
          <nav className="flex-1 space-y-1">
            <NavLink to="/app" end className={navClass}>
              <Home className="h-4 w-4" /> Dashboard
            </NavLink>
            <NavLink to="/app/today" className={navClass}>
              <Calendar className="h-4 w-4" /> Today
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
          <div className="border-t pt-3 mt-3">
            <p className="text-xs text-muted-foreground truncate px-2 mb-2">{user?.email}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start text-muted-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </aside>

        {/* Mobile top nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-40 flex justify-around py-2">
          <NavLink to="/app" end className="flex flex-col items-center text-xs p-2">
            <Home className="h-5 w-5" />
            Home
          </NavLink>
          <NavLink to="/app/today" className="flex flex-col items-center text-xs p-2">
            <Calendar className="h-5 w-5" />
            Today
          </NavLink>
          <NavLink to="/app/library" className="flex flex-col items-center text-xs p-2">
            <BookOpen className="h-5 w-5" />
            Library
          </NavLink>
          <NavLink to="/app/ask" className="flex flex-col items-center text-xs p-2">
            <MessageCircleQuestion className="h-5 w-5" />
            Ask
          </NavLink>
          <NavLink to="/app/billing" className="flex flex-col items-center text-xs p-2">
            <Settings className="h-5 w-5" />
            Billing
          </NavLink>
        </div>

        {/* Main */}
        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 max-w-5xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
