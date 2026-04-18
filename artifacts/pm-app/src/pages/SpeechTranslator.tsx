import { Layout } from "@/components/Layout";
import {
  Mic, Square, Languages, Globe, Trash2, Copy, CheckCheck,
  RefreshCw, ChevronDown,
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
  original: string;
  sourceLang: string;
  translation: string | null;
  translating: boolean;
  ts: string;
};

let _entryId = 0;

async function translateToEnglish(text: string, sourceLang: string): Promise<string> {
  const res = await fetch(`${BASE}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Pass null for auto-detect so the backend/API auto-detects the language
    body: JSON.stringify({ text, sourceLang: sourceLang === "auto" ? null : sourceLang }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.translation;
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
        className={`flex items-center gap-3 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm min-w-[200px]
          ${disabled ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500" : "border-violet-200 bg-white text-gray-800 hover:border-violet-400 cursor-pointer"}`}
      >
        <span className="text-xl">{sel.flag}</span>
        <div className="text-left flex-1">
          <p className="leading-tight">{sel.label}</p>
          {sel.native !== sel.label && <p className="text-[10px] text-gray-400 font-normal">{sel.native}</p>}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl border border-gray-200 shadow-2xl z-50 w-64 flex flex-col overflow-hidden">
          <div className="px-2 pt-2 pb-1 border-b border-gray-100">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search language…"
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-violet-300 placeholder:text-gray-300"
            />
          </div>
          <div className="overflow-y-auto max-h-64 py-1">
            {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No match</p>}
            {filtered.map(lang => (
              <button key={lang.code} onClick={() => { onChange(lang.code); setOpen(false); setQuery(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors
                  ${value === lang.code ? "bg-violet-50 text-violet-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
              >
                <span className="text-base flex-shrink-0">{lang.flag}</span>
                <div className="min-w-0">
                  <p className="font-semibold leading-tight">{lang.label}</p>
                  {lang.native !== lang.label && <p className="text-[10px] text-gray-400 truncate">{lang.native}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SpeechTranslator() {
  const [activeLang, setActiveLang] = useState<LangCode>("ta-IN");
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const liveRef = useRef("");
  const isRecordingRef = useRef(false);

  const langMeta = LANGS.find(l => l.code === activeLang) || LANGS[0];

  const stopRecognition = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    const final = liveRef.current.trim();
    if (final) {
      setEntries(prev => [{
        id: ++_entryId,
        original: final,
        sourceLang: activeLang,
        translation: null,
        translating: false,
        ts: new Date().toLocaleTimeString(),
      }, ...prev]);
    }
    liveRef.current = "";
    setLiveText("");
  }, [activeLang]);

  const startRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    liveRef.current = "";
    setLiveText("");
    isRecordingRef.current = true;
    setIsRecording(true);

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    // For auto-detect, leave lang unset so the browser uses its default detection
    if (activeLang !== "auto") r.lang = activeLang;
    recognitionRef.current = r;

    r.onresult = (e: any) => {
      // Use e.resultIndex to only process NEW results — avoids duplicate words
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) liveRef.current += t + " ";
        else interim += t;
      }
      setLiveText(liveRef.current + interim);
    };

    r.onerror = () => {};
    r.onend = () => {
      if (isRecordingRef.current) {
        try { r.start(); } catch {}
      }
    };
    r.start();
  }, [activeLang]);

  useEffect(() => {
    if (isRecording) stopRecognition();
  }, [activeLang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch {}
      }
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
      <div className="flex flex-col h-[calc(100vh-48px)] bg-[#f8fafc]">

        {/* ── Header ── */}
        <div className="flex-shrink-0 bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-200 text-[10px] font-bold uppercase tracking-widest">AI Module</p>
              <h1 className="text-white text-lg font-bold flex items-center gap-2">
                <Languages className="w-5 h-5" /> Speech Translator
              </h1>
              <p className="text-violet-200 text-xs mt-0.5">Speak in Tamil, Hindi or English — translate to English instantly</p>
            </div>
            {entries.length > 0 && (
              <button onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium transition-colors">
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-4">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">

            {/* Language Selector */}
            <SpeechLangSelect value={activeLang} onChange={setActiveLang} disabled={isRecording} />

            {/* Mic Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleRecording}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 focus:outline-none
                  ${isRecording
                    ? "bg-red-600 hover:bg-red-700 scale-105 shadow-red-300"
                    : "bg-violet-600 hover:bg-violet-700 shadow-violet-300 hover:scale-105"
                  }`}
              >
                {isRecording && (
                  <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
                )}
                {isRecording
                  ? <Square className="w-7 h-7 text-white" />
                  : <Mic className="w-8 h-8 text-white" />
                }
              </button>
              <span className={`text-xs font-semibold ${isRecording ? "text-red-600" : "text-gray-400"}`}>
                {isRecording
                  ? activeLang === "auto"
                    ? "Recording… language auto-detecting — tap to stop"
                    : `Recording in ${langMeta.label}… tap to stop`
                  : "Tap to start speaking"}
              </span>
            </div>

            {/* Live Text */}
            {isRecording && (
              <div className={`w-full max-w-lg min-h-[56px] rounded-xl border px-4 py-3 text-sm leading-relaxed text-center transition-all
                ${liveText ? "bg-red-50 border-red-200 text-gray-700" : "bg-gray-50 border-dashed border-gray-200 text-gray-400 italic"}`}>
                {liveText || "Listening…"}
              </div>
            )}

            {/* How it works hint */}
            {!isRecording && entries.length === 0 && (
              <div className="flex items-center gap-5 text-xs text-gray-400">
                <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold">1</span>Pick language</div>
                <div className="w-4 h-px bg-gray-200" />
                <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold">2</span>Speak</div>
                <div className="w-4 h-px bg-gray-200" />
                <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold">3</span>Tap <Globe className="w-3 h-3 text-indigo-400" /> to translate</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Transcript Entries ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-2xl mx-auto space-y-3">

            {entries.length === 0 && !isRecording && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-3">
                  <Languages className="w-8 h-8 text-violet-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700">No transcriptions yet</p>
                <p className="text-xs text-gray-400 mt-1">Select a language and tap the mic to begin</p>
              </div>
            )}

            {entries.map(entry => {
              const srcLang = LANGS.find(l => l.code === entry.sourceLang);
              const isSrcEnglish = entry.sourceLang === "en-IN" || entry.sourceLang === "en-US";
              return (
                <div key={entry.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Original */}
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">{srcLang?.flag}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{srcLang?.label}</span>
                      <span className="text-[10px] text-gray-300 ml-auto">{entry.ts}</span>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed">{entry.original}</p>
                  </div>

                  {/* Translation */}
                  {entry.translation && (
                    <div className="mx-4 mb-3 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Globe className="w-3 h-3 text-indigo-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">English Translation</span>
                      </div>
                      <p className="text-sm text-indigo-900 leading-relaxed">{entry.translation}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="px-4 pb-3 flex items-center gap-2">
                    {!isSrcEnglish && !entry.translation && (
                      <button
                        onClick={() => handleTranslate(entry.id)}
                        disabled={entry.translating}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        {entry.translating
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : <Globe className="w-3 h-3" />
                        }
                        {entry.translating ? "Translating…" : "Translate to English"}
                      </button>
                    )}
                    {entry.translation && (
                      <button
                        onClick={() => handleTranslate(entry.id)}
                        disabled={entry.translating}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 text-xs font-medium rounded-lg transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${entry.translating ? "animate-spin" : ""}`} />
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
    </Layout>
  );
}
