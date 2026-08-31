import { Suspense, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import RouteSkeleton from "@/components/system/RouteSkeleton";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  CreditCard,
  MessageSquare,
  BookOpen,
  Megaphone,
  UserPlus,
  BarChart3,
  HeartHandshake,
  FileText,
  Shield,
  ShieldCheck,
  Monitor,
  LifeBuoy,
  ArrowLeft,
  X,
} from "lucide-react";

/**
 * Batch 2 Part F — active admin navigation.
 * Top Customers, Intake Forms and Challenge Progress are retired from active
 * navigation; their historical records are retained in the database.
 */
const tabs = [
  { to: "/admin", label: "Legacy", icon: BarChart3, end: true },
  { to: "/admin/digest", label: "Daily Digest", icon: FileText },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/qa-queue", label: "Q&A Queue", icon: MessageSquare },
  { to: "/admin/support", label: "Support Queue", icon: LifeBuoy },
  { to: "/admin/community", label: "Community", icon: MessageSquare },
  { to: "/admin/content", label: "Content", icon: BookOpen },
  { to: "/admin/broadcasts", label: "Broadcasts", icon: Megaphone },
  { to: "/admin/coaching-interest", label: "Coaching Interest", icon: HeartHandshake },
  { to: "/admin/phi-log", label: "PHI Audit", icon: Shield },
];

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  const [showDesktopBanner, setShowDesktopBanner] = useState(true);
  return (
    <div className="min-h-dvh admin-shell">
      {showDesktopBanner && (
        <div className="lg:hidden bg-accent-muted text-accent-foreground border-b border-accent/30 text-xs px-4 py-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5 shrink-0" />
            Best viewed on desktop for the full admin experience.
          </span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setShowDesktopBanner(false)}
            className="h-8 w-8 flex items-center justify-center shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {/* Distinct admin identity strip */}
      <div className="bg-slate-900 text-slate-100 text-[11px] tracking-widest uppercase">
        <div className="container mx-auto px-4 py-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            Admin Console — Internal Use Only
          </span>
          <span className="hidden sm:inline text-slate-400 normal-case tracking-normal">
            Handle member data with care
          </span>
        </div>
      </div>

      <header className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-slate-50/85">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 text-slate-100 flex items-center justify-center shadow-sm">
              <ShieldCheck className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg leading-tight text-slate-900 dark:text-slate-50">
                Admin
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Batch 2 F19 — persistent, functional return to the member app. */}
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <Link to="/app">
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden /> Back to member app
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-slate-600 hover:text-slate-900 dark:text-slate-300 min-h-11"
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
        <nav className="container mx-auto px-4 overflow-x-auto">
          <div className="flex gap-1 pb-2 min-w-max">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${
                    isActive
                      ? "bg-slate-900 text-slate-50 shadow-sm"
                      : "text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800/60"
                  }`
                }
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main className="container mx-auto px-4 py-6">
        {/* Admin pages are lazy too — show an admin-shaped skeleton, not blank. */}
        <Suspense fallback={<RouteSkeleton variant="admin" label="Loading admin page" />}>
          <Outlet />
        </Suspense>
      </main>

    </div>
  );
}
