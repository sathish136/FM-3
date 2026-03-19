import { Layout } from "@/components/Layout";
import {
  ShoppingCart, Plus, RefreshCw, Search, ExternalLink, X,
  Loader2, AlertCircle, ChevronDown, Trash2, Package,
  Calendar, Clock, FileText, Building2,
  ArrowUpDown, ChevronUp, ChevronDown as ChevronDownIcon,
  Tag, Hash,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERPNEXT_URL = "https://erp.wttint.com";

interface MRItem {
  item_code: string;
  item_name?: string;
  qty: number;
  uom?: string;
  warehouse?: string;
  schedule_date?: string;
}

interface MaterialRequest {
  name: string;
  title: string | null;
  material_request_type: string;
  status: string;
  transaction_date: string;
  schedule_date: string | null;
  company: string | null;
  project: string | null;
  modified: string | null;
  requested_by: string | null;
  owner: string | null;
  items?: MRItem[];
}

const MR_TYPES = [
  "Purchase",
  "Material Transfer",
  "Material Issue",
  "Customer Provided",
  "Material Transfer for Manufacture",
];
const MR_STATUSES = ["Draft", "Submitted", "Stopped", "Cancelled", "Pending", "Approved"];

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function today() { return new Date().toISOString().slice(0, 10); }

type StatusCfg = { label: string; dot: string; row: string; badge: string; pill: string; solid: string };

function statusCfg(status: string): StatusCfg {
  const s = (status || "").toLowerCase();
  if (s === "approved" || s === "submitted")
    return { label: status, dot: "bg-emerald-500", row: "hover:bg-emerald-50/40", badge: "text-emerald-700 bg-emerald-50 border-emerald-200", pill: "bg-emerald-500", solid: "bg-emerald-500 text-white" };
  if (s === "pending")
    return { label: status, dot: "bg-amber-400",  row: "hover:bg-amber-50/30",   badge: "text-amber-700 bg-amber-50 border-amber-200",   pill: "bg-amber-400",  solid: "bg-amber-400 text-white"  };
  if (s === "stopped" || s === "cancelled")
    return { label: status, dot: "bg-red-400",    row: "hover:bg-red-50/30",     badge: "text-red-700 bg-red-50 border-red-200",         pill: "bg-red-400",    solid: "bg-red-400 text-white"    };
  if (s === "ordered")
    return { label: status, dot: "bg-blue-500",   row: "hover:bg-blue-50/30",    badge: "text-blue-700 bg-blue-50 border-blue-200",      pill: "bg-blue-500",   solid: "bg-blue-500 text-white"   };
  return   { label: status || "Draft", dot: "bg-slate-400", row: "hover:bg-slate-50/60",  badge: "text-slate-600 bg-slate-100 border-slate-200",   pill: "bg-slate-400",  solid: "bg-slate-200 text-slate-700"  };
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-violet-500","bg-indigo-500","bg-blue-500","bg-cyan-500",
  "bg-teal-500","bg-emerald-500","bg-amber-500","bg-orange-500",
  "bg-rose-500","bg-pink-500",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(email: string) {
  const u = email.split("@")[0].replace(/[._-]/g, " ");
  const parts = u.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return u.slice(0, 2).toUpperCase();
}
function UserAvatar({ email, size = "w-7 h-7" }: { email: string; size?: string }) {
  return (
    <div className={`${size} ${avatarColor(email)} rounded-full flex items-center justify-center shrink-0`}>
      <span className="text-[10px] font-bold text-white leading-none">{initials(email)}</span>
    </div>
  );
}

function typeBadge(type: string) {
  if (type === "Purchase")                            return "bg-violet-100 text-violet-700";
  if (type === "Material Transfer")                   return "bg-sky-100 text-sky-700";
  if (type === "Material Issue")                      return "bg-orange-100 text-orange-700";
  if (type === "Customer Provided")                   return "bg-teal-100 text-teal-700";
  if (type === "Material Transfer for Manufacture")   return "bg-indigo-100 text-indigo-700";
  return "bg-gray-100 text-gray-600";
}

const EMPTY_ITEM: MRItem = { item_code: "", qty: 1, uom: "Nos" };

type SortField = "title" | "status" | "project" | "name" | "modified";

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, count, active, onClick,
}: {
  label: string; count: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all ${
        active
          ? "bg-indigo-600 border-indigo-600 shadow-sm"
          : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      <span className={`text-lg font-black leading-none tabular-nums ${active ? "text-white" : "text-gray-800"}`}>{count}</span>
      <span className={`text-[11px] font-medium leading-tight ${active ? "text-indigo-200" : "text-gray-500"}`}>{label}</span>
    </button>
  );
}

// ── Item row in create form ──────────────────────────────────────────────────
function ItemRow({ item, index, itemsList, warehouses, onChange, onRemove }: {
  item: MRItem; index: number; itemsList: string[]; warehouses: string[];
  onChange: (i: number, f: keyof MRItem, v: string | number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <tr className="group border-b border-gray-100 hover:bg-indigo-50/30 transition-colors">
      <td className="px-3 py-2 text-xs text-gray-400 text-center font-mono">{index + 1}</td>
      <td className="px-3 py-2">
        {itemsList.length > 0 ? (
          <select value={item.item_code} onChange={e => onChange(index, "item_code", e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">Select item…</option>
            {itemsList.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        ) : (
          <input value={item.item_code} onChange={e => onChange(index, "item_code", e.target.value)}
            placeholder="Item code"
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        )}
      </td>
      <td className="px-3 py-2">
        <input type="number" min="0.001" step="any" value={item.qty}
          onChange={e => onChange(index, "qty", parseFloat(e.target.value) || 1)}
          className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </td>
      <td className="px-3 py-2">
        <input value={item.uom || ""} onChange={e => onChange(index, "uom", e.target.value)}
          placeholder="Nos"
          className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </td>
      <td className="px-3 py-2">
        {warehouses.length > 0 ? (
          <select value={item.warehouse || ""} onChange={e => onChange(index, "warehouse", e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">—</option>
            {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        ) : (
          <input value={item.warehouse || ""} onChange={e => onChange(index, "warehouse", e.target.value)}
            placeholder="Warehouse"
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        )}
      </td>
      <td className="px-3 py-2">
        <input type="date" value={item.schedule_date || ""} onChange={e => onChange(index, "schedule_date", e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </td>
      <td className="px-3 py-2 text-center">
        <button onClick={() => onRemove(index)}
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function MaterialRequestPage() {
  const { toast } = useToast();

  const [records,      setRecords]      = useState<MaterialRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("");
  const [typeFilter,     setTypeFilter]     = useState("");
  const [projectFilter,  setProjectFilter]  = useState("");
  const [projectInput,   setProjectInput]   = useState("");
  const projectDebounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sortField, setSortField] = useState<SortField>("modified");
  const [sortAsc,   setSortAsc]   = useState(false);

  const [detail,        setDetail]        = useState<MaterialRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showNew,       setShowNew]       = useState(false);

  const [itemsList,  setItemsList]  = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [companies,  setCompanies]  = useState<string[]>([]);

  const [formTitle,        setFormTitle]        = useState("");
  const [formType,         setFormType]         = useState("Purchase");
  const [formScheduleDate, setFormScheduleDate] = useState(today());
  const [formCompany,      setFormCompany]      = useState("");
  const [formProject,      setFormProject]      = useState("");
  const [formItems,        setFormItems]        = useState<MRItem[]>([{ ...EMPTY_ITEM }]);
  const [submitting,       setSubmitting]       = useState(false);

  // ── Fetch ──
  const fetchRecords = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams();
      if (statusFilter)  p.set("status", statusFilter);
      if (typeFilter)    p.set("type", typeFilter);
      if (projectFilter) p.set("project", projectFilter);
      const res = await fetch(`${BASE}/api/material-requests?${p}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setRecords(await res.json());
    } catch (e) { setError(String(e)); }
    finally     { setLoading(false); }
  }, [statusFilter, typeFilter, projectFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    fetch(`${BASE}/api/material-request-items`).then(r => r.json()).then(setItemsList).catch(() => {});
    fetch(`${BASE}/api/warehouses`).then(r => r.json()).then(setWarehouses).catch(() => {});
    fetch(`${BASE}/api/companies`).then(r => r.json()).then(d => {
      setCompanies(d);
      if (d.length > 0) setFormCompany(d[0]);
    }).catch(() => {});
  }, []);

  // ── Detail ──
  const openDetail = async (mr: MaterialRequest) => {
    if (detail?.name === mr.name) { setDetail(null); return; }
    setDetail(mr); setDetailLoading(true);
    try {
      const res = await fetch(`${BASE}/api/material-requests/${encodeURIComponent(mr.name)}`);
      if (res.ok) setDetail(await res.json());
    } catch {}
    finally { setDetailLoading(false); }
  };

  // ── Create form ──
  const updateItem = (i: number, f: keyof MRItem, v: string | number) =>
    setFormItems(p => p.map((it, idx) => idx === i ? { ...it, [f]: v } : it));
  const removeItem = (i: number) => setFormItems(p => p.filter((_, idx) => idx !== i));
  const addItem    = () => setFormItems(p => [...p, { ...EMPTY_ITEM }]);

  const handleCreate = async () => {
    if (!formTitle.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (formItems.some(it => !it.item_code.trim())) { toast({ title: "All items need an item code", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/material-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle, material_request_type: formType,
          schedule_date: formScheduleDate,
          company: formCompany || undefined,
          project: formProject || undefined,
          items: formItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({ title: `${data.name} created successfully!` });
      setShowNew(false);
      setFormTitle(""); setFormType("Purchase"); setFormScheduleDate(today());
      setFormItems([{ ...EMPTY_ITEM }]); setFormProject("");
      fetchRecords();
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  // ── Sort & filter ──
  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortAsc(a => !a);
    else { setSortField(f); setSortAsc(true); }
  };

  const filtered = records
    .filter(r => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (r.name + r.title + r.project + r.company).toLowerCase().includes(s);
    })
    .sort((a, b) => {
      const v = (r: MaterialRequest) => ({
        title: r.title ?? "", status: r.status, project: r.project ?? "",
        name: r.name, modified: r.modified ?? "",
      })[sortField];
      return sortAsc ? v(a).localeCompare(v(b)) : v(b).localeCompare(v(a));
    });

  // ── Stats ──
  const total      = records.length;
  const statDraft  = records.filter(r => ["draft","created"].includes(r.status.toLowerCase())).length;
  const statApp    = records.filter(r => ["approved","submitted"].includes(r.status.toLowerCase())).length;
  const statPend   = records.filter(r => r.status.toLowerCase() === "pending").length;
  const statOther  = records.filter(r => ["stopped","cancelled","ordered","transferred"].includes(r.status.toLowerCase())).length;

  const SortBtn = ({ field }: { field: SortField }) => (
    <button onClick={() => toggleSort(field)} className="group inline-flex items-center gap-1">
      {sortField === field
        ? (sortAsc ? <ChevronUp className="w-3 h-3 text-indigo-500" /> : <ChevronDownIcon className="w-3 h-3 text-indigo-500" />)
        : <ArrowUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />}
    </button>
  );

  const hasFilters = !!(statusFilter || typeFilter || projectFilter);

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900">Material Request</h1>
          </div>

          <div className="flex items-center gap-2">
            <a href={`${ERPNEXT_URL}/app/material-request`} target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> ERPNext
            </a>
            <button onClick={fetchRecords}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-sm transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Request
            </button>
          </div>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div className="px-6 pt-3 pb-2 flex gap-2 shrink-0 overflow-x-auto">
          <StatCard label="All" count={total}
            active={!statusFilter}
            onClick={() => setStatusFilter("")}
          />
          <StatCard label="Approved" count={statApp}
            active={statusFilter === "Approved"}
            onClick={() => setStatusFilter(s => s === "Approved" ? "" : "Approved")}
          />
          <StatCard label="Pending" count={statPend}
            active={statusFilter === "Pending"}
            onClick={() => setStatusFilter(s => s === "Pending" ? "" : "Pending")}
          />
          <StatCard label="Draft" count={statDraft}
            active={statusFilter === "Draft"}
            onClick={() => setStatusFilter(s => s === "Draft" ? "" : "Draft")}
          />
          <StatCard label="Stopped / Cancelled" count={statOther}
            active={["Stopped","Cancelled"].includes(statusFilter)}
            onClick={() => setStatusFilter(s => s === "Stopped" ? "" : "Stopped")}
          />
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <div className="px-6 py-3 flex flex-wrap items-center gap-2 shrink-0">

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search title, project, ID…"
              className="pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52 shadow-sm" />
          </div>

          {/* Project pill */}
          <div className="relative flex items-center">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            <input value={projectInput}
              onChange={e => {
                setProjectInput(e.target.value);
                if (projectDebounce.current) clearTimeout(projectDebounce.current);
                projectDebounce.current = setTimeout(() => setProjectFilter(e.target.value), 380);
              }}
              placeholder="Filter by project…"
              className={`pl-8 pr-7 py-2 text-xs bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44 shadow-sm transition-colors ${projectFilter ? "border-indigo-400 bg-indigo-50/40 text-indigo-700 font-medium" : "border-gray-200"}`}
            />
            {projectInput && (
              <button onClick={() => { setProjectInput(""); setProjectFilter(""); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status select */}
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className={`appearance-none pl-3 pr-7 py-2 text-xs bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm transition-colors ${statusFilter ? "border-indigo-400 bg-indigo-50/40 text-indigo-700 font-medium" : "border-gray-200 text-gray-600"}`}>
              <option value="">All Statuses</option>
              {MR_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Type select */}
          <div className="relative">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className={`appearance-none pl-3 pr-7 py-2 text-xs bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm transition-colors ${typeFilter ? "border-indigo-400 bg-indigo-50/40 text-indigo-700 font-medium" : "border-gray-200 text-gray-600"}`}>
              <option value="">All Types</option>
              {MR_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>

          {hasFilters && (
            <button onClick={() => { setStatusFilter(""); setTypeFilter(""); setProjectFilter(""); setProjectInput(""); }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
            <span className="font-semibold text-gray-600">{filtered.length}</span>
            <span>record{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex gap-0 px-6 pb-6">

          {/* Table panel */}
          <div className={`flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white shadow-sm transition-all ${detail ? "mr-4" : ""}`}>

            {loading && (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="text-sm">Loading from ERPNext…</p>
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-red-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Failed to load</p>
                <p className="text-xs text-gray-400 max-w-xs text-center">{error}</p>
                <button onClick={fetchRecords}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <Package className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-600">No requests found</p>
                <p className="text-xs text-gray-400">Adjust filters or create a new request</p>
                <button onClick={() => setShowNew(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> New Request
                </button>
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50/80 backdrop-blur border-b border-gray-200">
                    <th className="px-4 py-3 text-left">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Title <SortBtn field="title" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left w-32">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Status <SortBtn field="status" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left w-36">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Project <SortBtn field="project" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left w-36">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        ID <SortBtn field="name" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left w-36">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Created By
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right w-28">
                      <div className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Updated <SortBtn field="modified" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((mr, idx) => {
                    const st      = statusCfg(mr.status);
                    const isOpen  = detail?.name === mr.name;
                    return (
                      <tr key={mr.name}
                        onClick={() => openDetail(mr)}
                        className={`cursor-pointer border-b border-gray-50 transition-colors ${
                          isOpen ? "bg-indigo-50/60 border-indigo-100" : `${st.row} ${idx % 2 === 1 ? "bg-gray-50/30" : "bg-white"}`
                        }`}
                      >
                        {/* Title */}
                        <td className="px-4 py-3 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                            <div className="min-w-0">
                              <p className={`font-semibold text-sm leading-snug truncate max-w-[320px] ${isOpen ? "text-indigo-700" : "text-gray-800"}`}>
                                {mr.title || mr.name}
                              </p>
                              <span className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${typeBadge(mr.material_request_type)}`}>
                                {mr.material_request_type}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.solid}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                            {st.label}
                          </span>
                        </td>

                        {/* Project */}
                        <td className="px-3 py-3">
                          {mr.project ? (
                            <button
                              onClick={e => { e.stopPropagation(); setProjectInput(mr.project!); setProjectFilter(mr.project!); }}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline underline-offset-2 transition-colors"
                              title={`Filter by ${mr.project}`}>
                              {mr.project}
                            </button>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>

                        {/* ID */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-gray-500">{mr.name}</span>
                            <a href={`${ERPNEXT_URL}/app/material-request/${mr.name}`}
                              target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-gray-300 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100"
                              title="Open in ERPNext">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>

                        {/* Created By */}
                        <td className="px-3 py-3">
                          {mr.owner ? (
                            <div className="flex items-center gap-2" title={mr.owner}>
                              <UserAvatar email={mr.owner} />
                              <span className="text-xs text-gray-600 truncate max-w-[100px]">
                                {mr.owner.split("@")[0].replace(/[._-]/g, " ")}
                              </span>
                            </div>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>

                        {/* Updated */}
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-gray-400 tabular-nums">{timeAgo(mr.modified)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Detail panel ── */}
          {detail && (
            <div className="w-72 shrink-0 rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col overflow-hidden">
              {/* Panel header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 font-mono">{detail.name}</p>
                  {(() => {
                    const st = statusCfg(detail.status);
                    return (
                      <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex gap-1 shrink-0">
                  <a href={`${ERPNEXT_URL}/app/material-request/${detail.name}`}
                    target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => setDetail(null)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {detailLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-gray-50">

                  {/* Title & type */}
                  <div className="px-4 py-4 space-y-2">
                    {detail.title && (
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{detail.title}</p>
                    )}
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${typeBadge(detail.material_request_type)}`}>
                      {detail.material_request_type}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="px-4 py-4 space-y-3">
                    {[
                      { icon: Tag,         label: "Project",     val: detail.project },
                      { icon: Building2,   label: "Company",     val: detail.company },
                      { icon: Calendar,    label: "Date",        val: formatDate(detail.transaction_date) },
                      { icon: Clock,       label: "Required By", val: formatDate(detail.schedule_date) },
                      { icon: Hash,        label: "Modified",    val: detail.modified ? timeAgo(detail.modified) : null },
                    ].filter(r => r.val).map(({ icon: Icon, label, val }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                          <Icon className="w-3 h-3 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                          <p className="text-xs font-semibold text-gray-700 truncate">{val}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Items */}
                  {detail.items && detail.items.length > 0 && (
                    <div className="px-4 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Items</p>
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{detail.items.length}</span>
                      </div>
                      <div className="space-y-2">
                        {detail.items.map((it, i) => (
                          <div key={i} className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
                            <p className="text-xs font-semibold text-gray-800 truncate">{it.item_name || it.item_code}</p>
                            {it.item_name && it.item_code !== it.item_name && (
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{it.item_code}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                              <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono">
                                {it.qty} {it.uom}
                              </span>
                              {it.warehouse && (
                                <span className="truncate text-gray-400">{it.warehouse}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── New Request Modal ─────────────────────────────────────────────── */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-violet-600">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-white">New Material Request</h2>
                <p className="text-[10px] text-indigo-200 mt-0.5">Will be saved to ERPNext · {ERPNEXT_URL}</p>
              </div>
              <button onClick={() => setShowNew(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Header fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Title / Purpose <span className="text-red-500">*</span>
                  </label>
                  <input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                    placeholder="e.g. WTT-1045 COOLING TOWER FITTINGS"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Request Type</label>
                  <div className="relative">
                    <select value={formType} onChange={e => setFormType(e.target.value)}
                      className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-8">
                      {MR_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Required By <span className="text-red-500">*</span>
                  </label>
                  <input type="date" value={formScheduleDate} onChange={e => setFormScheduleDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project</label>
                  <input value={formProject} onChange={e => setFormProject(e.target.value)}
                    placeholder="e.g. WTT-1045"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300" />
                </div>
                {companies.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Company</label>
                    <div className="relative">
                      <select value={formCompany} onChange={e => setFormCompany(e.target.value)}
                        className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-8">
                        {companies.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Items table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">
                    Items <span className="text-red-500">*</span>
                    <span className="ml-1.5 text-gray-400 font-normal">({formItems.length})</span>
                  </label>
                  <button onClick={addItem}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors">
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 w-8">#</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Item Code</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">UOM</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Warehouse</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Required By</th>
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((item, i) => (
                        <ItemRow key={i} item={item} index={i} itemsList={itemsList} warehouses={warehouses}
                          onChange={updateItem} onRemove={removeItem} />
                      ))}
                    </tbody>
                  </table>
                  {formItems.length === 0 && (
                    <div className="py-10 text-center text-sm text-gray-400">
                      <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      No items yet — click <b>Add Item</b> above
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/60">
              <p className="text-xs text-gray-400">
                {formItems.length} item{formItems.length !== 1 ? "s" : ""} · {formType}
              </p>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowNew(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                  {submitting ? "Creating…" : "Create in ERPNext"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
