import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const hasRunRef = useRef(false);
  const runCountRef = useRef(0);

  useEffect(() => {
    const next = params.get("next") || "/app";
    const token_hash = params.get("token_hash");
    const type = params.get("type") as
      | "magiclink"
      | "recovery"
      | "signup"
      | "invite"
      | "email"
      | null;

    const safeNext = /^\/(?!\/)/.test(next) ? next : "/app";

    runCountRef.current += 1;
    console.warn("[auth-debug] AuthCallback effect entry", {
      run: runCountRef.current,
      alreadyRan: hasRunRef.current,
      hasTokenHash: !!token_hash,
      type,
      safeNext,
    });

    // Magic-link tokens are single-use: a duplicate effect run would consume or
    // fail the token and bounce a already-successful login. Run exactly once.
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const navigateWithDebug = (target: string, reason: string) => {
      console.warn("[auth-debug] AuthCallback navigate", { target, reason });
      navigate(target, { replace: true });
    };

    const markCallbackComplete = () => {
      try {
        window.sessionStorage.setItem("drm_auth_callback_completed_at", String(Date.now()));
      } catch {}
    };

    const waitForVerifiedSession = async (timeoutMs = 8000) => {
      const start = Date.now();
      let attempt = 0;
      let lastHasSession = false;
      let lastHasUser = false;
      let lastError: string | null = null;
      while (Date.now() - start < timeoutMs) {
        attempt += 1;
        const { data: sessionData } = await supabase.auth.getSession();
        lastHasSession = !!sessionData.session;
        let hasUser = false;
        if (sessionData.session) {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          hasUser = !userError && !!userData.user;
          lastError = userError?.message ?? null;
          lastHasUser = hasUser;
          if (hasUser) {
            console.warn("[auth-debug] waitForVerifiedSession poll", {
              attempt,
              elapsedMs: Date.now() - start,
              hasSession: true,
              hasUser: true,
              userError: null,
            });
            console.warn("[auth-debug] waitForVerifiedSession success", {
              attempt,
              elapsedMs: Date.now() - start,
            });
            return true;
          }
        }
        console.warn("[auth-debug] waitForVerifiedSession poll", {
          attempt,
          elapsedMs: Date.now() - start,
          hasSession: lastHasSession,
          hasUser,
          userError: lastError,
        });
        await new Promise((r) => setTimeout(r, 100));
      }
      console.warn("[auth-debug] waitForVerifiedSession", {
        reason: "timed out",
        totalElapsedMs: Date.now() - start,
        attempts: attempt,
        lastHasSession,
        lastHasUser,
        lastError,
      });
      return false;
    };

    (async () => {
      // New flow: token_hash in query string — verify via POST so email
      // scanners that prefetch the GET link can't consume the token.
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        console.warn("[auth-debug] verifyOtp result", {
          run: runCountRef.current,
          ok: !error,
          error: error?.message ?? null,
        });
        if (error) {
          // A "used token" error with a live session means this login already
          // succeeded — treat it as success rather than expiring it.
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            markCallbackComplete();
            navigateWithDebug(safeNext, "verifyOtp error but live session (token already consumed)");
            return;
          }
          navigateWithDebug("/login?expired=1", "verifyOtp error and no session");
          return;
        }
        // Wait for onAuthStateChange to persist the session before navigating,
        // otherwise AuthGuard renders with stale user=null and bounces to /login.
        const ok = await waitForVerifiedSession();
        if (ok) markCallbackComplete();
        navigateWithDebug(
          ok ? safeNext : "/login?expired=1",
          ok ? "token_hash verified + session confirmed" : "token_hash verified but session wait timed out",
        );
        return;
      }

      // Legacy flow: hash-fragment session set by Supabase /verify redirect.
      const ok = await waitForVerifiedSession();
      if (ok) markCallbackComplete();
      navigateWithDebug(
        ok ? safeNext : "/login?expired=1",
        ok ? "legacy hash flow session confirmed" : "legacy hash flow session wait timed out",
      );
    })();
  }, [navigate, params]);


  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-muted-foreground">Logging you in...</p>
      </div>
    </div>
  );
}
