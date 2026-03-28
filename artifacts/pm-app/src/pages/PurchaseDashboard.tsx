import { useState, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle, ClipboardCheck, FileClock, FileQuestion,
  ShoppingCart, CreditCard, AlertTriangle, Truck,
  RefreshCw, Download, ChevronDown, Search, X,
  Clock, Package, TrendingUp, BarChart3, Filter,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

// ── Helpers ───────────────────────────────────────────────────────────────────

function apiUrl(path: string, project?: string) {
  const base = `/api/purchase-dashboard/${path}`;
  return project?.trim() ? `${base}?project=${encodeURIComponent(project)}` : base;
}

function exportToExcel(rows: Record<string, any>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function parseAge(val: any): number {
  if (val == null) return 0;
  const n = parseInt(String(val));
  return isNaN(n) ? 0 : n;
}

function AgeBadge({ value }: { value: any }) {
  const days = parseAge(value);
  const cls = days > 14
    ? "bg-red-50 text-red-700 border-red-200"
    : days > 7
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold whitespace-nowrap", cls)}>
      <Clock className="w-2.5 h-2.5" />
      {days}d
    </span>
  );
}

function StatusBadge({ value }: { value: any }) {
  const s = String(value ?? "").toLowerCase();
  const cls = s.includes("complet") || s.includes("submit")
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : s.includes("draft") || s.includes("pending")
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : s.includes("cancel")
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap", cls)}>
      {value ?? "—"}
    </span>
  );
}

function DelayBadge({ value }: { value: any }) {
  const days = parseAge(value);
  if (days <= 0) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200 text-[10px] font-bold whitespace-nowrap">
      <AlertTriangle className="w-2.5 h-2.5" />
      {days}d delay
    </span>
  );
}

// ── Project Selector ──────────────────────────────────────────────────────────

function ProjectSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["purchase-projects"],
    queryFn: async () => {
      const r = await fetch("/api/purchase-dashboard/projects");
      const d = await r.json();
      return d.projects as { code: string; name: string; label: string }[];
    },
    staleTime: 60_000,
  });

  const projects = useMemo(() => {
    const all = [{ code: "", name: "All Projects", label: "All Projects" }, ...(data ?? [])];
    if (!search) return all;
    return all.filter(p => p.label.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const selected = projects.find(p => p.code === value) ?? { label: "All Projects" };

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 min-w-[220px] hover:border-indigo-300 transition-colors shadow-sm"
        onClick={() => setOpen(o => !o)}
      >
        <Package className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        <span className="flex-1 text-left truncate font-medium">{selected.label}</span>
        <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-80">
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input
              autoFocus
              className="bg-transparent text-sm text-gray-700 outline-none flex-1 placeholder-gray-400"
              placeholder="Search project..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch("")}><X className="w-3 h-3 text-gray-400" /></button>}
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {projects.map(p => (
              <button
                key={p.code}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  p.code === value ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => { onChange(p.code); setOpen(false); setSearch(""); }}
              >
                {p.label}
              </button>
            ))}
            {projects.length === 0 && <p className="text-center py-4 text-gray-400 text-sm">No results</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
  label, value, icon: Icon, accent, onClick, active,
}: {
  label: string; value: number | string; icon: React.ElementType;
  accent: { bg: string; text: string; border: string; iconBg: string; iconText: string; activeBg: string; activeBorder: string };
  onClick: () => void; active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2.5 p-4 rounded-xl border text-left transition-all duration-150 shadow-sm hover:shadow-md",
        active
          ? `${accent.activeBg} ${accent.activeBorder} ring-2 ring-offset-1 ring-current`
          : `bg-white border-gray-200 hover:border-gray-300`
      )}
    >
      <div className="flex items-center justify-between w-full">
        <p className={cn("text-[10px] font-bold uppercase tracking-wider leading-tight", active ? accent.text : "text-gray-400")}>
          {label}
        </p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors", active ? `${accent.iconBg} ${accent.iconText}` : `${accent.iconBg} ${accent.iconText}`)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className={cn("text-2xl font-black tabular-nums tracking-tight", active ? accent.text : "text-gray-800")}>
        {value ?? "—"}
      </p>
      {active && (
        <p className={cn("text-[10px] font-semibold flex items-center gap-1", accent.text)}>
          <ArrowUpRight className="w-3 h-3" /> Click to hide detail
        </p>
      )}
    </button>
  );
}

