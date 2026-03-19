import { Fragment } from "react";
import { Layout } from "@/components/Layout";
import {
  LayoutGrid, Search, RefreshCw, Loader2, ExternalLink,
  Filter, ChevronDown, ChevronRight, Package, TrendingUp,
  CheckCircle2, Clock, AlertTriangle, XCircle,
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

function AgingBadge({ val }: { val: string }) {
  if (!val) return <span className="text-gray-300 text-xs">—</span>;
  const isPending = val.toLowerCase().includes("pending");
  const num = parseInt(val);
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
      isPending
        ? num > 30 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
        : "bg-emerald-100 text-emerald-600"
    }`}>
      {isPending ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
      {val}
    </span>
  );
}

function Links({ val, doctype }: { val: string; doctype: string }) {
  if (!val) return <span className="text-gray-300">—</span>;
  const items = val.split("||").filter(Boolean);
  return (
    <div className="flex flex-col gap-0.5 max-h-14 overflow-y-auto scrollbar-thin">
      {items.map(v => (
        <a key={v} href={`${ERP_URL}/app/${doctype}/${v}`} target="_blank" rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 hover:underline font-mono text-[10px] whitespace-nowrap">
          {v}
        </a>
      ))}
    </div>
  );
}

function Qty({ v, warn, amber }: { v: number; warn?: boolean; amber?: boolean }) {
  if (v === 0) return <span className="text-gray-300 tabular-nums">0.00</span>;
  return (
    <span className={`font-semibold tabular-nums ${warn ? "text-red-500" : amber ? "text-amber-500" : "text-gray-700"}`}>
      {v.toFixed(2)}
    </span>
  );
}

const TH = ({ ch, right, sticky }: { ch: React.ReactNode; right?: boolean; sticky?: boolean }) => (
  <th className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-slate-50 border-b border-gray-200 whitespace-nowrap select-none ${right ? "text-right" : "text-left"} ${sticky ? "sticky left-0 z-20 bg-slate-50" : ""}`}>
    {ch}
  </th>
);

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => (
  <div className={`flex items-center gap-3 bg-white rounded-xl px-4 py-3 border shadow-sm min-w-[110px] ${color}`}>
    <Icon className="w-4 h-4 shrink-0 opacity-70" />
    <div>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] text-current opacity-70 mt-0.5">{label}</p>
    </div>
  </div>
);

