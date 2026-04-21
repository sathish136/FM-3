import { Layout } from "@/components/Layout";
import {
  Mic, Square, Languages, Globe, Trash2, Copy, CheckCheck,
  RefreshCw, ChevronDown, Save, Database, MicOff,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

const BASE = "/api";

type LangCode = string;
type Lang = { code: LangCode; label: string; native: string; abbr: string };

const LANGS: Lang[] = [
  { code: "auto", label: "Auto Detect", native: "Detect automatically", abbr: "AUTO" },
  { code: "en-IN", label: "English",    native: "English",              abbr: "EN" },
  { code: "ta-IN", label: "Tamil",      native: "தமிழ்",               abbr: "TA" },
  { code: "hi-IN", label: "Hindi",      native: "हिन्दी",               abbr: "HI" },
  { code: "te-IN", label: "Telugu",     native: "తెలుగు",               abbr: "TE" },
  { code: "ml-IN", label: "Malayalam",  native: "മലയാളം",              abbr: "ML" },
  { code: "kn-IN", label: "Kannada",    native: "ಕನ್ನಡ",                abbr: "KN" },
  { code: "mr-IN", label: "Marathi",    native: "मराठी",                abbr: "MR" },
  { code: "gu-IN", label: "Gujarati",   native: "ગુજરાતી",              abbr: "GU" },
  { code: "bn-IN", label: "Bengali",    native: "বাংলা",               abbr: "BN" },
  { code: "pa-IN", label: "Punjabi",    native: "ਪੰਜਾਬੀ",               abbr: "PA" },
  { code: "es-ES", label: "Spanish",    native: "Español",              abbr: "ES" },
  { code: "fr-FR", label: "French",     native: "Français",             abbr: "FR" },
  { code: "de-DE", label: "German",     native: "Deutsch",              abbr: "DE" },
  { code: "pt-BR", label: "Portuguese", native: "Português",            abbr: "PT" },
  { code: "it-IT", label: "Italian",    native: "Italiano",             abbr: "IT" },
  { code: "ru-RU", label: "Russian",    native: "Русский",              abbr: "RU" },
  { code: "zh-CN", label: "Chinese",    native: "中文 (简体)",           abbr: "ZH" },
  { code: "ja-JP", label: "Japanese",   native: "日本語",               abbr: "JA" },
  { code: "ko-KR", label: "Korean",     native: "한국어",                abbr: "KO" },
  { code: "ar-SA", label: "Arabic",     native: "العربية",              abbr: "AR" },
  { code: "tr-TR", label: "Turkish",    native: "Türkçe",               abbr: "TR" },
  { code: "vi-VN", label: "Vietnamese", native: "Tiếng Việt",           abbr: "VI" },
  { code: "th-TH", label: "Thai",       native: "ภาษาไทย",              abbr: "TH" },
  { code: "id-ID", label: "Indonesian", native: "Bahasa Indonesia",     abbr: "ID" },
  { code: "nl-NL", label: "Dutch",      native: "Nederlands",           abbr: "NL" },
];

type Entry = {
  id: number;
  dbId?: number;
  original: string;
  sourceLang: string;
  translation: string | null;
  translating: boolean;
  ts: string;
  saved: boolean;
};

type SavedRecord = {
  id: number;
  original: string;
  translation: string | null;
  source_lang: string;
  source_lang_label: string | null;
  recorded_at: string;
};

let _id = 0;

async function doTranslate(text: string, lang: string): Promise<string> {
  const res = await fetch(`${BASE}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sourceLang: lang === "auto" ? null : lang }),
  });
  if (!res.ok) throw new Error();
  return (await res.json()).translation;
}

async function doSave(entry: Entry, langLabel: string): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}/speech-translations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        original: entry.original,
        translation: entry.translation,
        sourceLang: entry.sourceLang,
        sourceLangLabel: langLabel,
        recordedAt: entry.ts,
      }),
    });
    return res.ok ? (await res.json()).id : null;
  } catch { return null; }
}

// ── Wave bars ──────────────────────────────────────────────────────────────────
function WaveBars() {
  const heights = [4, 10, 16, 22, 28, 22, 18, 26, 14, 20, 28, 16, 10, 24, 8];
  return (
    <div className="flex items-center gap-[2.5px] h-8">
      {heights.map((h, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: 3,
            height: h,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.85)",
            animation: `stwave 0.7s ease-in-out ${(i * 0.06).toFixed(2)}s infinite alternate`,
          }}
        />
      ))}
      <style>{`@keyframes stwave{0%{transform:scaleY(.35);opacity:.4}100%{transform:scaleY(1.6);opacity:1}}`}</style>
    </div>
  );
}

// ── Language picker ────────────────────────────────────────────────────────────
function LangPicker({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inp = useRef<HTMLInputElement>(null);
  const sel = LANGS.find(l => l.code === value) || LANGS[0];
  const filtered = q.trim()
    ? LANGS.filter(l => l.label.toLowerCase().includes(q.toLowerCase()) || l.native.toLowerCase().includes(q.toLowerCase()))
    : LANGS;

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(o => !o); setQ(""); setTimeout(() => inp.current?.focus(), 50); } }}
        className={`flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-all min-w-[180px]
          ${disabled ? "opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-500"
                     : "bg-white border-gray-200 hover:border-violet-400 text-gray-800 shadow-sm cursor-pointer"}`}
      >
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black tracking-wide flex-shrink-0">
          {sel.abbr}
        </span>
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-tight">{sel.label}</p>
          <p className="text-[10px] text-gray-400 leading-tight truncate">{sel.native}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl z-50 w-56 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input ref={inp} value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-violet-400 placeholder:text-gray-300" />
          </div>
          <div className="overflow-y-auto max-h-60">
            {filtered.map(lang => (
              <button key={lang.code} onClick={() => { onChange(lang.code); setOpen(false); setQ(""); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors
                  ${value === lang.code ? "bg-violet-50 text-violet-700" : "text-gray-700 hover:bg-gray-50"}`}
              >
                <span className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-black flex-shrink-0">
                  {lang.abbr}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight">{lang.label}</p>
                  <p className="text-[10px] text-gray-400 truncate">{lang.native}</p>
                </div>
                {value === lang.code && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Saved Panel ────────────────────────────────────────────────────────────────
function SavedPanel({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<SavedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/speech-translations`).then(r => r.json()).then(d => { setRows(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const lang = (code: string) => LANGS.find(l => l.code === code);
  const deleteAll = () => { fetch(`${BASE}/speech-translations`, { method: "DELETE" }); setRows([]); };
  const del = (id: number) => { fetch(`${BASE}/speech-translations/${id}`, { method: "DELETE" }); setRows(p => p.filter(r => r.id !== id)); };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:mx-4 sm:rounded-2xl rounded-t-3xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-violet-600" />
            <span className="font-bold text-gray-900">Saved Translations</span>
            <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">{rows.length}</span>
          </div>
          <div className="flex gap-2">
            {rows.length > 0 && <button onClick={deleteAll} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Clear all</button>}
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center text-lg font-bold transition-colors">×</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {loading && <p className="text-center py-10 text-sm text-gray-400">Loading…</p>}
          {!loading && rows.length === 0 && (
            <div className="text-center py-14">
              <Database className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No saved translations</p>
            </div>
          )}
          {rows.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full">{lang(r.source_lang)?.label || r.source_lang}</span>
                  <span className="text-[10px] text-gray-300 ml-auto">{r.recorded_at}</span>
                  <button onClick={() => del(r.id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{r.original}</p>
              </div>
              {r.translation && (
                <div className="mx-4 mb-3 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">English</p>
                  <p className="text-sm text-indigo-900 leading-relaxed">{r.translation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SpeechTranslator() {
  const [lang, setLang] = useState<LangCode>("ta-IN");
  const [recording, setRecording] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [liveEn, setLiveEn] = useState("");
  const [translating, setTranslating] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const recognitionRef = useRef<any>(null);
  const recordingRef = useRef(false);
  // Separate previous-session text from current-session text to prevent restart duplicates
  const prevRef = useRef("");   // finalized text from ALL completed sessions
  const curRef = useRef("");    // finalized text from CURRENT session only
  const enRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const langRef = useRef(lang); // always-current lang without stale closures

  useEffect(() => { langRef.current = lang; }, [lang]);

  const isEng = lang === "en-IN" || lang === "en-US";
  const langMeta = LANGS.find(l => l.code === lang) || LANGS[0];

  const scheduleLiveTranslation = (text: string) => {
    const l = langRef.current;
    if (!text.trim() || l === "en-IN" || l === "en-US") { setLiveEn(""); enRef.current = ""; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!text.trim()) return;
      setTranslating(true);
      try {
        const t = await doTranslate(text, l);
        setLiveEn(t); enRef.current = t;
      } catch {}
      setTranslating(false);
    }, 1200);
  };

  const stopRecording = useCallback(async () => {
    recordingRef.current = false;
    setRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const finalText = (prevRef.current + curRef.current).trim();
    const finalEn = enRef.current || null;
    const finalLang = langRef.current;
    const finalLangLabel = LANGS.find(l => l.code === finalLang)?.label || finalLang;

    prevRef.current = "";
    curRef.current = "";
    enRef.current = "";
    setLiveText("");
    setLiveEn("");
    setTranslating(false);

    if (!finalText) return;

    const ts = new Date().toLocaleTimeString();
    const newId = ++_id;
    const entry: Entry = { id: newId, original: finalText, sourceLang: finalLang, translation: finalEn, translating: !finalEn && !(finalLang === "en-IN" || finalLang === "en-US"), ts, saved: false };
    setEntries(prev => [entry, ...prev]);

    // If no translation yet, get one now
    let resolved = entry;
    if (!finalEn && !(finalLang === "en-IN" || finalLang === "en-US")) {
      try {
        const t = await doTranslate(finalText, finalLang);
        resolved = { ...entry, translation: t, translating: false };
        setEntries(prev => prev.map(e => e.id === newId ? resolved : e));
      } catch {
        setEntries(prev => prev.map(e => e.id === newId ? { ...e, translating: false } : e));
      }
    }

    const dbId = await doSave(resolved, finalLangLabel);
    if (dbId) setEntries(prev => prev.map(e => e.id === newId ? { ...e, dbId, saved: true } : e));
  }, []);

  const startRecording = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    prevRef.current = "";
    curRef.current = "";
    enRef.current = "";
    setLiveText("");
    setLiveEn("");
    recordingRef.current = true;
    setRecording(true);

    function launch() {
      if (!recordingRef.current) return;
      const r = new SR();
      recognitionRef.current = r; // always store current active instance
      r.continuous = true;
      r.interimResults = true;
      const l = langRef.current;
      if (l !== "auto") r.lang = l;

      let sessionFinalIdx = 0; // track how many final results we've consumed THIS instance

      r.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            if (i >= sessionFinalIdx) {
              curRef.current += t + " ";
              sessionFinalIdx = i + 1;
            }
          } else {
            interim += t;
          }
        }
        const full = prevRef.current + curRef.current + interim;
        setLiveText(full);
        scheduleLiveTranslation(full);
      };

      r.onerror = () => {};

      r.onend = () => {
        if (!recordingRef.current) return;
        // Save this session's text then start fresh — prevents new session from re-adding same words
        prevRef.current += curRef.current;
        curRef.current = "";
        setTimeout(() => { if (recordingRef.current) launch(); }, 150);
      };

      r.start();
    }

    launch();
  }, []);

  // Stop when language changes during recording
  useEffect(() => {
    if (recording) stopRecording();
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (recognitionRef.current) { recognitionRef.current.onend = null; try { recognitionRef.current.stop(); } catch {} }
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const retranslate = async (id: number) => {
    setEntries(p => p.map(e => e.id === id ? { ...e, translating: true } : e));
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    try {
      const t = await doTranslate(entry.original, entry.sourceLang);
      setEntries(p => p.map(e => e.id === id ? { ...e, translation: t, translating: false } : e));
    } catch {
      setEntries(p => p.map(e => e.id === id ? { ...e, translating: false } : e));
    }
  };

  const copy = (text: string, id: number) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 2000); });
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-48px)] bg-gray-50">

        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Languages className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <p className="text-violet-300 text-[9px] font-bold uppercase tracking-widest leading-none">AI Module</p>
                <p className="text-white font-bold text-base leading-tight">Speech Translator</p>
              </div>
            </div>
            <button onClick={() => setShowSaved(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 border border-white/25 rounded-lg text-white text-xs font-semibold transition-all">
              <Database className="w-3.5 h-3.5" /> History
            </button>
          </div>
        </div>

        {/* Mic Panel */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100">
          <div className="max-w-xl mx-auto px-6 py-5 flex flex-col items-center gap-4">

            {/* Language selector */}
            <LangPicker value={lang} onChange={setLang} disabled={recording} />

            {/* Mic button + wave */}
            <div className="relative flex flex-col items-center gap-3">
              {/* Animated rings when recording */}
              {recording && <>
                <span className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-red-400/20 animate-ping" />
                <span className="absolute inset-0 m-auto w-28 h-28 rounded-full bg-red-400/10 animate-ping" style={{ animationDelay: "0.3s" }} />
              </>}

              <button onClick={() => recording ? stopRecording() : startRecording()}
                className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center gap-1 shadow-xl transition-all duration-300 focus:outline-none
                  ${recording
                    ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-400/50 scale-110"
                    : "bg-gradient-to-br from-violet-600 to-indigo-700 shadow-violet-500/40 hover:scale-105"
                  }`}
              >
                {recording ? (
                  <>
                    <WaveBars />
                    <Square className="w-4 h-4 text-white" fill="white" />
                  </>
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </button>
            </div>

            {/* Status label */}
            <p className={`text-xs font-semibold text-center transition-colors ${recording ? "text-red-500" : "text-gray-400"}`}>
              {recording
                ? lang === "auto" ? "Recording… detecting language — tap to stop"
                                  : `Recording in ${langMeta.label} — tap to stop`
                : "Tap to start speaking"}
            </p>

            {/* Live text boxes */}
            {recording && (
              <div className="w-full space-y-2">
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{langMeta.label}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-auto" />
                    <span className="text-[10px] text-red-400 font-semibold">Live</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${liveText ? "text-gray-800" : "text-gray-400 italic"}`}>
                    {liveText || "Listening…"}
                  </p>
                </div>

                {!isEng && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">English</span>
                      {translating && <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin ml-auto" />}
                    </div>
                    <p className={`text-sm leading-relaxed ${liveEn ? "text-indigo-900" : "text-indigo-300 italic"}`}>
                      {liveEn || (translating ? "Translating…" : "Waiting for translation…")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Hint */}
            {!recording && entries.length === 0 && (
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                {["Pick language", "Speak", "Auto-saved"].map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span className="w-4 h-px bg-gray-200" />}
                    <span className="w-4 h-4 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[9px] font-black">{i + 1}</span>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-xl mx-auto space-y-3">

            {entries.length === 0 && !recording && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-3">
                  <MicOff className="w-7 h-7 text-violet-300" />
                </div>
                <p className="text-sm font-semibold text-gray-600">No transcriptions yet</p>
                <p className="text-xs text-gray-400 mt-1">Pick a language and tap the mic</p>
              </div>
            )}

            {entries.map(entry => {
              const src = LANGS.find(l => l.code === entry.sourceLang);
              const srcEng = entry.sourceLang === "en-IN" || entry.sourceLang === "en-US";
              return (
                <div key={entry.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 pt-3 pb-2.5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{src?.label}</span>
                      <span className="text-[10px] text-gray-300 ml-auto">{entry.ts}</span>
                      {entry.saved && (
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-full font-semibold">
                          <Save className="w-2.5 h-2.5" />Saved
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed">{entry.original}</p>
                  </div>

                  {entry.translating && (
                    <div className="mx-4 mb-3 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                      <span className="text-xs text-indigo-400">Translating…</span>
                    </div>
                  )}

                  {entry.translation && !entry.translating && (
                    <div className="mx-4 mb-3 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400 mb-1">English</p>
                      <p className="text-sm text-indigo-900 leading-relaxed">{entry.translation}</p>
                    </div>
                  )}

                  <div className="px-4 pb-3 flex items-center gap-1.5 border-t border-gray-50 pt-2">
                    {!srcEng && !entry.translation && !entry.translating && (
                      <button onClick={() => retranslate(entry.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors">
                        <Globe className="w-3 h-3" /> Translate
                      </button>
                    )}
                    {entry.translation && !entry.translating && (
                      <button onClick={() => retranslate(entry.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <RefreshCw className="w-3 h-3" /> Re-translate
                      </button>
                    )}
                    <button onClick={() => copy(entry.translation || entry.original, entry.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ml-auto">
                      {copied === entry.id
                        ? <><CheckCheck className="w-3 h-3 text-green-500" /><span className="text-green-500">Copied</span></>
                        : <><Copy className="w-3 h-3" />Copy</>}
                    </button>
                    <button onClick={() => setEntries(p => p.filter(e => e.id !== entry.id))}
                      className="flex items-center px-2.5 py-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {entries.length > 1 && (
              <button onClick={() => setEntries([])}
                className="w-full py-2 text-xs text-gray-400 hover:text-red-500 transition-colors text-center">
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {showSaved && <SavedPanel onClose={() => setShowSaved(false)} />}
    </Layout>
  );
}
