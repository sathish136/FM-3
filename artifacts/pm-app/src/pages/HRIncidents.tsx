import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  AlertTriangle, Plus, Search, X, ChevronDown, Loader2,
  Shield, RefreshCw, Filter, User, Calendar, MapPin,
  Building2, Tag, FileText, CheckCircle2, Clock, XCircle,
  Eye, Pencil, Trash2, MoreHorizontal, Zap, AlertCircle,
  Users, Flag, ArrowUpRight, Send, ChevronRight,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;

/* ─── Types ──────────────────────────────────────────────────── */
type IncidentType = "Safety" | "HR Violation" | "Misconduct" | "Accident" | "Equipment Failure" | "Security" | "Other";
type Severity = "Critical" | "High" | "Medium" | "Low";
type IncidentStatus = "Open" | "Under Investigation" | "Resolved" | "Closed";

interface Incident {
  id: number;
  title: string;
  description: string | null;
  incident_type: IncidentType;
  severity: Severity;
  status: IncidentStatus;
  reporter_email: string | null;
  reporter_name: string | null;
  involved_employee: string | null;
  involved_employee_name: string | null;
  department: string | null;
  location: string | null;
  incident_date: string | null;
  resolution: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: string; open: string; investigating: string;
  resolved: string; closed: string; critical: string; high: string;
}

interface EmpOption {
  id: string; name: string; designation: string; department: string; avatar: string | null;
}

/* ─── Constants ──────────────────────────────────────────────── */
const INCIDENT_TYPES: IncidentType[] = ["Safety", "HR Violation", "Misconduct", "Accident", "Equipment Failure", "Security", "Other"];
const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low"];
const STATUSES: IncidentStatus[] = ["Open", "Under Investigation", "Resolved", "Closed"];
const DEPARTMENTS = ["Engineering", "HR", "Procurement", "Finance", "Operations", "IT", "Admin", "Marketing", "Sales"];

const SEV_CONFIG: Record<Severity, { bg: string; text: string; dot: string; border: string }> = {
  Critical: { bg: "#FFF1F2", text: "#BE123C", dot: "#F43F5E", border: "#FECDD3" },
  High:     { bg: "#FFF7ED", text: "#C2410C", dot: "#F97316", border: "#FED7AA" },
  Medium:   { bg: "#FFFBEB", text: "#B45309", dot: "#F59E0B", border: "#FDE68A" },
  Low:      { bg: "#F0FDF4", text: "#166534", dot: "#22C55E", border: "#BBF7D0" },
};

const STATUS_CONFIG: Record<IncidentStatus, { bg: string; text: string; icon: React.ElementType; border: string }> = {
  "Open":               { bg: "#EFF6FF", text: "#1D4ED8", icon: AlertCircle,     border: "#BFDBFE" },
  "Under Investigation":{ bg: "#FAF5FF", text: "#7C3AED", icon: Clock,           border: "#DDD6FE" },
  "Resolved":           { bg: "#F0FDF4", text: "#15803D", icon: CheckCircle2,    border: "#BBF7D0" },
  "Closed":             { bg: "#F8FAFC", text: "#475569", icon: XCircle,         border: "#CBD5E1" },
};

const TYPE_ICONS: Record<IncidentType, React.ElementType> = {
  "Safety": Shield, "HR Violation": AlertTriangle, "Misconduct": Flag,
  "Accident": Zap, "Equipment Failure": AlertCircle, "Security": Eye, "Other": FileText,
};

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function avatarGrad(name: string) {
  const colors = [
    ["#7C5CFC","#5B3FD8"], ["#2563EB","#1D4ED8"], ["#DB2777","#9D174D"],
    ["#D97706","#B45309"], ["#059669","#065F46"], ["#0891B2","#0E7490"],
  ];
  let n = 0; for (const c of name) n += c.charCodeAt(0);
  return colors[n % colors.length];
}
function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

