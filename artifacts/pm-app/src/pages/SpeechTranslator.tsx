import { Layout } from "@/components/Layout";
import {
  Mic, Square, Languages, Globe, Trash2, Copy, CheckCheck,
  RefreshCw,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

const BASE = "/api";

type LangCode = "ta-IN" | "hi-IN" | "en-IN" | "en-US";
type Lang = { code: LangCode; label: string; native: string; flag: string };

const LANGS: Lang[] = [
  { code: "ta-IN", label: "Tamil",   native: "தமிழ்",   flag: "🇮🇳" },
  { code: "hi-IN", label: "Hindi",   native: "हिन्दी",  flag: "🇮🇳" },
  { code: "en-IN", label: "English", native: "English", flag: "🇬🇧" },
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
    body: JSON.stringify({ text, sourceLang }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.translation;
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
    r.lang = activeLang;
    recognitionRef.current = r;

    r.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      liveRef.current = final;
      setLiveText(final + interim);
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
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              {LANGS.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setActiveLang(lang.code)}
                  disabled={isRecording}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeLang === lang.code
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 disabled:opacity-40"
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                  <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">{lang.native}</span>
                </button>
              ))}
            </div>

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
                {isRecording ? `Recording in ${langMeta.label}… tap to stop` : "Tap to start speaking"}
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
