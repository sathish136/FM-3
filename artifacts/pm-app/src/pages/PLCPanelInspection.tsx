import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Loader2, Trash2, X, ChevronDown, Edit2, Send,
  ClipboardCheck, CheckCircle2, Mail, Printer, Camera, ImageIcon,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type OverallResult = "Pending" | "Pass" | "Fail" | "Conditional Pass";
type InspStatus = "Draft" | "Submitted" | "Approved";
type CheckResult = "" | "Yes" | "No" | "NA";
type IssueSeverity = "Critical" | "Major" | "Minor";
type IssueStatus = "Open" | "Closed";

const PANEL_TYPES = ["MCC", "PLC Panel", "Distribution Board", "Control Panel", "Junction Box", "VFD Panel", "Power Panel", "Other"];
const OVERALL_RESULTS: OverallResult[] = ["Pending", "Pass", "Fail", "Conditional Pass"];
const INSP_STATUSES: InspStatus[] = ["Draft", "Submitted", "Approved"];
const PLC_MAKES = ["Siemens", "Beckhoff", "Allen-Bradley", "Schneider", "Other"];
const VFD_MAKES = ["Siemens", "ABB", "Danfoss", "Schneider", "Other"];
const HMI_MAKES = ["Siemens", "Beckhoff", "Weintek", "Pro-face", "Other"];

interface ErpProject { code: string; name: string; label: string; status?: string; }
interface ErpEmployee { id: string; name: string; designation?: string; label: string; }

const RESULT_META: Record<OverallResult, { color: string; bg: string; border: string; dot: string }> = {
  "Pending":          { color: "text-slate-600",  bg: "bg-slate-100",  border: "border-slate-200", dot: "bg-slate-400"  },
  "Pass":             { color: "text-emerald-700",bg: "bg-emerald-50", border: "border-emerald-200",dot: "bg-emerald-500"},
  "Fail":             { color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    dot: "bg-red-500"    },
  "Conditional Pass": { color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  dot: "bg-amber-500"  },
};

interface ChecklistItem { section: string; item: string; result: CheckResult; remarks: string; }
interface IssueItem { description: string; severity: IssueSeverity; status: IssueStatus; remarks: string; }
interface Photo { data?: string; stored?: string; filename: string; comment: string; mime: string; }

interface Inspection {
  id?: number;
  inspection_no?: string;
  project_number?: string;
  project_name?: string;
  panel_name?: string;
  panel_type?: string;
  panel_serial_no?: string;
  inspection_date?: string;
  inspector_name?: string;
  customer_name?: string;
  plc_make?: string;
  plc_model?: string;
  remote_io_make?: string;
  remote_io_model?: string;
  vfd1_make?: string;
  vfd1_model?: string;
  vfd2_make?: string;
  vfd2_model?: string;
  hmi_make?: string;
  hmi_model?: string;
  checklist?: ChecklistItem[];
  issues?: IssueItem[];
  photos?: Photo[];
  overall_result?: OverallResult;
  remarks?: string;
  email_to?: string;
  status?: InspStatus;
  created_by?: string;
  created_at?: string;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { section: "PLC Hardware & Power", item: "PLC CPU installed, powered, and in RUN mode", result: "", remarks: "" },
  { section: "PLC Hardware & Power", item: "PLC firmware version verified as per project", result: "", remarks: "" },
  { section: "PLC Hardware & Power", item: "24 VDC control supply voltage verified at PLC rail", result: "", remarks: "" },
  { section: "PLC Hardware & Power", item: "PLC rack / module seating and locking verified", result: "", remarks: "" },
  { section: "PLC Hardware & Power", item: "Remote I/O stations mounted and earthed", result: "", remarks: "" },
  { section: "Communication", item: "All panel communication check — PLC CPU with remote I/O (Profinet)", result: "", remarks: "" },
  { section: "Communication", item: "Profinet network topology matches approved drawing", result: "", remarks: "" },
  { section: "Communication", item: "Device names / IP addresses configured correctly", result: "", remarks: "" },
  { section: "Communication", item: "PLC ↔ remote I/O link status OK (online / no fault)", result: "", remarks: "" },
  { section: "Communication", item: "HMI ↔ PLC communication check", result: "", remarks: "" },
  { section: "Communication", item: "SCADA / remote monitoring communication check (if applicable)", result: "", remarks: "" },
  { section: "Digital & Analog I/O", item: "All DI check — field signal / PLC status match", result: "", remarks: "" },
  { section: "Digital & Analog I/O", item: "All DO check — PLC command / field device response", result: "", remarks: "" },
  { section: "Digital & Analog I/O", item: "All AI check — scaling and PLC value verified", result: "", remarks: "" },
  { section: "Digital & Analog I/O", item: "All AO check — PLC output / actuator response", result: "", remarks: "" },
  { section: "Digital & Analog I/O", item: "I/O module LED status (SF / BF / RUN) verified", result: "", remarks: "" },
  { section: "Digital & Analog I/O", item: "I/O addressing matches IO list / cause & effect", result: "", remarks: "" },
  { section: "I/O Wiring & Ferrules", item: "All I/O ferrule check — numbers match drawing & IO list", result: "", remarks: "" },
  { section: "I/O Wiring & Ferrules", item: "I/O terminal tightness and polarity checked", result: "", remarks: "" },
  { section: "I/O Wiring & Ferrules", item: "Shield / screen earthing for analog & communication cables", result: "", remarks: "" },
  { section: "VFD / Drives", item: "Main panel VFD 1 — communication and parameter setting verified", result: "", remarks: "" },
  { section: "VFD / Drives", item: "Main panel VFD 2 — communication and parameter setting verified", result: "", remarks: "" },
  { section: "VFD / Drives", item: "VFD ↔ PLC link OK (Profinet / Profibus / Modbus)", result: "", remarks: "" },
  { section: "VFD / Drives", item: "VFD start / stop / speed reference from PLC verified", result: "", remarks: "" },
  { section: "VFD / Drives", item: "VFD fault / trip / status feedback to PLC verified", result: "", remarks: "" },
  { section: "Programming & HMI", item: "PLC program revision downloaded and matches approved version", result: "", remarks: "" },
  { section: "Programming & HMI", item: "Interlocks, sequences, and alarms tested per logic", result: "", remarks: "" },
  { section: "Programming & HMI", item: "Manual / auto / maintenance mode logic verified", result: "", remarks: "" },
  { section: "Programming & HMI", item: "HMI application version and critical screens functional", result: "", remarks: "" },
  { section: "Documentation", item: "As-built IO list, network diagram, and PLC backup archived", result: "", remarks: "" },
  { section: "Documentation", item: "Panel labels / tags match PLC symbol table", result: "", remarks: "" },
];

