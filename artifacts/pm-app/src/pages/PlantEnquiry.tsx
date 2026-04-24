import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import {
  Factory, User, Phone, Mail, Building2, MapPin, Globe2, Hash,
  Droplets, Beaker, ThermometerSun, FlaskConical, Recycle, Search,
  CheckCircle2, Save, RotateCcw, ChevronDown, X, Download, Send,
  ClipboardList, Sparkles, Layers, ScanLine, NotebookPen, Plus,
  Trash2, GripVertical, ListChecks, FileText, Navigation, ExternalLink,
  Loader2, Crosshair, Eye, FileCheck2, UserCheck, BadgeCheck, MessageCircle,
  Trophy, XCircle, Filter,
} from "lucide-react";

const VC_BASE = "/api";

type VCard = {
  id: number;
  name: string | null;
  designation: string | null;
  company: string | null;
  email: string | null;
  phones: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
};

type Form = {
  industry_name: string;
  contact_person: string;
  designation: string;
  mobile_no: string;
  email: string;
  sector: string;
  source: string;
  source_detail: string;
  present_requirement: string;
  address: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
  latitude: string;
  longitude: string;
  has_existing_plant: "yes" | "no" | "";
  existing_plant_details: string;
  effluent_capacity: string;
  treatment_required: string[];
  recovery_of_salt: boolean;
  area_availability: string;
  raw_water_required: "yes" | "no" | "";
  // Extended plant & system details
  operating_hours: string;
  working_days: string;
  shifts: string;
  power_kw: string;
  power_phase: "single" | "three" | "";
  discharge_norm: string;
  outlet_bod: string;
  outlet_cod: string;
  outlet_tss: string;
  outlet_tds: string;
  reuse_purpose: string;
  sludge_disposal: string;
  utilities_available: string[];
  civil_scope: "client" | "wtt" | "shared" | "";
  site_readiness: "ready" | "in_progress" | "not_started" | "";
  commissioning_target: string;
  budget_range: string;
  preferred_technology: string;
  remarks: string;
  inlet: Record<string, string>;
  heavy_metals: string;
};

type MinutePoint = { id: string; text: string; done: boolean };

const INLET_FIELDS: { key: string; label: string; unit?: string }[] = [
  { key: "ph",          label: "pH" },
  { key: "cod",         label: "COD",        unit: "mg/l" },
  { key: "bod",         label: "BOD",        unit: "mg/l" },
  { key: "tds",         label: "TDS",        unit: "mg/l" },
  { key: "pva",         label: "PVA",        unit: "mg/l" },
  { key: "tss",         label: "TSS",        unit: "mg/l" },
  { key: "silica",      label: "Silica",     unit: "mg/l" },
  { key: "sodium",      label: "Sodium",     unit: "mg/l" },
  { key: "sulphate",    label: "Sulphate",   unit: "mg/l" },
  { key: "chlorides",   label: "Chlorides",  unit: "mg/l" },
  { key: "alkalinity",  label: "Alkalinity", unit: "mg/l" },
  { key: "temperature", label: "Temperature",unit: "°C" },
  { key: "oil_grease",  label: "Oil & Grease",unit:"mg/l" },
  { key: "tkn",         label: "TKN",        unit: "mg/l" },
  { key: "hardness",    label: "Hardness",   unit: "mg/l" },
];

const TREATMENT_OPTIONS = [
  "Primary Treatment", "Secondary (Biological)", "Tertiary",
  "Membrane (UF/RO)", "ZLD", "Recovery of Salt", "Recovery of Water",
];

const DISCHARGE_NORMS = [
  "CPCB / SPCB Norms", "ZLD (Zero Liquid Discharge)",
  "Reuse — Process", "Reuse — Cooling Tower", "Reuse — Gardening / Flushing",
  "Sea / River Discharge", "Municipal Sewer", "Other",
];

const UTILITIES = [
  "Steam", "Compressed Air", "Cooling Water", "Chilled Water",
  "Natural Gas / LPG", "DM Water", "Soft Water", "DG Backup",
];

const SECTORS = [
  "Textiles", "Dyeing & Bleaching", "Pharmaceutical", "Chemical",
  "Food & Beverage", "Pulp & Paper", "Tannery", "Electroplating",
  "Automobile", "Power Plant", "Refinery", "Other",
];

const SOURCES = [
  "Expo / Trade Show", "Reference / Word of Mouth", "Website Enquiry",
  "Walk-in", "Phone Call", "Email", "WhatsApp", "Social Media",
  "Existing Client", "Consultant / Architect", "Tender", "Other",
];

const empty: Form = {
  industry_name: "", contact_person: "", designation: "", mobile_no: "", email: "",
  sector: "", source: "", source_detail: "", present_requirement: "",
  address: "", district: "", state: "", country: "India", pincode: "",
  latitude: "", longitude: "",
  has_existing_plant: "", existing_plant_details: "",
  effluent_capacity: "20", treatment_required: [], recovery_of_salt: false,
  area_availability: "", raw_water_required: "",
  operating_hours: "24", working_days: "6", shifts: "3",
  power_kw: "", power_phase: "three",
  discharge_norm: "", outlet_bod: "", outlet_cod: "", outlet_tss: "", outlet_tds: "",
  reuse_purpose: "", sludge_disposal: "",
  utilities_available: [],
  civil_scope: "", site_readiness: "",
  commissioning_target: "", budget_range: "",
  preferred_technology: "", remarks: "",
  inlet: {}, heavy_metals: "",
};

const STORAGE_KEY = "plant-enquiry-draft";
const LIST_KEY = "plant-enquiry-list";

type EnquiryStatus = "new" | "contacted" | "proposal_sent" | "won" | "lost";

type SavedEnquiry = {
  id: string;
  savedAt: string;
  completion: number;
  form: Form;
  status?: EnquiryStatus;
  contactedAt?: string;
  proposalSentAt?: string;
  proposalRef?: string;
  proposalNotes?: string;
};

const STATUS_META: Record<EnquiryStatus, { label: string; tone: string; dot: string; icon: any }> = {
  new:            { label: "New Lead",      tone: "bg-slate-100 text-slate-700 border-slate-200",      dot: "bg-slate-400",   icon: Sparkles },
  contacted:      { label: "Contacted",     tone: "bg-amber-50 text-amber-800 border-amber-200",        dot: "bg-amber-500",   icon: UserCheck },
  proposal_sent:  { label: "Proposal Sent", tone: "bg-blue-50 text-[#0a2463] border-blue-200",          dot: "bg-[#0ea5e9]",   icon: FileCheck2 },
  won:            { label: "Won",           tone: "bg-emerald-50 text-emerald-800 border-emerald-200",  dot: "bg-emerald-500", icon: Trophy },
  lost:           { label: "Lost",          tone: "bg-rose-50 text-rose-800 border-rose-200",            dot: "bg-rose-500",    icon: XCircle },
};

const STATUS_ORDER: EnquiryStatus[] = ["new", "contacted", "proposal_sent", "won", "lost"];

