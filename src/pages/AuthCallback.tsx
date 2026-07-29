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
    runCountRef.current += 1;
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

    console.info("[auth-debug] AuthCallback effect entry", {
      run: runCountRef.current,
      alreadyRan: hasRunRef.current,
      hasTokenHash: !!token_hash,
      type,
      safeNext,
    });

    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const navigateWithDebug = (target: string, reason: string) => {
      console.info("[auth-debug] AuthCallback navigate", { target, reason });
      navigate(target, { replace: true });
    };

    const markCallbackComplete = () => {
      try {
        window.sessionStorage.setItem("drm_auth_callback_completed_at", String(Date.now()));
      } catch {}
    };

    const waitForVerifiedSession = async (timeoutMs = 8000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (!userError && userData.user) return true;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    };

    (async () => {
      // New flow: token_hash in query string — verify via POST so email
      // scanners that prefetch the GET link can't consume the token.
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        console.info("[auth-debug] AuthCallback verifyOtp result", {
          ok: !error,
          errorMessage: error?.message ?? null,
        });
        if (error) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            markCallbackComplete();
            navigateWithDebug(safeNext, "verifyOtp error but live session exists");
            return;
          }
          navigateWithDebug("/login?expired=1", "verifyOtp error and no live session");
          return;
        }
        // Wait for onAuthStateChange to persist the session before navigating,
        // otherwise AuthGuard renders with stale user=null and bounces to /login.
        const ok = await waitForVerifiedSession();
        if (ok) markCallbackComplete();
        navigateWithDebug(ok ? safeNext : "/login?expired=1", ok ? "verified session ready" : "verified session timed out");
        return;
      }

      // Legacy flow: hash-fragment session set by Supabase /verify redirect.
      const ok = await waitForVerifiedSession();
      if (ok) markCallbackComplete();
      navigateWithDebug(ok ? safeNext : "/login?expired=1", ok ? "legacy session ready" : "legacy session timed out");
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
