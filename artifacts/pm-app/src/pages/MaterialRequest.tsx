import { Layout } from "@/components/Layout";
import {
  ShoppingCart, Plus, RefreshCw, Search, ExternalLink, X,
  Loader2, AlertCircle, ChevronDown, Trash2, Package,
  Calendar, Filter, SlidersHorizontal, CheckSquare, Square,
  Clock, ArrowUpDown, ChevronUp, ChevronDown as ChevronDownIcon,
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
  items?: MRItem[];
}

const MR_TYPES = ["Purchase", "Material Transfer", "Material Issue", "Customer Provided", "Material Transfer for Manufacture"];
const MR_STATUSES = ["Draft", "Submitted", "Stopped", "Cancelled", "Pending", "Approved"];

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d}d`;
  const mo = Math.floor(d / 30);
  return `${mo}mo`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function today() { return new Date().toISOString().slice(0, 10); }

type StatusStyle = { dot: string; badge: string; label: string };

function getStatusStyle(status: string): StatusStyle {
  switch ((status || "").toLowerCase()) {
    case "approved":    return { dot: "bg-green-500",  badge: "text-green-700 bg-green-50 border-green-200",  label: status };
    case "submitted":   return { dot: "bg-green-500",  badge: "text-green-700 bg-green-50 border-green-200",  label: status };
    case "draft":       return { dot: "bg-gray-400",   badge: "text-gray-600 bg-gray-100 border-gray-200",    label: "Draft" };
    case "created":     return { dot: "bg-gray-400",   badge: "text-gray-600 bg-gray-100 border-gray-200",    label: "Created" };
    case "pending":     return { dot: "bg-amber-500",  badge: "text-amber-700 bg-amber-50 border-amber-200",  label: "Pending" };
    case "stopped":     return { dot: "bg-red-500",    badge: "text-red-700 bg-red-50 border-red-200",        label: "Stopped" };
    case "cancelled":   return { dot: "bg-red-500",    badge: "text-red-700 bg-red-50 border-red-200",        label: "Cancelled" };
    case "ordered":     return { dot: "bg-blue-500",   badge: "text-blue-700 bg-blue-50 border-blue-200",     label: "Ordered" };
    case "transferred": return { dot: "bg-violet-500", badge: "text-violet-700 bg-violet-50 border-violet-200", label: "Transferred" };
    default:            return { dot: "bg-gray-400",   badge: "text-gray-600 bg-gray-100 border-gray-200",    label: status };
  }
}

const EMPTY_ITEM: MRItem = { item_code: "", qty: 1, uom: "Nos" };

function ItemRow({ item, index, itemsList, warehouses, onChange, onRemove }: {
  item: MRItem; index: number; itemsList: string[]; warehouses: string[];
  onChange: (i: number, f: keyof MRItem, v: string | number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <tr className="border-b border-gray-100 hover:bg-indigo-50/30 transition-colors">
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
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

type SortField = "title" | "status" | "project" | "name" | "modified";

export default function MaterialRequestPage() {
  const { toast } = useToast();

  const [records, setRecords] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter]     = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [projectInput, setProjectInput]   = useState("");
  const projectDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sortField, setSortField]  = useState<SortField>("modified");
  const [sortAsc, setSortAsc]      = useState(false);
  const [selected, setSelected]    = useState<Set<string>>(new Set());

  const [detail, setDetail]          = useState<MaterialRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showNew, setShowNew]        = useState(false);

  const [itemsList, setItemsList]    = useState<string[]>([]);
  const [warehouses, setWarehouses]  = useState<string[]>([]);
  const [companies, setCompanies]    = useState<string[]>([]);

  const [formTitle, setFormTitle]         = useState("");
  const [formType, setFormType]           = useState("Purchase");
  const [formScheduleDate, setFormScheduleDate] = useState(today());
  const [formCompany, setFormCompany]     = useState("");
  const [formProject, setFormProject]     = useState("");
  const [formItems, setFormItems]         = useState<MRItem[]>([{ ...EMPTY_ITEM }]);
  const [submitting, setSubmitting]       = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter)  params.set("status", statusFilter);
      if (typeFilter)    params.set("type", typeFilter);
      if (projectFilter) params.set("project", projectFilter);
      const res = await fetch(`${BASE}/api/material-requests?${params.toString()}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setRecords(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
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

  const openDetail = async (mr: MaterialRequest) => {
    setDetail(mr);
    setDetailLoading(true);
    try {
      const res = await fetch(`${BASE}/api/material-requests/${encodeURIComponent(mr.name)}`);
      if (!res.ok) throw new Error("Failed");
      setDetail(await res.json());
    } catch { }
    finally { setDetailLoading(false); }
  };

  const updateItem = (i: number, field: keyof MRItem, val: string | number) =>
    setFormItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
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
        body: JSON.stringify({ title: formTitle, material_request_type: formType, schedule_date: formScheduleDate, company: formCompany || undefined, project: formProject || undefined, items: formItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      toast({ title: `${data.name} created successfully!` });
      setShowNew(false);
      setFormTitle(""); setFormType("Purchase"); setFormScheduleDate(today()); setFormItems([{ ...EMPTY_ITEM }]); setFormProject("");
      fetchRecords();
    } catch (e) {
      toast({ title: "Error creating request", description: String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(a => !a);
    else { setSortField(field); setSortAsc(true); }
  };

  const toggleSelect = (name: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });

  const allSelected = records.length > 0 && records.every(r => selected.has(r.name));
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(records.map(r => r.name)));

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(s) ||
      (r.title ?? "").toLowerCase().includes(s) ||
      (r.project ?? "").toLowerCase().includes(s) ||
      (r.company ?? "").toLowerCase().includes(s)
    );
  }).sort((a, b) => {
    let av = "", bv = "";
    if (sortField === "title")    { av = a.title ?? ""; bv = b.title ?? ""; }
    if (sortField === "status")   { av = a.status;       bv = b.status; }
    if (sortField === "project")  { av = a.project ?? ""; bv = b.project ?? ""; }
    if (sortField === "name")     { av = a.name;          bv = b.name; }
    if (sortField === "modified") { av = a.modified ?? ""; bv = b.modified ?? ""; }
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const SortIcon = ({ field }: { field: SortField }) => (
    sortField === field
      ? (sortAsc ? <ChevronUp className="w-3 h-3 text-indigo-500" /> : <ChevronDownIcon className="w-3 h-3 text-indigo-500" />)
      : <ArrowUpDown className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
  );

  const activeFilters = [statusFilter, typeFilter, projectFilter].filter(Boolean).length;

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden">

        {/* ── Top header ── */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 shrink-0" />
          <h1 className="text-sm font-bold text-gray-800 flex-1">Material Request</h1>

          <a href={`${ERPNEXT_URL}/app/material-request`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Open in ERPNext
          </a>

          <button onClick={fetchRecords} title="Refresh"
            className={`p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors ${loading ? "animate-pulse" : ""}`}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Add Material Request
          </button>
        </div>

        {/* ── Filter bar ── */}
        <div className="bg-white border-b border-gray-200 px-5 py-2.5 flex flex-wrap items-center gap-2 shrink-0">

          {/* Search */}
          <div className="relative min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 focus:bg-white transition-colors" />
          </div>

          {/* Project filter */}
          <div className="relative">
            <input
              value={projectInput}
              onChange={e => {
                setProjectInput(e.target.value);
                if (projectDebounce.current) clearTimeout(projectDebounce.current);
                projectDebounce.current = setTimeout(() => setProjectFilter(e.target.value), 400);
              }}
              placeholder="Project (e.g. WTT-1045)"
              className={`pl-3 pr-7 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 focus:bg-white transition-colors w-44 ${projectFilter ? "border-indigo-400 bg-indigo-50" : "border-gray-200"}`}
            />
            {projectInput && (
              <button onClick={() => { setProjectInput(""); setProjectFilter(""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status */}
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className={`appearance-none pl-3 pr-7 py-1.5 text-xs border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${statusFilter ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-medium" : "border-gray-200"}`}>
              <option value="">All Statuses</option>
              {MR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Type */}
          <div className="relative">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className={`appearance-none pl-3 pr-7 py-1.5 text-xs border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${typeFilter ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-medium" : "border-gray-200"}`}>
              <option value="">All Types</option>
              {MR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Clear filters */}
          {activeFilters > 0 && (
            <button onClick={() => { setStatusFilter(""); setTypeFilter(""); setProjectFilter(""); setProjectInput(""); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 border border-red-200 transition-colors">
              <X className="w-3 h-3" /> Clear ({activeFilters})
            </button>
          )}

          <span className="ml-auto text-xs text-gray-400 tabular-nums">
            {filtered.length} of {records.length}
          </span>
        </div>

        {/* ── Main body ── */}
        <div className="flex-1 overflow-hidden flex">

          {/* List/Table */}
          <div className="flex-1 overflow-auto">

            {/* States */}
            {loading && (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
                <p className="text-sm">Loading from ERPNext…</p>
              </div>
            )}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-500">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm font-medium">Failed to load</p>
                <p className="text-xs text-gray-400 max-w-sm text-center">{error}</p>
                <button onClick={fetchRecords} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm hover:bg-red-100 border border-red-200 transition-colors">Retry</button>
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                <Package className="w-10 h-10 text-gray-200" />
                <p className="text-sm font-medium">No material requests found</p>
                <p className="text-xs">Try adjusting filters or create a new request</p>
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2.5 w-8">
                      <button onClick={toggleAll} className="text-gray-400 hover:text-indigo-600 transition-colors">
                        {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-indigo-600" /> : <Square className="w-3.5 h-3.5" />}
                      </button>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <button onClick={() => toggleSort("title")} className="group flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800">
                        Title <SortIcon field="title" />
                      </button>
                    </th>
                    <th className="px-3 py-2.5 text-left w-28">
                      <button onClick={() => toggleSort("status")} className="group flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800">
                        Status <SortIcon field="status" />
                      </button>
                    </th>
                    <th className="px-3 py-2.5 text-left w-36">
                      <button onClick={() => toggleSort("project")} className="group flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800">
                        Project <SortIcon field="project" />
                      </button>
                    </th>
                    <th className="px-3 py-2.5 text-left w-40">
                      <button onClick={() => toggleSort("name")} className="group flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800">
                        ID <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="px-3 py-2.5 text-right w-28">
                      <button onClick={() => toggleSort("modified")} className="group flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800 ml-auto">
                        Last Updated <SortIcon field="modified" />
                      </button>
                    </th>
                    <th className="px-3 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filtered.map(mr => {
                    const st = getStatusStyle(mr.status);
                    const isSelected = selected.has(mr.name);
                    const isActive   = detail?.name === mr.name;
                    return (
                      <tr
                        key={mr.name}
                        onClick={() => openDetail(mr)}
                        className={`cursor-pointer transition-colors group ${isActive ? "bg-indigo-50/70" : isSelected ? "bg-indigo-50/40" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(mr.name); }}>
                          <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300 group-hover:border-indigo-400"}`}>
                            {isSelected && <svg viewBox="0 0 12 12" className="w-2 h-2 text-white" fill="currentColor"><path d="M1 6l3 3 7-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>}
                          </div>
                        </td>
                        <td className="px-3 py-3 max-w-xs">
                          <span className={`font-medium text-sm leading-snug truncate block ${isActive ? "text-indigo-700" : "text-gray-800 group-hover:text-indigo-600"} transition-colors`}>
                            {mr.title || mr.name}
                          </span>
                          {mr.material_request_type && (
                            <span className="text-[10px] text-gray-400">{mr.material_request_type}</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${st.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                            {st.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {mr.project ? (
                            <button
                              onClick={e => { e.stopPropagation(); setProjectInput(mr.project!); setProjectFilter(mr.project!); }}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                            >
                              {mr.project}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs font-mono text-gray-500">{mr.name}</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-xs text-gray-400 tabular-nums">{timeAgo(mr.modified)}</span>
                        </td>
                        <td className="px-2 py-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={`${ERPNEXT_URL}/app/material-request/${mr.name}`} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-1 rounded text-gray-400 hover:text-indigo-600 transition-colors inline-flex">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
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
            <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden shrink-0 shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-800 font-mono leading-tight">{detail.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{detail.material_request_type}</p>
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  <a href={`${ERPNEXT_URL}/app/material-request/${detail.name}`} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Open in ERPNext">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {detailLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {/* Status & title */}
                  <div className="px-4 py-4 border-b border-gray-50 space-y-3">
                    {(() => { const st = getStatusStyle(detail.status); return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${st.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    ); })()}
                    {detail.title && <p className="text-sm font-semibold text-gray-800 leading-snug">{detail.title}</p>}
                  </div>

                  {/* Meta grid */}
                  <div className="px-4 py-4 border-b border-gray-50 grid grid-cols-2 gap-x-4 gap-y-3">
                    {detail.project && (
                      <div className="col-span-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Project</p>
                        <p className="text-xs font-semibold text-indigo-600">{detail.project}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Date</p>
                      <p className="text-xs text-gray-700">{formatDate(detail.transaction_date)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Required By</p>
                      <p className="text-xs text-gray-700">{formatDate(detail.schedule_date)}</p>
                    </div>
                    {detail.company && (
                      <div className="col-span-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Company</p>
                        <p className="text-xs text-gray-700">{detail.company}</p>
                      </div>
                    )}
                    {detail.requested_by && (
                      <div className="col-span-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Requested By</p>
                        <p className="text-xs text-gray-700">{detail.requested_by}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Last Updated</p>
                      <p className="text-xs text-gray-700">{formatDate(detail.modified)}</p>
                    </div>
                  </div>

                  {/* Items */}
                  {detail.items && detail.items.length > 0 && (
                    <div className="px-4 py-4">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-3">Items ({detail.items.length})</p>
                      <div className="space-y-2">
                        {detail.items.map((it, i) => (
                          <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                            <p className="text-xs font-semibold text-gray-800 truncate">{it.item_name || it.item_code}</p>
                            {it.item_name && it.item_code !== it.item_name && (
                              <p className="text-[10px] text-gray-400 font-mono">{it.item_code}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500 flex-wrap">
                              <span>Qty <b className="text-gray-700">{it.qty}</b> {it.uom}</span>
                              {it.warehouse && <span className="truncate">{it.warehouse}</span>}
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

      {/* ── New MR Modal ── */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-gray-900">New Material Request</h2>
                <p className="text-[10px] text-gray-400">Will be created in ERPNext</p>
              </div>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title / Purpose <span className="text-red-500">*</span></label>
                  <input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                    placeholder="e.g. WTT-1045 COOLING TOWER FITTINGS"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Request Type</label>
                  <div className="relative">
                    <select value={formType} onChange={e => setFormType(e.target.value)}
                      className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-8">
                      {MR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Required By <span className="text-red-500">*</span></label>
                  <input type="date" value={formScheduleDate} onChange={e => setFormScheduleDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project</label>
                  <input value={formProject} onChange={e => setFormProject(e.target.value)}
                    placeholder="e.g. WTT-1045"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                {companies.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Company</label>
                    <div className="relative">
                      <select value={formCompany} onChange={e => setFormCompany(e.target.value)}
                        className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-8">
                        {companies.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">Items <span className="text-red-500">*</span></label>
                  <button onClick={addItem}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400 w-8">#</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Item Code</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Qty</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">UOM</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Warehouse</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Required By</th>
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((item, i) => (
                        <ItemRow key={i} item={item} index={i} itemsList={itemsList} warehouses={warehouses} onChange={updateItem} onRemove={removeItem} />
                      ))}
                    </tbody>
                  </table>
                  {formItems.length === 0 && (
                    <div className="py-8 text-center text-sm text-gray-400">
                      No items added yet — click "Add Item" above.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setShowNew(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                {submitting ? "Creating…" : "Create in ERPNext"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
