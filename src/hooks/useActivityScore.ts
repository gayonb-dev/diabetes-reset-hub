import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LedgerEntry {
  id: string;
  kind: string;
  points: number;
  detail: string | null;
  created_at: string;
}

/**
 * G. One ledger, one derived total. Every Activity Score surface reads this
 * hook so no two surfaces can disagree.
 */
export function useActivityScore() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("points_ledger")
      .select("id,kind,points,detail,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error || !data) {
      setEntries([]);
      setTotal(null);
      return;
    }
    const rows = data as LedgerEntry[];
    setEntries(rows);
    setTotal(rows.reduce((sum, r) => sum + (r.points ?? 0), 0));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { total, entries, refresh };
}
