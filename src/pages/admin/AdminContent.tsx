import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, Edit, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { MINDSET_WEEKS } from "@/data/mindsetWeeks";

/* ============== TYPES ============== */

type SubTask = { task_id: string; task_text: string; order: number };

type DailyAction = {
  id: string;
  day_number: number;
  phase_number: number;
  day_name: string;
  action_title: string;
  action_description: string;
  action_detail_content: Record<string, unknown>;
  action_type: string;
  sub_tasks: SubTask[];
  is_extension_day: boolean;
  learning_objective: string | null;
};

type ContentItem = {
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
  metadata: Record<string, string> | null;
};

const ACTION_TYPES = ["education", "habit", "challenge", "reflection", "measurement"];

function genId() {
  return crypto.randomUUID();
}

const emptyAction = (): Partial<DailyAction> => ({
  day_number: 1,
  phase_number: 1,
  day_name: "",
  action_title: "",
  action_description: "",
  action_detail_content: {},
  action_type: "habit",
  sub_tasks: [],
  is_extension_day: false,
  learning_objective: "",
});

/* ============== ROOT ============== */

export default function AdminContent() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="daily-actions">
        <TabsList>
          <TabsTrigger value="daily-actions">Daily Actions</TabsTrigger>
          <TabsTrigger value="blog">Blog Posts</TabsTrigger>
          <TabsTrigger value="guides">Learn Guides</TabsTrigger>
          <TabsTrigger value="notifications">Notifications Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="daily-actions" className="mt-4">
          <DailyActionsTab />
        </TabsContent>
        <TabsContent value="blog" className="mt-4">
          <ContentItemsTab type="blog" label="Blog Post" />
        </TabsContent>
        <TabsContent value="guides" className="mt-4">
          <ContentItemsTab type="guide" label="Guide" />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <NotificationsPreviewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============== DAILY ACTIONS TAB ============== */

