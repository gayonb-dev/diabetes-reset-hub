import {
  Activity,
  BookOpen,
  CreditCard,
  Home,
  LifeBuoy,
  Library,
  Settings as SettingsIcon,
  Shield,
  User,
  Users,
} from "lucide-react";

export type MoreNavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
  adminOnly?: boolean;
};

/**
 * Prompt 6 A2 — the single source of truth for the grouped "More" destinations.
 * The desktop sidebar renders the same groups in the same order with the same
 * labels, so a member who learns one surface already knows the other. Every
 * entry points at an existing route: nothing here creates a duplicate.
 */
export const MORE_GROUPS: { title: string; items: MoreNavItem[] }[] = [
  {
    title: "Learn & tools",
    items: [
      { to: "/app/learn", label: "Learn", icon: BookOpen },
      { to: "/app/library", label: "Library", icon: Library },
      { to: "/app/workouts", label: "Workouts", icon: Activity },
    ],
  },
  {
    title: "Community",
    items: [{ to: "/app/ask", label: "Community", icon: Users }],
  },
  {
    title: "Account & help",
    items: [
      { to: "/app/profile", label: "Profile", icon: User },
      { to: "/app/billing", label: "Billing", icon: CreditCard },
      { to: "/app/settings", label: "Settings", icon: SettingsIcon },
      { to: "/app/support", label: "Support", icon: LifeBuoy },
      { to: "/admin", label: "Admin", icon: Shield, adminOnly: true },
    ],
  },
];
