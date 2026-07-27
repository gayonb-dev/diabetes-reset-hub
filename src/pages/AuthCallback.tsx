import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

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

    const waitForSession = async (timeoutMs = 3000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const { data } = await supabase.auth.getSession();
        if (data.session) return true;
        await new Promise((r) => setTimeout(r, 50));
      }
      return false;
    };

    (async () => {
      // New flow: token_hash in query string — verify via POST so email
      // scanners that prefetch the GET link can't consume the token.
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (error) {
          navigate("/login?expired=1", { replace: true });
          return;
        }
        // Wait for onAuthStateChange to persist the session before navigating,
        // otherwise AuthGuard renders with stale user=null and bounces to /login.
        const ok = await waitForSession();
        navigate(ok ? next : "/login?expired=1", { replace: true });
        return;
      }

      // Legacy flow: hash-fragment session set by Supabase /verify redirect.
      const ok = await waitForSession();
      navigate(ok ? next : "/login?expired=1", { replace: true });
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
