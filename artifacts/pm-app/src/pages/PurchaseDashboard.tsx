import { useState, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  ClipboardCheck,
  FileClock,
  FileQuestion,
  ShoppingCart,
  CreditCard,
  AlertTriangle,
  Truck,
  RefreshCw,
  Download,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

// ── Helpers ──────────────────────────────────────────────────────────────────

function apiUrl(path: string, project?: string) {
  const base = `/api/purchase-dashboard/${path}`;
  return project && project.trim()
    ? `${base}?project=${encodeURIComponent(project)}`
    : base;
}

function exportToExcel(rows: Record<string, any>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── Project Selector ──────────────────────────────────────────────────────────

function ProjectSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
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
    const all = [
      { code: "", name: "All Projects", label: "All Projects" },
      ...(data ?? []),
    ];
    if (!search) return all;
    return all.filter((p) =>
      p.label.toLowerCase().includes(search.toLowerCase()),
    );
  }, [data, search]);

  const selected = projects.find((p) => p.code === value) ?? {
    label: "All Projects",
  };

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-w-[200px] hover:bg-white/10 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-white/40 text-xs uppercase tracking-wider mr-1">
          Project
        </span>
        <span className="flex-1 text-left truncate">{selected.label}</span>
        <ChevronDown className="w-3 h-3 text-white/40 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl w-72">
          <div className="p-2 border-b border-white/10 flex items-center gap-2">
            <Search className="w-3 h-3 text-white/40" />
            <input
              autoFocus
              className="bg-transparent text-sm text-white outline-none flex-1 placeholder-white/30"
              placeholder="Search project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X className="w-3 h-3 text-white/40" />
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {projects.map((p) => (
              <button
                key={p.code}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  p.code === value
                    ? "bg-indigo-600 text-white"
                    : "text-white/70 hover:bg-white/5",
                )}
                onClick={() => {
                  onChange(p.code);
                  setOpen(false);
                  setSearch("");
                }}
              >
                {p.label}
              </button>
            ))}
            {projects.length === 0 && (
              <p className="text-center py-4 text-white/30 text-sm">
                No results
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  icon: Icon,
  color,
  activeColor,
  onClick,
  active,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  activeColor: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all duration-200",
        active
          ? `${activeColor} border-white/30 shadow-lg scale-[1.02]`
          : "bg-white/5 border-white/10 hover:bg-white/8 hover:scale-[1.01]",
      )}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider leading-tight">
          {label}
        </span>
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
            color,
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <span className="text-3xl font-bold text-white">{value ?? "—"}</span>
    </button>
  );
}

// ── Filterable Table ──────────────────────────────────────────────────────────