const EMPTY_INSPECTION: Inspection = {
  overall_result: "Pending",
  status: "Draft",
  checklist: DEFAULT_CHECKLIST.map(c => ({ ...c })),
  issues: [],
  photos: [],
};

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function parsePhotos(raw: unknown): Photo[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch { return []; }
  }
  return [];
}

function photoSrc(photo: Photo, inspectionId?: number): string {
  if (photo.data) return photo.data;
  if (photo.stored && inspectionId) {
    return `${BASE}/api/plc/panel-inspections/${inspectionId}/photos/file/${encodeURIComponent(photo.stored)}`;
  }
  return "";
}

function hydrateInspection(row: Inspection): Inspection {
  return {
    ...row,
    checklist: normalizeChecklist(row.checklist),
    issues: Array.isArray(row.issues) ? row.issues : [],
    photos: parsePhotos(row.photos),
  };
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1 min-w-0">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={cn("text-3xl font-bold", color)}>{value}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}

const CHECK_RESULT_BTNS: { val: CheckResult; label: string; active: string; inactive: string }[] = [
  { val: "Yes", label: "Yes", active: "bg-emerald-600 text-white border-emerald-600", inactive: "border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600" },
  { val: "No",  label: "No",  active: "bg-red-600 text-white border-red-600",        inactive: "border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"      },
  { val: "NA",  label: "N/A", active: "bg-slate-500 text-white border-slate-500",    inactive: "border-slate-200 text-slate-400 hover:border-slate-400"                       },
];

const LEGACY_CHECKLIST_SECTIONS = new Set([
  "Mechanical & Physical",
  "Component Verification",
  "Wiring & Termination",
  "Functional Testing",
]);

function isLegacyChecklist(items: ChecklistItem[]): boolean {
  return items.some(c => LEGACY_CHECKLIST_SECTIONS.has(c.section));
}

/** Always use PLC-only template — replaces old electrical / mechanical checklists. */
function normalizeChecklist(items?: ChecklistItem[]): ChecklistItem[] {
  if (!items?.length || isLegacyChecklist(items)) {
    return DEFAULT_CHECKLIST.map(c => ({ ...c }));
  }
  return items;
}

function checklistSections(items: ChecklistItem[]) {
  return [...new Set(items.map(c => c.section))];
}

function ErpProjectPicker({ value, onChange }: { value: string; onChange: (p: ErpProject) => void }) {
  const [projects, setProjects] = useState<ErpProject[]>([]);
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erpFailed, setErpFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const picked = useRef(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}/api/workshop/erp-projects`)
      .then(r => r.json())
      .then(d => { setProjects(d.projects ?? []); if (!(d.projects ?? []).length) setErpFailed(true); })
      .catch(() => setErpFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setQ(value || ""); }, [value]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = q.trim() ? projects.filter(p => p.label.toLowerCase().includes(q.toLowerCase())) : projects;
  const pick = (p: ErpProject) => { picked.current = true; onChange(p); setQ(p.label); setOpen(false); };
  const commitFreeText = () => {
    if (picked.current) { picked.current = false; return; }
    if (q.trim()) {
      const parts = q.trim().split(" - ");
      const code = parts.length > 1 ? parts[0].trim() : "";
      const name = parts.length > 1 ? parts.slice(1).join(" - ").trim() : q.trim();
      onChange({ code, name, label: q.trim() });
    }
    setOpen(false);
  };

  return (
    <div className="relative col-span-2" ref={ref}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">Project (ERPNext)</label>
      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-300 bg-white">
        <input
          className="flex-1 px-3 py-2 text-sm bg-white outline-none text-slate-800"
          placeholder={erpFailed ? "Type: WTT-001 - Project Name…" : "Search ERPNext project…"}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); onChange({ code: "", name: e.target.value, label: e.target.value }); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(commitFreeText, 150)}
          onKeyDown={e => e.key === "Enter" && commitFreeText()}
        />
        <button type="button" onClick={() => setOpen(v => !v)} className="px-3 text-slate-400 hover:text-slate-600">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-[60] mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl">
          {filtered.map(p => (
            <button key={`${p.code}-${p.label}`} type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-orange-50 border-b border-slate-50 last:border-0 flex items-center gap-2"
              onMouseDown={() => { picked.current = true; }} onClick={() => pick(p)}>
              <span className="font-mono text-xs text-orange-700 font-bold shrink-0">{p.code}</span>
              <span className="text-slate-800 truncate">{p.name}</span>
              {p.status === "Completed" && <span className="ml-auto text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full shrink-0">Done</span>}
            </button>
          ))}
        </div>
      )}
      {erpFailed && !open && <p className="text-[10px] text-amber-600 mt-1">ERP unavailable — type project manually</p>}
    </div>
  );
}

function ErpEmployeePicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ErpEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const picked = useRef(false);

  useEffect(() => { setQ(value || ""); }, [value]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`${BASE}/api/plc/erp-employees?q=${encodeURIComponent(q.trim())}`);
        const d = await r.json();
        setResults(d.employees ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [q]);

  const pick = (emp: ErpEmployee) => {
    picked.current = true;
    onChange(emp.name);
    setQ(emp.name);
    setOpen(false);
    setResults([]);
  };

  const commitFreeText = () => {
    if (picked.current) { picked.current = false; return; }
    if (q.trim()) onChange(q.trim());
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">Inspector Name (ERPNext)</label>
      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-300 bg-white">
        <input
          className="flex-1 px-3 py-2 text-sm bg-white outline-none text-slate-800"
          placeholder="Type 2+ letters to search employee…"
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); onChange(e.target.value); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(commitFreeText, 150)}
          onKeyDown={e => e.key === "Enter" && commitFreeText()}
        />
        <button type="button" onClick={() => setOpen(v => !v)} className="px-3 text-slate-400 hover:text-slate-600">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-[60] mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl">
          {results.map(emp => (
            <button key={emp.id} type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-orange-50 border-b border-slate-50 last:border-0"
              onMouseDown={() => { picked.current = true; }}
              onClick={() => pick(emp)}>
              <span className="font-medium text-slate-800">{emp.name}</span>
              {emp.designation && <span className="text-xs text-slate-400 ml-2">{emp.designation}</span>}
              <span className="block text-[10px] font-mono text-slate-400 mt-0.5">{emp.id}</span>
            </button>
          ))}
        </div>
      )}
      {open && q.trim().length >= 2 && !loading && results.length === 0 && (
        <p className="text-[10px] text-slate-400 mt-1">No active employees found — name will be saved as typed</p>
      )}
    </div>
  );
}

function MakeModelRow({
  label, make, model, makeOptions, onMake, onModel, modelPlaceholder,
}: {
  label: string; make: string; model: string; makeOptions: string[];
  onMake: (v: string) => void; onModel: (v: string) => void; modelPlaceholder?: string;
}) {
  return (
    <div className="col-span-2 grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">{label} — Make</label>
        <select value={make} onChange={e => onMake(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white">
          <option value="">Select make…</option>
          {makeOptions.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">{label} — Model</label>
        <input value={model} onChange={e => onModel(e.target.value)}
          placeholder={modelPlaceholder ?? "e.g. S7-1515-2 PN"}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
      </div>
    </div>
  );
}

async function embedPhotosForPrint(photos: Photo[], inspectionId?: number): Promise<Photo[]> {
  const list = parsePhotos(photos);
  if (!list.length) return [];
  const out: Photo[] = [];
  for (const photo of list) {
    if (photo.data && !photo.data.startsWith("blob:")) {
      out.push(photo);
      continue;
    }
    const src = photoSrc(photo, inspectionId);
    if (!src) continue;
    try {
      const r = await fetch(src, { credentials: "include" });
      if (!r.ok) continue;
      const blob = await r.blob();
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      out.push({ ...photo, data });
    } catch { /* skip */ }
  }
  return out;
}

function printDoc(el: HTMLElement | null) {
  if (!el) return;
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(n => n.outerHTML)
    .join("\n");
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Panel Inspection</title>${styles}<style>
    @page { size: A4; margin: 12mm; }
    *,*::before,*::after{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{margin:0;background:#fff}
    table{border-collapse:collapse}
    img{max-width:100%;height:auto}
  </style></head><body>${el.outerHTML}</body></html>`);
  win.document.close();
  win.focus();
  const imgs = Array.from(win.document.images);
  const wait = imgs.length
    ? Promise.all(imgs.map(img => img.complete && img.naturalWidth > 0
      ? Promise.resolve()
      : new Promise<void>(resolve => { img.onload = () => resolve(); img.onerror = () => resolve(); })))
    : Promise.resolve();
  wait.then(() => setTimeout(() => { win.print(); win.close(); }, 400));
}

