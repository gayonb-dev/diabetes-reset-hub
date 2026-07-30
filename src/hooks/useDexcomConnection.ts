import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface DexcomStatus {
  connected: boolean;
  environment: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
}

/**
 * supabase.functions.invoke() collapses non-2xx responses into a generic
 * "Edge Function returned a non-2xx status code" error and hides the body on
 * `error.context` (a Response). Pull the real message out so failures are
 * visible to the member instead of silently doing nothing.
 */
async function readFunctionError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.text === "function") {
    try {
      const raw = await ctx.text();
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const msg = parsed?.error ?? parsed?.message;
          if (msg) return typeof msg === "string" ? msg : JSON.stringify(msg);
        } catch {
          // not JSON — fall through to the raw text
        }
        return raw.slice(0, 400);
      }
    } catch {
      // ignore and fall back to the error message
    }
  }
  return (error as Error)?.message || "Something went wrong.";
}

export function useDexcomConnection() {
  const [status, setStatus] = useState<DexcomStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("dexcom-auth", {
      body: { action: "status" },
    });
    if (!error) setStatus(data as DexcomStatus);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = useCallback(async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("dexcom-auth", {
        body: { action: "authorize_url" },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url as string;
        return;
      }
      toast({
        variant: "destructive",
        title: "Couldn't connect Dexcom",
        description: "Could not start Dexcom connection — please contact support.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn't connect Dexcom",
        description: await readFunctionError(e),
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const syncNow = useCallback(async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("dexcom-auth", {
        body: { action: "sync_now" },
      });
      if (error) throw error;
      await refresh();
      toast({ title: "Dexcom synced", description: "Your latest readings are up to date." });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: await readFunctionError(e),
      });
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const disconnect = useCallback(async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("dexcom-auth", {
        body: { action: "disconnect" },
      });
      if (error) throw error;
      await refresh();
      toast({ title: "Dexcom disconnected" });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn't disconnect",
        description: await readFunctionError(e),
      });
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return { status, loading, busy, refresh, connect, syncNow, disconnect };
}