function FilterableTable({
  title,
  rows,
  columns,
  badge,
  loading,
  filename,
}: {
  title: string;
  rows: Record<string, any>[];
  columns: { key: string; label: string }[];
  badge?: number;
  loading?: boolean;
  filename: string;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    return rows.filter((row) =>
      columns.every((col) => {
        const f = filters[col.key];
        if (!f) return true;
        const v = String(row[col.key] ?? "").toLowerCase();
        return v.includes(f.toLowerCase());
      }),
    );
  }, [rows, filters, columns]);

  const setFilter = useCallback((key: string, val: string) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }, []);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-sm">{title}</span>
          <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full">
            {filtered.length}
          </span>
        </div>
        <button
          onClick={() => exportToExcel(filtered, filename)}
          className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <Download className="w-3 h-3" />
          Export Excel
        </button>
      </div>
      <div className="overflow-auto max-h-72">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#12122a]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-3 py-2 text-white/40 font-semibold uppercase tracking-wider whitespace-nowrap border-b border-white/10"
                >
                  {col.label}
                </th>
              ))}
            </tr>
            <tr className="bg-[#0f0f1f]">
              {columns.map((col) => (
                <td key={col.key} className="px-2 py-1 border-b border-white/5">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white/70 placeholder-white/20 outline-none focus:border-indigo-500/50 text-xs"
                    placeholder="Filter..."
                    value={filters[col.key] ?? ""}
                    onChange={(e) => setFilter(col.key, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-8 text-white/30"
                >
                  Loading data...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-8 text-white/20"
                >
                  No records
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-b border-white/5 hover:bg-white/5 transition-colors",
                    i % 2 === 0 ? "" : "bg-white/[0.02]",
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-3 py-2 text-white/70 whitespace-nowrap"
                    >
                      {row[col.key] != null ? String(row[col.key]) : "—"}
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

// ── Main Component ────────────────────────────────────────────────────────────

type DetailView =
  | "po_completed"
  | "mr_completed"
  | "mr_made_po_pending"
  | "mr_pending"
  | "po_pending"
  | "payment_pending"
  | "po_delay_transit"
  | "po_on_transit"
  | null;

export default function PurchaseDashboard() {
  const [project, setProject] = useState("");
  const [detail, setDetail] = useState<DetailView>(null);

  const pq = (path: string) => ({
    queryKey: ["purchase", path, project],
    queryFn: async () => {
      const r = await fetch(apiUrl(path, project));
      return r.json();
    },
    staleTime: 30_000,
  });

  const counts = useQuery(pq("counts"));
  const mrMadePoPending = useQuery(pq("mr-made-po-pending"));
  const completedPO = useQuery(pq("completed-purchase-orders"));
  const poPending = useQuery(pq("po-pending"));
  const completedMR = useQuery(pq("completed-mr-orders"));
  const mrPending = useQuery(pq("mr-pending"));
  const paymentPending = useQuery(pq("payment-pending"));
  const poOnTransit = useQuery(pq("po-on-transit"));
  const poDelayTransit = useQuery(pq("po-delay-transit"));

  const c = counts.data?.message ?? {};
  const refetchAll = () => {
    [
      counts,
      mrMadePoPending,
      completedPO,
      poPending,
      completedMR,
      mrPending,
      paymentPending,
      poOnTransit,
      poDelayTransit,
    ].forEach((q) => q.refetch());
  };

  const kpis = [
    {
      id: "po_completed" as const,
      label: "PO Completed",
      value: c.po_completed_count,
      icon: CheckCircle,
      color: "bg-emerald-600/20 text-emerald-400",
      activeColor: "bg-emerald-600/30",
    },
    {
      id: "mr_completed" as const,
      label: "MR Completed",
      value: c.mr_completed_count,
      icon: ClipboardCheck,
      color: "bg-blue-600/20 text-blue-400",
      activeColor: "bg-blue-600/30",
    },
    {
      id: "mr_made_po_pending" as const,
      label: "MR Made PO Pending",
      value: c.mr_made_po_pending,
      icon: FileClock,
      color: "bg-orange-600/20 text-orange-400",
      activeColor: "bg-orange-600/30",
    },
    {
      id: "mr_pending" as const,
      label: "MR Pending",
      value: c.mr_pending,
      icon: FileQuestion,
      color: "bg-purple-600/20 text-purple-400",
      activeColor: "bg-purple-600/30",
    },
    {
      id: "po_pending" as const,
      label: "PO Pending",
      value: c.po_pending,
      icon: ShoppingCart,
      color: "bg-red-600/20 text-red-400",
      activeColor: "bg-red-600/30",
    },
    {
      id: "payment_pending" as const,
      label: "Payment Pending",
      value: c.payment_pending,
      icon: CreditCard,
      color: "bg-rose-600/20 text-rose-400",
      activeColor: "bg-rose-600/30",
    },
    {
      id: "po_delay_transit" as const,
      label: "PO Delay Transit",
      value: c.po_delay_transit,
      icon: AlertTriangle,
      color: "bg-amber-600/20 text-amber-400",
      activeColor: "bg-amber-600/30",
    },
    {
      id: "po_on_transit" as const,
      label: "PO On Transit",
      value: c.po_on_transit,
      icon: Truck,
      color: "bg-teal-600/20 text-teal-400",
      activeColor: "bg-teal-600/30",
    },
  ];

  function rows(q: ReturnType<typeof useQuery>): Record<string, any>[] {
    const msg = (q.data as any)?.message;
    if (Array.isArray(msg)) return msg;
    return [];
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#0d0d1f] p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Purchase Dashboard
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Live purchase tracking from ERP
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ProjectSelector
              value={project}
              onChange={(p) => {
                setProject(p);
                setDetail(null);
              }}
            />
            <button
              onClick={refetchAll}
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 transition-colors"
            >
              <RefreshCw
                className={cn("w-4 h-4", counts.isFetching && "animate-spin")}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {kpis.map((k) => (
            <KPICard
              key={k.id}
              label={k.label}
              value={k.value ?? "—"}
              icon={k.icon}
              color={k.color}
              activeColor={k.activeColor}
              active={detail === k.id}
              onClick={() => setDetail(detail === k.id ? null : k.id)}
            />
          ))}
        </div>

        {/* Row 1: MR Made Po Not Made | MR Pending | PO Pending */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <FilterableTable
            title="MR Made Po Not Made"
            rows={rows(mrMadePoPending)}
            loading={mrMadePoPending.isLoading}
            filename="MR_Made_Po_Not_Made"
            columns={[
              { key: "material_request", label: "Material Request" },
              { key: "description", label: "Description (Items)" },
              { key: "total_mr_qty", label: "Total MR Qty" },
              { key: "pending", label: "Pending" },
            ]}
          />
          <FilterableTable
            title="MR Pending"
            rows={rows(mrPending)}
            loading={mrPending.isLoading}
            filename="MR_Pending"
            columns={[
              { key: "creation", label: "Creation Date" },
              { key: "name", label: "MR No" },
              { key: "status", label: "Status" },
              { key: "age", label: "Age" },
              { key: "project_remarks", label: "Project Remarks" },
            ]}
          />
          <FilterableTable
            title="PO Pending"
            rows={rows(poPending)}
            loading={poPending.isLoading}
            filename="PO_Pending"
            columns={[
              { key: "name", label: "PO No" },
              { key: "creation", label: "Created Date" },
              { key: "status", label: "Status" },
              { key: "supplier", label: "Supplier" },
              { key: "age", label: "Age" },
            ]}
          />
        </div>

        {/* Row 2: Payment Pending | PO Delay Transit | PO On Transit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <FilterableTable
            title="Payment Pending"
            rows={rows(paymentPending)}
            loading={paymentPending.isLoading}
            filename="Payment_Pending"
            columns={[
              { key: "creation", label: "Creation Date" },
              { key: "name", label: "Payment No" },
              { key: "payment_type", label: "Payment Type" },
              { key: "workflow_state", label: "Workflow State" },
              { key: "age", label: "Age" },
            ]}
          />
          <FilterableTable
            title="PO Delay Transit"
            rows={rows(poDelayTransit)}
            loading={poDelayTransit.isLoading}
            filename="PO_Delay_Transit"
            columns={[
              { key: "name", label: "PO No" },
              { key: "delivery_from", label: "Delivery From" },
              { key: "delivery_to", label: "Delivery To" },
              { key: "po_pr_pending", label: "PO / PR / Pending" },
              { key: "delay_days", label: "Delay Days" },
            ]}
          />
          <FilterableTable
            title="PO On Transit"
            rows={rows(poOnTransit)}
            loading={poOnTransit.isLoading}
            filename="PO_On_Transit"
            columns={[
              { key: "name", label: "PO No" },
              { key: "supplier", label: "Supplier" },
              { key: "exp_delivery", label: "Exp. Delivery" },
              { key: "exp_received", label: "Exp. Received" },
              { key: "days_remaining", label: "Days Rem." },
            ]}
          />
        </div>

        {/* Row 3: Completed PO | Completed MR */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FilterableTable
            title="Completed Purchase Orders"
            rows={rows(completedPO)}
            loading={completedPO.isLoading}
            filename="Completed_Purchase_Orders"
            columns={[
              { key: "name", label: "PO No" },
              { key: "creation", label: "Created Date" },
              { key: "supplier", label: "Supplier" },
              { key: "grand_total", label: "Amount" },
              { key: "workflow_state", label: "Workflow State" },
              { key: "status", label: "Status" },
              { key: "age", label: "Age" },
            ]}
          />
          <FilterableTable
            title="Completed MR Orders"
            rows={rows(completedMR)}
            loading={completedMR.isLoading}
            filename="Completed_MR_Orders"
            columns={[
              { key: "name", label: "Material Request" },
              { key: "creation", label: "Created Date" },
              { key: "schedule_date", label: "MR Date" },
              { key: "workflow_state", label: "Workflow State" },
              { key: "status", label: "Status" },
              { key: "age", label: "Age" },
            ]}
          />
        </div>
      </div>
    </Layout>
  );
}