// ── Data Table ────────────────────────────────────────────────────────────────

type ColDef = {
  key: string;
  label: string;
  render?: (val: any, row: Record<string, any>) => React.ReactNode;
  width?: string;
};

function DataTable({
  title, rows, columns, loading, filename, emptyText,
}: {
  title: string; rows: Record<string, any>[]; columns: ColDef[];
  loading?: boolean; filename: string; emptyText?: string;
}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const setFilter = useCallback((key: string, val: string) => setFilters(p => ({ ...p, [key]: val })), []);
  const activeFilters = Object.values(filters).filter(Boolean).length;

  const filtered = useMemo(() => rows.filter(row => {
    const q = search.toLowerCase();
    const matchSearch = !q || Object.values(row).some(v => String(v ?? "").toLowerCase().includes(q));
    const matchFilters = columns.every(col => {
      const f = filters[col.key];
      return !f || String(row[col.key] ?? "").toLowerCase().includes(f.toLowerCase());
    });
    return matchSearch && matchFilters;
  }), [rows, search, filters, columns]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800 text-sm">{title}</span>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            loading ? "bg-gray-100 text-gray-400" : filtered.length > 0 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"
          )}>
            {loading ? "…" : filtered.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(s => !s)}
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold border rounded-lg px-2 py-1 transition-colors",
              (showFilters || activeFilters > 0) ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            )}
          >
            <Filter className="w-3 h-3" />
            {activeFilters > 0 ? `Filters (${activeFilters})` : "Filter"}
          </button>
          <button
            onClick={() => exportToExcel(filtered, filename)}
            className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors"
          >
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      {/* Search + col filters */}
      {showFilters && (
        <div className="px-4 py-2.5 border-b border-gray-100 bg-white flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
            <input
              className="bg-gray-50 border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-xs text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-400 w-44"
              placeholder="Quick search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {columns.map(col => (
            <input
              key={col.key}
              className={cn(
                "bg-gray-50 border rounded-lg px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-400 transition-colors",
                col.width ?? "w-28",
                filters[col.key] ? "border-indigo-300 bg-indigo-50" : "border-gray-200"
              )}
              placeholder={col.label}
              value={filters[col.key] ?? ""}
              onChange={e => setFilter(col.key, e.target.value)}
            />
          ))}
          {(activeFilters > 0 || search) && (
            <button
              onClick={() => { setFilters({}); setSearch(""); }}
              className="text-[11px] text-red-500 hover:text-red-700 font-semibold border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-50 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto" style={{ maxHeight: 340 }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
            <tr>
              <th className="px-3 py-2.5 text-left text-[10px] text-gray-400 font-bold uppercase tracking-wider w-8">#</th>
              {columns.map(col => (
                <th key={col.key} className="px-3 py-2.5 text-left text-[10px] text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td colSpan={columns.length + 1} className="px-3 py-3">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-10">
                  <BarChart3 className="w-6 h-6 mx-auto mb-2 text-gray-200" />
                  <p className="text-xs text-gray-400">{emptyText ?? "No records found"}</p>
                </td>
              </tr>
            ) : filtered.map((row, i) => (
              <tr key={i} className={cn(
                "border-b border-gray-50 transition-colors hover:bg-indigo-50/30",
                i % 2 !== 0 ? "bg-gray-50/30" : ""
              )}>
                <td className="px-3 py-2.5 text-gray-300 text-[11px] font-semibold">{i + 1}</td>
                {columns.map(col => (
                  <td key={col.key} className="px-3 py-2.5 text-gray-600 text-[11px] whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] != null ? String(row[col.key]) : "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Alert Banner ──────────────────────────────────────────────────────────────

function AlertBanner({ delayCount, paymentCount }: { delayCount: number; paymentCount: number }) {
  if (delayCount === 0 && paymentCount === 0) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {delayCount > 0 && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex-1 min-w-[200px]">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-red-700">{delayCount} Purchase Orders delayed in transit</p>
            <p className="text-[10px] text-red-500">Expected delivery date has passed — requires immediate action</p>
          </div>
        </div>
      )}
      {paymentCount > 0 && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex-1 min-w-[200px]">
          <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700">{paymentCount} Payments awaiting approval</p>
            <p className="text-[10px] text-amber-600">Pending payment entries need to be reviewed</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab definitions ───────────────────────────────────────────────────────────

type TabId = "pending" | "transit" | "payment" | "completed";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "pending",   label: "Pending Work",    icon: FileClock },
  { id: "transit",   label: "Transit",          icon: Truck },
  { id: "payment",   label: "Payments",         icon: CreditCard },
  { id: "completed", label: "Completed",        icon: CheckCircle },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function PurchaseDashboard() {
  const [project, setProject] = useState("");
  const [tab, setTab] = useState<TabId>("pending");

  const pq = (path: string) => ({
    queryKey: ["purchase", path, project],
    queryFn: async () => { const r = await fetch(apiUrl(path, project)); return r.json(); },
    staleTime: 30_000,
  });

  const counts       = useQuery(pq("counts"));
  const mrMadePoPending = useQuery(pq("mr-made-po-pending"));
  const completedPO  = useQuery(pq("completed-purchase-orders"));
  const poPending    = useQuery(pq("po-pending"));
  const completedMR  = useQuery(pq("completed-mr-orders"));
  const mrPending    = useQuery(pq("mr-pending"));
  const paymentPending = useQuery(pq("payment-pending"));
  const poOnTransit  = useQuery(pq("po-on-transit"));
  const poDelayTransit = useQuery(pq("po-delay-transit"));

  const c = counts.data?.message ?? {};

  function rows(q: ReturnType<typeof useQuery>): Record<string, any>[] {
    const msg = (q.data as any)?.message;
    return Array.isArray(msg) ? msg : [];
  }

  const refetchAll = () => {
    [counts, mrMadePoPending, completedPO, poPending, completedMR, mrPending, paymentPending, poOnTransit, poDelayTransit].forEach(q => q.refetch());
  };

  const kpis = [
    { label: "PO Completed",         value: c.po_completed_count, icon: CheckCircle,   accent: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300", iconBg: "bg-emerald-100", iconText: "text-emerald-600", activeBg: "bg-emerald-50", activeBorder: "border-emerald-400" } },
    { label: "MR Completed",          value: c.mr_completed_count, icon: ClipboardCheck, accent: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300", iconBg: "bg-blue-100", iconText: "text-blue-600", activeBg: "bg-blue-50", activeBorder: "border-blue-400" } },
    { label: "MR Made → PO Pending",  value: c.mr_made_po_pending, icon: FileClock,     accent: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300", iconBg: "bg-orange-100", iconText: "text-orange-600", activeBg: "bg-orange-50", activeBorder: "border-orange-400" } },
    { label: "MR Pending",            value: c.mr_pending,         icon: FileQuestion,  accent: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-300", iconBg: "bg-violet-100", iconText: "text-violet-600", activeBg: "bg-violet-50", activeBorder: "border-violet-400" } },
    { label: "PO Pending",            value: c.po_pending,         icon: ShoppingCart,  accent: { bg: "bg-red-50", text: "text-red-700", border: "border-red-300", iconBg: "bg-red-100", iconText: "text-red-600", activeBg: "bg-red-50", activeBorder: "border-red-400" } },
    { label: "Payment Pending",       value: c.payment_pending,    icon: CreditCard,    accent: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-300", iconBg: "bg-rose-100", iconText: "text-rose-600", activeBg: "bg-rose-50", activeBorder: "border-rose-400" } },
    { label: "PO Delay in Transit",   value: c.po_delay_transit,   icon: AlertTriangle, accent: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300", iconBg: "bg-amber-100", iconText: "text-amber-600", activeBg: "bg-amber-50", activeBorder: "border-amber-400" } },
    { label: "PO On Transit",         value: c.po_on_transit,      icon: Truck,         accent: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-300", iconBg: "bg-teal-100", iconText: "text-teal-600", activeBg: "bg-teal-50", activeBorder: "border-teal-400" } },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-5 space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Purchase Dashboard</h1>
            </div>
            <p className="text-xs text-gray-400 mt-1 ml-10.5">Live purchase tracking from ERP · {rows(mrPending).length + rows(poPending).length} items need attention</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ProjectSelector value={project} onChange={p => { setProject(p); }} />
            <button
              onClick={refetchAll}
              className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm font-semibold"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", counts.isFetching && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Alerts ── */}
        <AlertBanner
          delayCount={rows(poDelayTransit).length}
          paymentCount={rows(paymentPending).length}
        />

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {kpis.map(k => (
            <KPICard
              key={k.label}
              label={k.label}
              value={counts.isLoading ? "…" : (k.value ?? "—")}
              icon={k.icon}
              accent={k.accent}
              active={false}
              onClick={() => {}}
            />
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3.5 text-xs font-semibold transition-colors border-b-2 -mb-px",
                  tab === t.id
                    ? "border-indigo-600 text-indigo-700 bg-indigo-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {t.id === "pending" && (
                  <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                    {counts.isLoading ? "…" : (c.mr_pending ?? 0) + (c.po_pending ?? 0) + (c.mr_made_po_pending ?? 0)}
                  </span>
                )}
                {t.id === "transit" && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                    {counts.isLoading ? "…" : c.po_delay_transit ?? 0}
                  </span>
                )}
                {t.id === "payment" && (
                  <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                    {counts.isLoading ? "…" : c.payment_pending ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4">

            {/* ── Pending Work Tab ── */}
            {tab === "pending" && (
              <div className="space-y-4">
                <DataTable
                  title="MR Made — PO Not Yet Created"
                  rows={rows(mrMadePoPending)}
                  loading={mrMadePoPending.isLoading}
                  filename="MR_Made_PO_Not_Made"
                  emptyText="All material requests have purchase orders"
                  columns={[
                    { key: "material_request", label: "Material Request", width: "w-36",
                      render: v => <span className="font-semibold text-indigo-600">{v ?? "—"}</span> },
                    { key: "description", label: "Items / Description", width: "w-52",
                      render: v => <span className="text-gray-700 max-w-xs block truncate">{v ?? "—"}</span> },
                    { key: "total_mr_qty", label: "MR Qty", width: "w-20",
                      render: v => <span className="font-semibold text-gray-800 tabular-nums">{v ?? "—"}</span> },
                    { key: "pending", label: "Pending Qty", width: "w-24",
                      render: v => {
                        const n = parseFloat(String(v ?? "0"));
                        return <span className={cn("font-bold tabular-nums", n > 0 ? "text-red-600" : "text-gray-400")}>{v ?? "—"}</span>;
                      }
                    },
                  ]}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <DataTable
                    title="MR Pending"
                    rows={rows(mrPending)}
                    loading={mrPending.isLoading}
                    filename="MR_Pending"
                    emptyText="No pending material requests"
                    columns={[
                      { key: "name", label: "MR No", width: "w-32",
                        render: v => <span className="font-semibold text-indigo-600">{v ?? "—"}</span> },
                      { key: "creation", label: "Created", width: "w-28",
                        render: v => <span className="text-gray-500 tabular-nums">{v ? String(v).slice(0, 10) : "—"}</span> },
                      { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
                      { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
                      { key: "project_remarks", label: "Remarks", width: "w-44",
                        render: v => <span className="text-gray-500 max-w-xs block truncate">{v ?? "—"}</span> },
                    ]}
                  />
                  <DataTable
                    title="PO Pending"
                    rows={rows(poPending)}
                    loading={poPending.isLoading}
                    filename="PO_Pending"
                    emptyText="No pending purchase orders"
                    columns={[
                      { key: "name", label: "PO No", width: "w-32",
                        render: v => <span className="font-semibold text-indigo-600">{v ?? "—"}</span> },
                      { key: "creation", label: "Created", width: "w-28",
                        render: v => <span className="text-gray-500 tabular-nums">{v ? String(v).slice(0, 10) : "—"}</span> },
                      { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
                      { key: "supplier", label: "Supplier", width: "w-36",
                        render: v => <span className="text-gray-700 font-medium max-w-xs block truncate">{v ?? "—"}</span> },
                      { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* ── Transit Tab ── */}
            {tab === "transit" && (
              <div className="space-y-4">
                <DataTable
                  title="PO Delay in Transit"
                  rows={rows(poDelayTransit)}
                  loading={poDelayTransit.isLoading}
                  filename="PO_Delay_Transit"
                  emptyText="No delayed purchase orders in transit"
                  columns={[
                    { key: "name", label: "PO No", width: "w-32",
                      render: v => <span className="font-semibold text-indigo-600">{v ?? "—"}</span> },
                    { key: "delivery_from", label: "Delivery From", width: "w-28",
                      render: v => <span className="tabular-nums text-gray-500">{v ?? "—"}</span> },
                    { key: "delivery_to", label: "Delivery To", width: "w-28",
                      render: v => <span className="tabular-nums text-gray-500">{v ?? "—"}</span> },
                    { key: "po_pr_pending", label: "PO / PR / Pending",
                      render: v => <span className="font-medium text-gray-700">{v ?? "—"}</span> },
                    { key: "delay_days", label: "Delay", render: v => <DelayBadge value={v} /> },
                  ]}
                />
                <DataTable
                  title="PO On Transit"
                  rows={rows(poOnTransit)}
                  loading={poOnTransit.isLoading}
                  filename="PO_On_Transit"
                  emptyText="No purchase orders currently in transit"
                  columns={[
                    { key: "name", label: "PO No", width: "w-32",
                      render: v => <span className="font-semibold text-indigo-600">{v ?? "—"}</span> },
                    { key: "supplier", label: "Supplier", width: "w-40",
                      render: v => <span className="text-gray-700 font-medium">{v ?? "—"}</span> },
                    { key: "exp_delivery", label: "Exp. Delivery", width: "w-28",
                      render: v => <span className="tabular-nums text-gray-600">{v ?? "—"}</span> },
                    { key: "exp_received", label: "Exp. Received", width: "w-28",
                      render: v => <span className="tabular-nums text-gray-600">{v ?? "—"}</span> },
                    { key: "days_remaining", label: "Days Left",
                      render: v => {
                        const n = parseInt(String(v ?? "0"));
                        return (
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold",
                            n <= 3 ? "bg-red-50 text-red-700 border-red-200"
                            : n <= 7 ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-teal-50 text-teal-700 border-teal-200"
                          )}>
                            <Clock className="w-2.5 h-2.5" />{v ?? "—"}d
                          </span>
                        );
                      }
                    },
                  ]}
                />
              </div>
            )}

            {/* ── Payments Tab ── */}
            {tab === "payment" && (
              <DataTable
                title="Payment Pending"
                rows={rows(paymentPending)}
                loading={paymentPending.isLoading}
                filename="Payment_Pending"
                emptyText="No pending payment entries"
                columns={[
                  { key: "name", label: "Payment No", width: "w-36",
                    render: v => <span className="font-semibold text-indigo-600">{v ?? "—"}</span> },
                  { key: "creation", label: "Created", width: "w-28",
                    render: v => <span className="tabular-nums text-gray-500">{v ? String(v).slice(0, 10) : "—"}</span> },
                  { key: "payment_type", label: "Type", width: "w-28",
                    render: v => <span className="font-medium text-gray-700">{v ?? "—"}</span> },
                  { key: "workflow_state", label: "Workflow State", render: v => <StatusBadge value={v} /> },
                  { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
                ]}
              />
            )}

            {/* ── Completed Tab ── */}
            {tab === "completed" && (
              <div className="space-y-4">
                <DataTable
                  title="Completed Purchase Orders"
                  rows={rows(completedPO)}
                  loading={completedPO.isLoading}
                  filename="Completed_PO"
                  emptyText="No completed purchase orders"
                  columns={[
                    { key: "name", label: "PO No", width: "w-32",
                      render: v => <span className="font-semibold text-indigo-600">{v ?? "—"}</span> },
                    { key: "creation", label: "Created", width: "w-28",
                      render: v => <span className="tabular-nums text-gray-500">{v ? String(v).slice(0, 10) : "—"}</span> },
                    { key: "supplier", label: "Supplier", width: "w-44",
                      render: v => <span className="text-gray-700 font-medium">{v ?? "—"}</span> },
                    { key: "grand_total", label: "Amount", width: "w-28",
                      render: v => <span className="font-bold text-gray-800 tabular-nums">{v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—"}</span> },
                    { key: "workflow_state", label: "Workflow", render: v => <StatusBadge value={v} /> },
                    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
                    { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
                  ]}
                />
                <DataTable
                  title="Completed Material Requests"
                  rows={rows(completedMR)}
                  loading={completedMR.isLoading}
                  filename="Completed_MR"
                  emptyText="No completed material requests"
                  columns={[
                    { key: "name", label: "MR No", width: "w-36",
                      render: v => <span className="font-semibold text-indigo-600">{v ?? "—"}</span> },
                    { key: "creation", label: "Created", width: "w-28",
                      render: v => <span className="tabular-nums text-gray-500">{v ? String(v).slice(0, 10) : "—"}</span> },
                    { key: "schedule_date", label: "MR Date", width: "w-28",
                      render: v => <span className="tabular-nums text-gray-500">{v ?? "—"}</span> },
                    { key: "workflow_state", label: "Workflow", render: v => <StatusBadge value={v} /> },
                    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
                    { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
