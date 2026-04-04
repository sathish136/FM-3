import { useState, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase, ShoppingCart, FileText, ChevronDown, TrendingUp,
  Users, RefreshCw, X, ArrowLeft, Search, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const DEFAULT_PROJECT = "WTT-0528";

const COLORS = {
  navy:   "#1a2a5e",
  blue:   "#2980b9",
  purple: "#8e44ad",
  orange: "#e67e22",
  teal:   "#16a085",
  red:    "#c0392b",
  amber:  "#f39c12",
  gold:   "#d68910",
  brown:  "#ca6f1e",
  crimson:"#e74c3c",
  maroon: "#922b21",
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface Filters { project: string; dateFrom: string; dateTo: string; quick: string }

type PO_View = "po_wise" | "supplier_wise" | "item_group_wise";
type PR_View = "pr_wise" | "supplier_wise" | "item_group_wise";

interface DetailConfig {
  key: string;
  title: string;
  color: string;
  columns: { label: string; field: string; amount?: boolean }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildUrl(path: string, filters: Filters, extraProject = true): string {
  const params = new URLSearchParams();
  if (extraProject && filters.project) params.set("project", filters.project);
  if (filters.quick) {
    params.set("quick", filters.quick);
  } else {
    if (filters.dateFrom) params.set("from_date", filters.dateFrom);
    if (filters.dateTo)   params.set("to_date",   filters.dateTo);
  }
  const qs = params.toString();
  return `${BASE}/api/finance-dashboard/${path}${qs ? "?" + qs : ""}`;
}

function fmtAmt(v: any): string {
  const n = Number(v);
  if (isNaN(n)) return "—";
  return "₹ " + n.toLocaleString("en-IN");
}

// Compact formatter for KPI cards — keeps numbers inside card bounds
function fmtCard(v: any): { symbol: string; number: string; suffix: string } {
  const n = Number(v);
  if (isNaN(n) || v == null) return { symbol: "₹", number: "0", suffix: "" };
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000)      return { symbol: "₹", number: (n / 1_00_00_000).toFixed(2), suffix: " Cr" };
  if (abs >= 1_00_000)         return { symbol: "₹", number: (n / 1_00_000).toFixed(2),    suffix: " L"  };
  if (abs >= 1_000)            return { symbol: "₹", number: (n / 1_000).toFixed(1),        suffix: " K"  };
  return { symbol: "₹", number: n.toLocaleString("en-IN"), suffix: "" };
}

function fmt(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function rows(q: ReturnType<typeof useQuery>): any[] {
  const d = q.data as any;
  if (!d) return [];
  const msg = d.message;
  if (Array.isArray(msg)) return msg;
  return [];
}

function sum(arr: any[], field: string): number {
  return arr.reduce((s, r) => s + (Number(r[field]) || 0), 0);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KPICard({
  label, value, icon: Icon, color, onClick, currency = true,
  expandIcon = false,
}: {
  label: string; value: any; icon: React.ElementType; color: string;
  onClick: () => void; currency?: boolean; expandIcon?: boolean;
}) {
  const compact = currency ? fmtCard(value) : null;
  return (
    <button
      onClick={onClick}
      style={{ background: color }}
      className="relative flex flex-col justify-between rounded-xl p-4 text-left w-full shadow-md
                 transition-all duration-150 hover:scale-[1.03] hover:shadow-xl border-0 cursor-pointer min-h-[90px]"
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider leading-tight">{label}</span>
        {expandIcon
          ? <ChevronDown style={{ width: 18, height: 18, color: "rgba(255,255,255,0.75)", flexShrink: 0 }} />
          : <Icon style={{ width: 18, height: 18, color: "rgba(255,255,255,0.75)", flexShrink: 0 } as any} />
        }
      </div>
      {currency && compact ? (
        <div className="flex items-baseline gap-0.5 flex-wrap">
          <span className="text-white/75 text-[11px] font-semibold leading-none">{compact.symbol}</span>
          <span className="text-white text-xl font-black tabular-nums leading-none">{compact.number}</span>
          {compact.suffix && <span className="text-white/80 text-[11px] font-bold leading-none">{compact.suffix}</span>}
        </div>
      ) : (
        <span className="text-white text-xl font-black tabular-nums leading-none">
          {value != null ? String(value) : "0"}
        </span>
      )}
    </button>
  );
}

function SubKPICard({
  label, value, color, onClick,
}: { label: string; value: any; color: string; onClick: () => void }) {
  const compact = fmtCard(value);
  return (
    <button
      onClick={onClick}
      style={{ background: color }}
      className="flex flex-col gap-1.5 rounded-lg p-3 text-left shadow transition-all hover:scale-[1.02] border-0 cursor-pointer min-w-[120px]"
    >
      <span className="text-white/85 text-[10px] font-bold uppercase tracking-wider leading-tight">{label}</span>
      <div className="flex items-baseline gap-0.5 flex-wrap">
        <span className="text-white/75 text-[10px] font-semibold leading-none">{compact.symbol}</span>
        <span className="text-white text-base font-black tabular-nums leading-none">{compact.number}</span>
        {compact.suffix && <span className="text-white/80 text-[10px] font-bold leading-none">{compact.suffix}</span>}
      </div>
    </button>
  );
}

function Panel({ title, color, badge, children }: {
  title: string; color: string; badge?: number; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100"
           style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
        <span className="font-bold text-slate-700 text-sm">{title}</span>
        {badge !== undefined && (
          <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: color }}>{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function DataTable({ columns, data, colSpan }: {
  columns: { label: string; field: string; amount?: boolean }[];
  data: any[];
  colSpan: number;
}) {
  const [filters, setFilters] = useState<string[]>(columns.map(() => ""));

  const filtered = data.filter(row =>
    columns.every((col, i) => {
      const v = filters[i].toLowerCase();
      if (!v) return true;
      return fmt(row[col.field]).toLowerCase().includes(v);
    })
  );

  return (
    <div className="overflow-auto max-h-64">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-50">
          <tr>
            {columns.map((c, i) => (
              <th key={i} className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
          <tr className="bg-white">
            {columns.map((_, i) => (
              <td key={i} className="px-2 py-1">
                <input
                  placeholder="Filter…"
                  value={filters[i]}
                  onChange={e => setFilters(f => f.map((v, j) => j === i ? e.target.value : v))}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400"
                />
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="text-center py-6 text-slate-400 italic">No records</td>
            </tr>
          ) : (
            filtered.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                {columns.map((col, j) => (
                  <td key={j} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                    {col.amount ? fmtAmt(row[col.field]) : fmt(row[col.field])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TabSwitcher({ tabs, active, onChange }: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all border-0 cursor-pointer",
            active === t.key
              ? "bg-indigo-600 text-white shadow"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Detail Overlay ─────────────────────────────────────────────────────────────

function DetailOverlay({ config, data, onClose }: {
  config: DetailConfig;
  data: any[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = data.filter(row =>
    config.columns.some(col => fmt(row[col.field]).toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="h-1" style={{ background: config.color }} />
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 bg-white hover:bg-slate-50 transition-all cursor-pointer">
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-lg">{config.title}</span>
            <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: config.color }}>{data.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search style={{ width: 14, height: 14, position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all cursor-pointer border-0 bg-transparent">
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-5">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              {config.columns.map((c, i) => (
                <th key={i} className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={config.columns.length} className="text-center py-12 text-slate-400 italic">
                  No records found
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={i} className={cn("border-b border-slate-50 hover:bg-slate-50 transition-colors", i % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                  {config.columns.map((col, j) => (
                    <td key={j} className="px-4 py-2.5 text-slate-700">
                      {col.amount ? fmtAmt(row[col.field]) : fmt(row[col.field])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Quick Date Button ──────────────────────────────────────────────────────────

function QuickBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
        active ? "bg-indigo-600 text-white border-indigo-600 shadow" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      )}
    >{label}</button>
  );
}

// ── Detail configs per section ─────────────────────────────────────────────────

function getDetailConfig(key: string, poView: PO_View, prView: PR_View): DetailConfig {
  const map: Record<string, DetailConfig> = {
    po_po_wise:         { key, title: "PO Cost — PO Wise",        color: COLORS.blue,   columns: [{ label: "PO No.", field: "po_no" }, { label: "Supplier", field: "supplier" }, { label: "PO Amount", field: "po_amount", amount: true }] },
    po_supplier_wise:   { key, title: "PO Cost — Supplier Wise",  color: COLORS.blue,   columns: [{ label: "Supplier", field: "supplier" }, { label: "No. of POs", field: "no_of_pos" }, { label: "Total Amount", field: "po_amount", amount: true }] },
    po_item_group_wise: { key, title: "PO Cost — Item Group",     color: COLORS.blue,   columns: [{ label: "Item Group", field: "item_group" }, { label: "No. of Items", field: "no_of_items" }, { label: "Total Amount", field: "po_amount", amount: true }] },
    pr_pr_wise:         { key, title: "PR Cost — PR Wise",        color: COLORS.purple, columns: [{ label: "PR No.", field: "pr_no" }, { label: "Supplier", field: "supplier" }, { label: "PR Amount", field: "pr_amount", amount: true }] },
    pr_supplier_wise:   { key, title: "PR Cost — Supplier Wise",  color: COLORS.purple, columns: [{ label: "Supplier", field: "supplier" }, { label: "No. of PRs", field: "no_of_prs" }, { label: "PR Amount", field: "pr_amount", amount: true }] },
    pr_item_group_wise: { key, title: "PR Cost — Item Group",     color: COLORS.purple, columns: [{ label: "Item Group", field: "item_group" }, { label: "No. of Items", field: "no_of_items" }, { label: "PR Amount", field: "pr_amount", amount: true }] },
    cash_request:   { key, title: "Cash Request",          color: COLORS.amber,  columns: [{ label: "Date", field: "date" }, { label: "Entry No.", field: "entry_no" }, { label: "Remarks", field: "remarks" }, { label: "Created By", field: "created_by" }, { label: "Amount", field: "amount", amount: true }, { label: "Approved By", field: "approved_by" }] },
    req_payment:    { key, title: "Request for Payment",   color: COLORS.gold,   columns: [{ label: "Date", field: "date" }, { label: "Entry No.", field: "entry_no" }, { label: "Remarks", field: "remarks" }, { label: "Created By", field: "created_by" }, { label: "Amount", field: "amount", amount: true }, { label: "Approved By", field: "approved_by" }] },
    ticket_booking: { key, title: "Ticket Booking",        color: COLORS.brown,  columns: [{ label: "Date", field: "date" }, { label: "Entry No.", field: "entry_no" }, { label: "Employee", field: "employee_name" }, { label: "Amount", field: "amount", amount: true }, { label: "Reason", field: "reason" }] },
    extra_expenses: { key, title: "Operational Loss",      color: COLORS.teal,   columns: [{ label: "Date", field: "date" }, { label: "Entry No.", field: "entry_no" }, { label: "Employee", field: "employee_name" }, { label: "Amount", field: "amount", amount: true }, { label: "Reason", field: "reason" }] },
    salary:         { key, title: "Salary",                color: COLORS.red,    columns: [{ label: "Employee", field: "employee" }, { label: "Salary", field: "salary", amount: true }] },
    claim:          { key, title: "Claim",                 color: COLORS.crimson,columns: [{ label: "Employee", field: "employee" }, { label: "Claim Amount", field: "claim_amount", amount: true }] },
    advance:        { key, title: "Advance",               color: COLORS.maroon, columns: [{ label: "Employee Name", field: "employee_name" }, { label: "Advanced Amount", field: "advanced_amount", amount: true }] },
  };
  const poKey = `po_${poView}` as keyof typeof map;
  const prKey = `pr_${prView}` as keyof typeof map;
  if (key === "po_cost") return map[poKey] || map.po_po_wise;
  if (key === "pr_cost") return map[prKey] || map.pr_pr_wise;
  return map[key] || { key, title: key, color: "#666", columns: [] };
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function FinanceDashboardContent() {
  const [filters, setFilters] = useState<Filters>({ project: DEFAULT_PROJECT, dateFrom: "", dateTo: "", quick: "" });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [subExpanded, setSubExpanded] = useState<"other_expenses" | "salary" | null>(null);
  const [poView, setPoView] = useState<PO_View>("po_wise");
  const [prView, setPrView] = useState<PR_View>("pr_wise");
  const [detail, setDetail] = useState<{ key: string; data: any[] } | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const kpisQ = useQuery({ queryKey: ["finance-kpis", filters], queryFn: () => fetch(buildUrl("kpis", filters)).then(r => r.json()), staleTime: 30_000 });
  const poQ   = useQuery({ queryKey: ["finance-po",   filters.project], queryFn: () => fetch(buildUrl("po-cost", filters, true)).then(r => r.json()), staleTime: 30_000 });
  const prQ   = useQuery({ queryKey: ["finance-pr",   filters.project], queryFn: () => fetch(buildUrl("pr-cost", filters, true)).then(r => r.json()), staleTime: 30_000 });
  const crQ   = useQuery({ queryKey: ["finance-cr",   filters], queryFn: () => fetch(buildUrl("cash-request",   filters)).then(r => r.json()), staleTime: 30_000 });
  const rpQ   = useQuery({ queryKey: ["finance-rp",   filters], queryFn: () => fetch(buildUrl("req-payment",    filters)).then(r => r.json()), staleTime: 30_000 });
  const tbQ   = useQuery({ queryKey: ["finance-tb",   filters], queryFn: () => fetch(buildUrl("ticket-booking", filters)).then(r => r.json()), staleTime: 30_000 });
  const eeQ   = useQuery({ queryKey: ["finance-ee",   filters], queryFn: () => fetch(buildUrl("extra-expenses", filters)).then(r => r.json()), staleTime: 30_000 });
  const salQ  = useQuery({ queryKey: ["finance-sal",  filters], queryFn: () => fetch(buildUrl("salary",         filters)).then(r => r.json()), staleTime: 30_000 });
  const clQ   = useQuery({ queryKey: ["finance-cl",   filters], queryFn: () => fetch(buildUrl("claim",          filters)).then(r => r.json()), staleTime: 30_000 });
  const advQ  = useQuery({ queryKey: ["finance-adv",  filters], queryFn: () => fetch(buildUrl("advance",        filters)).then(r => r.json()), staleTime: 30_000 });
  const projQ = useQuery({ queryKey: ["finance-projects"], queryFn: () => fetch(`${BASE}/api/purchase-dashboard/projects`).then(r => r.json()), staleTime: 300_000 });

  const kpis    = (kpisQ.data as any)?.message || {};
  const poData  = (poQ.data  as any)?.message || {};
  const prData  = (prQ.data  as any)?.message || {};
  const crRows  = rows(crQ);
  const rpRows  = rows(rpQ);
  const tbRows  = rows(tbQ);
  const eeRows  = rows(eeQ);
  const salRows = rows(salQ);
  const clRows  = rows(clQ);
  const advRows = rows(advQ);

  const poViewRows: Record<PO_View, any[]> = {
    po_wise:         Array.isArray(poData.po_wise)         ? poData.po_wise         : Array.isArray(poData) ? poData : [],
    supplier_wise:   Array.isArray(poData.supplier_wise)   ? poData.supplier_wise   : [],
    item_group_wise: Array.isArray(poData.item_group_wise) ? poData.item_group_wise : [],
  };
  const prViewRows: Record<PR_View, any[]> = {
    pr_wise:         Array.isArray(prData.pr_wise)         ? prData.pr_wise         : Array.isArray(prData) ? prData : [],
    supplier_wise:   Array.isArray(prData.supplier_wise)   ? prData.supplier_wise   : [],
    item_group_wise: Array.isArray(prData.item_group_wise) ? prData.item_group_wise : [],
  };

  const projects = (projQ.data as any)?.projects as { code: string; label: string }[] || [];

  const refetchAll = useCallback(() => {
    [kpisQ, poQ, prQ, crQ, rpQ, tbQ, eeQ, salQ, clQ, advQ].forEach(q => q.refetch());
  }, [kpisQ, poQ, prQ, crQ, rpQ, tbQ, eeQ, salQ, clQ, advQ]);

  const toggleSub = (key: "other_expenses" | "salary") => {
    setSubExpanded(s => s === key ? null : key);
  };

  const openDetail = (key: string) => {
    let data: any[] = [];
    if (key === "po_cost") data = poViewRows[poView];
    else if (key === "pr_cost") data = prViewRows[prView];
    else if (key === "cash_request") data = crRows;
    else if (key === "req_payment") data = rpRows;
    else if (key === "ticket_booking") data = tbRows;
    else if (key === "extra_expenses") data = eeRows;
    else if (key === "salary") data = salRows;
    else if (key === "claim") data = clRows;
    else if (key === "advance") data = advRows;
    setDetail({ key, data });
  };

  const loading = kpisQ.isLoading;
  const anyLoading = [poQ, prQ, crQ, rpQ, tbQ, eeQ, salQ, clQ, advQ].some(q => q.isLoading);

  // ── PO / PR tab columns ───────────────────────────────────────────────────────
  const poTabCols: Record<PO_View, { label: string; field: string; amount?: boolean }[]> = {
    po_wise:         [{ label: "PO No.", field: "po_no" }, { label: "Supplier", field: "supplier" }, { label: "PO Amount", field: "po_amount", amount: true }],
    supplier_wise:   [{ label: "Supplier", field: "supplier" }, { label: "No. of POs", field: "no_of_pos" }, { label: "Total Amount", field: "po_amount", amount: true }],
    item_group_wise: [{ label: "Item Group", field: "item_group" }, { label: "No. of Items", field: "no_of_items" }, { label: "Total Amount", field: "po_amount", amount: true }],
  };
  const prTabCols: Record<PR_View, { label: string; field: string; amount?: boolean }[]> = {
    pr_wise:         [{ label: "PR No.", field: "pr_no" }, { label: "Supplier", field: "supplier" }, { label: "PR Amount", field: "pr_amount", amount: true }],
    supplier_wise:   [{ label: "Supplier", field: "supplier" }, { label: "No. of PRs", field: "no_of_prs" }, { label: "PR Amount", field: "pr_amount", amount: true }],
    item_group_wise: [{ label: "Item Group", field: "item_group" }, { label: "No. of Items", field: "no_of_items" }, { label: "PR Amount", field: "pr_amount", amount: true }],
  };

  return (
    <>
      {/* ── Detail Overlay ── */}
      {detail && (
        <DetailOverlay
          config={getDetailConfig(detail.key, poView, prView)}
          data={detail.data}
          onClose={() => setDetail(null)}
        />
      )}

      <div style={{ minHeight:"100vh", background:"#f0f2f5", padding:20, display:"flex", flexDirection:"column", gap:18 }}>
        {/* ── Header ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:900, color:"#111827", letterSpacing:"-0.02em" }}>Finance Dashboard</h1>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"#9ca3af" }}>
              Executive Overview · <span style={{ fontWeight:600, color:"#6b7280" }}>{filters.project || "All Projects"}</span>
            </p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            {/* Project selector */}
            <select
              value={filters.project}
              onChange={e => setFilters(f => ({ ...f, project: e.target.value }))}
              style={{ background:"#fff", border:"1px solid #d1d5db", borderRadius:6, padding:"5px 8px", fontSize:12, color:"#374151", outline:"none", cursor:"pointer" }}
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.code} value={p.code}>{p.label}</option>
              ))}
            </select>

            {/* Quick filters */}
            <QuickBtn label="Today" active={filters.quick === "today"} onClick={() => setFilters(f => ({ ...f, quick: f.quick === "today" ? "" : "today", dateFrom: "", dateTo: "" }))} />
            <QuickBtn label="Yesterday" active={filters.quick === "yesterday"} onClick={() => setFilters(f => ({ ...f, quick: f.quick === "yesterday" ? "" : "yesterday", dateFrom: "", dateTo: "" }))} />

            {/* Date picker */}
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(s => !s)}
                style={{ display:"flex", alignItems:"center", gap:6, background:"#fff", border:"1px solid #d1d5db", borderRadius:8, padding:"6px 12px", fontSize:13, color:"#374151", cursor:"pointer" }}
              >
                <Calendar style={{ width: 13, height: 13 }} />
                {filters.dateFrom ? `${filters.dateFrom} → ${filters.dateTo || filters.dateFrom}` : "Date Filter"}
              </button>
              {showDatePicker && (
                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-30 w-72">
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">From</label>
                      <input type="date" value={fromInput} onChange={e => setFromInput(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs mt-1 outline-none focus:border-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">To</label>
                      <input type="date" value={toInput} onChange={e => setToInput(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs mt-1 outline-none focus:border-indigo-400" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setFilters(f => ({ ...f, dateFrom: fromInput, dateTo: toInput, quick: "" })); setShowDatePicker(false); }}
                      className="flex-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg px-3 py-1.5 hover:bg-indigo-700 transition-all cursor-pointer border-0">
                      Apply
                    </button>
                    <button onClick={() => { setFilters(f => ({ ...f, dateFrom: "", dateTo: "", quick: "" })); setFromInput(""); setToInput(""); setShowDatePicker(false); }}
                      className="flex-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg px-3 py-1.5 hover:bg-slate-200 transition-all cursor-pointer border-0">
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Refresh */}
            <button onClick={refetchAll}
              style={{ display:"flex", alignItems:"center", gap:6, background:"#fff", border:"1px solid #d1d5db", borderRadius:8, padding:"6px 14px", fontSize:13, fontWeight:600, color:"#374151", cursor:"pointer" }}>
              <RefreshCw style={{ width: 13, height: 13 }} className={anyLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* ── KPI Row ── */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-slate-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KPICard label="Project Budget" value={kpis.project_budget} icon={Briefcase} color={COLORS.navy}
                onClick={() => {}} />
              <KPICard label="PO Cost" value={kpis.po_cost} icon={ShoppingCart} color={COLORS.blue}
                onClick={() => openDetail("po_cost")} />
              <KPICard label="PR Cost" value={kpis.pr_cost} icon={FileText} color={COLORS.purple}
                onClick={() => openDetail("pr_cost")} />
              <KPICard label="Other Expenses" value={kpis.other_expenses} icon={ChevronDown} color={COLORS.orange}
                expandIcon onClick={() => toggleSub("other_expenses")} />
              <KPICard label="Operational Loss" value={kpis.extra_expenses} icon={TrendingUp} color={COLORS.teal}
                onClick={() => openDetail("extra_expenses")} />
              <KPICard label="Salary" value={kpis.salary} icon={Users} color={COLORS.red}
                expandIcon onClick={() => toggleSub("salary")} />
            </div>
          )}

          {/* ── Sub KPIs: Other Expenses ── */}
          {subExpanded === "other_expenses" && (
            <div className="flex gap-3 flex-wrap pl-2 border-l-4 border-orange-400">
              <SubKPICard label="Cash Request"       value={kpis.cash_request}   color={COLORS.amber}  onClick={() => openDetail("cash_request")} />
              <SubKPICard label="Request for Payment" value={kpis.req_payment}   color={COLORS.gold}   onClick={() => openDetail("req_payment")} />
              <SubKPICard label="Ticket Booking"     value={kpis.ticket_booking} color={COLORS.brown}  onClick={() => openDetail("ticket_booking")} />
            </div>
          )}

          {/* ── Sub KPIs: Salary ── */}
          {subExpanded === "salary" && (
            <div className="flex gap-3 flex-wrap pl-2 border-l-4 border-red-400">
              <SubKPICard label="Claim"   value={kpis.claim}   color={COLORS.crimson} onClick={() => openDetail("claim")} />
              <SubKPICard label="Advance" value={kpis.advance} color={COLORS.maroon}  onClick={() => openDetail("advance")} />
            </div>
          )}

          {/* ── Row 1: PO Cost | PR Cost ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="PO Cost" color={COLORS.blue} badge={poViewRows[poView].length}>
              <div className="px-4 pt-2 pb-1">
                <TabSwitcher
                  tabs={[{ key: "po_wise", label: "PO Wise" }, { key: "supplier_wise", label: "Supplier" }, { key: "item_group_wise", label: "Item Group" }]}
                  active={poView} onChange={v => setPoView(v as PO_View)}
                />
              </div>
              <DataTable columns={poTabCols[poView]} data={poViewRows[poView]} colSpan={3} />
            </Panel>

            <Panel title="PR Cost" color={COLORS.purple} badge={prViewRows[prView].length}>
              <div className="px-4 pt-2 pb-1">
                <TabSwitcher
                  tabs={[{ key: "pr_wise", label: "PR Wise" }, { key: "supplier_wise", label: "Supplier" }, { key: "item_group_wise", label: "Item Group" }]}
                  active={prView} onChange={v => setPrView(v as PR_View)}
                />
              </div>
              <DataTable columns={prTabCols[prView]} data={prViewRows[prView]} colSpan={3} />
            </Panel>
          </div>

          {/* ── Row 2: Cash Request | Request for Payment ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Cash Request" color={COLORS.amber} badge={crRows.length}>
              <DataTable
                columns={[{ label: "Date", field: "date" }, { label: "Entry No.", field: "entry_no" }, { label: "Remarks", field: "remarks" }, { label: "Created By", field: "created_by" }, { label: "Amount", field: "amount", amount: true }, { label: "Approved By", field: "approved_by" }]}
                data={crRows} colSpan={6}
              />
            </Panel>
            <Panel title="Request for Payment" color={COLORS.gold} badge={rpRows.length}>
              <DataTable
                columns={[{ label: "Date", field: "date" }, { label: "Entry No.", field: "entry_no" }, { label: "Remarks", field: "remarks" }, { label: "Created By", field: "created_by" }, { label: "Amount", field: "amount", amount: true }, { label: "Approved By", field: "approved_by" }]}
                data={rpRows} colSpan={6}
              />
            </Panel>
          </div>

          {/* ── Row 3: Ticket Booking | Operational Loss ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Ticket Booking" color={COLORS.brown} badge={tbRows.length}>
              <DataTable
                columns={[{ label: "Date", field: "date" }, { label: "Entry No.", field: "entry_no" }, { label: "Employee", field: "employee_name" }, { label: "Amount", field: "amount", amount: true }, { label: "Reason", field: "reason" }]}
                data={tbRows} colSpan={5}
              />
            </Panel>
            <Panel title="Operational Loss" color={COLORS.teal} badge={eeRows.length}>
              <DataTable
                columns={[{ label: "Date", field: "date" }, { label: "Entry No.", field: "entry_no" }, { label: "Employee", field: "employee_name" }, { label: "Amount", field: "amount", amount: true }, { label: "Reason", field: "reason" }]}
                data={eeRows} colSpan={5}
              />
            </Panel>
          </div>

          {/* ── Row 4: Salary | Claim ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Salary" color={COLORS.red} badge={salRows.length}>
              <DataTable
                columns={[{ label: "Employee", field: "employee" }, { label: "Salary", field: "salary", amount: true }]}
                data={salRows} colSpan={2}
              />
            </Panel>
            <Panel title="Claim" color={COLORS.crimson} badge={clRows.length}>
              <DataTable
                columns={[{ label: "Employee", field: "employee" }, { label: "Claim Amount", field: "claim_amount", amount: true }]}
                data={clRows} colSpan={2}
              />
            </Panel>
          </div>

          {/* ── Row 5: Advance (full width) ── */}
          <Panel title="Advance" color={COLORS.maroon} badge={advRows.length}>
            <DataTable
              columns={[{ label: "Employee Name", field: "employee_name" }, { label: "Advanced Amount", field: "advanced_amount", amount: true }]}
              data={advRows} colSpan={2}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}

export default function FinanceDashboard() { return <Layout><FinanceDashboardContent /></Layout>; }
