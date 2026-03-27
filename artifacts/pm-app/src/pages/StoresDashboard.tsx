import { useState, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  DoorOpen, FileText, Receipt, Truck, ClipboardList,
  RefreshCw, Download, ChevronDown, Search, X, Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

// ── Helpers ──────────────────────────────────────────────────────────────────

function apiUrl(path: string, project?: string) {
  const base = `/api/stores-dashboard/${path}`;
  return project && project.trim() ? `${base}?project=${encodeURIComponent(project)}` : base;
}

function exportToExcel(rows: Record<string, any>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
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
        className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-w-[200px] hover:bg-white/10 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-white/40 text-xs uppercase tracking-wider mr-1">Project</span>
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
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch("")}><X className="w-3 h-3 text-white/40" /></button>}
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {projects.map(p => (
              <button
                key={p.code}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  p.code === value ? "bg-indigo-600 text-white" : "text-white/70 hover:bg-white/5"
                )}
                onClick={() => { onChange(p.code); setOpen(false); setSearch(""); }}
              >
                {p.label}
              </button>
            ))}
            {projects.length === 0 && <p className="text-center py-4 text-white/30 text-sm">No results</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
  label, value, icon: Icon, color,
}: {
  label: string; value: number | string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between w-full">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider leading-tight">{label}</span>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <span className="text-3xl font-bold text-white">{value ?? "—"}</span>
    </div>
  );
}

// ── Filterable Table ──────────────────────────────────────────────────────────

