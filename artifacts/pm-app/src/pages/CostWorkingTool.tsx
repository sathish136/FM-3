import { useState, useEffect, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Loader2, Trash2, X, Calculator, TrendingUp,
  Send, RefreshCw, ChevronDown, IndianRupee, FileText,
  CheckCircle2, Clock, AlertCircle,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CostWorking {
  id: number;
  quote_no: string;
  project_name: string;
  customer: string;
  date: string;
  capacity: string | null;
  plant_type: string | null;
  equipment_cost: number;
  civil_cost: number;
  erection_cost: number;
  electrical_cost: number;
  piping_cost: number;
  commissioning_cost: number;
  others_cost: number;
  margin_pct: number;
  discount_pct: number;
  gst_pct: number;
  notes: string | null;
  status: string;
  created_at: string;
}

const STATUSES = ["Draft", "Under Review", "Approved", "Sent", "Won", "Lost"];

const STATUS_CFG: Record<string, { bg: string; text: string; border: string; dot: string; icon: any }> = {
  "Draft":        { bg: "bg-slate-100",  text: "text-slate-600",   border: "border-slate-300",   dot: "bg-slate-400",   icon: AlertCircle },
  "Under Review": { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-300",   dot: "bg-amber-500",   icon: Clock },
  "Approved":     { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-300",    dot: "bg-blue-500",    icon: CheckCircle2 },
  "Sent":         { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-300",     dot: "bg-sky-500",     icon: CheckCircle2 },
  "Won":          { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300", dot: "bg-emerald-500", icon: CheckCircle2 },
  "Lost":         { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-300",    dot: "bg-rose-500",    icon: AlertCircle },
};

const EMPTY = {
  quote_no: "", project_name: "", customer: "",
  date: new Date().toISOString().slice(0, 10),
  capacity: "", plant_type: "",
  equipment_cost: "0", civil_cost: "0", erection_cost: "0",
  electrical_cost: "0", piping_cost: "0", commissioning_cost: "0", others_cost: "0",
  margin_pct: "20", discount_pct: "0", gst_pct: "18",
  notes: "", status: "Draft",
};
type FormState = typeof EMPTY;

type DrawerTab = "info" | "costs" | "pricing";

function n(v: string) { return v === "" ? 0 : Number(v); }
function inr(v: number) { return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 }); }

function calcSummary(f: Pick<FormState, "equipment_cost"|"civil_cost"|"erection_cost"|"electrical_cost"|"piping_cost"|"commissioning_cost"|"others_cost"|"margin_pct"|"discount_pct"|"gst_pct">) {
  const baseCost = n(f.equipment_cost) + n(f.civil_cost) + n(f.erection_cost) + n(f.electrical_cost) + n(f.piping_cost) + n(f.commissioning_cost) + n(f.others_cost);
  const margin = baseCost * (n(f.margin_pct) / 100);
  const priceBeforeDiscount = baseCost + margin;
  const discount = priceBeforeDiscount * (n(f.discount_pct) / 100);
  const priceAfterDiscount = priceBeforeDiscount - discount;
  const gst = priceAfterDiscount * (n(f.gst_pct) / 100);
  const totalPrice = priceAfterDiscount + gst;
  const grossMarginPct = priceAfterDiscount > 0 ? ((priceAfterDiscount - baseCost) / priceAfterDiscount) * 100 : 0;
  return { baseCost, margin, discount, priceAfterDiscount, gst, totalPrice, grossMarginPct };
}

function calcFromRecord(r: CostWorking) {
  return calcSummary({
    equipment_cost: String(r.equipment_cost), civil_cost: String(r.civil_cost),
    erection_cost: String(r.erection_cost), electrical_cost: String(r.electrical_cost),
    piping_cost: String(r.piping_cost), commissioning_cost: String(r.commissioning_cost),
    others_cost: String(r.others_cost), margin_pct: String(r.margin_pct),
    discount_pct: String(r.discount_pct), gst_pct: String(r.gst_pct),
  });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG["Draft"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", cfg.bg, cfg.text, cfg.border)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {status}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-600 mb-1">{children}</label>;
}

function CostInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
        <input type="number" step="any" value={value} onChange={e => onChange(e.target.value)}
          className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 bg-white" />
      </div>
    </div>
  );
}

export default function CostWorkingTool() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<CostWorking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("info");
  const [editing, setEditing] = useState<CostWorking | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/cost-working`);
      setRecords(await r.json());
    } catch { toast({ title: "Load failed", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => calcSummary(form), [form]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setDrawerTab("info");
    setDrawerOpen(true);
  }

  function openEdit(r: CostWorking) {
    setEditing(r);
    setForm({
      quote_no: r.quote_no, project_name: r.project_name, customer: r.customer,
      date: r.date?.slice(0, 10) ?? "", capacity: r.capacity ?? "", plant_type: r.plant_type ?? "",
      equipment_cost: String(r.equipment_cost), civil_cost: String(r.civil_cost),
      erection_cost: String(r.erection_cost), electrical_cost: String(r.electrical_cost),
      piping_cost: String(r.piping_cost), commissioning_cost: String(r.commissioning_cost),
      others_cost: String(r.others_cost), margin_pct: String(r.margin_pct),
      discount_pct: String(r.discount_pct), gst_pct: String(r.gst_pct),
      notes: r.notes ?? "", status: r.status,
    });
    setDrawerTab("info");
    setDrawerOpen(true);
  }

  function closeDrawer() { setDrawerOpen(false); setEditing(null); setForm(EMPTY); }

  async function save() {
    if (!form.quote_no.trim() || !form.project_name.trim() || !form.customer.trim()) {
      toast({ title: "Quote no., project name and customer are required", variant: "destructive" }); return;
    }
    setSaving(true);
    const body = {
      quote_no: form.quote_no, project_name: form.project_name, customer: form.customer,
      date: form.date || null, capacity: form.capacity || null, plant_type: form.plant_type || null,
      equipment_cost: n(form.equipment_cost), civil_cost: n(form.civil_cost),
      erection_cost: n(form.erection_cost), electrical_cost: n(form.electrical_cost),
      piping_cost: n(form.piping_cost), commissioning_cost: n(form.commissioning_cost),
      others_cost: n(form.others_cost), margin_pct: n(form.margin_pct),
      discount_pct: n(form.discount_pct), gst_pct: n(form.gst_pct),
      notes: form.notes || null, status: form.status,
    };
    try {
      const url = editing ? `${BASE}/api/cost-working/${editing.id}` : `${BASE}/api/cost-working`;
      const r = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: editing ? "Quote updated" : "Quote saved" });
      closeDrawer(); load();
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function del(id: number) {
    try {
      await fetch(`${BASE}/api/cost-working/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" }); setDeleteId(null); closeDrawer(); load();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  }

  async function syncERP() {
    setSyncing(true);
    try {
      const r = await fetch(`${BASE}/api/cost-working/sync`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Sync failed");
      toast({ title: `Synced ${d.synced ?? 0} quotes from ERP` });
      load();
    } catch (e: any) { toast({ title: "Sync failed", description: e.message, variant: "destructive" }); }
    finally { setSyncing(false); }
  }

  function setF<K extends keyof FormState>(k: K, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return (!q || r.quote_no.toLowerCase().includes(q) || r.project_name.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q)) &&
      (statusFilter === "All" || r.status === statusFilter);
  });

  const TABS: { id: DrawerTab; label: string; icon: React.ElementType }[] = [
    { id: "info",    label: "Project Info",    icon: FileText },
    { id: "costs",   label: "Cost Components", icon: IndianRupee },
    { id: "pricing", label: "Pricing & Margin", icon: TrendingUp },
  ];

  return (
    <Layout>
      <div className="flex flex-col h-full bg-[#f4f6fb]">

        {/* Page Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 shadow shadow-emerald-200">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Cost Working Tool</h1>
              <p className="text-xs text-slate-400 mt-0.5">Proposal pricing · cost + margin = selling price</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={syncERP} disabled={syncing}
              className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
              <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
              {syncing ? "Syncing…" : "Sync ERP"}
            </button>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> New Quote
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Quotes", value: records.length,                               color: "text-slate-800",   bg: "bg-white" },
              { label: "Won",          value: records.filter(r => r.status === "Won").length, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Sent",         value: records.filter(r => r.status === "Sent").length, color: "text-sky-600",  bg: "bg-sky-50" },
              { label: "Draft",        value: records.filter(r => r.status === "Draft").length, color: "text-slate-500", bg: "bg-slate-50" },
            ].map(s => (
              <div key={s.label} className={cn("rounded-xl border border-slate-200 p-4 flex flex-col gap-1", s.bg)}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
                <span className={cn("text-2xl font-black", s.color)}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search quote no., project or customer…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                <option value="All">All Statuses</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-emerald-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 text-center py-24">
              <Calculator className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="font-semibold text-slate-500">No quotes found</p>
              <p className="text-sm text-slate-400 mt-1">Click "New Quote" to start your first cost working</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quote No.</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Project</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Base Cost</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Margin</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Price (ex-GST)</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total (incl. GST)</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(r => {
                    const s = calcFromRecord(r);
                    return (
                      <tr key={r.id} className="hover:bg-emerald-50/50 transition-colors group cursor-pointer" onClick={() => openEdit(r)}>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700">{r.quote_no}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          <div>{r.project_name}</div>
                          {r.plant_type && <div className="text-xs text-slate-400 mt-0.5">{r.plant_type}{r.capacity ? ` · ${r.capacity}` : ""}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.customer}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{r.date?.slice(0, 10)}</td>
                        <td className="px-4 py-3 text-slate-600">{inr(s.baseCost)}</td>
                        <td className="px-4 py-3 text-emerald-600 font-semibold">{r.margin_pct}%</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{inr(s.priceAfterDiscount)}</td>
                        <td className="px-4 py-3 font-bold text-sky-700">{inr(s.totalPrice)}</td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                        <td className="px-3 py-3">
                          <button onClick={e => { e.stopPropagation(); setDeleteId(r.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
                {filtered.length} quote{filtered.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">

            {/* Dark Header */}
            <div className="bg-slate-900 px-6 py-5 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calculator className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Cost Working</span>
                  </div>
                  <h2 className="text-white font-bold text-lg leading-tight truncate">
                    {form.project_name || (editing ? "Edit Quote" : "New Cost Working")}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {form.quote_no && (
                      <span className="text-xs font-mono bg-white/10 text-emerald-200 px-2 py-0.5 rounded">{form.quote_no}</span>
                    )}
                    {form.status && <StatusBadge status={form.status} />}
                    {summary.totalPrice > 0 && (
                      <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">{inr(summary.totalPrice)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {editing && (
                    <button onClick={() => setDeleteId(editing.id)}
                      className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={closeDrawer}
                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setDrawerTab(tab.id)}
                  className={cn("flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2",
                    drawerTab === tab.id
                      ? "border-emerald-600 text-emerald-700 bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-700")}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">

              {drawerTab === "info" && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Quote No. <span className="text-red-500">*</span></FieldLabel>
                      <input value={form.quote_no} onChange={e => setF("quote_no", e.target.value)}
                        placeholder="e.g. CWT-2026-001"
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 bg-white" />
                    </div>
                    <div>
                      <FieldLabel>Date</FieldLabel>
                      <input type="date" value={form.date} onChange={e => setF("date", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white" />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Project Name <span className="text-red-500">*</span></FieldLabel>
                      <input value={form.project_name} onChange={e => setF("project_name", e.target.value)}
                        placeholder="e.g. 100 KLD STP for XYZ Township"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 bg-white" />
                    </div>
                    <div>
                      <FieldLabel>Customer <span className="text-red-500">*</span></FieldLabel>
                      <input value={form.customer} onChange={e => setF("customer", e.target.value)}
                        placeholder="Customer name"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300 bg-white" />
                    </div>
                    <div>
                      <FieldLabel>Status</FieldLabel>
                      <select value={form.status} onChange={e => setF("status", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Plant Type</FieldLabel>
                      <input value={form.plant_type} onChange={e => setF("plant_type", e.target.value)}
                        placeholder="e.g. STP MBR, RO"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white" />
                    </div>
                    <div>
                      <FieldLabel>Capacity</FieldLabel>
                      <input value={form.capacity} onChange={e => setF("capacity", e.target.value)}
                        placeholder="e.g. 100 KLD"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white" />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Notes</FieldLabel>
                      <textarea value={form.notes} onChange={e => setF("notes", e.target.value)} rows={3}
                        placeholder="Any additional notes or scope remarks…"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none bg-white" />
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "costs" && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <CostInput value={form.equipment_cost}    onChange={v => setF("equipment_cost", v)}    label="Equipment" />
                    <CostInput value={form.civil_cost}        onChange={v => setF("civil_cost", v)}        label="Civil Works" />
                    <CostInput value={form.erection_cost}     onChange={v => setF("erection_cost", v)}     label="Erection" />
                    <CostInput value={form.electrical_cost}   onChange={v => setF("electrical_cost", v)}   label="Electrical" />
                    <CostInput value={form.piping_cost}       onChange={v => setF("piping_cost", v)}       label="Piping" />
                    <CostInput value={form.commissioning_cost} onChange={v => setF("commissioning_cost", v)} label="Commissioning" />
                    <div className="col-span-2">
                      <CostInput value={form.others_cost} onChange={v => setF("others_cost", v)} label="Others" />
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Base Cost Total</p>
                    <p className="text-2xl font-black text-slate-800">{inr(summary.baseCost)}</p>
                  </div>
                </div>
              )}

              {drawerTab === "pricing" && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <FieldLabel>Margin %</FieldLabel>
                      <input type="number" step="any" value={form.margin_pct} onChange={e => setF("margin_pct", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white" />
                    </div>
                    <div>
                      <FieldLabel>Discount %</FieldLabel>
                      <input type="number" step="any" value={form.discount_pct} onChange={e => setF("discount_pct", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white" />
                    </div>
                    <div>
                      <FieldLabel>GST %</FieldLabel>
                      <input type="number" step="any" value={form.gst_pct} onChange={e => setF("gst_pct", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white" />
                    </div>
                  </div>

                  {/* Live Price Preview */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Live Price Preview</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Base Cost</span>
                        <span className="font-semibold text-slate-800">{inr(summary.baseCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">+ Margin ({form.margin_pct}%)</span>
                        <span className="text-emerald-600 font-semibold">+{inr(summary.margin)}</span>
                      </div>
                      {n(form.discount_pct) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">− Discount ({form.discount_pct}%)</span>
                          <span className="text-rose-500 font-semibold">−{inr(summary.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200 pt-2">
                        <span className="text-slate-600 font-semibold">Price (ex-GST)</span>
                        <span className="font-bold text-slate-800">{inr(summary.priceAfterDiscount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">+ GST ({form.gst_pct}%)</span>
                        <span className="text-slate-600">+{inr(summary.gst)}</span>
                      </div>
                      <div className="flex justify-between border-t-2 border-emerald-200 pt-2 bg-emerald-50 -mx-1 px-1 rounded-lg">
                        <span className="text-emerald-700 font-bold">Total (incl. GST)</span>
                        <span className="text-emerald-700 font-black text-base">{inr(summary.totalPrice)}</span>
                      </div>
                      <div className="flex justify-between text-xs pt-1">
                        <span className="text-slate-400">Effective Gross Margin</span>
                        <span className="text-sky-600 font-semibold">{summary.grossMarginPct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50 flex-shrink-0">
              <button onClick={closeDrawer} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2 transition-colors font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {editing ? "Update" : "Save"} Quote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId != null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-1">Delete Quote?</h3>
            <p className="text-sm text-slate-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={() => del(deleteId)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
