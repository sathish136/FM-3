import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { AutoCaptureModal } from "@/pages/VCCardScanner";
import { MicLevelBars } from "@/components/MicLevelBars";
import {
  Factory, User, Phone, Mail, Building2, MapPin, Globe2, Hash,
  Droplets, Beaker, ThermometerSun, FlaskConical, Recycle, Search,
  CheckCircle2, Save, RotateCcw, ChevronDown, X, Download, Send,
  ClipboardList, Sparkles, Layers, ScanLine, NotebookPen, Plus,
  Trash2, GripVertical, ListChecks, FileText, Navigation, ExternalLink,
  Loader2, Crosshair, Eye, FileCheck2, UserCheck, BadgeCheck, MessageCircle,
  Trophy, XCircle, Filter, Mic, Square, Languages, Clipboard,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const VC_BASE = "/api";

// Realtime transcription is powered by:
//   browser MediaRecorder → /api/whisper-ws (WebSocket)
//                         → OpenAI Whisper (transcribe in spoken language)
//                         → GPT-4o-mini (translate to English)
// We rotate MediaRecorder every WHISPER_SEGMENT_MS so each segment is a complete,
// self-decodable WebM/Opus blob. Whisper covers Tamil, Telugu, Kannada, Malayalam,
// Marathi, Gujarati, Bengali, Punjabi, Hindi and English at production quality.
function buildWhisperWsUrl(uiLangCode: string, mime: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({ lang: uiLangCode, mime });
  return `${proto}//${window.location.host}/api/whisper-ws?${params.toString()}`;
}

const WHISPER_SEGMENT_MS = 4000;

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
const LIVE_TRANSCRIPT_KEY = "plant-enquiry-live-transcript";
const LIVE_LANG_KEY = "plant-enquiry-live-lang";

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
  const [scannerOpen, setScannerOpen] = useState(false);
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
      const dataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error || new Error("Failed to read file"));
        fr.readAsDataURL(f);
      });
      const r = await fetch(`${VC_BASE}/visiting-cards/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frontImage: dataUrl }),
      });
      if (!r.ok) throw new Error(`Scan failed (${r.status})`);
      const j = await r.json();
      console.log("[VC scan] response:", j);
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
            onClick={() => setScannerOpen(true)}
            title="Open VC Card Scanner here"
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-[10px] font-semibold text-gray-700 transition"
          >
            <Sparkles className="w-3 h-3" /> Scan Card
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

      </div>

      <ContactPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={onApply} />

      {scannerOpen && (
        <AutoCaptureModal
          onClose={() => setScannerOpen(false)}
          onComplete={async (dataUrl) => {
            setScannerOpen(false);
            setError(null);
            setPreview(dataUrl);
            setScanning(true);
            try {
              const r = await fetch(`${VC_BASE}/visiting-cards/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ frontImage: dataUrl }),
              });
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
          }}
        />
      )}
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

type PlaceHit = { display_name: string; lat: string; lon: string };

