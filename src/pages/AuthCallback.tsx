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

    (async () => {
      // New flow: token_hash in query string — verify via POST so email
      // scanners that prefetch the GET link can't consume the token.
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (!error) {
          navigate(next, { replace: true });
          return;
        }
        navigate("/login?expired=1", { replace: true });
        return;
      }

      // Legacy flow: hash-fragment session set by Supabase /verify redirect.
      await new Promise((r) => setTimeout(r, 600));
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate(next, { replace: true });
      else navigate("/login?expired=1", { replace: true });
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
