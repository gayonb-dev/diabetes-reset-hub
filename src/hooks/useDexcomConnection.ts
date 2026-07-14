import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DexcomStatus {
  connected: boolean;
  environment: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
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
      if (data?.url) window.location.href = data.url as string;
    } finally {
      setBusy(false);
    }
  }, []);

  const syncNow = useCallback(async () => {
    setBusy(true);
    try {
      await supabase.functions.invoke("dexcom-auth", { body: { action: "sync_now" } });
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const disconnect = useCallback(async () => {
    setBusy(true);
    try {
      await supabase.functions.invoke("dexcom-auth", { body: { action: "disconnect" } });
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return { status, loading, busy, refresh, connect, syncNow, disconnect };
}