/* ─── Avatar ─────────────────────────────────────────────────── */
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const [c1, c2] = avatarGrad(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg,${c1},${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.34,
      flexShrink: 0, boxShadow: `0 2px 8px ${c1}44`,
    }}>
      {initials(name)}
    </div>
  );
}

/* ─── Employee Search Dropdown ───────────────────────────────── */
function EmpPicker({ value, onChange, placeholder }: {
  value: { id: string; name: string } | null;
  onChange: (emp: { id: string; name: string } | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<EmpOption[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`${API}/users/mention?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(data => { setOpts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setOpts([]); setLoading(false); });
  }, [q, open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(v => !v)} style={{
        display: "flex", alignItems: "center", gap: 8,
        border: "1.5px solid #E5E7EB", borderRadius: 8,
        padding: "9px 12px", cursor: "pointer", background: "#F9F8FF",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          {value ? (
            <>
              <Avatar name={value.name} size={22}/>
              <span style={{ fontSize: 13.5, color: "#1A1035", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value.name}</span>
            </>
          ) : (
            <span style={{ fontSize: 13.5, color: "#9CA3AF" }}>{placeholder || "Select employee…"}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {value && (
            <button onClick={e => { e.stopPropagation(); onChange(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex", padding: 0 }}>
              <X size={12}/>
            </button>
          )}
          <ChevronDown size={13} color="#9CA3AF"/>
        </div>
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          background: "#fff", border: "1.5px solid #E5E0FF", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(124,92,252,0.14)", overflow: "hidden",
        }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #F0EBFF" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F9F8FF", borderRadius: 7, padding: "6px 10px" }}>
              <Search size={12} color="#9CA3AF"/>
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search employees…"
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "#1A1035", fontFamily: "inherit" }}/>
            </div>
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "12px 14px", color: "#9CA3AF", fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }}/> Loading…
              </div>
            ) : opts.length === 0 ? (
              <div style={{ padding: "12px 14px", color: "#9CA3AF", fontSize: 12.5 }}>No employees found</div>
            ) : opts.map(e => (
              <div key={e.id} onClick={() => { onChange({ id: e.id, name: e.name }); setOpen(false); setQ(""); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={el => (el.currentTarget.style.background = "#F3F0FF")}
                onMouseLeave={el => (el.currentTarget.style.background = "transparent")}>
                <Avatar name={e.name} size={28}/>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1035" }}>{e.name}</div>
                  {(e.designation || e.department) && (
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>{[e.designation, e.department].filter(Boolean).join(" · ")}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color, bg, border }: {
  label: string; value: number | string; icon: React.ElementType;
  color: string; bg: string; border: string;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "16px 18px",
      border: `1.5px solid ${border}`, display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={20} color={color}/>
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1A1035", letterSpacing: "-0.03em" }}>{value}</div>
        <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Incident Form ──────────────────────────────────────────── */
interface FormState {
  title: string; description: string; incident_type: IncidentType; severity: Severity;
  status: IncidentStatus; reporter: { id: string; name: string } | null;
  involved: { id: string; name: string } | null; department: string;
  location: string; incident_date: string; resolution: string;
}
const emptyForm = (): FormState => ({
  title: "", description: "", incident_type: "Other", severity: "Medium",
  status: "Open", reporter: null, involved: null, department: "", location: "",
  incident_date: new Date().toISOString().slice(0, 10), resolution: "",
});

function IncidentModal({ incident, onClose, onSaved, userEmail, userName }: {
  incident: Incident | null; onClose: () => void; onSaved: () => void;
  userEmail: string; userName: string;
}) {
  const [form, setForm] = useState<FormState>(() => {
    if (!incident) return { ...emptyForm(), reporter: userEmail ? { id: userEmail, name: userName } : null };
    return {
      title: incident.title, description: incident.description || "",
      incident_type: incident.incident_type, severity: incident.severity,
      status: incident.status,
      reporter: incident.reporter_email ? { id: incident.reporter_email, name: incident.reporter_name || incident.reporter_email } : null,
      involved: incident.involved_employee ? { id: incident.involved_employee, name: incident.involved_employee_name || incident.involved_employee } : null,
      department: incident.department || "", location: incident.location || "",
      incident_date: incident.incident_date ? incident.incident_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      resolution: incident.resolution || "",
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true); setError("");
    try {
      const body = {
        title: form.title, description: form.description,
        incident_type: form.incident_type, severity: form.severity, status: form.status,
        reporter_email: form.reporter?.id || null, reporter_name: form.reporter?.name || null,
        involved_employee: form.involved?.id || null, involved_employee_name: form.involved?.name || null,
        department: form.department || null, location: form.location || null,
        incident_date: form.incident_date || null, resolution: form.resolution || null,
      };
      const url = incident ? `${API}/hr/incidents/${incident.id}` : `${API}/hr/incidents`;
      const method = incident ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      onSaved();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 8,
    padding: "9px 12px", fontSize: 13.5, boxSizing: "border-box",
    outline: "none", fontFamily: "inherit", color: "#1A1035", background: "#F9F8FF",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase",
    letterSpacing: "0.07em", display: "block", marginBottom: 6,
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle, appearance: "none", cursor: "pointer",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(13,11,28,0.6)",
      backdropFilter: "blur(6px)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: 18, width: "100%", maxWidth: 620,
        maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        animation: "modalIn 0.2s ease",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: "1.5px solid #F0EBFF", position: "sticky", top: 0, background: "#fff", zIndex: 1, borderRadius: "18px 18px 0 0",
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#1A1035" }}>
              {incident ? "Edit Incident" : "Report New Incident"}
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF" }}>{incident ? `Incident #${incident.id}` : "Document a workplace incident"}</div>
          </div>
          <button onClick={onClose} style={{ background: "#F3F0FF", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", display: "flex" }}><X size={15} color="#7C5CFC"/></button>
        </div>

        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div style={{ background: "#FFF1F2", border: "1.5px solid #FECDD3", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#BE123C" }}>
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label style={labelStyle}>Incident Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="Brief description of the incident"
              style={inputStyle}/>
          </div>

          {/* Type + Severity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Incident Type</label>
              <select value={form.incident_type} onChange={e => set("incident_type", e.target.value as IncidentType)} style={selectStyle}>
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Severity</label>
              <select value={form.severity} onChange={e => set("severity", e.target.value as Severity)} style={selectStyle}>
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Status (edit only) */}
          {incident && (
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value as IncidentStatus)} style={selectStyle}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* Reporter + Involved */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Reported By</label>
              <EmpPicker value={form.reporter} onChange={v => set("reporter", v)} placeholder="Reporter…"/>
            </div>
            <div>
              <label style={labelStyle}>Involved Employee</label>
              <EmpPicker value={form.involved} onChange={v => set("involved", v)} placeholder="Involved person…"/>
            </div>
          </div>

          {/* Department + Location */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Department</label>
              <select value={form.department} onChange={e => set("department", e.target.value)} style={selectStyle}>
                <option value="">Select department…</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Location / Area</label>
              <input value={form.location} onChange={e => set("location", e.target.value)}
                placeholder="e.g. Site A, Office Floor 2…"
                style={inputStyle}/>
            </div>
          </div>

          {/* Date */}
          <div>
            <label style={labelStyle}>Incident Date</label>
            <input type="date" value={form.incident_date} onChange={e => set("incident_date", e.target.value)} style={inputStyle}/>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Describe what happened, timeline, and any witnesses…"
              rows={4}
              style={{ ...inputStyle, resize: "vertical", minHeight: 90 }}/>
          </div>

          {/* Resolution (edit only) */}
          {incident && (
            <div>
              <label style={labelStyle}>Resolution / Action Taken</label>
              <textarea value={form.resolution} onChange={e => set("resolution", e.target.value)}
                placeholder="Describe the resolution or corrective actions taken…"
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}/>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <button onClick={onClose} style={{ background: "none", border: "1.5px solid #E5E7EB", borderRadius: 9, padding: "10px 20px", fontSize: 13.5, cursor: "pointer", color: "#6B7280", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{
              background: "linear-gradient(135deg,#7C5CFC,#9D7FFF)",
              border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 13.5,
              fontWeight: 700, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
              boxShadow: "0 4px 14px rgba(124,92,252,0.4)", fontFamily: "inherit",
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }}/> : <Send size={14}/>}
              {incident ? "Save Changes" : "Report Incident"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Detail Panel ───────────────────────────────────────────── */
function DetailPanel({ incident, onClose, onEdit, onDelete, onStatusChange }: {
  incident: Incident; onClose: () => void; onEdit: () => void;
  onDelete: () => void; onStatusChange: (status: IncidentStatus) => void;
}) {
  const sev = SEV_CONFIG[incident.severity];
  const stat = STATUS_CONFIG[incident.status];
  const StatIcon = stat.icon;
  const TypeIcon = TYPE_ICONS[incident.incident_type] || FileText;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "stretch",
    }}>
      <div style={{ flex: 1, background: "rgba(13,11,28,0.3)", backdropFilter: "blur(2px)" }} onClick={onClose}/>
      <div style={{
        width: 460, background: "#fff", boxShadow: "-8px 0 40px rgba(124,92,252,0.12)",
        display: "flex", flexDirection: "column", overflowY: "auto",
        animation: "slideIn 0.22s ease",
        borderLeft: "1.5px solid #E5E0FF",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1.5px solid #F0EBFF", background: "#FDFCFF" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: sev.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${sev.border}` }}>
                  <TypeIcon size={15} color={sev.text}/>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: sev.text, background: sev.bg, border: `1px solid ${sev.border}`, borderRadius: 6, padding: "2px 8px" }}>{incident.severity}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: stat.text, background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: 6, padding: "2px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                  <StatIcon size={10}/>{incident.status}
                </span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1035", lineHeight: 1.3 }}>#{incident.id} — {incident.title}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{incident.incident_type} · Reported {fmtRelative(incident.created_at)}</div>
            </div>
            <button onClick={onClose} style={{ background: "#F3F0FF", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", display: "flex", flexShrink: 0 }}><X size={14} color="#7C5CFC"/></button>
          </div>
        </div>

        {/* Quick status change */}
        <div style={{ padding: "12px 22px", borderBottom: "1px solid #F5F3FF", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s];
            const SIcon = cfg.icon;
            const active = s === incident.status;
            return (
              <button key={s} onClick={() => onStatusChange(s)}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "5px 11px",
                  borderRadius: 7, border: `1.5px solid ${active ? cfg.border : "#E5E7EB"}`,
                  background: active ? cfg.bg : "#F9FAFB",
                  color: active ? cfg.text : "#6B7280",
                  fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: "pointer",
                  transition: "all 0.12s",
                }}>
                <SIcon size={11}/>{s}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: "16px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Key info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Reported By", value: incident.reporter_name || "—", icon: User },
              { label: "Involved", value: incident.involved_employee_name || "—", icon: Users },
              { label: "Department", value: incident.department || "—", icon: Building2 },
              { label: "Location", value: incident.location || "—", icon: MapPin },
              { label: "Date", value: fmtDate(incident.incident_date), icon: Calendar },
              { label: "Type", value: incident.incident_type, icon: Tag },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} style={{ background: "#FDFCFF", borderRadius: 10, padding: "11px 13px", border: "1.5px solid #F0EBFF" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <Icon size={11} color="#9CA3AF"/>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1035" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          {incident.description && (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Description</div>
              <div style={{ fontSize: 13.5, color: "#2D1F5E", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{incident.description}</div>
            </div>
          )}

          {/* Resolution */}
          {incident.resolution && (
            <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "14px 16px", border: "1.5px solid #BBF7D0" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <CheckCircle2 size={12}/> Resolution
              </div>
              <div style={{ fontSize: 13.5, color: "#14532D", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{incident.resolution}</div>
            </div>
          )}

          <div style={{ fontSize: 11, color: "#D1D5DB" }}>
            Created {fmtDate(incident.created_at)} · Updated {fmtRelative(incident.updated_at)}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1.5px solid #F0EBFF", display: "flex", gap: 10, background: "#FDFCFF" }}>
          <button onClick={onEdit} style={{
            flex: 1, background: "linear-gradient(135deg,#7C5CFC,#9D7FFF)",
            border: "none", borderRadius: 9, padding: "10px", fontSize: 13.5, fontWeight: 700,
            color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            boxShadow: "0 4px 14px rgba(124,92,252,0.35)",
          }}>
            <Pencil size={14}/> Edit Incident
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{ background: "#FFF1F2", border: "1.5px solid #FECDD3", borderRadius: 9, padding: "10px 14px", fontSize: 13.5, fontWeight: 700, color: "#BE123C", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Trash2 size={14}/>
            </button>
          ) : (
            <button onClick={onDelete} style={{ background: "#BE123C", border: "none", borderRadius: 9, padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Trash2 size={13}/> Confirm?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Incident Card ──────────────────────────────────────────── */
function IncidentCard({ incident, onClick }: { incident: Incident; onClick: () => void }) {
  const sev = SEV_CONFIG[incident.severity];
  const stat = STATUS_CONFIG[incident.status];
  const StatIcon = stat.icon;
  const TypeIcon = TYPE_ICONS[incident.incident_type] || FileText;

  return (
    <div onClick={onClick} style={{
      background: "#fff", borderRadius: 14, padding: "16px 18px",
      border: "1.5px solid #F0EBFF", cursor: "pointer",
      boxShadow: "0 2px 10px rgba(124,92,252,0.05)",
      transition: "all 0.14s",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C4B8FF"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(124,92,252,0.12)"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#F0EBFF"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 10px rgba(124,92,252,0.05)"; }}>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: sev.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${sev.border}`, flexShrink: 0 }}>
          <TypeIcon size={17} color={sev.text}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#9CA3AF" }}>#{incident.id}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: sev.text, background: sev.bg, border: `1px solid ${sev.border}`, borderRadius: 5, padding: "1px 7px" }}>{incident.severity}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: stat.text, background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: 5, padding: "1px 7px", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <StatIcon size={9}/>{incident.status}
            </span>
            <span style={{ fontSize: 10.5, color: "#D1D5DB", marginLeft: "auto" }}>{fmtRelative(incident.created_at)}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1035", marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{incident.title}</div>
          {incident.description && (
            <div style={{ fontSize: 12.5, color: "#6B7280", marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5 }}>
              {incident.description}
            </div>
          )}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {incident.reporter_name && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#9CA3AF" }}>
                <User size={11}/>{incident.reporter_name}
              </div>
            )}
            {incident.department && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#9CA3AF" }}>
                <Building2 size={11}/>{incident.department}
              </div>
            )}
            {incident.incident_date && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#9CA3AF" }}>
                <Calendar size={11}/>{fmtDate(incident.incident_date)}
              </div>
            )}
          </div>
        </div>
        <ArrowUpRight size={14} color="#D1D5DB" style={{ flexShrink: 0, marginTop: 2 }}/>
      </div>
    </div>
  );
}

interface UserScope {
  scope: "all" | "department" | "self";
  employee: { name: string; department?: string | null } | null;
  departments: string[];
  employee_ids: string[];
  roles: string[];
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function HRIncidents() {
  const { user } = useAuth();
  const userEmail = user?.email || "";
  const userName = user?.full_name || userEmail.split("@")[0];

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterType, setFilterType] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Incident | null>(null);
  const [viewing, setViewing] = useState<Incident | null>(null);

  const [userScope, setUserScope] = useState<UserScope>({ scope: "all", employee: null, departments: [], employee_ids: [], roles: [] });
  const [scopeLoading, setScopeLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;
    setScopeLoading(true);
    fetch(`${API}/hrms/user-scope?email=${encodeURIComponent(userEmail)}`)
      .then(r => r.ok ? r.json() : null)
      .then((sc: UserScope | null) => {
        setUserScope(sc ?? { scope: "all", employee: null, departments: [], employee_ids: [], roles: [] });
        setScopeLoading(false);
      })
      .catch(() => setScopeLoading(false));
  }, [userEmail]);

  const fetchData = useCallback(async () => {
    if (scopeLoading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (filterStatus) params.set("status", filterStatus);
      if (filterSeverity) params.set("severity", filterSeverity);
      if (filterType) params.set("type", filterType);
      if (userScope.scope === "department" && userScope.departments.length > 0) {
        params.set("department", userScope.departments[0]);
      }

      const [incRes, statRes] = await Promise.all([
        fetch(`${API}/hr/incidents?${params}`).then(r => r.json()),
        fetch(`${API}/hr/incidents/stats`).then(r => r.json()),
      ]);
      let allIncidents: Incident[] = incRes.incidents || [];

      if (userScope.scope === "self" && userEmail) {
        allIncidents = allIncidents.filter(inc =>
          inc.reporter_email?.toLowerCase() === userEmail.toLowerCase() ||
          inc.involved_employee?.toLowerCase() === userEmail.toLowerCase()
        );
      } else if (userScope.scope === "department" && userScope.departments.length > 1) {
        const deptSet = new Set(userScope.departments.map(d => d.toLowerCase()));
        allIncidents = allIncidents.filter(inc => inc.department && deptSet.has(inc.department.toLowerCase()));
      }

      setIncidents(allIncidents);
      setTotal(allIncidents.length);
      setStats(statRes);
    } catch {}
    setLoading(false);
  }, [search, filterStatus, filterSeverity, filterType, userScope, scopeLoading, userEmail]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (incident: Incident, status: IncidentStatus) => {
    await fetch(`${API}/hr/incidents/${incident.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setViewing(prev => prev ? { ...prev, status } : prev);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API}/hr/incidents/${id}`, { method: "DELETE" });
    setViewing(null); fetchData();
  };

  const hasFilters = search || filterStatus || filterSeverity || filterType;

  return (
    <Layout>
      <style>{`
        @keyframes modalIn { from{opacity:0;transform:translateY(10px) scale(0.97)}to{opacity:1;transform:none} }
        @keyframes slideIn { from{transform:translateX(30px);opacity:0}to{transform:none;opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F8F7FF", padding: "20px 24px 32px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,#7C5CFC,#9D7FFF)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(124,92,252,0.4)" }}>
                <AlertTriangle size={18} color="#fff"/>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#1A1035", letterSpacing: "-0.03em" }}>Incident Management</h1>
            </div>
            <p style={{ fontSize: 13, color: "#9CA3AF", marginLeft: 48 }}>HR · Track and resolve workplace incidents</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={fetchData} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", border: "1.5px solid #E5E0FF", borderRadius: 9, background: "#fff", cursor: "pointer", fontSize: 13, color: "#7C5CFC", fontWeight: 600 }}>
              <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }}/> Refresh
            </button>
            <a href="https://erp.wttint.com/app/incident" target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 18px",
              background: "linear-gradient(135deg,#7C5CFC,#9D7FFF)", border: "none",
              borderRadius: 9, color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(124,92,252,0.4)", textDecoration: "none",
            }}>
              <Plus size={15}/> Report Incident
            </a>
          </div>
        </div>

        {/* ── Stats ── */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
            <StatCard label="Total" value={stats.total} icon={FileText} color="#7C5CFC" bg="#F3F0FF" border="#E5E0FF"/>
            <StatCard label="Open" value={stats.open} icon={AlertCircle} color="#1D4ED8" bg="#EFF6FF" border="#BFDBFE"/>
            <StatCard label="Investigating" value={stats.investigating} icon={Clock} color="#7C3AED" bg="#FAF5FF" border="#DDD6FE"/>
            <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} color="#15803D" bg="#F0FDF4" border="#BBF7D0"/>
            <StatCard label="Critical" value={stats.critical} icon={Zap} color="#BE123C" bg="#FFF1F2" border="#FECDD3"/>
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{
          display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap",
          background: "#fff", borderRadius: 12, padding: "12px 14px",
          border: "1.5px solid #F0EBFF", boxShadow: "0 2px 10px rgba(124,92,252,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#F9F8FF", borderRadius: 8, padding: "7px 12px", border: "1.5px solid #E5E7EB", flex: 1, minWidth: 200 }}>
            <Search size={13} color="#9CA3AF"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search incidents…"
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "#1A1035", fontFamily: "inherit" }}/>
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}><X size={11} color="#9CA3AF"/></button>}
          </div>

          {[
            { label: "Status", value: filterStatus, onChange: setFilterStatus, opts: STATUSES },
            { label: "Severity", value: filterSeverity, onChange: setFilterSeverity, opts: SEVERITIES },
            { label: "Type", value: filterType, onChange: setFilterType, opts: INCIDENT_TYPES },
          ].map(({ label, value, onChange, opts }) => (
            <select key={label} value={value} onChange={e => onChange(e.target.value)}
              style={{
                border: `1.5px solid ${value ? "#C4B8FF" : "#E5E7EB"}`, borderRadius: 8,
                padding: "7px 28px 7px 12px", fontSize: 13, cursor: "pointer",
                background: value ? "#F3F0FF" : "#F9F8FF", color: value ? "#7C5CFC" : "#6B7280",
                fontWeight: value ? 700 : 400, appearance: "none", outline: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
                fontFamily: "inherit",
              }}>
              <option value="">{label}: All</option>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}

          {hasFilters && (
            <button onClick={() => { setSearch(""); setFilterStatus(""); setFilterSeverity(""); setFilterType(""); }}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", border: "1.5px solid #FECDD3", borderRadius: 8, background: "#FFF1F2", cursor: "pointer", fontSize: 12.5, color: "#BE123C", fontWeight: 600 }}>
              <X size={11}/> Clear filters
            </button>
          )}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <Loader2 size={32} color="#7C5CFC" style={{ animation: "spin 1s linear infinite" }}/>
              <div style={{ fontSize: 14, color: "#9CA3AF" }}>Loading incidents…</div>
            </div>
          </div>
        ) : incidents.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#7C5CFC,#9D7FFF)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "0 8px 32px rgba(124,92,252,0.3)" }}>
              <Shield size={32} color="#fff"/>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1A1035", marginBottom: 6 }}>
              {hasFilters ? "No incidents match your filters" : "No incidents reported yet"}
            </div>
            <div style={{ fontSize: 13.5, color: "#9CA3AF", marginBottom: 20 }}>
              {hasFilters ? "Try adjusting your filters" : "Report the first workplace incident to get started"}
            </div>
            {!hasFilters && (
              <a href="https://erp.wttint.com/app/incident" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", background: "linear-gradient(135deg,#7C5CFC,#9D7FFF)", border: "none", borderRadius: 9, color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(124,92,252,0.4)", textDecoration: "none" }}>
                <Plus size={15}/> Report First Incident
              </a>
            )}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: "#9CA3AF", marginBottom: 12, fontWeight: 600 }}>
              Showing {incidents.length} of {total} incident{total !== 1 ? "s" : ""}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(380px,1fr))", gap: 14 }}>
              {incidents.map(inc => (
                <IncidentCard key={inc.id} incident={inc} onClick={() => setViewing(inc)}/>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {(showCreate || editing) && (
        <IncidentModal
          incident={editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSaved={() => { setShowCreate(false); setEditing(null); fetchData(); }}
          userEmail={userEmail}
          userName={userName}
        />
      )}

      {viewing && (
        <DetailPanel
          incident={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
          onDelete={() => handleDelete(viewing.id)}
          onStatusChange={s => handleStatusChange(viewing, s)}
        />
      )}
    </Layout>
  );
}
