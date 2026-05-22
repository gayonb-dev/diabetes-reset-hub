import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

interface Item {
  id: string;
  type: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string | null;
  hero_image: string | null;
  day_unlock: number;
  sort_order: number;
  is_active: boolean;
}

const empty: Partial<Item> = {
  type: "recipe",
  slug: "",
  title: "",
  summary: "",
  body: "",
  hero_image: "",
  day_unlock: 6,
  sort_order: 0,
  is_active: true,
};

export default function AdminContent() {
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("content_items")
      .select("*")
      .order("day_unlock")
      .order("sort_order");
    setRows((data as Item[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing?.title?.trim() || !editing.slug?.trim() || !editing.type) {
      toast.error("Title, slug, and type required");
      return;
    }
    const payload = {
      type: editing.type,
      slug: editing.slug.trim(),
      title: editing.title.trim(),
      summary: editing.summary || null,
      body: editing.body || null,
      hero_image: editing.hero_image || null,
      day_unlock: editing.day_unlock ?? 6,
      sort_order: editing.sort_order ?? 0,
      is_active: editing.is_active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("content_items").update(payload).eq("id", editing.id)
      : await supabase.from("content_items").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      setEditing(null);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("content_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  if (loading) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mt-12" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{rows.length} content items</p>
        <Button onClick={() => setEditing({ ...empty })} className="bg-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" /> New Item
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Type</th>
              <th className="p-3">Day</th>
              <th className="p-3">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">/{r.slug}</p>
                </td>
                <td className="p-3">{r.type}</td>
                <td className="p-3">{r.day_unlock}</td>
                <td className="p-3">{r.is_active ? "✓" : "—"}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No content yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-heading font-bold text-xl">
              {editing.id ? "Edit" : "New"} Content Item
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={editing.type}
                  onValueChange={(v) => setEditing({ ...editing, type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recipe">Recipe</SelectItem>
                    <SelectItem value="workout">Movement</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="mini-challenge">Mini Challenge</SelectItem>
                    <SelectItem value="resource">Resource</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Day Unlock</Label>
                <Input
                  type="number"
                  value={editing.day_unlock ?? 6}
                  onChange={(e) => setEditing({ ...editing, day_unlock: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label>Title</Label>
              <Input
                value={editing.title || ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={editing.slug || ""}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                placeholder="kebab-case-slug"
              />
            </div>
            <div>
              <Label>Summary</Label>
              <Textarea
                value={editing.summary || ""}
                onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Body (markdown)</Label>
              <Textarea
                value={editing.body || ""}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                rows={8}
              />
            </div>
            <div>
              <Label>Hero Image URL</Label>
              <Input
                value={editing.hero_image || ""}
                onChange={(e) => setEditing({ ...editing, hero_image: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-end gap-2">
                <input
                  id="active"
                  type="checkbox"
                  checked={editing.is_active ?? true}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} className="bg-primary text-primary-foreground">Save</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
