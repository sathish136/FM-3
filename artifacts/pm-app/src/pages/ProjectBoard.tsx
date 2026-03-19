import { Fragment, useMemo } from "react";
import { Layout } from "@/components/Layout";
import {
  LayoutGrid, Search, RefreshCw, Loader2, ExternalLink,
  Filter, ChevronDown, ChevronRight, ChevronUp, Package,
  TrendingUp, CheckCircle2, Clock, AlertTriangle, XCircle,
  ChevronsUpDown, ArrowUpDown, CalendarDays, SlidersHorizontal,
  Expand, Shrink, Eye, EyeOff,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE    = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERP_URL = "https://erp.wttint.com";

interface ChildRow {
  technical_description: string;
  mr_qty: number; store_qty: number; production_qty: number;
  not_req_qty: number; buy_required: number; po_qty: number;
  received_qty: number; po_pending: number; pr_pending: number;
  delivery_from: string | null; delivery_to: string | null;
  aging: string; mr_no: string; po_no: string;
}
interface Row {
  description: string;
  mr_qty: number; store_qty: number; production_qty: number;
  not_req_qty: number; buy_required: number; po_qty: number;
  received_qty: number; po_pending: number; pr_pending: number;
  delivery_from: string | null; delivery_to: string | null;
  aging: string; mr_no: string; po_no: string;
  child_rows: ChildRow[];
}

type SortKey = keyof Pick<Row, "description"|"mr_qty"|"buy_required"|"po_qty"|"po_pending"|"pr_pending"|"delivery_to">;
type SortDir = "asc" | "desc";

function stripHtml(s: string) {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function fmtDate(d: string | null) {
  if (!d) return null;
  const p = d.split("-");
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0].slice(2)}`;
  return d;
}
function toISO(d: string | null) { return d || ""; }

function AgingBadge({ val }: { val: string }) {
  if (!val) return <span className="text-gray-300 text-xs">—</span>;
  const isPending = val.toLowerCase().includes("pending");
  const num = parseInt(val);
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
      isPending
        ? num > 30 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
        : "bg-emerald-100 text-emerald-600"
    }`}>
      {isPending ? <AlertTriangle className="w-3 h-3 shrink-0" /> : <CheckCircle2 className="w-3 h-3 shrink-0" />}
      {val}
    </span>
  );
}

function Links({ val, doctype }: { val: string; doctype: string }) {
  if (!val) return <span className="text-gray-300">—</span>;
  const items = val.split("||").filter(Boolean);
  return (
    <div className="flex flex-col gap-0.5 max-h-14 overflow-y-auto">
      {items.map(v => (
        <a key={v} href={`${ERP_URL}/app/${doctype}/${v}`} target="_blank" rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 hover:underline font-mono text-[10px] whitespace-nowrap">
          {v}
        </a>
      ))}
    </div>
  );
}

function Qty({ v, red, amber }: { v: number; red?: boolean; amber?: boolean }) {
  if (v === 0) return <span className="text-gray-300 tabular-nums text-xs">0.00</span>;
  return (
    <span className={`font-semibold tabular-nums text-xs ${red ? "text-red-600" : amber ? "text-amber-600" : "text-gray-700"}`}>
      {v.toFixed(2)}
    </span>
  );
}

function Chip({ label, active, color, onToggle }: { label: string; active: boolean; color: string; onToggle: () => void }) {
  const colors: Record<string, string> = {
    red:    active ? "bg-red-50 border-red-300 text-red-600"    : "border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-400",
    amber:  active ? "bg-amber-50 border-amber-300 text-amber-600" : "border-gray-200 text-gray-500 hover:border-amber-200 hover:text-amber-400",
    orange: active ? "bg-orange-50 border-orange-300 text-orange-600" : "border-gray-200 text-gray-500 hover:border-orange-200 hover:text-orange-400",
    blue:   active ? "bg-blue-50 border-blue-300 text-blue-600"  : "border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-400",
    violet: active ? "bg-violet-50 border-violet-300 text-violet-600" : "border-gray-200 text-gray-500 hover:border-violet-200 hover:text-violet-400",
  };
  return (
    <button onClick={onToggle} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer select-none transition-all ${colors[color]}`}>
      <div className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${active ? "border-current bg-current" : "border-gray-300"}`}>
        {active && <svg className="w-1.5 h-1.5 text-white" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      {label}
    </button>
  );
}

