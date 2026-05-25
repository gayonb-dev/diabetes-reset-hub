import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Row {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  why_now: string | null;
  status: string;
  eligible_at: string | null;
  created_at: string;
}

const statuses = ["pending", "contacted", "enrolled", "declined"];

export default function AdminWaitlist() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // Audited PHI read — why_now / phone are PHI-adjacent.
    const { data, error } = await supabase.functions.invoke("read-phi-data", {
      body: {
        table: "coaching_waitlist",
        reason: "Admin waitlist review",
        order_by: { column: "created_at", ascending: false },
      },
    });
    if (error) toast.error(error.message);
    setRows(((data?.rows as Row[]) || []));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("coaching_waitlist").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      load();
    }
  };

  if (loading) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mt-12" />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{rows.length} on coaching waitlist</p>
      {rows.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="font-heading font-bold">{r.full_name}</p>
              <p className="text-sm text-muted-foreground">{r.email}</p>
              {r.phone && <p className="text-sm text-muted-foreground">{r.phone}</p>}
              {r.why_now && (
                <p className="text-sm mt-2 italic text-muted-foreground">"{r.why_now}"</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Joined {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
            <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      ))}
      {rows.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No one on the waitlist yet.</p>
      )}
    </div>
  );
}
