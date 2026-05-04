import { Layout } from "@/components/Layout";
import {
  Globe, Trash2, Copy, CheckCheck, RefreshCw, FileText,
  Type, Upload, X, FileUp, AlertCircle, ArrowRightLeft,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const BASE = "/api";

// ─── Language config ──────────────────────────────────────────────────────────
type LangOption = { code: string; label: string; native: string; flag: string };

const ALL_LANGS: LangOption[] = [
  { code: "auto",                label: "Auto Detect",        native: "Auto",          flag: "🔍" },
  { code: "English",             label: "English",            native: "English",        flag: "🇬🇧" },
  { code: "Spanish",             label: "Spanish",            native: "Español",        flag: "🇪🇸" },
  { code: "French",              label: "French",             native: "Français",       flag: "🇫🇷" },
  { code: "German",              label: "German",             native: "Deutsch",        flag: "🇩🇪" },
  { code: "Portuguese",          label: "Portuguese",         native: "Português",      flag: "🇧🇷" },
  { code: "Italian",             label: "Italian",            native: "Italiano",       flag: "🇮🇹" },
  { code: "Russian",             label: "Russian",            native: "Русский",        flag: "🇷🇺" },
  { code: "Chinese (Simplified)",label: "Chinese (Simplified)",native: "中文 (简体)",   flag: "🇨🇳" },
  { code: "Chinese (Traditional)",label: "Chinese (Traditional)",native: "中文 (繁體)", flag: "🇹🇼" },
  { code: "Japanese",            label: "Japanese",           native: "日本語",         flag: "🇯🇵" },
  { code: "Korean",              label: "Korean",             native: "한국어",          flag: "🇰🇷" },
  { code: "Arabic",              label: "Arabic",             native: "العربية",        flag: "🇸🇦" },
  { code: "Hindi",               label: "Hindi",              native: "हिन्दी",          flag: "🇮🇳" },
  { code: "Bengali",             label: "Bengali",            native: "বাংলা",          flag: "🇧🇩" },
  { code: "Urdu",                label: "Urdu",               native: "اردو",           flag: "🇵🇰" },
  { code: "Tamil",               label: "Tamil",              native: "தமிழ்",           flag: "🇮🇳" },
  { code: "Telugu",              label: "Telugu",             native: "తెలుగు",          flag: "🇮🇳" },
  { code: "Marathi",             label: "Marathi",            native: "मराठी",           flag: "🇮🇳" },
  { code: "Gujarati",            label: "Gujarati",           native: "ગુજરાતી",         flag: "🇮🇳" },
  { code: "Kannada",             label: "Kannada",            native: "ಕನ್ನಡ",           flag: "🇮🇳" },
  { code: "Malayalam",           label: "Malayalam",          native: "മലയാളം",         flag: "🇮🇳" },
  { code: "Punjabi",             label: "Punjabi",            native: "ਪੰਜਾਬੀ",          flag: "🇮🇳" },
  { code: "Turkish",             label: "Turkish",            native: "Türkçe",         flag: "🇹🇷" },
  { code: "Vietnamese",          label: "Vietnamese",         native: "Tiếng Việt",     flag: "🇻🇳" },
  { code: "Thai",                label: "Thai",               native: "ภาษาไทย",        flag: "🇹🇭" },
  { code: "Indonesian",          label: "Indonesian",         native: "Bahasa Indonesia",flag: "🇮🇩" },
  { code: "Malay",               label: "Malay",              native: "Bahasa Melayu",  flag: "🇲🇾" },
  { code: "Dutch",               label: "Dutch",              native: "Nederlands",     flag: "🇳🇱" },
  { code: "Polish",              label: "Polish",             native: "Polski",         flag: "🇵🇱" },
  { code: "Swedish",             label: "Swedish",            native: "Svenska",        flag: "🇸🇪" },
  { code: "Norwegian",           label: "Norwegian",          native: "Norsk",          flag: "🇳🇴" },
  { code: "Danish",              label: "Danish",             native: "Dansk",          flag: "🇩🇰" },
  { code: "Finnish",             label: "Finnish",            native: "Suomi",          flag: "🇫🇮" },
  { code: "Greek",               label: "Greek",              native: "Ελληνικά",       flag: "🇬🇷" },
  { code: "Hebrew",              label: "Hebrew",             native: "עברית",          flag: "🇮🇱" },
  { code: "Persian",             label: "Persian (Farsi)",    native: "فارسی",          flag: "🇮🇷" },
  { code: "Swahili",             label: "Swahili",            native: "Kiswahili",      flag: "🇰🇪" },
  { code: "Filipino",            label: "Filipino",           native: "Filipino",       flag: "🇵🇭" },
  { code: "Romanian",            label: "Romanian",           native: "Română",         flag: "🇷🇴" },
  { code: "Hungarian",           label: "Hungarian",          native: "Magyar",         flag: "🇭🇺" },
  { code: "Czech",               label: "Czech",              native: "Čeština",        flag: "🇨🇿" },
  { code: "Ukrainian",           label: "Ukrainian",          native: "Українська",     flag: "🇺🇦" },
  { code: "Catalan",             label: "Catalan",            native: "Català",         flag: "🏴" },
  { code: "Croatian",            label: "Croatian",           native: "Hrvatski",       flag: "🇭🇷" },
  { code: "Slovak",              label: "Slovak",             native: "Slovenčina",     flag: "🇸🇰" },
  { code: "Bulgarian",           label: "Bulgarian",          native: "Български",      flag: "🇧🇬" },
  { code: "Serbian",             label: "Serbian",            native: "Српски",         flag: "🇷🇸" },
  { code: "Afrikaans",           label: "Afrikaans",          native: "Afrikaans",      flag: "🇿🇦" },
];
const TARGET_LANGS = ALL_LANGS.filter(l => l.code !== "auto");

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiTranslateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const res = await fetch(`${BASE}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sourceLang, targetLang }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).translation;
}

async function apiTranslateDoc(file: File, sourceLang: string, targetLang: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sourceLang", sourceLang);
  fd.append("targetLang", targetLang);
  const res = await fetch(`${BASE}/translate/document`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ translation: string; originalText: string; charCount: number }>;
}

// ─── Language dropdown ────────────────────────────────────────────────────────
function LangSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: LangOption[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sel = options.find(o => o.code === value) || options[0];

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.native.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleOpen = () => { setOpen(v => !v); setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); };

  return (
    <div className="relative" ref={ref}>
      <button onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:border-blue-300 text-sm font-semibold text-gray-700 transition-colors min-w-[160px] shadow-sm">
        <span className="text-base">{sel.flag}</span>
        <span className="truncate">{sel.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-50 w-56 flex flex-col overflow-hidden">
          <div className="px-2 pt-2 pb-1 border-b border-gray-100">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search language…"
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-blue-300 placeholder:text-gray-300"
            />
          </div>
          <div className="overflow-y-auto max-h-56 py-1">
            {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No match</p>}
            {filtered.map(opt => (
              <button key={opt.code} onClick={() => { onChange(opt.code); setOpen(false); setQuery(""); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors
                  ${value === opt.code ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                <span className="text-base flex-shrink-0">{opt.flag}</span>
                <div className="min-w-0">
                  <p className="font-semibold leading-tight truncate">{opt.label}</p>
                  {opt.native !== opt.label && <p className="text-[10px] text-gray-400 truncate">{opt.native}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab ─────────────────────────────────────────────────────────────────────
type Tab = "manual" | "document";

export default function Translator() {
  const [tab, setTab] = useState<Tab>("manual");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("English");

  // Manual
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Document
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docOriginal, setDocOriginal] = useState("");
  const [docOutput, setDocOutput] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");
  const [docCopied, setDocCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const srcLabel = ALL_LANGS.find(l => l.code === sourceLang)?.label || sourceLang;
  const tgtLabel = ALL_LANGS.find(l => l.code === targetLang)?.label || targetLang;

  // ── Manual ──────────────────────────────────────────────────────────────────
  const handleTranslate = async () => {
    if (!input.trim()) return;
    setError(""); setOutput(""); setLoading(true);
    try {
      const result = await apiTranslateText(input.trim(), sourceLang, targetLang);
      setOutput(result);
    } catch (e: any) { setError(e.message || "Translation failed"); }
    finally { setLoading(false); }
  };

  const handleSwap = () => {
    if (sourceLang === "auto") return;
    const ns = targetLang; const nt = sourceLang;
    setSourceLang(ns); setTargetLang(nt);
    setInput(output); setOutput("");
  };

  const copyText = (text: string, setCop: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => { setCop(true); setTimeout(() => setCop(false), 2000); });
  };

  // ── Document ────────────────────────────────────────────────────────────────
  const pickFile = (file: File) => {
    setDocFile(file); setDocOriginal(""); setDocOutput(""); setDocError("");
  };

  const handleDocTranslate = async () => {
    if (!docFile) return;
    setDocError(""); setDocOutput(""); setDocOriginal(""); setDocLoading(true);
    try {
      const r = await apiTranslateDoc(docFile, sourceLang, targetLang);
      setDocOriginal(r.originalText);
      setDocOutput(r.translation);
    } catch (e: any) { setDocError(e.message || "Document translation failed"); }
    finally { setDocLoading(false); }
  };

  const tabBtn = (t: Tab, label: string, Icon: any) => (
    <button onClick={() => setTab(t)}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        tab === t ? "bg-white text-blue-700 shadow-sm" : "text-white/70 hover:text-white"
      }`}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-48px)] bg-[#f8fafc]">

        {/* ── Header ── */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">AI Module</p>
              <h1 className="text-white text-lg font-bold flex items-center gap-2">
                <Globe className="w-5 h-5" /> Translator
              </h1>
              <p className="text-blue-200 text-xs mt-0.5">Type text or upload a document to translate between languages</p>
            </div>

            {/* Language bar */}
            <div className="flex items-center gap-2">
              <LangSelect value={sourceLang} onChange={v => { setSourceLang(v); setOutput(""); setDocOutput(""); }} options={ALL_LANGS} />
              <button onClick={handleSwap} disabled={sourceLang === "auto"}
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-40 flex items-center justify-center text-white transition-colors" title="Swap">
                <ArrowRightLeft className="w-4 h-4" />
              </button>
              <LangSelect value={targetLang} onChange={v => { setTargetLang(v); setOutput(""); setDocOutput(""); }} options={TARGET_LANGS} />
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex items-center gap-1 mt-3 bg-black/20 p-1 rounded-xl w-fit">
            {tabBtn("manual",   "Manual Text", Type)}
            {tabBtn("document", "Document",    FileUp)}
          </div>
        </div>

        {/* ════ MANUAL TAB ════ */}
        {tab === "manual" && (
          <div className="flex-1 flex overflow-hidden">
            {/* Source */}
            <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{srcLabel}</span>
                {input && (
                  <button onClick={() => { setInput(""); setOutput(""); setError(""); }}
                    className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <textarea
                className="flex-1 resize-none px-5 py-4 text-sm text-gray-800 placeholder:text-gray-300 bg-white outline-none leading-relaxed"
                placeholder={`Type or paste ${srcLabel === "Auto Detect" ? "any text" : srcLabel + " text"} here…`}
                value={input}
                onChange={e => { setInput(e.target.value); if (!e.target.value) { setOutput(""); setError(""); } }}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleTranslate(); }}
              />
              <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{input.length} chars · Ctrl+Enter</span>
                <button onClick={handleTranslate} disabled={!input.trim() || loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                  Translate
                </button>
              </div>
            </div>

            {/* Target */}
            <div className="flex-1 flex flex-col bg-gray-50">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">{tgtLabel}</span>
                {output && (
                  <button onClick={() => copyText(output, setCopied)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-gray-200 text-gray-500 text-xs font-medium transition-colors">
                    {copied ? <><CheckCheck className="w-3 h-3 text-green-500" /><span className="text-green-500">Copied!</span></> : <><Copy className="w-3 h-3" />Copy</>}
                  </button>
                )}
              </div>
              <div className="flex-1 px-5 py-4 overflow-y-auto">
                {error && (
                  <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-sm mb-3">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}
                  </div>
                )}
                {loading && <div className="flex items-center gap-2 text-blue-500 text-sm"><RefreshCw className="w-4 h-4 animate-spin" />Translating…</div>}
                {output && !loading && <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{output}</p>}
                {!output && !loading && !error && <p className="text-sm text-gray-300 italic">Translation will appear here</p>}
              </div>
            </div>
          </div>
        )}

        {/* ════ DOCUMENT TAB ════ */}
        {tab === "document" && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: upload */}
            <div className="flex-1 flex flex-col border-r border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Document — {srcLabel}</span>
                {docFile && (
                  <button onClick={() => { setDocFile(null); setDocOriginal(""); setDocOutput(""); setDocError(""); }}
                    className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {!docFile ? (
                <div
                  className={`flex-1 flex flex-col items-center justify-center gap-5 p-8 transition-colors cursor-pointer
                    ${dragging ? "bg-blue-50" : ""}`}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
                  onClick={() => fileRef.current?.click()}
                >
                  <div className={`w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors
                    ${dragging ? "border-blue-400 bg-blue-100" : "border-gray-200 bg-gray-50"}`}>
                    <Upload className={`w-8 h-8 transition-colors ${dragging ? "text-blue-500" : "text-gray-300"}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">Drop your file here</p>
                    <p className="text-xs text-gray-400 mt-1">PDF · DOCX · TXT — up to 50 MB</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                  >
                    <FileUp className="w-4 h-4" /> Browse File
                  </button>
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }} />
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* File chip */}
                  <div className="flex items-center gap-3 mx-4 mt-4 mb-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{docFile.name}</p>
                      <p className="text-[10px] text-gray-400">{(docFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    {!docOutput && (
                      <button onClick={handleDocTranslate} disabled={docLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0">
                        {docLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                        {docLoading ? "Translating…" : `Translate to ${tgtLabel}`}
                      </button>
                    )}
                  </div>

                  {docError && (
                    <div className="mx-4 mb-3 flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{docError}
                    </div>
                  )}

                  {docLoading && (
                    <div className="flex-1 flex items-center justify-center gap-2 text-blue-500 text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Extracting text and translating…
                    </div>
                  )}

                  {docOriginal && !docLoading && (
                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Extracted Text</p>
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{docOriginal}</p>
                    </div>
                  )}

                  {!docOriginal && !docLoading && !docError && (
                    <div className="flex-1 flex items-center justify-center text-xs text-gray-400 italic">
                      Click "Translate" to extract and translate your document
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: translation */}
            <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">{tgtLabel} Translation</span>
                {docOutput && (
                  <div className="flex items-center gap-1">
                    <button onClick={handleDocTranslate} disabled={docLoading}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 text-xs transition-colors">
                      <RefreshCw className="w-3 h-3" /> Re-translate
                    </button>
                    <button onClick={() => copyText(docOutput, setDocCopied)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-gray-200 text-gray-500 text-xs font-medium transition-colors">
                      {docCopied ? <><CheckCheck className="w-3 h-3 text-green-500" /><span className="text-green-500">Copied!</span></> : <><Copy className="w-3 h-3" />Copy</>}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-1 px-5 py-4 overflow-y-auto">
                {docOutput
                  ? <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{docOutput}</p>
                  : <p className="text-sm text-gray-300 italic">Translation will appear here</p>
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
