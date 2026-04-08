import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users, ShoppingCart, ClipboardList, RefreshCw, Search, Eye, Trophy } from "lucide-react";
import { toast } from "sonner";

type Tab = "orders" | "leads" | "intakes" | "progress";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [intakes, setIntakes] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, leadsRes, intakesRes, progressRes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("intake_submissions").select("*").order("created_at", { ascending: false }),
        supabase.from("challenge_progress").select("*").order("created_at", { ascending: false }),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data);
      if (leadsRes.data) setLeads(leadsRes.data);
      if (intakesRes.data) setIntakes(intakesRes.data);
      if (progressRes.data) setProgress(progressRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filterItems = (items: any[]) => {
    return items.filter((item) => {
      const matchesSearch = searchTerm === "" ||
        JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const completedOrders = orders.filter((o) => o.status === "completed");
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.amount / 100), 0);
  const uniqueProgressEmails = [...new Set(progress.map((p) => p.email))];

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-primary/10 text-primary",
      pending: "bg-secondary text-secondary-foreground",
      failed: "bg-destructive/10 text-destructive",
      expired: "bg-muted text-muted-foreground",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-muted text-muted-foreground"}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const moodEmoji = (rating: number | null) => {
    const map: Record<number, string> = { 1: "😫", 2: "😕", 3: "😐", 4: "😊", 5: "🔥" };
    return rating ? map[rating] || "—" : "—";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground">Admin Dashboard</h1>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-xs font-medium">Total Orders</span>
            </div>
            <p className="font-heading font-bold text-2xl text-foreground">{orders.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Completed</span>
            </div>
            <p className="font-heading font-bold text-2xl text-primary">{completedOrders.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Total Leads</span>
            </div>
            <p className="font-heading font-bold text-2xl text-foreground">{leads.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Active Challengers</span>
            </div>
            <p className="font-heading font-bold text-2xl text-foreground">{uniqueProgressEmails.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-xs font-medium">Revenue</span>
            </div>
            <p className="font-heading font-bold text-2xl text-foreground">${totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {([
            { key: "orders" as Tab, label: "Orders", icon: ShoppingCart, count: orders.length },
            { key: "leads" as Tab, label: "Leads", icon: Users, count: leads.length },
            { key: "intakes" as Tab, label: "Intake Forms", icon: ClipboardList, count: intakes.length },
            { key: "progress" as Tab, label: "Challenge Progress", icon: Trophy, count: uniqueProgressEmails.length },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedItem(null); setSearchTerm(""); setStatusFilter("all"); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <span className="bg-background/20 px-1.5 py-0.5 rounded text-xs">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="pl-10" />
          </div>
          {(activeTab === "orders" || activeTab === "intakes") && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Detail Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
            <div className="bg-background rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-heading font-bold text-xl text-foreground mb-4">Details</h3>
              <div className="space-y-3">
                {Object.entries(selectedItem).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 text-sm border-b border-border pb-2">
                    <span className="text-muted-foreground font-medium min-w-[120px]">{key.replace(/_/g, " ")}</span>
                    <span className="text-foreground text-right break-all">{String(value ?? "—")}</span>
                  </div>
                ))}
              </div>
              <Button onClick={() => setSelectedItem(null)} className="w-full mt-6" variant="outline">Close</Button>
            </div>
          </div>
        )}

        {/* Tables */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            {activeTab === "orders" && (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {filterItems(orders).map((order) => (
                    <tr key={order.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3 text-foreground font-medium">{order.customer_name}</td>
                      <td className="p-3 text-muted-foreground">{order.customer_email}</td>
                      <td className="p-3">{statusBadge(order.status)}</td>
                      <td className="p-3 text-foreground">${(order.amount / 100).toFixed(2)}</td>
                      <td className="p-3 text-muted-foreground text-xs">{formatDate(order.created_at)}</td>
                      <td className="p-3">
                        <button onClick={() => setSelectedItem(order)} className="text-primary hover:text-primary/80">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filterItems(orders).length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No orders found</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "leads" && (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Source</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filterItems(leads).map((lead) => (
                    <tr key={lead.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3 text-foreground font-medium">{lead.name}</td>
                      <td className="p-3 text-muted-foreground">{lead.email}</td>
                      <td className="p-3 text-muted-foreground">{lead.source}</td>
                      <td className="p-3 text-muted-foreground text-xs">{formatDate(lead.created_at)}</td>
                    </tr>
                  ))}
                  {filterItems(leads).length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No leads found</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "intakes" && (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Diabetes</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Country</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {filterItems(intakes).map((intake) => (
                    <tr key={intake.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3 text-foreground font-medium">{intake.full_name}</td>
                      <td className="p-3 text-muted-foreground">{intake.email}</td>
                      <td className="p-3 text-muted-foreground">{intake.diabetes_type}</td>
                      <td className="p-3 text-muted-foreground">{intake.country}</td>
                      <td className="p-3 text-muted-foreground text-xs">{formatDate(intake.created_at)}</td>
                      <td className="p-3">
                        <button onClick={() => setSelectedItem(intake)} className="text-primary hover:text-primary/80">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filterItems(intakes).length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No intake forms found</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "progress" && (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Day</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Win</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Mood</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Energy</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Water</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {filterItems(progress).map((entry) => (
                    <tr key={entry.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3 text-foreground font-medium">{entry.email}</td>
                      <td className="p-3 text-muted-foreground">Day {entry.day_number}</td>
                      <td className="p-3 text-muted-foreground max-w-[200px] truncate">{entry.win_text}</td>
                      <td className="p-3 text-center">{moodEmoji(entry.mood_rating)}</td>
                      <td className="p-3 text-muted-foreground text-center">{entry.energy_rating ?? "—"}/5</td>
                      <td className="p-3 text-muted-foreground text-center">💧 {entry.water_glasses ?? 0}</td>
                      <td className="p-3 text-muted-foreground text-xs">{formatDate(entry.created_at)}</td>
                      <td className="p-3">
                        <button onClick={() => setSelectedItem(entry)} className="text-primary hover:text-primary/80">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filterItems(progress).length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No progress entries found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;