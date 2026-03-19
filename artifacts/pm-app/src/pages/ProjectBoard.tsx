import { Layout } from "@/components/Layout";
import {
  LayoutGrid, Search, RefreshCw, Loader2, ExternalLink,
  Filter, ChevronDown, AlertCircle, Package,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERP_URL = "https://erp.wttint.com";

interface ProjectBoardRow {
  name: string;
  project: string | null;
  project_remarks: string | null;
  description: string | null;
  mr_qty: number | null;
  store_qty: number | null;
  production_qty: number | null;
  not_req_qty: number | null;
  buy_qty: number | null;
  po_required: string | null;
  received_qty: number | null;
  po_qty: number | null;
  po_pending: number | null;
  pr_pending: number | null;
  delivery_from: string | null;
  delivery_to: string | null;
  aging_mr_no: string | null;
  po_no: string | null;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function Qty({ v, warn }: { v: number | null; warn?: boolean }) {
  if (v === null || v === undefined) return <span className="text-gray-300">—</span>;
  return (
    <span className={`font-semibold tabular-nums ${warn && v > 0 ? "text-red-500" : v > 0 ? "text-gray-800" : "text-gray-400"}`}>
      {v}
    </span>
  );
}

function YesNoBadge({ val }: { val: string | null }) {
  const v = (val || "").toLowerCase();
  if (v === "yes" || v === "1" || v === "true")
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Yes</span>;
  if (v === "no" || v === "0" || v === "false")
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">No</span>;
  return <span className="text-xs text-gray-400">{val || "—"}</span>;
}

export default function ProjectBoard() {
  const { toast } = useToast();
  const [rows, setRows]             = useState<ProjectBoardRow[]>([]);
  const [projects, setProjects]     = useState<{ name: string; project_name: string }[]>([]);
  const [loading, setLoading]       = useState(false);

  const [project, setProject]       = useState("");
  const [remarks, setRemarks]       = useState("");
  const [pendingOnly, setPendingOnly]   = useState(false);
  const [poNotCreated, setPoNotCreated] = useState(false);
  const [due, setDue]               = useState(false);
  const [search, setSearch]         = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (project)     params.set("project", project);
      if (remarks)     params.set("project_remarks", remarks);
      if (pendingOnly) params.set("pending_only", "1");
      if (poNotCreated) params.set("po_not_created", "1");
      if (due)         params.set("due", "1");

      const r = await fetch(`${BASE}/api/project-board?${params}`);
      if (!r.ok) throw new Error(await r.text());
      setRows(await r.json());
    } catch (e) {
      toast({ title: "Failed to load Project Board", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [project, remarks, pendingOnly, poNotCreated, due, toast]);

  useEffect(() => {
    fetch(`${BASE}/api/project-board/projects`)
      .then(r => r.ok ? r.json() : [])
      .then(setProjects)
      .catch(() => {});
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = rows.filter(r =>
    !search ||
    (r.description || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.project || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.aging_mr_no || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.po_no || "").toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount     = rows.filter(r => (r.po_pending ?? 0) > 0).length;
  const poNotCreatedCount = rows.filter(r => (r.po_qty ?? 0) === 0 && (r.mr_qty ?? 0) > 0).length;
  const totalRows        = rows.length;

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <LayoutGrid className="w-4 h-4 text-blue-500 shrink-0" />
            <h1 className="text-sm font-bold text-gray-900">Project Board</h1>
            <span className="text-xs text-gray-400 ml-1">Project Dashboard — ERPNext</span>
          </div>
          <a href={`${ERP_URL}/app/project-board`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> ERPNext
          </a>
          <button onClick={loadData} disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stat pills */}
        <div className="px-6 pt-3 pb-0 flex gap-2 shrink-0 flex-wrap">
          {[
            { label: "Total Items",   value: totalRows,         color: "bg-blue-500" },
            { label: "PO Pending",    value: pendingCount,      color: "bg-red-400" },
            { label: "PO Not Created", value: poNotCreatedCount, color: "bg-amber-400" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className={`w-2 h-2 rounded-full ${s.color} shrink-0`} />
              <span className="text-xs font-bold text-gray-700">{s.value}</span>
              <span className="text-[10px] text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="px-6 pt-3 pb-2 flex items-center gap-3 shrink-0 flex-wrap">
          {/* Project select */}
          <div className="relative">
            <select value={project} onChange={e => setProject(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[160px]">
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.name} value={p.name}>{p.project_name || p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Remarks search */}
          <input
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Project Remarks…"
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 w-40"
          />

          {/* Checkboxes */}
          {[
            { label: "Pending Only",    val: pendingOnly,   set: setPendingOnly },
            { label: "PO Not Created",  val: poNotCreated,  set: setPoNotCreated },
            { label: "Due",             val: due,           set: setDue },
          ].map(cb => (
            <label key={cb.label} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer select-none text-xs font-medium transition-all ${
              cb.val ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
              <input type="checkbox" checked={cb.val} onChange={e => cb.set(e.target.checked)} className="w-3.5 h-3.5 rounded accent-blue-600" />
              {cb.label}
            </label>
          ))}

          {/* Description search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search description, MR No, PO No…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 pb-6 pt-2">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <Package className="w-10 h-10 opacity-30" />
              <p className="text-sm">No project board items found</p>
              {(project || remarks || pendingOnly || poNotCreated || due) && (
                <button onClick={() => { setProject(""); setRemarks(""); setPendingOnly(false); setPoNotCreated(false); setDue(false); }}
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 sticky left-0 bg-gray-50/80 z-10">S.No</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 min-w-[200px]">Description</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">MR Qty</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Store Qty</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Production Qty</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Not Req Qty</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Buy Qty</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">PO Required</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Received Qty</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">PO Qty</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">PO Pending</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">PR Pending</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Delivery From</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Delivery To</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Aging MR No</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">PO No</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => {
                      const hasPoPending = (row.po_pending ?? 0) > 0;
                      const hasPrPending = (row.pr_pending ?? 0) > 0;
                      return (
                        <tr key={row.name}
                          className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? "bg-gray-50/20" : "bg-white"}`}>
                          <td className="px-3 py-2.5 sticky left-0 bg-inherit z-10">
                            <span className="text-[10px] text-gray-400 font-mono">{i + 1}</span>
                          </td>
                          <td className="px-3 py-2.5 min-w-[200px]">
                            <p className="font-semibold text-gray-800 text-xs leading-snug max-w-[280px] whitespace-normal">
                              {row.description || "—"}
                            </p>
                            {row.project && (
                              <p className="text-[10px] text-blue-500 font-medium mt-0.5 truncate max-w-[280px]">
                                {row.project}
                              </p>
                            )}
                            {row.project_remarks && (
                              <p className="text-[10px] text-gray-400 truncate max-w-[280px]">{row.project_remarks}</p>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center"><Qty v={row.mr_qty} /></td>
                          <td className="px-3 py-2.5 text-center"><Qty v={row.store_qty} /></td>
                          <td className="px-3 py-2.5 text-center"><Qty v={row.production_qty} /></td>
                          <td className="px-3 py-2.5 text-center"><Qty v={row.not_req_qty} /></td>
                          <td className="px-3 py-2.5 text-center"><Qty v={row.buy_qty} /></td>
                          <td className="px-3 py-2.5 text-center"><YesNoBadge val={row.po_required} /></td>
                          <td className="px-3 py-2.5 text-center"><Qty v={row.received_qty} /></td>
                          <td className="px-3 py-2.5 text-center"><Qty v={row.po_qty} /></td>
                          <td className="px-3 py-2.5 text-center">
                            {hasPoPending ? (
                              <span className="inline-flex items-center gap-1 text-red-500 font-bold">
                                <AlertCircle className="w-3 h-3" />{row.po_pending}
                              </span>
                            ) : (
                              <Qty v={row.po_pending} />
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {hasPrPending ? (
                              <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                                <AlertCircle className="w-3 h-3" />{row.pr_pending}
                              </span>
                            ) : (
                              <Qty v={row.pr_pending} />
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600">{fmtDate(row.delivery_from)}</td>
                          <td className="px-3 py-2.5 text-gray-600">{fmtDate(row.delivery_to)}</td>
                          <td className="px-3 py-2.5">
                            {row.aging_mr_no ? (
                              <a href={`${ERP_URL}/app/material-request/${row.aging_mr_no}`} target="_blank" rel="noopener noreferrer"
                                className="text-blue-500 hover:underline font-mono text-[10px]">{row.aging_mr_no}</a>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            {row.po_no ? (
                              <a href={`${ERP_URL}/app/purchase-order/${row.po_no}`} target="_blank" rel="noopener noreferrer"
                                className="text-blue-500 hover:underline font-mono text-[10px]">{row.po_no}</a>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <a href={`${ERP_URL}/app/project-board/${row.name}`} target="_blank" rel="noopener noreferrer"
                              className="text-gray-300 hover:text-blue-500 transition-colors" title="Open in ERPNext">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/40 flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
                {search && filtered.length !== rows.length && (
                  <span className="text-[10px] text-gray-400">· filtered from {rows.length}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
