import { useState, useMemo, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  Package, AlertTriangle, Truck, CircleCheck, MapPinOff,
  RefreshCw, Search, X, Clock, ArrowLeft, MapPin, Calendar,
  ChevronDown, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_PROJECT = "WTT-0528";

const C = {
  teal:   "#48c9b0",
  red:    "#e74c3c",
  amber:  "#f5b041",
  blue:   "#5dade2",
  purple: "#af7ac5",
};

type Section = "po_pending" | "supplier_delay" | "material_delay" | "on_time" | "gprs_pending";
type ColDef  = { key: string; label: string; render?: (val: any, row: Record<string, any>) => React.ReactNode };

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiUrl(path: string, project?: string) {
  const base = `${BASE}/api/logistics-dashboard/${path}`;
  return project?.trim() ? `${base}?project=${encodeURIComponent(project)}` : base;
}

function getRows(q: ReturnType<typeof useQuery>): Record<string, any>[] {
  const msg = (q.data as any)?.message;
  if (Array.isArray(msg)) return msg;
  return [];
}

function parseDelay(v: any): number {
  const n = parseInt(String(v ?? 0));
  return isNaN(n) ? 0 : n;
}

// ── Cell Renderers ────────────────────────────────────────────────────────────

function DelayBadge({ value }: { value: any }) {
  const d = parseDelay(value);
  if (d <= 0) return <span style={{ color: "#9ca3af" }}>—</span>;
  const [bg, col] = d >= 10 ? ["#fef2f2", "#b91c1c"] : d >= 5 ? ["#fffbeb", "#b45309"] : ["#fff7ed", "#ea580c"];
  return (
    <span style={{ background: bg, color: col, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
      <AlertTriangle style={{ width: 10, height: 10 }} />{d}d delay
    </span>
  );
}

function TrackingBadge({ value }: { value: any }) {
  const v = String(value ?? "—").trim();
  if (!v || v === "—") return <span style={{ color: "#9ca3af" }}>—</span>;
  return (
    <span style={{ background: "#f0fdfa", color: "#0f766e", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      <MapPin style={{ width: 10, height: 10 }} />{v}
    </span>
  );
}

function DateCell({ value }: { value: any }) {
  const v = String(value ?? "—").trim();
  if (!v || v === "—") return <span style={{ color: "#9ca3af" }}>—</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#374151", whiteSpace: "nowrap" }}>
      <Calendar style={{ width: 10, height: 10, color: "#9ca3af" }} />{v}
    </span>
  );
}

function PoCell({ value }: { value: any }) {
  return <span style={{ color: C.blue, fontWeight: 600 }}>{value ?? "—"}</span>;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ label, value, icon: Icon, color, onClick }: {
  label: string; value: any; icon: React.ElementType; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      style={{ background: color, border: "none", borderRadius: 10, padding: "12px 14px", cursor: "pointer", textAlign: "left", width: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", transition: "transform 0.12s, box-shadow 0.12s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.22)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", lineHeight: 1.35 }}>{label}</span>
        <Icon style={{ width: 18, height: 18, color: "rgba(255,255,255,0.65)", flexShrink: 0 } as any} />
      </div>
      <div style={{ color: "#fff", fontSize: 28, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {value != null && value !== "" ? value : "—"}
      </div>
    </button>
  );
}

// ── Project Selector ──────────────────────────────────────────────────────────

function ProjectSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data } = useQuery<any>({
    queryKey: ["logistics-projects"],
    queryFn: () => fetch(`${BASE}/api/purchase-dashboard/projects`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const projects: { code: string; label: string }[] = useMemo(() => {
    const all = [{ code: "", label: "All Projects" }, ...(data?.projects ?? [])];
    return search ? all.filter(p => p.label.toLowerCase().includes(search.toLowerCase())) : all;
  }, [data, search]);

  const selected = (data?.projects ?? []).find((p: any) => p.code === value);
  const displayLabel = selected ? selected.label : value || "All Projects";

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, minWidth: 220, cursor: "pointer", fontWeight: 500, color: "#374151" }}>
        <BarChart2 style={{ width: 13, height: 13, color: "#9ca3af", flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayLabel}</span>
        <ChevronDown style={{ width: 12, height: 12, color: "#9ca3af" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.12)", width: 300 }}>
          <div style={{ padding: 8, borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
            <Search style={{ width: 13, height: 13, color: "#9ca3af" }} />
            <input autoFocus style={{ border: "none", outline: "none", fontSize: 13, color: "#374151", flex: 1, background: "transparent" }} placeholder="Search project..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X style={{ width: 12, height: 12, color: "#9ca3af" }} /></button>}
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto", padding: 4 }}>
            {projects.map(p => (
              <button key={p.code}
                style={{ width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", background: p.code === value ? C.blue : "transparent", color: p.code === value ? "#fff" : "#374151", border: "none", display: "block", fontWeight: p.code === value ? 600 : 400 }}
                onClick={() => { onChange(p.code); setOpen(false); setSearch(""); }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel Table ───────────────────────────────────────────────────────────────

function PanelTable({ title, rows, columns, loading, accentColor, onExpand }: {
  title: string; rows: Record<string, any>[]; columns: ColDef[];
  loading?: boolean; accentColor: string; onExpand: () => void;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const setFilter = useCallback((key: string, val: string) => setFilters(p => ({ ...p, [key]: val })), []);

  const filtered = useMemo(() => rows.filter(row =>
    columns.every(col => { const f = filters[col.key]; return !f || String(row[col.key] ?? "").toLowerCase().includes(f.toLowerCase()); })
  ), [rows, filters, columns]);

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "2px solid #f3f4f6", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 4, height: 18, background: accentColor, borderRadius: 2, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{title}</span>
          <span style={{ background: accentColor, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>
            {loading ? "…" : filtered.length}
          </span>
        </div>
        <button onClick={onExpand}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
          View all →
        </button>
      </div>

      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 300 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "7px 10px", textAlign: "center", color: "#9ca3af", fontWeight: 700, fontSize: 10, width: 32 }}>#</th>
              {columns.map(col => (
                <th key={col.key} style={{ padding: "7px 10px", textAlign: "left", color: "#6b7280", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                  {col.label}
                </th>
              ))}
            </tr>
            <tr style={{ background: "#fff", borderBottom: "2px solid #f3f4f6" }}>
              <td style={{ padding: "4px 6px" }} />
              {columns.map(col => (
                <td key={col.key} style={{ padding: "4px 6px" }}>
                  <input
                    style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 5, padding: "3px 7px", fontSize: 11, color: "#374151", background: "#f9fafb", outline: "none", boxSizing: "border-box" }}
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
              <tr><td colSpan={columns.length + 1} style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={columns.length + 1} style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>No records</td></tr>
            ) : filtered.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "7px 10px", textAlign: "center", color: "#9ca3af", fontSize: 11, fontWeight: 600 }}>{i + 1}</td>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: "7px 10px", color: "#374151", verticalAlign: "middle" }}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
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

// ── Detail Overlay ────────────────────────────────────────────────────────────

const SECTION_META: Record<Section, { label: string; color: string; icon: React.ElementType }> = {
  po_pending:      { label: "PO Made — Logistics Entry Pending", color: C.teal,   icon: Package       },
  supplier_delay:  { label: "Supplier Delay",                    color: C.red,    icon: AlertTriangle },
  material_delay:  { label: "Material Delay",                    color: C.amber,  icon: Truck         },
  on_time:         { label: "On-Time Deliveries",                color: C.blue,   icon: CircleCheck   },
  gprs_pending:    { label: "GPRS Tracking Not Entered",         color: C.purple, icon: MapPinOff     },
};

const SECTION_COLS: Record<Section, ColDef[]> = {
  po_pending: [
    { key: "po_no",         label: "PO No",           render: v => <PoCell value={v} /> },
    { key: "supplier",      label: "Supplier" },
    { key: "delivery_date", label: "Delivery Date",   render: v => <DateCell value={v} /> },
    { key: "received_date", label: "Received Date",   render: v => <DateCell value={v} /> },
    { key: "tracking",      label: "Tracking",        render: v => <TrackingBadge value={v} /> },
  ],
  supplier_delay: [
    { key: "supplier",   label: "Supplier Name" },
    { key: "po_no",      label: "PO No",        render: v => <PoCell value={v} /> },
    { key: "delay_days", label: "Delay Days",   render: v => <DelayBadge value={v} /> },
  ],
  material_delay: [
    { key: "description", label: "Description" },
    { key: "po_no",       label: "PO No",      render: v => <PoCell value={v} /> },
    { key: "supplier",    label: "Supplier" },
    { key: "delay_days",  label: "Delay Days", render: v => <DelayBadge value={v} /> },
  ],
  on_time: [
    { key: "po_no",              label: "PO No",             render: v => <PoCell value={v} /> },
    { key: "tracking",           label: "Logistics Tracking",render: v => <TrackingBadge value={v} /> },
    { key: "expected_delivery",  label: "Expected Delivery", render: v => <DateCell value={v} /> },
  ],
  gprs_pending: [
    { key: "po_no",             label: "PO No",              render: v => <PoCell value={v} /> },
    { key: "tracking",          label: "Logistics Tracking", render: v => <TrackingBadge value={v} /> },
    { key: "expected_delivery", label: "Expected Delivery",  render: v => <DateCell value={v} /> },
  ],
};

function DetailOverlay({ section, rows, onClose }: {
  section: Section; rows: Record<string, any>[]; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const meta = SECTION_META[section];
  const cols = SECTION_COLS[section];
  const Icon = meta.icon;

  useEffect(() => {
    setSearch("");
  }, [section]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(row => cols.some(c => String(row[c.key] ?? "").toLowerCase().includes(q)));
  }, [rows, search, cols]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#f0f2f5", display: "flex", flexDirection: "column" }}>
      {/* Colored header */}
      <div style={{ background: meta.color, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 7, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <ArrowLeft style={{ width: 13, height: 13 }} /> Back
          </button>
          <Icon style={{ width: 18, height: 18, color: "rgba(255,255,255,0.85)" } as any} />
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{meta.label}</span>
          <span style={{ background: "rgba(255,255,255,0.25)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 10 }}>
            {filtered.length} records
          </span>
        </div>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search style={{ position: "absolute", left: 9, width: 13, height: 13, color: "rgba(255,255,255,0.6)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ paddingLeft: 28, paddingRight: search ? 28 : 10, height: 32, borderRadius: 7, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 13, outline: "none", width: 200 }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <X style={{ width: 12, height: 12, color: "rgba(255,255,255,0.7)" }} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "9px 12px", textAlign: "center", color: "#9ca3af", fontWeight: 700, fontSize: 10, width: 40 }}>#</th>
                {cols.map(c => (
                  <th key={c.key} style={{ padding: "9px 12px", textAlign: "left", color: "#6b7280", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={cols.length + 1} style={{ padding: "32px", textAlign: "center", color: "#9ca3af" }}>No records found</td></tr>
              ) : filtered.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "9px 12px", textAlign: "center", color: "#9ca3af", fontSize: 11, fontWeight: 600 }}>{i + 1}</td>
                  {cols.map(c => (
                    <td key={c.key} style={{ padding: "9px 12px", color: "#374151", verticalAlign: "middle" }}>
                      {c.render ? c.render(row[c.key], row) : (row[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function LogisticsDashboardContent() {
  const [project, setProject]         = useState(DEFAULT_PROJECT);
  const [detailSection, setDetail]    = useState<Section | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setDetail(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const pq = useCallback((path: string) => ({
    queryKey: ["logistics", path, project],
    queryFn: () => fetch(apiUrl(path, project)).then(r => r.json()),
    staleTime: 60_000,
  }), [project]);

  const qCounts  = useQuery<any>(pq("counts"));
  const qPoPend  = useQuery<any>(pq("po-pending"));
  const qSupDel  = useQuery<any>(pq("supplier-delay"));
  const qMatDel  = useQuery<any>(pq("material-delay"));
  const qOnTime  = useQuery<any>(pq("on-time"));
  const qGprs    = useQuery<any>(pq("gprs-pending"));

  const c = qCounts.data?.message ?? {};
  const counts = {
    po_pending:     c.po_pending     ?? 0,
    supplier_delay: c.supplier_delay ?? 0,
    material_delay: c.material_delay ?? 0,
    on_time:        c.on_time        ?? 0,
    gprs_pending:   c.gprs_pending   ?? 0,
  };

  const rowsBySection: Record<Section, Record<string, any>[]> = {
    po_pending:     getRows(qPoPend),
    supplier_delay: getRows(qSupDel),
    material_delay: getRows(qMatDel),
    on_time:        getRows(qOnTime),
    gprs_pending:   getRows(qGprs),
  };

  const refetchAll = () => [qCounts, qPoPend, qSupDel, qMatDel, qOnTime, qGprs].forEach(q => q.refetch());

  const isSample = (qPoPend.data as any)?._source === "sample";

  const kpis: { key: Section; label: string; icon: React.ElementType; color: string }[] = [
    { key: "po_pending",     label: "PO Logistics Entry Pending",  icon: Package,       color: C.teal   },
    { key: "supplier_delay", label: "Supplier Delay",              icon: AlertTriangle, color: C.red    },
    { key: "material_delay", label: "Material Delay",              icon: Truck,         color: C.amber  },
    { key: "on_time",        label: "On-Time Deliveries",          icon: CircleCheck,   color: C.blue   },
    { key: "gprs_pending",   label: "GPRS Tracking Not Entered",   icon: MapPinOff,     color: C.purple },
  ];

  return (
    <>
      {detailSection && (
        <DetailOverlay
          section={detailSection}
          rows={rowsBySection[detailSection]}
          onClose={() => setDetail(null)}
        />
      )}

      <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#111827", letterSpacing: "-0.02em" }}>Logistics Dashboard</h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>
              Live tracking · <span style={{ fontWeight: 600, color: "#6b7280" }}>{project || "All Projects"}</span>
              {isSample && <span style={{ marginLeft: 8, color: "#d97706", fontWeight: 600 }}>· Sample Data</span>}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <ProjectSelector value={project} onChange={setProject} />
            <button onClick={refetchAll}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
              <RefreshCw className={cn("w-3.5 h-3.5", qCounts.isFetching && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {kpis.map(k => (
            <KPICard key={k.key}
              label={k.label}
              value={qCounts.isLoading ? "…" : counts[k.key]}
              icon={k.icon}
              color={k.color}
              onClick={() => setDetail(k.key)}
            />
          ))}
        </div>

        {/* Row 1: 2 panels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <PanelTable
            title="PO Made — Logistics Entry Pending"
            rows={rowsBySection.po_pending}
            columns={SECTION_COLS.po_pending}
            loading={qPoPend.isLoading}
            accentColor={C.teal}
            onExpand={() => setDetail("po_pending")}
          />
          <PanelTable
            title="Supplier Delay"
            rows={rowsBySection.supplier_delay}
            columns={SECTION_COLS.supplier_delay}
            loading={qSupDel.isLoading}
            accentColor={C.red}
            onExpand={() => setDetail("supplier_delay")}
          />
        </div>

        {/* Row 2: 2 panels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <PanelTable
            title="Material Delay"
            rows={rowsBySection.material_delay}
            columns={SECTION_COLS.material_delay}
            loading={qMatDel.isLoading}
            accentColor={C.amber}
            onExpand={() => setDetail("material_delay")}
          />
          <PanelTable
            title="On-Time Deliveries"
            rows={rowsBySection.on_time}
            columns={SECTION_COLS.on_time}
            loading={qOnTime.isLoading}
            accentColor={C.blue}
            onExpand={() => setDetail("on_time")}
          />
        </div>

        {/* Row 3: full width */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <PanelTable
            title="GPRS Tracking Not Entered"
            rows={rowsBySection.gprs_pending}
            columns={SECTION_COLS.gprs_pending}
            loading={qGprs.isLoading}
            accentColor={C.purple}
            onExpand={() => setDetail("gprs_pending")}
          />
        </div>

      </div>
    </>
  );
}

export default function LogisticsDashboard() { return <Layout><LogisticsDashboardContent /></Layout>; }