function resultPrintClass(result?: OverallResult) {
  if (result === "Pass") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (result === "Fail") return "text-red-700 bg-red-50 border-red-200";
  if (result === "Conditional Pass") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-slate-600 bg-slate-100 border-slate-200";
}

function PrintView({ inspection, onClose, onSendEmail, emailSending }: {
  inspection: Inspection;
  onClose: () => void;
  onSendEmail?: () => void;
  emailSending?: boolean;
}) {
  const docRef = useRef<HTMLDivElement>(null);
  const checklist = normalizeChecklist(inspection.checklist);
  const issues = Array.isArray(inspection.issues) ? inspection.issues : [];
  const [reportPhotos, setReportPhotos] = useState<Photo[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setPhotosLoading(true);
    embedPhotosForPrint(inspection.photos ?? [], inspection.id).then(embedded => {
      if (!cancelled) {
        setReportPhotos(embedded);
        setPhotosLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [inspection.id, inspection.photos]);
  const sections = checklistSections(checklist);
  const inspNo = inspection.inspection_no || `PID-${String(inspection.id ?? 0).padStart(4, "0")}`;
  const yesCount = checklist.filter(c => c.result === "Yes").length;
  const noCount = checklist.filter(c => c.result === "No").length;
  const doneCount = checklist.filter(c => c.result !== "").length;

  const SH = ({ title, color = "bg-orange-800" }: { title: string; color?: string }) => (
    <div className={cn("px-4 py-1.5 text-white text-[10px] font-bold uppercase tracking-[0.12em]", color)}>{title}</div>
  );

  const equipRows = [
    { label: "PLC CPU", make: inspection.plc_make, model: inspection.plc_model },
    { label: "Remote I/O", make: inspection.remote_io_make, model: inspection.remote_io_model },
    { label: "VFD 1 (Main Panel)", make: inspection.vfd1_make, model: inspection.vfd1_model },
    { label: "VFD 2 (Main Panel)", make: inspection.vfd2_make, model: inspection.vfd2_model },
    { label: "HMI", make: inspection.hmi_make, model: inspection.hmi_model },
  ].filter(r => r.make || r.model);

  return (
    <div className="fixed inset-0 z-[60] bg-gray-100 overflow-y-auto print:static print:overflow-visible print:bg-white">
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-slate-900 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-4 h-4 text-orange-300" />
          <span className="font-semibold text-sm">Panel Inspection — {inspNo}</span>
        </div>
        <div className="flex gap-2">
          {onSendEmail && (
            <button onClick={onSendEmail} disabled={emailSending || !inspection.email_to?.trim()}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg text-sm font-medium">
              {emailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              {emailSending ? "Sending…" : "Email PDF"}
            </button>
          )}
          <button onClick={() => printDoc(docRef.current)}
            className="flex items-center gap-2 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium">
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
            <X className="w-3.5 h-3.5" /> Close
          </button>
        </div>
      </div>

      <div ref={docRef} className="max-w-[794px] mx-auto my-6 print:my-0 print:mx-0 bg-white shadow-xl print:shadow-none font-sans text-gray-900">

        <div className="flex border-b-[3px] border-orange-800">
          <div className="w-40 shrink-0 flex flex-col items-center justify-center py-4 px-3 border-r border-orange-200 bg-orange-50">
            <img src={`${BASE}/wtt-logo.png`} alt="WTT" className="w-32 h-32 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-4 px-6 text-center">
            <div className="text-[11px] font-bold tracking-[0.3em] text-orange-900 uppercase mb-1">WTT International</div>
            <div className="text-[20px] font-black tracking-wide text-orange-950 uppercase leading-tight">PLC Panel Inspection</div>
            <div className="text-[16px] font-black tracking-wide text-orange-950 uppercase leading-tight">Pre-Dispatch Report</div>
            <div className="mt-2 text-[10px] text-orange-700 font-semibold">Water Loving Technology</div>
          </div>
          <div className="w-44 shrink-0 flex flex-col justify-center border-l border-orange-200 bg-orange-50">
            {[
              { k: "Inspection No.", v: inspNo, bold: true },
              { k: "Date", v: inspection.inspection_date ? fmtDate(inspection.inspection_date) : "—" },
              { k: "Record Status", v: inspection.status || "Draft" },
            ].map(({ k, v, bold }) => (
              <div key={k} className="px-3 py-2 border-b border-orange-100 last:border-b-0">
                <div className="text-[9px] font-semibold text-orange-600 uppercase tracking-wider">{k}</div>
                <div className={cn("text-xs mt-0.5", bold ? "font-black text-orange-900 font-mono" : "font-semibold text-gray-800")}>{v}</div>
              </div>
            ))}
            <div className="px-3 py-2">
              <div className="text-[9px] font-semibold text-orange-600 uppercase tracking-wider mb-1">Overall Result</div>
              <span className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-bold border", resultPrintClass(inspection.overall_result))}>
                {inspection.overall_result || "Pending"}
              </span>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <SH title="Inspection Details" />
          <div className="grid grid-cols-3 divide-x divide-gray-200">
            <div className="px-4 py-2">
              <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Project No.</div>
              <div className="text-sm font-black text-orange-900 font-mono">{inspection.project_number || "—"}</div>
            </div>
            <div className="px-4 py-2 col-span-2">
              <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Project Name</div>
              <div className="text-sm font-semibold text-gray-900">{inspection.project_name || "—"}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 divide-x divide-gray-200 border-t border-gray-100">
            {[
              { k: "Customer", v: inspection.customer_name },
              { k: "Inspector", v: inspection.inspector_name },
              { k: "Panel Name / Tag", v: inspection.panel_name },
              { k: "Panel Type", v: inspection.panel_type },
            ].map(({ k, v }) => (
              <div key={k} className="px-3 py-2">
                <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{k}</div>
                <div className="text-xs font-semibold text-gray-900">{v || "—"}</div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-gray-100">
            <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Panel Serial No.</div>
            <div className="text-xs font-mono text-gray-900">{inspection.panel_serial_no || "—"}</div>
          </div>
        </div>

        {equipRows.length > 0 && (
          <div className="border-b border-gray-200">
            <SH title="Equipment Make / Model" />
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 w-36 border-r border-gray-200">Equipment</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 w-32 border-r border-gray-200">Make</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Model</th>
                </tr>
              </thead>
              <tbody>
                {equipRows.map((r, i) => (
                  <tr key={r.label} className={cn("border-b border-gray-100", i % 2 === 1 && "bg-gray-50/60")}>
                    <td className="px-3 py-1.5 font-medium text-gray-800 border-r border-gray-100">{r.label}</td>
                    <td className="px-3 py-1.5 border-r border-gray-100">{r.make || "—"}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-800">{r.model || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-b border-gray-200">
          <div className="flex items-center gap-3 px-4 py-1.5 bg-orange-800">
            <span className="text-white text-[10px] font-bold uppercase tracking-[0.12em]">PLC Inspection Checklist</span>
            <span className="ml-auto text-[9px] text-orange-200">
              {doneCount}/{checklist.length} answered · {yesCount} pass · {noCount} fail
            </span>
          </div>
          {sections.map(section => {
            const sectionItems = checklist.filter(c => c.section === section);
            return (
              <div key={section} className="border-b border-gray-200 last:border-b-0">
                <div className="px-3 py-1 bg-orange-50 border-b border-orange-100 text-[9px] font-bold text-orange-900 uppercase tracking-wide">
                  {section}
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-500 w-7 border-r border-gray-200">#</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-gray-500 border-r border-gray-200">Inspection Item</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-500 w-14 border-r border-gray-200">Yes</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-500 w-14 border-r border-gray-200">No</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-500 w-14 border-r border-gray-200">N/A</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-gray-500">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionItems.map((item, idx) => (
                      <tr key={idx} className={cn("border-b border-gray-100", item.result === "No" && "bg-red-50/40", item.result === "Yes" && "bg-emerald-50/30")}>
                        <td className="px-2 py-1.5 text-center text-gray-400 border-r border-gray-100">{idx + 1}</td>
                        <td className="px-3 py-1.5 text-gray-800 border-r border-gray-100 leading-snug">{item.item}</td>
                        <td className="px-2 py-1.5 text-center border-r border-gray-100">
                          {item.result === "Yes" ? <span className="text-emerald-600 font-black">✓</span> : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-2 py-1.5 text-center border-r border-gray-100">
                          {item.result === "No" ? <span className="text-red-600 font-black">✓</span> : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-2 py-1.5 text-center border-r border-gray-100">
                          {item.result === "NA" ? <span className="text-slate-600 font-black">✓</span> : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-3 py-1.5 text-gray-600 italic text-[10px]">{item.remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        <div className="border-b border-gray-200">
          <SH title={`Inspection Photos${reportPhotos.length ? ` (${reportPhotos.length})` : ""}`} />
          {photosLoading ? (
            <div className="px-4 py-8 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
              Loading photos for report…
            </div>
          ) : reportPhotos.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400 italic">No inspection photos attached</div>
          ) : (
            <div className="px-4 py-3 grid grid-cols-2 gap-3">
              {reportPhotos.map((photo, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-gray-200 break-inside-avoid">
                  {photo.data ? (
                    <img
                      src={photo.data}
                      alt={photo.comment || `Photo ${i + 1}`}
                      className="w-full h-52 object-cover print:h-48"
                    />
                  ) : (
                    <div className="h-52 bg-gray-100 flex items-center justify-center text-xs text-gray-400">Image unavailable</div>
                  )}
                  <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex justify-between gap-2">
                    <span className="text-[10px] font-semibold text-gray-500">Photo {i + 1}</span>
                    {photo.comment && (
                      <span className="text-[10px] text-gray-600 text-right">{photo.comment}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {issues.length > 0 && (
          <div className="border-b border-gray-200">
            <SH title="Issues / Findings" color="bg-red-800" />
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-2 py-2 text-center font-semibold text-gray-500 w-7 border-r border-gray-200">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 border-r border-gray-200">Description</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 w-20 border-r border-gray-200">Severity</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 w-20 border-r border-gray-200">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, i) => (
                  <tr key={i} className={cn("border-b border-gray-100", i % 2 === 1 && "bg-gray-50/60")}>
                    <td className="px-2 py-1.5 text-center text-gray-400 border-r border-gray-100">{i + 1}</td>
                    <td className="px-3 py-1.5 border-r border-gray-100">{issue.description || "—"}</td>
                    <td className={cn("px-3 py-1.5 font-semibold border-r border-gray-100",
                      issue.severity === "Critical" ? "text-red-700" : issue.severity === "Major" ? "text-amber-700" : "text-gray-600")}>
                      {issue.severity}
                    </td>
                    <td className="px-3 py-1.5 border-r border-gray-100">{issue.status}</td>
                    <td className="px-3 py-1.5 text-gray-600">{issue.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-b border-gray-200">
          <SH title="Remarks / Notes" />
          <div className="px-4 py-3 min-h-[48px] text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
            {inspection.remarks || <span className="text-gray-400 italic">No additional remarks.</span>}
          </div>
        </div>

        <div>
          <SH title="Signatures &amp; Clearance" />
          <div className="grid grid-cols-3 divide-x divide-gray-200">
            {[
              { label: "Inspector", name: inspection.inspector_name },
              { label: "QC / Supervisor", name: "" },
              { label: "Customer Representative", name: inspection.customer_name },
            ].map(({ label, name }) => (
              <div key={label} className="px-5 py-5">
                <div className="h-12 mb-3" />
                <div className="border-t-2 border-gray-400 pt-1.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-400 w-10 shrink-0">Name:</span>
                    <span className="text-xs font-semibold text-gray-800 flex-1 border-b border-dotted border-gray-300 pb-0.5 min-h-[16px]">
                      {name || ""}
                    </span>
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

        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-[9px] text-gray-400 text-center">
          Generated from FlowMatriX · PLC Panel Inspection · {new Date().toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  );
}

export default function PLCPanelInspection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Inspection>(EMPTY_INSPECTION);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [printInspection, setPrintInspection] = useState<Inspection | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotoFilesRef = useRef<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (resultFilter !== "All") params.set("result", resultFilter);
      if (statusFilter !== "All") params.set("status", statusFilter);
      const r = await fetch(`${BASE}/api/plc/panel-inspections?${params}`);
      const d = await r.json();
      setItems(d.data ?? []);
    } catch { toast({ title: "Load failed", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [search, resultFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    pendingPhotoFilesRef.current = [];
    setEditing({
      ...EMPTY_INSPECTION,
      created_by: user?.email,
      inspector_name: user?.full_name || "",
      checklist: DEFAULT_CHECKLIST.map(c => ({ ...c })),
      issues: [],
      photos: [],
    });
    setActiveSection("PLC Hardware & Power");
    setDrawerOpen(true);
  };

  const openEdit = async (item: Inspection) => {
    try {
      const r = await fetch(`${BASE}/api/plc/panel-inspections/${item.id}`);
      const full = await r.json();
      pendingPhotoFilesRef.current = [];
      setEditing(hydrateInspection(full));
      setActiveSection(checklistSections(checklist)[0] ?? "PLC Hardware & Power");
      setDrawerOpen(true);
    } catch { toast({ title: "Could not load inspection", variant: "destructive" }); }
  };

  const closeDrawer = () => { setDrawerOpen(false); };

  const openPrint = async (item?: Inspection) => {
    try {
      if (item?.id) {
        const r = await fetch(`${BASE}/api/plc/panel-inspections/${item.id}`);
        if (!r.ok) throw new Error(await r.text());
        const full = await r.json();
        setPrintInspection(hydrateInspection(full));
      } else {
        setPrintInspection({
          ...editing,
          checklist: normalizeChecklist(editing.checklist),
          issues: editing.issues ?? [],
          photos: parsePhotos(editing.photos),
        });
      }
    } catch (e: any) {
      toast({ title: "Could not load print view", description: e.message, variant: "destructive" });
    }
  };

  const uploadPendingPhotos = async (inspectionId: number) => {
    const pending = pendingPhotoFilesRef.current;
    if (!pending.length) return null;
    const fd = new FormData();
    pending.forEach(f => fd.append("photos", f));
    pendingPhotoFilesRef.current = [];
    const r = await fetch(`${BASE}/api/plc/panel-inspections/${inspectionId}/photos`, { method: "POST", body: fd });
    if (!r.ok) throw new Error(await r.text());
    return hydrateInspection(await r.json());
  };

  const save = async () => {
    if (!editing.panel_name?.trim() && !editing.project_name?.trim()) {
      toast({ title: "Panel Name or Project Name required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...editing,
        photos: (editing.photos ?? []).filter(p => p.stored || p.data),
        checklist: editing.checklist ?? [],
        issues: editing.issues ?? [],
      };
      const method = editing.id ? "PATCH" : "POST";
      const url = editing.id ? `${BASE}/api/plc/panel-inspections/${editing.id}` : `${BASE}/api/plc/panel-inspections`;
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      let saved = hydrateInspection(await r.json());
      const inspectionId = saved.id!;
      if (pendingPhotoFilesRef.current.length) {
        const withPhotos = await uploadPendingPhotos(inspectionId);
        if (withPhotos) saved = withPhotos;
      }
      setEditing(saved);
      const photoCount = (saved.photos ?? []).length;
      toast({
        title: editing.id ? "Inspection updated" : "Inspection created",
        description: photoCount ? `${photoCount} photo${photoCount !== 1 ? "s" : ""} saved` : undefined,
      });
      load();
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const del = async (id: number) => {
    try {
      await fetch(`${BASE}/api/plc/panel-inspections/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" }); setDeleteId(null); closeDrawer(); load();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const sendEmail = async () => {
    if (!editing.id) { await save(); }
    if (!editing.email_to?.trim()) { toast({ title: "Enter recipient email first", variant: "destructive" }); return; }
    setSendingEmail(true);
    try {
      const r = await fetch(`${BASE}/api/plc/panel-inspections/${editing.id}/send-email`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_to: editing.email_to }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      toast({ title: `Report sent to ${d.sent_to}` });
    } catch (e: any) { toast({ title: "Email failed", description: e.message, variant: "destructive" }); }
    finally { setSendingEmail(false); }
  };

  const field = (k: keyof Inspection, val: any) => setEditing(p => ({ ...p, [k]: val }));

  const updateChecklist = (idx: number, key: keyof ChecklistItem, val: string) => {
    const cl = [...(editing.checklist ?? [])];
    cl[idx] = { ...cl[idx], [key]: val };
    setEditing(p => ({ ...p, checklist: cl }));
  };

  const addIssue = () => {
    const issues = [...(editing.issues ?? []), { description: "", severity: "Minor" as IssueSeverity, status: "Open" as IssueStatus, remarks: "" }];
    setEditing(p => ({ ...p, issues }));
  };

  const updateIssue = (idx: number, key: keyof IssueItem, val: string) => {
    const issues = [...(editing.issues ?? [])];
    issues[idx] = { ...issues[idx], [key]: val } as IssueItem;
    setEditing(p => ({ ...p, issues }));
  };

  const removeIssue = (idx: number) => {
    const issues = (editing.issues ?? []).filter((_, i) => i !== idx);
    setEditing(p => ({ ...p, issues }));
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!imageFiles.length) return;

    if (editing.id) {
      setUploadingPhotos(true);
      try {
        const fd = new FormData();
        imageFiles.forEach(f => fd.append("photos", f));
        const r = await fetch(`${BASE}/api/plc/panel-inspections/${editing.id}/photos`, { method: "POST", body: fd });
        if (!r.ok) throw new Error(await r.text());
        setEditing(hydrateInspection(await r.json()));
        toast({ title: `${imageFiles.length} photo${imageFiles.length !== 1 ? "s" : ""} uploaded` });
      } catch (e: any) {
        toast({ title: "Photo upload failed", description: e.message, variant: "destructive" });
      } finally {
        setUploadingPhotos(false);
      }
      return;
    }

    imageFiles.forEach(file => {
      pendingPhotoFilesRef.current.push(file);
      const preview = URL.createObjectURL(file);
      setEditing(p => ({
        ...p,
        photos: [...(p.photos ?? []), { data: preview, filename: file.name, comment: "", mime: file.type }],
      }));
    });
    toast({
      title: `${imageFiles.length} photo${imageFiles.length !== 1 ? "s" : ""} added`,
      description: "Click Update / Create to save them to the server",
    });
  };

  const removePhoto = async (idx: number) => {
    const photo = editing.photos?.[idx];
    if (!photo) return;

    if (photo.stored && editing.id) {
      try {
        const r = await fetch(
          `${BASE}/api/plc/panel-inspections/${editing.id}/photos/${encodeURIComponent(photo.stored)}`,
          { method: "DELETE" },
        );
        if (!r.ok) throw new Error(await r.text());
        setEditing(hydrateInspection(await r.json()));
      } catch (e: any) {
        toast({ title: "Could not remove photo", description: e.message, variant: "destructive" });
      }
      return;
    }

    if (photo.data?.startsWith("blob:")) URL.revokeObjectURL(photo.data);
    if (!editing.id) pendingPhotoFilesRef.current.splice(idx, 1);
    setEditing(p => ({ ...p, photos: (p.photos ?? []).filter((_, i) => i !== idx) }));
  };

  const updatePhotoComment = (idx: number, comment: string) => {
    setEditing(p => ({
      ...p,
      photos: (p.photos ?? []).map((ph, i) => i === idx ? { ...ph, comment } : ph),
    }));
  };

  const total = items.length;
  const pass = items.filter(i => i.overall_result === "Pass").length;
  const fail = items.filter(i => i.overall_result === "Fail").length;
  const conditional = items.filter(i => i.overall_result === "Conditional Pass").length;

  const checklist = editing.checklist ?? [];
  const sections = checklistSections(checklist.length ? checklist : DEFAULT_CHECKLIST);
  const projectLabel = [editing.project_number, editing.project_name].filter(Boolean).join(" - ");

  const sectionStats = (sec: string) => {
    const items = checklist.filter(c => c.section === sec);
    const done = items.filter(c => c.result !== "").length;
    const no = items.filter(c => c.result === "No").length;
    return { total: items.length, done, no };
  };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-600 shadow-sm shadow-orange-200">
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">PLC Panel Inspection — Pre-Dispatch</h1>
                <p className="text-xs text-slate-500 mt-0.5">PLC-only checklist, equipment make/model, ERPNext project & dispatch report</p>
              </div>
            </div>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> New Inspection
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Inspections" value={total} sub="all panels" color="text-slate-800" />
            <StatCard label="Pass" value={pass} sub="cleared for dispatch" color="text-emerald-600" />
            <StatCard label="Fail" value={fail} sub="rework required" color="text-red-600" />
            <StatCard label="Conditional" value={conditional} sub="minor issues" color="text-amber-600" />
          </div>

          <div className="px-6 pb-4 flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search project, panel name, inspection no…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
            </div>
            <div className="relative">
              <select value={resultFilter} onChange={e => setResultFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30">
                <option value="All">All Results</option>
                {OVERALL_RESULTS.map(r => <option key={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30">
                <option value="All">All Statuses</option>
                {INSP_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="px-6 pb-6">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 text-center py-20 text-slate-400">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <p className="font-semibold text-slate-500">No inspections found</p>
                <p className="text-sm mt-1">Click "New Inspection" to create your first pre-dispatch checklist</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Inspection</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Panel</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Inspector</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => {
                      const rm = RESULT_META[item.overall_result as OverallResult] ?? RESULT_META["Pending"];
                      return (
                        <tr key={item.id} className="hover:bg-orange-50/40 transition-colors group cursor-pointer" onClick={() => openEdit(item)}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{item.inspection_no || `PID-${String(item.id).padStart(4, "0")}`}</div>
                            {item.panel_type && <div className="text-xs text-slate-400 mt-0.5">{item.panel_type}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="font-medium">{item.panel_name || <span className="text-slate-300">—</span>}</div>
                            {item.panel_serial_no && <div className="text-xs text-slate-400 font-mono">{item.panel_serial_no}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {item.project_name || <span className="text-slate-300">—</span>}
                            {item.project_number && <div className="text-slate-400 font-mono">{item.project_number}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{item.inspector_name || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{item.inspection_date ? fmtDate(item.inspection_date) : <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", rm.bg, rm.color, rm.border)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", rm.dot)} />
                              {item.overall_result || "Pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("text-xs font-semibold px-2 py-1 rounded-full",
                              item.status === "Approved" ? "bg-emerald-50 text-emerald-700" :
                              item.status === "Submitted" ? "bg-blue-50 text-blue-700" :
                              "bg-slate-100 text-slate-600")}>{item.status || "Draft"}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={e => { e.stopPropagation(); openPrint(item); }}
                                className="p-1.5 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-orange-600 transition-colors"
                                title="Print report">
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={e => { e.stopPropagation(); openEdit(item); }}
                                className="p-1.5 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-orange-600 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={e => { e.stopPropagation(); setDeleteId(item.id!); }}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
                  {items.length} inspection{items.length !== 1 ? "s" : ""} found
                </div>
              </div>
            )}
          </div>
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />
            <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-orange-700 to-orange-600 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-white font-bold text-lg">{editing.id ? "Edit Inspection" : "New Panel Inspection"}</h2>
                  <p className="text-orange-200 text-xs mt-0.5">PLC Pre-Dispatch Checklist</p>
                </div>
                <div className="flex items-center gap-2">
                  {editing.id && (
                    <button onClick={() => setDeleteId(editing.id!)}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-red-300 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Inspection Details<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Inspection No.</label>
                      <input value={editing.inspection_no ?? ""} onChange={e => field("inspection_no", e.target.value)}
                        placeholder="PI-001" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Inspection Date</label>
                      <input type="date" value={editing.inspection_date ?? ""} onChange={e => field("inspection_date", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                    <ErpProjectPicker
                      value={projectLabel}
                      onChange={p => setEditing(prev => ({
                        ...prev,
                        project_number: p.code || prev.project_number,
                        project_name: p.name || prev.project_name,
                      }))}
                    />
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Customer / Client</label>
                      <input value={editing.customer_name ?? ""} onChange={e => field("customer_name", e.target.value)}
                        placeholder="ABC Industries" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                    <ErpEmployeePicker
                      value={editing.inspector_name ?? ""}
                      onChange={name => field("inspector_name", name)}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Panel Details<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Panel Name / Tag <span className="text-red-500">*</span></label>
                      <input value={editing.panel_name ?? ""} onChange={e => field("panel_name", e.target.value)}
                        placeholder="Panel Tag or Name" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Panel Type</label>
                      <select value={editing.panel_type ?? ""} onChange={e => field("panel_type", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white">
                        <option value="">Select type…</option>
                        {PANEL_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Serial No.</label>
                      <input value={editing.panel_serial_no ?? ""} onChange={e => field("panel_serial_no", e.target.value)}
                        placeholder="SN-001" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Equipment Make / Model<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <MakeModelRow label="PLC CPU" make={editing.plc_make ?? ""} model={editing.plc_model ?? ""}
                      makeOptions={PLC_MAKES} onMake={v => field("plc_make", v)} onModel={v => field("plc_model", v)}
                      modelPlaceholder="e.g. S7-1515-2 PN" />
                    <MakeModelRow label="Remote I/O" make={editing.remote_io_make ?? ""} model={editing.remote_io_model ?? ""}
                      makeOptions={PLC_MAKES} onMake={v => field("remote_io_make", v)} onModel={v => field("remote_io_model", v)}
                      modelPlaceholder="e.g. ET 200SP" />
                    <MakeModelRow label="VFD 1 (Main Panel)" make={editing.vfd1_make ?? ""} model={editing.vfd1_model ?? ""}
                      makeOptions={VFD_MAKES} onMake={v => field("vfd1_make", v)} onModel={v => field("vfd1_model", v)}
                      modelPlaceholder="e.g. G120C" />
                    <MakeModelRow label="VFD 2 (Main Panel)" make={editing.vfd2_make ?? ""} model={editing.vfd2_model ?? ""}
                      makeOptions={VFD_MAKES} onMake={v => field("vfd2_make", v)} onModel={v => field("vfd2_model", v)}
                      modelPlaceholder="e.g. G120C" />
                    <MakeModelRow label="HMI" make={editing.hmi_make ?? ""} model={editing.hmi_model ?? ""}
                      makeOptions={HMI_MAKES} onMake={v => field("hmi_make", v)} onModel={v => field("hmi_model", v)}
                      modelPlaceholder="e.g. KTP700 Basic" />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Inspection Checklist<span className="flex-1 h-px bg-slate-100" />
                  </h3>

                  <div className="flex gap-2 flex-wrap mb-4">
                    {sections.map(sec => {
                      const st = sectionStats(sec);
                      return (
                        <button key={sec} onClick={() => setActiveSection(sec === activeSection ? null : sec)}
                          className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5",
                            activeSection === sec
                              ? "bg-orange-600 text-white border-orange-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-orange-300")}>
                          {sec.split(" ")[0]}
                          <span className={cn("text-xs font-bold", st.no > 0 ? "text-red-300" : "opacity-60")}>
                            {st.done}/{st.total}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {sections.filter(s => !activeSection || s === activeSection).map(section => (
                    <div key={section} className="mb-4">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">{section}</div>
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        {checklist.filter(c => c.section === section).map((item, sectionIdx) => {
                          const globalIdx = checklist.findIndex(c => c === item);
                          return (
                            <div key={sectionIdx} className={cn("flex flex-col gap-2 p-3 border-b border-slate-100 last:border-0",
                              item.result === "No" ? "bg-red-50/50" : item.result === "Yes" ? "bg-emerald-50/30" : "bg-white")}>
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <div className="text-sm text-slate-700 leading-snug">{item.item}</div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  {CHECK_RESULT_BTNS.map(btn => (
                                    <button key={btn.val}
                                      onClick={() => updateChecklist(globalIdx, "result", item.result === btn.val ? "" : btn.val)}
                                      className={cn("px-2.5 py-1 rounded-md text-xs font-bold border transition-colors",
                                        item.result === btn.val ? btn.active : btn.inactive)}>
                                      {btn.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {(item.result === "No" || item.remarks) && (
                                <input value={item.remarks} onChange={e => updateChecklist(globalIdx, "remarks", e.target.value)}
                                  placeholder="Add remark or observation…"
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>

                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="flex-1 h-px bg-slate-100" />Issues / Findings<span className="flex-1 h-px bg-slate-100" />
                    </h3>
                    <button onClick={addIssue}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add Issue
                    </button>
                  </div>

                  {(editing.issues ?? []).length === 0 ? (
                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-1.5 opacity-30" />
                      <p className="text-sm text-slate-500 font-medium">No issues recorded</p>
                      <p className="text-xs">Click "Add Issue" if any findings are observed</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(editing.issues ?? []).map((issue, idx) => (
                        <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex-1">
                              <input value={issue.description} onChange={e => updateIssue(idx, "description", e.target.value)}
                                placeholder="Issue description…"
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                            </div>
                            <button onClick={() => removeIssue(idx)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Severity</label>
                              <select value={issue.severity} onChange={e => updateIssue(idx, "severity", e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white">
                                {(["Critical", "Major", "Minor"] as IssueSeverity[]).map(s => <option key={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Status</label>
                              <select value={issue.status} onChange={e => updateIssue(idx, "status", e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white">
                                {(["Open", "Closed"] as IssueStatus[]).map(s => <option key={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Remarks</label>
                              <input value={issue.remarks} onChange={e => updateIssue(idx, "remarks", e.target.value)}
                                placeholder="Remarks"
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="flex-1 h-px bg-slate-100" />Inspection Photos<span className="flex-1 h-px bg-slate-100" />
                    </h3>
                    <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhotos}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60 transition-colors">
                      {uploadingPhotos ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      {uploadingPhotos ? "Uploading…" : "Add Photos"}
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={e => { handlePhotoFiles(e.target.files); e.target.value = ""; }} />
                  </div>

                  {(editing.photos ?? []).length === 0 ? (
                    <div
                      className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all"
                      onClick={() => photoInputRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); handlePhotoFiles(e.dataTransfer.files); }}
                    >
                      <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-500">Drop panel photos here or click to browse</p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP · Multiple files supported</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {(editing.photos ?? []).map((photo, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                          <div className="relative">
                            <img src={photoSrc(photo, editing.id)} alt={photo.comment || `Photo ${i + 1}`} className="w-full h-36 object-cover" />
                            <button type="button" onClick={() => removePhoto(i)}
                              className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                              Photo {i + 1}
                            </div>
                          </div>
                          <div className="p-2">
                            <input
                              value={photo.comment}
                              onChange={e => updatePhotoComment(i, e.target.value)}
                              placeholder="Caption / location (e.g. PLC rack, VFD panel)…"
                              className="w-full text-xs border-0 border-b border-slate-200 focus:border-orange-400 outline-none bg-transparent text-slate-600 placeholder-slate-300 pb-0.5"
                            />
                          </div>
                        </div>
                      ))}
                      <div
                        className="rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[9rem] cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all"
                        onClick={() => photoInputRef.current?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); handlePhotoFiles(e.dataTransfer.files); }}
                      >
                        <Camera className="w-7 h-7 text-slate-300 mb-1" />
                        <span className="text-xs text-slate-400 font-medium">Add more</span>
                      </div>
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Final Result & Clearance<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Overall Result</label>
                      <div className="flex gap-2 flex-wrap">
                        {OVERALL_RESULTS.map(r => {
                          const active = editing.overall_result === r;
                          const colors: Record<string, string> = {
                            "Pass": active ? "bg-emerald-600 text-white border-emerald-600" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                            "Fail": active ? "bg-red-600 text-white border-red-600" : "border-red-200 text-red-700 hover:bg-red-50",
                            "Conditional Pass": active ? "bg-amber-500 text-white border-amber-500" : "border-amber-200 text-amber-700 hover:bg-amber-50",
                            "Pending": active ? "bg-slate-600 text-white border-slate-600" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                          };
                          return (
                            <button key={r} onClick={() => field("overall_result", r)}
                              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors", colors[r])}>
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Record Status</label>
                      <select value={editing.status ?? "Draft"} onChange={e => field("status", e.target.value as InspStatus)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white">
                        {INSP_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks / Notes</label>
                    <textarea value={editing.remarks ?? ""} onChange={e => field("remarks", e.target.value)} rows={3}
                      placeholder="Any additional notes, conditions, or recommendations…"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none" />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="flex-1 h-px bg-slate-100" />Send Report<span className="flex-1 h-px bg-slate-100" />
                  </h3>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input value={editing.email_to ?? ""} onChange={e => field("email_to", e.target.value)}
                        placeholder="customer@email.com" type="email"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300" />
                    </div>
                    <button onClick={sendEmail} disabled={sendingEmail || !editing.email_to?.trim()}
                      className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 font-semibold transition-colors">
                      {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      Send PDF
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">Report will be saved and emailed as a PDF attachment</p>
                </section>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50 flex-shrink-0">
                <button onClick={closeDrawer} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                <button onClick={() => openPrint()} type="button"
                  className="px-4 py-2 text-sm border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-2 font-semibold">
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={save} disabled={saving}
                  className="px-5 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-60 flex items-center gap-2 transition-colors font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {editing.id ? "Update" : "Create"} Inspection
                </button>
              </div>
            </div>
          </div>
        )}

        {printInspection && (
          <PrintView
            inspection={printInspection}
            onClose={() => setPrintInspection(null)}
            onSendEmail={printInspection.id ? async () => {
              if (!printInspection.email_to?.trim()) {
                toast({ title: "Enter recipient email in the inspection record", variant: "destructive" });
                return;
              }
              setSendingEmail(true);
              try {
                const r = await fetch(`${BASE}/api/plc/panel-inspections/${printInspection.id}/send-email`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email_to: printInspection.email_to }),
                });
                const d = await r.json();
                if (!r.ok) throw new Error(d.error || "Failed");
                toast({ title: `Report sent to ${d.sent_to}` });
              } catch (e: any) {
                toast({ title: "Email failed", description: e.message, variant: "destructive" });
              } finally {
                setSendingEmail(false);
              }
            } : undefined}
            emailSending={sendingEmail}
          />
        )}

        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-1">Delete Inspection?</h3>
              <p className="text-sm text-slate-500 mb-5">This action cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                <button onClick={() => del(deleteId)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