function FilterableTable({
  title, rows, columns, loading, filename,
}: {
  title: string;
  rows: Record<string, any>[];
  columns: { key: string; label: string }[];
  loading?: boolean;
  filename: string;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    return rows.filter(row =>
      columns.every(col => {
        const f = filters[col.key];
        if (!f) return true;
        const v = String(row[col.key] ?? "").toLowerCase();
        return v.includes(f.toLowerCase());
      })
    );
  }, [rows, filters, columns]);

  const setFilter = useCallback((key: string, val: string) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  }, []);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-sm">{title}</span>
          <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full">{filtered.length}</span>
        </div>
        <button
          onClick={() => exportToExcel(filtered, filename)}
          className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <Download className="w-3 h-3" />
          Export
        </button>
      </div>
      <div className="overflow-auto max-h-72">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#12122a]">
              {columns.map(col => (
                <th key={col.key} className="text-left px-3 py-2 text-white/40 font-semibold uppercase tracking-wider whitespace-nowrap border-b border-white/10">
                  {col.label}
                </th>
              ))}
            </tr>
            <tr className="bg-[#0f0f1f]">
              {columns.map(col => (
                <td key={col.key} className="px-2 py-1 border-b border-white/5">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white/70 placeholder-white/20 outline-none focus:border-indigo-500/50 text-xs"
                    placeholder="Filter..."
                    value={filters[col.key] ?? ""}
                    onChange={e => setFilter(col.key, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="text-center py-8 text-white/30">Loading data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center py-8 text-white/20">No records</td></tr>
            ) : filtered.map((row, i) => (
              <tr key={i} className={cn("border-b border-white/5 hover:bg-white/5 transition-colors", i % 2 === 0 ? "" : "bg-white/[0.02]")}>
                {columns.map(col => (
                  <td key={col.key} className="px-3 py-2 text-white/70 whitespace-nowrap">
                    {row[col.key] != null ? String(row[col.key]) : "—"}
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function StoresDashboard() {
  const [project, setProject] = useState("");

  const pq = (path: string) => ({
    queryKey: ["stores", path, project],
    queryFn: async () => {
      const r = await fetch(apiUrl(path, project));
      return r.json();
    },
    staleTime: 30_000,
  });

  const counts = useQuery(pq("counts"));
  const gateEntry = useQuery(pq("gate-entry-pr-pending"));
  const dcGateout = useQuery(pq("dc-gateout-pending"));
  const prBill = useQuery(pq("pr-bill-pending"));
  const stockSummary = useQuery(pq("stock-summary"));
  const directDelivery = useQuery(pq("direct-site-delivery"));
  const deliveryNote = useQuery(pq("delivery-note-pending"));

  const c = counts.data?.message ?? {};

  const refetchAll = () => {
    [counts, gateEntry, dcGateout, prBill, stockSummary, directDelivery, deliveryNote]
      .forEach(q => q.refetch());
  };

  function rows(q: ReturnType<typeof useQuery>): Record<string, any>[] {
    const msg = (q.data as any)?.message;
    if (Array.isArray(msg)) return msg;
    return [];
  }

  const kpis = [
    { label: "Gate Entry PR Pending", value: c.gate_entry_made_pr_pending, icon: DoorOpen, color: "bg-teal-600/20 text-teal-400" },
    { label: "DC Gate Out Pending", value: c.dc_made_to_bill_pending, icon: FileText, color: "bg-blue-600/20 text-blue-400" },
    { label: "PR Made to Bill Pending", value: c.pr_made_to_bill_pending, icon: Receipt, color: "bg-amber-600/20 text-amber-400" },
    { label: "Direct Site Delivery", value: c.direct_site_delivery, icon: Truck, color: "bg-rose-600/20 text-rose-400" },
    { label: "Delivery Note Pending", value: c.direct_note_pending, icon: ClipboardList, color: "bg-orange-600/20 text-orange-400" },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-[#0d0d1f] p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Stores Dashboard</h1>
            <p className="text-white/40 text-sm mt-1">Live stores & inventory tracking from ERP</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ProjectSelector value={project} onChange={setProject} />
            <button
              onClick={refetchAll}
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", counts.isFetching && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map((k, i) => (
            <KPICard key={i} label={k.label} value={k.value ?? "—"} icon={k.icon} color={k.color} />
          ))}
        </div>

        {/* Row 1: Gate Entry | DC Gate Out | PR Bill */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <FilterableTable
            title="Gate Entry PR Pending"
            rows={rows(gateEntry)}
            loading={gateEntry.isLoading}
            filename="Gate_Entry_PR_Pending"
            columns={[
              { key: "party", label: "Party" },
              { key: "name", label: "Gate Entry No" },
              { key: "posting_date", label: "Date" },
              { key: "age", label: "Age" },
            ]}
          />
          <FilterableTable
            title="DC Made Gate Out Pending"
            rows={rows(dcGateout)}
            loading={dcGateout.isLoading}
            filename="DC_Gate_Out_Pending"
            columns={[
              { key: "party", label: "Party" },
              { key: "name", label: "DC No" },
              { key: "posting_date", label: "Date" },
              { key: "age", label: "Age" },
            ]}
          />
          <FilterableTable
            title="PR Made to Bill Pending"
            rows={rows(prBill)}
            loading={prBill.isLoading}
            filename="PR_Bill_Pending"
            columns={[
              { key: "party", label: "Party" },
              { key: "name", label: "PR No" },
              { key: "posting_date", label: "Date" },
              { key: "age", label: "Age" },
              { key: "reason_for_pending", label: "Reason" },
            ]}
          />
        </div>

        {/* Row 2: Stock Summary | Direct Delivery | Delivery Note */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <FilterableTable
            title="Stock Summary"
            rows={rows(stockSummary)}
            loading={stockSummary.isLoading}
            filename="Stock_Summary"
            columns={[
              { key: "warehouse", label: "Warehouse Name" },
              { key: "qty", label: "Qty" },
              { key: "amount", label: "Amount" },
            ]}
          />
          <FilterableTable
            title="Direct Site Delivery"
            rows={rows(directDelivery)}
            loading={directDelivery.isLoading}
            filename="Direct_Site_Delivery"
            columns={[
              { key: "party", label: "Party" },
              { key: "name", label: "PR No" },
              { key: "posting_date", label: "Date" },
            ]}
          />
          <FilterableTable
            title="Delivery Note Pending"
            rows={rows(deliveryNote)}
            loading={deliveryNote.isLoading}
            filename="Delivery_Note_Pending"
            columns={[
              { key: "party", label: "Party" },
              { key: "name", label: "DC No" },
              { key: "posting_date", label: "Date" },
              { key: "age", label: "Age" },
            ]}
          />
        </div>
      </div>
    </Layout>
  );
}