function loadList(): SavedEnquiry[] {
  try { const s = localStorage.getItem(LIST_KEY); if (s) return JSON.parse(s) as SavedEnquiry[]; } catch {}
  return [];
}
function saveList(list: SavedEnquiry[]) {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); } catch {}
}
function newId() {
  return `pe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
const MINUTES_KEY = "plant-enquiry-minutes";

/* ── UI atoms ─────────────────────────────────────────────────────────── */
function SectionCard({
  icon: Icon, title, accent, children, badge, right,
}: { icon: any; title: string; accent: string; badge?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className={cn("flex items-center gap-2 px-4 py-2.5 border-b", accent)}>
        <Icon className="w-4 h-4" />
        <span className="font-bold text-xs uppercase tracking-wider">{title}</span>
        {badge && <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70">{badge}</span>}
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({
  label, icon: Icon, value, onChange, placeholder, type = "text", required, suffix,
}: {
  label: string; icon?: any; value: string;
  onChange: (v: string) => void; placeholder?: string; type?: string;
  required?: boolean; suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1 mb-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
        {required && <span className="text-rose-500">*</span>}
      </span>
      <div className="relative">
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full px-2.5 py-1.5 text-[12px] rounded-md border border-gray-200 bg-white",
            "focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition",
            suffix && "pr-12"
          )}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 uppercase">{suffix}</span>
        )}
      </div>
    </label>
  );
}

function TextArea({
  label, icon: Icon, value, onChange, placeholder, rows = 2,
}: { label: string; icon?: any; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1 mb-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </span>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-[12px] rounded-md border border-gray-200 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition resize-none"
      />
    </label>
  );
}

function Select({
  label, icon: Icon, value, onChange, options, placeholder,
}: { label: string; icon?: any; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1 mb-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none px-2.5 py-1.5 pr-7 text-[12px] rounded-md border border-gray-200 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">{placeholder || "Select…"}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
      </div>
    </label>
  );
}

function NativeSelect({
  label, icon: Icon, value, onChange, options,
}: { label: string; icon?: any; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1 mb-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none px-2.5 py-1.5 pr-7 text-[12px] rounded-md border border-gray-200 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        >
          {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
      </div>
    </label>
  );
}

function YesNo({
  label, icon: Icon, value, onChange,
}: { label: string; icon?: any; value: "yes" | "no" | ""; onChange: (v: "yes" | "no") => void }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1 mb-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </span>
      <div className="flex gap-2">
        {(["yes", "no"] as const).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              "flex-1 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase border transition",
              value === o
                ? o === "yes"
                  ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                  : "bg-rose-500 text-white border-rose-500 shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-[10px] font-bold border transition",
        active
          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
          : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-700"
      )}
    >
      {active && <CheckCircle2 className="inline w-3 h-3 mr-1 -mt-0.5" />}
      {label}
    </button>
  );
}

/* ── VC card scan-as-camera (calls /visiting-cards/scan with image) ────── */
function VCScanCard({ onApply }: { onApply: (c: VCard) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCard, setLastCard] = useState<VCard | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    setError(null);
    setPreview(URL.createObjectURL(f));
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append("frontImage", f);
      const r = await fetch(`${VC_BASE}/visiting-cards/scan`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(`Scan failed (${r.status})`);
      const j = await r.json();
      const data = j?.data || j || {};
      const card: VCard = {
        id: 0,
        name: data.name ?? null,
        designation: data.designation ?? null,
        company: data.company ?? null,
        email: data.email ?? null,
        phones: data.phones ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        country: data.country ?? null,
      };
      setLastCard(card);
      setRawJson(JSON.stringify(data, null, 2));
      onApply(card);
    } catch (e: any) {
      setError(e?.message || "Failed to scan card");
    } finally {
      setScanning(false);
    }
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-md px-2.5 py-2">
        <div className="flex items-center gap-2">
          <ScanLine className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 shrink-0">VC Auto-Scanner</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-[10px] font-semibold text-gray-700 transition disabled:opacity-50"
          >
            <ScanLine className="w-3 h-3" /> {scanning ? "Scanning…" : "Upload"}
          </button>
          <button
            type="button"
            onClick={() => { const i = document.createElement("input"); i.type = "file"; i.accept = "image/*"; (i as any).capture = "environment"; i.onchange = (e: any) => handleFiles(e.target.files); i.click(); }}
            disabled={scanning}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-[10px] font-semibold text-gray-700 transition disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" /> Camera
          </button>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-[10px] font-semibold text-gray-700 transition"
          >
            <Search className="w-3 h-3" /> Saved
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {preview && (
          <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded p-1.5 border border-gray-200">
            <img src={preview} alt="card" className="w-10 h-7 object-cover rounded" />
            <div className="flex-1 text-[10px] text-gray-700">
              {scanning ? "Reading card details…" : "Card scanned. Fields below auto-filled — review & adjust."}
            </div>
            <button onClick={() => { setPreview(null); setLastCard(null); setRawJson(null); }} className="text-gray-400 hover:text-gray-700 p-0.5"><X className="w-3 h-3" /></button>
          </div>
        )}
        {error && <div className="mt-2 text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">{error}</div>}

        {lastCard && !scanning && (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-2">
            {/* Parsed fields list */}
            <div className="bg-white border border-gray-200 rounded">
              <div className="px-2 py-1 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-600 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Extracted</span>
                <button title="Re-apply to form" onClick={() => onApply(lastCard)} className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800">Re-apply →</button>
              </div>
              <div className="max-h-32 overflow-auto px-2 py-1.5 text-[10px] text-gray-700 leading-relaxed space-y-0.5">
                {[
                  ["Name", lastCard.name],
                  ["Designation", lastCard.designation],
                  ["Company", lastCard.company],
                  ["Email", lastCard.email],
                  ["Phones", lastCard.phones],
                  ["Address", lastCard.address],
                  ["City", lastCard.city],
                  ["Country", lastCard.country],
                ].map(([k, v]) => v ? (
                  <div key={k as string} className="flex gap-2">
                    <span className="text-gray-400 font-semibold uppercase text-[9px] tracking-wider w-16 shrink-0 pt-px">{k}</span>
                    <span className="flex-1 break-words">{v as string}</span>
                  </div>
                ) : null)}
              </div>
            </div>
            {/* Raw JSON */}
            <div className="bg-white border border-gray-200 rounded">
              <div className="px-2 py-1 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-600 flex items-center gap-1"><FileText className="w-3 h-3" /> Raw Output</span>
                {rawJson && (
                  <button title="Copy" onClick={() => { navigator.clipboard?.writeText(rawJson); }} className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800">Copy</button>
                )}
              </div>
              <pre className="max-h-32 overflow-auto px-2 py-1.5 text-[9.5px] text-gray-600 leading-snug font-mono whitespace-pre-wrap break-words">{rawJson || ""}</pre>
            </div>
          </div>
        )}
      </div>

      <ContactPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={onApply} />
    </>
  );
}

/* ── VC-card picker modal ─────────────────────────────────────────────── */
function ContactPicker({
  open, onClose, onPick,
}: { open: boolean; onClose: () => void; onPick: (c: VCard) => void }) {
  const [cards, setCards] = useState<VCard[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`${VC_BASE}/visiting-cards?limit=200`)
      .then((r) => r.json())
      .then((j) => setCards(Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []))
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return cards;
    const n = q.toLowerCase();
    return cards.filter((c) =>
      [c.name, c.company, c.email, c.phones, c.city].some((v) => (v || "").toLowerCase().includes(n))
    );
  }, [cards, q]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <Sparkles className="w-4 h-4 text-orange-600" />
          <span className="font-bold text-sm text-orange-900">Pick a contact from your scanned cards</span>
          <button onClick={onClose} className="ml-auto p-1 rounded-md hover:bg-white text-gray-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, company, email, phone…"
              className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-gray-200 bg-white focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <div className="text-center text-xs text-gray-400 py-10">Loading scanned cards…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-xs text-gray-400 py-10">No cards found. Scan some in VC Card Scanner first.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => { onPick(c); onClose(); }}
                    className="w-full text-left px-3 py-2 hover:bg-amber-50/50 rounded-md transition flex items-start gap-3"
                  >
                    <span className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {(c.name || c.company || "?").trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">{c.name || "—"}</div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {c.designation && <span>{c.designation} · </span>}
                        <span className="font-semibold">{c.company || "—"}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 truncate flex flex-wrap gap-x-2">
                        {c.email && <span><Mail className="inline w-2.5 h-2.5 mr-0.5" />{c.email}</span>}
                        {c.phones && <span><Phone className="inline w-2.5 h-2.5 mr-0.5" />{c.phones}</span>}
                        {c.city && <span><MapPin className="inline w-2.5 h-2.5 mr-0.5" />{c.city}</span>}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Map / Lat-Long picker ─────────────────────────────────────────────── */
type LatLng = { lat: string; lng: string };
type GeoAddr = { address?: string; city?: string; district?: string; state?: string; country?: string; pincode?: string };

function parseLatLng(input: string): LatLng | null {
  const t = input.trim();
  // 1) bare "12.34, 56.78"
  const m1 = t.match(/^(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)$/);
  if (m1) return { lat: m1[1], lng: m1[2] };
  // 2) Google Maps URL with @lat,lng or q=lat,lng or !3dlat!4dlng
  const m2 = t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m2) return { lat: m2[1], lng: m2[2] };
  const m3 = t.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m3) return { lat: m3[1], lng: m3[2] };
  const m4 = t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m4) return { lat: m4[1], lng: m4[2] };
  return null;
}

async function reverseGeocode(lat: string, lng: string): Promise<GeoAddr> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`, {
      headers: { "Accept": "application/json" },
    });
    if (!r.ok) return {};
    const j = await r.json();
    const a = j?.address || {};
    return {
      address: j?.display_name || "",
      city: a.city || a.town || a.village || a.suburb || "",
      district: a.state_district || a.county || "",
      state: a.state || "",
      country: a.country || "",
      pincode: a.postcode || "",
    };
  } catch { return {}; }
}

