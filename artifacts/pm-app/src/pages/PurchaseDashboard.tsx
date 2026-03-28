import { useState, useMemo, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle, ClipboardCheck, FileClock, FileQuestion,
  ShoppingCart, CreditCard, AlertTriangle, Truck,
  RefreshCw, Download, ChevronDown, Search, X,
  Clock, Package, ArrowLeft, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_PROJECT = "WTT-0528";

// Hex colors matching the reference HTML exactly
const COLORS = {
  green:  "#27ae60",
  blue:   "#2980b9",
  orange: "#e67e22",
  purple: "#8e44ad",
  red:    "#e74c3c",
  rose:   "#c0392b",
  amber:  "#f39c12",
  teal:   "#16a085",
};

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
  const n = parseInt(String(val ?? "0"));
  return isNaN(n) ? 0 : n;
}

// ── Badge components ──────────────────────────────────────────────────────────

function AgeBadge({ value }: { value: any }) {
  const d = parseAge(value);
  const color = d > 14 ? { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" }
    : d > 7 ? { bg: "#fffbeb", text: "#b45309", border: "#fde68a" }
    : { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" };
  return (
    <span style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">
      <Clock className="w-2.5 h-2.5" />{d}d
    </span>
  );
}

function StatusBadge({ value }: { value: any }) {
  const s = String(value ?? "").toLowerCase();
  const isGood = s.includes("complet") || s.includes("submit") || s.includes("approved");
  const isBad = s.includes("cancel");
  const color = isGood ? { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" }
    : isBad ? { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" }
    : { bg: "#fffbeb", text: "#b45309", border: "#fde68a" };
  return (
    <span style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap">
      {value ?? "—"}
    </span>
  );
}

function DelayBadge({ value }: { value: any }) {
  const d = parseAge(value);
  if (d <= 0) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">
      <AlertTriangle className="w-2.5 h-2.5" />{d}d delay
    </span>
  );
}

function DaysRemBadge({ value }: { value: any }) {
  const d = parseAge(value);
  const color = d <= 3 ? { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" }
    : d <= 7 ? { bg: "#fffbeb", text: "#b45309", border: "#fde68a" }
    : { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" };
  return (
    <span style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">
      <Clock className="w-2.5 h-2.5" />{d}d
    </span>
  );
}

// ── Flatten MR Made PO Pending ────────────────────────────────────────────────

function flattenMRMadePO(raw: Record<string, any>[]): Record<string, any>[] {
  const out: Record<string, any>[] = [];
  for (const row of raw) {
    const items: any[] = Array.isArray(row.items) ? row.items : [];
    if (items.length === 0) {
      out.push({ material_request: row.material_request, mr_status: row.mr_status, mr_creation_date: row.mr_creation_date, project: row.project, item_code: "—", description: "—", mr_qty: "—", po_qty: "—", pending_qty: "—" });
    } else {
      for (const item of items) {
        out.push({
          material_request: row.material_request,
          mr_status: row.mr_status,
          mr_creation_date: row.mr_creation_date,
          project: row.project,
          item_code: item.item_code,
          description: item.description ?? item.item_name,
          mr_qty: item.mr_qty,
          po_qty: item.po_qty,
          pending_qty: item.pending_qty,
        });
      }
    }
  }
  return out;
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
    return search ? all.filter(p => p.label.toLowerCase().includes(search.toLowerCase())) : all;
  }, [data, search]);

  const selected = (data ?? []).find(p => p.code === value);
  const displayLabel = selected ? selected.label : value ? value : "All Projects";

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 min-w-[240px] hover:border-gray-300 transition-colors shadow-sm font-medium"
        onClick={() => setOpen(o => !o)}
      >
        <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="flex-1 text-left truncate">{displayLabel}</span>
        <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-80">
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input autoFocus className="bg-transparent text-sm text-gray-700 outline-none flex-1 placeholder-gray-400"
              placeholder="Search project..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")}><X className="w-3 h-3 text-gray-400" /></button>}
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {projects.map(p => (
              <button key={p.code}
                className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  p.code === value ? "text-white font-semibold" : "text-gray-700 hover:bg-gray-50")}
                style={p.code === value ? { background: COLORS.blue } : {}}
                onClick={() => { onChange(p.code); setOpen(false); setSearch(""); }}>
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
  label, value, icon: Icon, color, onClick,
}: {
  label: string; value: any; icon: React.ElementType; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      style={{ background: color }}
      className="flex flex-col items-start gap-2 p-4 rounded-xl text-white text-left transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.99] shadow-md hover:shadow-lg w-full">
      <div className="flex items-center justify-between w-full">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ opacity: 0.85 }}>{label}</span>
        <Icon className="w-5 h-5" style={{ opacity: 0.7 } as any} />
      </div>
      <span className="text-3xl font-black tabular-nums tracking-tight">
        {value != null && value !== "" ? value : "—"}
      </span>
      <span className="text-[10px] font-semibold" style={{ opacity: 0.65 }}>Click to view details →</span>
    </button>
  );
}

