import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Subscription {
  id: string;
  status: "trialing" | "active" | "past_due" | "cancelled" | "incomplete" | "unpaid";
  trial_end_date: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  day_number: number;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  created_at: string;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  subscription: Subscription | null;
  refreshSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const loadUserData = async (u: User | null) => {
    if (!u) {
      setIsAdmin(false);
      setSubscription(null);
      return;
    }
    const [{ data: roles }, { data: sub }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.id),
      supabase.from("subscriptions").select("*").eq("user_id", u.id).maybeSingle(),
    ]);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    setSubscription((sub as Subscription) ?? null);
  };

  const refreshSubscription = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setSubscription((data as Subscription) ?? null);
  };

  useEffect(() => {
    // 1) Set listener FIRST
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // Defer DB fetches
      if (s?.user) {
        setTimeout(() => loadUserData(s.user), 0);

        // Activity event: login — link to chat anonymous_id when present
        if (event === "SIGNED_IN") {
          setTimeout(async () => {
            const anonId = localStorage.getItem("drm_visitor_id");
            try {
              let profileId: string | null = null;
              if (anonId) {
                const { data: profile } = await supabase
                  .from("visitor_profiles")
                  .select("id")
                  .eq("anonymous_id", anonId)
                  .maybeSingle();
                profileId = profile?.id ?? null;
              }
              await supabase.from("activity_events" as never).insert({
                visitor_profile_id: profileId,
                user_id: s.user.id,
                event_type: "login",
                metadata: {},
              } as never);
            } catch (e) {
              console.warn("login activity event failed", e);
            }
          }, 0);
        }
      } else {
        setIsAdmin(false);
        setSubscription(null);
      }
    });

    // 2) Then check existing session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadUserData(s.user);
      setLoading(false);
    });

    return () => authSub.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider
      value={{ user, session, loading, isAdmin, subscription, refreshSubscription, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
