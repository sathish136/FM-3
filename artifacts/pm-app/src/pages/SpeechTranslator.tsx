import { Layout } from "@/components/Layout";
import {
  Mic, Square, Languages, Globe, Trash2, Copy, CheckCheck,
  RefreshCw, FileText, Type, Upload, X, FileUp, AlertCircle,
  ArrowRightLeft, ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

const BASE = "/api";

// ─── Language config ──────────────────────────────────────────────────────────
type LangOption = { code: string; label: string; native: string; flag: string; speechCode?: string };

const LANGUAGES: LangOption[] = [
  { code: "auto",    label: "Auto Detect", native: "Auto",   flag: "🔍" },
  { code: "English", label: "English",     native: "English",flag: "🇬🇧", speechCode: "en-IN" },
  { code: "Tamil",   label: "Tamil",       native: "தமிழ்",  flag: "🇮🇳", speechCode: "ta-IN" },
  { code: "Hindi",   label: "Hindi",       native: "हिन्दी", flag: "🇮🇳", speechCode: "hi-IN" },
];
const TARGET_LANGS = LANGUAGES.filter(l => l.code !== "auto");

// ─── API helpers ──────────────────────────────────────────────────────────────
async function translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const res = await fetch(`${BASE}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sourceLang, targetLang }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).translation;
}

async function translateDocument(file: File, sourceLang: string, targetLang: string): Promise<{ translation: string; originalText: string; charCount: number }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sourceLang", sourceLang);
  fd.append("targetLang", targetLang);
  const res = await fetch(`${BASE}/translate/document`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Language Selector ────────────────────────────────────────────────────────
function LangSelect({
  value, onChange, options, label,
}: { value: string; onChange: (v: string) => void; options: LangOption[]; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.code === value) || options[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-violet-300 text-sm font-semibold text-gray-700 transition-colors min-w-[140px]">
        <span>{selected.flag}</span>
        <span>{selected.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 min-w-[160px] py-1 overflow-hidden">
          {options.map(opt => (
            <button key={opt.code} onClick={() => { onChange(opt.code); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors
                ${value === opt.code ? "bg-violet-50 text-violet-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
              <span>{opt.flag}</span>
              <div>
                <p className="font-semibold leading-none">{opt.label}</p>
                {opt.native !== opt.label && <p className="text-[10px] text-gray-400 mt-0.5">{opt.native}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab type ─────────────────────────────────────────────────────────────────
type TabMode = "manual" | "speech" | "document";

export default function SpeechTranslator() {
  const [mode, setMode] = useState<TabMode>("manual");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("English");

  // Manual
  const [manualInput, setManualInput] = useState("");
  const [manualOutput, setManualOutput] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");
  const [copiedManual, setCopiedManual] = useState(false);

  // Speech
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [speechFinal, setSpeechFinal] = useState("");
  const [speechOutput, setSpeechOutput] = useState("");
  const [speechLoading, setSpeechLoading] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [copiedSpeech, setCopiedSpeech] = useState(false);
  const recognitionRef = useRef<any>(null);
  const liveRef = useRef("");
  const isRecordingRef = useRef(false);

  // Document
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docOriginal, setDocOriginal] = useState("");
  const [docOutput, setDocOutput] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [docDragging, setDocDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Manual translate ────────────────────────────────────────────────────────
  const handleManualTranslate = async () => {
    if (!manualInput.trim()) return;
    setManualError(""); setManualOutput(""); setManualLoading(true);
    try {
      const result = await translateText(manualInput.trim(), sourceLang, targetLang);
      setManualOutput(result);
    } catch (e: any) { setManualError(e.message || "Translation failed"); }
    finally { setManualLoading(false); }
  };

  const swapLanguages = () => {
    if (sourceLang === "auto") return;
    const newSource = targetLang;
    const newTarget = sourceLang;
    setSourceLang(newSource);
    setTargetLang(newTarget);
    setManualInput(manualOutput);
    setManualOutput("");
  };

  // ── Speech ──────────────────────────────────────────────────────────────────
  const speechLangOption = LANGUAGES.find(l => l.code === sourceLang && l.speechCode);
  const speechCode = speechLangOption?.speechCode || "en-IN";

  const stopRecognition = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    const final = liveRef.current.trim();
    if (final) setSpeechFinal(final);
    liveRef.current = "";
    setLiveText("");
  }, []);

  const startRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSpeechError("Speech recognition is not supported in your browser."); return; }
    setSpeechError(""); setSpeechFinal(""); setSpeechOutput(""); liveRef.current = ""; setLiveText("");
    isRecordingRef.current = true; setIsRecording(true);
    const r = new SR();
    r.continuous = true; r.interimResults = true;
    r.lang = speechCode;
    recognitionRef.current = r;
    r.onresult = (e: any) => {
      let interim = "", final = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      liveRef.current = final;
      setLiveText(final + interim);
    };
    r.onerror = (e: any) => { if (e.error !== "aborted") setSpeechError(`Mic error: ${e.error}`); };
    r.onend = () => { if (isRecordingRef.current) { try { r.start(); } catch {} } };
    r.start();
  }, [speechCode]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const handleSpeechTranslate = async (text: string) => {
    if (!text.trim()) return;
    setSpeechError(""); setSpeechOutput(""); setSpeechLoading(true);
    try {
      const result = await translateText(text.trim(), sourceLang, targetLang);
      setSpeechOutput(result);
    } catch (e: any) { setSpeechError(e.message || "Translation failed"); }
    finally { setSpeechLoading(false); }
  };

  const handleStopAndTranslate = () => {
    stopRecognition();
    const text = liveRef.current.trim() || liveText.trim();
    if (text) handleSpeechTranslate(text);
  };

  // ── Document ────────────────────────────────────────────────────────────────
  const handleFileSelect = (file: File) => {
    setDocFile(file); setDocOriginal(""); setDocOutput(""); setDocError("");
  };

  const handleDocTranslate = async () => {
    if (!docFile) return;
    setDocError(""); setDocOutput(""); setDocOriginal(""); setDocLoading(true);
    try {
      const result = await translateDocument(docFile, sourceLang, targetLang);
      setDocOriginal(result.originalText);
      setDocOutput(result.translation);
    } catch (e: any) { setDocError(e.message || "Document translation failed"); }
    finally { setDocLoading(false); }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDocDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const copyText = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const tabClass = (t: TabMode) =>
    `flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
      mode === t ? "bg-white text-violet-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
    }`;

  const isEnglishTarget = targetLang === "English";
  const srcLangLabel = LANGUAGES.find(l => l.code === sourceLang)?.label || sourceLang;
  const tgtLangLabel = LANGUAGES.find(l => l.code === targetLang)?.label || targetLang;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-48px)] bg-[#f8fafc]">

        {/* ── Header ── */}
        <div className="flex-shrink-0 bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 px-6 py-3.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-violet-200 text-[10px] font-bold uppercase tracking-widest">AI Module</p>
              <h1 className="text-white text-base font-bold flex items-center gap-2">
                <Languages className="w-4 h-4" /> Translator
              </h1>
              <p className="text-violet-200 text-xs">Manual · Speech · Document — translate between English, Hindi & Tamil</p>
            </div>

            {/* Lang bar */}
            <div className="flex items-center gap-2 mt-1">
              <LangSelect value={sourceLang} onChange={setSourceLang} options={LANGUAGES} label="From" />
              <button
                onClick={swapLanguages}
                disabled={sourceLang === "auto"}
                className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
                title="Swap languages"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
              <LangSelect value={targetLang} onChange={setTargetLang} options={TARGET_LANGS} label="To" />
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex items-center gap-1 mt-3 bg-black/20 p-1 rounded-xl w-fit">
            <button onClick={() => setMode("manual")} className={tabClass("manual")}>
              <Type className="w-3.5 h-3.5" /> Manual Text
            </button>
            <button onClick={() => setMode("speech")} className={tabClass("speech")}>
              <Mic className="w-3.5 h-3.5" /> Speech
            </button>
            <button onClick={() => setMode("document")} className={tabClass("document")}>
              <FileUp className="w-3.5 h-3.5" /> Document
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* ════ MANUAL MODE ════ */}
          {mode === "manual" && (
            <div className="flex-1 flex gap-0 overflow-hidden">
              {/* Source */}
              <div className="flex-1 flex flex-col border-r border-gray-200">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{srcLangLabel}</span>
                  {manualInput && (
                    <button onClick={() => { setManualInput(""); setManualOutput(""); }}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <textarea
                  className="flex-1 resize-none p-4 text-sm text-gray-800 placeholder:text-gray-300 bg-white outline-none leading-relaxed"
                  placeholder={`Type or paste ${srcLangLabel === "Auto Detect" ? "any text" : srcLangLabel + " text"} here…`}
                  value={manualInput}
                  onChange={e => { setManualInput(e.target.value); if (!e.target.value) setManualOutput(""); }}
                  onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleManualTranslate(); }}
                />
                <div className="px-4 py-2.5 bg-white border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">{manualInput.length} characters · Ctrl+Enter to translate</span>
                  <button
                    onClick={handleManualTranslate}
                    disabled={!manualInput.trim() || manualLoading}
                    className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                  >
                    {manualLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                    Translate
                  </button>
                </div>
              </div>

              {/* Target */}
              <div className="flex-1 flex flex-col bg-gray-50">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
                  <span className="text-xs font-bold text-violet-600 uppercase tracking-wide">{tgtLangLabel}</span>
                  {manualOutput && (
                    <button onClick={() => copyText(manualOutput, setCopiedManual)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-200 text-gray-500 text-xs transition-colors">
                      {copiedManual ? <><CheckCheck className="w-3 h-3 text-green-500" /><span className="text-green-500">Copied</span></> : <><Copy className="w-3 h-3" />Copy</>}
                    </button>
                  )}
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                  {manualError && (
                    <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{manualError}
                    </div>
                  )}
                  {manualLoading && (
                    <div className="flex items-center gap-2 text-violet-600 text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Translating…
                    </div>
                  )}
                  {manualOutput && !manualLoading && (
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{manualOutput}</p>
                  )}
                  {!manualOutput && !manualLoading && !manualError && (
                    <p className="text-sm text-gray-300 italic">Translation will appear here</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════ SPEECH MODE ════ */}
          {mode === "speech" && (
            <div className="flex-1 flex gap-0 overflow-hidden">
              {/* Source (speech) */}
              <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
                <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{srcLangLabel}</span>
                  {(speechFinal || liveText) && !isRecording && (
                    <button onClick={() => { setSpeechFinal(""); setSpeechOutput(""); }}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
                  {/* Mic button */}
                  <button
                    onClick={isRecording ? handleStopAndTranslate : startRecognition}
                    className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all duration-200
                      ${isRecording ? "bg-red-600 hover:bg-red-700 scale-105 shadow-red-300" : "bg-violet-600 hover:bg-violet-700 shadow-violet-300 hover:scale-105"}`}
                  >
                    {isRecording && <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-25" />}
                    {isRecording ? <Square className="w-8 h-8 text-white" /> : <Mic className="w-9 h-9 text-white" />}
                  </button>
                  <p className={`text-xs font-semibold ${isRecording ? "text-red-500" : "text-gray-400"}`}>
                    {isRecording ? "Recording… tap to stop & translate" : "Tap to start speaking"}
                  </p>

                  {/* Live text */}
                  {(liveText || speechFinal) && (
                    <div className={`w-full max-w-sm rounded-xl border px-4 py-3 text-sm leading-relaxed text-center
                      ${isRecording ? "bg-red-50 border-red-200 text-gray-700 italic" : "bg-gray-50 border-gray-200 text-gray-800"}`}>
                      {isRecording ? (liveText || "Listening…") : speechFinal}
                    </div>
                  )}

                  {speechError && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-3 py-2 text-sm max-w-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />{speechError}
                    </div>
                  )}

                  {/* Translate button (shown after recording stops) */}
                  {speechFinal && !isRecording && !speechOutput && (
                    <button
                      onClick={() => handleSpeechTranslate(speechFinal)}
                      disabled={speechLoading}
                      className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                    >
                      {speechLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                      Translate to {tgtLangLabel}
                    </button>
                  )}
                </div>
              </div>

              {/* Target (speech) */}
              <div className="flex-1 flex flex-col bg-gray-50">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                  <span className="text-xs font-bold text-violet-600 uppercase tracking-wide">{tgtLangLabel}</span>
                  {speechOutput && (
                    <button onClick={() => copyText(speechOutput, setCopiedSpeech)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-200 text-gray-500 text-xs transition-colors">
                      {copiedSpeech ? <><CheckCheck className="w-3 h-3 text-green-500" /><span className="text-green-500">Copied</span></> : <><Copy className="w-3 h-3" />Copy</>}
                    </button>
                  )}
                </div>
                <div className="flex-1 p-4 flex items-start overflow-y-auto">
                  {speechLoading && <div className="flex items-center gap-2 text-violet-600 text-sm mt-4 mx-auto"><RefreshCw className="w-4 h-4 animate-spin" />Translating…</div>}
                  {speechOutput && !speechLoading && <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{speechOutput}</p>}
                  {!speechOutput && !speechLoading && <p className="text-sm text-gray-300 italic mt-4 mx-auto">Translation will appear here</p>}
                </div>
              </div>
            </div>
          )}

          {/* ════ DOCUMENT MODE ════ */}
          {mode === "document" && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left: upload + original */}
              <div className="flex-1 flex flex-col border-r border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Document — {srcLangLabel}</span>
                  {docFile && (
                    <button onClick={() => { setDocFile(null); setDocOriginal(""); setDocOutput(""); setDocError(""); }}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>

                {!docFile ? (
                  <div
                    className={`flex-1 flex flex-col items-center justify-center gap-4 p-8 transition-colors
                      ${docDragging ? "bg-violet-50 border-2 border-dashed border-violet-400" : ""}`}
                    onDragOver={e => { e.preventDefault(); setDocDragging(true); }}
                    onDragLeave={() => setDocDragging(false)}
                    onDrop={handleFileDrop}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-violet-50 border-2 border-dashed border-violet-200 flex items-center justify-center">
                      <Upload className="w-7 h-7 text-violet-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700">Drop a file here</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOCX, or TXT — up to 50 MB</p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                    >
                      <FileUp className="w-4 h-4" /> Browse File
                    </button>
                    <input
                      ref={fileInputRef} type="file" accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* File info */}
                    <div className="flex items-center gap-3 mx-4 mt-4 mb-3 p-3 rounded-xl bg-violet-50 border border-violet-100">
                      <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-violet-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{docFile.name}</p>
                        <p className="text-[10px] text-gray-400">{(docFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      {!docOutput && (
                        <button
                          onClick={handleDocTranslate}
                          disabled={docLoading}
                          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
                        >
                          {docLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                          {docLoading ? "Translating…" : `Translate to ${tgtLangLabel}`}
                        </button>
                      )}
                    </div>

                    {docError && (
                      <div className="mx-4 flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{docError}
                      </div>
                    )}

                    {docOriginal && (
                      <div className="flex-1 overflow-y-auto px-4 pb-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Extracted Text</p>
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{docOriginal}</p>
                      </div>
                    )}

                    {!docOriginal && !docLoading && !docError && (
                      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
                        Click "Translate" to extract and translate your document
                      </div>
                    )}

                    {docLoading && (
                      <div className="flex-1 flex items-center justify-center gap-2 text-violet-600 text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Extracting text and translating…
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: translation */}
              <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                  <span className="text-xs font-bold text-violet-600 uppercase tracking-wide">{tgtLangLabel} Translation</span>
                  {docOutput && (
                    <button onClick={() => copyText(docOutput, setCopiedDoc)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-200 text-gray-500 text-xs transition-colors">
                      {copiedDoc ? <><CheckCheck className="w-3 h-3 text-green-500" /><span className="text-green-500">Copied</span></> : <><Copy className="w-3 h-3" />Copy</>}
                    </button>
                  )}
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                  {docOutput
                    ? <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{docOutput}</p>
                    : <p className="text-sm text-gray-300 italic">Translation will appear here</p>
                  }
                </div>

                {docOutput && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={handleDocTranslate}
                      disabled={docLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Re-translate
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
