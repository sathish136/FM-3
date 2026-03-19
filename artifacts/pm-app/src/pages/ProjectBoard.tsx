import { Layout } from "@/components/Layout";
import {
  LayoutGrid, Search, RefreshCw, Loader2, ExternalLink,
  Filter, ChevronDown, ChevronRight, AlertCircle, Package,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE    = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERP_URL = "https://erp.wttint.com";

interface ChildRow {
  technical_description: string;
  mr_qty: number;
  store_qty: number;
  production_qty: number;
  not_req_qty: number;
  buy_required: number;
  po_qty: number;
  received_qty: number;
  po_pending: number;
  pr_pending: number;
  delivery_from: string | null;
  delivery_to: string | null;
  aging: string;
  mr_no: string;
  po_no: string;
}

interface ProjectBoardRow {
  description: string;
  mr_qty: number;
  store_qty: number;
  production_qty: number;
  not_req_qty: number;
  buy_required: number;
  po_qty: number;
  received_qty: number;
  po_pending: number;
  pr_pending: number;
  delivery_from: string | null;
  delivery_to: string | null;
  aging: string;
  mr_no: string;
  po_no: string;
  child_rows: ChildRow[];
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const p = d.split("-");
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
  return d;
}

function n2(v: number) { return v.toFixed(2); }

function Links({ val, doctype }: { val: string; doctype: string }) {
  if (!val) return <span className="text-gray-300">—</span>;
  const items = val.split("||").filter(Boolean);
  return (
    <div className="flex flex-col gap-0.5 max-h-16 overflow-y-auto">
      {items.map((v) => (
        <a key={v} href={`${ERP_URL}/app/${doctype}/${v}`} target="_blank" rel="noopener noreferrer"
          className="text-blue-500 hover:underline font-mono text-[10px] whitespace-nowrap">{v}</a>
      ))}
    </div>
  );
}

function Num({ v, red, amber }: { v: number; red?: boolean; amber?: boolean }) {
  const cls = red && v > 0 ? "text-red-500 font-bold" : amber && v > 0 ? "text-amber-500 font-bold" : v === 0 ? "text-gray-400" : "text-gray-700 font-semibold";
  return <span className={`tabular-nums ${cls}`}>{n2(v)}</span>;
}

const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <th className={`px-2.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/90 whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
    {children}
  </th>
);

export default function ProjectBoard() {
  const { toast } = useToast();

  const [rows, setRows]         = useState<ProjectBoardRow[]>([]);
  const [projects, setProjects] = useState<{ name: string; project_name: string }[]>([]);
  const [mrRemarks, setMrRemarks] = useState<string[]>([]);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [project, setProject]     = useState("");
  const [remarks, setRemarks]     = useState("");
  const [pendingOnly, setPendingOnly]   = useState(false);
  const [poNotCreated, setPoNotCreated] = useState(false);
  const [due, setDue]             = useState(false);
  const [search, setSearch]       = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setExpanded(new Set());
    try {
      const params = new URLSearchParams();
      if (project) params.set("project", project);
      if (remarks) params.set("mr_remarks", remarks);
      const r = await fetch(`${BASE}/api/project-board?${params}`);
      if (!r.ok) throw new Error(await r.text());
      setRows(await r.json());
    } catch (e) {
      toast({ title: "Failed to load Project Board", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [project, remarks, toast]);

  useEffect(() => {
    fetch(`${BASE}/api/project-board/projects`)
      .then(r => r.ok ? r.json() : [])
      .then(setProjects)
      .catch(() => {});
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
    (r.description || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.mr_no || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.po_no || "").toLowerCase().includes(search.toLowerCase())
  );

  if (pendingOnly)  filtered = filtered.filter(r => r.po_pending > 0);
  if (poNotCreated) filtered = filtered.filter(r => !r.po_no);
  if (due)          filtered = filtered.filter(r => (r.aging || "").toLowerCase().includes("pending"));

  const pendingCount     = rows.filter(r => r.po_pending > 0).length;
  const completedCount   = rows.filter(r => r.po_pending === 0).length;
  const poNotCreatedCount = rows.filter(r => !r.po_no).length;
  const dueCount         = rows.filter(r => (r.aging || "").toLowerCase().includes("pending")).length;

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

        {/* Summary cards */}
        <div className="px-6 pt-3 pb-0 flex gap-2 shrink-0 flex-wrap">
          {[
            { label: "Total",         value: rows.length,      color: "bg-blue-500" },
            { label: "Pending",       value: pendingCount,     color: "bg-red-400" },
            { label: "Completed",     value: completedCount,   color: "bg-emerald-400" },
            { label: "PO Not Created",value: poNotCreatedCount,color: "bg-amber-400" },
            { label: "Due",           value: dueCount,         color: "bg-orange-400" },
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

          <div className="relative">
            <select value={remarks} onChange={e => setRemarks(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[140px]">
              <option value="">All Remarks</option>
              {mrRemarks.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>

          {[
            { label: "Pending Only",   val: pendingOnly,    set: setPendingOnly },
            { label: "PO Not Created", val: poNotCreated,   set: setPoNotCreated },
            { label: "Due",            val: due,            set: setDue },
          ].map(cb => (
            <label key={cb.label} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer select-none text-xs font-medium transition-all ${
              cb.val ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
              <input type="checkbox" checked={cb.val} onChange={e => cb.set(e.target.checked)} className="w-3.5 h-3.5 rounded accent-blue-600" />
              {cb.label}
            </label>
          ))}

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
              {(project || remarks || pendingOnly || poNotCreated || due || search) && (
                <button onClick={() => { setProject(""); setRemarks(""); setPendingOnly(false); setPoNotCreated(false); setDue(false); setSearch(""); }}
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <TH>S.No</TH>
                      <TH>Description</TH>
                      <TH right>MR Qty</TH>
                      <TH right>Store Qty</TH>
                      <TH right>Prod Qty</TH>
                      <TH right>Not Req</TH>
                      <TH right>Buy Req</TH>
                      <TH right>PO Qty</TH>
                      <TH right>Rcvd Qty</TH>
                      <TH right>PO Pending</TH>
                      <TH right>PR Pending</TH>
                      <TH>Delivery From</TH>
                      <TH>Delivery To</TH>
                      <TH>Aging</TH>
                      <TH>MR No</TH>
                      <TH>PO No</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => {
                      const isOpen = expanded.has(i);
                      const hasChildren = (row.child_rows || []).length > 0;
                      const agingPending = (row.aging || "").toLowerCase().includes("pending");
                      return (
                        <>
                          {/* Parent row */}
                          <tr key={`p-${i}`}
                            onClick={() => hasChildren && toggleRow(i)}
                            className={`border-b border-gray-50 transition-colors ${hasChildren ? "cursor-pointer" : ""} ${i % 2 === 1 ? "bg-gray-50/30" : "bg-white"} hover:bg-blue-50/30`}>
                            <td className="px-2.5 py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                {hasChildren ? (
                                  isOpen
                                    ? <ChevronDown className="w-3 h-3 text-blue-400 shrink-0" />
                                    : <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                                ) : <span className="w-3" />}
                                <span className="text-[10px] text-gray-400 font-mono">{i + 1}</span>
                              </div>
                            </td>
                            <td className="px-2.5 py-2.5 min-w-[200px] max-w-[280px]">
                              <p className="font-semibold text-gray-800 text-xs leading-snug whitespace-normal">{row.description || "—"}</p>
                            </td>
                            <td className="px-2.5 py-2.5 text-right"><Num v={row.mr_qty} /></td>
                            <td className="px-2.5 py-2.5 text-right"><Num v={row.store_qty} /></td>
                            <td className="px-2.5 py-2.5 text-right"><Num v={row.production_qty} /></td>
                            <td className="px-2.5 py-2.5 text-right"><Num v={row.not_req_qty} /></td>
                            <td className="px-2.5 py-2.5 text-right"><Num v={row.buy_required} /></td>
                            <td className="px-2.5 py-2.5 text-right"><Num v={row.po_qty} /></td>
                            <td className="px-2.5 py-2.5 text-right"><Num v={row.received_qty} /></td>
                            <td className="px-2.5 py-2.5 text-right">
                              {row.po_pending > 0
                                ? <span className="inline-flex items-center gap-1 text-red-500 font-bold"><AlertCircle className="w-3 h-3" />{n2(row.po_pending)}</span>
                                : <Num v={row.po_pending} />}
                            </td>
                            <td className="px-2.5 py-2.5 text-right">
                              {row.pr_pending > 0
                                ? <span className="inline-flex items-center gap-1 text-amber-500 font-bold"><AlertCircle className="w-3 h-3" />{n2(row.pr_pending)}</span>
                                : <Num v={row.pr_pending} />}
                            </td>
                            <td className="px-2.5 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(row.delivery_from)}</td>
                            <td className="px-2.5 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(row.delivery_to)}</td>
                            <td className="px-2.5 py-2.5 whitespace-nowrap">
                              {row.aging
                                ? <span className={`text-xs ${agingPending ? "text-orange-500 font-semibold" : "text-gray-500"}`}>{row.aging}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-2.5 py-2.5" onClick={e => e.stopPropagation()}>
                              <Links val={row.mr_no} doctype="material-request" />
                            </td>
                            <td className="px-2.5 py-2.5" onClick={e => e.stopPropagation()}>
                              <Links val={row.po_no} doctype="purchase-order" />
                            </td>
                          </tr>

                          {/* Child rows */}
                          {isOpen && (row.child_rows || []).map((c, j) => (
                            <tr key={`c-${i}-${j}`} className="bg-blue-50/20 border-b border-blue-50">
                              <td className="px-2.5 py-2 pl-8" />
                              <td className="px-2.5 py-2 min-w-[200px] max-w-[280px]">
                                <p className="text-[11px] italic text-gray-500 whitespace-normal leading-snug">{c.technical_description || "—"}</p>
                              </td>
                              <td className="px-2.5 py-2 text-right text-[11px] text-gray-500">{n2(c.mr_qty)}</td>
                              <td className="px-2.5 py-2 text-right text-[11px] text-gray-500">{n2(c.store_qty)}</td>
                              <td className="px-2.5 py-2 text-right text-[11px] text-gray-500">{n2(c.production_qty)}</td>
                              <td className="px-2.5 py-2 text-right text-[11px] text-gray-500">{n2(c.not_req_qty)}</td>
                              <td className="px-2.5 py-2 text-right text-[11px] text-gray-500">{n2(c.buy_required)}</td>
                              <td className="px-2.5 py-2 text-right text-[11px] text-gray-500">{n2(c.po_qty)}</td>
                              <td className="px-2.5 py-2 text-right text-[11px] text-gray-500">{n2(c.received_qty)}</td>
                              <td className="px-2.5 py-2 text-right text-[11px]">
                                <span className={c.po_pending > 0 ? "text-red-400 font-semibold" : "text-gray-400"}>{n2(c.po_pending)}</span>
                              </td>
                              <td className="px-2.5 py-2 text-right text-[11px]">
                                <span className={c.pr_pending > 0 ? "text-amber-400 font-semibold" : "text-gray-400"}>{n2(c.pr_pending)}</span>
                              </td>
                              <td className="px-2.5 py-2 text-[11px] text-gray-400 whitespace-nowrap">{fmtDate(c.delivery_from)}</td>
                              <td className="px-2.5 py-2 text-[11px] text-gray-400 whitespace-nowrap">{fmtDate(c.delivery_to)}</td>
                              <td className="px-2.5 py-2 text-[11px] text-gray-400 whitespace-nowrap">{c.aging || "—"}</td>
                              <td className="px-2.5 py-2"><Links val={c.mr_no} doctype="material-request" /></td>
                              <td className="px-2.5 py-2"><Links val={c.po_no} doctype="purchase-order" /></td>
                            </tr>
                          ))}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/40 flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
                {(search || pendingOnly || poNotCreated || due) && filtered.length !== rows.length && (
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
