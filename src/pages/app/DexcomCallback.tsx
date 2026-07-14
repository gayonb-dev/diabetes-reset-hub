// Handles Dexcom OAuth redirect at /app/settings/dexcom/callback.
// Reads ?code=&state= from the URL, calls dexcom-auth `exchange`, then redirects
// to /app/settings with a toast reflecting success or failure.

import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function DexcomCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = params.get("code");
    const state = params.get("state");
    const err = params.get("error");
    if (err || !code || !state) {
      toast({
        title: "Dexcom connection cancelled",
        description: err ?? "Missing code or state — please try again.",
        variant: "destructive",
      });
      navigate("/app/settings", { replace: true });
      return;
    }
    (async () => {
      const { data, error } = await supabase.functions.invoke("dexcom-auth", {
        body: { action: "exchange", code, state },
      });
      if (error || !data?.ok) {
        toast({
          title: "Couldn't connect Dexcom",
          description:
            (data as { error?: string } | undefined)?.error ?? error?.message ?? "Please retry.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Dexcom connected",
          description: "First readings are syncing now. They'll appear in Progress shortly.",
        });
      }
      navigate("/app/settings", { replace: true });
    })();
  }, [params, navigate]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Connecting your Dexcom account…
      </div>
    </div>
  );
}
