import { useState, useMemo, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  DoorOpen, FileText, Receipt, Truck, ClipboardList,
  RefreshCw, Download, ChevronDown, Search, X, Package,
  Warehouse, RotateCcw, Wallet, BoxSelect, AlertCircle, Clock, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_PROJECT = "WTT-0528";

const C = {
  teal:   "#16a085",
  blue:   "#2980b9",
  amber:  "#f39c12",
  red:    "#e74c3c",
  orange: "#e67e22",
  purple: "#8e44ad",
  green:  "#27ae60",
  rose:   "#c0392b",
  navy:   "#1a5276",
  slate:  "#2c3e50",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function apiUrl(path: string, project?: string) {
  const base = `/api/stores-dashboard/${path}`;
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

function getRows(q: ReturnType<typeof useQuery>): Record<string, any>[] {
  const msg = (q.data as any)?.message;
  if (!msg) return [];
  if (Array.isArray(msg)) return msg;
  if (Array.isArray(msg.data)) return msg.data;
  return [];
}

// ── Badges ────────────────────────────────────────────────────────────────────

function AgeBadge({ value }: { value: any }) {
  const d = parseAge(value);
  const [bg, color] = d > 14 ? ["#fef2f2","#dc2626"] : d > 7 ? ["#fffbeb","#d97706"] : ["#f0fdf4","#16a34a"];
  return (
    <span style={{ background: bg, color, padding:"2px 8px", borderRadius:12, fontSize:11, fontWeight:700, display:"inline-flex", alignItems:"center", gap:3, whiteSpace:"nowrap" }}>
      <Clock style={{ width:10, height:10 }} />{d}d
    </span>
  );
}

function AmountCell({ value }: { value: any }) {
  const n = parseFloat(String(value ?? "0"));
  if (isNaN(n)) return <span style={{ color:"#9ca3af" }}>—</span>;
  return <span style={{ fontWeight:700, color: n > 0 ? "#111827" : "#9ca3af" }}>₹{n.toLocaleString("en-IN")}</span>;
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
    const all = [{ code: "", label: "All Projects" }, ...(data ?? [])];
    return search ? all.filter(p => p.label.toLowerCase().includes(search.toLowerCase())) : all;
  }, [data, search]);

  const selected = (data ?? []).find(p => p.code === value);
  const displayLabel = selected ? selected.label : value || "All Projects";

  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background:"#fff", border:"1px solid #d1d5db", borderRadius:8, padding:"6px 12px", fontSize:13, display:"flex", alignItems:"center", gap:8, minWidth:240, cursor:"pointer", fontWeight:500, color:"#374151" }}>
        <Package style={{ width:14, height:14, color:"#9ca3af", flexShrink:0 }} />
        <span style={{ flex:1, textAlign:"left", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{displayLabel}</span>
        <ChevronDown style={{ width:12, height:12, color:"#9ca3af" }} />
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
                style={{ width:"100%", textAlign:"left", padding:"8px 12px", borderRadius:8, fontSize:13, cursor:"pointer", background: p.code === value ? C.blue : "transparent", color: p.code === value ? "#fff" : "#374151", border:"none", display:"block", fontWeight: p.code === value ? 600 : 400 }}
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
  label: string; value: any; icon: React.ElementType; color: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      style={{ background: color, border:"none", borderRadius:10, padding:"16px", cursor: onClick ? "pointer" : "default", textAlign:"left", width:"100%", boxShadow:"0 2px 8px rgba(0,0,0,0.18)", transition:"transform 0.12s, box-shadow 0.12s" }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform="scale(1.03)"; e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.22)"; } }}
      onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.18)"; }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <span style={{ color:"rgba(255,255,255,0.85)", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", lineHeight:1.3 }}>{label}</span>
        <Icon style={{ width:22, height:22, color:"rgba(255,255,255,0.65)" } as any} />
      </div>
      <div style={{ color:"#fff", fontSize:32, fontWeight:900, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>
        {value != null && value !== "" ? value : "—"}
      </div>
      {onClick && <div style={{ marginTop:8, fontSize:10, color:"rgba(255,255,255,0.55)", fontWeight:600 }}>Click to view details →</div>}
    </button>
  );
}