function DailyActionsTab() {
  const [rows, setRows] = useState<DailyAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<DailyAction> | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [extensionFilter, setExtensionFilter] = useState<string>("main");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("daily_actions")
      .select("*")
      .order("is_extension_day")
      .order("day_number");
    setRows((data as unknown as DailyAction[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) => {
    if (extensionFilter === "main" && r.is_extension_day) return false;
    if (extensionFilter === "extension" && !r.is_extension_day) return false;
    if (phaseFilter !== "all" && String(r.phase_number) !== phaseFilter)
      return false;
    return true;
  });

  const save = async () => {
    if (!editing) return;
    if (!editing.action_title?.trim() || !editing.day_name?.trim()) {
      toast.error("Day name and action title are required");
      return;
    }
    if ((editing.action_description?.length ?? 0) > 200) {
      toast.error("Action description must be 200 characters or fewer");
      return;
    }
    const payload = {
      day_number: editing.day_number ?? 1,
      phase_number: editing.phase_number ?? 1,
      day_name: editing.day_name.trim(),
      action_title: editing.action_title.trim(),
      action_description: editing.action_description?.trim() || "",
      action_detail_content: (editing.action_detail_content || {}) as never,
      action_type: editing.action_type || "habit",
      sub_tasks: (editing.sub_tasks || []) as never,
      is_extension_day: editing.is_extension_day ?? false,
      learning_objective: editing.learning_objective || null,
    };
    const { error } = editing.id
      ? await supabase.from("daily_actions").update(payload).eq("id", editing.id)
      : await supabase.from("daily_actions").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      setEditing(null);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this action?")) return;
    const { error } = await supabase.from("daily_actions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  if (loading)
    return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mt-12" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All phases</SelectItem>
              {[1, 2, 3, 4, 5].map((p) => (
                <SelectItem key={p} value={String(p)}>Phase {p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={extensionFilter} onValueChange={setExtensionFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="main">Main program</SelectItem>
              <SelectItem value="extension">Extension days</SelectItem>
              <SelectItem value="all">Both</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{filtered.length} actions</p>
        </div>
        <Button
          onClick={() => setEditing(emptyAction())}
          className="bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-2" /> New Daily Action
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Day</th>
              <th className="p-3">Phase</th>
              <th className="p-3">Day Name / Title</th>
              <th className="p-3">Type</th>
              <th className="p-3">Sub-tasks</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-mono">
                  {r.is_extension_day ? `Ext ${r.day_number}` : r.day_number}
                </td>
                <td className="p-3">{r.phase_number}</td>
                <td className="p-3">
                  <p className="font-medium">{r.day_name}</p>
                  <p className="text-xs text-muted-foreground">{r.action_title}</p>
                </td>
                <td className="p-3 capitalize">{r.action_type}</td>
                <td className="p-3">{(r.sub_tasks || []).length}</td>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No daily actions match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {editing && (
        <DailyActionEditor
          editing={editing}
          setEditing={setEditing}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function DailyActionEditor({
  editing,
  setEditing,
  onCancel,
  onSave,
}: {
  editing: Partial<DailyAction>;
  setEditing: (v: Partial<DailyAction>) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const subTasks = editing.sub_tasks || [];

  const updateSub = (idx: number, text: string) => {
    const next = [...subTasks];
    next[idx] = { ...next[idx], task_text: text };
    setEditing({ ...editing, sub_tasks: next });
  };
  const addSub = () =>
    setEditing({
      ...editing,
      sub_tasks: [
        ...subTasks,
        { task_id: genId(), task_text: "", order: subTasks.length },
      ],
    });
  const removeSub = (idx: number) => {
    const next = subTasks.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i }));
    setEditing({ ...editing, sub_tasks: next });
  };
  const moveSub = (idx: number, dir: -1 | 1) => {
    const next = [...subTasks];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setEditing({ ...editing, sub_tasks: next.map((s, i) => ({ ...s, order: i })) });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        <h3 className="font-heading font-bold text-xl">
          {editing.id ? "Edit" : "New"} Daily Action
        </h3>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Day Number</Label>
            <Input
              type="number"
              value={editing.day_number ?? 1}
              onChange={(e) =>
                setEditing({ ...editing, day_number: parseInt(e.target.value) || 1 })
              }
            />
          </div>
          <div>
            <Label>Phase</Label>
            <Select
              value={String(editing.phase_number ?? 1)}
              onValueChange={(v) => setEditing({ ...editing, phase_number: parseInt(v) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((p) => (
                  <SelectItem key={p} value={String(p)}>Phase {p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Action Type</Label>
            <Select
              value={editing.action_type || "habit"}
              onValueChange={(v) => setEditing({ ...editing, action_type: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Day Name</Label>
          <Input
            value={editing.day_name || ""}
            onChange={(e) => setEditing({ ...editing, day_name: e.target.value })}
            placeholder='e.g. "Day 15: Label Reads"'
          />
        </div>

        <div>
          <Label>Action Title (shown on dashboard card)</Label>
          <Input
            value={editing.action_title || ""}
            onChange={(e) => setEditing({ ...editing, action_title: e.target.value })}
          />
        </div>

        <div>
          <Label>
            Action Description (max 200 chars) —{" "}
            <span className={(editing.action_description?.length ?? 0) > 200 ? "text-destructive" : "text-muted-foreground"}>
              {editing.action_description?.length ?? 0}/200
            </span>
          </Label>
          <Textarea
            value={editing.action_description || ""}
            onChange={(e) =>
              setEditing({ ...editing, action_description: e.target.value })
            }
            rows={3}
          />
        </div>

        <div>
          <Label>Learning Objective</Label>
          <Input
            value={editing.learning_objective || ""}
            onChange={(e) =>
              setEditing({ ...editing, learning_objective: e.target.value })
            }
            placeholder="What the member should understand after completing this"
          />
        </div>

        <div>
          <Label>Action Detail Content (markdown, shown when member opens)</Label>
          <Textarea
            value={
              typeof editing.action_detail_content === "object" &&
              editing.action_detail_content !== null
                ? ((editing.action_detail_content as Record<string, string>).body ?? "")
                : ""
            }
            onChange={(e) =>
              setEditing({
                ...editing,
                action_detail_content: { body: e.target.value },
              })
            }
            rows={8}
          />
        </div>

        {/* Sub-tasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Sub-tasks</Label>
            <Button size="sm" variant="outline" onClick={addSub}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {subTasks.length === 0 && (
              <p className="text-xs text-muted-foreground">No sub-tasks yet.</p>
            )}
            {subTasks.map((st, idx) => (
              <div key={st.task_id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                <Input
                  value={st.task_text}
                  onChange={(e) => updateSub(idx, e.target.value)}
                  placeholder="Sub-task text"
                />
                <Button size="sm" variant="ghost" onClick={() => moveSub(idx, -1)} disabled={idx === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => moveSub(idx, 1)} disabled={idx === subTasks.length - 1}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeSub(idx)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="extension"
            type="checkbox"
            checked={editing.is_extension_day ?? false}
            onChange={(e) =>
              setEditing({ ...editing, is_extension_day: e.target.checked })
            }
          />
          <Label htmlFor="extension">Phase 1 Extension Day</Label>
        </div>

        {/* Preview */}
        <div>
          <Label>Preview — dashboard card</Label>
          <div className="mt-2 rounded-2xl border-[1.5px] border-accent/60 bg-accent-muted p-5">
            <p className="label-caps text-accent mb-2">Today's Action</p>
            <h4 className="font-heading text-xl font-bold text-foreground">
              {editing.action_title || "Untitled action"}
            </h4>
            <p className="text-sm text-secondary-fg mt-2">
              {editing.action_description || "No description yet."}
            </p>
            {(editing.sub_tasks?.length ?? 0) > 0 && (
              <p className="text-[11px] text-accent font-medium mt-2">
                0 of {editing.sub_tasks?.length} sub-tasks completed
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave} className="bg-primary text-primary-foreground">
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ============== CONTENT ITEMS TAB (blog / guide) ============== */

function ContentItemsTab({ type, label }: { type: "blog" | "guide"; label: string }) {
  const [rows, setRows] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ContentItem> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("content_items")
      .select("*")
      .eq("type", type)
      .order("sort_order");
    setRows((data as ContentItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [type]);

  const save = async () => {
    if (!editing?.title?.trim() || !editing.slug?.trim()) {
      toast.error("Title and slug required");
      return;
    }
    const payload = {
      type,
      slug: editing.slug.trim(),
      title: editing.title.trim(),
      summary: editing.summary || null,
      body: editing.body || null,
      hero_image: editing.hero_image || null,
      day_unlock: editing.day_unlock ?? 0,
      sort_order: editing.sort_order ?? 0,
      is_active: editing.is_active ?? true,
      metadata: editing.metadata || {},
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
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("content_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  if (loading)
    return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mt-12" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{rows.length} {label.toLowerCase()}s</p>
        <Button
          onClick={() => setEditing({ type, day_unlock: 0, is_active: true, metadata: {} })}
          className="bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-2" /> New {label}
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Title</th>
              {type === "blog" && <th className="p-3">Source</th>}
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
                {type === "blog" && (
                  <td className="p-3 text-xs text-muted-foreground">
                    {r.metadata?.source ?? "—"}
                  </td>
                )}
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
              <tr>
                <td colSpan={type === "blog" ? 4 : 3} className="p-8 text-center text-muted-foreground">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-heading font-bold text-xl">
              {editing.id ? "Edit" : "New"} {label}
            </h3>

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

            {type === "blog" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Source name</Label>
                    <Input
                      value={editing.metadata?.source || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          metadata: { ...(editing.metadata || {}), source: e.target.value },
                        })
                      }
                      placeholder="e.g. Healthline"
                    />
                  </div>
                  <div>
                    <Label>Source URL</Label>
                    <Input
                      value={editing.metadata?.url || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          metadata: { ...(editing.metadata || {}), url: e.target.value },
                        })
                      }
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div>
                  <Label>1-sentence summary</Label>
                  <Textarea
                    value={editing.summary || ""}
                    onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                    rows={2}
                  />
                </div>
              </>
            )}

            {type === "guide" && (
              <div>
                <Label>Body (markdown — overrides default in-app copy for this slug)</Label>
                <Textarea
                  value={editing.body || ""}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  rows={10}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                checked={editing.is_active ?? true}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              <Label htmlFor="active">Active</Label>
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

/* ============== NOTIFICATIONS PREVIEW TAB ============== */

const SAMPLE_VARS = {
  first_name: "Maya",
  X: "5",
  Y: "60",
  N: "14",
};

const NOTIFICATION_TEMPLATES: { name: string; template: string }[] = [
  { name: "Daily action (not opened by 10 AM)", template: "VITA says: [First name], Day [X] is waiting. Today is [Action Name]. It takes less time than you think." },
  { name: "Water reminder", template: "VITA says: [First name], you've had [X]oz of water today. You need [Y]oz more. Your cells are filing a complaint." },
  { name: "Streak at risk", template: "VITA says: [N]-day streak. [First name], you have until midnight. Four rings. You've done this before." },
  { name: "7-day streak", template: "VITA says: Seven days, [First name]. Research shows you are now 3.6 times more likely to stay with this. You're in the zone." },
  { name: "14-day streak + freeze earned", template: "VITA says: 14 days, [First name]. You've earned your first Streak Freeze. It's saved — one missed day won't break what you've built." },
  { name: "30-day streak", template: "VITA says: 30 days. [First name], that's a habit. Not a trial run. A habit." },
  { name: "Streak broken", template: "VITA says: Your [N]-day streak reset, [First name]. That's okay. Every expert has a Day 1 in their past. New one starts now." },
  { name: "Blood sugar not logged", template: "VITA says: [First name], your blood sugar hasn't been logged yet today. Even a bad number is useful information." },
  { name: "Measurement due in 7 days", template: "VITA says: [First name], your Month [N] check-in is in 7 days. Keep going — the numbers are going to say something good." },
  { name: "Good morning", template: "VITA says: Morning, [First name]. Your [N]-day streak is intact. [Today's action name] is ready for you." },
  { name: "Level up", template: "VITA says: [First name], you just reached [Level Name]. [Level significance message]. This is permanent." },
];

function fillTemplate(t: string) {
  return t
    .replace(/\[First name\]/g, SAMPLE_VARS.first_name)
    .replace(/\[X\]/g, SAMPLE_VARS.X)
    .replace(/\[Y\]/g, SAMPLE_VARS.Y)
    .replace(/\[N\]/g, SAMPLE_VARS.N)
    .replace(/\[Action Name\]|\[Today's action name\]/g, "Post-Meal Walk")
    .replace(/\[Level Name\]/g, "Level 3: The Builder")
    .replace(/\[Level significance message\]/g, "You've built the habits. Now you compound them.");
}

function NotificationsPreviewTab() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Read-only preview of VITA notification templates with sample variables filled in.
        Templates are edited in code.
      </p>
      <p className="text-xs text-muted-foreground">
        Mindset content reference: {MINDSET_WEEKS.length} weeks loaded.
      </p>
      <div className="space-y-2">
        {NOTIFICATION_TEMPLATES.map((n) => (
          <Card key={n.name} className="p-4 border border-border">
            <p className="label-caps text-accent mb-1">{n.name}</p>
            <p className="text-sm text-foreground">{fillTemplate(n.template)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
