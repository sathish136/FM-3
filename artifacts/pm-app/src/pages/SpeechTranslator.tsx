import { Layout } from "@/components/Layout";
import {
  Mic, Square, Languages, Globe, Trash2, Copy, CheckCheck,
  RefreshCw, ChevronDown, Save, Database,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

const BASE = "/api";

type LangCode = string;
type Lang = { code: LangCode; label: string; native: string; flag: string };

const AUTO_LANG: Lang = { code: "auto", label: "Auto Detect", native: "Detect language automatically", flag: "🌐" };

const LANGS: Lang[] = [
  AUTO_LANG,
  { code: "en-IN", label: "English",    native: "English",         flag: "🇬🇧" },
  { code: "ta-IN", label: "Tamil",      native: "தமிழ்",           flag: "🇮🇳" },
  { code: "hi-IN", label: "Hindi",      native: "हिन्दी",          flag: "🇮🇳" },
  { code: "te-IN", label: "Telugu",     native: "తెలుగు",          flag: "🇮🇳" },
  { code: "ml-IN", label: "Malayalam",  native: "മലയാളം",         flag: "🇮🇳" },
  { code: "kn-IN", label: "Kannada",    native: "ಕನ್ನಡ",           flag: "🇮🇳" },
  { code: "mr-IN", label: "Marathi",    native: "मराठी",           flag: "🇮🇳" },
  { code: "gu-IN", label: "Gujarati",   native: "ગુજરાતી",         flag: "🇮🇳" },
  { code: "bn-IN", label: "Bengali",    native: "বাংলা",          flag: "🇮🇳" },
  { code: "pa-IN", label: "Punjabi",    native: "ਪੰਜਾਬੀ",          flag: "🇮🇳" },
  { code: "es-ES", label: "Spanish",    native: "Español",         flag: "🇪🇸" },
  { code: "fr-FR", label: "French",     native: "Français",        flag: "🇫🇷" },
  { code: "de-DE", label: "German",     native: "Deutsch",         flag: "🇩🇪" },
  { code: "pt-BR", label: "Portuguese", native: "Português",       flag: "🇧🇷" },
  { code: "it-IT", label: "Italian",    native: "Italiano",        flag: "🇮🇹" },
  { code: "ru-RU", label: "Russian",    native: "Русский",         flag: "🇷🇺" },
  { code: "zh-CN", label: "Chinese",    native: "中文 (简体)",      flag: "🇨🇳" },
  { code: "ja-JP", label: "Japanese",   native: "日本語",          flag: "🇯🇵" },
  { code: "ko-KR", label: "Korean",     native: "한국어",           flag: "🇰🇷" },
  { code: "ar-SA", label: "Arabic",     native: "العربية",         flag: "🇸🇦" },
  { code: "tr-TR", label: "Turkish",    native: "Türkçe",          flag: "🇹🇷" },
  { code: "vi-VN", label: "Vietnamese", native: "Tiếng Việt",      flag: "🇻🇳" },
  { code: "th-TH", label: "Thai",       native: "ภาษาไทย",         flag: "🇹🇭" },
  { code: "id-ID", label: "Indonesian", native: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "nl-NL", label: "Dutch",      native: "Nederlands",      flag: "🇳🇱" },
  { code: "pl-PL", label: "Polish",     native: "Polski",          flag: "🇵🇱" },
  { code: "sv-SE", label: "Swedish",    native: "Svenska",         flag: "🇸🇪" },
  { code: "uk-UA", label: "Ukrainian",  native: "Українська",      flag: "🇺🇦" },
  { code: "el-GR", label: "Greek",      native: "Ελληνικά",        flag: "🇬🇷" },
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
  created_at: string;
};

let _entryId = 0;

async function translateToEnglish(text: string, sourceLang: string): Promise<string> {
  const res = await fetch(`${BASE}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sourceLang: sourceLang === "auto" ? null : sourceLang }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.translation;
}

async function saveToDb(entry: Entry, langLabel: string): Promise<number | null> {
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
    if (!res.ok) return null;
    const data = await res.json();
    return data.id;
  } catch { return null; }
}

// ─── Sound Wave Animation ──────────────────────────────────────────────────────
function SoundWave() {
  const bars = [3, 6, 10, 7, 12, 5, 9, 4, 11, 6, 8, 3, 10, 7, 5];
  return (
    <div className="flex items-center justify-center gap-[3px] h-10">
      {bars.map((h, i) => (
        <div
          key={i}
          className="rounded-full bg-white/80"
          style={{
            width: 3,
            height: `${h}px`,
            animation: `wave-bar 0.8s ease-in-out ${(i * 0.07).toFixed(2)}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes wave-bar {
          0%   { transform: scaleY(0.4); opacity: 0.5; }
          100% { transform: scaleY(2.8); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Searchable language picker ───────────────────────────────────────────────
function SpeechLangSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sel = LANGS.find(l => l.code === value) || LANGS[0];

  const filtered = query.trim()
    ? LANGS.filter(l => l.label.toLowerCase().includes(query.toLowerCase()) || l.native.toLowerCase().includes(query.toLowerCase()))
    : LANGS;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { if (!disabled) { setOpen(v => !v); setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); } }}
        disabled={disabled}
        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 text-sm font-semibold transition-all shadow-md min-w-[220px]
          ${disabled
            ? "opacity-50 cursor-not-allowed border-violet-200 bg-violet-50 text-violet-400"
            : "border-violet-300 bg-white text-violet-800 hover:border-violet-500 hover:shadow-violet-100 cursor-pointer"
          }`}
      >
        <span className="text-xl">{sel.flag}</span>
        <div className="text-left flex-1">
          <p className="leading-tight text-violet-900">{sel.label}</p>
          {sel.native !== sel.label && <p className="text-[10px] text-violet-400 font-normal">{sel.native}</p>}
        </div>
        <ChevronDown className={`w-4 h-4 text-violet-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-2xl border border-violet-100 shadow-2xl shadow-violet-100 z-50 w-64 flex flex-col overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-violet-50 bg-violet-50">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search language…"
              className="w-full text-xs px-3 py-2 rounded-xl border border-violet-200 outline-none focus:border-violet-400 bg-white placeholder:text-violet-300 text-violet-800"
            />
          </div>
          <div className="overflow-y-auto max-h-64 py-1">
            {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No match</p>}
            {filtered.map(lang => (
              <button key={lang.code} onClick={() => { onChange(lang.code); setOpen(false); setQuery(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors
                  ${value === lang.code ? "bg-violet-50 text-violet-700 font-semibold" : "text-gray-700 hover:bg-violet-50/50"}`}
              >
                <span className="text-base flex-shrink-0">{lang.flag}</span>
                <div className="min-w-0">
                  <p className="font-semibold leading-tight">{lang.label}</p>
                  {lang.native !== lang.label && <p className="text-[10px] text-gray-400 truncate">{lang.native}</p>}
                </div>
                {value === lang.code && <div className="ml-auto w-2 h-2 rounded-full bg-violet-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Saved Records Panel ──────────────────────────────────────────────────────
function SavedPanel({ onClose }: { onClose: () => void }) {
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/speech-translations`)
      .then(r => r.json())
      .then(d => { setRecords(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDeleteAll = async () => {
    await fetch(`${BASE}/speech-translations`, { method: "DELETE" });
    setRecords([]);
  };

  const handleDelete = async (id: number) => {
    await fetch(`${BASE}/speech-translations/${id}`, { method: "DELETE" });
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh] overflow-hidden">
        <div className="bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-violet-200" />
            <h2 className="font-bold text-white">Saved Translations</h2>
            <span className="text-xs bg-white/20 text-white font-semibold px-2 py-0.5 rounded-full">{records.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {records.length > 0 && (
              <button onClick={handleDeleteAll} className="text-xs text-red-200 hover:text-white hover:bg-white/10 px-2 py-1 rounded-lg transition-colors">Clear All</button>
            )}
            <button onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/10 text-xl font-bold w-8 h-8 rounded-lg flex items-center justify-center transition-colors">×</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 bg-slate-50">
          {loading && <p className="text-sm text-gray-400 text-center py-8">Loading…</p>}
          {!loading && records.length === 0 && (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mx-auto mb-3">
                <Database className="w-7 h-7 text-violet-300" />
              </div>
              <p className="text-sm text-gray-400">No saved translations yet</p>
            </div>
          )}
          {records.map(r => {
            const lang = LANGS.find(l => l.code === r.source_lang);
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">{lang?.flag || "🌐"}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">{r.source_lang_label || lang?.label || r.source_lang}</span>
                    <span className="text-[10px] text-gray-300 ml-auto">{r.recorded_at}</span>
                    <button onClick={() => handleDelete(r.id)} className="text-gray-300 hover:text-red-400 ml-1 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{r.original}</p>
                </div>
                {r.translation && (
                  <div className="mx-4 mb-3 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Globe className="w-3 h-3 text-indigo-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">English</span>
                    </div>
                    <p className="text-sm text-indigo-900 leading-relaxed">{r.translation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SpeechTranslator() {
  const [activeLang, setActiveLang] = useState<LangCode>("ta-IN");
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [liveTranslation, setLiveTranslation] = useState("");
  const [translatingLive, setTranslatingLive] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const recognitionRef = useRef<any>(null);
  // Track finalized text from ALL previous recognition sessions (to avoid duplication on restart)
  const prevSessionsRef = useRef("");
  // Track finalized text from CURRENT session only
  const currentSessionRef = useRef("");
  const isRecordingRef = useRef(false);
  const liveTranslationRef = useRef("");
  const translateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const langMeta = LANGS.find(l => l.code === activeLang) || LANGS[0];
  const isEnglish = activeLang === "en-IN" || activeLang === "en-US";

  // Debounced live translation - only fires after user pauses speaking
  const triggerLiveTranslation = useCallback((text: string, lang: string) => {
    if (!text.trim() || lang === "en-IN" || lang === "en-US") {
      setLiveTranslation("");
      liveTranslationRef.current = "";
      return;
    }
    if (translateDebounceRef.current) clearTimeout(translateDebounceRef.current);
    translateDebounceRef.current = setTimeout(async () => {
      const snapshot = text;
      if (!snapshot.trim()) return;
      setTranslatingLive(true);
      try {
        const t = await translateToEnglish(snapshot, lang);
        setLiveTranslation(t);
        liveTranslationRef.current = t;
      } catch {}
      setTranslatingLive(false);
    }, 1200);
  }, []);

  const stopRecognition = useCallback(async () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (translateDebounceRef.current) clearTimeout(translateDebounceRef.current);

    // Combined finalized text from all sessions
    const final = (prevSessionsRef.current + currentSessionRef.current).trim();
    const finalTranslation = liveTranslationRef.current || null;
    const currentLang = activeLang;
    const currentLangLabel = LANGS.find(l => l.code === activeLang)?.label || activeLang;

    if (final) {
      const ts = new Date().toLocaleTimeString();
      const newEntry: Entry = {
        id: ++_entryId,
        original: final,
        sourceLang: currentLang,
        translation: finalTranslation,
        translating: false,
        ts,
        saved: false,
      };

      let entryWithTranslation = newEntry;
      if (!finalTranslation && !isEnglish) {
        entryWithTranslation = { ...newEntry, translating: true };
        setEntries(prev => [entryWithTranslation, ...prev]);
        try {
          const t = await translateToEnglish(final, currentLang);
          entryWithTranslation = { ...entryWithTranslation, translation: t, translating: false };
          setEntries(prev => prev.map(e => e.id === newEntry.id ? entryWithTranslation : e));
        } catch {
          setEntries(prev => prev.map(e => e.id === newEntry.id ? { ...e, translating: false } : e));
        }
      } else {
        setEntries(prev => [newEntry, ...prev]);
      }

      const dbId = await saveToDb(entryWithTranslation, currentLangLabel);
      if (dbId) {
        setEntries(prev => prev.map(e => e.id === newEntry.id ? { ...e, dbId, saved: true } : e));
      }
    }

    // Reset all session tracking
    prevSessionsRef.current = "";
    currentSessionRef.current = "";
    liveTranslationRef.current = "";
    setLiveText("");
    setLiveTranslation("");
    setTranslatingLive(false);
  }, [activeLang, isEnglish]);

  const startRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // Reset session tracking
    prevSessionsRef.current = "";
    currentSessionRef.current = "";
    liveTranslationRef.current = "";
    setLiveText("");
    setLiveTranslation("");
    isRecordingRef.current = true;
    setIsRecording(true);

    const createInstance = () => {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      if (activeLang !== "auto") r.lang = activeLang;

      r.onresult = (e: any) => {
        let interim = "";
        // Only process results from resultIndex onwards - prevents re-processing old results
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            currentSessionRef.current += t + " ";
          } else {
            interim += t;
          }
        }
        // Combine: previous sessions + current session finals + current interim
        const combined = prevSessionsRef.current + currentSessionRef.current + interim;
        setLiveText(combined);
        triggerLiveTranslation(combined, activeLang);
      };

      r.onerror = () => {};

      r.onend = () => {
        if (isRecordingRef.current) {
          // Move current session finals to "previous sessions" before restarting
          // This prevents the new session from duplicating words already finalized
          prevSessionsRef.current += currentSessionRef.current;
          currentSessionRef.current = "";
          try { createInstance().start(); } catch {}
        }
      };

      return r;
    };

    const r = createInstance();
    recognitionRef.current = r;
    r.start();
  }, [activeLang, triggerLiveTranslation]);

  useEffect(() => {
    if (isRecording) stopRecognition();
  }, [activeLang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch {}
      }
      if (translateDebounceRef.current) clearTimeout(translateDebounceRef.current);
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) stopRecognition();
    else startRecognition();
  };

  const handleTranslate = async (id: number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, translating: true } : e));
    try {
      const entry = entries.find(e => e.id === id);
      if (!entry) return;
      const translation = await translateToEnglish(entry.original, entry.sourceLang);
      setEntries(prev => prev.map(e => e.id === id ? { ...e, translation, translating: false } : e));
    } catch {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, translating: false } : e));
    }
  };

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleDelete = (id: number) => setEntries(prev => prev.filter(e => e.id !== id));
  const handleClearAll = () => setEntries([]);

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-48px)] bg-gradient-to-b from-slate-50 to-white">

        {/* ── Header ── */}
        <div className="flex-shrink-0 bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 px-6 py-4 shadow-lg shadow-violet-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-300 text-[10px] font-bold uppercase tracking-widest">AI Module</p>
              <h1 className="text-white text-lg font-bold flex items-center gap-2 mt-0.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <Languages className="w-4 h-4 text-white" />
                </div>
                Speech Translator
              </h1>
              <p className="text-violet-300 text-xs mt-1">Speak in any language — real-time English translation & auto-saved</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSaved(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-all border border-white/20">
                <Database className="w-3.5 h-3.5" /> History
              </button>
              {entries.length > 0 && (
                <button onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition-all border border-white/20">
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Recording Control Panel ── */}
        <div className="flex-shrink-0 bg-white border-b border-violet-50 shadow-sm">
          <div className="max-w-2xl mx-auto px-6 py-5 flex flex-col items-center gap-5">

            {/* Language Selector */}
            <SpeechLangSelect value={activeLang} onChange={setActiveLang} disabled={isRecording} />

            {/* Mic Button + Wave */}
            <div className="flex flex-col items-center gap-3">
              {/* Wave animation above the button when recording */}
              <div className={`transition-all duration-300 ${isRecording ? "opacity-100 h-10" : "opacity-0 h-0 overflow-hidden"}`}>
                <SoundWave />
              </div>

              <button
                onClick={toggleRecording}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 focus:outline-none
                  ${isRecording
                    ? "bg-gradient-to-br from-red-500 to-rose-600 scale-110 shadow-red-400/50"
                    : "bg-gradient-to-br from-violet-600 to-purple-700 hover:scale-105 shadow-violet-500/40"
                  }`}
              >
                {isRecording && <>
                  <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-25" />
                  <span className="absolute inset-[-8px] rounded-full border-2 border-red-400/30 animate-ping" style={{ animationDuration: "1.5s" }} />
                </>}
                {isRecording
                  ? <Square className="w-7 h-7 text-white" fill="white" />
                  : <Mic className="w-8 h-8 text-white" />
                }
              </button>

              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all ${
                isRecording
                  ? "bg-red-50 border border-red-200"
                  : "bg-violet-50 border border-violet-100"
              }`}>
                {isRecording && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                <span className={`text-xs font-semibold ${isRecording ? "text-red-600" : "text-violet-500"}`}>
                  {isRecording
                    ? activeLang === "auto"
                      ? "Recording… detecting language"
                      : `Recording in ${langMeta.label} ${langMeta.flag}`
                    : "Tap mic to start speaking"
                  }
                </span>
              </div>
            </div>

            {/* Live Speech + Translation boxes */}
            {isRecording && (
              <div className="w-full max-w-lg space-y-2">
                {/* Original speech */}
                <div className="rounded-2xl border-2 border-red-200 bg-red-50/70 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{langMeta.flag}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">{langMeta.label}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] text-red-400 font-semibold">Live</span>
                    </div>
                  </div>
                  <p className={`text-sm leading-relaxed ${liveText ? "text-gray-800" : "text-gray-400 italic"}`}>
                    {liveText || "Listening for speech…"}
                  </p>
                </div>

                {/* Live English translation */}
                {!isEnglish && (
                  <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/70 px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">English</span>
                      {translatingLive && (
                        <div className="ml-auto flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                          <span className="text-[10px] text-indigo-400">Translating…</span>
                        </div>
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed ${liveTranslation ? "text-indigo-900" : "text-indigo-300 italic"}`}>
                      {liveTranslation || "English translation will appear here…"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* How-to hint */}
            {!isRecording && entries.length === 0 && (
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">1</span>
                  Pick language
                </div>
                <div className="w-6 h-px bg-violet-100" />
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">2</span>
                  Speak
                </div>
                <div className="w-6 h-px bg-violet-100" />
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">3</span>
                  Auto-translates & saves
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Transcript Entries ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-2xl mx-auto space-y-3">

            {entries.length === 0 && !isRecording && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 flex items-center justify-center mb-4 shadow-sm">
                  <Languages className="w-9 h-9 text-violet-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700">No transcriptions yet</p>
                <p className="text-xs text-gray-400 mt-1">Select a language and tap the mic to begin</p>
              </div>
            )}

            {entries.map(entry => {
              const srcLang = LANGS.find(l => l.code === entry.sourceLang);
              const isSrcEnglish = entry.sourceLang === "en-IN" || entry.sourceLang === "en-US";
              return (
                <div key={entry.id} className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                  {/* Language badge + Original */}
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-violet-50 rounded-full">
                        <span className="text-sm">{srcLang?.flag}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500">{srcLang?.label}</span>
                      </div>
                      <span className="text-[10px] text-gray-300 ml-auto">{entry.ts}</span>
                      {entry.saved && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          <Save className="w-2.5 h-2.5" /> Saved
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed">{entry.original}</p>
                  </div>

                  {/* Translation */}
                  {entry.translating && (
                    <div className="mx-4 mb-3 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                      <span className="text-xs text-indigo-400">Translating to English…</span>
                    </div>
                  )}
                  {entry.translation && !entry.translating && (
                    <div className="mx-4 mb-3 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Globe className="w-3 h-3 text-indigo-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">English Translation</span>
                      </div>
                      <p className="text-sm text-indigo-900 leading-relaxed">{entry.translation}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="px-4 pb-3 flex items-center gap-2 border-t border-gray-50 pt-2">
                    {!isSrcEnglish && !entry.translation && !entry.translating && (
                      <button
                        onClick={() => handleTranslate(entry.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
                      >
                        <Globe className="w-3 h-3" />
                        Translate to English
                      </button>
                    )}
                    {entry.translation && !entry.translating && (
                      <button
                        onClick={() => handleTranslate(entry.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-violet-400 hover:text-violet-700 hover:bg-violet-50 text-xs font-medium rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Re-translate
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(entry.translation || entry.original, entry.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 text-xs font-medium rounded-lg transition-colors ml-auto"
                    >
                      {copied === entry.id
                        ? <><CheckCheck className="w-3 h-3 text-green-500" /><span className="text-green-500">Copied</span></>
                        : <><Copy className="w-3 h-3" />Copy</>
                      }
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showSaved && <SavedPanel onClose={() => setShowSaved(false)} />}
    </Layout>
  );
}