// ── Panel Table ───────────────────────────────────────────────────────────────

type ColDef = { key: string; label: string; render?: (val: any, row: Record<string, any>) => React.ReactNode; };

function PanelTable({ title, rows, columns, loading, filename, accentColor }: {
  title: string; rows: Record<string, any>[]; columns: ColDef[];
  loading?: boolean; filename: string; accentColor: string;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const setFilter = useCallback((key: string, val: string) => setFilters(p => ({ ...p, [key]: val })), []);

  const filtered = useMemo(() => rows.filter(row =>
    columns.every(col => { const f = filters[col.key]; return !f || String(row[col.key] ?? "").toLowerCase().includes(f.toLowerCase()); })
  ), [rows, filters, columns]);

  return (
    <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:10, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column" }}>
      {/* Panel header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:"2px solid #f3f4f6", background:"#fff" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:4, height:18, background:accentColor, borderRadius:2, display:"inline-block", flexShrink:0 }} />
          <span style={{ fontWeight:700, fontSize:13, color:"#111827" }}>{title}</span>
          <span style={{ background: accentColor, color:"#fff", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10 }}>
            {loading ? "…" : filtered.length}
          </span>
        </div>
        <button onClick={() => exportToExcel(filtered, filename)}
          style={{ display:"flex", alignItems:"center", gap:4, background:"#f3f4f6", border:"1px solid #e5e7eb", borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:600, color:"#374151", cursor:"pointer" }}>
          <Download style={{ width:11, height:11 }} /> Export Excel
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:300 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead style={{ position:"sticky", top:0, zIndex:10 }}>
            <tr style={{ background:"#f9fafb", borderBottom:"1px solid #e5e7eb" }}>
              <th style={{ padding:"7px 10px", textAlign:"center", color:"#9ca3af", fontWeight:700, fontSize:10, width:32 }}>#</th>
              {columns.map(col => (
                <th key={col.key} style={{ padding:"7px 10px", textAlign:"left", color:"#6b7280", fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>
                  {col.label}
                </th>
              ))}
            </tr>
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
                    <div style={{ height:13, background:"#f3f4f6", borderRadius:4 }} />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={columns.length + 1} style={{ textAlign:"center", padding:"28px 10px", color:"#9ca3af", fontSize:12 }}>No records found</td></tr>
            ) : filtered.map((row, i) => (
              <tr key={i}
                style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom:"1px solid #f3f4f6" }}
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

// ── Detail Overlay ────────────────────────────────────────────────────────────

type SectionId = "gate_entry" | "dc_gateout" | "pr_bill" | "direct_delivery" | "delivery_note"
  | "returnable_dc" | "petty_cash" | "stock_indent" | "material_issue" | "project_dispute";

type SectionConfig = { title: string; color: string; filename: string; apiPath: string; columns: ColDef[] };

const SECTIONS: Record<SectionId, SectionConfig> = {
  gate_entry: {
    title: "Gate Entry PR Pending", color: C.teal, filename: "Gate_Entry_PR_Pending", apiPath: "gate-entry-pr-pending",
    columns: [
      { key: "name", label: "Gate Entry No", render: v => <span style={{ color: C.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "party", label: "Supplier / Party", render: v => <span style={{ fontWeight:500 }}>{v ?? "—"}</span> },
      { key: "posting_date", label: "Date" },
      { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
    ],
  },
  dc_gateout: {
    title: "DC Gate Out Pending", color: C.blue, filename: "DC_Gate_Out_Pending", apiPath: "dc-gateout-pending",
    columns: [
      { key: "name", label: "DC No", render: v => <span style={{ color: C.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "party", label: "Party", render: v => <span style={{ fontWeight:500 }}>{v ?? "—"}</span> },
      { key: "posting_date", label: "Date" },
      { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
    ],
  },
  pr_bill: {
    title: "PR Made — Bill Pending", color: C.amber, filename: "PR_Bill_Pending", apiPath: "pr-bill-pending",
    columns: [
      { key: "name", label: "PR No", render: v => <span style={{ color: C.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "party", label: "Party", render: v => <span style={{ fontWeight:500 }}>{v ?? "—"}</span> },
      { key: "posting_date", label: "Date" },
      { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
      { key: "reason_for_pending", label: "Reason", render: v => <span style={{ maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis", color: v ? "#b45309" : "#9ca3af" }}>{v ?? "—"}</span> },
    ],
  },
  direct_delivery: {
    title: "Direct Site Delivery", color: C.red, filename: "Direct_Site_Delivery", apiPath: "direct-site-delivery",
    columns: [
      { key: "name", label: "PR No", render: v => <span style={{ color: C.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "party", label: "Party", render: v => <span style={{ fontWeight:500 }}>{v ?? "—"}</span> },
      { key: "posting_date", label: "Date" },
      { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
    ],
  },
  delivery_note: {
    title: "Delivery Note Pending", color: C.orange, filename: "Delivery_Note_Pending", apiPath: "delivery-note-pending",
    columns: [
      { key: "name", label: "DC No", render: v => <span style={{ color: C.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "party", label: "Party", render: v => <span style={{ fontWeight:500 }}>{v ?? "—"}</span> },
      { key: "posting_date", label: "Date" },
      { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
    ],
  },
  returnable_dc: {
    title: "Returnable DC", color: C.purple, filename: "Returnable_DC", apiPath: "returnable-dc",
    columns: [
      { key: "name", label: "DC No", render: v => <span style={{ color: C.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "party", label: "Party", render: v => <span style={{ fontWeight:500 }}>{v ?? "—"}</span> },
      { key: "posting_date", label: "Date" },
      { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
    ],
  },
  petty_cash: {
    title: "Petty Cash Entries", color: C.green, filename: "Petty_Cash", apiPath: "petty-cash",
    columns: [
      { key: "name", label: "Entry No", render: v => <span style={{ color: C.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "party", label: "Party", render: v => <span style={{ fontWeight:500 }}>{v ?? "—"}</span> },
      { key: "posting_date", label: "Date" },
      { key: "amount", label: "Amount", render: v => <AmountCell value={v} /> },
      { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
    ],
  },
  stock_indent: {
    title: "Stock Indent Pending", color: C.rose, filename: "Stock_Indent_Pending", apiPath: "stock-indent-pending",
    columns: [
      { key: "name", label: "Indent No", render: v => <span style={{ color: C.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "party", label: "Party", render: v => <span style={{ fontWeight:500 }}>{v ?? "—"}</span> },
      { key: "posting_date", label: "Date" },
      { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
    ],
  },
  material_issue: {
    title: "Material Issue Pending", color: C.navy, filename: "Material_Issue_Pending", apiPath: "material-issue-pending",
    columns: [
      { key: "name", label: "Issue No", render: v => <span style={{ color: C.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "party", label: "Party", render: v => <span style={{ fontWeight:500 }}>{v ?? "—"}</span> },
      { key: "posting_date", label: "Date" },
      { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
    ],
  },
  project_dispute: {
    title: "Project Dispute", color: C.slate, filename: "Project_Dispute", apiPath: "project-dispute",
    columns: [
      { key: "name", label: "Dispute No", render: v => <span style={{ color: C.blue, fontWeight:600 }}>{v ?? "—"}</span> },
      { key: "project", label: "Project" },
      { key: "posting_date", label: "Date" },
      { key: "amount", label: "Amount", render: v => <AmountCell value={v} /> },
      { key: "reason", label: "Reason", render: v => <span style={{ maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis" }}>{v ?? "—"}</span> },
      { key: "age", label: "Age", render: v => <AgeBadge value={v} /> },
    ],
  },
};

function DetailOverlay({ id, project, onClose }: { id: SectionId; project: string; onClose: () => void }) {
  const cfg = SECTIONS[id];
  const { data, isLoading } = useQuery({
    queryKey: ["stores-detail", id, project],
    queryFn: async () => { const r = await fetch(apiUrl(cfg.apiPath, project)); return r.json(); },
    staleTime: 30_000,
  });
  const rows = useMemo(() => getRows({ data } as any), [data]);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, background:"#f3f4f6", display:"flex", flexDirection:"column" }}>
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
        <button onClick={() => exportToExcel(rows, cfg.filename)}
          style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:7, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>
          <Download style={{ width:13, height:13 }} /> Export Excel
        </button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:20 }}>
        <PanelTable title={cfg.title} rows={rows} columns={cfg.columns} loading={isLoading} filename={cfg.filename} accentColor={cfg.color} />
      </div>
    </div>
  );
}

// ── Stock Summary (special layout) ───────────────────────────────────────────

function StockSummaryPanel({ rows, loading }: { rows: Record<string, any>[]; loading: boolean }) {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => filter ? rows.filter(r => String(r.warehouse ?? "").toLowerCase().includes(filter.toLowerCase())) : rows, [rows, filter]);
  const totalQty = useMemo(() => filtered.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0), [filtered]);
  const totalAmt = useMemo(() => filtered.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0), [filtered]);

  return (
    <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:10, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:"2px solid #f3f4f6" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:4, height:18, background: C.navy, borderRadius:2, display:"inline-block" }} />
          <span style={{ fontWeight:700, fontSize:13, color:"#111827" }}>Stock Summary</span>
          <span style={{ background: C.navy, color:"#fff", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10 }}>
            {loading ? "…" : filtered.length}
          </span>
        </div>
        <button onClick={() => exportToExcel(filtered, "Stock_Summary")}
          style={{ display:"flex", alignItems:"center", gap:4, background:"#f3f4f6", border:"1px solid #e5e7eb", borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:600, color:"#374151", cursor:"pointer" }}>
          <Download style={{ width:11, height:11 }} /> Export Excel
        </button>
      </div>
      {/* Summary totals */}
      <div style={{ display:"flex", gap:0, borderBottom:"1px solid #f3f4f6" }}>
        <div style={{ flex:1, padding:"8px 14px", borderRight:"1px solid #f3f4f6", textAlign:"center" }}>
          <div style={{ fontSize:10, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Total Qty</div>
          <div style={{ fontSize:18, fontWeight:900, color: C.navy }}>{totalQty.toLocaleString("en-IN")}</div>
        </div>
        <div style={{ flex:1, padding:"8px 14px", textAlign:"center" }}>
          <div style={{ fontSize:10, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Total Amount</div>
          <div style={{ fontSize:18, fontWeight:900, color: C.green }}>₹{totalAmt.toLocaleString("en-IN")}</div>
        </div>
      </div>
      <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:250 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead style={{ position:"sticky", top:0, zIndex:10 }}>
            <tr style={{ background:"#f9fafb", borderBottom:"1px solid #e5e7eb" }}>
              <th style={{ padding:"7px 10px", textAlign:"center", color:"#9ca3af", fontWeight:700, fontSize:10, width:32 }}>#</th>
              <th style={{ padding:"7px 10px", textAlign:"left", color:"#6b7280", fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>Warehouse</th>
              <th style={{ padding:"7px 10px", textAlign:"right", color:"#6b7280", fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>Qty</th>
              <th style={{ padding:"7px 10px", textAlign:"right", color:"#6b7280", fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>Amount</th>
            </tr>
            <tr style={{ background:"#fff", borderBottom:"2px solid #f3f4f6" }}>
              <td />
              <td style={{ padding:"4px 6px" }}>
                <input style={{ width:"100%", border:"1px solid #e5e7eb", borderRadius:5, padding:"3px 7px", fontSize:11, color:"#374151", background:"#f9fafb", outline:"none", boxSizing:"border-box" }}
                  placeholder="Filter warehouse..." value={filter} onChange={e => setFilter(e.target.value)} />
              </td>
              <td /><td />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={4} style={{ padding:10 }}><div style={{ height:13, background:"#f3f4f6", borderRadius:4 }} /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign:"center", padding:"28px 10px", color:"#9ca3af", fontSize:12 }}>No records</td></tr>
            ) : filtered.map((row, i) => (
              <tr key={i}
                style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom:"1px solid #f3f4f6" }}
                onMouseEnter={e => (e.currentTarget.style.background="#f0f9ff")}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa")}>
                <td style={{ padding:"7px 10px", color:"#d1d5db", fontSize:11, textAlign:"center", fontWeight:600 }}>{i + 1}</td>
                <td style={{ padding:"7px 10px", color:"#374151", fontWeight:500 }}>{row.warehouse ?? "—"}</td>
                <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700, color:"#374151" }}>{row.qty != null ? Number(row.qty).toLocaleString("en-IN") : "—"}</td>
                <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700, color: C.green }}>{row.amount != null ? `₹${Number(row.amount).toLocaleString("en-IN")}` : "—"}</td>
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
  const [project, setProject] = useState(DEFAULT_PROJECT);
  const [detail, setDetail] = useState<SectionId | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setDetail(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const pq = (path: string) => ({
    queryKey: ["stores", path, project],
    queryFn: async () => { const r = await fetch(apiUrl(path, project)); return r.json(); },
    staleTime: 30_000,
  });

  const counts         = useQuery(pq("counts"));
  const gateEntry      = useQuery(pq("gate-entry-pr-pending"));
  const dcGateout      = useQuery(pq("dc-gateout-pending"));
  const prBill         = useQuery(pq("pr-bill-pending"));
  const directDelivery = useQuery(pq("direct-site-delivery"));
  const deliveryNote   = useQuery(pq("delivery-note-pending"));
  const returnableDC   = useQuery(pq("returnable-dc"));
  const pettyCash      = useQuery(pq("petty-cash"));
  const stockIndent    = useQuery(pq("stock-indent-pending"));
  const materialIssue  = useQuery(pq("material-issue-pending"));
  const projectDispute = useQuery(pq("project-dispute"));
  const stockSummary   = useQuery(pq("stock-summary"));

  const c = counts.data?.message ?? {};

  const refetchAll = () => {
    [counts, gateEntry, dcGateout, prBill, directDelivery, deliveryNote,
     returnableDC, pettyCash, stockIndent, materialIssue, projectDispute, stockSummary]
      .forEach(q => q.refetch());
  };

  const kpis: { id: SectionId; label: string; icon: React.ElementType; color: string; countKey: string }[] = [
    { id: "gate_entry",     label: "Gate Entry PR Pending",   icon: DoorOpen,     color: C.teal,   countKey: "gate_entry_made_pr_pending" },
    { id: "dc_gateout",     label: "DC Gate Out Pending",     icon: FileText,     color: C.blue,   countKey: "dc_made_to_bill_pending" },
    { id: "pr_bill",        label: "PR Made — Bill Pending",  icon: Receipt,      color: C.amber,  countKey: "pr_made_to_bill_pending" },
    { id: "direct_delivery",label: "Direct Site Delivery",    icon: Truck,        color: C.red,    countKey: "direct_site_delivery" },
    { id: "delivery_note",  label: "Delivery Note Pending",   icon: ClipboardList, color: C.orange, countKey: "direct_note_pending" },
  ];

  return (
    <Layout>
      {detail && <DetailOverlay id={detail} project={project} onClose={() => setDetail(null)} />}

      <div style={{ minHeight:"100vh", background:"#f0f2f5", padding:20, display:"flex", flexDirection:"column", gap:18 }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:900, color:"#111827", letterSpacing:"-0.02em" }}>Stores Department</h1>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"#9ca3af" }}>
              Live ERP tracking · <span style={{ fontWeight:600, color:"#6b7280" }}>{project || "All Projects"}</span>
            </p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <ProjectSelector value={project} onChange={setProject} />
            <button onClick={refetchAll}
              style={{ display:"flex", alignItems:"center", gap:6, background:"#fff", border:"1px solid #d1d5db", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:600, color:"#374151", cursor:"pointer" }}>
              <RefreshCw className={cn("w-3.5 h-3.5", counts.isFetching && "animate-spin")} /> Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:12 }}>
          {kpis.map(k => (
            <KPICard key={k.id}
              label={k.label}
              value={counts.isLoading ? "…" : (c[k.countKey] ?? "—")}
              icon={k.icon} color={k.color}
              onClick={() => setDetail(k.id)} />
          ))}
        </div>

        {/* Row 1: Gate Entry | DC Gate Out | PR Bill */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
          <PanelTable title="Gate Entry PR Pending"   rows={getRows(gateEntry)}      loading={gateEntry.isLoading}      filename="Gate_Entry_PR_Pending" accentColor={C.teal}   columns={SECTIONS.gate_entry.columns} />
          <PanelTable title="DC Gate Out Pending"     rows={getRows(dcGateout)}      loading={dcGateout.isLoading}      filename="DC_Gate_Out_Pending"   accentColor={C.blue}   columns={SECTIONS.dc_gateout.columns} />
          <PanelTable title="PR Made — Bill Pending"  rows={getRows(prBill)}         loading={prBill.isLoading}         filename="PR_Bill_Pending"       accentColor={C.amber}  columns={SECTIONS.pr_bill.columns} />
        </div>

        {/* Row 2: Direct Delivery | Delivery Note | Returnable DC */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
          <PanelTable title="Direct Site Delivery"    rows={getRows(directDelivery)} loading={directDelivery.isLoading} filename="Direct_Site_Delivery"  accentColor={C.red}    columns={SECTIONS.direct_delivery.columns} />
          <PanelTable title="Delivery Note Pending"   rows={getRows(deliveryNote)}   loading={deliveryNote.isLoading}   filename="Delivery_Note_Pending" accentColor={C.orange} columns={SECTIONS.delivery_note.columns} />
          <PanelTable title="Returnable DC"           rows={getRows(returnableDC)}   loading={returnableDC.isLoading}   filename="Returnable_DC"         accentColor={C.purple} columns={SECTIONS.returnable_dc.columns} />
        </div>

        {/* Row 3: Stock Indent | Material Issue | Petty Cash */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
          <PanelTable title="Stock Indent Pending"    rows={getRows(stockIndent)}    loading={stockIndent.isLoading}    filename="Stock_Indent_Pending"  accentColor={C.rose}   columns={SECTIONS.stock_indent.columns} />
          <PanelTable title="Material Issue Pending"  rows={getRows(materialIssue)}  loading={materialIssue.isLoading}  filename="Material_Issue_Pending" accentColor={C.navy}  columns={SECTIONS.material_issue.columns} />
          <PanelTable title="Petty Cash Entries"      rows={getRows(pettyCash)}      loading={pettyCash.isLoading}      filename="Petty_Cash"            accentColor={C.green}  columns={SECTIONS.petty_cash.columns} />
        </div>

        {/* Row 4: Project Dispute | Stock Summary */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <PanelTable title="Project Dispute"         rows={getRows(projectDispute)} loading={projectDispute.isLoading} filename="Project_Dispute"       accentColor={C.slate}  columns={SECTIONS.project_dispute.columns} />
          <StockSummaryPanel rows={getRows(stockSummary)} loading={stockSummary.isLoading} />
        </div>

      </div>
    </Layout>
  );
}