export default function ProjectBoard() {
  const { toast } = useToast();
  const [rows, setRows]           = useState<Row[]>([]);
  const [projects, setProjects]   = useState<{ name: string; project_name: string }[]>([]);
  const [mrRemarks, setMrRemarks] = useState<string[]>([]);
  const [loading, setLoading]     = useState(false);
  const [expanded, setExpanded]   = useState<Set<number>>(new Set());

  const [project, setProject]         = useState("WTT-0528");
  const [remarks, setRemarks]         = useState("");
  const [pendingOnly, setPendingOnly]     = useState(false);
  const [poNotCreated, setPoNotCreated]   = useState(false);
  const [due, setDue]                 = useState(false);
  const [search, setSearch]           = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setExpanded(new Set());
    try {
      const p = new URLSearchParams();
      if (project) p.set("project", project);
      if (remarks) p.set("mr_remarks", remarks);
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

  const toggleRow = (i: number) =>
    setExpanded(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });

  let filtered = rows.filter(r =>
    !search ||
    stripHtml(r.description).toLowerCase().includes(search.toLowerCase()) ||
    r.mr_no.toLowerCase().includes(search.toLowerCase()) ||
    r.po_no.toLowerCase().includes(search.toLowerCase())
  );
  if (pendingOnly)  filtered = filtered.filter(r => r.po_pending > 0);
  if (poNotCreated) filtered = filtered.filter(r => !r.po_no);
  if (due)          filtered = filtered.filter(r => r.aging?.toLowerCase().includes("pending"));

  const pending   = rows.filter(r => r.po_pending > 0).length;
  const completed = rows.filter(r => r.po_pending === 0).length;
  const noPo      = rows.filter(r => !r.po_no).length;
  const dueCount  = rows.filter(r => r.aging?.toLowerCase().includes("pending")).length;

  const selectedProjectName = projects.find(p => p.name === project)?.project_name || project;

  return (
    <Layout>
      <div className="h-full flex flex-col bg-slate-100 overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shrink-0">
          <LayoutGrid className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 leading-none">Project Board</h1>
            {project && <p className="text-[11px] text-blue-500 mt-0.5 truncate">{selectedProjectName}</p>}
          </div>
          <a href={`${ERP_URL}/app/project-board`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> ERPNext
          </a>
          <button onClick={loadData} disabled={loading}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="px-6 pt-4 pb-3 flex gap-3 shrink-0 flex-wrap">
          <StatCard icon={TrendingUp}    label="Total"         value={rows.length} color="border-blue-100 text-blue-600" />
          <StatCard icon={XCircle}       label="PO Pending"    value={pending}     color="border-red-100 text-red-500" />
          <StatCard icon={CheckCircle2}  label="Completed"     value={completed}   color="border-emerald-100 text-emerald-600" />
          <StatCard icon={Package}       label="PO Not Created" value={noPo}       color="border-amber-100 text-amber-500" />
          <StatCard icon={Clock}         label="Due"           value={dueCount}    color="border-orange-100 text-orange-500" />
        </div>

        {/* ── Filters ── */}
        <div className="px-6 pb-3 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3 shadow-sm">
            {/* Project */}
            <div className="relative">
              <select value={project} onChange={e => setProject(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[200px] max-w-[280px]">
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.name} value={p.name}>{p.project_name || p.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* Remarks */}
            <div className="relative">
              <select value={remarks} onChange={e => setRemarks(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[140px]">
                <option value="">All Remarks</option>
                {mrRemarks.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            <div className="w-px h-5 bg-gray-200" />

            {/* Checkbox filters */}
            {[
              { label: "Pending Only",   val: pendingOnly,  set: setPendingOnly,  color: "red" },
              { label: "PO Not Created", val: poNotCreated, set: setPoNotCreated, color: "amber" },
              { label: "Due",            val: due,          set: setDue,          color: "orange" },
            ].map(cb => (
              <label key={cb.label} onClick={() => cb.set(!cb.val)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer select-none transition-all ${
                  cb.val
                    ? cb.color === "red"    ? "bg-red-50 border-red-200 text-red-600"
                    : cb.color === "amber"  ? "bg-amber-50 border-amber-200 text-amber-600"
                    :                        "bg-orange-50 border-orange-200 text-orange-600"
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                }`}>
                <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                  cb.val ? "border-current bg-current" : "border-gray-300"
                }`}>
                  {cb.val && <svg className="w-2 h-2 text-white" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
                {cb.label}
              </label>
            ))}

            {/* Search */}
            <div className="relative flex-1 min-w-[180px] ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search description, MR No, PO No…"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-sm text-gray-400">Loading project board…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
              <Package className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">No items found</p>
              {(project || remarks || pendingOnly || poNotCreated || due || search) && (
                <button onClick={() => { setProject("WTT-0528"); setRemarks(""); setPendingOnly(false); setPoNotCreated(false); setDue(false); setSearch(""); }}
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                  <Filter className="w-3.5 h-3.5" /> Reset filters
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <TH ch="#" sticky />
                      <TH ch="Description" />
                      {/* Qty group */}
                      <TH ch={<span className="text-blue-500">MR</span>} right />
                      <TH ch={<span className="text-teal-500">Store</span>} right />
                      <TH ch={<span className="text-violet-500">Prod</span>} right />
                      <TH ch={<span className="text-gray-400">Not Req</span>} right />
                      <TH ch={<span className="text-indigo-500">Buy Req</span>} right />
                      {/* PO group */}
                      <TH ch={<span className="text-blue-400">PO Qty</span>} right />
                      <TH ch={<span className="text-emerald-500">Rcvd</span>} right />
                      <TH ch={<span className="text-red-400">PO Pend</span>} right />
                      <TH ch={<span className="text-amber-400">PR Pend</span>} right />
                      {/* Dates */}
                      <TH ch="Del. From" />
                      <TH ch="Del. To" />
                      <TH ch="Aging" />
                      {/* Links */}
                      <TH ch="MR No" />
                      <TH ch="PO No" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((row, i) => {
                      const isOpen   = expanded.has(i);
                      const hasKids  = (row.child_rows || []).length > 0;
                      const overdue  = row.aging?.toLowerCase().includes("pending");
                      const poPend   = row.po_pending > 0;
                      const prPend   = row.pr_pending > 0;

                      return (
                        <Fragment key={i}>
                          {/* ── Parent row ── */}
                          <tr onClick={() => hasKids && toggleRow(i)}
                            className={`transition-colors group ${hasKids ? "cursor-pointer" : ""} ${
                              overdue ? "bg-red-50/40 hover:bg-red-50/70" : "hover:bg-blue-50/30"
                            }`}>

                            {/* # */}
                            <td className="px-3 py-3 sticky left-0 bg-inherit z-10 border-r border-gray-100">
                              <div className="flex items-center gap-1.5">
                                {hasKids
                                  ? isOpen
                                    ? <ChevronDown className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    : <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0" />
                                  : <span className="w-3.5 h-3.5 shrink-0" />
                                }
                                <span className="text-gray-400 font-mono text-[10px]">{i + 1}</span>
                              </div>
                            </td>

                            {/* Description */}
                            <td className="px-3 py-3 min-w-[180px] max-w-[240px]">
                              <p className="font-semibold text-gray-800 text-[12px] leading-snug line-clamp-2">
                                {stripHtml(row.description) || "—"}
                              </p>
                            </td>

                            {/* Quantities */}
                            <td className="px-3 py-3 text-right"><Qty v={row.mr_qty} /></td>
                            <td className="px-3 py-3 text-right"><Qty v={row.store_qty} /></td>
                            <td className="px-3 py-3 text-right"><Qty v={row.production_qty} /></td>
                            <td className="px-3 py-3 text-right"><Qty v={row.not_req_qty} /></td>
                            <td className="px-3 py-3 text-right"><Qty v={row.buy_required} /></td>
                            <td className="px-3 py-3 text-right"><Qty v={row.po_qty} /></td>
                            <td className="px-3 py-3 text-right"><Qty v={row.received_qty} /></td>

                            {/* PO Pending */}
                            <td className="px-3 py-3 text-right">
                              {poPend
                                ? <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-md text-[11px]">
                                    {row.po_pending.toFixed(2)}
                                  </span>
                                : <Qty v={row.po_pending} />
                              }
                            </td>
                            {/* PR Pending */}
                            <td className="px-3 py-3 text-right">
                              {prPend
                                ? <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-600 font-bold px-2 py-0.5 rounded-md text-[11px]">
                                    {row.pr_pending.toFixed(2)}
                                  </span>
                                : <Qty v={row.pr_pending} />
                              }
                            </td>

                            {/* Dates */}
                            <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{fmtDate(row.delivery_from) || "—"}</td>
                            <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{fmtDate(row.delivery_to) || "—"}</td>
                            <td className="px-3 py-3 whitespace-nowrap"><AgingBadge val={row.aging} /></td>

                            {/* Links */}
                            <td className="px-3 py-3" onClick={e => e.stopPropagation()}><Links val={row.mr_no} doctype="material-request" /></td>
                            <td className="px-3 py-3" onClick={e => e.stopPropagation()}><Links val={row.po_no} doctype="purchase-order" /></td>
                          </tr>

                          {/* ── Child rows ── */}
                          {isOpen && (row.child_rows || []).map((c, j) => (
                            <tr key={`${i}-${j}`} className="bg-slate-50/70 hover:bg-blue-50/20 transition-colors border-l-2 border-blue-200">
                              <td className="px-3 py-2 sticky left-0 bg-inherit border-r border-gray-100">
                                <span className="w-3.5 h-3.5 block" />
                              </td>
                              <td className="px-3 py-2 min-w-[180px] max-w-[240px] pl-6">
                                <p className="text-[11px] italic text-gray-500 leading-snug line-clamp-2">
                                  {stripHtml(c.technical_description) || "—"}
                                </p>
                              </td>
                              <td className="px-3 py-2 text-right text-[11px] text-gray-500 tabular-nums">{c.mr_qty.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-[11px] text-gray-500 tabular-nums">{c.store_qty.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-[11px] text-gray-500 tabular-nums">{c.production_qty.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-[11px] text-gray-500 tabular-nums">{c.not_req_qty.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-[11px] text-gray-500 tabular-nums">{c.buy_required.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-[11px] text-gray-500 tabular-nums">{c.po_qty.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-[11px] text-gray-500 tabular-nums">{c.received_qty.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right">
                                {c.po_pending > 0
                                  ? <span className="text-[11px] font-semibold text-red-400 tabular-nums">{c.po_pending.toFixed(2)}</span>
                                  : <span className="text-[11px] text-gray-300 tabular-nums">{c.po_pending.toFixed(2)}</span>}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {c.pr_pending > 0
                                  ? <span className="text-[11px] font-semibold text-amber-400 tabular-nums">{c.pr_pending.toFixed(2)}</span>
                                  : <span className="text-[11px] text-gray-300 tabular-nums">{c.pr_pending.toFixed(2)}</span>}
                              </td>
                              <td className="px-3 py-2 text-[11px] text-gray-400 whitespace-nowrap">{fmtDate(c.delivery_from) || "—"}</td>
                              <td className="px-3 py-2 text-[11px] text-gray-400 whitespace-nowrap">{fmtDate(c.delivery_to) || "—"}</td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {c.aging ? <span className={`text-[10px] font-medium ${c.aging.toLowerCase().includes("pending") ? "text-orange-400" : "text-emerald-500"}`}>{c.aging}</span> : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-3 py-2"><Links val={c.mr_no} doctype="material-request" /></td>
                              <td className="px-3 py-2"><Links val={c.po_no} doctype="purchase-order" /></td>
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
                <span className="text-[11px] text-gray-400">
                  {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                  {filtered.length !== rows.length && <span className="ml-1 text-gray-300">of {rows.length}</span>}
                </span>
                {(pendingOnly || poNotCreated || due || search) && (
                  <button onClick={() => { setPendingOnly(false); setPoNotCreated(false); setDue(false); setSearch(""); }}
                    className="text-[11px] text-blue-500 hover:underline flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Clear filters
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
