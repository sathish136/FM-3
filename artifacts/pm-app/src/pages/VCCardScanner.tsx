import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import {
  ScanLine, Camera, Upload, Sparkles, Loader2, X, Check, Trash2, Search,
  Building2, Mail, Phone, Globe, MapPin, Tag as TagIcon, User as UserIcon,
  Download, BarChart3, FileText, ChevronRight, RefreshCw, Plus, Filter,
  CreditCard, Briefcase, Users as UsersIcon, Handshake, Target, Eye,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const BASE = "/api";

type CardCategory = "customer" | "vendor" | "partner" | "lead" | "other";

interface VCard {
  id: number;
  name: string | null;
  designation: string | null;
  company: string | null;
  department: string | null;
  email: string | null;
  phones: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  tags: string | null;
  category: CardCategory;
  source: string;
  meetingContext: string | null;
  frontImage: string | null;
  backImage: string | null;
  rawText: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface Stats {
  totals: { total: number; customers: number; vendors: number; partners: number; leads: number; others: number; last_7: number; last_30: number; with_back: number };
  byCompany: { company: string; count: number }[];
  byCity: { city: string; count: number }[];
  byMonth: { month: string; count: number }[];
  recent: VCard[];
}

const CAT_META: Record<CardCategory, { label: string; color: string; bg: string; icon: any }> = {
  customer: { label: "Customer", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: UsersIcon },
  vendor:   { label: "Vendor",   color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",     icon: Briefcase },
  partner:  { label: "Partner",  color: "text-violet-700",  bg: "bg-violet-50 border-violet-200",   icon: Handshake },
  lead:     { label: "Lead",     color: "text-sky-700",     bg: "bg-sky-50 border-sky-200",         icon: Target },
  other:    { label: "Other",    color: "text-slate-700",   bg: "bg-slate-100 border-slate-200",    icon: TagIcon },
};

// ─── Camera modal: captures a single image and returns dataURL ─────────────
function CameraCaptureModal({ side, onCapture, onClose }: { side: "Front" | "Back"; onCapture: (dataUrl: string) => void; onClose: () => void; }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch (e: any) { setError(e?.message || "Camera unavailable"); }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  const snap = () => {
    const v = videoRef.current; if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    onCapture(c.toDataURL("image/jpeg", 0.85));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-4 h-4" />
            <span className="text-sm font-bold">Capture {side} of card</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="relative bg-black" style={{ aspectRatio: "16/10" }}>
          {error
            ? <div className="absolute inset-0 flex items-center justify-center text-rose-300 text-sm p-6 text-center">{error}</div>
            : <video ref={videoRef} className="w-full h-full object-contain" playsInline muted />}
          {/* Card-shaped guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white/40 border-dashed rounded-xl" style={{ width: "78%", aspectRatio: "1.66/1" }} />
          </div>
        </div>
        <div className="px-5 py-4 flex items-center justify-between bg-slate-900">
          <p className="text-[11px] text-slate-400">Align the {side.toLowerCase()} of the card inside the dashed box.</p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800">Cancel</button>
            <button disabled={!ready || !!error} onClick={snap}
              className="flex items-center gap-1.5 px-5 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-900 text-xs font-bold rounded-lg">
              <Camera className="w-4 h-4" /> Capture
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Image-input slot (front/back) ─────────────────────────────────────────
function CardSideSlot({
  side, value, onChange,
}: { side: "front" | "back"; value: string | null; onChange: (v: string | null) => void; }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showCam, setShowCam] = useState(false);
  const label = side === "front" ? "Front" : "Back";

  const onFile = (f: File) => {
    const r = new FileReader();
    r.onload = () => onChange(typeof r.result === "string" ? r.result : null);
    r.readAsDataURL(f);
  };

  return (
    <div className="flex-1">
      {showCam && <CameraCaptureModal side={label as "Front" | "Back"} onCapture={onChange} onClose={() => setShowCam(false)} />}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${side === "front" ? "text-slate-700" : "text-slate-500"}`}>
          {label} {side === "front" && <span className="text-rose-500">*</span>}
        </span>
        {value && (
          <button onClick={() => onChange(null)} className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 flex items-center gap-0.5">
            <X className="w-3 h-3" /> Remove
          </button>
        )}
      </div>
      {value ? (
        <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200" style={{ aspectRatio: "1.66/1" }}>
          <img src={value} alt={label} className="w-full h-full object-contain" />
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center text-center p-4 gap-2"
          style={{ aspectRatio: "1.66/1" }}>
          <CreditCard className="w-8 h-8 text-slate-300" />
          <p className="text-[11px] text-slate-500">Add the {label.toLowerCase()} of the visiting card</p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowCam(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-black text-white text-[11px] font-semibold rounded-md">
              <Camera className="w-3 h-3" /> Camera
            </button>
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-400 text-slate-700 text-[11px] font-semibold rounded-md">
              <Upload className="w-3 h-3" /> Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function VCCardScanner() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"scan" | "list" | "report">("scan");
  const [cards, setCards] = useState<VCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<CardCategory | "all">("all");
  const [selected, setSelected] = useState<VCard | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  // Scanner state
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracted, setExtracted] = useState<Partial<VCard> | null>(null);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (filterCat !== "all") params.set("category", filterCat);
      const r = await fetch(`${BASE}/visiting-cards?${params.toString()}`);
      const data = await r.json();
      setCards(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const r = await fetch(`${BASE}/visiting-cards-report/stats`);
      const data = await r.json();
      setStats(data);
    } catch {}
  };

  useEffect(() => { fetchCards(); }, [filterCat]);
  useEffect(() => { if (tab === "report") fetchStats(); }, [tab]);

  const onScan = async () => {
    if (!front) return;
    setScanning(true);
    try {
      const r = await fetch(`${BASE}/visiting-cards/scan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frontImage: front, backImage: back }),
      });
      const { data } = await r.json();
      setExtracted({ ...(data || {}), category: (data?.category as CardCategory) || "lead" });
    } catch (e) { alert("Scan failed: " + e); }
    finally { setScanning(false); }
  };

  const onSave = async () => {
    if (!extracted) return;
    setSaving(true);
    try {
      const payload = {
        ...extracted, frontImage: front, backImage: back,
        source: "scan", createdBy: user?.email || null,
      };
      await fetch(`${BASE}/visiting-cards`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // Reset
      setFront(null); setBack(null); setExtracted(null);
      setTab("list");
      fetchCards();
    } finally { setSaving(false); }
  };

  const reset = () => { setFront(null); setBack(null); setExtracted(null); };

  const onDelete = async (id: number) => {
    if (!confirm("Delete this card?")) return;
    await fetch(`${BASE}/visiting-cards/${id}`, { method: "DELETE" });
    setSelected(null);
    fetchCards();
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return cards;
    const q = search.toLowerCase();
    return cards.filter(c =>
      [c.name, c.company, c.email, c.phones, c.designation, c.tags].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [cards, search]);

  return (
    <Layout>
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center">
                <ScanLine className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Contacts</p>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Visiting Card Scanner</h1>
                <p className="text-[11px] text-slate-500 mt-0.5">Capture front + back · AI extracts fields · build your contact reports.</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {([
                { k: "scan",   label: "Scan",     icon: ScanLine },
                { k: "list",   label: "Cards",    icon: CreditCard },
                { k: "report", label: "Reports",  icon: BarChart3 },
              ] as const).map(t => (
                <button key={t.k} onClick={() => setTab(t.k)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    tab === t.k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}>
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SCAN tab */}
        {tab === "scan" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto space-y-5">
              {/* Step 1: capture */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Step 1</p>
                    <h2 className="text-base font-bold text-slate-900">Capture both sides of the card</h2>
                  </div>
                  {(front || back) && (
                    <button onClick={reset} className="text-xs font-semibold text-slate-400 hover:text-rose-600 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <CardSideSlot side="front" value={front} onChange={setFront} />
                  <CardSideSlot side="back" value={back} onChange={setBack} />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    Tip: a clear, well-lit photo improves AI accuracy. Back is optional but recommended.
                  </p>
                  <button onClick={onScan} disabled={!front || scanning}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-sm">
                    {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting…</> : <><Sparkles className="w-4 h-4" /> Scan with AI</>}
                  </button>
                </div>
              </div>

              {/* Step 2: review extracted */}
              {extracted && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Step 2 — review &amp; edit
                      </p>
                      <h2 className="text-base font-bold text-slate-900">Extracted contact details</h2>
                    </div>
                    <CategorySelect value={extracted.category as CardCategory || "lead"} onChange={v => setExtracted(p => ({ ...p!, category: v }))} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Full Name"   icon={UserIcon}   value={extracted.name || ""}        onChange={v => setExtracted(p => ({ ...p!, name: v }))} />
                    <Field label="Designation" icon={Briefcase}  value={extracted.designation || ""} onChange={v => setExtracted(p => ({ ...p!, designation: v }))} />
                    <Field label="Company"     icon={Building2}  value={extracted.company || ""}     onChange={v => setExtracted(p => ({ ...p!, company: v }))} />
                    <Field label="Department"  icon={Briefcase}  value={extracted.department || ""}  onChange={v => setExtracted(p => ({ ...p!, department: v }))} />
                    <Field label="Email"       icon={Mail}       value={extracted.email || ""}       onChange={v => setExtracted(p => ({ ...p!, email: v }))} />
                    <Field label="Phone(s)"    icon={Phone}      value={extracted.phones || ""}      onChange={v => setExtracted(p => ({ ...p!, phones: v }))} />
                    <Field label="Website"     icon={Globe}      value={extracted.website || ""}     onChange={v => setExtracted(p => ({ ...p!, website: v }))} />
                    <Field label="City"        icon={MapPin}     value={extracted.city || ""}        onChange={v => setExtracted(p => ({ ...p!, city: v }))} />
                    <Field label="Country"     icon={Globe}      value={extracted.country || ""}     onChange={v => setExtracted(p => ({ ...p!, country: v }))} />
                    <Field label="Tags (comma)" icon={TagIcon}   value={extracted.tags || ""}        onChange={v => setExtracted(p => ({ ...p!, tags: v }))} />
                    <div className="md:col-span-2">
                      <Field label="Address" icon={MapPin} value={extracted.address || ""} onChange={v => setExtracted(p => ({ ...p!, address: v }))} multiline />
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Notes" icon={FileText} value={extracted.notes || ""} onChange={v => setExtracted(p => ({ ...p!, notes: v }))} multiline placeholder="Where did you meet, follow-up plan, …" />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button onClick={reset} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900">Discard</button>
                    <button onClick={onSave} disabled={saving}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm">
                      {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving</> : <><Check className="w-4 h-4" /> Save Contact</>}
                    </button>
                  </div>
                </div>
              )}

              {/* Help / empty hint */}
              {!extracted && !front && (
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { icon: Camera,   t: "Snap or upload",  d: "Take a photo of the front (and back if any)." },
                    { icon: Sparkles, t: "AI extracts",     d: "Name, company, email, phone, address & more." },
                    { icon: BarChart3, t: "Build reports",  d: "Categorise contacts, export CSV, track pipeline." },
                  ].map((s, i) => (
                    <div key={i} className="space-y-2">
                      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center"><s.icon className="w-4 h-4" /></div>
                      <p className="text-sm font-bold">{s.t}</p>
                      <p className="text-[12px] text-slate-300 leading-relaxed">{s.d}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LIST tab */}
        {tab === "list" && (
          <div className="flex-1 flex overflow-hidden">
            <div className={`${selected ? "hidden md:flex md:w-3/5" : "flex w-full"} flex-col border-r border-slate-200 bg-white`}>
              <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search name, company, email, phone…"
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400" />
                </div>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value as any)}
                  className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-2 outline-none">
                  <option value="all">All categories</option>
                  {(["customer","vendor","partner","lead","other"] as const).map(c => <option key={c} value={c}>{CAT_META[c].label}</option>)}
                </select>
                <button onClick={() => setTab("scan")} className="flex items-center gap-1 px-3 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg">
                  <Plus className="w-3.5 h-3.5" /> Scan
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <CreditCard className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-600">No cards yet</p>
                    <p className="text-xs text-slate-400 mt-1">Scan your first visiting card to get started.</p>
                    <button onClick={() => setTab("scan")} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg">
                      <ScanLine className="w-3.5 h-3.5" /> Scan a card
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {filtered.map(c => {
                      const cat = CAT_META[c.category] || CAT_META.other;
                      const Icon = cat.icon;
                      return (
                        <li key={c.id}>
                          <button onClick={() => setSelected(c)}
                            className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left ${selected?.id === c.id ? "bg-slate-50" : ""}`}>
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                              {c.frontImage
                                ? <img src={c.frontImage} alt="" className="w-full h-full object-cover" />
                                : <UserIcon className="w-4 h-4 text-slate-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900 truncate">{c.name || "(unnamed)"}</p>
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cat.bg} ${cat.color}`}>
                                  <Icon className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" />{cat.label}
                                </span>
                              </div>
                              <p className="text-[12px] text-slate-500 truncate">
                                {[c.designation, c.company].filter(Boolean).join(" · ") || c.email || c.phones || "—"}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Detail */}
            {selected && (
              <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
                  <button onClick={() => setSelected(null)} className="md:hidden text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 rotate-180" /> Back
                  </button>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Contact details</p>
                  <button onClick={() => onDelete(selected.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <CardImageView label="Front" src={selected.frontImage} />
                    <CardImageView label="Back"  src={selected.backImage} />
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
                    <h3 className="text-xl font-bold text-slate-900">{selected.name || "(unnamed)"}</h3>
                    <p className="text-sm text-slate-600">{[selected.designation, selected.company, selected.department].filter(Boolean).join(" · ")}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <DetailRow icon={Mail}      label="Email"   value={selected.email} href={selected.email ? `mailto:${selected.email}` : undefined} />
                      <DetailRow icon={Phone}     label="Phone"   value={selected.phones} href={selected.phones ? `tel:${selected.phones.split(",")[0]}` : undefined} />
                      <DetailRow icon={Globe}     label="Website" value={selected.website} href={selected.website ? (selected.website.startsWith("http") ? selected.website : `https://${selected.website}`) : undefined} />
                      <DetailRow icon={MapPin}    label="City"    value={[selected.city, selected.country].filter(Boolean).join(", ")} />
                      <DetailRow icon={Building2} label="Address" value={selected.address} />
                      <DetailRow icon={TagIcon}   label="Tags"    value={selected.tags} />
                    </div>
                    {selected.notes && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Notes</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.notes}</p>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Added {new Date(selected.createdAt).toLocaleString()}</span>
                      {selected.createdBy && <span>· by {selected.createdBy}</span>}
                    </div>
                  </div>
                  {selected.rawText && (
                    <details className="bg-white rounded-xl border border-slate-200 p-4">
                      <summary className="text-xs font-bold uppercase tracking-widest text-slate-400 cursor-pointer flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Raw text from card
                      </summary>
                      <pre className="text-[11px] text-slate-600 whitespace-pre-wrap mt-2">{selected.rawText}</pre>
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* REPORT tab */}
        {tab === "report" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Contact Reports</h2>
                  <p className="text-xs text-slate-500">Overview of every visiting card scanned into FlowMatriX.</p>
                </div>
                <a href={`${BASE}/visiting-cards-report/export.csv`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </a>
              </div>

              {!stats ? (
                <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading reports…
                </div>
              ) : (
                <>
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiCard icon={CreditCard} label="Total cards"    value={stats.totals.total}     accent="bg-slate-900 text-white" />
                    <KpiCard icon={UsersIcon}  label="Customers"      value={stats.totals.customers} accent="bg-emerald-100 text-emerald-700" />
                    <KpiCard icon={Briefcase}  label="Vendors"        value={stats.totals.vendors}   accent="bg-amber-100 text-amber-700" />
                    <KpiCard icon={Target}     label="Leads"          value={stats.totals.leads}     accent="bg-sky-100 text-sky-700" />
                    <KpiCard icon={Handshake}  label="Partners"       value={stats.totals.partners}  accent="bg-violet-100 text-violet-700" />
                    <KpiCard icon={TagIcon}    label="Other"          value={stats.totals.others}    accent="bg-slate-100 text-slate-700" />
                    <KpiCard icon={BarChart3}  label="Last 7 days"    value={stats.totals.last_7}    accent="bg-rose-100 text-rose-700" />
                    <KpiCard icon={BarChart3}  label="Last 30 days"   value={stats.totals.last_30}   accent="bg-indigo-100 text-indigo-700" />
                  </div>

                  {/* Charts row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ReportPanel title="Top companies">
                      <BarList items={stats.byCompany.map(c => ({ label: c.company, value: c.count }))} />
                    </ReportPanel>
                    <ReportPanel title="Top cities">
                      <BarList items={stats.byCity.map(c => ({ label: c.city, value: c.count }))} />
                    </ReportPanel>
                  </div>

                  <ReportPanel title="Cards added · last 12 months">
                    <MonthlyChart data={stats.byMonth} />
                  </ReportPanel>

                  <ReportPanel title="Recently added">
                    <div className="divide-y divide-slate-100">
                      {stats.recent.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No cards yet.</p>}
                      {stats.recent.map(c => {
                        const cat = CAT_META[c.category] || CAT_META.other;
                        return (
                          <div key={c.id} className="flex items-center gap-3 py-2.5">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                              {c.frontImage ? <img src={c.frontImage} className="w-full h-full object-cover" /> : <UserIcon className="w-4 h-4 text-slate-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{c.name || "(unnamed)"} <span className="text-slate-400 font-normal">· {c.company || "—"}</span></p>
                              <p className="text-[11px] text-slate-500 truncate">{c.email || c.phones || ""}</p>
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cat.bg} ${cat.color}`}>{cat.label}</span>
                            <span className="text-[10px] text-slate-400 tabular-nums hidden sm:block">{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </ReportPanel>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// ─── Small components ──────────────────────────────────────────────────────
function CategorySelect({ value, onChange }: { value: CardCategory; onChange: (v: CardCategory) => void }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      {(["customer","vendor","partner","lead","other"] as const).map(c => {
        const m = CAT_META[c];
        return (
          <button key={c} onClick={() => onChange(c)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${value === c ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, icon: Icon, value, onChange, multiline, placeholder }: {
  label: string; icon: any; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1">
        <Icon className="w-3 h-3" /> {label}
      </span>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            rows={2}
            className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-900 focus:bg-white resize-none" />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-900 focus:bg-white" />
      }
    </label>
  );
}

function CardImageView({ label, src }: { label: string; src: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      {src ? (
        <a href={src} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden bg-slate-200 border border-slate-200" style={{ aspectRatio: "1.66/1" }}>
          <img src={src} alt={label} className="w-full h-full object-contain" />
        </a>
      ) : (
        <div className="rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-[11px] text-slate-400" style={{ aspectRatio: "1.66/1" }}>
          No {label.toLowerCase()} image
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, href }: { icon: any; label: string; value: string | null; href?: string }) {
  if (!value) return null;
  const inner = <span className="text-sm font-medium text-slate-800 break-all">{value}</span>;
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-slate-400 mt-1 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        {href ? <a href={href} className="text-sky-600 hover:underline">{inner}</a> : inner}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent}`}><Icon className="w-3.5 h-3.5" /></div>
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

function ReportPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function BarList({ items }: { items: { label: string; value: number }[] }) {
  if (!items.length) return <p className="text-sm text-slate-400 py-4 text-center">No data yet.</p>;
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-700 truncate w-1/3">{it.label}</span>
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-900 rounded-full" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-slate-700 tabular-nums w-8 text-right">{it.value}</span>
        </li>
      ))}
    </ul>
  );
}

function MonthlyChart({ data }: { data: { month: string; count: number }[] }) {
  if (!data.length) return <p className="text-sm text-slate-400 py-4 text-center">No data yet.</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-40">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full bg-slate-100 rounded-t-md flex items-end" style={{ height: "100%" }}>
            <div className="w-full bg-gradient-to-t from-slate-900 to-slate-600 rounded-t-md transition-all"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }} title={`${d.month}: ${d.count}`} />
          </div>
          <span className="text-[9px] font-semibold text-slate-500 tabular-nums">{d.month.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

// quiet imports
void Filter;
