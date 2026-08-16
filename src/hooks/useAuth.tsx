import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { FALLBACK_TIMEZONE, resolveTimeZone } from "@/lib/calendarDay";

interface Subscription {
  id: string;
  status: "trialing" | "active" | "past_due" | "cancelled" | "incomplete" | "unpaid";
  trial_end_date: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  /** B5. First verified payment failure of the current episode; starts grace. */
  grace_started_at: string | null;
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
  /** Member's IANA zone (profiles.timezone), already fallback-resolved. */
  timezone: string;
  subscription: Subscription | null;
  refreshAuthState: () => Promise<boolean>;
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
  const [timezone, setTimezone] = useState<string>(FALLBACK_TIMEZONE);

  const loadUserData = useCallback(async (u: User | null) => {
    if (!u) {
      setIsAdmin(false);
      setSubscription(null);
      setTimezone(FALLBACK_TIMEZONE);
      return;
    }
    const [{ data: roles }, { data: sub }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.id),
      supabase.from("subscriptions").select("*").eq("user_id", u.id).maybeSingle(),
      supabase.from("profiles").select("timezone").eq("user_id", u.id).maybeSingle(),
    ]);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    setSubscription((sub as Subscription) ?? null);

    // Auto-capture IANA timezone on first authenticated load (zero effort).
    try {
      const currentTz = (prof as { timezone?: string | null } | null)?.timezone ?? null;
      if (currentTz) {
        setTimezone(resolveTimeZone(currentTz));
      } else {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(resolveTimeZone(detected));
        if (detected) {
          await supabase.from("profiles").update({ timezone: detected } as never).eq("user_id", u.id);
        }
      }
    } catch (e) {
      console.warn("timezone auto-capture failed", e);
    }
  }, []);

  const refreshAuthState = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setSubscription(null);
        return false;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setSubscription(null);
        return false;
      }

      setSession(sessionData.session);
      setUser(userData.user);
      await loadUserData(userData.user);
      return true;
    } finally {
      setLoading(false);
    }
  }, [loadUserData]);


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
    let lastUserId: string | null = null;
    let loginLogged = false;

    // 1) Set listener FIRST
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, s) => {
      console.warn("[auth-debug] onAuthStateChange", {
        event,
        hasSession: !!s,
        hasUser: !!s?.user,
        userId: s?.user?.id ?? null,
      });


      // Avoid churning user/session state on TOKEN_REFRESHED (fired on every
      // tab focus). Otherwise components that key effects off `user` reset
      // their in-progress state (selections, form input) whenever the user
      // tabs away and comes back.
      setSession((prev) => (prev?.access_token === s?.access_token ? prev : s));
      setUser((prev) => (prev?.id === s?.user?.id ? prev : (s?.user ?? null)));

      // Ignore noisy events that fire on tab focus / token refresh. They
      // would otherwise flip loading=true and re-fetch user data, causing
      // the whole app to flash a spinner whenever the user returns to the
      // tab and dropping in-progress UI state.
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;

      if (s?.user) {
        const sameUser = lastUserId === s.user.id;
        lastUserId = s.user.id;

        if (!sameUser) {
          // Only show loading & re-fetch when the signed-in user actually
          // changes (real sign-in / account switch).
          setLoading(true);
          loadUserData(s.user).finally(() => setLoading(false));
        }

        // Activity event: login — only once per real sign-in
        if (event === "SIGNED_IN" && !loginLogged) {
          loginLogged = true;
          setTimeout(async () => {
            try {
              // P1: no legacy visitor UUID. Login events are keyed to the
              // verified user only; anonymous chat sessions are merged
              // explicitly through the visitor-session merge action.
              await supabase.from("activity_events" as never).insert({
                visitor_profile_id: null,
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
        lastUserId = null;
        loginLogged = false;
        setIsAdmin(false);
        setSubscription(null);
      }
    });

    // 2) Then check existing session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        lastUserId = s.user.id;
        loginLogged = true; // existing session — don't log a new login
        await loadUserData(s.user);
      }
      setLoading(false);
    });

    return () => authSub.unsubscribe();
  }, [loadUserData]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider
      value={{ user, session, loading, isAdmin, timezone, subscription, refreshAuthState, refreshSubscription, signOut }}
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
