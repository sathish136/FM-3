import { useState, useMemo, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  CheckCircle, ClipboardCheck, FileClock, FileQuestion,
  ShoppingCart, CreditCard, AlertTriangle, Truck,
  RefreshCw, ChevronDown, Search, X, Clock, Package, ArrowLeft, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_PROJECT = "WTT-0528";

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

function parseAge(val: any): number {
  const n = parseInt(String(val ?? "0"));
  return isNaN(n) ? 0 : n;
}

// ── Badges ────────────────────────────────────────────────────────────────────

function AgeBadge({ value }: { value: any }) {
  const d = parseAge(value);
  const [bg, color] = d > 14 ? ["#fef2f2","#dc2626"] : d > 7 ? ["#fffbeb","#d97706"] : ["#f0fdf4","#16a34a"];
  return (
    <span style={{ background: bg, color, padding: "2px 7px", borderRadius: 12, fontSize: 11, fontWeight: 700, display:"inline-flex", alignItems:"center", gap:3, whiteSpace:"nowrap" }}>
      <Clock style={{ width: 10, height: 10 }} />{d}d
    </span>
  );
}

function StatusBadge({ value }: { value: any }) {
  const s = String(value ?? "").toLowerCase();
  const isGood = s.includes("complet") || s.includes("submit") || s.includes("approv");
  const isBad  = s.includes("cancel");
  const [bg, color] = isGood ? ["#f0fdf4","#15803d"] : isBad ? ["#fef2f2","#b91c1c"] : ["#fffbeb","#b45309"];
  return (
    <span style={{ background: bg, color, padding: "2px 7px", borderRadius: 12, fontSize: 11, fontWeight: 600, whiteSpace:"nowrap" }}>
      {value ?? "—"}
    </span>
  );
}

function DelayBadge({ value }: { value: any }) {
  const d = parseAge(value);
  if (d <= 0) return <span style={{ color: "#9ca3af", fontSize: 11 }}>—</span>;
  return (
    <span style={{ background:"#fef2f2", color:"#b91c1c", padding:"2px 7px", borderRadius:12, fontSize:11, fontWeight:700, display:"inline-flex", alignItems:"center", gap:3, whiteSpace:"nowrap" }}>
      <AlertTriangle style={{ width:10, height:10 }} />{d}d delay
    </span>
  );
}

function DaysRemBadge({ value }: { value: any }) {
  const d = parseAge(value);
  const [bg, color] = d <= 3 ? ["#fef2f2","#b91c1c"] : d <= 7 ? ["#fffbeb","#b45309"] : ["#f0fdfa","#0f766e"];
  return (
    <span style={{ background: bg, color, padding:"2px 7px", borderRadius:12, fontSize:11, fontWeight:700, display:"inline-flex", alignItems:"center", gap:3, whiteSpace:"nowrap" }}>
      <Clock style={{ width:10, height:10 }} />{d}d
    </span>
  );
}

// ── Flatten MR items ──────────────────────────────────────────────────────────

function flattenMRMadePO(raw: Record<string, any>[]): Record<string, any>[] {
  const out: Record<string, any>[] = [];
  for (const row of raw) {
    const items: any[] = Array.isArray(row.items) ? row.items : [];
    if (items.length === 0) {
      out.push({ material_request: row.material_request, mr_status: row.mr_status, mr_creation_date: row.mr_creation_date, project: row.project, item_code: "—", description: "—", mr_qty: "—", po_qty: "—", pending_qty: "—" });
    } else {
      for (const item of items) {
        out.push({
          material_request: row.material_request, mr_status: row.mr_status,
          mr_creation_date: row.mr_creation_date, project: row.project,
          item_code: item.item_code,
          description: item.description ?? item.item_name,
          mr_qty: item.mr_qty, po_qty: item.po_qty, pending_qty: item.pending_qty,
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
    queryFn: async () => { const r = await fetch("/api/purchase-dashboard/projects"); const d = await r.json(); return d.projects as { code: string; name: string; label: string }[]; },
    staleTime: 60_000,
  });

  const projects = useMemo(() => {
    const all = [{ code: "", name: "All Projects", label: "All Projects" }, ...(data ?? [])];
    return search ? all.filter(p => p.label.toLowerCase().includes(search.toLowerCase())) : all;
  }, [data, search]);

  const selected = (data ?? []).find(p => p.code === value);
  const displayLabel = selected ? selected.label : value || "All Projects";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 12px", fontSize: 13, display:"flex", alignItems:"center", gap:8, minWidth: 240, cursor:"pointer", fontWeight:500, color:"#374151" }}>
        <Package style={{ width: 14, height: 14, color: "#9ca3af", flexShrink:0 }} />
        <span style={{ flex:1, textAlign:"left", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{displayLabel}</span>
        <ChevronDown style={{ width: 12, height: 12, color: "#9ca3af", flexShrink:0 }} />
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:50, background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, boxShadow:"0 10px 25px rgba(0,0,0,0.12)", width:320 }}>
          <div style={{ padding:8, borderBottom:"1px solid #f3f4f6", display:"flex", alignItems:"center", gap:8 }}>
            <Search style={{ width:13, height:13, color:"#9ca3af" }} />
            <input autoFocus style={{ border:"none", outline:"none", fontSize:13, color:"#374151", flex:1, background:"transparent" }} placeholder="Search project..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")}><X style={{ width:12, height:12, color:"#9ca3af" }} /></button>}
          </div>
          <div style={{ maxHeight:280, overflowY:"auto", padding:4 }}>
            {projects.map(p => (
              <button key={p.code}
                style={{ width:"100%", textAlign:"left", padding:"8px 12px", borderRadius:8, fontSize:13, cursor:"pointer", background: p.code === value ? COLORS.blue : "transparent", color: p.code === value ? "#fff" : "#374151", border:"none", display:"block", fontWeight: p.code === value ? 600 : 400 }}
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

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ label, value, icon: Icon, color, onClick }: {
  label: string; value: any; icon: React.ElementType; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{ background: color, border:"none", borderRadius:10, padding:"16px", cursor:"pointer", textAlign:"left", width:"100%", boxShadow:"0 2px 8px rgba(0,0,0,0.18)", transition:"transform 0.12s, box-shadow 0.12s" }}
      onMouseEnter={e => { e.currentTarget.style.transform="scale(1.03)"; e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.22)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.18)"; }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <span style={{ color:"rgba(255,255,255,0.85)", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", lineHeight:1.3 }}>{label}</span>
        <Icon style={{ width:22, height:22, color:"rgba(255,255,255,0.65)" } as any} />
      </div>
      <div style={{ color:"#fff", fontSize:32, fontWeight:900, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>
        {value != null && value !== "" ? value : "—"}
      </div>
    </button>
  );
}

// ── Panel Table ───────────────────────────────────────────────────────────────

type ColDef = { key: string; label: string; render?: (val: any, row: Record<string, any>) => React.ReactNode; };

function PanelTable({ title, rows, columns, loading, accentColor }: {
  title: string; rows: Record<string, any>[]; columns: ColDef[];
  loading?: boolean; filename?: string; accentColor: string;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const setFilter = useCallback((key: string, val: string) => setFilters(p => ({ ...p, [key]: val })), []);

  const filtered = useMemo(() => rows.filter(row =>
    columns.every(col => { const f = filters[col.key]; return !f || String(row[col.key] ?? "").toLowerCase().includes(f.toLowerCase()); })
  ), [rows, filters, columns]);

  return (
    <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:10, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column" }}>
      {/* Panel header */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderBottom:"2px solid #f3f4f6", background:"#fff" }}>
        <span style={{ width:4, height:18, background:accentColor, borderRadius:2, display:"inline-block", flexShrink:0 }} />
        <span style={{ fontWeight:700, fontSize:13, color:"#111827" }}>{title}</span>
        <span style={{ background: accentColor, color:"#fff", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10 }}>
          {loading ? "…" : filtered.length}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:300 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead style={{ position:"sticky", top:0, zIndex:10 }}>
            {/* Column labels */}
            <tr style={{ background:"#f9fafb", borderBottom:"1px solid #e5e7eb" }}>
              <th style={{ padding:"7px 10px", textAlign:"center", color:"#9ca3af", fontWeight:700, fontSize:10, width:32 }}>#</th>
              {columns.map(col => (
                <th key={col.key} style={{ padding:"7px 10px", textAlign:"left", color:"#6b7280", fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>
                  {col.label}
                </th>
              ))}
            </tr>
            {/* Filter inputs */}
            <tr style={{ background:"#fff", borderBottom:"2px solid #f3f4f6" }}>
              <td style={{ padding:"4px 6px" }} />
              {columns.map(col => (
                <td key={col.key} style={{ padding:"4px 6px" }}>
                  <input
                    style={{ width:"100%", border:"1px solid #e5e7eb", borderRadius:5, padding:"3px 7px", fontSize:11, color:"#374151", background:"#f9fafb", outline:"none", boxSizing:"border-box" }}
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
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} style={{ borderBottom:"1px solid #f3f4f6" }}>
                  <td colSpan={columns.length + 1} style={{ padding:10 }}>
                    <div style={{ height:13, background:"#f3f4f6", borderRadius:4, animation:"pulse 1.5s infinite" }} />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={columns.length + 1} style={{ textAlign:"center", padding:"28px 10px", color:"#9ca3af", fontSize:12 }}>No records found</td></tr>
            ) : filtered.map((row, i) => (
              <tr key={i}
                style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom:"1px solid #f3f4f6", transition:"background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f0f9ff")}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa")}>
                <td style={{ padding:"7px 10px", color:"#d1d5db", fontSize:11, textAlign:"center", fontWeight:600 }}>{i + 1}</td>
                {columns.map(col => (
                  <td key={col.key} style={{ padding:"7px 10px", color:"#374151", whiteSpace:"nowrap" }}>
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

// ── Column definitions ────────────────────────────────────────────────────────

type DetailId = "po_completed" | "mr_completed" | "mr_made_po_pending" | "mr_pending"
  | "po_pending" | "payment_pending" | "po_delay_transit" | "po_on_transit";

const DETAIL_CONFIG: Record<DetailId, { title: string; color: string; filename: string; columns: ColDef[] }> = {
  po_completed: {
    title: "Completed Purchase Orders", color: COLORS.green, filename: "Completed_PO",
    columns: [
      { key: "purchase_order", label: "PO No", render: v => <span style={{ color: COLORS.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "created_date",   label: "Created Date" },
      { key: "supplier",       label: "Supplier",       render: v => <span style={{ fontWeight:500 }}>{v ?? "—"}</span> },
      { key: "total_amount",   label: "Amount",         render: v => <span style={{ fontWeight:700 }}>{v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—"}</span> },
      { key: "workflow_state", label: "Workflow",        render: v => <StatusBadge value={v} /> },
      { key: "status",         label: "Status",          render: v => <StatusBadge value={v} /> },
      { key: "project",        label: "Project" },
      { key: "age_days",       label: "Age",             render: v => <AgeBadge value={v} /> },
    ],
  },
  mr_completed: {
    title: "Completed MR Orders", color: COLORS.blue, filename: "Completed_MR",
    columns: [
      { key: "material_request", label: "MR No",     render: v => <span style={{ color: COLORS.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "created_date",     label: "Created Date" },
      { key: "mr_date",          label: "MR Date" },
      { key: "project",          label: "Project" },
      { key: "workflow_state",   label: "Workflow",   render: v => <StatusBadge value={v} /> },
      { key: "status",           label: "Status",     render: v => <StatusBadge value={v} /> },
      { key: "age_days",         label: "Age",        render: v => <AgeBadge value={v} /> },
    ],
  },
  mr_made_po_pending: {
    title: "MR Made — PO Not Created", color: COLORS.orange, filename: "MR_Made_PO_Not_Made",
    columns: [
      { key: "material_request", label: "Material Request", render: v => <span style={{ color: COLORS.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "mr_status",        label: "MR Status",        render: v => <StatusBadge value={v} /> },
      { key: "item_code",        label: "Item Code",        render: v => <span style={{ maxWidth:180, display:"block", overflow:"hidden", textOverflow:"ellipsis", fontWeight:500 }}>{v ?? "—"}</span> },
      { key: "description",      label: "Description",      render: v => <span style={{ maxWidth:220, display:"block", overflow:"hidden", textOverflow:"ellipsis" }}>{v ?? "—"}</span> },
      { key: "mr_qty",           label: "MR Qty",           render: v => <span style={{ fontWeight:700 }}>{v ?? "—"}</span> },
      { key: "po_qty",           label: "PO Qty",           render: v => <span style={{ fontWeight:700, color: COLORS.blue }}>{v ?? "—"}</span> },
      { key: "pending_qty",      label: "Pending",          render: v => { const n = parseFloat(String(v ?? "0")); return <span style={{ fontWeight:700, color: n > 0 ? "#dc2626" : "#9ca3af" }}>{v ?? "—"}</span>; } },
      { key: "mr_creation_date", label: "MR Created" },
      { key: "project",          label: "Project" },
    ],
  },
  mr_pending: {
    title: "MR Pending", color: COLORS.purple, filename: "MR_Pending",
    columns: [
      { key: "mr_no",           label: "MR No",           render: v => <span style={{ color: COLORS.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "creation_date",   label: "Created Date" },
      { key: "status",          label: "Status",           render: v => <StatusBadge value={v} /> },
      { key: "project_remarks", label: "Project Remarks",  render: v => <span style={{ maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis" }}>{v ?? "—"}</span> },
      { key: "age_days",        label: "Age",              render: v => <AgeBadge value={v} /> },
    ],
  },
  po_pending: {
    title: "PO Pending", color: COLORS.red, filename: "PO_Pending",
    columns: [
      { key: "po_no",       label: "PO No",       render: v => <span style={{ color: COLORS.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "created_date", label: "Created Date" },
      { key: "status",      label: "Status",       render: v => <StatusBadge value={v} /> },
      { key: "supplier",    label: "Supplier",     render: v => <span style={{ fontWeight:500 }}>{v ?? "—"}</span> },
      { key: "age_days",    label: "Age",          render: v => <AgeBadge value={v} /> },
    ],
  },
  payment_pending: {
    title: "Payment Pending", color: COLORS.rose, filename: "Payment_Pending",
    columns: [
      { key: "payment",        label: "Payment No",     render: v => <span style={{ color: COLORS.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "created_date",   label: "Created Date" },
      { key: "payment_type",   label: "Payment Type" },
      { key: "workflow_state", label: "Workflow State",  render: v => <StatusBadge value={v} /> },
      { key: "age_days",       label: "Age",             render: v => <AgeBadge value={v} /> },
    ],
  },
  po_delay_transit: {
    title: "PO Delay Transit", color: COLORS.amber, filename: "PO_Delay_Transit",
    columns: [
      { key: "po_no",              label: "PO No",            render: v => <span style={{ color: COLORS.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "delivery_from",      label: "Delivery From" },
      { key: "delivery_to",        label: "Delivery To" },
      { key: "po_qty/pr_qty/pending", label: "PO / PR / Pending" },
      { key: "delay_days",         label: "Delay Days",        render: v => <DelayBadge value={v} /> },
    ],
  },
  po_on_transit: {
    title: "PO On Transit", color: COLORS.teal, filename: "PO_On_Transit",
    columns: [
      { key: "po_no",                   label: "PO No",          render: v => <span style={{ color: COLORS.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "supplier",                label: "Supplier",        render: v => <span style={{ fontWeight:500 }}>{v ?? "—"}</span> },
      { key: "expected_delivery_date",  label: "Exp. Delivery" },
      { key: "expected_received_date",  label: "Exp. Received" },
      { key: "days_remaining",          label: "Days Rem.",       render: v => <DaysRemBadge value={v} /> },
    ],
  },
};

const DETAIL_API: Record<DetailId, string> = {
  po_completed: "completed-purchase-orders",   mr_completed: "completed-mr-orders",
  mr_made_po_pending: "mr-made-po-pending",    mr_pending: "mr-pending",
  po_pending: "po-pending",                    payment_pending: "payment-pending",
  po_delay_transit: "po-delay-transit",        po_on_transit: "po-on-transit",
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
    <div style={{ position:"fixed", inset:0, zIndex:50, background:"#f3f4f6", display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ background: cfg.color, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, boxShadow:"0 2px 8px rgba(0,0,0,0.15)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onClose}
            style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.2)", border:"none", borderRadius:7, padding:"6px 12px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            <ArrowLeft style={{ width:13, height:13 }} /> Back to Dashboard
          </button>
          <span style={{ color:"#fff", fontWeight:700, fontSize:15 }}>{cfg.title}</span>
          <span style={{ background:"rgba(255,255,255,0.25)", color:"#fff", fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:10 }}>
            {isLoading ? "…" : rows.length} records
          </span>
        </div>
      </div>
      {/* Full-screen table */}
      <div style={{ flex:1, overflowY:"auto", padding:20 }}>
        <PanelTable title={cfg.title} rows={rows} columns={cfg.columns} loading={isLoading} filename={cfg.filename} accentColor={cfg.color} />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PurchaseDashboardContent() {
  const [project, setProject] = useState(DEFAULT_PROJECT);
  const [detail, setDetail] = useState<DetailId | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setDetail(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const pq = (path: string) => ({
    queryKey: ["purchase", path, project],
    queryFn: async () => { const r = await fetch(apiUrl(path, project)); return r.json(); },
    staleTime: 30_000,
  });

  const counts          = useQuery(pq("counts"));
  const mrMadePoPending = useQuery(pq("mr-made-po-pending"));
  const completedPO     = useQuery(pq("completed-purchase-orders"));
  const poPending       = useQuery(pq("po-pending"));
  const completedMR     = useQuery(pq("completed-mr-orders"));
  const mrPending       = useQuery(pq("mr-pending"));
  const paymentPending  = useQuery(pq("payment-pending"));
  const poOnTransit     = useQuery(pq("po-on-transit"));
  const poDelayTransit  = useQuery(pq("po-delay-transit"));

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

  function getRows(q: ReturnType<typeof useQuery>, flatten?: boolean): Record<string, any>[] {
    const msg = (q.data as any)?.message;
    let raw: Record<string, any>[] = [];
    if (!msg) raw = [];
    else if (Array.isArray(msg)) raw = msg;
    else if (Array.isArray(msg.data)) raw = msg.data;
    return flatten ? flattenMRMadePO(raw) : raw;
  }

  const refetchAll = () => [counts, mrMadePoPending, completedPO, poPending, completedMR, mrPending, paymentPending, poOnTransit, poDelayTransit].forEach(q => q.refetch());

  const kpis: { id: DetailId; label: string; icon: React.ElementType; color: string }[] = [
    { id: "po_completed",       label: "PO COMPLETED COUNT",  icon: CheckCircle,   color: COLORS.green  },
    { id: "mr_completed",       label: "MR COMPLETED COUNT",  icon: ClipboardCheck, color: COLORS.blue  },
    { id: "mr_made_po_pending", label: "MR MADE PO PENDING",  icon: FileClock,     color: COLORS.orange },
    { id: "mr_pending",         label: "MR PENDING",          icon: FileQuestion,  color: COLORS.purple },
    { id: "po_pending",         label: "PO PENDING",          icon: ShoppingCart,  color: COLORS.red    },
    { id: "payment_pending",    label: "PAYMENT PENDING",     icon: CreditCard,    color: COLORS.rose   },
    { id: "po_delay_transit",   label: "PO DELAY TRANSIT",    icon: AlertTriangle, color: COLORS.amber  },
    { id: "po_on_transit",      label: "PO ON TRANSIT",       icon: Truck,         color: COLORS.teal   },
  ];

  return (
    <>
      {detail && <DetailOverlay id={detail} project={project} onClose={() => setDetail(null)} />}

      <div style={{ minHeight:"100vh", background:"#f0f2f5", padding:20, display:"flex", flexDirection:"column", gap:18 }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:900, color:"#111827", letterSpacing:"-0.02em" }}>Purchase Department</h1>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"#9ca3af" }}>
              Live ERP tracking · <span style={{ fontWeight:600, color:"#6b7280" }}>{project || "All Projects"}</span>
            </p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <ProjectSelector value={project} onChange={setProject} />
            <Link href="/mis-report?tab=Procurement" style={{ display:"flex", alignItems:"center", gap:6, background:"#1e3a5f", border:"none", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:600, color:"#fff", cursor:"pointer", textDecoration:"none" }}>
              <BarChart2 style={{ width:14, height:14 }} /> MD Dashboard
            </Link>
            <button onClick={refetchAll}
              style={{ display:"flex", alignItems:"center", gap:6, background:"#fff", border:"1px solid #d1d5db", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:600, color:"#374151", cursor:"pointer" }}>
              <RefreshCw className={cn("w-3.5 h-3.5", counts.isFetching && "animate-spin")} /> Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(8, 1fr)", gap:12 }}>
          {kpis.map(k => (
            <KPICard key={k.id} label={k.label}
              value={counts.isLoading ? "…" : (countMap[k.id] ?? "—")}
              icon={k.icon} color={k.color} onClick={() => setDetail(k.id)} />
          ))}
        </div>

        {/* Alerts */}
        {(getRows(poDelayTransit).length > 0 || getRows(paymentPending).length > 0) && (
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {getRows(poDelayTransit).length > 0 && (
              <div onClick={() => setDetail("po_delay_transit")} style={{ flex:1, minWidth:200, background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"10px 16px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                <AlertTriangle style={{ width:16, height:16, color: COLORS.amber, flexShrink:0 }} />
                <div>
                  <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#92400e" }}>{getRows(poDelayTransit).length} POs delayed in transit — click to view</p>
                  <p style={{ margin:"2px 0 0", fontSize:11, color:"#b45309" }}>Expected delivery date has passed</p>
                </div>
              </div>
            )}
            {getRows(paymentPending).length > 0 && (
              <div onClick={() => setDetail("payment_pending")} style={{ flex:1, minWidth:200, background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"10px 16px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                <CreditCard style={{ width:16, height:16, color: COLORS.rose, flexShrink:0 }} />
                <div>
                  <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#7f1d1d" }}>{getRows(paymentPending).length} payments awaiting approval — click to view</p>
                  <p style={{ margin:"2px 0 0", fontSize:11, color:"#991b1b" }}>Pending payment entries need review</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Row 1 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
          <PanelTable title="MR Made Po Not Made"     rows={getRows(mrMadePoPending, true)} loading={mrMadePoPending.isLoading}  filename="MR_Made_PO_Not_Made" accentColor={COLORS.orange} columns={DETAIL_CONFIG.mr_made_po_pending.columns} />
          <PanelTable title="MR Pending"              rows={getRows(mrPending)}              loading={mrPending.isLoading}         filename="MR_Pending"          accentColor={COLORS.purple} columns={DETAIL_CONFIG.mr_pending.columns} />
          <PanelTable title="PO Pending"              rows={getRows(poPending)}              loading={poPending.isLoading}         filename="PO_Pending"          accentColor={COLORS.red}    columns={DETAIL_CONFIG.po_pending.columns} />
        </div>

        {/* Row 2 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
          <PanelTable title="Payment Pending"         rows={getRows(paymentPending)}         loading={paymentPending.isLoading}    filename="Payment_Pending"     accentColor={COLORS.rose}   columns={DETAIL_CONFIG.payment_pending.columns} />
          <PanelTable title="PO Delay Transit"        rows={getRows(poDelayTransit)}         loading={poDelayTransit.isLoading}    filename="PO_Delay_Transit"    accentColor={COLORS.amber}  columns={DETAIL_CONFIG.po_delay_transit.columns} />
          <PanelTable title="PO On Transit"           rows={getRows(poOnTransit)}            loading={poOnTransit.isLoading}       filename="PO_On_Transit"       accentColor={COLORS.teal}   columns={DETAIL_CONFIG.po_on_transit.columns} />
        </div>

        {/* Row 3 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <PanelTable title="Completed Purchase Orders" rows={getRows(completedPO)}          loading={completedPO.isLoading}       filename="Completed_PO"        accentColor={COLORS.green}  columns={DETAIL_CONFIG.po_completed.columns} />
          <PanelTable title="Completed MR Orders"       rows={getRows(completedMR)}          loading={completedMR.isLoading}       filename="Completed_MR"        accentColor={COLORS.blue}   columns={DETAIL_CONFIG.mr_completed.columns} />
        </div>

      </div>
    </>
  );
}

export default function PurchaseDashboard() { return <Layout><PurchaseDashboardContent /></Layout>; }