// ── Data Table ────────────────────────────────────────────────────────────────

type ColDef = {
  key: string;
  label: string;
  render?: (val: any, row: Record<string, any>) => React.ReactNode;
};

function DataTable({
  title, rows, columns, loading, filename, color,
}: {
  title: string; rows: Record<string, any>[]; columns: ColDef[];
  loading?: boolean; filename: string; color: string;
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
      {/* Colored header */}
      <div style={{ background: color }} className="px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">{title}</span>
          <span className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
            {loading ? "…" : filtered.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowFilters(s => !s)}
            className="flex items-center gap-1 text-[11px] font-semibold rounded-lg px-2 py-1 transition-colors text-white"
            style={{ background: showFilters || activeFilters > 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)" }}>
            <Filter className="w-3 h-3" />
            {activeFilters > 0 ? `Filter (${activeFilters})` : "Filter"}
          </button>
          <button onClick={() => exportToExcel(filtered, filename)}
            className="flex items-center gap-1 text-[11px] font-semibold rounded-lg px-2.5 py-1 transition-colors text-white"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
            <input className="bg-white border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-xs text-gray-700 placeholder-gray-400 outline-none w-40"
              style={{ outlineColor: color }}
              placeholder="Search all..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {columns.map(col => (
            <input key={col.key}
              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-400 outline-none w-28"
              placeholder={col.label} value={filters[col.key] ?? ""} onChange={e => setFilter(col.key, e.target.value)} />
          ))}
          {(activeFilters > 0 || search) && (
            <button onClick={() => { setFilters({}); setSearch(""); }}
              className="text-[11px] text-red-500 border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-50 transition-colors flex items-center gap-1 font-semibold">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto" style={{ maxHeight: 300 }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
              <th className="px-2 py-2 text-[10px] text-gray-400 font-bold w-7 text-center">#</th>
              {columns.map(col => (
                <th key={col.key} className="px-3 py-2 text-left text-[10px] text-gray-500 font-bold uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                  <td colSpan={columns.length + 1} className="px-3 py-3">
                    <div className="h-3.5 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="text-center py-8 text-gray-400 text-xs">No records found</td></tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={i}
                  className="transition-colors hover:bg-blue-50/40"
                  style={{ background: i % 2 !== 0 ? "#fafafa" : "white", borderBottom: "1px solid #f3f4f6" }}>
                  <td className="px-2 py-2.5 text-gray-300 text-[10px] font-semibold text-center">{i + 1}</td>
                  {columns.map(col => (
                    <td key={col.key} className="px-3 py-2.5 text-gray-600 text-[11px] whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] != null ? String(row[col.key]) : "—")}
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

// ── Column definitions (reused in both overview + detail) ────────────────────

type DetailId = "po_completed" | "mr_completed" | "mr_made_po_pending" | "mr_pending"
  | "po_pending" | "payment_pending" | "po_delay_transit" | "po_on_transit";

const DETAIL_CONFIG: Record<DetailId, { title: string; color: string; filename: string; columns: ColDef[] }> = {
  po_completed: {
    title: "Completed Purchase Orders", color: COLORS.green, filename: "Completed_PO",
    columns: [
      { key: "purchase_order", label: "PO No", render: v => <span className="font-semibold" style={{ color: COLORS.blue }}>{v ?? "—"}</span> },
      { key: "created_date", label: "Created Date" },
      { key: "supplier", label: "Supplier", render: v => <span className="font-medium text-gray-700">{v ?? "—"}</span> },
      { key: "total_amount", label: "Amount", render: v => <span className="font-bold tabular-nums text-gray-800">{v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—"}</span> },
      { key: "workflow_state", label: "Workflow", render: v => <StatusBadge value={v} /> },
      { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
      { key: "project", label: "Project" },
      { key: "age_days", label: "Age", render: v => <AgeBadge value={v} /> },
    ],
  },
  mr_completed: {
    title: "Completed MR Orders", color: COLORS.blue, filename: "Completed_MR",
    columns: [
      { key: "material_request", label: "MR No", render: v => <span className="font-semibold" style={{ color: COLORS.blue }}>{v ?? "—"}</span> },
      { key: "created_date", label: "Created Date" },
      { key: "mr_date", label: "MR Date" },
      { key: "project", label: "Project" },
      { key: "workflow_state", label: "Workflow", render: v => <StatusBadge value={v} /> },
      { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
      { key: "age_days", label: "Age", render: v => <AgeBadge value={v} /> },
    ],
  },
  mr_made_po_pending: {
    title: "MR Made — PO Not Created", color: COLORS.orange, filename: "MR_Made_PO_Not_Made",
    columns: [
      { key: "material_request", label: "Material Request", render: v => <span className="font-semibold" style={{ color: COLORS.blue }}>{v ?? "—"}</span> },
      { key: "mr_status", label: "MR Status", render: v => <StatusBadge value={v} /> },
      { key: "item_code", label: "Item Code", render: v => <span className="font-medium text-gray-700 max-w-[180px] block truncate">{v ?? "—"}</span> },
      { key: "description", label: "Description", render: v => <span className="text-gray-600 max-w-xs block truncate">{v ?? "—"}</span> },
      { key: "mr_qty", label: "MR Qty", render: v => <span className="font-semibold tabular-nums text-gray-800">{v ?? "—"}</span> },
      { key: "po_qty", label: "PO Qty", render: v => <span className="font-semibold tabular-nums" style={{ color: COLORS.blue }}>{v ?? "—"}</span> },
      { key: "pending_qty", label: "Pending", render: v => { const n = parseFloat(String(v ?? "0")); return <span className={cn("font-bold tabular-nums", n > 0 ? "text-red-600" : "text-gray-400")}>{v ?? "—"}</span>; } },
      { key: "mr_creation_date", label: "MR Created" },
      { key: "project", label: "Project" },
    ],
  },
  mr_pending: {
    title: "MR Pending", color: COLORS.purple, filename: "MR_Pending",
    columns: [
      { key: "mr_no", label: "MR No", render: v => <span className="font-semibold" style={{ color: COLORS.blue }}>{v ?? "—"}</span> },
      { key: "creation_date", label: "Created Date" },
      { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
      { key: "project_remarks", label: "Project Remarks", render: v => <span className="text-gray-600 max-w-xs block truncate">{v ?? "—"}</span> },
      { key: "age_days", label: "Age", render: v => <AgeBadge value={v} /> },
    ],
  },
  po_pending: {
    title: "PO Pending", color: COLORS.red, filename: "PO_Pending",
    columns: [
      { key: "po_no", label: "PO No", render: v => <span className="font-semibold" style={{ color: COLORS.blue }}>{v ?? "—"}</span> },
      { key: "created_date", label: "Created Date" },
      { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
      { key: "supplier", label: "Supplier", render: v => <span className="font-medium text-gray-700">{v ?? "—"}</span> },
      { key: "age_days", label: "Age", render: v => <AgeBadge value={v} /> },
    ],
  },
  payment_pending: {
    title: "Payment Pending", color: COLORS.rose, filename: "Payment_Pending",
    columns: [
      { key: "payment", label: "Payment No", render: v => <span className="font-semibold" style={{ color: COLORS.blue }}>{v ?? "—"}</span> },
      { key: "created_date", label: "Created Date" },
      { key: "payment_type", label: "Payment Type" },
      { key: "workflow_state", label: "Workflow State", render: v => <StatusBadge value={v} /> },
      { key: "age_days", label: "Age", render: v => <AgeBadge value={v} /> },
    ],
  },
  po_delay_transit: {
    title: "PO Delay Transit", color: COLORS.amber, filename: "PO_Delay_Transit",
    columns: [
      { key: "po_no", label: "PO No", render: v => <span className="font-semibold" style={{ color: COLORS.blue }}>{v ?? "—"}</span> },
      { key: "delivery_from", label: "Delivery From" },
      { key: "delivery_to", label: "Delivery To" },
      { key: "po_qty/pr_qty/pending", label: "PO / PR / Pending" },
      { key: "delay_days", label: "Delay", render: v => <DelayBadge value={v} /> },
    ],
  },
  po_on_transit: {
    title: "PO On Transit", color: COLORS.teal, filename: "PO_On_Transit",
    columns: [
      { key: "po_no", label: "PO No", render: v => <span className="font-semibold" style={{ color: COLORS.blue }}>{v ?? "—"}</span> },
      { key: "supplier", label: "Supplier", render: v => <span className="font-medium text-gray-700">{v ?? "—"}</span> },
      { key: "expected_delivery_date", label: "Exp. Delivery" },
      { key: "expected_received_date", label: "Exp. Received" },
      { key: "days_remaining", label: "Days Left", render: v => <DaysRemBadge value={v} /> },
    ],
  },
};

const DETAIL_API: Record<DetailId, string> = {
  po_completed: "completed-purchase-orders",
  mr_completed: "completed-mr-orders",
  mr_made_po_pending: "mr-made-po-pending",
  mr_pending: "mr-pending",
  po_pending: "po-pending",
  payment_pending: "payment-pending",
  po_delay_transit: "po-delay-transit",
  po_on_transit: "po-on-transit",
};

// ── Detail Overlay ────────────────────────────────────────────────────────────

function DetailOverlay({ id, project, onClose }: { id: DetailId; project: string; onClose: () => void }) {
  const cfg = DETAIL_CONFIG[id];

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-detail", id, project],
    queryFn: async () => { const r = await fetch(apiUrl(DETAIL_API[id], project)); return r.json(); },
    staleTime: 30_000,
  });

  const rows: Record<string, any>[] = useMemo(() => {
    const msg = (data as any)?.message;
    let raw: Record<string, any>[] = [];
    if (!msg) raw = [];
    else if (Array.isArray(msg)) raw = msg;
    else if (Array.isArray(msg.data)) raw = msg.data;
    return id === "mr_made_po_pending" ? flattenMRMadePO(raw) : raw;
  }, [data, id]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#f3f4f6" }}>
      {/* Header */}
      <div style={{ background: cfg.color }} className="flex items-center justify-between px-5 py-3.5 flex-shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-white text-xs font-semibold transition-colors"
            style={{ background: "rgba(255,255,255,0.2)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.3)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-white font-bold text-base">{cfg.title}</h2>
            <span className="text-white text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
              {isLoading ? "…" : rows.length} records
            </span>
          </div>
        </div>
        <button onClick={() => exportToExcel(rows, cfg.filename)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-white text-xs font-semibold"
          style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
          <Download className="w-3.5 h-3.5" /> Export Excel
        </button>
      </div>

      {/* Full-screen data */}
      <div className="flex-1 overflow-auto p-5">
        <DataTable title={cfg.title} rows={rows} columns={cfg.columns} loading={isLoading} filename={cfg.filename} color={cfg.color} />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PurchaseDashboard() {
  const [project, setProject] = useState(DEFAULT_PROJECT);
  const [detail, setDetail] = useState<DetailId | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setDetail(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const pq = (path: string) => ({
    queryKey: ["purchase", path, project],
    queryFn: async () => { const r = await fetch(apiUrl(path, project)); return r.json(); },
    staleTime: 30_000,
  });

  const counts         = useQuery(pq("counts"));
  const mrMadePoPending = useQuery(pq("mr-made-po-pending"));
  const completedPO    = useQuery(pq("completed-purchase-orders"));
  const poPending      = useQuery(pq("po-pending"));
  const completedMR    = useQuery(pq("completed-mr-orders"));
  const mrPending      = useQuery(pq("mr-pending"));
  const paymentPending = useQuery(pq("payment-pending"));
  const poOnTransit    = useQuery(pq("po-on-transit"));
  const poDelayTransit = useQuery(pq("po-delay-transit"));

  const c = counts.data?.message ?? {};
  const countMap = {
    po_completed:       c.completed_purchase_orders,
    mr_completed:       c.completed_mr_orders,
    mr_made_po_pending: c.mr_made_po_pending,
    mr_pending:         c.pending_mr_orders,
    po_pending:         c.pending_purchase_orders,
    payment_pending:    c.pending_payments,
    po_delay_transit:   c.po_delay_transit,
    po_on_transit:      c.po_on_transit,
  };

  function rows(q: ReturnType<typeof useQuery>, flatten?: boolean): Record<string, any>[] {
    const msg = (q.data as any)?.message;
    let raw: Record<string, any>[] = [];
    if (!msg) raw = [];
    else if (Array.isArray(msg)) raw = msg;
    else if (Array.isArray(msg.data)) raw = msg.data;
    return flatten ? flattenMRMadePO(raw) : raw;
  }

  const refetchAll = () => {
    [counts, mrMadePoPending, completedPO, poPending, completedMR, mrPending, paymentPending, poOnTransit, poDelayTransit]
      .forEach(q => q.refetch());
  };

  const kpis: { id: DetailId; label: string; icon: React.ElementType; color: string }[] = [
    { id: "po_completed",       label: "PO Completed",       icon: CheckCircle,   color: COLORS.green  },
    { id: "mr_completed",       label: "MR Completed",       icon: ClipboardCheck, color: COLORS.blue  },
    { id: "mr_made_po_pending", label: "MR Made PO Pending", icon: FileClock,     color: COLORS.orange },
    { id: "mr_pending",         label: "MR Pending",         icon: FileQuestion,  color: COLORS.purple },
    { id: "po_pending",         label: "PO Pending",         icon: ShoppingCart,  color: COLORS.red    },
    { id: "payment_pending",    label: "Payment Pending",    icon: CreditCard,    color: COLORS.rose   },
    { id: "po_delay_transit",   label: "PO Delay Transit",   icon: AlertTriangle, color: COLORS.amber  },
    { id: "po_on_transit",      label: "PO On Transit",      icon: Truck,         color: COLORS.teal   },
  ];

  const delayCount   = rows(poDelayTransit).length;
  const paymentCount = rows(paymentPending).length;

  return (
    <Layout>
      {detail && <DetailOverlay id={detail} project={project} onClose={() => setDetail(null)} />}

      <div className="min-h-screen p-5 space-y-5" style={{ background: "#f0f2f5" }}>

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Purchase Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Live ERP data · Project: <span className="font-semibold text-gray-600">{project || "All Projects"}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ProjectSelector value={project} onChange={setProject} />
            <button onClick={refetchAll}
              className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm font-semibold">
              <RefreshCw className={cn("w-3.5 h-3.5", counts.isFetching && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {kpis.map(k => (
            <KPICard key={k.id} label={k.label}
              value={counts.isLoading ? "…" : countMap[k.id] ?? "—"}
              icon={k.icon} color={k.color}
              onClick={() => setDetail(k.id)} />
          ))}
        </div>

        {/* ── Alert Banners ── */}
        {(delayCount > 0 || paymentCount > 0) && (
          <div className="flex flex-wrap gap-3">
            {delayCount > 0 && (
              <div onClick={() => setDetail("po_delay_transit")}
                className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 flex-1 min-w-[200px] cursor-pointer transition-colors"
                style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.amber }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: "#92400e" }}>{delayCount} POs delayed in transit — click to view</p>
                  <p className="text-[10px]" style={{ color: "#b45309" }}>Expected delivery date has passed</p>
                </div>
              </div>
            )}
            {paymentCount > 0 && (
              <div onClick={() => setDetail("payment_pending")}
                className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 flex-1 min-w-[200px] cursor-pointer transition-colors"
                style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                <CreditCard className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.rose }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: "#7f1d1d" }}>{paymentCount} payments awaiting approval — click to view</p>
                  <p className="text-[10px]" style={{ color: "#991b1b" }}>Pending payment entries need review</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Row 1: MR Made PO Not Made | MR Pending | PO Pending ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DataTable title="MR Made — PO Not Created"
            rows={rows(mrMadePoPending, true)} loading={mrMadePoPending.isLoading}
            filename="MR_Made_PO_Not_Made" color={COLORS.orange}
            columns={DETAIL_CONFIG.mr_made_po_pending.columns} />
          <DataTable title="MR Pending"
            rows={rows(mrPending)} loading={mrPending.isLoading}
            filename="MR_Pending" color={COLORS.purple}
            columns={DETAIL_CONFIG.mr_pending.columns} />
          <DataTable title="PO Pending"
            rows={rows(poPending)} loading={poPending.isLoading}
            filename="PO_Pending" color={COLORS.red}
            columns={DETAIL_CONFIG.po_pending.columns} />
        </div>

        {/* ── Row 2: Payment Pending | PO Delay Transit | PO On Transit ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DataTable title="Payment Pending"
            rows={rows(paymentPending)} loading={paymentPending.isLoading}
            filename="Payment_Pending" color={COLORS.rose}
            columns={DETAIL_CONFIG.payment_pending.columns} />
          <DataTable title="PO Delay Transit"
            rows={rows(poDelayTransit)} loading={poDelayTransit.isLoading}
            filename="PO_Delay_Transit" color={COLORS.amber}
            columns={DETAIL_CONFIG.po_delay_transit.columns} />
          <DataTable title="PO On Transit"
            rows={rows(poOnTransit)} loading={poOnTransit.isLoading}
            filename="PO_On_Transit" color={COLORS.teal}
            columns={DETAIL_CONFIG.po_on_transit.columns} />
        </div>

        {/* ── Row 3: Completed PO | Completed MR ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DataTable title="Completed Purchase Orders"
            rows={rows(completedPO)} loading={completedPO.isLoading}
            filename="Completed_PO" color={COLORS.green}
            columns={DETAIL_CONFIG.po_completed.columns} />
          <DataTable title="Completed MR Orders"
            rows={rows(completedMR)} loading={completedMR.isLoading}
            filename="Completed_MR" color={COLORS.blue}
            columns={DETAIL_CONFIG.mr_completed.columns} />
        </div>

      </div>
    </Layout>
  );
}