const COLUMNS = [
  { key: "mr_qty",        label: "MR Qty",      color: "text-blue-500" },
  { key: "store_qty",     label: "Store",        color: "text-teal-500" },
  { key: "production_qty",label: "Prod",         color: "text-violet-500" },
  { key: "not_req_qty",   label: "Not Req",      color: "text-gray-400" },
  { key: "buy_required",  label: "Buy Req",      color: "text-indigo-500" },
  { key: "po_qty",        label: "PO Qty",       color: "text-blue-400" },
  { key: "received_qty",  label: "Received",     color: "text-emerald-500" },
  { key: "po_pending",    label: "PO Pending",   color: "text-red-500" },
  { key: "pr_pending",    label: "PR Pending",   color: "text-amber-500" },
  { key: "delivery_from", label: "Del. From",    color: "" },
  { key: "delivery_to",   label: "Del. To",      color: "" },
  { key: "aging",         label: "Aging",        color: "" },
  { key: "mr_no",         label: "MR No",        color: "" },
  { key: "po_no",         label: "PO No",        color: "" },
] as const;

const StatCard = ({ icon: Icon, label, value, color, onClick, active }: { icon: any; label: string; value: number; color: string; onClick?: () => void; active?: boolean }) => (
  <button onClick={onClick} className={`flex items-center gap-3 bg-white rounded-xl px-4 py-3 border shadow-sm min-w-[100px] transition-all ${color} ${active ? "ring-2 ring-offset-1 ring-current" : ""} ${onClick ? "hover:shadow-md cursor-pointer" : "cursor-default"}`}>
    <Icon className="w-4 h-4 shrink-0 opacity-70" />
    <div className="text-left">
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] text-current opacity-70 mt-0.5 whitespace-nowrap">{label}</p>
    </div>
  </button>
);

