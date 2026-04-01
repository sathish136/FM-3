import { useState, useMemo, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  Clock, TrendingUp, MessageCircle, BookOpen, Building2,
  CalendarDays, CalendarCheck, Calendar, HelpCircle,
  RefreshCw, Search, X, ArrowLeft, Settings, FileEdit,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type ProcSection = "proc_today" | "proc_yest" | "proc_mkt" | "proc_rd" | "proc_civil";
type PropSection = "prop_today" | "prop_yest" | "prop_last_week" | "prop_this_week" | "prop_last_month" | "prop_this_month";
type AnySection  = ProcSection | PropSection;

// Column schema variants
type ColSchema = "standard" | "yest" | "prop_project";

// ── Colors ─────────────────────────────────────────────────────────────────────

const PC = { teal:"#48c9b0", red:"#ec7063", amber:"#f5b041", purple:"#af7ac5", blue:"#5dade2" };
const RC = { teal:"#48c9b0", red:"#ec7063", dpurple:"#8e44ad", mpurple:"#9b59b6", navy:"#2980b9", green:"#27ae60" };

// ── Column definitions per schema ─────────────────────────────────────────────

interface ColDef { key: string; label: string; render?: (v: any, row?: any) => React.ReactNode; }

function AgeBadge({ value }: { value: any }) {
  const d = parseInt(String(value ?? ""));
  if (isNaN(d)) return <span style={{ color: "#9ca3af" }}>—</span>;
  const [bg, col] = d > 7 ? ["#fef2f2","#b91c1c"] : d > 3 ? ["#fffbeb","#b45309"] : ["#f0fdf4","#15803d"];
  return (
    <span style={{ background: bg, color: col, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
      <Clock style={{ width:9, height:9 } as any}/>{d}d
    </span>
  );
}

function ReqBadge({ value }: { value: any }) {
  const v = String(value ?? "").trim().toUpperCase();
  if (!v || v === "—") return <span style={{ color: "#9ca3af" }}>—</span>;
  const m: Record<string,[string,string]> = { ETP:["#fef3c7","#92400e"], STP:["#dbeafe","#1d4ed8"], ZLD:["#f3e8ff","#7c3aed"], WTP:["#dcfce7","#166534"], FSSAI:["#fce7f3","#9d174d"] };
  const [bg, col] = m[v] ?? ["#f3f4f6","#374151"];
  return <span style={{ background: bg, color: col, padding:"2px 8px", borderRadius:10, fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{v}</span>;
}

const COLS_STANDARD: ColDef[] = [
  { key: "date",        label: "Date" },
  { key: "company",     label: "Company Name" },
  { key: "capacity",    label: "Capacity" },
  { key: "requirement", label: "Requirement", render: v => <ReqBadge value={v} /> },
  { key: "age",         label: "Age",         render: v => <AgeBadge value={v} /> },
];

// Yesterday-elevated: no date, no age
const COLS_YEST: ColDef[] = [
  { key: "company",     label: "Company Name" },
  { key: "capacity",    label: "Capacity" },
  { key: "requirement", label: "Requirement", render: v => <ReqBadge value={v} /> },
];

// Proposal project: proposal_request, company, capacity
const COLS_PROP_PROJECT: ColDef[] = [
  { key: "proposal_request", label: "Proposal Request" },
  { key: "company",          label: "Company Name" },
  { key: "capacity",         label: "Capacity" },
];

function colsFor(schema: ColSchema): ColDef[] {
  if (schema === "yest")         return COLS_YEST;
  if (schema === "prop_project") return COLS_PROP_PROJECT;
  return COLS_STANDARD;
}

// ── Schema map ────────────────────────────────────────────────────────────────

const SCHEMA: Record<AnySection, ColSchema> = {
  proc_today: "standard", proc_yest: "yest",  proc_mkt: "standard",
  proc_rd:    "standard", proc_civil: "standard",
  prop_today: "standard", prop_yest: "yest",
  prop_last_week: "prop_project", prop_this_week: "prop_project",
  prop_last_month:"prop_project", prop_this_month:"prop_project",
};

// ── Metadata ──────────────────────────────────────────────────────────────────

const META: Record<AnySection, { label: string; color: string }> = {
  proc_today:      { label: "Overall Pending — Process",          color: PC.teal   },
  proc_yest:       { label: "Yesterday's Elevated — Process",     color: PC.red    },
  proc_mkt:        { label: "Clarification (Marketing) — Process",color: PC.amber  },
  proc_rd:         { label: "R&D — Process",                      color: PC.purple },
  proc_civil:      { label: "CIVIL — Process",                    color: PC.blue   },
  prop_today:      { label: "Today's Pending — Proposal",         color: RC.teal   },
  prop_yest:       { label: "Yesterday's Pending — Proposal",     color: RC.red    },
  prop_last_week:  { label: "Last Week — Proposal",               color: RC.mpurple},
  prop_this_week:  { label: "This Week — Proposal",               color: RC.navy   },
  prop_last_month: { label: "Last Month — Proposal",              color: RC.dpurple},
  prop_this_month: { label: "This Month — Proposal",              color: RC.green  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api/process-proposal/${path}`; }
function getRows(q: ReturnType<typeof useQuery>): Record<string,any>[] {
  const msg = (q.data as any)?.message;
  return Array.isArray(msg) ? msg : [];
}

// ── Panel Table ───────────────────────────────────────────────────────────────

function PanelTable({ title, rows, loading, accentColor, schema, onExpand }: {
  title: string; rows: Record<string,any>[]; loading?: boolean;
  accentColor: string; schema: ColSchema; onExpand: () => void;
}) {
  const cols = colsFor(schema);
  const [filters, setFilters] = useState<Record<string,string>>({});
  const setFilter = useCallback((key: string, val: string) => setFilters(p => ({ ...p, [key]: val })), []);

  const filtered = useMemo(() =>
    rows.filter(row => cols.every(c => { const f = filters[c.key]; return !f || String(row[c.key] ?? "").toLowerCase().includes(f.toLowerCase()); }))
  , [rows, filters, cols]);

  return (
    <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:10, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", borderBottom:"2px solid #f3f4f6" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ width:3, height:16, background:accentColor, borderRadius:2, display:"inline-block", flexShrink:0 }} />
          <span style={{ fontWeight:700, fontSize:12, color:"#111827" }}>{title}</span>
          <span style={{ background:accentColor, color:"#fff", fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:9 }}>
            {loading ? "…" : filtered.length}
          </span>
        </div>
        <button onClick={onExpand} style={{ background:"#f3f4f6", border:"1px solid #e5e7eb", borderRadius:6, padding:"3px 9px", fontSize:10, fontWeight:600, color:"#374151", cursor:"pointer" }}>
          View all →
        </button>
      </div>
      <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:200 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11.5 }}>
          <thead style={{ position:"sticky", top:0, zIndex:10 }}>
            <tr style={{ background:"#f9fafb", borderBottom:"1px solid #e5e7eb" }}>
              <th style={{ padding:"5px 7px", textAlign:"center", color:"#9ca3af", fontWeight:700, fontSize:9.5, width:26 }}>#</th>
              {cols.map(c => (
                <th key={c.key} style={{ padding:"5px 7px", textAlign:"left", color:"#6b7280", fontWeight:700, fontSize:9.5, textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>
                  {c.label}
                </th>
              ))}
            </tr>
            <tr style={{ background:"#fff", borderBottom:"2px solid #f3f4f6" }}>
              <td style={{ padding:"2px 4px" }} />
              {cols.map(c => (
                <td key={c.key} style={{ padding:"2px 4px" }}>
                  <input
                    style={{ width:"100%", border:"1px solid #e5e7eb", borderRadius:4, padding:"2px 5px", fontSize:10, color:"#374151", background:"#f9fafb", outline:"none", boxSizing:"border-box" }}
                    placeholder="Filter..."
                    value={filters[c.key] ?? ""}
                    onChange={e => setFilter(c.key, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={cols.length+1} style={{ padding:14, textAlign:"center", color:"#9ca3af", fontSize:11 }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={cols.length+1} style={{ padding:14, textAlign:"center", color:"#9ca3af", fontSize:11 }}>No records</td></tr>
            ) : filtered.map((row, i) => (
              <tr key={i} style={{ borderBottom:"1px solid #f3f4f6" }}
                onMouseEnter={e => (e.currentTarget.style.background="#f9fafb")}
                onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                <td style={{ padding:"5px 7px", textAlign:"center", color:"#9ca3af", fontSize:10, fontWeight:600 }}>{i+1}</td>
                {cols.map(c => (
                  <td key={c.key} style={{ padding:"5px 7px", color:"#374151", verticalAlign:"middle", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {c.render ? c.render(row[c.key], row) : (row[c.key] ?? "—")}
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

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ label, value, icon: Icon, color, onClick }: {
  label: string; value: any; icon: React.ElementType; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      style={{ background:color, border:"none", borderRadius:9, padding:"10px 11px", cursor:"pointer", textAlign:"left", width:"100%", boxShadow:"0 2px 6px rgba(0,0,0,0.14)", transition:"transform 0.12s, box-shadow 0.12s" }}
      onMouseEnter={e => { e.currentTarget.style.transform="scale(1.04)"; e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.2)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform="scale(1)";    e.currentTarget.style.boxShadow="0 2px 6px rgba(0,0,0,0.14)"; }}
    >
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ color:"rgba(255,255,255,0.9)", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", lineHeight:1.3 }}>{label}</span>
        <Icon style={{ width:14, height:14, color:"rgba(255,255,255,0.6)", flexShrink:0 } as any} />
      </div>
      <div style={{ color:"#fff", fontSize:24, fontWeight:900, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>
        {value != null && value !== "" ? value : "—"}
      </div>
    </button>
  );
}

// ── Detail Overlay ────────────────────────────────────────────────────────────

function DetailOverlay({ section, rows, onClose }: {
  section: AnySection; rows: Record<string,any>[]; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const meta  = META[section];
  const cols  = colsFor(SCHEMA[section]);

  useEffect(() => { setSearch(""); }, [section]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(row => cols.some(c => String(row[c.key] ?? "").toLowerCase().includes(q)));
  }, [rows, search, cols]);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, background:"#f0f2f5", display:"flex", flexDirection:"column" }}>
      <div style={{ background:meta.color, padding:"11px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, boxShadow:"0 2px 8px rgba(0,0,0,0.14)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={onClose} style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,255,255,0.2)", border:"none", borderRadius:7, padding:"5px 12px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            <ArrowLeft style={{ width:13, height:13 }} /> Back
          </button>
          <span style={{ color:"#fff", fontWeight:700, fontSize:14 }}>{meta.label}</span>
          <span style={{ background:"rgba(255,255,255,0.25)", color:"#fff", fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:10 }}>
            {filtered.length} records
          </span>
        </div>
        <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
          <Search style={{ position:"absolute", left:9, width:13, height:13, color:"rgba(255,255,255,0.6)", pointerEvents:"none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            style={{ paddingLeft:28, paddingRight:search?28:10, height:32, borderRadius:7, border:"1px solid rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.15)", color:"#fff", fontSize:12, outline:"none", width:200 }} />
          {search && <button onClick={() => setSearch("")} style={{ position:"absolute", right:8, background:"none", border:"none", cursor:"pointer", padding:0 }}>
            <X style={{ width:12, height:12, color:"rgba(255,255,255,0.7)" }} />
          </button>}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:20 }}>
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:10, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead style={{ position:"sticky", top:0, zIndex:10 }}>
              <tr style={{ background:"#f9fafb", borderBottom:"1px solid #e5e7eb" }}>
                <th style={{ padding:"9px 12px", textAlign:"center", color:"#9ca3af", fontWeight:700, fontSize:10, width:40 }}>#</th>
                {cols.map(c => (
                  <th key={c.key} style={{ padding:"9px 12px", textAlign:"left", color:"#6b7280", fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={cols.length+1} style={{ padding:32, textAlign:"center", color:"#9ca3af" }}>No records found</td></tr>
              ) : filtered.map((row, i) => (
                <tr key={i} style={{ borderBottom:"1px solid #f3f4f6" }}
                  onMouseEnter={e => (e.currentTarget.style.background="#f9fafb")}
                  onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                  <td style={{ padding:"9px 12px", textAlign:"center", color:"#9ca3af", fontSize:11, fontWeight:600 }}>{i+1}</td>
                  {cols.map(c => (
                    <td key={c.key} style={{ padding:"9px 12px", color:"#374151", verticalAlign:"middle" }}>
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

// ── Pane Label ────────────────────────────────────────────────────────────────

function PaneLabel({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 11px", background:color+"18", border:`1.5px solid ${color}44`, borderRadius:8, marginBottom:10, width:"fit-content" }}>
      <Icon style={{ width:13, height:13, color } as any} />
      <span style={{ fontSize:11, fontWeight:800, color, letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProcessProposalDashboard() {
  const [detail, setDetail] = useState<AnySection | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setDetail(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  function q(path: string) {
    return { queryKey: ["pp", path], queryFn: () => fetch(apiUrl(path)).then(r => r.json()), staleTime: 60_000 };
  }

  const qCounts    = useQuery<any>(q("counts"));
  const qPTod      = useQuery<any>(q("proc-today"));
  const qPYest     = useQuery<any>(q("proc-yest"));
  const qPMkt      = useQuery<any>(q("proc-mkt"));
  const qPRd       = useQuery<any>(q("proc-rd"));
  const qPCivil    = useQuery<any>(q("proc-civil"));
  const qRTod      = useQuery<any>(q("prop-today"));
  const qRYest     = useQuery<any>(q("prop-yest"));
  const qRLW       = useQuery<any>(q("prop-last-week"));
  const qRTW       = useQuery<any>(q("prop-this-week"));
  const qRLM       = useQuery<any>(q("prop-last-month"));
  const qRTM       = useQuery<any>(q("prop-this-month"));

  const c = (qCounts.data as any)?.message ?? {};
  const cnt = {
    proc_today:      c.proc_today      ?? getRows(qPTod).length,
    proc_yest:       c.proc_yest       ?? getRows(qPYest).length,
    proc_mkt:        c.proc_mkt        ?? getRows(qPMkt).length,
    proc_rd:         c.proc_rd         ?? getRows(qPRd).length,
    proc_civil:      c.proc_civil      ?? getRows(qPCivil).length,
    prop_today:      c.prop_today      ?? getRows(qRTod).length,
    prop_yest:       c.prop_yest       ?? getRows(qRYest).length,
    prop_last_week:  c.prop_last_week  ?? getRows(qRLW).length,
    prop_this_week:  c.prop_this_week  ?? getRows(qRTW).length,
    prop_last_month: c.prop_last_month ?? getRows(qRLM).length,
    prop_this_month: c.prop_this_month ?? getRows(qRTM).length,
  };

  const rowMap: Record<AnySection, Record<string,any>[]> = {
    proc_today: getRows(qPTod),  proc_yest: getRows(qPYest),
    proc_mkt:   getRows(qPMkt),  proc_rd:   getRows(qPRd),
    proc_civil: getRows(qPCivil),
    prop_today: getRows(qRTod),  prop_yest: getRows(qRYest),
    prop_last_week: getRows(qRLW), prop_this_week: getRows(qRTW),
    prop_last_month: getRows(qRLM), prop_this_month: getRows(qRTM),
  };

  const allQs = [qPTod, qPYest, qPMkt, qPRd, qPCivil, qRTod, qRYest, qRLW, qRTW, qRLM, qRTM];
  const isFetching = allQs.some(q => q.isFetching);
  function refetchAll() { allQs.forEach(q => q.refetch()); qCounts.refetch(); }

  const isSample = (qPTod.data as any)?._source === "sample";

  // Shorthand to expand a table
  const open = (s: AnySection) => () => setDetail(s);

  return (
    <Layout>
      {detail && <DetailOverlay section={detail} rows={rowMap[detail]} onClose={() => setDetail(null)} />}

      <div style={{ minHeight:"100vh", background:"#f0f2f5", padding:"14px 16px", display:"flex", flexDirection:"column", gap:12 }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <div>
            <h1 style={{ margin:0, fontSize:18, fontWeight:900, color:"#111827", letterSpacing:"-0.02em" }}>Process & Proposal Dashboard</h1>
            <p style={{ margin:"2px 0 0", fontSize:11, color:"#9ca3af" }}>
              Executive Overview
              {isSample && <span style={{ marginLeft:8, color:"#d97706", fontWeight:600 }}>· Sample Data (ERP not connected)</span>}
            </p>
          </div>
          <button onClick={refetchAll}
            style={{ display:"flex", alignItems:"center", gap:6, background:"#fff", border:"1px solid #d1d5db", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:600, color:"#374151", cursor:"pointer" }}>
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Split screen */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1px 1fr", alignItems:"start" }}>

          {/* ══ LEFT: PROCESS ══ */}
          <div style={{ paddingRight:14, display:"flex", flexDirection:"column", gap:10 }}>
            <PaneLabel icon={Settings} label="Process" color={PC.teal} />

            {/* 5 KPI cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:7 }}>
              <KPICard label="Today's Pending"       value={cnt.proc_today} icon={Clock}         color={PC.teal}   onClick={open("proc_today")} />
              <KPICard label="Yesterday's Elevated"  value={cnt.proc_yest}  icon={TrendingUp}    color={PC.red}    onClick={open("proc_yest")} />
              <KPICard label="Clarification (MKT)"   value={cnt.proc_mkt}   icon={MessageCircle} color={PC.amber}  onClick={open("proc_mkt")} />
              <KPICard label="R&D"                   value={cnt.proc_rd}    icon={BookOpen}      color={PC.purple} onClick={open("proc_rd")} />
              <KPICard label="Civil"                 value={cnt.proc_civil} icon={Building2}     color={PC.blue}   onClick={open("proc_civil")} />
            </div>

            {/* Row 1: Today + Yesterday */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
              <PanelTable title="Today's Pending (Overall)"   rows={rowMap.proc_today} loading={qPTod.isLoading}  accentColor={PC.teal}   schema="standard" onExpand={open("proc_today")} />
              <PanelTable title="Yesterday's Elevated"        rows={rowMap.proc_yest}  loading={qPYest.isLoading} accentColor={PC.red}    schema="yest"     onExpand={open("proc_yest")} />
            </div>

            {/* Row 2: MKT + RD */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
              <PanelTable title="Clarification (Marketing)"   rows={rowMap.proc_mkt}   loading={qPMkt.isLoading}  accentColor={PC.amber}  schema="standard" onExpand={open("proc_mkt")} />
              <PanelTable title="R&D"                         rows={rowMap.proc_rd}    loading={qPRd.isLoading}   accentColor={PC.purple} schema="standard" onExpand={open("proc_rd")} />
            </div>

            {/* Row 3: CIVIL full width */}
            <PanelTable title="CIVIL" rows={rowMap.proc_civil} loading={qPCivil.isLoading} accentColor={PC.blue} schema="standard" onExpand={open("proc_civil")} />
          </div>

          {/* Divider */}
          <div style={{ background:"#e5e7eb", alignSelf:"stretch" }} />

          {/* ══ RIGHT: PROPOSAL ══ */}
          <div style={{ paddingLeft:14, display:"flex", flexDirection:"column", gap:10 }}>
            <PaneLabel icon={FileEdit} label="Proposal" color={RC.dpurple} />

            {/* 6 KPI cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:7 }}>
              <KPICard label="Today's Pending"     value={cnt.prop_today}      icon={Clock}         color={RC.teal}    onClick={open("prop_today")} />
              <KPICard label="Yesterday's Pending" value={cnt.prop_yest}       icon={TrendingUp}    color={RC.red}     onClick={open("prop_yest")} />
              <KPICard label="Last Week"           value={cnt.prop_last_week}  icon={Calendar}      color={RC.mpurple} onClick={open("prop_last_week")} />
              <KPICard label="This Week"           value={cnt.prop_this_week}  icon={CalendarCheck} color={RC.navy}    onClick={open("prop_this_week")} />
              <KPICard label="Last Month"          value={cnt.prop_last_month} icon={HelpCircle}    color={RC.dpurple} onClick={open("prop_last_month")} />
              <KPICard label="This Month"          value={cnt.prop_this_month} icon={CalendarDays}  color={RC.green}   onClick={open("prop_this_month")} />
            </div>

            {/* Row 1: Today + Yesterday */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
              <PanelTable title="Today's Pending"     rows={rowMap.prop_today} loading={qRTod.isLoading}  accentColor={RC.teal}    schema="standard" onExpand={open("prop_today")} />
              <PanelTable title="Yesterday's Pending" rows={rowMap.prop_yest}  loading={qRYest.isLoading} accentColor={RC.red}     schema="yest"     onExpand={open("prop_yest")} />
            </div>

            {/* Row 2: Last Week + This Week */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
              <PanelTable title="Last Week Projects"  rows={rowMap.prop_last_week}  loading={qRLW.isLoading}  accentColor={RC.mpurple}  schema="prop_project" onExpand={open("prop_last_week")} />
              <PanelTable title="This Week Projects"  rows={rowMap.prop_this_week}  loading={qRTW.isLoading}  accentColor={RC.navy}     schema="prop_project" onExpand={open("prop_this_week")} />
            </div>

            {/* Row 3: Last Month + This Month */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
              <PanelTable title="Last Month Projects" rows={rowMap.prop_last_month} loading={qRLM.isLoading}  accentColor={RC.dpurple}  schema="prop_project" onExpand={open("prop_last_month")} />
              <PanelTable title="This Month Projects" rows={rowMap.prop_this_month} loading={qRTM.isLoading}  accentColor={RC.green}    schema="prop_project" onExpand={open("prop_this_month")} />
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