async function searchPlaces(q: string): Promise<PlaceHit[]> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=en&q=${encodeURIComponent(q)}`, {
      headers: { "Accept": "application/json" },
    });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j as PlaceHit[] : [];
  } catch { return []; }
}

function MapPicker({
  open, onClose, lat, lng, onSave, initialPaste,
}: { open: boolean; onClose: () => void; lat: string; lng: string; onSave: (ll: LatLng, addr: GeoAddr) => void; initialPaste?: string }) {
  const [pasted, setPasted] = useState("");
  const [cur, setCur] = useState<LatLng>({ lat, lng });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [addr, setAddr] = useState<GeoAddr>({});
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [searching, setSearching] = useState(false);

  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const searchTimerRef = useRef<number | null>(null);

  // Reset state every time the modal opens
  useEffect(() => {
    if (!open) return;
    setCur({ lat, lng });
    setPasted(initialPaste || "");
    setErr(null);
    setAddr({});
    setHits([]);
    if (lat && lng) {
      setBusy(true);
      reverseGeocode(lat, lng).then((a) => { setAddr(a); setBusy(false); });
    }
    if (initialPaste) {
      // Auto-run paste as soon as opened with seeded text
      setTimeout(() => { void usePasted(initialPaste); }, 50);
    }
  }, [open, lat, lng, initialPaste]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialise / tear down Leaflet when the modal opens / closes
  useEffect(() => {
    if (!open || !mapElRef.current) return;

    const startLat = parseFloat(lat) || 20.5937;
    const startLng = parseFloat(lng) || 78.9629;
    const startZoom = (lat && lng) ? 15 : 4;

    const map = L.map(mapElRef.current, {
      center: [startLat, startLng],
      zoom: startZoom,
      zoomControl: true,
      tap: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Custom big touch-friendly pin
    const pinIcon = L.divIcon({
      className: "",
      html: `<div style="position:relative;width:30px;height:42px;transform:translate(-50%,-100%);filter:drop-shadow(0 3px 4px rgba(0,0,0,.35));">
        <svg viewBox="0 0 30 42" width="30" height="42" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0C7 0 1 6 1 14c0 11 14 28 14 28s14-17 14-28C29 6 23 0 15 0z" fill="#dc2626"/>
          <circle cx="15" cy="14" r="5" fill="#fff"/>
        </svg>
      </div>`,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
    });

    if (lat && lng) {
      const m = L.marker([startLat, startLng], { icon: pinIcon, draggable: true }).addTo(map);
      m.on("dragend", () => {
        const p = m.getLatLng();
        const next = { lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) };
        setCur(next);
        void runReverseGeocode(next.lat, next.lng);
      });
      markerRef.current = m;
    }

    map.on("click", (e: L.LeafletMouseEvent) => {
      const next = { lat: e.latlng.lat.toFixed(6), lng: e.latlng.lng.toFixed(6) };
      setCur(next);
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        const m = L.marker(e.latlng, { icon: pinIcon, draggable: true }).addTo(map);
        m.on("dragend", () => {
          const p = m.getLatLng();
          const n = { lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) };
          setCur(n);
          void runReverseGeocode(n.lat, n.lng);
        });
        markerRef.current = m;
      }
      void runReverseGeocode(next.lat, next.lng);
    });

    // Force layout calc once modal painted (esp. on mobile)
    setTimeout(() => { try { map.invalidateSize(); } catch {} }, 100);

    return () => {
      try { map.remove(); } catch {}
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const runReverseGeocode = async (la: string, ln: string) => {
    setBusy(true); setErr(null);
    const a = await reverseGeocode(la, ln);
    setAddr(a);
    setBusy(false);
  };

  // Move map + marker programmatically
  const flyTo = (la: string, ln: string, zoom = 16) => {
    const map = mapRef.current; if (!map) return;
    const latN = parseFloat(la), lngN = parseFloat(ln);
    if (!isFinite(latN) || !isFinite(lngN)) return;
    map.setView([latN, lngN], zoom);
    if (markerRef.current) {
      markerRef.current.setLatLng([latN, lngN]);
    } else {
      const pinIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:30px;height:42px;transform:translate(-50%,-100%);filter:drop-shadow(0 3px 4px rgba(0,0,0,.35));">
          <svg viewBox="0 0 30 42" width="30" height="42" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 0C7 0 1 6 1 14c0 11 14 28 14 28s14-17 14-28C29 6 23 0 15 0z" fill="#dc2626"/>
            <circle cx="15" cy="14" r="5" fill="#fff"/>
          </svg>
        </div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      });
      const m = L.marker([latN, lngN], { icon: pinIcon, draggable: true }).addTo(map);
      m.on("dragend", () => {
        const p = m.getLatLng();
        const next = { lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) };
        setCur(next);
        void runReverseGeocode(next.lat, next.lng);
      });
      markerRef.current = m;
    }
  };

  const useCurrent = () => {
    if (!navigator.geolocation) { setErr("Geolocation not supported"); return; }
    setBusy(true); setErr(null);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const next = { lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) };
        setCur(next);
        flyTo(next.lat, next.lng, 17);
        const a = await reverseGeocode(next.lat, next.lng);
        setAddr(a);
        setBusy(false);
      },
      (e) => { setErr(e.message || "Unable to get current location"); setBusy(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // "Use" the search/paste box: try coords first, otherwise forward-geocode the text
  const usePasted = async (text?: string) => {
    const v = (text ?? pasted).trim();
    if (!v) return;
    const ll = parseLatLng(v);
    if (ll) {
      setErr(null);
      setCur(ll);
      flyTo(ll.lat, ll.lng, 16);
      setBusy(true);
      const a = await reverseGeocode(ll.lat, ll.lng);
      setAddr(a);
      setBusy(false);
      setHits([]);
      return;
    }
    // Forward geocode the address text
    setSearching(true); setErr(null);
    const results = await searchPlaces(v);
    setSearching(false);
    if (results.length === 0) {
      setErr("Couldn't find that place. Paste coordinates like '12.97, 77.59' or a Google Maps URL.");
      setHits([]);
      return;
    }
    if (results.length === 1) {
      pickHit(results[0]);
    } else {
      setHits(results);
    }
  };

  const pickHit = async (h: PlaceHit) => {
    const next = { lat: parseFloat(h.lat).toFixed(6), lng: parseFloat(h.lon).toFixed(6) };
    setCur(next);
    setHits([]);
    setPasted(h.display_name);
    flyTo(next.lat, next.lng, 16);
    setBusy(true);
    const a = await reverseGeocode(next.lat, next.lng);
    setAddr(a);
    setBusy(false);
  };

  // Live suggestions while typing (debounced) — only for non-coordinate text
  useEffect(() => {
    if (searchTimerRef.current) { clearTimeout(searchTimerRef.current); searchTimerRef.current = null; }
    const v = pasted.trim();
    if (!v || v.length < 3) { setHits([]); return; }
    if (parseLatLng(v)) { setHits([]); return; }
    searchTimerRef.current = window.setTimeout(async () => {
      setSearching(true);
      const r = await searchPlaces(v);
      setSearching(false);
      setHits(r);
    }, 450);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [pasted]);

  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) { setPasted(t); void usePasted(t); }
    } catch { setErr("Clipboard access denied. Long-press the box to paste."); }
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
  const gmapsLink = hasLL ? `https://www.google.com/maps/?q=${cur.lat},${cur.lng}` : "";
  const gmapsPick = `https://www.google.com/maps`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-white shadow-2xl w-full sm:max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl rounded-none flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <MapPin className="w-4 h-4 text-amber-700" />
          <span className="font-semibold text-sm text-gray-800">Pick site location</span>
          <span className="hidden sm:inline text-[11px] text-gray-500">— tap the map, drag the pin, or paste/search below</span>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-white/70 active:scale-95 text-gray-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search / paste row */}
        <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200 bg-white space-y-2">
          <div className="relative flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void usePasted(); } }}
                placeholder="Paste address, place, coordinates, or Google Maps URL"
                className="w-full pl-8 pr-8 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                autoComplete="off"
                inputMode="search"
              />
              {pasted && (
                <button
                  type="button"
                  onClick={() => { setPasted(""); setHits([]); setErr(null); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-gray-400"
                  aria-label="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={pasteFromClipboard}
              title="Paste from clipboard"
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-2.5 rounded-lg border border-gray-300 hover:border-amber-500 hover:bg-amber-50 text-xs font-semibold text-gray-700 active:scale-95"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paste</span>
            </button>
            <button
              type="button"
              onClick={() => void usePasted()}
              disabled={!pasted.trim()}
              className="shrink-0 px-3 py-2.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-40 active:scale-95"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Go"}
            </button>
          </div>

          {/* Search suggestions */}
          {hits.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm max-h-48 overflow-y-auto divide-y divide-gray-100">
              {hits.map((h, i) => (
                <button
                  key={`${h.lat}-${h.lon}-${i}`}
                  type="button"
                  onClick={() => pickHit(h)}
                  className="w-full text-left px-3 py-2 hover:bg-amber-50 active:bg-amber-100 text-[12px] text-gray-700 flex items-start gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{h.display_name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={useCurrent}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 hover:border-amber-500 hover:bg-amber-50 text-xs font-semibold text-gray-700 disabled:opacity-50 active:scale-95"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
              Use my location
            </button>
            <a
              href={gmapsPick}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 hover:border-amber-500 hover:bg-amber-50 text-xs font-semibold text-gray-700 active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Google Maps
            </a>
            {hasLL && (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                {parseFloat(cur.lat).toFixed(5)}, {parseFloat(cur.lng).toFixed(5)}
              </span>
            )}
          </div>
          {err && <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">{err}</div>}
        </div>

        {/* Map */}
        <div className="flex-1 min-h-[300px] bg-gray-100 relative">
          <div ref={mapElRef} className="absolute inset-0" />
          {!hasLL && (
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
              <div className="pointer-events-auto bg-white/95 backdrop-blur shadow-md rounded-full px-3 py-1.5 text-[11px] font-semibold text-gray-700 border border-gray-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                Tap anywhere on the map to drop a pin
              </div>
            </div>
          )}
        </div>

        {/* Address footer */}
        {(addr.address || hasLL) && (
          <div className="px-3 sm:px-4 py-2 border-t border-gray-200 bg-gray-50 text-[11px] text-gray-700 space-y-1">
            {addr.address && <div className="line-clamp-2"><span className="font-semibold">Address: </span>{addr.address}</div>}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
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

        {/* Action bar */}
        <div className="px-3 sm:px-4 py-3 border-t border-gray-200 bg-white flex items-center justify-end gap-2">
          {hasLL && !addr.address && (
            <button onClick={lookupAddr} disabled={busy} className="px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {busy ? "Looking up…" : "Look up address"}
            </button>
          )}
          <button onClick={onClose} className="px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95">Cancel</button>
          <button
            onClick={() => { if (cur.lat && cur.lng) onSave(cur, addr); onClose(); }}
            disabled={!hasLL}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-40 shadow-sm active:scale-95"
          >
            Use this location
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Meeting minutes panel ─────────────────────────────────────────────── */
/* ── Live transcript + auto-translate panel ───────────────────────────── */
type Segment = { id: string; t: string; original: string; translation?: string; speaker?: number };

// Tiny inline pill to label which speaker said a given segment. Color-coded so
// alternating speakers are easy to follow at a glance.
function SpeakerBadge({ n }: { n: number }) {
  const palette = n === 1
    ? "bg-indigo-100 text-indigo-700 ring-indigo-200"
    : "bg-emerald-100 text-emerald-700 ring-emerald-200";
  return (
    <span
      className={cn(
        "inline-block mr-1.5 px-1.5 py-px rounded text-[8px] font-bold uppercase tracking-wider align-middle ring-1",
        palette,
      )}
    >
      S{n}
    </span>
  );
}

const SUPPORTED_LANGS: Array<{ code: string; label: string }> = [
  { code: "auto",  label: "Auto-detect" },
  // Core trio the user always wants on top.
  { code: "en",    label: "English" },
  { code: "ta",    label: "Tamil" },
  { code: "hi",    label: "Hindi" },
  // Major international languages — alphabetical by label.
  { code: "ar",    label: "Arabic" },
  { code: "bn",    label: "Bengali" },
  { code: "zh",    label: "Chinese (Mandarin)" },
  { code: "nl",    label: "Dutch" },
  { code: "fil",   label: "Filipino" },
  { code: "fr",    label: "French" },
  { code: "de",    label: "German" },
  { code: "el",    label: "Greek" },
  { code: "he",    label: "Hebrew" },
  { code: "id",    label: "Indonesian" },
  { code: "it",    label: "Italian" },
  { code: "ja",    label: "Japanese" },
  { code: "ko",    label: "Korean" },
  { code: "ms",    label: "Malay" },
  { code: "fa",    label: "Persian" },
  { code: "pl",    label: "Polish" },
  { code: "pt",    label: "Portuguese" },
  { code: "ru",    label: "Russian" },
  { code: "es",    label: "Spanish" },
  { code: "sv",    label: "Swedish" },
  { code: "th",    label: "Thai" },
  { code: "tr",    label: "Turkish" },
  { code: "uk",    label: "Ukrainian" },
  { code: "ur",    label: "Urdu" },
  { code: "vi",    label: "Vietnamese" },
];

function pickAudioMime(): string {
  const opts = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  for (const m of opts) {
    try { if ((window as any).MediaRecorder?.isTypeSupported?.(m)) return m; } catch {}
  }
  return "";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function LiveWaveform({ analyser, level, active }: { analyser: AnalyserNode | null; level: number; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    const fit = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    const BAR_COUNT = 56;
    const fft = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let phase = 0;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Subtle baseline guide.
      ctx.strokeStyle = "rgba(15, 23, 42, 0.06)";
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      const gap = 3 * dpr;
      const barW = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT;
      const cy = h / 2;
      const maxAmp = h / 2 - 4 * dpr;

      if (analyser && fft) {
        analyser.getByteFrequencyData(fft);
      }
      phase += 0.08;

      for (let i = 0; i < BAR_COUNT; i++) {
        let amp: number;
        if (analyser && fft) {
          const start = Math.floor((i / BAR_COUNT) * (fft.length * 0.55));
          const end = Math.max(start + 1, Math.floor(((i + 1) / BAR_COUNT) * (fft.length * 0.55)));
          let sum = 0;
          for (let k = start; k < end; k++) sum += fft[k];
          amp = (sum / Math.max(1, end - start)) / 255;
          amp = Math.pow(amp, 0.7);
        } else {
          amp = active ? 0.04 + Math.abs(Math.sin(phase + i * 0.35)) * 0.06 : 0.015;
        }
        const barH = Math.max(2 * dpr, amp * maxAmp);
        const x = i * (barW + gap);
        // Cool indigo→sky palette on a light background.
        const hueBase = 220;
        const hue = hueBase + (i / BAR_COUNT) * 30;
        const sat = active ? 80 : 25;
        const light = active ? (54 - amp * 8) : 78;
        const g = ctx.createLinearGradient(0, cy - barH, 0, cy + barH);
        g.addColorStop(0,   `hsla(${hue}, ${sat}%, ${light}%, 0.95)`);
        g.addColorStop(0.5, `hsla(${hue + 10}, ${sat}%, ${light + 6}%, 1)`);
        g.addColorStop(1,   `hsla(${hue}, ${sat}%, ${light}%, 0.95)`);
        ctx.fillStyle = g;
        const r = Math.min(barW / 2, 3 * dpr);
        ctx.beginPath();
        ctx.moveTo(x + r, cy - barH);
        ctx.arcTo(x + barW, cy - barH, x + barW, cy + barH, r);
        ctx.arcTo(x + barW, cy + barH, x, cy + barH, r);
        ctx.arcTo(x, cy + barH, x, cy - barH, r);
        ctx.arcTo(x, cy - barH, x + barW, cy - barH, r);
        ctx.closePath();
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [analyser, active]);

  const pct = Math.min(100, Math.round(level * 140));

  return (
    <div className="relative w-full h-14 bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 border-b border-slate-200/80 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute top-1 right-2 flex items-center gap-1.5 z-10">
        <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400">mic</div>
        <div className="w-16 h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
          <div
            className="h-full transition-[width] duration-75"
            style={{
              width: `${pct}%`,
              background: pct > 70 ? "linear-gradient(90deg,#f43f5e,#fbbf24)" : "linear-gradient(90deg,#22c55e,#84cc16)",
            }}
          />
        </div>
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            active && level > 0.04 ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-white/20"
          )}
        />
      </div>
      {!active && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[10px] text-white/50 font-medium tracking-wide uppercase">Press Start to begin listening</div>
        </div>
      )}
    </div>
  );
}

function LiveTranscriptPanel({ industry }: { industry: string }) {
  const [language, setLanguage] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(LIVE_LANG_KEY);
      if (!saved) return "auto";
      // Migrate any old hyphenated codes (e.g. "en-IN", "ta-IN") to the new
      // bare ISO codes used by the international list.
      if (SUPPORTED_LANGS.some(l => l.code === saved)) return saved;
      const base = saved.split("-")[0].toLowerCase();
      if (SUPPORTED_LANGS.some(l => l.code === base)) return base;
      return "auto";
    } catch { return "auto"; }
  });
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [segments, setSegments] = useState<Segment[]>(() => {
    try {
      const s = localStorage.getItem(LIVE_TRANSCRIPT_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeRef = useRef<string>("audio/webm");
  const stopRequestedRef = useRef(false);
  const originalEndRef = useRef<HTMLDivElement>(null);
  const englishEndRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const interimRef = useRef("");
  const interimAtRef = useRef(0);
  const flushTimerRef = useRef<number | null>(null);
  const lastHeardRef = useRef(0);
  const restartAttemptsRef = useRef(0);
  // Realtime Whisper streaming refs — separate from the continuous "save" recorder.
  // We rotate a dedicated MediaRecorder every WHISPER_SEGMENT_MS so each segment is
  // a complete, self-decodable WebM/Opus blob that Whisper can transcribe.
  const wsRef = useRef<WebSocket | null>(null);
  const wsReadyRef = useRef(false);
  const segRecorderRef = useRef<MediaRecorder | null>(null);
  const segChunksRef = useRef<Blob[]>([]);
  const segTimerRef = useRef<number | null>(null);
  const segStreamRef = useRef<MediaStream | null>(null);
  const segMimeRef = useRef<string>("audio/webm");
  // Voice-activity detection: count analyser frames where the mic energy
  // crossed the speech threshold during the *current* segment. We require a
  // sustained run of voice (not a single spike) before we'll send the segment
  // to Whisper — otherwise Whisper invents greetings ("Hello!", "வணக்கம்!",
  // "Thanks for watching") and even full plausible-sounding sentences over
  // background noise / breathing.
  const segVoiceFramesRef = useRef(0);
  // Absolute floor — anything below this is treated as silence regardless of
  // the adaptive noise floor (prevents the threshold from collapsing in a
  // dead-quiet room, which would let mic self-noise trigger detection).
  const VOICE_RMS_FLOOR = 0.05;
  // Adaptive noise floor: a slowly-tracking estimate of the current ambient
  // RMS. Real speech must exceed this by VOICE_RMS_MARGIN to count as voiced.
  // This lets the gate stay tight in a quiet office and loosen automatically
  // in a noisy van/site without the user changing anything.
  const noiseFloorRef = useRef(0.02);
  const VOICE_RMS_MARGIN = 0.04;
  // Require ~400ms of cumulative real speech inside the 4s segment before we
  // ship it to Whisper. At ~60fps that's ≈24 analyser frames. This is loose
  // enough to keep short single words ("சரி", "yes", "ok") but strict enough
  // to reject coughs, keyboard taps, door slams, fan ramps, and breaths —
  // every one of which used to slip through the old 65ms gate and made
  // Whisper invent a sentence.
  const MIN_VOICE_FRAMES = 24;
  // Pitch tracking for speaker diarization: average voiced-frame pitch within
  // the current segment.
  const segPitchSumRef = useRef(0);
  const segPitchCountRef = useRef(0);
  // Two adaptive cluster centroids (Hz). Each new segment is assigned to the
  // closer one; if neither exists or the gap is wide, a new speaker is created.
  const speakerCentroidsRef = useRef<number[]>([]);
  // Map from server segment id -> assigned speaker number (1 or 2).
  const segmentSpeakerRef = useRef<Map<number, number>>(new Map());

  // Countdown shown after the user presses Start so they know roughly when
  // the first transcript will land (segment buffer + Whisper round trip).
  const [readyCountdown, setReadyCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const firstSegmentSeenRef = useRef(false);

  // Persist segments + lang
  useEffect(() => {
    try { localStorage.setItem(LIVE_TRANSCRIPT_KEY, JSON.stringify(segments)); } catch {}
  }, [segments]);
  useEffect(() => {
    try { localStorage.setItem(LIVE_LANG_KEY, language); } catch {}
  }, [language]);

  // Auto-scroll
  useEffect(() => {
    originalEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    englishEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [segments, interim]);

  // Cleanup on unmount
  useEffect(() => () => {
    stopRequestedRef.current = true;
    const r = recognitionRef.current;
    if (r) { try { r.onend = null; r.stop(); } catch {} }
    teardownWhisper();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
    if (flushTimerRef.current) window.clearInterval(flushTimerRef.current);
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      try { audioCtxRef.current.close(); } catch {}
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const translateSegment = async (id: string, text: string, sourceLang: string) => {
    if (!text.trim()) return;
    try {
      const res = await fetch(`${VC_BASE}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLang, targetLang: "English" }),
      });
      if (!res.ok) {
        let detail = "";
        try { const j = await res.json(); detail = j?.error || ""; } catch {}
        throw new Error(`HTTP ${res.status}${detail ? ` — ${String(detail).slice(0, 80)}` : ""}`);
      }
      const j = await res.json();
      const translated = (j.translation || "").trim();
      setSegments(prev => prev.map(s => s.id === id ? { ...s, translation: translated || "(empty translation)" } : s));
    } catch (e: any) {
      setSegments(prev => prev.map(s => s.id === id ? { ...s, translation: `(translation failed: ${e?.message || "error"})` } : s));
    }
  };

  // Commit a chunk of recognised speech as a final segment + kick off translation.
  const commitSegment = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const seg: Segment = { id, t: new Date().toLocaleTimeString(), original: t };
    setSegments(prev => [...prev, seg]);
    translateSegment(id, t, language);
  };

  // Show a "first transcript in N seconds" countdown so the user understands
  // the latency between starting and seeing words. ~5s covers the segment
  // buffer (4s) plus the Whisper round trip (~1s).
  const READY_COUNTDOWN_SECS = 5;
  const startReadyCountdown = () => {
    if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
    setReadyCountdown(READY_COUNTDOWN_SECS);
    countdownTimerRef.current = window.setInterval(() => {
      setReadyCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const stopReadyCountdown = () => {
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setReadyCountdown(null);
  };

  // Assign the incoming pitch to one of (up to two) speaker clusters. Returns
  // 1 or 2; returns 0 when we don't yet have a usable pitch reading. Cluster
  // centroids drift toward each new sample (running mean) so the system
  // adapts as voices vary mid-conversation.
  const SPEAKER_GAP_HZ = 35;
  const assignSpeaker = (pitchHz: number): number => {
    if (!pitchHz || pitchHz < 60 || pitchHz > 400) {
      // Unreliable pitch reading — don't tag this segment.
      return 0;
    }
    const centroids = speakerCentroidsRef.current;
    if (centroids.length === 0) {
      centroids.push(pitchHz);
      return 1;
    }
    if (centroids.length === 1) {
      // Only create a 2nd speaker if pitch is clearly different from the 1st.
      if (Math.abs(pitchHz - centroids[0]) < SPEAKER_GAP_HZ) {
        centroids[0] = centroids[0] * 0.85 + pitchHz * 0.15;
        return 1;
      }
      centroids.push(pitchHz);
      return 2;
    }
    // Two centroids exist — pick the closer one and update it (running mean).
    const d0 = Math.abs(pitchHz - centroids[0]);
    const d1 = Math.abs(pitchHz - centroids[1]);
    const idx = d0 <= d1 ? 0 : 1;
    centroids[idx] = centroids[idx] * 0.85 + pitchHz * 0.15;
    return idx + 1;
  };

  // Tear down the Whisper WebSocket + its rotating MediaRecorder.
  const teardownWhisper = () => {
    stopReadyCountdown();
    if (segTimerRef.current) {
      window.clearTimeout(segTimerRef.current);
      segTimerRef.current = null;
    }
    try {
      const mr = segRecorderRef.current;
      if (mr && mr.state !== "inactive") {
        // Detach handlers so the rotation doesn't auto-restart on stop.
        mr.ondataavailable = null as any;
        mr.onstop = null as any;
        mr.stop();
      }
    } catch {}
    segRecorderRef.current = null;
    segChunksRef.current = [];
    // Stop the cloned audio tracks we created for the segment recorder. The
    // original mic stream (streamRef.current) is owned by the main "save"
    // recorder and is torn down separately in stop()/cancelRecording().
    try {
      const segStream = segStreamRef.current;
      if (segStream && segStream !== streamRef.current) {
        segStream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      }
    } catch {}
    segStreamRef.current = null;
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try { wsRef.current.send(JSON.stringify({ type: "stop" })); } catch {}
        wsRef.current.close();
      }
    } catch {}
    wsRef.current = null;
    wsReadyRef.current = false;
  };

  // Start one segment of recording. When the timer fires (or stop() is called),
  // the segment's onstop handler ships the complete blob and immediately starts
  // the next segment, giving continuous coverage with ~tens-of-ms gaps.
  //
  // IMPORTANT: we clone the audio tracks PER SEGMENT (not once per session).
  // Recycling the same MediaStream across many MediaRecorder lifecycles
  // eventually causes Chromium's MediaRecorder.start() to throw "There was an
  // error starting the MediaRecorder" (we observed it after ~10 silent
  // rotations in production). A pristine cloned track per segment + tearing
  // it down when the recorder stops avoids that drift entirely.
  const startSegmentRecorder = () => {
    if (stopRequestedRef.current) return;
    const baseStream = streamRef.current;
    const ws = wsRef.current;
    if (!baseStream || !ws) return;

    let segStream: MediaStream;
    try {
      segStream = new MediaStream(baseStream.getAudioTracks().map((t) => t.clone()));
    } catch (err) {
      console.warn("[LiveTranscript] per-segment track.clone failed:", err);
      segStream = baseStream;
    }
    segStreamRef.current = segStream;
    const releaseSegStream = () => {
      if (segStream !== baseStream) {
        try { segStream.getTracks().forEach((t) => { try { t.stop(); } catch {} }); } catch {}
      }
    };

    const mime = segMimeRef.current;
    let mr: MediaRecorder;
    try {
      mr = mime ? new MediaRecorder(segStream, { mimeType: mime }) : new MediaRecorder(segStream);
    } catch (err: any) {
      try { mr = new MediaRecorder(segStream); } catch (e2: any) {
        console.error("[LiveTranscript] segment MediaRecorder failed:", e2);
        setError(`Realtime recorder unsupported: ${e2?.message || e2}`);
        releaseSegStream();
        return;
      }
    }
    segRecorderRef.current = mr;
    segChunksRef.current = [];
    // Reset per-segment voice + pitch counters.
    segVoiceFramesRef.current = 0;
    segPitchSumRef.current = 0;
    segPitchCountRef.current = 0;

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) segChunksRef.current.push(e.data);
    };
    mr.onstop = async () => {
      const chunks = segChunksRef.current;
      const voiceFrames = segVoiceFramesRef.current;
      const pitchSum = segPitchSumRef.current;
      const pitchCount = segPitchCountRef.current;
      segChunksRef.current = [];
      // Release THIS segment's cloned tracks now that we have the blob.
      releaseSegStream();
      const blob = chunks.length > 0 ? new Blob(chunks, { type: mime }) : null;
      // Roll over to the next segment on the next event-loop tick. Recursing
      // synchronously inside onstop doesn't give Chromium time to release the
      // previous MediaRecorder's resources.
      if (!stopRequestedRef.current) {
        setTimeout(() => { if (!stopRequestedRef.current) startSegmentRecorder(); }, 0);
      }
      // Only ship segments with sustained speech energy. Drops silent blobs
      // and ambient-noise blobs that make Whisper hallucinate full sentences.
      if (voiceFrames < MIN_VOICE_FRAMES) {
        console.log(`[LiveTranscript] skip silent segment (voiceFrames=${voiceFrames})`);
        return;
      }
      if (blob && blob.size > 1500 && ws.readyState === WebSocket.OPEN) {
        try {
          // Send pitch metadata first so the server can echo it back with
          // the segment id once Whisper finishes transcribing.
          const avgPitch = pitchCount > 0 ? pitchSum / pitchCount : 0;
          ws.send(JSON.stringify({ type: "meta", pitchHz: avgPitch }));
          ws.send(await blob.arrayBuffer());
        }
        catch (err) { console.warn("[LiveTranscript] WS send error:", err); }
      }
    };
    mr.onerror = (ev: any) => {
      console.error("[LiveTranscript] segment recorder error:", ev?.error || ev);
    };

    try { mr.start(); }
    catch (err: any) {
      console.error("[LiveTranscript] segment recorder.start failed:", err);
      setError(`Recorder start failed: ${err?.message || err}`);
      releaseSegStream();
      return;
    }
    segTimerRef.current = window.setTimeout(() => {
      const cur = segRecorderRef.current;
      if (cur && cur.state !== "inactive") {
        try { cur.stop(); } catch {}
      }
    }, WHISPER_SEGMENT_MS);
  };

  // Open the WebSocket to the Whisper proxy and kick off the rotating recorder.
  const startWhisperStreaming = (stream: MediaStream, mime: string) => {
    const wsUrl = buildWhisperWsUrl(language, mime);
    console.log("[LiveTranscript] Whisper connecting to", wsUrl);
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err: any) {
      console.error("[LiveTranscript] WS construct failed:", err);
      setError(`Cannot open transcription socket: ${err?.message || err}`);
      return;
    }
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;
    wsReadyRef.current = false;
    // Note: we no longer clone the audio tracks here. Each call to
    // startSegmentRecorder() now clones fresh tracks for its own segment
    // (and stops them when that segment finishes), which fixes the slow
    // drift that eventually broke MediaRecorder.start() across many
    // rotations. We only remember the chosen mime here.
    segMimeRef.current = mime || "audio/webm";

    ws.onopen = () => {
      console.log("[LiveTranscript] Whisper WS open");
    };

    ws.onmessage = (ev) => {
      try {
        const raw = typeof ev.data === "string" ? ev.data : "";
        if (!raw) return;
        const msg = JSON.parse(raw);

        if (msg.type === "ready") {
          wsReadyRef.current = true;
          setHint(null);
          console.log("[LiveTranscript] Whisper ready, lang =", msg.whisperLang);
          // Start the rotating recorder once the server is ready to receive blobs.
          startSegmentRecorder();
          // Kick off the "first transcript in N seconds" countdown.
          firstSegmentSeenRef.current = false;
          startReadyCountdown();
          return;
        }
        if (msg.type === "error") {
          console.error("[LiveTranscript] Whisper error:", msg.message);
          setError(`Transcription service: ${msg.message}`);
          return;
        }
        if (msg.type === "segment") {
          // Server delivered a transcript for one audio chunk.
          if (msg.skipped || !msg.original) return;
          // First real transcript landed — clear the countdown banner.
          if (!firstSegmentSeenRef.current) {
            firstSegmentSeenRef.current = true;
            stopReadyCountdown();
          }
          const id = `w${msg.id}`;
          const speaker = assignSpeaker(typeof msg.pitchHz === "number" ? msg.pitchHz : 0);
          if (speaker) segmentSpeakerRef.current.set(msg.id, speaker);
          setSegments(prev => [
            ...prev,
            { id, t: new Date().toLocaleTimeString(), original: msg.original, speaker },
          ]);
          return;
        }
        if (msg.type === "translation") {
          // English translation arrived for an earlier segment.
          const id = `w${msg.id}`;
          setSegments(prev => prev.map(s =>
            s.id === id ? { ...s, translation: msg.translation || "(empty translation)" } : s
          ));
          return;
        }
      } catch {}
    };

    ws.onerror = (ev) => {
      console.error("[LiveTranscript] Whisper WS error event", ev);
      setError("Live transcription socket error — check console for details.");
    };
    ws.onclose = (ev) => {
      console.log("[LiveTranscript] Whisper WS closed", ev.code, ev.reason);
      wsReadyRef.current = false;
      if (!stopRequestedRef.current && !ev.wasClean) {
        setHint(`Connection closed (code ${ev.code}${ev.reason ? `: ${ev.reason}` : ""}).`);
      }
    };
  };

  const start = async () => {
    setError(null);
    setHint(null);
    setInterim("");
    interimRef.current = "";
    interimAtRef.current = 0;
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    audioBlobRef.current = null;
    stopRequestedRef.current = false;
    restartAttemptsRef.current = 0;
    // Reset speaker diarization state for a fresh recording session.
    speakerCentroidsRef.current = [];
    segmentSpeakerRef.current = new Map();
    firstSegmentSeenRef.current = false;
    stopReadyCountdown();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e: any) {
      setError(e?.message || "Could not access the microphone. Please allow microphone access.");
      return;
    }
    streamRef.current = stream;

    // Start continuous "save" recorder (used for the Save button at the end of the session).
    const mime = pickAudioMime();
    mimeRef.current = mime || "audio/webm";
    try {
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(1000);
    } catch (e: any) {
      setError(`Recording unsupported: ${e?.message || e}`);
      stream.getTracks().forEach(t => t.stop());
      return;
    }

    // Set up live audio analyser for waveform + level meter.
    try {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ac: AudioContext = new Ctor();
      audioCtxRef.current = ac;
      const src = ac.createMediaStreamSource(stream);
      const an = ac.createAnalyser();
      an.fftSize = 1024;
      an.smoothingTimeConstant = 0.75;
      src.connect(an);
      analyserRef.current = an;
      setAnalyserNode(an);

      const buf = new Uint8Array(an.fftSize);
      // FFT-domain buffer for pitch estimation (used only when there's voice).
      const freqBuf = new Uint8Array(an.frequencyBinCount);
      const sampleRate = ac.sampleRate;
      const binHz = sampleRate / an.fftSize;
      // Voice fundamental falls roughly between 80 Hz (low male) and 350 Hz
      // (high female / child). Search the dominant bin in this band.
      const minBin = Math.max(1, Math.floor(80 / binHz));
      const maxBin = Math.min(an.frequencyBinCount - 1, Math.ceil(350 / binHz));

      const tick = () => {
        an.getByteTimeDomainData(buf);
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / buf.length);
        setAudioLevel(rms);
        // Adaptive ambient-noise tracking: when the current frame is at or
        // below the running noise floor, pull the floor up gently toward this
        // sample (fast adapt to rising background noise). When the frame is
        // clearly louder (likely speech) leak the floor down very slowly so
        // the gate doesn't drift up during a long sentence.
        const nf = noiseFloorRef.current;
        if (rms < nf * 1.5) {
          noiseFloorRef.current = nf * 0.95 + rms * 0.05;
        } else {
          noiseFloorRef.current = nf * 0.999 + rms * 0.001;
        }
        // Effective speech threshold = max(absolute floor, noise + margin).
        // A frame must clear BOTH bars to count as real voice activity.
        const speechThreshold = Math.max(VOICE_RMS_FLOOR, noiseFloorRef.current + VOICE_RMS_MARGIN);
        if (rms > 0.04) lastHeardRef.current = Date.now();
        // Voice-activity counter + pitch sampling for the rotating recorder.
        if (rms > speechThreshold) {
          segVoiceFramesRef.current += 1;
          // Estimate this frame's pitch by picking the strongest FFT bin in
          // the vocal band — coarse but enough to separate two distinct
          // voices (typical male ~110 Hz vs female ~210 Hz).
          an.getByteFrequencyData(freqBuf);
          let peakBin = minBin;
          let peakAmp = 0;
          for (let k = minBin; k <= maxBin; k++) {
            if (freqBuf[k] > peakAmp) { peakAmp = freqBuf[k]; peakBin = k; }
          }
          if (peakAmp > 60) {
            segPitchSumRef.current += peakBin * binHz;
            segPitchCountRef.current += 1;
          }
        }
        levelRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn("[LiveTranscript] AudioContext failed:", e);
    }

    // Stream audio to the server's Whisper proxy for realtime transcription +
    // English translation (multilingual, works inside iframes and any browser
    // with mic access).
    setRecording(true);
    setHint("Connecting to live transcription…");
    startWhisperStreaming(stream, mime || "audio/webm");
  };

  const stop = async () => {
    stopRequestedRef.current = true;
    setRecording(false);

    // Flush any final interim text before tearing down
    if (interimRef.current) {
      const text = interimRef.current;
      interimRef.current = "";
      interimAtRef.current = 0;
      commitSegment(text);
    }
    setInterim("");

    if (flushTimerRef.current) { window.clearInterval(flushTimerRef.current); flushTimerRef.current = null; }
    if (levelRafRef.current) { cancelAnimationFrame(levelRafRef.current); levelRafRef.current = null; }
    setAudioLevel(0);
    setAnalyserNode(null);
    analyserRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      try { await audioCtxRef.current.close(); } catch {}
    }
    audioCtxRef.current = null;

    // Close the realtime Whisper stream + its rotating MediaRecorder.
    teardownWhisper();

    const r = recognitionRef.current;
    if (r) { try { r.onend = null; r.stop(); } catch {} recognitionRef.current = null; }

    const mr = mediaRecRef.current;
    if (mr && mr.state !== "inactive") {
      await new Promise<void>(res => {
        mr.onstop = () => res();
        try { mr.stop(); } catch { res(); }
      });
    }
    mediaRecRef.current = null;

    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: mimeRef.current });
      audioBlobRef.current = blob;
      setAudioUrl(URL.createObjectURL(blob));
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const clearAll = () => {
    if (recording) return;
    if (!confirm("Clear transcript and recorded audio?")) return;
    setSegments([]);
    setInterim("");
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    audioBlobRef.current = null;
    chunksRef.current = [];
  };

  const saveAll = () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const safeName = (industry || "session").replace(/[^\w-]+/g, "_").slice(0, 60);
    const base = `enquiry-${safeName}-${stamp}`;
    const langLabel = SUPPORTED_LANGS.find(l => l.code === language)?.label || language;

    if (audioBlobRef.current) {
      const ext = mimeRef.current.includes("ogg") ? "ogg"
        : mimeRef.current.includes("mp4") ? "m4a"
        : "webm";
      downloadBlob(audioBlobRef.current, `${base}.${ext}`);
    }

    const header = `Industry: ${industry || "(unset)"}\nDate: ${new Date().toLocaleString()}\nLanguage: ${langLabel}\n\n`;

    const original = header + segments.map(s => `[${s.t}] ${s.original}`).join("\n");
    downloadBlob(new Blob([original], { type: "text/plain;charset=utf-8" }), `${base}-original.txt`);

    const english = header + segments.map(s => `[${s.t}] ${s.translation ?? "(translating…)"}`).join("\n");
    downloadBlob(new Blob([english], { type: "text/plain;charset=utf-8" }), `${base}-english.txt`);

    // Also persist each segment to the speech_translations table for cross-device reference
    segments.forEach(s => {
      fetch(`${VC_BASE}/speech-translations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original: s.original,
          translation: s.translation || "",
          sourceLang: language,
          sourceLangLabel: langLabel,
          recordedAt: s.t,
        }),
      }).catch(() => {});
    });
  };

  const langLabel = SUPPORTED_LANGS.find(l => l.code === language)?.label || language;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center gap-2 flex-wrap">
        <Mic className={cn("w-3.5 h-3.5", recording ? "text-rose-600 animate-pulse" : "text-gray-600")} />
        <MicLevelBars analyserRef={analyserRef} active={recording} className="h-3.5" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            Live Transcript
            {recording && <span className="inline-flex items-center gap-1 px-1.5 py-px rounded-full bg-rose-50 text-rose-700 text-[8px] font-bold border border-rose-200"><span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" /> REC</span>}
          </div>
          <div className="text-[9px] text-gray-500 truncate">{recording ? `Listening in ${langLabel} — original on left, English translation on right` : "Pick a language → press Start. Original + English appear live as you speak."}</div>
        </div>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          disabled={recording}
          title="Spoken language"
          className="text-[10px] px-1.5 py-1 rounded border border-gray-200 bg-white disabled:opacity-50"
        >
          {SUPPORTED_LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        {!recording ? (
          <button onClick={start} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-sm">
            <Mic className="w-3 h-3" /> Start
          </button>
        ) : (
          <button onClick={stop} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-900 hover:bg-black text-white text-[10px] font-bold">
            <Square className="w-3 h-3" /> Stop
          </button>
        )}
        <button
          onClick={saveAll}
          disabled={segments.length === 0 && !audioBlobRef.current}
          title="Save audio + original transcript + English transcript"
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[10px] font-semibold transition disabled:opacity-40"
        >
          <Download className="w-3 h-3" /> Save
        </button>
        <button
          onClick={clearAll}
          disabled={recording || (segments.length === 0 && !audioBlobRef.current)}
          title="Clear transcript & audio"
          className="p-1 rounded hover:bg-white border border-transparent hover:border-gray-200 text-gray-600 disabled:opacity-30"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {error && <div className="text-[10px] text-rose-700 bg-rose-50 border-b border-rose-200 px-3 py-1.5 font-semibold">{error}</div>}
      {!error && hint && recording && (
        <div className="text-[10px] text-amber-700 bg-amber-50 border-b border-amber-200 px-3 py-1">{hint}</div>
      )}

      {/* Live waveform — always visible so user sees that the mic is listening */}
      <LiveWaveform analyser={analyserNode} level={audioLevel} active={recording} />

      {/* Countdown banner — visible only between Start and the first transcript */}
      {readyCountdown !== null && (
        <div className="px-3 py-1.5 bg-gradient-to-r from-indigo-50 via-sky-50 to-indigo-50 border-b border-indigo-200/70 flex items-center gap-2 text-[10px]">
          <span className="relative inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white font-bold tabular-nums shadow-sm">
            {readyCountdown}
            <span className="absolute inset-0 rounded-full ring-2 ring-indigo-400/60 animate-ping" />
          </span>
          <span className="text-indigo-900 font-semibold">Get ready —</span>
          <span className="text-indigo-700">first transcript will appear in about {readyCountdown}s. Keep speaking naturally.</span>
        </div>
      )}

      {/* Two columns: original | english */}
      <div className="flex-1 grid grid-cols-2 min-h-0 overflow-hidden">
        <div className="flex flex-col min-h-0 border-r border-gray-100">
          <div className="px-3 py-1 border-b border-gray-100 bg-gray-50/60 text-[9px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
            <span>Original ({langLabel})</span>
            {recording && (
              <span className="text-[8px] font-bold text-rose-600 tabular-nums">
                {segments.length} {segments.length === 1 ? "line" : "lines"}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-2 text-[11px] leading-snug space-y-1 custom-scrollbar">
            {segments.map(s => (
              <div key={s.id}>
                <span className="text-gray-400 text-[9px] tabular-nums mr-1">{s.t}</span>
                {s.speaker ? <SpeakerBadge n={s.speaker} /> : null}
                <span className="text-gray-800">{s.original}</span>
              </div>
            ))}
            {interim && (
              <div className="flex items-start gap-1.5">
                <span className="inline-block w-1.5 h-1.5 mt-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="text-gray-500 italic">{interim}<span className="text-rose-400">…</span></span>
              </div>
            )}
            {segments.length === 0 && !interim && (
              <div className="text-gray-400 text-center py-8 text-[10px] px-4">
                Press <span className="font-bold text-rose-600">Start</span> and begin speaking. Words appear here in real time.
              </div>
            )}
            <div ref={originalEndRef} />
          </div>
        </div>
        <div className="flex flex-col min-h-0">
          <div className="px-3 py-1 border-b border-gray-100 bg-gray-50/60 text-[9px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
            <span className="flex items-center gap-1"><Languages className="w-3 h-3" /> English Translation</span>
            {recording && segments.some(s => !s.translation) && (
              <span className="text-[8px] font-bold text-blue-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                translating
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-2 text-[11px] leading-snug space-y-1 custom-scrollbar">
            {segments.map(s => (
              <div key={s.id}>
                <span className="text-gray-400 text-[9px] tabular-nums mr-1">{s.t}</span>
                {s.speaker ? <SpeakerBadge n={s.speaker} /> : null}
                {s.translation
                  ? <span className={cn(
                      s.translation.startsWith("(translation failed")
                        ? "text-rose-600"
                        : s.translation === "(empty translation)"
                          ? "text-amber-600 italic"
                          : "text-gray-800"
                    )}>{s.translation}</span>
                  : <span className="inline-flex items-center gap-1 text-blue-500 italic">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      translating…
                    </span>}
              </div>
            ))}
            {segments.length === 0 && (
              <div className="text-gray-400 text-center py-8 text-[10px] px-4">
                English translation appears here as you speak.
              </div>
            )}
            <div ref={englishEndRef} />
          </div>
        </div>
      </div>

      {audioUrl && (
        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50/40 flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 shrink-0">Recording</span>
          <audio src={audioUrl} controls className="h-7 flex-1" />
        </div>
      )}
    </div>
  );
}

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
  const [mapPasteSeed, setMapPasteSeed] = useState<string>("");
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
    if (!autoSaveOn) return;
    if (view !== "form") return;
    const t = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch {}
      setAutoSavedFlag(true);
      const clear = setTimeout(() => setAutoSavedFlag(false), 1500);
      return () => clearTimeout(clear);
    }, 500);
    return () => clearTimeout(t);
  }, [form, autoSaveOn, view]);

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
    console.log("[VC scan] fillFromCard called with:", c);
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
              title={autoSaveOn ? "Auto-save ON — draft saved on every change" : "Auto-save OFF"}
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
                {autoSaveOn ? (autoSavedFlag ? "✓ Draft saved" : (savedAt ? `Saved ${savedAt}` : "Ready")) : "Off"}
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
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {form.latitude && form.longitude && (
                    <a
                      href={`https://www.google.com/maps/?q=${form.latitude},${form.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Open in Google Maps"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-300 hover:border-amber-500 bg-white text-[10px] font-semibold text-amber-800 transition active:scale-95"
                    >
                      <ExternalLink className="w-3 h-3" /> {parseFloat(form.latitude).toFixed(3)}, {parseFloat(form.longitude).toFixed(3)}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const t = await navigator.clipboard.readText();
                        setMapPasteSeed(t || "");
                      } catch { setMapPasteSeed(""); }
                      setMapOpen(true);
                    }}
                    title="Paste address, coordinates, or Google Maps link from clipboard"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-300 hover:border-amber-500 bg-white text-[10px] font-semibold text-amber-800 transition active:scale-95"
                  >
                    <Clipboard className="w-3 h-3" /> Paste
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMapPasteSeed(""); setMapOpen(true); }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-300 hover:border-amber-500 bg-white text-[10px] font-semibold text-amber-800 transition active:scale-95"
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

          {/* RIGHT — Manual notes + Live auto-transcribed conversation */}
          <div className="min-h-0 overflow-hidden grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="min-h-0 overflow-hidden">
              <MeetingMinutesPanel industry={form.industry_name} />
            </div>
            <div className="min-h-0 overflow-hidden">
              <LiveTranscriptPanel industry={form.industry_name} />
            </div>
          </div>
        </div>
      </div>

      <MapPicker
        open={mapOpen}
        onClose={() => { setMapOpen(false); setMapPasteSeed(""); }}
        lat={form.latitude}
        lng={form.longitude}
        initialPaste={mapPasteSeed}
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
