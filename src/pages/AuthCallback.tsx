import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    // Supabase handles the token via the URL hash on its own; we just wait
    // briefly and then route to `next`.
    const next = params.get("next") || "/app";
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate(next, { replace: true });
      else navigate("/login?expired=1", { replace: true });
    }, 800);
    return () => clearTimeout(t);
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-muted-foreground">Logging you in...</p>
      </div>
    </div>
  );
}