export default function ProjectBoard() {
  const { toast } = useToast();
  const [rows, setRows]           = useState<Row[]>([]);
  const [projects, setProjects]   = useState<{ name: string; project_name: string }[]>([]);
  const [mrRemarks, setMrRemarks] = useState<string[]>([]);
  const [loading, setLoading]     = useState(false);
  const [expanded, setExpanded]   = useState<Set<number>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hiddenCols, setHiddenCols]    = useState<Set<string>>(new Set(["store_qty","production_qty","not_req_qty"]));
  const [showColPicker, setShowColPicker] = useState(false);

  // ── Server filters ──
  const [project, setProject]   = useState("WTT-0528");
  const [remarks, setRemarks]   = useState("");

  // ── Client filters ──
  const [search, setSearch]           = useState("");
  const [pendingOnly, setPendingOnly]     = useState(false);
  const [poNotCreated, setPoNotCreated]   = useState(false);
  const [prPendingOnly, setPrPendingOnly] = useState(false);
  const [buyReqOnly, setBuyReqOnly]       = useState(false);
  const [due, setDue]                 = useState(false);
  const [agingFilter, setAgingFilter] = useState<"all"|"overdue"|"ontrack"|"none">("all");
  const [deliveryFrom, setDeliveryFrom] = useState("");
  const [deliveryTo,   setDeliveryTo]   = useState("");
  const [minPoPending, setMinPoPending] = useState("");

  // ── Sort ──
  const [sortKey, setSortKey] = useState<SortKey>("description");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const loadData = useCallback(async (force = false) => {
    setLoading(true);
    setExpanded(new Set());
    try {
      const p = new URLSearchParams();
      if (project) p.set("project", project);
      if (remarks) p.set("mr_remarks", remarks);
      if (force)   p.set("refresh", "1");
      const r = await fetch(`${BASE}/api/project-board?${p}`);
      if (!r.ok) throw new Error(await r.text());
      setRows(await r.json());
    } catch (e) {
      toast({ title: "Failed to load Project Board", description: String(e), variant: "destructive" });
    } finally { setLoading(false); }
  }, [project, remarks, toast]);

  useEffect(() => {
    fetch(`${BASE}/api/project-board/projects`)
      .then(r => r.ok ? r.json() : []).then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    const url = `${BASE}/api/project-board/mr-remarks${project ? `?project=${encodeURIComponent(project)}` : ""}`;
    fetch(url).then(r => r.ok ? r.json() : []).then(setMrRemarks).catch(() => {});
    setRemarks("");
  }, [project]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleRow  = (i: number) => setExpanded(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
  const expandAll  = () => setExpanded(new Set(filtered.map((_, i) => i)));
  const collapseAll = () => setExpanded(new Set());
  const toggleCol  = (k: string) => setHiddenCols(prev => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s; });

  const minPo = minPoPending ? parseFloat(minPoPending) : 0;

  const filtered = useMemo(() => {
    let data = rows.filter(r => {
      if (search) {
        const q = search.toLowerCase();
        if (!stripHtml(r.description).toLowerCase().includes(q) &&
            !r.mr_no.toLowerCase().includes(q) &&
            !r.po_no.toLowerCase().includes(q)) return false;
      }
      if (pendingOnly   && r.po_pending <= 0)         return false;
      if (poNotCreated  && r.po_no)                   return false;
      if (prPendingOnly && r.pr_pending <= 0)          return false;
      if (buyReqOnly    && r.buy_required <= 0)        return false;
      if (due           && !r.aging?.toLowerCase().includes("pending")) return false;
      if (minPo > 0     && r.po_pending < minPo)       return false;

      if (agingFilter === "overdue")  return r.aging?.toLowerCase().includes("pending");
      if (agingFilter === "ontrack")  return r.aging?.toLowerCase().includes("to receive");
      if (agingFilter === "none")     return !r.aging;

      if (deliveryFrom && toISO(r.delivery_to) && toISO(r.delivery_to) < deliveryFrom) return false;
      if (deliveryTo   && toISO(r.delivery_to) && toISO(r.delivery_to) > deliveryTo)   return false;
      return true;
    });

    data = [...data].sort((a, b) => {
      let av: any = a[sortKey] ?? "";
      let bv: any = b[sortKey] ?? "";
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      return sortDir === "asc" ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
    });
    return data;
  }, [rows, search, pendingOnly, poNotCreated, prPendingOnly, buyReqOnly, due, minPo, agingFilter, deliveryFrom, deliveryTo, sortKey, sortDir]);

  const pending   = rows.filter(r => r.po_pending > 0).length;
  const completed = rows.filter(r => r.po_pending === 0).length;
  const noPo      = rows.filter(r => !r.po_no).length;
  const dueCount  = rows.filter(r => r.aging?.toLowerCase().includes("pending")).length;
  const prCount   = rows.filter(r => r.pr_pending > 0).length;

  const activeFilters = [pendingOnly, poNotCreated, prPendingOnly, buyReqOnly, due, !!search, !!minPoPending, agingFilter !== "all", !!deliveryFrom, !!deliveryTo].filter(Boolean).length;
  const selectedProjectName = projects.find(p => p.name === project)?.project_name || project;

  const SortTH = ({ label, sKey, right, color }: { label: string; sKey: SortKey; right?: boolean; color?: string }) => (
    <th onClick={() => handleSort(sKey)}
      className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider bg-slate-50 border-b border-gray-200 whitespace-nowrap select-none cursor-pointer group hover:bg-slate-100 transition-colors ${right ? "text-right" : "text-left"}`}>
      <span className={`inline-flex items-center gap-1 ${color || "text-gray-500"}`}>
        {label}
        {sortKey === sKey
          ? sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
          : <ChevronsUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40" />}
      </span>
    </th>
  );

  const PlainTH = ({ label, color }: { label: string; color?: string }) => (
    <th className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider bg-slate-50 border-b border-gray-200 whitespace-nowrap select-none ${color ? color : "text-gray-500"}`}>
      {label}
    </th>
  );

  const visibleCols = COLUMNS.filter(c => !hiddenCols.has(c.key));

  const clearAllFilters = () => {
    setSearch(""); setPendingOnly(false); setPoNotCreated(false);
    setPrPendingOnly(false); setBuyReqOnly(false); setDue(false);
    setAgingFilter("all"); setDeliveryFrom(""); setDeliveryTo(""); setMinPoPending("");
  };

  return (
    <Layout>
      <div className="h-full flex flex-col bg-slate-100 overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 shrink-0">
          <LayoutGrid className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 leading-none">Project Board</h1>
            {project && <p className="text-[11px] text-blue-500 mt-0.5 truncate">{selectedProjectName}</p>}
          </div>
          {/* Force refresh (bypass cache) */}
          <button onClick={() => loadData(true)} disabled={loading} title="Force refresh from server"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          {/* Expand / Collapse */}
          <button onClick={expandAll} title="Expand all"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <Expand className="w-3.5 h-3.5" />
          </button>
          <button onClick={collapseAll} title="Collapse all"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <Shrink className="w-3.5 h-3.5" />
          </button>
          {/* Column picker */}
          <div className="relative">
            <button onClick={() => setShowColPicker(v => !v)} title="Show/hide columns"
              className={`p-1.5 rounded-lg transition-colors ${showColPicker ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`}>
              <Eye className="w-3.5 h-3.5" />
            </button>
            {showColPicker && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-3 min-w-[170px]">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Columns</p>
                {COLUMNS.map(c => (
                  <label key={c.key} className="flex items-center gap-2 py-1 cursor-pointer hover:text-blue-600 text-xs text-gray-600">
                    <input type="checkbox" checked={!hiddenCols.has(c.key)} onChange={() => toggleCol(c.key)}
                      className="w-3.5 h-3.5 accent-blue-500" />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <a href={`${ERP_URL}/app/project-board`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> ERPNext
          </a>
          <button onClick={loadData} disabled={loading}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ── Stats (clickable) ── */}
        <div className="px-5 pt-3 pb-2 flex gap-2 shrink-0 flex-wrap">
          <StatCard icon={TrendingUp}   label="Total"         value={rows.length} color="border-blue-100 text-blue-600" />
          <StatCard icon={XCircle}      label="PO Pending"    value={pending}     color="border-red-100 text-red-500"
            onClick={() => { setPendingOnly(v => !v); setPoNotCreated(false); setPrPendingOnly(false); }}
            active={pendingOnly} />
          <StatCard icon={CheckCircle2} label="Completed"     value={completed}   color="border-emerald-100 text-emerald-600" />
          <StatCard icon={Package}      label="PO Not Created" value={noPo}       color="border-amber-100 text-amber-500"
            onClick={() => { setPoNotCreated(v => !v); setPendingOnly(false); }}
            active={poNotCreated} />
          <StatCard icon={AlertTriangle} label="PR Pending"   value={prCount}    color="border-orange-100 text-orange-500"
            onClick={() => { setPrPendingOnly(v => !v); }}
            active={prPendingOnly} />
          <StatCard icon={Clock}        label="Due / Overdue" value={dueCount}    color="border-rose-100 text-rose-500"
            onClick={() => { setDue(v => !v); setAgingFilter("all"); }}
            active={due} />
        </div>

        {/* ── Filter bar ── */}
        <div className="px-5 pb-2 shrink-0 space-y-2">
          {/* Row 1: main filters */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5 flex flex-wrap items-center gap-2 shadow-sm">

            {/* Project */}
            <div className="relative">
              <select value={project} onChange={e => setProject(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[190px] max-w-[260px]">
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.name} value={p.name}>{p.project_name || p.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Remarks */}
            <div className="relative">
              <select value={remarks} onChange={e => setRemarks(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[130px]">
                <option value="">All Remarks</option>
                {mrRemarks.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            <div className="w-px h-5 bg-gray-200 shrink-0" />

            {/* Quick chips */}
            <Chip label="PO Pending"    active={pendingOnly}    color="red"    onToggle={() => setPendingOnly(v => !v)} />
            <Chip label="PO Not Created" active={poNotCreated}  color="amber"  onToggle={() => setPoNotCreated(v => !v)} />
            <Chip label="PR Pending"    active={prPendingOnly}  color="orange" onToggle={() => setPrPendingOnly(v => !v)} />
            <Chip label="Buy Required"  active={buyReqOnly}     color="violet" onToggle={() => setBuyReqOnly(v => !v)} />
            <Chip label="Due"           active={due}            color="red"    onToggle={() => setDue(v => !v)} />

            {/* Search */}
            <div className="relative flex-1 min-w-[160px] ml-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search description, MR No, PO No…"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
              />
            </div>

            {/* Advanced toggle */}
            <button onClick={() => setShowAdvanced(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                showAdvanced ? "bg-blue-50 border-blue-300 text-blue-600" : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Advanced
              {activeFilters > 0 && <span className="bg-blue-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>}
            </button>
          </div>

          {/* Row 2: advanced filters */}
          {showAdvanced && (
            <div className="bg-white rounded-xl border border-blue-100 px-4 py-3 flex flex-wrap items-end gap-4 shadow-sm">

              {/* Aging status */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Aging Status</label>
                <div className="flex gap-1">
                  {(["all","overdue","ontrack","none"] as const).map(v => (
                    <button key={v} onClick={() => setAgingFilter(v)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        agingFilter === v
                          ? v === "overdue" ? "bg-red-50 border-red-300 text-red-600"
                          : v === "ontrack" ? "bg-emerald-50 border-emerald-300 text-emerald-600"
                          : v === "none"    ? "bg-gray-100 border-gray-300 text-gray-600"
                          : "bg-blue-50 border-blue-300 text-blue-600"
                          : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}>
                      {v === "all" ? "All" : v === "overdue" ? "Overdue" : v === "ontrack" ? "On Track" : "No Date"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery date range */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Delivery To — From
                </label>
                <div className="flex items-center gap-2">
                  <input type="date" value={deliveryFrom} onChange={e => setDeliveryFrom(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  <span className="text-gray-300 text-xs">—</span>
                  <input type="date" value={deliveryTo} onChange={e => setDeliveryTo(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>

              {/* Min PO Pending */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Min PO Pending Qty</label>
                <input type="number" min="0" value={minPoPending} onChange={e => setMinPoPending(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-28 px-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>

              {/* Sort */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" /> Sort By
                </label>
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
                      className="appearance-none pl-2.5 pr-6 py-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="description">Description</option>
                      <option value="mr_qty">MR Qty</option>
                      <option value="buy_required">Buy Required</option>
                      <option value="po_qty">PO Qty</option>
                      <option value="po_pending">PO Pending</option>
                      <option value="pr_pending">PR Pending</option>
                      <option value="delivery_to">Delivery To</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                  </div>
                  <button onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                    className="p-1 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors">
                    {sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="ml-auto">
                <button onClick={clearAllFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                  <Filter className="w-3 h-3" /> Clear All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto px-5 pb-5" onClick={() => showColPicker && setShowColPicker(false)}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-sm text-gray-400">Loading project board…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
              <Package className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">No items match the current filters</p>
              <button onClick={clearAllFilters}
                className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                <Filter className="w-3.5 h-3.5" /> Clear all filters
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      {/* Sticky # */}
                      <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-slate-50 border-b border-gray-200 sticky left-0 z-20 w-10">#</th>
                      {/* Description sortable */}
                      <SortTH label="Description" sKey="description" color="text-gray-600" />
                      {/* Dynamic columns */}
                      {visibleCols.map(c => {
                        const sortable = ["mr_qty","buy_required","po_qty","po_pending","pr_pending","delivery_to"].includes(c.key);
                        return sortable
                          ? <SortTH key={c.key} label={c.label} sKey={c.key as SortKey} right color={c.color || "text-gray-500"} />
                          : <PlainTH key={c.key} label={c.label} color={c.color || "text-gray-500"} />;
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((row, i) => {
                      const isOpen  = expanded.has(i);
                      const hasKids = (row.child_rows || []).length > 0;
                      const overdue = row.aging?.toLowerCase().includes("pending");
                      const poPend  = row.po_pending > 0;
                      const prPend  = row.pr_pending > 0;

                      const cellVal = (key: string) => {
                        switch (key) {
                          case "mr_qty":         return <Qty v={row.mr_qty} />;
                          case "store_qty":      return <Qty v={row.store_qty} />;
                          case "production_qty": return <Qty v={row.production_qty} />;
                          case "not_req_qty":    return <Qty v={row.not_req_qty} />;
                          case "buy_required":   return <Qty v={row.buy_required} />;
                          case "po_qty":         return <Qty v={row.po_qty} />;
                          case "received_qty":   return <Qty v={row.received_qty} />;
                          case "po_pending":     return poPend
                            ? <span className="bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-md text-[11px] tabular-nums">{row.po_pending.toFixed(2)}</span>
                            : <Qty v={row.po_pending} />;
                          case "pr_pending":     return prPend
                            ? <span className="bg-amber-100 text-amber-600 font-bold px-2 py-0.5 rounded-md text-[11px] tabular-nums">{row.pr_pending.toFixed(2)}</span>
                            : <Qty v={row.pr_pending} />;
                          case "delivery_from":  return <span className="text-gray-500 whitespace-nowrap">{fmtDate(row.delivery_from) || "—"}</span>;
                          case "delivery_to":    return <span className="text-gray-500 whitespace-nowrap">{fmtDate(row.delivery_to) || "—"}</span>;
                          case "aging":          return <AgingBadge val={row.aging} />;
                          case "mr_no":          return <Links val={row.mr_no} doctype="material-request" />;
                          case "po_no":          return <Links val={row.po_no} doctype="purchase-order" />;
                          default: return null;
                        }
                      };

                      const isRight = (key: string) => ["mr_qty","store_qty","production_qty","not_req_qty","buy_required","po_qty","received_qty","po_pending","pr_pending"].includes(key);

                      return (
                        <Fragment key={i}>
                          <tr onClick={() => hasKids && toggleRow(i)}
                            className={`transition-colors group ${hasKids ? "cursor-pointer" : ""} ${overdue ? "bg-red-50/30 hover:bg-red-50/60" : "hover:bg-blue-50/30"}`}>

                            <td className="px-3 py-2.5 sticky left-0 bg-inherit z-10 border-r border-gray-100 w-10">
                              <div className="flex items-center gap-1">
                                {hasKids
                                  ? isOpen
                                    ? <ChevronDown className="w-3 h-3 text-blue-400 shrink-0" />
                                    : <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-gray-500 shrink-0" />
                                  : <span className="w-3 h-3 shrink-0 block" />}
                                <span className="text-gray-400 font-mono text-[10px]">{i+1}</span>
                              </div>
                            </td>

                            <td className="px-3 py-2.5 min-w-[160px] max-w-[220px]">
                              <p className="font-semibold text-gray-800 text-[12px] leading-snug line-clamp-2">
                                {stripHtml(row.description) || "—"}
                              </p>
                              {(row.child_rows || []).length > 0 && (
                                <span className="text-[9px] text-blue-400 font-medium">{row.child_rows.length} items</span>
                              )}
                            </td>

                            {visibleCols.map(c => (
                              <td key={c.key}
                                className={`px-3 py-2.5 ${isRight(c.key) ? "text-right" : ""}`}
                                onClick={["mr_no","po_no"].includes(c.key) ? e => e.stopPropagation() : undefined}>
                                {cellVal(c.key)}
                              </td>
                            ))}
                          </tr>

                          {isOpen && (row.child_rows || []).map((c, j) => (
                            <tr key={`${i}-${j}`} className="bg-slate-50/60 hover:bg-blue-50/20 transition-colors border-l-2 border-l-blue-200">
                              <td className="px-3 py-2 sticky left-0 bg-inherit border-r border-gray-100">
                                <span className="w-3 h-3 block" />
                              </td>
                              <td className="px-3 py-2 min-w-[160px] max-w-[220px] pl-5">
                                <p className="text-[11px] italic text-gray-500 leading-snug line-clamp-2">
                                  {stripHtml(c.technical_description) || "—"}
                                </p>
                              </td>
                              {visibleCols.map(col => {
                                const cv = (k: string) => {
                                  const num = (v: number, r?: boolean, a?: boolean) =>
                                    v > 0
                                      ? <span className={`tabular-nums text-[11px] font-medium ${r ? "text-red-400" : a ? "text-amber-400" : "text-gray-500"}`}>{v.toFixed(2)}</span>
                                      : <span className="tabular-nums text-[11px] text-gray-300">0.00</span>;
                                  switch (k) {
                                    case "mr_qty":         return num(c.mr_qty);
                                    case "store_qty":      return num(c.store_qty);
                                    case "production_qty": return num(c.production_qty);
                                    case "not_req_qty":    return num(c.not_req_qty);
                                    case "buy_required":   return num(c.buy_required);
                                    case "po_qty":         return num(c.po_qty);
                                    case "received_qty":   return num(c.received_qty);
                                    case "po_pending":     return num(c.po_pending, true);
                                    case "pr_pending":     return num(c.pr_pending, false, true);
                                    case "delivery_from":  return <span className="text-[11px] text-gray-400">{fmtDate(c.delivery_from) || "—"}</span>;
                                    case "delivery_to":    return <span className="text-[11px] text-gray-400">{fmtDate(c.delivery_to) || "—"}</span>;
                                    case "aging":          return c.aging ? <span className={`text-[10px] font-medium ${c.aging.toLowerCase().includes("pending") ? "text-orange-400" : "text-emerald-500"}`}>{c.aging}</span> : <span className="text-gray-300">—</span>;
                                    case "mr_no":          return <Links val={c.mr_no} doctype="material-request" />;
                                    case "po_no":          return <Links val={c.po_no} doctype="purchase-order" />;
                                    default: return null;
                                  }
                                };
                                return (
                                  <td key={col.key}
                                    className={`px-3 py-2 ${isRight(col.key) ? "text-right" : ""}`}
                                    onClick={["mr_no","po_no"].includes(col.key) ? e => e.stopPropagation() : undefined}>
                                    {cv(col.key)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-gray-100 bg-slate-50 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-700">{filtered.length}</span> item{filtered.length !== 1 ? "s" : ""}
                  {filtered.length !== rows.length && <span className="text-gray-400 ml-1">of {rows.length} total</span>}
                  {activeFilters > 0 && <span className="ml-2 bg-blue-100 text-blue-500 px-2 py-0.5 rounded-full text-[10px] font-semibold">{activeFilters} filter{activeFilters !== 1 ? "s" : ""} active</span>}
                </span>
                {activeFilters > 0 && (
                  <button onClick={clearAllFilters}
                    className="text-[11px] text-blue-500 hover:underline flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
