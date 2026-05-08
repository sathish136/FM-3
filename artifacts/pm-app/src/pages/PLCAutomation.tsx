import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Loader2, Trash2, Printer, X, Zap,
  ChevronDown, Clock, CircleCheck, Circle,
  Phone, Cpu, Wifi, User, PhoneCall, Mail, Send,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Status = "Open" | "In Progress" | "Closed";

interface Employee { id: string; name: string; designation: string; label: string; }
interface Project  { code: string; name: string; label: string; status?: string; }
interface Spare    { part_name: string; part_no: string; qty: string; remarks: string; }

interface SiteCall {
  id?: number;
  call_no?: string;
  call_type?: string;
  project_number?: string;
  project_name?: string;
  site_coordinator_name?: string;
  site_coordinator_phone?: string;
  customer_email?: string;
  call_received_at?: string;
  work_started_at?: string;
  work_completed_at?: string;
  attended_by?: Employee[];
  issue_details?: string;
  spares_changed?: Spare[];
  electrical_issue?: boolean;
  electrical_issue_desc?: string;
  electrical_team?: Employee[];
  status?: Status;
  root_cause?: string;
  action_taken?: string;
  remarks?: string;
  created_by?: string;
  created_at?: string;
}

const STATUS_META: Record<Status, { color: string; bg: string; icon: typeof Circle }> = {
  "Open":        { color: "text-red-700",   bg: "bg-red-100",    icon: Circle      },
  "In Progress": { color: "text-amber-700", bg: "bg-amber-100",  icon: Clock       },
  "Closed":      { color: "text-green-700", bg: "bg-green-100",  icon: CircleCheck },
};