function MapPicker({
  open, onClose, lat, lng, onSave,
}: { open: boolean; onClose: () => void; lat: string; lng: string; onSave: (ll: LatLng, addr: GeoAddr) => void }) {
  const [pasted, setPasted] = useState("");
  const [cur, setCur] = useState<LatLng>({ lat, lng });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [addr, setAddr] = useState<GeoAddr>({});

  useEffect(() => {
    if (!open) return;
    setCur({ lat, lng });
    setPasted("");
    setErr(null);
    setAddr({});
    if (lat && lng) {
      setBusy(true);
      reverseGeocode(lat, lng).then((a) => { setAddr(a); setBusy(false); });
    }
  }, [open, lat, lng]);

  const useCurrent = () => {
    if (!navigator.geolocation) { setErr("Geolocation not supported"); return; }
    setBusy(true); setErr(null);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const next = { lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) };
        setCur(next);
        const a = await reverseGeocode(next.lat, next.lng);
        setAddr(a);
        setBusy(false);
      },
      (e) => { setErr(e.message || "Unable to get current location"); setBusy(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const usePasted = async () => {
    const ll = parseLatLng(pasted);
    if (!ll) { setErr("Couldn't read coordinates. Paste like '12.97, 77.59' or a Google Maps URL."); return; }
    setErr(null);
    setCur(ll);
    setBusy(true);
    const a = await reverseGeocode(ll.lat, ll.lng);
    setAddr(a);
    setBusy(false);
  };

  const lookupAddr = async () => {
    if (!cur.lat || !cur.lng) return;
    setBusy(true); setErr(null);
    const a = await reverseGeocode(cur.lat, cur.lng);
    setAddr(a);
    setBusy(false);
  };

  if (!open) return null;
  const hasLL = !!(cur.lat && cur.lng);
  const mapSrc = hasLL
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(cur.lng)-0.01}%2C${parseFloat(cur.lat)-0.01}%2C${parseFloat(cur.lng)+0.01}%2C${parseFloat(cur.lat)+0.01}&layer=mapnik&marker=${cur.lat}%2C${cur.lng}`
    : "";
  const gmapsLink = hasLL ? `https://www.google.com/maps/?q=${cur.lat},${cur.lng}` : "";
  const gmapsPick = `https://www.google.com/maps`;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50">
          <MapPin className="w-4 h-4 text-gray-700" />
          <span className="font-semibold text-sm text-gray-800">Pick site location (latitude / longitude)</span>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-white text-gray-500"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-gray-200">
          <button
            onClick={useCurrent}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded border border-gray-300 hover:border-gray-500 hover:bg-gray-50 text-xs font-semibold text-gray-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
            Use my current location
          </button>
          <a
            href={gmapsPick}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded border border-gray-300 hover:border-gray-500 hover:bg-gray-50 text-xs font-semibold text-gray-700"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Google Maps to pick
          </a>
          <div className="md:col-span-2 flex gap-2">
            <input
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") usePasted(); }}
              placeholder="Paste Google Maps URL or coordinates (e.g. 12.972, 77.594)"
              className="flex-1 px-2.5 py-1.5 text-xs rounded border border-gray-200 focus:outline-none focus:border-gray-500"
            />
            <button onClick={usePasted} className="px-3 rounded bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900">Use</button>
          </div>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Latitude</span>
            <input
              value={cur.lat}
              onChange={(e) => setCur((c) => ({ ...c, lat: e.target.value }))}
              placeholder="e.g. 12.972"
              className="w-full mt-1 px-2.5 py-1.5 text-xs rounded border border-gray-200 focus:outline-none focus:border-gray-500 font-mono"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Longitude</span>
            <input
              value={cur.lng}
              onChange={(e) => setCur((c) => ({ ...c, lng: e.target.value }))}
              placeholder="e.g. 77.594"
              className="w-full mt-1 px-2.5 py-1.5 text-xs rounded border border-gray-200 focus:outline-none focus:border-gray-500 font-mono"
            />
          </label>
          {err && <div className="md:col-span-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">{err}</div>}
        </div>

        <div className="flex-1 min-h-[260px] bg-gray-100 relative">
          {hasLL ? (
            <iframe
              key={`${cur.lat},${cur.lng}`}
              src={mapSrc}
              title="Map preview"
              className="w-full h-full border-0"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-xs gap-2">
              <MapPin className="w-8 h-8" />
              <span>Enter coordinates above to preview the location</span>
            </div>
          )}
        </div>

        {(addr.address || hasLL) && (
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-[11px] text-gray-700 space-y-1">
            {addr.address && <div className="truncate"><span className="font-semibold">Address: </span>{addr.address}</div>}
            <div className="flex flex-wrap gap-3 text-[10px] text-gray-500">
              {addr.city && <span><b className="text-gray-700">District:</b> {addr.city}</span>}
              {addr.state && <span><b className="text-gray-700">State:</b> {addr.state}</span>}
              {addr.country && <span><b className="text-gray-700">Country:</b> {addr.country}</span>}
              {addr.pincode && <span><b className="text-gray-700">Pin:</b> {addr.pincode}</span>}
              {hasLL && (
                <a href={gmapsLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline ml-auto">
                  Open in Google Maps →
                </a>
              )}
            </div>
          </div>
        )}

        <div className="px-4 py-2.5 border-t border-gray-200 bg-white flex items-center justify-end gap-2">
          {hasLL && !addr.address && (
            <button onClick={lookupAddr} disabled={busy} className="px-3 py-1.5 rounded border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {busy ? "Looking up…" : "Look up address"}
            </button>
          )}
          <button onClick={onClose} className="px-3 py-1.5 rounded border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => { if (cur.lat && cur.lng) onSave(cur, addr); onClose(); }}
            disabled={!hasLL}
            className="px-3 py-1.5 rounded bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900 disabled:opacity-40"
          >
            Use this location
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Meeting minutes panel ─────────────────────────────────────────────── */
function MeetingMinutesPanel({ industry }: { industry: string }) {
  const [points, setPoints] = useState<MinutePoint[]>(() => {
    try { const s = localStorage.getItem(MINUTES_KEY); if (s) return JSON.parse(s); } catch {}
    return [];
  });
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(MINUTES_KEY, JSON.stringify(points)); } catch {} }, 300);
    return () => clearTimeout(t);
  }, [points]);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setPoints((p) => [...p, { id: Math.random().toString(36).slice(2), text, done: false }]);
    setDraft("");
  };

  const toggle = (id: string) => setPoints((p) => p.map((x) => x.id === id ? { ...x, done: !x.done } : x));
  const remove = (id: string) => setPoints((p) => p.filter((x) => x.id !== id));
  const update = (id: string, text: string) => setPoints((p) => p.map((x) => x.id === id ? { ...x, text } : x));
  const clearDone = () => setPoints((p) => p.filter((x) => !x.done));

  const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const total = points.length;
  const done = points.filter((p) => p.done).length;

  const exportTxt = () => {
    const body = [
      `MEETING MINUTES`,
      industry ? `Industry: ${industry}` : null,
      `Date: ${date}`,
      ``,
      ...points.map((p, i) => `${i + 1}. ${p.done ? "[DONE] " : ""}${p.text}`),
    ].filter(Boolean).join("\n");
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meeting-minutes-${(industry || "draft").replace(/[^\w-]+/g, "_")}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
        <NotebookPen className="w-3.5 h-3.5 text-gray-600" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-700">Meeting Minutes</div>
          <div className="text-[9px] text-gray-500 truncate">{industry || "Untitled enquiry"} · {date}</div>
        </div>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white text-gray-700 border border-gray-200 tabular-nums">
          {done}/{total}
        </span>
        <button onClick={exportTxt} title="Export minutes as .txt" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[9px] font-semibold transition">
          <Download className="w-3 h-3" /> Export
        </button>
        {done > 0 && (
          <button onClick={clearDone} title="Clear completed" className="p-1 rounded hover:bg-white border border-transparent hover:border-gray-200 text-gray-600">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="px-4 py-2 border-b border-gray-100 flex gap-2 bg-gray-50/40">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(); } }}
          placeholder="Add a discussion point — Enter to save, Shift+Enter for new line"
          rows={2}
          className="flex-1 text-[12px] px-2.5 py-1.5 rounded-md border border-gray-200 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="self-stretch px-3 rounded-md bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-1.5">
        {points.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
            <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-violet-400" />
            </div>
            <div className="text-xs font-bold">No minutes yet</div>
            <div className="text-[10px] text-center max-w-xs">Capture every discussion point — capacities discussed, customer constraints, technical clarifications. They auto-save and can be exported.</div>
          </div>
        ) : (
          points.map((p, i) => (
            <div
              key={p.id}
              className={cn(
                "group flex items-start gap-2 p-2 rounded-lg border transition-all",
                p.done
                  ? "bg-emerald-50/40 border-emerald-100"
                  : "bg-white border-gray-100 hover:border-violet-200 hover:shadow-sm"
              )}
            >
              <span className="mt-1 text-gray-300 group-hover:text-gray-400 cursor-grab"><GripVertical className="w-3 h-3" /></span>
              <button
                onClick={() => toggle(p.id)}
                className={cn(
                  "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition",
                  p.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 hover:border-violet-400"
                )}
              >
                {p.done && <CheckCheck className="w-3 h-3" />}
              </button>
              <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold tabular-nums shrink-0",
                p.done ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700")}>
                {i + 1}
              </span>
              <textarea
                value={p.text}
                onChange={(e) => update(p.id, e.target.value)}
                rows={1}
                className={cn(
                  "flex-1 text-[12px] leading-snug bg-transparent resize-none focus:outline-none",
                  p.done && "line-through text-gray-400"
                )}
                style={{ minHeight: "20px" }}
              />
              <button
                onClick={() => remove(p.id)}
                className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 p-1 transition"
                title="Delete"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CheckCheck(props: any) {
  return <CheckCircle2 {...props} />;
}

/* ── Saved-enquiries dashboard ────────────────────────────────────────── */
function EnquiryDashboard({
  list, onNew, onOpen, onDelete, onMarkStatus, onSendProposal, onViewProposal,
}: {
  list: SavedEnquiry[];
  onNew: () => void;
  onOpen: (e: SavedEnquiry) => void;
  onDelete: (id: string) => void;
  onMarkStatus: (id: string, s: EnquiryStatus) => void;
  onSendProposal: (e: SavedEnquiry) => void;
  onViewProposal: (e: SavedEnquiry) => void;
}) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | "all">("all");

  const filtered = useMemo(() => {
    let res = list;
    if (statusFilter !== "all") res = res.filter((e) => (e.status || "new") === statusFilter);
    if (q.trim()) {
      const t = q.toLowerCase();
      res = res.filter((e) =>
        [e.form.industry_name, e.form.contact_person, e.form.email, e.form.mobile_no, e.form.sector, e.form.state, e.form.district]
          .some((v) => (v || "").toLowerCase().includes(t))
      );
    }
    return res;
  }, [list, q, statusFilter]);

  const totals = useMemo(() => {
    const total = list.length;
    const completed = list.filter((e) => e.completion >= 80).length;
    const inProgress = total - completed;
    const totalKld = list.reduce((s, e) => s + (parseFloat(e.form.effluent_capacity) || 0), 0);
    return { total, completed, inProgress, totalKld };
  }, [list]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: list.length, new: 0, contacted: 0, proposal_sent: 0, won: 0, lost: 0 };
    list.forEach((e) => { c[e.status || "new"] = (c[e.status || "new"] || 0) + 1; });
    return c;
  }, [list]);

  return (
    <div className="p-3 lg:p-4 space-y-3">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-md px-3 py-2 flex items-center gap-3">
        <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center shrink-0">
          <Factory className="w-4 h-4 text-gray-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-400">WTT International</div>
          <h1 className="text-[13px] font-bold tracking-tight leading-tight text-gray-900">Plant Enquiries</h1>
        </div>
        <div className="relative">
          <Search className="w-3 h-3 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="pl-6 pr-2 py-1 text-[11px] rounded border border-gray-200 focus:outline-none focus:border-gray-500 w-44"
          />
        </div>
        <button onClick={onNew} className="inline-flex items-center gap-1 bg-gray-900 hover:bg-black text-white px-2.5 py-1.5 rounded text-[11px] font-semibold transition">
          <Plus className="w-3.5 h-3.5" /> New Plant Enquiry
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Total Enquiries", value: totals.total, icon: ClipboardList, tint: "bg-indigo-50 text-indigo-700 border-indigo-100" },
          { label: "Ready (≥80%)", value: totals.completed, icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-700 border-emerald-100" },
          { label: "In Progress", value: totals.inProgress, icon: Layers, tint: "bg-amber-50 text-amber-700 border-amber-100" },
          { label: "Total Capacity", value: `${totals.totalKld} KLD`, icon: Droplets, tint: "bg-blue-50 text-blue-700 border-blue-100" },
        ].map((k) => (
          <div key={k.label} className={cn("border rounded-md p-2.5 flex items-center gap-2.5", k.tint)}>
            <div className="w-8 h-8 rounded bg-white/70 flex items-center justify-center shrink-0">
              <k.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-semibold uppercase tracking-wider opacity-80">{k.label}</div>
              <div className="text-base font-extrabold leading-tight tabular-nums">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Status filter chips */}
      <div className="bg-white border border-gray-200 rounded-md px-3 py-2 flex items-center gap-2 flex-wrap">
        <Filter className="w-3 h-3 text-slate-400" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mr-1">Lead Status</span>
        {(["all", ...STATUS_ORDER] as const).map((s) => {
          const active = statusFilter === s;
          const meta = s === "all" ? null : STATUS_META[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide transition",
                active ? "border-[#0a2463] bg-[#0a2463] text-white" : "border-slate-200 text-slate-600 hover:border-slate-400 bg-white"
              )}
            >
              {meta && <span className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-white" : meta.dot)} />}
              {s === "all" ? "All" : meta!.label}
              <span className={cn("ml-0.5 px-1 rounded text-[9px] tabular-nums", active ? "bg-white/20" : "bg-slate-100 text-slate-500")}>{statusCounts[s] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <ListChecks className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-700">Saved Enquiries</span>
          <span className="text-[10px] text-gray-500 tabular-nums">({filtered.length})</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-500">
            <Factory className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            {list.length === 0 ? (
              <>
                No saved enquiries yet.<br />
                Click <b className="text-gray-700">New Plant Enquiry</b> to create your first one.
              </>
            ) : "No enquiries match your search."}
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-gray-100 text-[10px] uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Industry / Company</th>
                  <th className="text-left px-3 py-2 font-semibold">Contact</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 font-semibold">Sector</th>
                  <th className="text-left px-3 py-2 font-semibold">Location</th>
                  <th className="text-right px-3 py-2 font-semibold">KLD</th>
                  <th className="text-left px-3 py-2 font-semibold">Completion</th>
                  <th className="text-left px-3 py-2 font-semibold">Saved</th>
                  <th className="text-right px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t border-gray-100 hover:bg-indigo-50/30 transition">
                    <td className="px-3 py-2">
                      <button onClick={() => onOpen(e)} className="font-semibold text-gray-900 hover:text-indigo-700 text-left">
                        {e.form.industry_name || <span className="text-gray-400 italic">Untitled</span>}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <div>{e.form.contact_person || "—"}</div>
                      <div className="text-[10px] text-gray-500">{e.form.mobile_no || e.form.email || ""}</div>
                    </td>
                    <td className="px-3 py-2">
                      {(() => {
                        const st = e.status || "new";
                        const meta = STATUS_META[st];
                        const Ico = meta.icon;
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9.5px] font-semibold w-fit", meta.tone)}>
                              <Ico className="w-2.5 h-2.5" /> {meta.label}
                            </span>
                            {st === "proposal_sent" && e.proposalRef && (
                              <span className="text-[9px] text-slate-400 tabular-nums">{e.proposalRef}</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{e.form.sector || "—"}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {[e.form.district, e.form.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-700">
                      {e.form.effluent_capacity || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 rounded-full bg-gray-100 overflow-hidden">
                          <div className={cn("h-full transition-all", e.completion >= 80 ? "bg-emerald-500" : e.completion >= 50 ? "bg-amber-500" : "bg-rose-400")} style={{ width: `${e.completion}%` }} />
                        </div>
                        <span className="text-[10px] tabular-nums text-gray-600">{e.completion}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-500 tabular-nums">
                      {new Date(e.savedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {(e.status || "new") === "new" && (
                          <button onClick={() => onMarkStatus(e.id, "contacted")} title="Mark as Contacted" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[9.5px] font-semibold">
                            <UserCheck className="w-2.5 h-2.5" /> Contact
                          </button>
                        )}
                        {(e.status === "contacted" || e.status === "new") && (
                          <button onClick={() => onSendProposal(e)} title="Generate &amp; Send Proposal" style={{ backgroundColor: "#0ea5e9" }} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-white hover:brightness-110 text-[9.5px] font-semibold">
                            <FileCheck2 className="w-2.5 h-2.5" /> Proposal
                          </button>
                        )}
                        {e.status === "proposal_sent" && (
                          <>
                            <button onClick={() => onViewProposal(e)} title="View / re-print Proposal" style={{ backgroundColor: "#0a2463" }} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-white hover:brightness-110 text-[9.5px] font-semibold">
                              <Eye className="w-2.5 h-2.5" /> View
                            </button>
                            <button onClick={() => onMarkStatus(e.id, "won")} title="Mark Won" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[9.5px] font-semibold">
                              <Trophy className="w-2.5 h-2.5" />
                            </button>
                            <button onClick={() => onMarkStatus(e.id, "lost")} title="Mark Lost" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[9.5px] font-semibold">
                              <XCircle className="w-2.5 h-2.5" />
                            </button>
                          </>
                        )}
                        <button onClick={() => onOpen(e)} className="px-2 py-0.5 rounded border border-gray-300 hover:border-gray-700 text-[10px] font-semibold text-gray-700 hover:bg-gray-50">Open</button>
                        <button onClick={() => onDelete(e.id)} title="Delete" className="p-1 rounded border border-transparent hover:border-rose-300 hover:bg-rose-50 text-gray-400 hover:text-rose-700">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-gray-400 pt-1">
        © WTT INTERNATIONAL PRIVATE LIMITED
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function PlantEnquiry() {
  const [form, setForm] = useState<Form>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) return { ...empty, ...JSON.parse(s) }; } catch {}
    return empty;
  });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [view, setView] = useState<"dashboard" | "form">("dashboard");
  const [list, setList] = useState<SavedEnquiry[]>(() => loadList());
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [autoSaveOn, setAutoSaveOn] = useState<boolean>(() => {
    try { const v = localStorage.getItem("plant-enquiry-autosave"); return v === null ? true : v === "1"; } catch { return true; }
  });
  const [autoSavedFlag, setAutoSavedFlag] = useState(false);
  const handleSaveRef = useRef<() => void>(() => {});
  const [postSaveToast, setPostSaveToast] = useState<{ id: string; ts: number } | null>(null);
  const [sendLeadOpen, setSendLeadOpen] = useState(false);
  const sendLeadRef = useRef<HTMLDivElement>(null);

  const currentEnquiry = useMemo(() => list.find((e) => e.id === currentId) || null, [list, currentId]);
  const currentStatus: EnquiryStatus = currentEnquiry?.status || "new";

  const updateEnquiry = (id: string, patch: Partial<SavedEnquiry>) => {
    setList((prev) => {
      const next = prev.map((e) => e.id === id ? { ...e, ...patch } : e);
      saveList(next);
      return next;
    });
  };

  const buildLeadSummary = (f: Form) => {
    const lines = [
      `*New Plant Enquiry — WTT International*`,
      f.industry_name ? `🏭 *${f.industry_name}*${f.sector ? ` · ${f.sector}` : ""}` : null,
      f.contact_person ? `👤 ${f.contact_person}${f.designation ? ` (${f.designation})` : ""}` : null,
      f.mobile_no ? `📱 ${f.mobile_no}` : null,
      f.email ? `✉️ ${f.email}` : null,
      (f.district || f.state) ? `📍 ${[f.district, f.state, f.country].filter(Boolean).join(", ")}` : null,
      (f.latitude && f.longitude) ? `🛰️ ${f.latitude}, ${f.longitude} → https://www.google.com/maps/?q=${f.latitude},${f.longitude}` : null,
      f.effluent_capacity ? `💧 Capacity: ${f.effluent_capacity} KLD` : null,
      f.source ? `🎯 Source: ${f.source}${f.source_detail ? ` — ${f.source_detail}` : ""}` : null,
      f.present_requirement ? `\n📝 ${f.present_requirement}` : null,
    ].filter(Boolean);
    return lines.join("\n");
  };

  const sendLeadVia = (channel: "whatsapp" | "email") => {
    const msg = buildLeadSummary(form);
    if (channel === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    } else {
      const subject = `New Plant Enquiry — ${form.industry_name || "Untitled"}`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
    }
    setSendLeadOpen(false);
  };

  const markContacted = () => {
    if (!currentId) { alert("Save the enquiry first."); return; }
    updateEnquiry(currentId, { status: "contacted", contactedAt: new Date().toISOString() });
  };
  const markStatus = (id: string, status: EnquiryStatus) => {
    const patch: Partial<SavedEnquiry> = { status };
    if (status === "contacted") patch.contactedAt = new Date().toISOString();
    updateEnquiry(id, patch);
  };

  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch {} }, 400);
    return () => clearTimeout(t);
  }, [form]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExportMenuOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDocClick); document.removeEventListener("keydown", onKey); };
  }, [exportMenuOpen]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setInlet = (k: string, v: string) => setForm((f) => ({ ...f, inlet: { ...f.inlet, [k]: v } }));

  const fillFromCard = (c: VCard) => {
    setForm((f) => ({
      ...f,
      industry_name: c.company || f.industry_name,
      contact_person: c.name || f.contact_person,
      designation: c.designation || f.designation,
      email: c.email || f.email,
      mobile_no: (c.phones || "").split(",")[0]?.trim() || f.mobile_no,
      address: c.address || f.address,
      district: c.city || f.district,
      country: c.country || f.country,
    }));
  };

  const completion = useMemo(() => {
    const required: (keyof Form)[] = ["industry_name", "contact_person", "mobile_no", "email", "sector", "effluent_capacity"];
    const filled = required.filter((k) => String(form[k] ?? "").trim()).length;
    const inletFilled = INLET_FIELDS.filter((f) => String(form.inlet[f.key] ?? "").trim()).length;
    return Math.round(((filled / required.length) * 0.6 + (inletFilled / INLET_FIELDS.length) * 0.4) * 100);
  }, [form]);

  const handleSave = (opts: { silent?: boolean } = {}) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch {}
    const now = new Date().toISOString();
    let savedId = currentId;
    setList((prev) => {
      let next: SavedEnquiry[];
      if (currentId) {
        next = prev.map((e) => e.id === currentId ? { ...e, savedAt: now, completion, form } : e);
        if (!next.some((e) => e.id === currentId)) next = [{ id: currentId, savedAt: now, completion, form, status: "new" }, ...next];
      } else {
        const id = newId();
        savedId = id;
        setCurrentId(id);
        next = [{ id, savedAt: now, completion, form, status: "new" }, ...prev];
      }
      saveList(next);
      return next;
    });
    setSavedAt(new Date().toLocaleTimeString());
    if (!opts.silent && savedId) {
      setPostSaveToast({ id: savedId, ts: Date.now() });
    }
  };
  handleSaveRef.current = () => handleSave({ silent: true });

  // Auto-dismiss post-save toast
  useEffect(() => {
    if (!postSaveToast) return;
    const t = setTimeout(() => setPostSaveToast(null), 12000);
    return () => clearTimeout(t);
  }, [postSaveToast]);

  // Click-outside for Send Lead menu
  useEffect(() => {
    if (!sendLeadOpen) return;
    const onDoc = (e: MouseEvent) => { if (sendLeadRef.current && !sendLeadRef.current.contains(e.target as Node)) setSendLeadOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSendLeadOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [sendLeadOpen]);

  // Auto-save: persist to saved-list every 5s of idle when form has minimum content
  useEffect(() => {
    if (!autoSaveOn) return;
    if (view !== "form") return;
    const minimumOk = !!(form.industry_name?.trim() || form.contact_person?.trim() || form.mobile_no?.trim() || form.email?.trim());
    if (!minimumOk) return;
    const t = setTimeout(() => {
      handleSaveRef.current?.();
      setAutoSavedFlag(true);
      setTimeout(() => setAutoSavedFlag(false), 1500);
    }, 5000);
    return () => clearTimeout(t);
  }, [form, autoSaveOn, view]);

  useEffect(() => {
    try { localStorage.setItem("plant-enquiry-autosave", autoSaveOn ? "1" : "0"); } catch {}
  }, [autoSaveOn]);

  const handleReset = () => {
    if (confirm("Clear the entire form?")) { setForm(empty); setCurrentId(null); localStorage.removeItem(STORAGE_KEY); setSavedAt(null); }
  };

  const handleNew = () => {
    setForm(empty); setCurrentId(null); setSavedAt(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setView("form");
  };

  const handleOpen = (e: SavedEnquiry) => {
    setForm({ ...empty, ...e.form });
    setCurrentId(e.id);
    setSavedAt(new Date(e.savedAt).toLocaleTimeString());
    setView("form");
  };

  const sendProposal = () => {
    if (!currentId) {
      handleSave({ silent: true });
      // wait a tick so currentId is set
      setTimeout(() => sendProposal(), 50);
      return;
    }
    const ref = currentEnquiry?.proposalRef || buildProposalRef(currentId);
    handleExportPdf({ markProposal: true, id: currentId, existingRef: ref });
    updateEnquiry(currentId, { status: "proposal_sent", proposalSentAt: new Date().toISOString(), proposalRef: ref });
    setPostSaveToast(null);
  };

  const viewProposalForEnquiry = (e: SavedEnquiry) => {
    setForm({ ...empty, ...e.form });
    setCurrentId(e.id);
    setSavedAt(new Date(e.savedAt).toLocaleTimeString());
    setView("form");
    setTimeout(() => {
      handleExportPdf({ markProposal: true, id: e.id, existingRef: e.proposalRef || buildProposalRef(e.id) });
    }, 80);
  };

  const sendProposalForEnquiry = (e: SavedEnquiry) => {
    const ref = e.proposalRef || buildProposalRef(e.id);
    setForm({ ...empty, ...e.form });
    setCurrentId(e.id);
    setView("form");
    setTimeout(() => {
      handleExportPdf({ markProposal: true, id: e.id, existingRef: ref });
      updateEnquiry(e.id, { status: "proposal_sent", proposalSentAt: new Date().toISOString(), proposalRef: ref });
    }, 80);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this saved enquiry?")) return;
    setList((prev) => { const next = prev.filter((e) => e.id !== id); saveList(next); return next; });
    if (currentId === id) setCurrentId(null);
  };

  const handleBackToDashboard = () => { setView("dashboard"); };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(form, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plant-enquiry-${(form.industry_name || "draft").replace(/[^\w-]+/g, "_")}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildProposalRef = (id?: string | null) => {
    if (id) {
      const tail = id.split("_")[1] || id.slice(-6);
      return `WTT-PE-${new Date().getFullYear()}-${tail.slice(-6).toUpperCase()}`;
    }
    return `WTT-PE-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  };

  const handleExportPdf = (opts: { markProposal?: boolean; id?: string | null; existingRef?: string | null } = {}) => {
    const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    const row = (k: string, v: any) => v ? `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>` : "";
    const list = (arr: any[]) => Array.isArray(arr) && arr.length ? arr.map(esc).join(", ") : "";
    const inletRows = INLET_FIELDS
      .filter((f) => form.inlet[f.key])
      .map((f) => `<tr><th>${esc(f.label)}${f.unit ? ` (${esc(f.unit)})` : ""}</th><td>${esc(form.inlet[f.key])}</td></tr>`).join("");
    const refNo = opts.existingRef || buildProposalRef(opts.id ?? currentId);
    const isProposal = !!opts.markProposal;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Plant Enquiry — ${esc(form.industry_name || "Draft")}</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { font: 10.5px/1.5 'Inter', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { padding: 14mm 14mm 18mm; }
        .hero { background: #0a2463; color: #fff; padding: 18px 22px; border-radius: 6px; display:flex; justify-content: space-between; align-items: center; border-top: 4px solid #0ea5e9; }
        .hero .logo { display:flex; align-items:center; gap: 14px; }
        .hero .logo img { height: 56px; width: auto; background: #fff; padding: 6px 8px; border-radius: 6px; }
        .hero .co { font-weight: 700; letter-spacing: .14em; font-size: 9.5px; color: #93c5fd; text-transform: uppercase; }
        .hero h1 { font-size: 20px; margin: 4px 0 2px; font-weight: 700; letter-spacing: -0.01em; color: #fff; }
        .hero .tag { font-size: 10px; color: #cbd5e1; }
        .hero .meta { text-align:right; font-size: 9.5px; line-height: 1.6; }
        .hero .meta .k { color: #93c5fd; text-transform: uppercase; letter-spacing: 0.1em; font-size: 8.5px; }
        .hero .meta .v { font-weight: 600; color: #fff; }
        .hero .ref { display:inline-block; margin-top: 6px; padding: 3px 8px; border-radius: 4px; background: #0ea5e9; color: #fff; font-weight: 700; font-size: 9.5px; letter-spacing: 0.06em; }
        .summary { display:grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 14px 0 16px; }
        .stat { border: 1px solid #e5e7eb; border-left: 3px solid #0a2463; border-radius: 4px; padding: 8px 10px; background: #fff; }
        .stat .l { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 600; }
        .stat .v { font-size: 13px; font-weight: 700; color: #0a2463; margin-top: 2px; }
        .stat .v small { font-size: 9px; font-weight: 600; color: #64748b; }
        .progress { height: 4px; border-radius: 0; background: #e5e7eb; overflow:hidden; margin-top: 6px; }
        .progress > i { display:block; height: 100%; background: #0ea5e9; }
        section { break-inside: avoid; margin: 0 0 14px; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; }
        section header { display:flex; align-items:center; gap: 8px; padding: 7px 12px; background: #f1f5f9; border-bottom: 1px solid #e5e7eb; border-left: 3px solid #0a2463; }
        section header .dot { width: 6px; height: 6px; border-radius: 999px; background: #0ea5e9; }
        section header h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #0a2463; margin: 0; font-weight: 700; }
        section .body { padding: 4px 12px 8px; }
        table { width:100%; border-collapse: collapse; }
        th, td { text-align: left; vertical-align: top; padding: 5px 8px; border-bottom: 1px dashed #eef2f7; font-size: 10.5px; }
        tr:last-child th, tr:last-child td { border-bottom: 0; }
        th { width: 42%; color:#475569; font-weight: 600; }
        td { color: #0f172a; font-weight: 500; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
        .chips { padding: 6px 12px 10px; }
        .chips b { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; margin-right: 4px; }
        .chips span { display:inline-block; padding: 2px 8px; margin: 3px 4px 0 0; border-radius: 3px; font-size: 9.5px; font-weight: 600; background: #eff6ff; color: #0a2463; border: 1px solid #dbeafe; }
        .site-block { display: grid; grid-template-columns: 1fr 220px; gap: 14px; padding: 6px 12px 8px; align-items: start; }
        .site-info table { width: 100%; }
        .site-map { display: flex; flex-direction: column; gap: 4px; }
        .map-frame { position: relative; width: 220px; height: 140px; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; background: #e2e8f0; }
        .map-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .map-frame .map-marker { position: absolute; top: 50%; left: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 999px; background: #ef4444; border: 2px solid #fff; box-shadow: 0 0 0 1px #ef4444; }
        .map-frame .map-tag { position: absolute; top: 4px; left: 4px; background: rgba(10,36,99,0.9); color: #fff; font-size: 7.5px; font-weight: 700; letter-spacing: 0.1em; padding: 2px 5px; border-radius: 2px; }
        .latlng-pill { display: flex; align-items: center; justify-content: center; gap: 4px; background: #0a2463; color: #fff; border-radius: 3px; padding: 4px 6px; font-family: 'Menlo', 'Consolas', monospace; font-size: 8.5px; }
        .latlng-pill .ll-k { color: #93c5fd; font-weight: 700; letter-spacing: 0.1em; }
        .latlng-pill .ll-v { color: #fff; font-weight: 600; }
        .latlng-pill .ll-sep { width: 1px; height: 9px; background: rgba(255,255,255,0.25); }
        .map-link { text-align: center; }
        .map-link a { color: #0a2463; text-decoration: none; font-size: 8.5px; font-weight: 600; }
        footer { margin-top: 18px; padding-top: 8px; border-top: 2px solid #0a2463; color:#64748b; font-size: 8.5px; display:flex; justify-content: space-between; align-items:center; }
        footer .brand-mark { font-weight: 700; letter-spacing: 0.1em; color: #0a2463; text-transform: uppercase; }
      </style></head><body>
      <div class="page">
      <div class="hero">
        <div class="logo">
          <img src="https://res.cloudinary.com/dd8fsxba6/image/upload/v1755166473/logo-bg_less_yaefzj.png" alt="WTT International" crossorigin="anonymous" />
          <div>
            <div class="co">WTT International Pvt Ltd</div>
            <h1>${isProposal ? "Plant Proposal" : "Questionnaire for New Plant"}</h1>
            <div class="tag">${isProposal ? "Proposal · " : ""}Effluent Treatment · Recovery · Reuse · Zero Liquid Discharge</div>
          </div>
        </div>
        <div class="meta">
          <div><span class="k">Date</span> &nbsp; <span class="v">${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
          <div><span class="k">Status</span> &nbsp; <span class="v">${completion}% complete</span></div>
          <div class="ref">REF · ${esc(refNo)}</div>
        </div>
      </div>

      <div class="summary">
        <div class="stat"><div class="l">Industry</div><div class="v">${esc(form.industry_name || "—")}</div></div>
        <div class="stat"><div class="l">Sector</div><div class="v">${esc(form.sector || "—")}</div></div>
        <div class="stat"><div class="l">Capacity</div><div class="v">${esc(form.effluent_capacity || "—")} <small>KLD</small></div></div>
        <div class="stat"><div class="l">Completion</div><div class="v">${completion}%<div class="progress"><i style="width:${completion}%"></i></div></div></div>
      </div>

      <section><header><span class="dot"></span><h2>Customer & Industry</h2></header><div class="body"><div class="grid">
        <table>${row("Industry / Company", form.industry_name)}${row("Sector", form.sector)}${row("Contact Person", form.contact_person)}${row("Designation", form.designation)}${row("Lead Source", form.source)}${row("Source Detail", form.source_detail)}</table>
        <table>${row("Mobile", form.mobile_no)}${row("Email", form.email)}${row("Present Requirement", form.present_requirement)}</table>
      </div></div></section>

      <section><header><span class="dot"></span><h2>Site Address</h2></header><div class="body">
        ${(form.latitude && form.longitude) ? `
        <div class="site-block">
          <div class="site-info"><table>
            ${row("Address", form.address)}${row("District", form.district)}${row("State", form.state)}${row("Country", form.country)}${row("Pincode", form.pincode)}
          </table></div>
          <div class="site-map">
            <div class="map-frame">
              <img src="https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${parseFloat(form.longitude)-0.004},${parseFloat(form.latitude)-0.003},${parseFloat(form.longitude)+0.004},${parseFloat(form.latitude)+0.003}&bboxSR=4326&imageSR=3857&size=420,260&format=jpg&f=image" alt="Satellite view" crossorigin="anonymous" />
              <span class="map-marker"></span>
              <span class="map-tag">SATELLITE</span>
            </div>
            <div class="latlng-pill">
              <span class="ll-k">LAT</span><span class="ll-v">${esc(parseFloat(form.latitude).toFixed(6))}</span>
              <span class="ll-sep"></span>
              <span class="ll-k">LNG</span><span class="ll-v">${esc(parseFloat(form.longitude).toFixed(6))}</span>
            </div>
            <div class="map-link"><a href="https://www.google.com/maps/?q=${esc(form.latitude)},${esc(form.longitude)}">Open in Google Maps ↗</a></div>
          </div>
        </div>
        ` : `<table>
          ${row("Address", form.address)}${row("District", form.district)}${row("State", form.state)}${row("Country", form.country)}${row("Pincode", form.pincode)}
        </table>`}
      </div></section>

      <section><header><span class="dot"></span><h2>Existing Plant</h2></header><div class="body"><table>
        ${row("Existing Plant?", form.has_existing_plant)}${row("Details", form.existing_plant_details)}
      </table></div></section>

      <section><header><span class="dot"></span><h2>Plant & System Details</h2></header><div class="body"><div class="grid">
        <table>
          ${row("Operating Hours/Day", form.operating_hours)}${row("Working Days/Week", form.working_days)}${row("Shifts/Day", form.shifts)}
          ${row("Power", form.power_kw ? `${form.power_kw} kW${form.power_phase ? ` (${form.power_phase} phase)` : ""}` : "")}
          ${row("Discharge Norm", form.discharge_norm)}
          ${row("Civil Scope", form.civil_scope)}${row("Site Readiness", form.site_readiness)}
        </table>
        <table>
          ${row("Outlet BOD (mg/L)", form.outlet_bod)}${row("Outlet COD (mg/L)", form.outlet_cod)}
          ${row("Outlet TSS (mg/L)", form.outlet_tss)}${row("Outlet TDS (mg/L)", form.outlet_tds)}
          ${row("Reuse Purpose", form.reuse_purpose)}${row("Sludge Disposal", form.sludge_disposal)}
          ${row("Commissioning Target", form.commissioning_target)}${row("Budget Range", form.budget_range)}
          ${row("Preferred Technology", form.preferred_technology)}
        </table>
      </div>
      ${form.utilities_available.length ? `<div class="chips"><b>Utilities at site:</b>${form.utilities_available.map((u) => `<span>${esc(u)}</span>`).join("")}</div>` : ""}
      ${form.remarks ? `<table>${row("Remarks", form.remarks)}</table>` : ""}
      </div></section>

      <section><header><span class="dot"></span><h2>Plant Requirement</h2></header><div class="body"><table>
        ${row("Effluent Capacity (KLD)", form.effluent_capacity)}${row("Area Availability (sq.m)", form.area_availability)}
        ${row("Raw Water Treatment", form.raw_water_required)}${row("Recovery of Salt", form.recovery_of_salt ? "Yes" : "")}
        ${form.treatment_required.length ? `<tr><th>Treatment Required</th><td>${esc(list(form.treatment_required))}</td></tr>` : ""}
      </table></div></section>

      ${inletRows ? `<section><header><span class="dot"></span><h2>Inlet Parameters</h2></header><div class="body"><table>${inletRows}${row("Heavy Metals", form.heavy_metals)}</table></div></section>` : ""}

      <footer><span><span class="brand-mark">WTT International</span> Private Limited</span><span>Ref ${esc(refNo)} · Generated ${new Date().toLocaleString("en-IN")}</span></footer>
      </div>
      </body></html>`;
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) { alert("Please allow pop-ups to export the PDF."); return; }
    w.document.open(); w.document.write(html); w.document.close();
    const doPrint = () => { try { w.focus(); w.print(); } catch {} };
    const triggerWhenReady = () => {
      try {
        const imgs = Array.from(w.document.images);
        if (imgs.length === 0) { doPrint(); return; }
        let remaining = imgs.length;
        const done = () => { if (--remaining <= 0) doPrint(); };
        imgs.forEach((img) => {
          if (img.complete && img.naturalWidth > 0) done();
          else { img.addEventListener("load", done); img.addEventListener("error", done); }
        });
        setTimeout(doPrint, 4000);
      } catch { doPrint(); }
    };
    if (w.document.readyState === "complete") setTimeout(triggerWhenReady, 200);
    else w.addEventListener("load", () => setTimeout(triggerWhenReady, 200));
  };

  const handleThankCustomer = (channel: "whatsapp" | "email") => {
    const name = (form.contact_person || "Sir/Madam").split(" ")[0];
    const company = form.industry_name ? ` (${form.industry_name})` : "";
    const msg = `Dear ${name},\n\nThank you for your enquiry${company} with WTT International for your plant requirement. We have received your details and our team will get back to you shortly with a tailored proposal.\n\nWarm regards,\nWTT International Pvt Ltd`;
    const subject = `Thank you for your enquiry — WTT International`;
    if (channel === "whatsapp") {
      const phone = (form.mobile_no || "").replace(/\D/g, "");
      if (!phone) { alert("Add a mobile number first."); return; }
      const url = `https://wa.me/${phone.length === 10 ? "91" + phone : phone}?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      if (!form.email) { alert("Add an email first."); return; }
      window.location.href = `mailto:${form.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
    }
  };

  if (view === "dashboard") {
    return (
      <Layout>
        <EnquiryDashboard
          list={list}
          onNew={handleNew}
          onOpen={handleOpen}
          onDelete={handleDelete}
          onMarkStatus={markStatus}
          onSendProposal={sendProposalForEnquiry}
          onViewProposal={viewProposalForEnquiry}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 lg:p-4 h-[calc(100vh-0px)] flex flex-col gap-3 overflow-hidden">
        {/* Compact header */}
        <div className="bg-white border border-gray-200 rounded-md px-3 py-2 flex items-center gap-3 shrink-0">
          <button onClick={handleBackToDashboard} title="Back to dashboard" className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 transition">
            <ChevronDown className="w-4 h-4 text-gray-700 rotate-90" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-400">WTT International {currentId ? "· Editing" : "· New Enquiry"}</div>
            <h1 className="text-[13px] font-bold tracking-tight leading-tight text-gray-900 truncate">Questionnaire for New Plant</h1>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">Completion</span>
            <div className="w-20 h-1 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-gray-700 transition-all" style={{ width: `${completion}%` }} />
            </div>
            <span className="text-[11px] font-bold tabular-nums text-gray-700">{completion}%</span>
          </div>
          {/* Auto-save toggle + status */}
          <div className="hidden md:flex items-center gap-2 pr-2 border-r border-slate-200 mr-1">
            <button
              type="button"
              role="switch"
              aria-checked={autoSaveOn}
              onClick={() => setAutoSaveOn((v) => !v)}
              title={autoSaveOn ? "Auto-save ON — saves every 5s" : "Auto-save OFF"}
              className={cn(
                "relative inline-flex h-4 w-7 items-center rounded-full transition shrink-0",
                autoSaveOn ? "bg-[#0a2463]" : "bg-slate-300"
              )}
            >
              <span className={cn(
                "inline-block h-3 w-3 transform rounded-full bg-white transition shadow",
                autoSaveOn ? "translate-x-3.5" : "translate-x-0.5"
              )} />
            </button>
            <div className="leading-tight">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-700">Auto-save</div>
              <div className={cn(
                "text-[9px] font-semibold tabular-nums transition-colors",
                autoSavedFlag ? "text-emerald-600" : "text-slate-400"
              )}>
                {autoSaveOn ? (autoSavedFlag ? "✓ Saved" : (savedAt ? `Last ${savedAt}` : "Waiting…")) : "Off"}
              </div>
            </div>
          </div>

          {/* Lead Status pill */}
          {currentId && (() => {
            const meta = STATUS_META[currentStatus];
            const Ico = meta.icon;
            return (
              <div className={cn("hidden md:inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-semibold tracking-wide", meta.tone)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
                <Ico className="w-3 h-3" /> {meta.label}
              </div>
            );
          })()}

          <button onClick={() => handleSave()} className="inline-flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 rounded-md text-[10px] font-semibold tracking-wide transition shadow-sm">
            <Save className="w-3 h-3" /> Save
          </button>

          {/* Send Lead — to internal sales */}
          <div className="relative" ref={sendLeadRef}>
            <button
              onClick={() => setSendLeadOpen((o) => !o)}
              title="Forward this lead to your team"
              style={{ backgroundColor: "#0ea5e9" }}
              className="inline-flex items-center gap-1.5 hover:brightness-110 text-white px-2.5 py-1.5 rounded-md text-[10px] font-semibold tracking-wide transition shadow-sm"
            >
              <Send className="w-3 h-3" /> Send Lead <ChevronDown className={cn("w-3 h-3 transition-transform", sendLeadOpen && "rotate-180")} />
            </button>
            {sendLeadOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-md bg-white border border-slate-200 shadow-lg overflow-hidden z-30">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                  <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Forward Lead</div>
                </div>
                <button onClick={() => sendLeadVia("whatsapp")} className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-slate-50 text-left transition border-l-2 border-transparent hover:border-emerald-500">
                  <span className="w-7 h-7 rounded bg-emerald-500 text-white flex items-center justify-center shrink-0"><MessageCircle className="w-3.5 h-3.5" /></span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-800 leading-tight">WhatsApp</div>
                    <div className="text-[9.5px] text-slate-500 leading-tight mt-0.5">Pre-filled lead summary</div>
                  </div>
                </button>
                <button onClick={() => sendLeadVia("email")} className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-slate-50 text-left transition border-l-2 border-transparent hover:border-[#0a2463] border-t border-slate-100">
                  <span style={{ backgroundColor: "#0a2463" }} className="w-7 h-7 rounded text-white flex items-center justify-center shrink-0"><Mail className="w-3.5 h-3.5" /></span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-800 leading-tight">Email</div>
                    <div className="text-[9.5px] text-slate-500 leading-tight mt-0.5">Open mail client with lead</div>
                  </div>
                </button>
                <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Update Status</div>
                </div>
                <button onClick={() => { markContacted(); setSendLeadOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-amber-50 text-left transition text-[11px] text-slate-700">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" /> Mark as Contacted
                </button>
                <button onClick={() => { sendProposal(); setSendLeadOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 text-left transition text-[11px] text-slate-700 border-t border-slate-100">
                  <FileCheck2 className="w-3.5 h-3.5 text-[#0ea5e9]" /> Generate &amp; Send Proposal
                </button>
                {currentEnquiry?.proposalRef && (
                  <button onClick={() => { handleExportPdf({ markProposal: true, id: currentId, existingRef: currentEnquiry.proposalRef }); setSendLeadOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left transition text-[11px] text-slate-700 border-t border-slate-100">
                    <Eye className="w-3.5 h-3.5 text-slate-500" /> View Proposal ({currentEnquiry.proposalRef})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Export menu — split button (solid brand color) */}
          <div className="relative" ref={exportMenuRef}>
            <div className="inline-flex rounded-md shadow-sm overflow-hidden">
              <button
                onClick={() => handleExportPdf()}
                title="Print / Save as PDF"
                style={{ backgroundColor: "#0a2463" }}
                className="inline-flex items-center gap-1.5 hover:brightness-110 text-white px-3 py-1.5 text-[10px] font-semibold tracking-wide transition"
              >
                <FileText className="w-3 h-3" /> Export PDF
              </button>
              <button
                onClick={() => setExportMenuOpen((o) => !o)}
                title="More export options"
                style={{ backgroundColor: "#0ea5e9" }}
                className="inline-flex items-center justify-center hover:brightness-110 text-white px-1.5 py-1.5 border-l border-white/20 transition"
              >
                <ChevronDown className={cn("w-3 h-3 transition-transform", exportMenuOpen && "rotate-180")} />
              </button>
            </div>
            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-md bg-white border border-slate-200 shadow-lg overflow-hidden z-30">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                  <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Export Options</div>
                </div>
                <button
                  onClick={() => { setExportMenuOpen(false); handleExportPdf(); }}
                  className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-slate-50 text-left transition border-l-2 border-transparent hover:border-[#0a2463]"
                >
                  <span style={{ backgroundColor: "#0a2463" }} className="w-7 h-7 rounded text-white flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-800 leading-tight">PDF Report</div>
                    <div className="text-[9.5px] text-slate-500 leading-tight mt-0.5">Branded A4 print-ready</div>
                  </div>
                </button>
                <button
                  onClick={() => { setExportMenuOpen(false); handleExport(); }}
                  className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-slate-50 text-left transition border-l-2 border-transparent hover:border-[#0ea5e9] border-t border-slate-100"
                >
                  <span style={{ backgroundColor: "#0ea5e9" }} className="w-7 h-7 rounded text-white flex items-center justify-center shrink-0">
                    <Download className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-800 leading-tight">JSON Data</div>
                    <div className="text-[9.5px] text-slate-500 leading-tight mt-0.5">Raw structured export</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button onClick={() => handleThankCustomer("whatsapp")} title="Thank via WhatsApp" className="inline-flex items-center gap-1.5 border border-emerald-200 hover:border-emerald-400 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-md text-[10px] font-semibold tracking-wide transition shadow-sm">
            <Send className="w-3 h-3" /> WhatsApp
          </button>
          <button onClick={() => handleThankCustomer("email")} title="Thank via Email" className="inline-flex items-center gap-1.5 border border-sky-200 hover:border-sky-400 bg-sky-50/60 hover:bg-sky-50 text-sky-700 px-2.5 py-1.5 rounded-md text-[10px] font-semibold tracking-wide transition shadow-sm">
            <Mail className="w-3 h-3" /> Email
          </button>
          <button onClick={handleReset} title="Reset" className="inline-flex items-center gap-1 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 text-slate-500 px-2 py-1.5 rounded-md text-[10px] font-semibold transition shadow-sm bg-white">
            <RotateCcw className="w-3 h-3" />
          </button>
          {savedAt && <span className="hidden lg:inline text-[10px] text-gray-400">Saved {savedAt}</span>}
        </div>

        {/* Post-save action banner */}
        {postSaveToast && (
          <div className="bg-white border border-[#0ea5e9]/30 rounded-md px-3 py-2 flex items-center gap-3 shrink-0 shadow-sm">
            <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: "#0ea5e9" }}>
              <BadgeCheck className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-[#0a2463] leading-tight">Enquiry saved · what's next?</div>
              <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Forward this lead to your team or update its status.</div>
            </div>
            <button onClick={() => sendLeadVia("whatsapp")} className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide transition">
              <MessageCircle className="w-3 h-3" /> WhatsApp
            </button>
            <button onClick={() => sendLeadVia("email")} style={{ backgroundColor: "#0a2463" }} className="inline-flex items-center gap-1 hover:brightness-110 text-white px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide transition">
              <Mail className="w-3 h-3" /> Email
            </button>
            <button onClick={markContacted} className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide transition">
              <UserCheck className="w-3 h-3" /> Mark Contacted
            </button>
            <button onClick={sendProposal} style={{ backgroundColor: "#0ea5e9" }} className="inline-flex items-center gap-1 hover:brightness-110 text-white px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide transition">
              <FileCheck2 className="w-3 h-3" /> Send Proposal
            </button>
            <button onClick={() => setPostSaveToast(null)} title="Dismiss" className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Two-column body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0 overflow-hidden">
          {/* LEFT — Enquiry form */}
          <div className="overflow-auto pr-1 space-y-3 min-h-0">
            {/* Step 1 — VC Auto Scanner */}
            <VCScanCard onApply={fillFromCard} />

            {/* Industry & Contact */}
            <SectionCard icon={Building2} title="Industry & Contact" accent="bg-indigo-50 text-indigo-700 border-indigo-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <Field label="Industry Name" icon={Building2} value={form.industry_name} onChange={(v) => set("industry_name", v)} placeholder="e.g. Divya Textiles" required />
                <Field label="Contact Person" icon={User} value={form.contact_person} onChange={(v) => set("contact_person", v)} placeholder="Full name" required />
                <Field label="Designation" icon={ClipboardList} value={form.designation} onChange={(v) => set("designation", v)} placeholder="e.g. Plant Manager" />
                <Field label="Mobile No" icon={Phone} value={form.mobile_no} onChange={(v) => set("mobile_no", v)} placeholder="+91 …" required />
                <Field label="Email" icon={Mail} type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="name@company.com" required />
                <Select label="Sector / Industry" icon={Factory} value={form.sector} onChange={(v) => set("sector", v)} options={SECTORS} placeholder="Select sector…" />
                <Select label="Lead Source" icon={Sparkles} value={form.source} onChange={(v) => set("source", v)} options={SOURCES} placeholder="How did you hear about us?" />
                <Field label="Source Detail" icon={NotebookPen} value={form.source_detail} onChange={(v) => set("source_detail", v)} placeholder={form.source === "Expo / Trade Show" ? "e.g. IFAT India 2026, Booth A-12" : "Reference name / Campaign / Event"} />
                <div className="md:col-span-2">
                  <TextArea label="Present Requirement" icon={ClipboardList} value={form.present_requirement} onChange={(v) => set("present_requirement", v)} placeholder="Briefly describe your treatment need…" rows={2} />
                </div>
              </div>
            </SectionCard>

            {/* Address */}
            <SectionCard
              icon={MapPin}
              title="Site Address"
              accent="bg-amber-50 text-amber-800 border-amber-100"
              right={
                <div className="flex items-center gap-1">
                  {form.latitude && form.longitude && (
                    <a
                      href={`https://www.google.com/maps/?q=${form.latitude},${form.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Open in Google Maps"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-300 hover:border-amber-500 bg-white text-[10px] font-semibold text-amber-800 transition"
                    >
                      <ExternalLink className="w-3 h-3" /> {parseFloat(form.latitude).toFixed(3)}, {parseFloat(form.longitude).toFixed(3)}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setMapOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-300 hover:border-amber-500 bg-white text-[10px] font-semibold text-amber-800 transition"
                  >
                    <Navigation className="w-3 h-3" /> {form.latitude ? "Change" : "Pick on Map"}
                  </button>
                </div>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="md:col-span-2">
                  <TextArea label="Address" icon={MapPin} value={form.address} onChange={(v) => set("address", v)} rows={2} />
                </div>
                <Field label="District" value={form.district} onChange={(v) => set("district", v)} />
                <Field label="State" value={form.state} onChange={(v) => set("state", v)} />
                <Field label="Country" icon={Globe2} value={form.country} onChange={(v) => set("country", v)} />
                <Field label="Pincode" icon={Hash} value={form.pincode} onChange={(v) => set("pincode", v)} />
                <Field label="Latitude" icon={Navigation} value={form.latitude} onChange={(v) => set("latitude", v)} placeholder="e.g. 12.972" />
                <Field label="Longitude" icon={Navigation} value={form.longitude} onChange={(v) => set("longitude", v)} placeholder="e.g. 77.594" />
              </div>
            </SectionCard>

            {/* Existing plant */}
            <SectionCard icon={Layers} title="Existing Plant" accent="bg-teal-50 text-teal-700 border-teal-100">
              <div className="grid grid-cols-1 gap-2.5">
                <YesNo label="Is there any existing plant?" icon={Factory} value={form.has_existing_plant} onChange={(v) => set("has_existing_plant", v)} />
                <TextArea
                  label="Existing Plant Details"
                  value={form.existing_plant_details}
                  onChange={(v) => set("existing_plant_details", v)}
                  placeholder={form.has_existing_plant === "yes" ? "Capacity, age, technology, issues…" : "Not applicable"}
                  rows={2}
                />
              </div>
            </SectionCard>

            {/* Plant & system operational details */}
            <SectionCard icon={Sparkles} title="Plant & System Details" accent="bg-violet-50 text-violet-700 border-violet-100" badge="Operations">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                <Field label="Operating Hours/Day" icon={ThermometerSun} value={form.operating_hours} onChange={(v) => set("operating_hours", v)} suffix="hrs" />
                <Field label="Working Days/Week" value={form.working_days} onChange={(v) => set("working_days", v)} suffix="days" />
                <Field label="Shifts/Day" value={form.shifts} onChange={(v) => set("shifts", v)} />
                <Field label="Power Available" value={form.power_kw} onChange={(v) => set("power_kw", v)} suffix="kW" />
                <NativeSelect label="Power Phase" value={form.power_phase} onChange={(v) => set("power_phase", v as any)} options={[
                  { v: "", l: "—" },
                  { v: "single", l: "Single Phase" },
                  { v: "three", l: "Three Phase" },
                ]} />
                <Select label="Discharge Norm" value={form.discharge_norm} onChange={(v) => set("discharge_norm", v)} options={DISCHARGE_NORMS} />
              </div>

              <div className="mt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1 mb-2">
                  <Beaker className="w-3 h-3" /> Outlet Quality Required (treated water targets)
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <Field label="BOD" value={form.outlet_bod} onChange={(v) => set("outlet_bod", v)} suffix="mg/L" />
                  <Field label="COD" value={form.outlet_cod} onChange={(v) => set("outlet_cod", v)} suffix="mg/L" />
                  <Field label="TSS" value={form.outlet_tss} onChange={(v) => set("outlet_tss", v)} suffix="mg/L" />
                  <Field label="TDS" value={form.outlet_tds} onChange={(v) => set("outlet_tds", v)} suffix="mg/L" />
                </div>
              </div>

              <div className="mt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1 mb-2">
                  <Recycle className="w-3 h-3" /> Utilities Available at Site
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {UTILITIES.map((u) => (
                    <Chip
                      key={u}
                      label={u}
                      active={form.utilities_available.includes(u)}
                      onClick={() =>
                        set("utilities_available",
                          form.utilities_available.includes(u)
                            ? form.utilities_available.filter((x) => x !== u)
                            : [...form.utilities_available, u]
                        )
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3">
                <TextArea label="Reuse / Reject Purpose" value={form.reuse_purpose} onChange={(v) => set("reuse_purpose", v)} placeholder="e.g. cooling tower makeup, gardening, ZLD reject for evaporator…" rows={2} />
                <TextArea label="Sludge Disposal Method" value={form.sludge_disposal} onChange={(v) => set("sludge_disposal", v)} placeholder="e.g. TSDF, filter press cake, incineration…" rows={2} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-3">
                <NativeSelect label="Civil Work Scope" value={form.civil_scope} onChange={(v) => set("civil_scope", v as any)} options={[
                  { v: "", l: "—" },
                  { v: "client", l: "By Client" },
                  { v: "wtt", l: "By WTT" },
                  { v: "shared", l: "Shared" },
                ]} />
                <NativeSelect label="Site Readiness" value={form.site_readiness} onChange={(v) => set("site_readiness", v as any)} options={[
                  { v: "", l: "—" },
                  { v: "ready", l: "Ready" },
                  { v: "in_progress", l: "In Progress" },
                  { v: "not_started", l: "Not Started" },
                ]} />
                <Field label="Commissioning Target" type="month" value={form.commissioning_target} onChange={(v) => set("commissioning_target", v)} />
                <Field label="Budget Range" value={form.budget_range} onChange={(v) => set("budget_range", v)} placeholder="e.g. ₹1.5–2.0 Cr" />
                <div className="md:col-span-2">
                  <Field label="Preferred Technology / Brand" value={form.preferred_technology} onChange={(v) => set("preferred_technology", v)} placeholder="e.g. MBR, MBBR, SAFF, RO + MEE…" />
                </div>
              </div>

              <div className="mt-3">
                <TextArea label="Additional Remarks" value={form.remarks} onChange={(v) => set("remarks", v)} rows={2} />
              </div>
            </SectionCard>

            {/* Plant requirement */}
            <SectionCard icon={Droplets} title="Plant Requirement Details" accent="bg-blue-50 text-blue-700 border-blue-100" badge="Process">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <Field label="Effluent Capacity" icon={Droplets} value={form.effluent_capacity} onChange={(v) => set("effluent_capacity", v)} suffix="KLD" />
                <Field label="Area Availability" icon={MapPin} value={form.area_availability} onChange={(v) => set("area_availability", v)} suffix="sq.m" />
                <div className="md:col-span-2">
                  <YesNo label="Raw Water Treatment Required?" icon={Beaker} value={form.raw_water_required} onChange={(v) => set("raw_water_required", v)} />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1 mb-2">
                  <Recycle className="w-3 h-3" /> Treatment Required
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {TREATMENT_OPTIONS.map((t) => (
                    <Chip
                      key={t}
                      label={t}
                      active={form.treatment_required.includes(t)}
                      onClick={() =>
                        set("treatment_required",
                          form.treatment_required.includes(t)
                            ? form.treatment_required.filter((x) => x !== t)
                            : [...form.treatment_required, t]
                        )
                      }
                    />
                  ))}
                </div>
              </div>
              <label className="mt-3 inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.recovery_of_salt}
                  onChange={(e) => set("recovery_of_salt", e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                />
                <span className="text-xs font-semibold text-gray-700">Recovery of Salt</span>
              </label>
            </SectionCard>

            {/* Inlet parameters */}
            <SectionCard
              icon={FlaskConical}
              title="Inlet Parameters"
              accent="bg-rose-50 text-rose-700 border-rose-100"
              badge={`${Object.values(form.inlet).filter(Boolean).length}/${INLET_FIELDS.length}`}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {INLET_FIELDS.map((f) => (
                  <Field
                    key={f.key}
                    label={f.label}
                    value={form.inlet[f.key] || ""}
                    onChange={(v) => setInlet(f.key, v)}
                    suffix={f.unit}
                  />
                ))}
              </div>
              <div className="mt-3">
                <TextArea label="Heavy Metals (if any)" icon={ThermometerSun} value={form.heavy_metals} onChange={(v) => set("heavy_metals", v)} placeholder="Cr, Pb, Ni, Zn… with concentrations" rows={2} />
              </div>
            </SectionCard>

            {/* Submit */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[180px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Form Completion</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all" style={{ width: `${completion}%` }} />
                  </div>
                  <span className="text-sm font-extrabold tabular-nums text-gray-700">{completion}%</span>
                </div>
              </div>
              <button
                onClick={() => alert("Submission endpoint not yet wired. Use 'Export' for now.")}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition-all"
              >
                <Send className="w-3.5 h-3.5" /> Submit Enquiry
              </button>
            </div>

            <div className="text-center text-[10px] text-gray-400 pt-1 pb-2">
              © WTT INTERNATIONAL PRIVATE LIMITED
            </div>
          </div>

          {/* RIGHT — Meeting minutes (full height) */}
          <div className="min-h-0 overflow-hidden">
            <MeetingMinutesPanel industry={form.industry_name} />
          </div>
        </div>
      </div>

      <MapPicker
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        lat={form.latitude}
        lng={form.longitude}
        onSave={(ll, addr) => {
          setForm((f) => ({
            ...f,
            latitude: ll.lat,
            longitude: ll.lng,
            address: addr.address || f.address,
            district: addr.city || f.district,
            state: addr.state || f.state,
            country: addr.country || f.country,
            pincode: addr.pincode || f.pincode,
          }));
        }}
      />
    </Layout>
  );
}
