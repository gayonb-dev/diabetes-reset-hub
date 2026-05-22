import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, CreditCard, MessageSquare, BookOpen, Megaphone, UserPlus, BarChart3 } from "lucide-react";

const tabs = [
  { to: "/admin", label: "Legacy", icon: BarChart3, end: true },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/qa-queue", label: "Q&A Queue", icon: MessageSquare },
  { to: "/admin/content", label: "Content", icon: BookOpen },
  { to: "/admin/broadcasts", label: "Broadcasts", icon: Megaphone },
  { to: "/admin/waitlist", label: "Coaching Waitlist", icon: UserPlus },
];

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-lg">Admin</h1>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
        <nav className="container mx-auto px-4 overflow-x-auto">
          <div className="flex gap-1 pb-2 min-w-max">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
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
        <Outlet />
      </main>
    </div>
  );
}
