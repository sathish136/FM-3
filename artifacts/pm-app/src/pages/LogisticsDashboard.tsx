import { useState, useMemo, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  Package, AlertTriangle, Truck, CircleCheck, MapPinOff,
  RefreshCw, Download, Search, X, Clock, ArrowLeft, MapPin,
  ChevronDown, Calendar, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_PROJECT = "WTT-0528";

const C = {
  teal:   "#48c9b0",
  red:    "#e74c3c",
  amber:  "#f5b041",
  blue:   "#5dade2",
  purple: "#af7ac5",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = "po_pending" | "supplier_delay" | "material_delay" | "on_time" | "gprs_pending";

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiUrl(path: string, project?: string) {
  const base = `${BASE}/api/logistics-dashboard/${path}`;
  return project?.trim() ? `${base}?project=${encodeURIComponent(project)}` : base;
}

function getRows(q: ReturnType<typeof useQuery>): Record<string, any>[] {
  const msg = (q.data as any)?.message;
  if (!msg) return [];
  if (Array.isArray(msg)) return msg;
  return [];
}

function exportToExcel(rows: Record<string, any>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function parseDelay(v: any): number {
  const n = parseInt(String(v ?? 0));
  return isNaN(n) ? 0 : n;
}

// ── Badge Components ──────────────────────────────────────────────────────────

function DelayBadge({ value }: { value: any }) {
  const d = parseDelay(value);
  if (d <= 0) return <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>;
  const [bg, col] = d >= 10 ? ["#fef2f2", "#b91c1c"] : d >= 5 ? ["#fffbeb", "#b45309"] : ["#fff7ed", "#ea580c"];
  return (
    <span style={{ background: bg, color: col, padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
      <AlertTriangle style={{ width: 10, height: 10 }} />{d}d delay
    </span>
  );
}

function TrackingBadge({ value }: { value: any }) {
  const v = String(value ?? "—");
  if (v === "—" || !v.trim()) {
    return <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>;
  }
  return (
    <span style={{ background: "#f0fdfa", color: "#0f766e", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      <MapPin style={{ width: 10, height: 10 }} />{v}
    </span>
  );
}

function DateBadge({ value }: { value: any }) {
  const v = String(value ?? "—");
  if (v === "—" || !v.trim()) return <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#374151", whiteSpace: "nowrap" }}>
      <Calendar style={{ width: 10, height: 10, color: "#6b7280" }} />{v}
    </span>
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

  const projects: { code: string; label: string }[] = useMemo(() => data?.projects ?? [], [data]);
  const filtered = useMemo(() => projects.filter(p => p.label.toLowerCase().includes(search.toLowerCase())), [projects, search]);
  const selected = projects.find(p => p.code === value);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#e5e7eb", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
      >
        <BarChart2 style={{ width: 13, height: 13, opacity: 0.7 }} />
        {selected?.label ?? value}
        <ChevronDown style={{ width: 12, height: 12, opacity: 0.7 }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, background: "#1e293b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 280, overflow: "hidden" }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 6 }}>
            <Search style={{ width: 13, height: 13, color: "#6b7280" }} />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search project..."
              style={{ background: "transparent", border: "none", outline: "none", color: "#e5e7eb", fontSize: 13, width: "100%" }}
            />
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "12px 14px", color: "#6b7280", fontSize: 13 }}>No projects found</div>
            )}
            {filtered.map(p => (
              <button
                key={p.code}
                onClick={() => { onChange(p.code); setOpen(false); setSearch(""); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", background: p.code === value ? "rgba(99,102,241,0.15)" : "transparent", border: "none", color: p.code === value ? "#818cf8" : "#d1d5db", fontSize: 13, cursor: "pointer" }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, color, icon: Icon, active, onClick,
}: {
  label: string; value: number; color: string; icon: React.ElementType; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "1 1 160px",
        background: active
          ? `linear-gradient(135deg, ${color}cc, ${color}aa)`
          : `linear-gradient(135deg, ${color}22, ${color}15)`,
        border: `2px solid ${active ? color : color + "44"}`,
        borderRadius: 14,
        padding: "18px 20px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.18s",
        boxShadow: active ? `0 4px 24px ${color}44` : "none",
        transform: active ? "translateY(-2px)" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#fff" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.4 }}>
          {label}
        </span>
        <Icon style={{ width: 22, height: 22, color: active ? "#fff" : color, opacity: 0.85, flexShrink: 0 }} />
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color: active ? "#fff" : color, lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </div>
    </button>
  );
}

// ── Column filter hook ────────────────────────────────────────────────────────

function useFiltered(rows: Record<string, any>[], cols: string[]) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const filtered = useMemo(() => rows.filter(row =>
    cols.every(col => {
      const f = (filters[col] ?? "").toLowerCase();
      if (!f) return true;
      return String(row[col] ?? "").toLowerCase().includes(f);
    })
  ), [rows, filters, cols]);
  return { filtered, filters, setFilters };
}

// ── Table head with filter row ────────────────────────────────────────────────

function FilterThead({ columns, filters, setFilters }: {
  columns: { key: string; label: string; w?: string }[];
  filters: Record<string, string>;
  setFilters: (f: Record<string, string>) => void;
}) {
  return (
    <thead>
      <tr>
        <th style={{ width: 44 }}>#</th>
        {columns.map(c => (
          <th key={c.key} style={c.w ? { width: c.w } : {}}>{c.label}</th>
        ))}
      </tr>
      <tr className="filter-row">
        <td />
        {columns.map(c => (
          <td key={c.key}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search style={{ position: "absolute", left: 6, width: 11, height: 11, color: "#6b7280", pointerEvents: "none" }} />
              <input
                value={filters[c.key] ?? ""}
                onChange={e => setFilters({ ...filters, [c.key]: e.target.value })}
                placeholder="Filter..."
                style={{ paddingLeft: 22, paddingRight: filters[c.key] ? 22 : 6 }}
              />
              {filters[c.key] && (
                <button onClick={() => setFilters({ ...filters, [c.key]: "" })} style={{ position: "absolute", right: 4, background: "none", border: "none", cursor: "pointer", padding: 0, color: "#6b7280" }}>
                  <X style={{ width: 10, height: 10 }} />
                </button>
              )}
            </div>
          </td>
        ))}
      </tr>
    </thead>
  );
}

// ── Panels ────────────────────────────────────────────────────────────────────

function PoPendingPanel({ rows, onDetailOpen }: { rows: Record<string, any>[]; onDetailOpen: (section: Section) => void }) {
  const cols = [
    { key: "po_no", label: "PO No." },
    { key: "supplier", label: "Supplier" },
    { key: "delivery_date", label: "Delivery Date" },
    { key: "received_date", label: "Received Date" },
    { key: "tracking", label: "Tracking" },
  ];
  const { filtered, filters, setFilters } = useFiltered(rows, cols.map(c => c.key));

  return (
    <div className="panel">
      <div className="panel-header" style={{ borderLeftColor: C.teal }}>
        <span className="panel-title">PO Made — Logistics Entry Pending</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className="badge" style={{ background: C.teal }}>{rows.length}</span>
          <button className="btn-icon" title="Export" onClick={() => exportToExcel(rows, "po-logistics-pending")}><Download style={{ width: 13, height: 13 }} /></button>
          <button className="btn-icon btn-expand" title="View all" onClick={() => onDetailOpen("po_pending")}><ArrowLeft style={{ width: 12, height: 12, transform: "rotate(180deg)" }} /></button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <FilterThead columns={cols} filters={filters} setFilters={setFilters} />
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="empty">No records</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={i}>
                <td style={{ color: "#6b7280", fontSize: 11 }}>{i + 1}</td>
                <td style={{ fontWeight: 600, color: "#e5e7eb" }}>{r.po_no ?? "—"}</td>
                <td>{r.supplier ?? "—"}</td>
                <td><DateBadge value={r.delivery_date} /></td>
                <td><DateBadge value={r.received_date} /></td>
                <td><TrackingBadge value={r.tracking} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SupplierDelayPanel({ rows, onDetailOpen }: { rows: Record<string, any>[]; onDetailOpen: (section: Section) => void }) {
  const cols = [
    { key: "supplier", label: "Supplier Name" },
    { key: "po_no", label: "PO No." },
    { key: "delay_days", label: "Delay Days" },
  ];
  const { filtered, filters, setFilters } = useFiltered(rows, cols.map(c => c.key));

  return (
    <div className="panel">
      <div className="panel-header" style={{ borderLeftColor: C.red }}>
        <span className="panel-title">Supplier Delay</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className="badge" style={{ background: C.red }}>{rows.length}</span>
          <button className="btn-icon" title="Export" onClick={() => exportToExcel(rows, "supplier-delay")}><Download style={{ width: 13, height: 13 }} /></button>
          <button className="btn-icon btn-expand" title="View all" onClick={() => onDetailOpen("supplier_delay")}><ArrowLeft style={{ width: 12, height: 12, transform: "rotate(180deg)" }} /></button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <FilterThead columns={cols} filters={filters} setFilters={setFilters} />
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="empty">No records</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={i}>
                <td style={{ color: "#6b7280", fontSize: 11 }}>{i + 1}</td>
                <td style={{ fontWeight: 600, color: "#e5e7eb" }}>{r.supplier ?? "—"}</td>
                <td>{r.po_no ?? "—"}</td>
                <td><DelayBadge value={r.delay_days} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MaterialDelayPanel({ rows, onDetailOpen }: { rows: Record<string, any>[]; onDetailOpen: (section: Section) => void }) {
  const cols = [
    { key: "description", label: "Description" },
    { key: "po_no", label: "PO No." },
    { key: "supplier", label: "Supplier" },
    { key: "delay_days", label: "Delay Days" },
  ];
  const { filtered, filters, setFilters } = useFiltered(rows, cols.map(c => c.key));

  return (
    <div className="panel">
      <div className="panel-header" style={{ borderLeftColor: C.amber }}>
        <span className="panel-title">Material Delay</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className="badge" style={{ background: C.amber }}>{rows.length}</span>
          <button className="btn-icon" title="Export" onClick={() => exportToExcel(rows, "material-delay")}><Download style={{ width: 13, height: 13 }} /></button>
          <button className="btn-icon btn-expand" title="View all" onClick={() => onDetailOpen("material_delay")}><ArrowLeft style={{ width: 12, height: 12, transform: "rotate(180deg)" }} /></button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <FilterThead columns={cols} filters={filters} setFilters={setFilters} />
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="empty">No records</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={i}>
                <td style={{ color: "#6b7280", fontSize: 11 }}>{i + 1}</td>
                <td style={{ maxWidth: 180 }}>{r.description ?? "—"}</td>
                <td style={{ fontWeight: 600, color: "#e5e7eb" }}>{r.po_no ?? "—"}</td>
                <td>{r.supplier ?? "—"}</td>
                <td><DelayBadge value={r.delay_days} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OnTimePanel({ rows, onDetailOpen }: { rows: Record<string, any>[]; onDetailOpen: (section: Section) => void }) {
  const cols = [
    { key: "po_no", label: "PO No." },
    { key: "tracking", label: "Logistics Tracking" },
    { key: "expected_delivery", label: "Expected Delivery" },
  ];
  const { filtered, filters, setFilters } = useFiltered(rows, cols.map(c => c.key));

  return (
    <div className="panel">
      <div className="panel-header" style={{ borderLeftColor: C.blue }}>
        <span className="panel-title">On-Time Deliveries</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className="badge" style={{ background: C.blue }}>{rows.length}</span>
          <button className="btn-icon" title="Export" onClick={() => exportToExcel(rows, "on-time-deliveries")}><Download style={{ width: 13, height: 13 }} /></button>
          <button className="btn-icon btn-expand" title="View all" onClick={() => onDetailOpen("on_time")}><ArrowLeft style={{ width: 12, height: 12, transform: "rotate(180deg)" }} /></button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <FilterThead columns={cols} filters={filters} setFilters={setFilters} />
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="empty">No records</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={i}>
                <td style={{ color: "#6b7280", fontSize: 11 }}>{i + 1}</td>
                <td style={{ fontWeight: 600, color: "#e5e7eb" }}>{r.po_no ?? "—"}</td>
                <td><TrackingBadge value={r.tracking} /></td>
                <td><DateBadge value={r.expected_delivery} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GprsPendingPanel({ rows, onDetailOpen }: { rows: Record<string, any>[]; onDetailOpen: (section: Section) => void }) {
  const cols = [
    { key: "po_no", label: "PO No." },
    { key: "tracking", label: "Logistics Tracking" },
    { key: "expected_delivery", label: "Expected Delivery" },
  ];
  const { filtered, filters, setFilters } = useFiltered(rows, cols.map(c => c.key));

  return (
    <div className="panel">
      <div className="panel-header" style={{ borderLeftColor: C.purple }}>
        <span className="panel-title">GPRS Tracking Not Entered</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className="badge" style={{ background: C.purple }}>{rows.length}</span>
          <button className="btn-icon" title="Export" onClick={() => exportToExcel(rows, "gprs-pending")}><Download style={{ width: 13, height: 13 }} /></button>
          <button className="btn-icon btn-expand" title="View all" onClick={() => onDetailOpen("gprs_pending")}><ArrowLeft style={{ width: 12, height: 12, transform: "rotate(180deg)" }} /></button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <FilterThead columns={cols} filters={filters} setFilters={setFilters} />
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="empty">No records</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={i}>
                <td style={{ color: "#6b7280", fontSize: 11 }}>{i + 1}</td>
                <td style={{ fontWeight: 600, color: "#e5e7eb" }}>{r.po_no ?? "—"}</td>
                <td><TrackingBadge value={r.tracking} /></td>
                <td><DateBadge value={r.expected_delivery} /></td>
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
  po_pending:      { label: "PO Made — Logistics Entry Pending", color: C.teal,   icon: Package    },
  supplier_delay:  { label: "Supplier Delay",                    color: C.red,    icon: AlertTriangle },
  material_delay:  { label: "Material Delay",                    color: C.amber,  icon: Truck      },
  on_time:         { label: "On-Time Deliveries",                color: C.blue,   icon: CircleCheck },
  gprs_pending:    { label: "GPRS Tracking Not Entered",         color: C.purple, icon: MapPinOff  },
};

const SECTION_COLS: Record<Section, { key: string; label: string }[]> = {
  po_pending: [
    { key: "po_no", label: "PO No." },
    { key: "supplier", label: "Supplier" },
    { key: "delivery_date", label: "Delivery Date" },
    { key: "received_date", label: "Received Date" },
    { key: "tracking", label: "Tracking" },
  ],
  supplier_delay: [
    { key: "supplier", label: "Supplier Name" },
    { key: "po_no", label: "PO No." },
    { key: "delay_days", label: "Delay Days" },
  ],
  material_delay: [
    { key: "description", label: "Description" },
    { key: "po_no", label: "PO No." },
    { key: "supplier", label: "Supplier" },
    { key: "delay_days", label: "Delay Days" },
  ],
  on_time: [
    { key: "po_no", label: "PO No." },
    { key: "tracking", label: "Logistics Tracking" },
    { key: "expected_delivery", label: "Expected Delivery" },
  ],
  gprs_pending: [
    { key: "po_no", label: "PO No." },
    { key: "tracking", label: "Logistics Tracking" },
    { key: "expected_delivery", label: "Expected Delivery" },
  ],
};

function DetailOverlay({
  section, rows, onClose,
}: { section: Section | null; rows: Record<string, any>[]; onClose: () => void }) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => { setSearch(""); }, [section]);

  if (!section) return null;

  const meta = SECTION_META[section];
  const cols = SECTION_COLS[section];
  const Icon = meta.icon;

  const filtered = rows.filter(row =>
    !search || cols.some(c => String(row[c.key] ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  function renderCell(key: string, value: any) {
    if (key === "delay_days") return <DelayBadge value={value} />;
    if (key === "tracking") return <TrackingBadge value={value} />;
    if (key === "delivery_date" || key === "received_date" || key === "expected_delivery") return <DateBadge value={value} />;
    if (key === "po_no") return <span style={{ fontWeight: 600, color: "#e5e7eb" }}>{value ?? "—"}</span>;
    return <span>{value ?? "—"}</span>;
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "#0f172a",
      display: "flex", flexDirection: "column",
      animation: "slideUp 0.2s ease",
    }}>
      <div style={{ height: 4, background: meta.color, flexShrink: 0 }} />

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={onClose}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#9ca3af", fontSize: 13, cursor: "pointer" }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Back to Dashboard
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.color + "22", border: `1.5px solid ${meta.color}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon style={{ width: 18, height: 18, color: meta.color }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{meta.label}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{filtered.length} records</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search style={{ position: "absolute", left: 10, width: 13, height: 13, color: "#6b7280", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search all columns..."
              style={{ paddingLeft: 30, paddingRight: search ? 28 : 10, height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#e5e7eb", fontSize: 13, outline: "none", width: 220 }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", padding: 0, color: "#6b7280" }}>
                <X style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>
          <button
            onClick={() => exportToExcel(rows, `logistics-${section}`)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#9ca3af", fontSize: 13, cursor: "pointer" }}
          >
            <Download style={{ width: 13, height: 13 }} />
            Export
          </button>
          <button
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9ca3af" }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        <div className="table-wrap" style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <table style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                {cols.map(c => <th key={c.key}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={cols.length + 1} className="empty">No records found</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={i}>
                  <td style={{ color: "#475569", fontSize: 11, fontWeight: 600 }}>{i + 1}</td>
                  {cols.map(c => <td key={c.key}>{renderCell(c.key, r[c.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Clock ─────────────────────────────────────────────────────────────────────

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#94a3b8", fontSize: 12 }}>
      <Clock style={{ width: 12, height: 12 }} />
      {now.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LogisticsDashboard() {
  const [project, setProject] = useState(DEFAULT_PROJECT);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [detailSection, setDetailSection] = useState<Section | null>(null);

  const qOpts = useCallback((key: string) => ({
    queryKey: ["logistics", key, project],
    queryFn: () => fetch(apiUrl(key, project)).then(r => r.json()),
    staleTime: 60 * 1000,
  }), [project]);

  const qCounts  = useQuery<any>(qOpts("counts"));
  const qPoPend  = useQuery<any>(qOpts("po-pending"));
  const qSupDel  = useQuery<any>(qOpts("supplier-delay"));
  const qMatDel  = useQuery<any>(qOpts("material-delay"));
  const qOnTime  = useQuery<any>(qOpts("on-time"));
  const qGprs    = useQuery<any>(qOpts("gprs-pending"));

  const counts = useMemo(() => {
    const m = (qCounts.data as any)?.message ?? {};
    return {
      po_pending:     m.po_pending     ?? 0,
      supplier_delay: m.supplier_delay ?? 0,
      material_delay: m.material_delay ?? 0,
      on_time:        m.on_time        ?? 0,
      gprs_pending:   m.gprs_pending   ?? 0,
    };
  }, [qCounts.data]);

  const rowsBySection: Record<Section, Record<string, any>[]> = useMemo(() => ({
    po_pending:     getRows(qPoPend),
    supplier_delay: getRows(qSupDel),
    material_delay: getRows(qMatDel),
    on_time:        getRows(qOnTime),
    gprs_pending:   getRows(qGprs),
  }), [qPoPend, qSupDel, qMatDel, qOnTime, qGprs]);

  const isLoading = qPoPend.isLoading || qSupDel.isLoading || qMatDel.isLoading || qOnTime.isLoading || qGprs.isLoading;

  function refreshAll() {
    qCounts.refetch();
    qPoPend.refetch();
    qSupDel.refetch();
    qMatDel.refetch();
    qOnTime.refetch();
    qGprs.refetch();
  }

  function handleKpiClick(s: Section) {
    setActiveSection(prev => prev === s ? null : s);
  }

  function openDetail(s: Section) {
    setDetailSection(s);
  }

  const kpis: { key: Section; label: string; color: string; icon: React.ElementType }[] = [
    { key: "po_pending",     label: "PO Made — Logistics Entry Pending", color: C.teal,   icon: Package       },
    { key: "supplier_delay", label: "Supplier Delay",                    color: C.red,    icon: AlertTriangle },
    { key: "material_delay", label: "Material Delay",                    color: C.amber,  icon: Truck         },
    { key: "on_time",        label: "On-Time Deliveries",                color: C.blue,   icon: CircleCheck   },
    { key: "gprs_pending",   label: "GPRS Tracking Not Entered",         color: C.purple, icon: MapPinOff     },
  ];

  return (
    <Layout>
      <style>{`
        .logistics-page { display:flex; flex-direction:column; gap:0; height:100%; overflow:hidden; }

        .logistics-header {
          display:flex; align-items:center; justify-content:space-between;
          padding:14px 22px;
          border-bottom:1px solid rgba(255,255,255,0.07);
          background:rgba(255,255,255,0.015);
          flex-shrink:0;
        }
        .logistics-header-title { font-size:18px; font-weight:800; color:#f1f5f9; letter-spacing:-0.02em; }
        .logistics-header-sub { font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; margin-top:1px; }

        .kpi-strip {
          display:flex; gap:12px; padding:16px 22px;
          background:rgba(255,255,255,0.01);
          border-bottom:1px solid rgba(255,255,255,0.07);
          flex-shrink:0; overflow-x:auto;
        }

        .logistics-body { flex:1; overflow-y:auto; padding:16px 22px; display:flex; flex-direction:column; gap:16px; }

        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .grid-1 { display:grid; grid-template-columns:1fr; gap:16px; }

        .panel {
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:14px;
          overflow:hidden;
          display:flex; flex-direction:column;
        }
        .panel-header {
          display:flex; align-items:center; justify-content:space-between;
          padding:12px 16px;
          border-bottom:1px solid rgba(255,255,255,0.06);
          border-left:3px solid transparent;
          background:rgba(255,255,255,0.02);
        }
        .panel-title { font-size:13px; font-weight:700; color:#e2e8f0; }
        .badge {
          padding:2px 9px; border-radius:12px; font-size:11px; font-weight:800;
          color:#fff; min-width:26px; text-align:center;
        }

        .table-wrap { overflow-x:auto; flex:1; }
        table { width:100%; border-collapse:collapse; font-size:12px; }
        th {
          padding:8px 10px; text-align:left; font-size:10.5px; font-weight:700;
          color:#64748b; text-transform:uppercase; letter-spacing:0.07em;
          border-bottom:1px solid rgba(255,255,255,0.07);
          background:rgba(255,255,255,0.02); white-space:nowrap;
        }
        td {
          padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.04);
          color:#cbd5e1; vertical-align:middle;
        }
        tr:last-child td { border-bottom:none; }
        tr:hover td { background:rgba(255,255,255,0.025); }

        .filter-row td { padding:4px 6px; background:rgba(0,0,0,0.15); }
        .filter-row input {
          width:100%; padding:4px 8px; border-radius:6px;
          border:1px solid rgba(255,255,255,0.1);
          background:rgba(255,255,255,0.05); color:#e5e7eb;
          font-size:11px; outline:none;
        }
        .filter-row input:focus { border-color:rgba(99,102,241,0.5); }

        td.empty { text-align:center; color:#475569; padding:28px; font-size:12px; }

        .btn-icon {
          width:28px; height:28px; border-radius:7px;
          border:1px solid rgba(255,255,255,0.1);
          background:rgba(255,255,255,0.05);
          display:inline-flex; align-items:center; justify-content:center;
          cursor:pointer; color:#9ca3af;
          transition:background 0.15s, color 0.15s;
        }
        .btn-icon:hover { background:rgba(255,255,255,0.1); color:#e5e7eb; }
        .btn-expand { }

        .btn-refresh {
          display:inline-flex; align-items:center; gap:5px;
          padding:6px 14px; border-radius:8px;
          border:1px solid rgba(255,255,255,0.1);
          background:rgba(255,255,255,0.06); color:#9ca3af;
          font-size:12px; cursor:pointer;
          transition:background 0.15s;
        }
        .btn-refresh:hover { background:rgba(255,255,255,0.1); color:#e5e7eb; }
        .btn-refresh.loading svg { animation:spin 0.8s linear infinite; }

        .sample-note {
          display:inline-flex; align-items:center; gap:5px;
          padding:3px 10px; border-radius:20px;
          background:rgba(245,180,65,0.12); border:1px solid rgba(245,180,65,0.25);
          color:#f5b041; font-size:11px; font-weight:600;
        }

        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }

        @media (max-width:900px) { .grid-2 { grid-template-columns:1fr; } }
      `}</style>

      <div className="logistics-page">
        {/* Header */}
        <div className="logistics-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(72,201,176,0.15)", border: "1.5px solid rgba(72,201,176,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Truck style={{ width: 19, height: 19, color: C.teal }} />
              </div>
              <div>
                <div className="logistics-header-title">Logistics Dashboard</div>
                <div className="logistics-header-sub">Executive Overview</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LiveClock />
            {(qPoPend.data as any)?._source === "sample" && (
              <span className="sample-note">
                <AlertTriangle style={{ width: 11, height: 11 }} />
                Sample Data
              </span>
            )}
            <ProjectSelector value={project} onChange={setProject} />
            <button className={cn("btn-refresh", isLoading && "loading")} onClick={refreshAll}>
              <RefreshCw style={{ width: 12, height: 12 }} />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="kpi-strip">
          {kpis.map(k => (
            <KpiCard
              key={k.key}
              label={k.label}
              value={counts[k.key]}
              color={k.color}
              icon={k.icon}
              active={activeSection === k.key}
              onClick={() => handleKpiClick(k.key)}
            />
          ))}
        </div>

        {/* Body */}
        <div className="logistics-body">
          <div className="grid-2">
            <PoPendingPanel     rows={rowsBySection.po_pending}     onDetailOpen={openDetail} />
            <SupplierDelayPanel rows={rowsBySection.supplier_delay} onDetailOpen={openDetail} />
          </div>
          <div className="grid-2">
            <MaterialDelayPanel rows={rowsBySection.material_delay} onDetailOpen={openDetail} />
            <OnTimePanel        rows={rowsBySection.on_time}        onDetailOpen={openDetail} />
          </div>
          <div className="grid-1">
            <GprsPendingPanel rows={rowsBySection.gprs_pending} onDetailOpen={openDetail} />
          </div>
        </div>
      </div>

      {/* Detail Overlay */}
      <DetailOverlay
        section={detailSection}
        rows={detailSection ? rowsBySection[detailSection] : []}
        onClose={() => setDetailSection(null)}
      />
    </Layout>
  );
}