function fmtDT(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Project Dropdown ────────────────────────────────────────────────────────
function ProjectDropdown({ value, onChange }: { value: string; onChange: (p: Project) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [erpFailed, setErpFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pickedRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}/api/workshop/erp-projects`)
      .then(r => r.json())
      .then(d => { setProjects(d.projects ?? []); if ((d.projects ?? []).length === 0) setErpFailed(true); })
      .catch(() => setErpFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = q.trim()
    ? projects.filter(p => p.label.toLowerCase().includes(q.toLowerCase()))
    : projects;

  const commitFreeText = () => {
    if (pickedRef.current) { pickedRef.current = false; return; }
    if (q.trim()) {
      const parts = q.trim().split(" - ");
      const code = parts.length > 1 ? parts[0].trim() : "";
      const name = parts.length > 1 ? parts.slice(1).join(" - ").trim() : q.trim();
      onChange({ code, name, label: q.trim() });
    }
    setOpen(false);
  };

  const pickProject = (p: Project) => {
    pickedRef.current = true;
    onChange(p);
    setQ(p.label);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-400">
        <input
          className="flex-1 px-3 py-2.5 text-sm bg-white outline-none"
          placeholder={erpFailed ? "Type project no. or name (e.g. WTT-001 - ProjectName)…" : "Search project…"}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); onChange({ code: "", name: e.target.value, label: e.target.value }); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(commitFreeText, 150)}
          onKeyDown={e => { if (e.key === "Enter") { commitFreeText(); } }}
        />
        <button type="button" className="px-3 text-gray-400 hover:text-gray-600" onClick={() => setOpen(v => !v)}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtered.map(p => (
            <button
              key={p.code}
              type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0"
              onMouseDown={() => { pickedRef.current = true; }}
              onClick={() => pickProject(p)}
            >
              <span className="font-mono text-xs text-blue-700 mr-1">{p.code}</span>
              <span className="text-gray-800">{p.name}</span>
              {p.status === "Completed" && (
                <span className="ml-1.5 inline-block text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full leading-none">Completed</span>
              )}
            </button>
          ))}
        </div>
      )}
      {erpFailed && !open && q.trim() === "" && (
        <p className="text-[10px] text-amber-600 mt-1">ERP connection unavailable — type project details manually</p>
      )}
    </div>
  );
}

// ─── Employee Multi-Select ────────────────────────────────────────────────────
function EmpMultiSelect({
  selected, onChange, placeholder,
}: { selected: Employee[]; onChange: (v: Employee[]) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`${BASE}/api/plc/erp-employees?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        setResults(d.employees ?? []);
      } catch {}
      setLoading(false);
    }, 300);
  }, [q]);

  const add = (emp: Employee) => {
    if (!selected.find(s => s.id === emp.id)) onChange([...selected, emp]);
    setQ(""); setResults([]);
  };
  const remove = (id: string) => onChange(selected.filter(s => s.id !== id));

  return (
    <div className="relative" ref={ref}>
      <div
        className="min-h-[42px] flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-400 bg-white cursor-text"
        onClick={() => { setOpen(true); (ref.current?.querySelector("input") as HTMLInputElement)?.focus(); }}
      >
        {selected.map(e => (
          <span key={e.id} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full">
            {e.name}
            {e.designation && <span className="text-blue-500 text-[10px]">({e.designation})</span>}
            <button type="button" onClick={ev => { ev.stopPropagation(); remove(e.id); }}><X className="w-3 h-3" /></button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[140px] text-sm outline-none bg-transparent px-1"
          placeholder={selected.length === 0 ? (placeholder || "Type to search employee…") : ""}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 self-center" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {results.map(e => (
            <button
              key={e.id}
              type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0"
              onClick={() => add(e)}
            >
              <span className="font-medium text-gray-900">{e.name}</span>
              {e.designation && <span className="text-xs text-gray-400 ml-2">{e.designation}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Print helper: open new window with only the document ─────────────────────
function printDoc(el: HTMLElement | null) {
  if (!el) return;
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(n => n.outerHTML)
    .join("\n");
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">${styles}<style>*,*::before,*::after{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}</style></head><body style="margin:0;background:#fff">${el.outerHTML}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 600);
}

// ─── Print View ──────────────────────────────────────────────────────────────
function PrintView({ call, onClose }: { call: SiteCall; onClose: () => void }) {
  const { toast } = useToast();
  const attended = Array.isArray(call.attended_by) ? call.attended_by : [];
  const spares   = Array.isArray(call.spares_changed) ? call.spares_changed : [];
  const elecTeam = Array.isArray(call.electrical_team) ? call.electrical_team : [];
  const [emailSending, setEmailSending] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  const reportDate = call.call_received_at || call.created_at || "";
  const fmtDate = (s: string) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  };

  const sendEmail = async () => {
    if (!call.customer_email) {
      toast({ title: "No customer email set", description: "Edit this record to add a customer email address first.", variant: "destructive" });
      return;
    }
    setEmailSending(true);
    try {
      const r = await fetch(`${BASE}/api/plc/site-calls/${call.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: call.customer_email }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to send email");
      toast({ title: "Email sent!", description: `Report sent to ${data.sent_to}` });
    } catch (e: any) {
      toast({ title: "Email failed", description: e.message, variant: "destructive" });
    }
    setEmailSending(false);
  };

  const SH = ({ title, color = "bg-blue-900" }: { title: string; color?: string }) => (
    <div className={cn("px-4 py-1.5 text-white text-[10px] font-bold uppercase tracking-[0.12em]", color)}>
      {title}
    </div>
  );

  const Field = ({ label, value, mono }: { label: string; value?: string; mono?: boolean }) => (
    <div className="px-4 py-2">
      <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={cn("text-sm text-gray-900", mono && "font-mono font-bold text-blue-900")}>{value || "—"}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 overflow-y-auto print:static print:overflow-visible print:bg-white">
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-slate-900 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Wifi className="w-4 h-4 text-purple-300" />
          <span className="font-semibold text-sm">Online Support Call — {call.call_no || `OSC-${String(call.id).padStart(4,"0")}`}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={sendEmail}
            disabled={emailSending}
            title={call.customer_email ? `Send to ${call.customer_email}` : "No customer email set"}
            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg text-sm font-medium"
          >
            {emailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {emailSending ? "Sending…" : "Email Report"}
          </button>
          <button onClick={() => printDoc(docRef.current)} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
            <X className="w-3.5 h-3.5" /> Close
          </button>
        </div>
      </div>

      <div ref={docRef} className="max-w-[794px] mx-auto my-6 print:my-0 print:mx-0 bg-white shadow-xl print:shadow-none font-sans text-gray-900">

        {/* ── HEADER ───────────────────────────────────────────── */}
        <div className="flex border-b-[3px] border-blue-900">
          {/* Logo */}
          <div className="w-40 shrink-0 flex flex-col items-center justify-center py-4 px-3 border-r border-blue-200 bg-blue-50">
            <img src={`${BASE}/wtt-logo.png`} alt="WTT" className="w-32 h-32 object-contain" />
          </div>
          {/* Title */}
          <div className="flex-1 flex flex-col items-center justify-center py-4 px-6 text-center">
            <div className="text-[11px] font-bold tracking-[0.3em] text-blue-800 uppercase mb-1">WTT International</div>
            <div className="text-[22px] font-black tracking-wide text-blue-950 uppercase leading-tight">Online Support</div>
            <div className="text-[18px] font-black tracking-wide text-blue-950 uppercase leading-tight">Call Report</div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 bg-purple-100 border border-purple-300 rounded-full">
              <Wifi className="w-3 h-3 text-purple-700" />
              <span className="text-[10px] font-bold text-purple-800 tracking-wide uppercase">Online Support</span>
            </div>
          </div>
          {/* Doc Info */}
          <div className="w-44 shrink-0 flex flex-col justify-center gap-0 border-l border-blue-200 bg-blue-50">
            {[
              { k: "Call No.", v: call.call_no || `OSC-${String(call.id).padStart(4,"0")}`, bold: true },
              { k: "Date",    v: reportDate ? fmtDate(reportDate) : "—" },
              { k: "Status",  v: call.status || "Open" },
            ].map(({ k, v, bold }) => (
              <div key={k} className="px-3 py-2 border-b border-blue-100 last:border-b-0">
                <div className="text-[9px] font-semibold text-blue-500 uppercase tracking-wider">{k}</div>
                <div className={cn("text-xs mt-0.5", bold ? "font-black text-blue-900 font-mono" : "font-semibold text-gray-800",
                  v === "Closed" ? "text-green-700" : v === "In Progress" ? "text-amber-700" : v === "Open" ? "text-red-700" : ""
                )}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PROJECT & TEAM ─────────────────────────────────── */}
        <div className="border-b border-gray-200">
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            <div className="grid grid-cols-2 divide-x divide-gray-200 col-span-2">
              <Field label="Project No." value={call.project_number} mono />
              <Field label="Project Name" value={call.project_name} />
            </div>
          </div>
          <div className="border-t border-gray-200 grid grid-cols-3 divide-x divide-gray-200">
            <Field label="Site Coordinator" value={call.site_coordinator_name} />
            <Field label="Contact Number" value={call.site_coordinator_phone} />
            <div className="px-4 py-2">
              <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Attended By</div>
              <div className="text-sm text-gray-900">
                {attended.length > 0 ? attended.map(e => e.name + (e.designation ? ` (${e.designation})` : "")).join(", ") : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* ── TIMING ─────────────────────────────────────────── */}
        <div className="border-b border-gray-200">
          <SH title="Timing Details" />
          <div className="grid grid-cols-3 divide-x divide-gray-200">
            {[
              { label: "Call Received",  value: call.call_received_at  },
              { label: "Work Started",   value: call.work_started_at   },
              { label: "Work Completed", value: call.work_completed_at },
            ].map(t => (
              <div key={t.label} className="px-4 py-2">
                <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{t.label}</div>
                <div className="text-sm font-semibold text-gray-900">{fmtDT(t.value)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CUSTOMER COMPLAINT ──────────────────────────────── */}
        <div className="border-b border-gray-200">
          <SH title="Customer Complaint" />
          <div className="px-4 py-3 min-h-[60px] text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
            {call.issue_details || <span className="text-gray-400 italic">No complaint details provided.</span>}
          </div>
        </div>

        {/* ── ELECTRICAL (if applicable) ──────────────────────── */}
        {call.electrical_issue && (
          <div className="border-b border-gray-200">
            <SH title="Electrical Issue" color="bg-amber-700" />
            <div className="grid grid-cols-2 divide-x divide-gray-200">
              <Field label="Electrical Issue Description" value={call.electrical_issue_desc} />
              <div className="px-4 py-2">
                <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Assigned Electrical Team</div>
                <div className="text-sm text-gray-900">
                  {elecTeam.length > 0 ? elecTeam.map(e => e.name + (e.designation ? ` (${e.designation})` : "")).join(", ") : "—"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SOLUTION ───────────────────────────────────────── */}
        <div className="border-b border-gray-200">
          <SH title="Solution" />
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            <div className="px-4 py-3">
              <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Root Cause</div>
              <div className="text-sm text-gray-900 whitespace-pre-wrap min-h-[50px] leading-relaxed">{call.root_cause || "—"}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Action Taken</div>
              <div className="text-sm text-gray-900 whitespace-pre-wrap min-h-[50px] leading-relaxed">{call.action_taken || "—"}</div>
            </div>
          </div>
          {call.remarks && (
            <div className="border-t border-gray-200 px-4 py-2">
              <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Remarks</div>
              <div className="text-sm text-gray-900">{call.remarks}</div>
            </div>
          )}
        </div>

        {/* ── SPARES ─────────────────────────────────────────── */}
        {spares.length > 0 && (
          <div className="border-b border-gray-200">
            <SH title="Spares / Parts Changed" />
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 w-7 border-r border-gray-200">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 border-r border-gray-200">Part Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 w-28 border-r border-gray-200">Part No.</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-500 w-14 border-r border-gray-200">Qty</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {spares.map((s, i) => (
                  <tr key={i} className={cn("border-b border-gray-100", i % 2 === 1 && "bg-gray-50/60")}>
                    <td className="px-3 py-1.5 text-gray-400 border-r border-gray-100">{i + 1}</td>
                    <td className="px-3 py-1.5 font-medium text-gray-900 border-r border-gray-100">{s.part_name}</td>
                    <td className="px-3 py-1.5 font-mono text-blue-800 border-r border-gray-100">{s.part_no}</td>
                    <td className="px-3 py-1.5 text-center border-r border-gray-100">{s.qty}</td>
                    <td className="px-3 py-1.5 text-gray-600">{s.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── SIGNATURES ─────────────────────────────────────── */}
        <div>
          <SH title="Acknowledgement &amp; Signatures" />
          <div className="grid grid-cols-3 divide-x divide-gray-200">
            {[
              { role: "Technician", label: "Technician Signature & Name" },
              { role: "Supervisor", label: "Supervisor Signature & Name" },
              { role: "Customer",   label: "Customer Signature & Name"   },
            ].map(({ label }) => (
              <div key={label} className="px-5 py-5">
                <div className="h-10 mb-3" />
                <div className="border-t-2 border-gray-400 pt-1.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-400 w-10 shrink-0">Name:</span>
                    <div className="flex-1 border-b border-dotted border-gray-300 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-400 w-10 shrink-0">Date:</span>
                    <div className="flex-1 border-b border-dotted border-gray-300 h-4" />
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 text-center mt-1.5 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-[3px] border-blue-900 bg-blue-50 px-4 py-2 flex items-center justify-between">
          <span className="text-[9px] text-blue-700 font-semibold">WTT International</span>
          <span className="text-[9px] text-gray-400">
            {call.created_by ? `Prepared by: ${call.created_by}` : ""} · Generated: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Site Call Form Modal ─────────────────────────────────────────────────────
function SiteCallModal({
  initial, onClose, onSaved,
}: {
  initial?: SiteCall;
  onClose: () => void;
  onSaved: (call?: SiteCall) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEdit = !!initial?.id;

  const [projectNumber,  setProjectNumber]  = useState(initial?.project_number ?? "");
  const [projectName,    setProjectName]    = useState(initial?.project_name   ?? "");
  const [projectSearch,  setProjectSearch]  = useState(
    initial?.project_number ? `${initial.project_number} - ${initial.project_name}` : ""
  );
  const [siteCoordName,  setSiteCoordName]  = useState(initial?.site_coordinator_name  ?? "");
  const [siteCoordPhone, setSiteCoordPhone] = useState(initial?.site_coordinator_phone ?? "");
  const [customerEmail,  setCustomerEmail]  = useState(initial?.customer_email ?? "");
  const [attendedBy,     setAttendedBy]     = useState<Employee[]>(Array.isArray(initial?.attended_by)    ? initial.attended_by    : []);
  const [electricalTeam, setElectricalTeam] = useState<Employee[]>(Array.isArray(initial?.electrical_team) ? initial.electrical_team : []);
  const [issueDetails,   setIssueDetails]   = useState(initial?.issue_details      ?? "");
  const [electricalIssue,  setElectricalIssue]  = useState(initial?.electrical_issue   ?? false);
  const [electricalDesc,   setElectricalDesc]   = useState(initial?.electrical_issue_desc ?? "");
  const [status,         setStatus]         = useState<Status>(initial?.status as Status ?? "Open");
  const [rootCause,      setRootCause]      = useState(initial?.root_cause    ?? "");
  const [actionTaken,    setActionTaken]    = useState(initial?.action_taken  ?? "");
  const [remarks,        setRemarks]        = useState(initial?.remarks       ?? "");
  const [callReceivedAt, setCallReceivedAt] = useState(initial?.call_received_at  ?? "");
  const [workStartedAt,  setWorkStartedAt]  = useState(initial?.work_started_at   ?? "");
  const [workCompletedAt, setWorkCompletedAt] = useState(initial?.work_completed_at ?? "");
  const [spares, setSpares] = useState<Spare[]>(
    Array.isArray(initial?.spares_changed) && initial.spares_changed.length > 0
      ? initial.spares_changed
      : [{ part_name: "", part_no: "", qty: "", remarks: "" }]
  );
  const [saving, setSaving] = useState(false);

  const inputCls   = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white";
  const sectionCls = "text-xs font-bold uppercase tracking-wider mb-4 pb-1.5 border-b-2 text-blue-800 border-blue-200";

  const addSpare    = () => setSpares(s => [...s, { part_name: "", part_no: "", qty: "", remarks: "" }]);
  const removeSpare = (i: number) => setSpares(s => s.filter((_, idx) => idx !== i));
  const updateSpare = (i: number, field: keyof Spare, v: string) =>
    setSpares(s => s.map((row, idx) => idx === i ? { ...row, [field]: v } : row));

  const save = async (andPrint = false) => {
    if (!projectName.trim() && !projectSearch.trim()) {
      toast({ title: "Please select a project", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const payload: SiteCall = {
        call_type: "Online Support",
        project_number: projectNumber, project_name: projectName || projectSearch,
        site_coordinator_name:  siteCoordName  || undefined,
        site_coordinator_phone: siteCoordPhone || undefined,
        customer_email:         customerEmail  || undefined,
        call_received_at:  callReceivedAt  || undefined,
        work_started_at:   workStartedAt   || undefined,
        work_completed_at: workCompletedAt || undefined,
        attended_by: attendedBy,
        issue_details: issueDetails,
        spares_changed: spares.filter(s => s.part_name.trim()),
        electrical_issue: electricalIssue,
        electrical_issue_desc: electricalDesc || undefined,
        electrical_team: electricalTeam,
        status,
        root_cause:   rootCause   || undefined,
        action_taken: actionTaken || undefined,
        remarks:      remarks     || undefined,
        created_by:   user?.email,
      };

      const url    = isEdit ? `${BASE}/api/plc/site-calls/${initial!.id}` : `${BASE}/api/plc/site-calls`;
      const method = isEdit ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      const saved: SiteCall = isEdit ? { ...initial, ...payload } : await r.json();
      toast({ title: isEdit ? "Call updated" : "Online support call saved" });
      onSaved(andPrint ? saved : undefined);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 overflow-y-auto py-6">
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-900 to-purple-700 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Wifi className="w-5 h-5 text-purple-200" />
            <div>
              <h2 className="font-bold text-white text-lg">{isEdit ? "Edit Online Support Call" : "New Online Support Call"}</h2>
              <p className="text-purple-200 text-xs">PLC &amp; Automation · Online Support</p>
            </div>
          </div>
          <button onClick={onClose} className="text-purple-200 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-7 max-h-[78vh] overflow-y-auto">

          {/* ── Project & Status ── */}
          <section>
            <h3 className={sectionCls}>Project &amp; Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Project *</label>
                <ProjectDropdown
                  value={projectSearch}
                  onChange={p => { setProjectNumber(p.code); setProjectName(p.name); setProjectSearch(p.label); }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Status</label>
                <select className={inputCls} value={status} onChange={e => setStatus(e.target.value as Status)}>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Closed</option>
                </select>
              </div>
            </div>
          </section>

          {/* ── Site Coordinator ── */}
          <section>
            <h3 className={sectionCls}>Site Coordination &amp; Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" /> Coordinator Name
                </label>
                <input className={inputCls} placeholder="e.g. Ramesh Kumar" value={siteCoordName} onChange={e => setSiteCoordName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-gray-400" /> Contact Number
                </label>
                <input className={inputCls} placeholder="e.g. +91 98765 43210" value={siteCoordPhone} onChange={e => setSiteCoordPhone(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" /> Customer Email <span className="text-gray-400 font-normal">(report will be sent here)</span>
                </label>
                <input
                  className={inputCls}
                  type="email"
                  placeholder="e.g. customer@example.com"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* ── Attended By ── */}
          <section>
            <h3 className={sectionCls}>Team Attended</h3>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Attended By</label>
            <EmpMultiSelect selected={attendedBy} onChange={setAttendedBy} placeholder="Search & add team members…" />
          </section>

          {/* ── Timing (Online: 3 fields) ── */}
          <section>
            <h3 className={sectionCls}>Timing Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Call Received",  val: callReceivedAt,  set: setCallReceivedAt  },
                { label: "Work Started",   val: workStartedAt,    set: setWorkStartedAt    },
                { label: "Work Completed", val: workCompletedAt,  set: setWorkCompletedAt  },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">{label}</label>
                  <input type="datetime-local" className={inputCls} value={val} onChange={e => set(e.target.value)} />
                </div>
              ))}
            </div>
          </section>

          {/* ── Issue ── */}
          <section>
            <h3 className={sectionCls}>Issue Details</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Issue Description</label>
                <textarea
                  className={cn(inputCls, "resize-none")}
                  rows={4}
                  value={issueDetails}
                  onChange={e => setIssueDetails(e.target.value)}
                  placeholder="Describe the issue…"
                />
              </div>

              <div
                className={cn(
                  "rounded-xl border-2 p-4 transition-all cursor-pointer",
                  electricalIssue ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-gray-50 hover:border-amber-300"
                )}
                onClick={() => setElectricalIssue(v => !v)}
              >
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-amber-600"
                    checked={electricalIssue}
                    onChange={e => { e.stopPropagation(); setElectricalIssue(e.target.checked); }}
                    onClick={e => e.stopPropagation()}
                  />
                  <Zap className={cn("w-5 h-5", electricalIssue ? "text-amber-600" : "text-gray-400")} />
                  <div>
                    <span className={cn("text-sm font-bold", electricalIssue ? "text-amber-700" : "text-gray-600")}>
                      Electrical Issue Involved
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">Check to assign electrical team and add details</p>
                  </div>
                </label>
              </div>

              {electricalIssue && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-3 border-l-4 border-amber-400 bg-amber-50 p-4 rounded-xl" onClick={e => e.stopPropagation()}>
                  <div>
                    <label className="text-xs font-medium text-amber-800 mb-1.5 block">Electrical Issue Description</label>
                    <textarea
                      className={cn(inputCls, "resize-none bg-white")}
                      rows={3}
                      value={electricalDesc}
                      onChange={e => setElectricalDesc(e.target.value)}
                      placeholder="Describe the electrical issue…"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-amber-800 mb-1.5 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600" /> Assign Electrical Team
                    </label>
                    <EmpMultiSelect selected={electricalTeam} onChange={setElectricalTeam} placeholder="Search & assign electrical team members…" />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── Spares ── */}
          <section>
            <div className="flex items-center justify-between mb-4 pb-1.5 border-b-2 border-blue-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">Spares / Parts Changed</h3>
              <button type="button" onClick={addSpare} className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-semibold">
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-2 text-left font-semibold text-gray-500 text-xs w-6">#</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-500 text-xs">Part Name</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-500 text-xs w-28">Part No.</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-500 text-xs w-16">Qty</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-500 text-xs">Remarks</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {spares.map((s, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-2 py-1.5 text-gray-400 text-sm">{i + 1}</td>
                      <td className="px-2 py-1.5"><input className={inputCls} value={s.part_name} onChange={e => updateSpare(i, "part_name", e.target.value)} placeholder="Part name…" /></td>
                      <td className="px-2 py-1.5"><input className={inputCls} value={s.part_no}   onChange={e => updateSpare(i, "part_no",   e.target.value)} placeholder="Part no…"  /></td>
                      <td className="px-2 py-1.5"><input className={inputCls} value={s.qty}        onChange={e => updateSpare(i, "qty",        e.target.value)} placeholder="Qty"        /></td>
                      <td className="px-2 py-1.5"><input className={inputCls} value={s.remarks}    onChange={e => updateSpare(i, "remarks",    e.target.value)} placeholder="Remarks…"   /></td>
                      <td className="px-2 py-1.5">
                        {spares.length > 1 && (
                          <button type="button" onClick={() => removeSpare(i)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Resolution ── */}
          <section>
            <h3 className={sectionCls}>Resolution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Root Cause</label>
                <textarea className={cn(inputCls, "resize-none")} rows={3} value={rootCause} onChange={e => setRootCause(e.target.value)} placeholder="Root cause analysis…" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Action Taken</label>
                <textarea className={cn(inputCls, "resize-none")} rows={3} value={actionTaken} onChange={e => setActionTaken(e.target.value)} placeholder="Action taken…" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Remarks</label>
                <input className={inputCls} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any other remarks…" />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-wrap">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
          <button onClick={() => save(false)} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isEdit ? "Update" : "Save"}
          </button>
          <button onClick={() => save(true)} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {isEdit ? "Update & Print" : "Save & Print"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PLCAutomation() {
  const [calls,        setCalls]        = useState<SiteCall[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm,     setShowForm]     = useState(false);
  const [editCall,     setEditCall]     = useState<SiteCall | undefined>();
  const [printCall,    setPrintCall]    = useState<SiteCall | null>(null);
  const [sentIds,      setSentIds]      = useState<Set<number>>(new Set());
  const [sendingId,    setSendingId]    = useState<number | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search)                 qs.set("search", search);
      if (statusFilter !== "All") qs.set("status", statusFilter);
      const r = await fetch(`${BASE}/api/plc/site-calls?${qs}`);
      const d = await r.json();
      setCalls(d.data ?? []);
    } catch {}
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const del = async (id: number) => {
    if (!confirm("Delete this online support call?")) return;
    await fetch(`${BASE}/api/plc/site-calls/${id}`, { method: "DELETE" });
    toast({ title: "Deleted" });
    load();
  };

  const sendEmailFromCard = async (call: SiteCall) => {
    if (!call.customer_email) {
      toast({ title: "No customer email", description: "Edit this call to add a customer email address first.", variant: "destructive" });
      return;
    }
    setSendingId(call.id!);
    try {
      const r = await fetch(`${BASE}/api/plc/site-calls/${call.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: call.customer_email }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to send");
      setSentIds(prev => new Set(prev).add(call.id!));
      toast({ title: "Email sent!", description: `Report sent to ${data.sent_to}` });
    } catch (e: any) {
      toast({ title: "Email failed", description: e.message, variant: "destructive" });
    }
    setSendingId(null);
  };

  const viewDetail = async (id: number) => {
    const r = await fetch(`${BASE}/api/plc/site-calls/${id}`);
    const d = await r.json();
    setPrintCall(d);
  };

  const openEdit = async (id: number) => {
    const r = await fetch(`${BASE}/api/plc/site-calls/${id}`);
    const d = await r.json();
    setEditCall(d);
    setShowForm(true);
  };

  const statusCounts = {
    All:           calls.length,
    Open:          calls.filter(c => c.status === "Open").length,
    "In Progress": calls.filter(c => c.status === "In Progress").length,
    Closed:        calls.filter(c => c.status === "Closed").length,
  };

  return (
    <Layout>
      <div className="flex-1 min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-900 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Online Support Calls</h1>
              <p className="text-xs text-gray-500">PLC &amp; Automation · Remote Assistance</p>
            </div>
          </div>
          <button
            onClick={() => { setEditCall(undefined); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-sm font-semibold shadow"
          >
            <Plus className="w-4 h-4" /> New Support Call
          </button>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(["All", "Open", "In Progress", "Closed"] as const).map(s => {
            const meta = s !== "All" ? STATUS_META[s] : null;
            const Icon = s !== "All" ? meta!.icon : null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all",
                  statusFilter === s
                    ? s === "All"
                      ? "bg-purple-900 text-white"
                      : cn(meta!.bg, meta!.color, "ring-2 ring-offset-1 ring-current")
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                {Icon && <Icon className="w-3 h-3" />}
                {s}
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
                  {statusCounts[s as keyof typeof statusCounts]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="Search by project, call no, issue…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
          </div>
        ) : calls.length === 0 ? (
          <div className="text-center py-24">
            <Wifi className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No online support calls found</p>
            <button
              onClick={() => { setEditCall(undefined); setShowForm(true); }}
              className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Log First Call
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {calls.map(call => {
              const statusMeta = STATUS_META[call.status as Status] ?? STATUS_META["Open"];
              const StatusIcon = statusMeta.icon;
              const attended = Array.isArray(call.attended_by) ? call.attended_by : [];
              return (
                <div
                  key={call.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                      <Wifi className="w-4 h-4 text-purple-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-400">
                          {call.call_no || `OSC-${String(call.id).padStart(4, "0")}`}
                        </span>
                        <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {call.project_name || call.project_number || "—"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {call.issue_details ? call.issue_details.slice(0, 80) + (call.issue_details.length > 80 ? "…" : "") : "No issue details"}
                        {attended.length > 0 && (
                          <span className="ml-2 text-gray-400">· {attended.map(e => e.name).join(", ")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {call.call_received_at && (
                      <span className="text-xs text-gray-400">
                        {new Date(call.call_received_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                    <span className={cn("flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full", statusMeta.bg, statusMeta.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {call.status}
                    </span>
                    <button
                      onClick={() => viewDetail(call.id!)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Print / View Report"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => sendEmailFromCard(call)}
                      disabled={sendingId === call.id}
                      title={sentIds.has(call.id!) ? `Sent to ${call.customer_email}` : call.customer_email ? `Email report to ${call.customer_email}` : "No customer email — edit to add one"}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        sentIds.has(call.id!)
                          ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                          : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50",
                        sendingId === call.id && "opacity-60 cursor-wait"
                      )}
                    >
                      {sendingId === call.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : sentIds.has(call.id!)
                          ? <Mail className="w-4 h-4" />
                          : <Send className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(call.id!)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Edit"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => del(call.id!)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modals */}
        {showForm && (
          <SiteCallModal
            initial={editCall}
            onClose={() => { setShowForm(false); setEditCall(undefined); }}
            onSaved={saved => {
              setShowForm(false);
              setEditCall(undefined);
              load();
              if (saved) setPrintCall(saved);
            }}
          />
        )}
        {printCall && <PrintView call={printCall} onClose={() => setPrintCall(null)} />}
      </div>
    </Layout>
  );
}
