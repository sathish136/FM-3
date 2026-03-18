import { Layout } from "@/components/Layout";
import {
  Layers, Eye, Share2, Plus, Loader2, FolderOpen,
  AlertCircle, Maximize2, Download, RefreshCw, ExternalLink, X,
  ChevronLeft, ChevronRight, Play, Pause, Clock, Monitor, Film, LayoutGrid,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import JSZip from "jszip";
import { init as initPptxPreview } from "pptx-preview";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Presentation {
  name: string;
  project: string;
  project_name: string;
  presentation_name: string;
  file_upload: string | null;
  modified: string;
}

interface SlideData {
  index: number;
  title: string;
  body: string[];
  bgColor: string;
  hasContent: boolean;
}

const PALETTE = [
  { bg: "#1a56db" }, { bg: "#6d28d9" }, { bg: "#047857" },
  { bg: "#b45309" }, { bg: "#0e7490" }, { bg: "#be185d" },
];

function fileExt(f: string) { return (f.split(".").pop() || "").toLowerCase(); }

function proxyAbsUrl(fileUrl: string): string {
  const origin = window.location.origin;
  return `${origin}${BASE}/api/file-proxy?url=${encodeURIComponent(fileUrl)}`;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

// ── PPTX Parser ───────────────────────────────────────────────────────────────
function byLocalName(doc: Document | Element, name: string): Element[] {
  return Array.from(doc.getElementsByTagNameNS("*", name));
}

async function parsePptx(url: string): Promise<SlideData[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch file");
  const buf = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const slideFiles = Object.keys(zip.files)
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/)?.[1] || "0");
      const nb = parseInt(b.match(/(\d+)/)?.[1] || "0");
      return na - nb;
    });

  const slides: SlideData[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("string");
    const doc = new DOMParser().parseFromString(xml, "text/xml");

    // Background color — check theme/slide background
    let bgColor = "";
    const solidFills = byLocalName(doc, "solidFill");
    for (const sf of solidFills) {
      const clr = sf.getElementsByTagNameNS("*", "srgbClr")[0];
      if (clr) { bgColor = `#${clr.getAttribute("val") || ""}`; break; }
    }

    // Extract text from ALL shapes (placeholders + regular)
    let title = "";
    const body: string[] = [];
    const allShapes = byLocalName(doc, "sp");

    for (const sp of allShapes) {
      const ph = byLocalName(sp, "ph")[0];
      const phType = ph?.getAttribute("type") || "";

      const runs = byLocalName(sp, "t")
        .map(t => t.textContent?.trim())
        .filter(Boolean);
      if (!runs.length) continue;

      const joined = runs.join(" ");

      if (phType === "title" || phType === "ctrTitle") {
        title = joined;
      } else if (phType === "subTitle" || phType === "body" || phType === "") {
        body.push(joined);
      } else {
        body.push(joined);
      }
    }

    // Also pick up free text boxes (txBox)
    const txBoxes = byLocalName(doc, "txBody");
    for (const tb of txBoxes) {
      const runs = byLocalName(tb, "t")
        .map(t => t.textContent?.trim())
        .filter(Boolean);
      if (runs.length) {
        const joined = runs.join(" ");
        if (!title && !body.includes(joined)) body.push(joined);
      }
    }

    slides.push({
      index: i,
      title,
      body: [...new Set(body)].slice(0, 5),
      bgColor: bgColor || PALETTE[i % PALETTE.length].bg,
      hasContent: !!(title || body.length),
    });
  }

  return slides;
}

// ── Hook: load + parse PPTX slides ───────────────────────────────────────────
function usePptxSlides(fileUrl: string | null, ext: string) {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileUrl || (ext !== "pptx" && ext !== "ppt")) { setSlides([]); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSlides([]);
    parsePptx(`${BASE}/api/file-proxy?url=${encodeURIComponent(fileUrl)}`)
      .then(s => { if (!cancelled) { setSlides(s); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [fileUrl, ext]);

  return { slides, loading, error };
}

// ── Slide Card ────────────────────────────────────────────────────────────────
function SlideCard({ slide, pres, deckIdx, scale = 1 }: {
  slide: SlideData; pres: Presentation; deckIdx: number; scale?: number;
}) {
  const rawBg = slide.bgColor || "";
  const isLight = /^#[ef][ef]/i.test(rawBg) || rawBg === "#ffffff" || rawBg === "" ;
  const bg = isLight ? PALETTE[(deckIdx + slide.index) % PALETTE.length].bg : rawBg;

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center overflow-hidden select-none px-6"
      style={{ background: bg }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
        style={{ background: "rgba(255,255,255,0.18)" }}>
        <Layers className="w-4 h-4 text-white" />
      </div>
      <h2 className="font-bold text-center leading-snug mb-2 max-w-xs text-white"
        style={{ fontSize: `${1.3 * scale}em` }}>
        {slide.title || pres.presentation_name || pres.name}
      </h2>
      {slide.body.slice(0, 3).map((line, li) => (
        <p key={li} className="text-center leading-snug mb-1 max-w-xs"
          style={{ color: "rgba(255,255,255,0.75)", fontSize: `${0.78 * scale}em` }}>
          {line}
        </p>
      ))}
      {!slide.hasContent && (
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: `${0.7 * scale}em` }} className="mt-1">
          Slide {slide.index + 1}
        </p>
      )}
    </div>
  );
}

// ── pptx-preview powered viewer ───────────────────────────────────────────────
function PptxViewer({ fileUrl }: { fileUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const viewerRef = useRef<ReturnType<typeof initPptxPreview> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    const { clientWidth, clientHeight } = el;
    const w = clientWidth || 1280;
    const h = clientHeight || 720;

    let cancelled = false;
    setStatus("loading");

    const viewer = initPptxPreview(el, { width: w, height: h });
    viewerRef.current = viewer;

    fetch(fileUrl)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then(buf => {
        if (cancelled) return;
        viewer.preview(buf);
        setStatus("ready");
      })
      .catch(err => {
        if (cancelled) return;
        console.error("pptx-preview error:", err);
        setErrorMsg(err.message || "Failed to load");
        setStatus("error");
      });

    return () => { cancelled = true; };
  }, [fileUrl]);

  return (
    <div className="w-full h-full relative bg-gray-950 overflow-auto">
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400 z-10 bg-gray-950">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-sm font-medium">Rendering slides…</p>
          <p className="text-xs text-gray-600">Parsing PPTX content</p>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400 bg-gray-950">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm font-medium text-red-300">Could not render slides</p>
          <p className="text-xs text-gray-500">{errorMsg}</p>
        </div>
      )}
      <div ref={containerRef} className="w-full min-h-full" style={{ visibility: status === "ready" ? "visible" : "hidden" }} />
    </div>
  );
}

// ── Fullscreen Viewer ─────────────────────────────────────────────────────────
function FullscreenViewer({ pres, slides, slidesLoading, onClose }: {
  pres: Presentation; slides: SlideData[]; slidesLoading: boolean; onClose: () => void;
}) {
  const ext = pres.file_upload ? fileExt(pres.file_upload) : "";
  const isPptx = ext === "pptx" || ext === "ppt";
  const [viewMode, setViewMode] = useState<"pptx" | "native">(isPptx && pres.file_upload ? "pptx" : "native");
  const [current, setCurrent] = useState(0);
  const total = slides.length || 1;

  const fileProxyUrl = pres.file_upload ? proxyAbsUrl(pres.file_upload) : null;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (viewMode !== "native") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault(); setCurrent(c => (c + 1) % total);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault(); setCurrent(c => (c - 1 + total) % total);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [total, onClose, viewMode]);

  const slide = slides[current] ?? null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-950 border-b border-gray-800 flex-shrink-0">
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">
          <X className="w-4 h-4" /> Exit
        </button>
        <div className="h-4 w-px bg-gray-700" />
        <p className="text-sm font-semibold text-white truncate flex-1">{pres.presentation_name || pres.name}</p>
        {pres.project_name && <p className="text-xs text-gray-400 uppercase tracking-wide mr-2">{pres.project_name}</p>}

        {/* View mode toggle – only for PPTX */}
        {isPptx && pres.file_upload && (
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode("pptx")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${viewMode === "pptx" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
              <Monitor className="w-3 h-3" /> Slides
            </button>
            <button
              onClick={() => setViewMode("native")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${viewMode === "native" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
              <LayoutGrid className="w-3 h-3" /> Outline
            </button>
          </div>
        )}

        {viewMode === "native" && <span className="text-xs text-gray-500 tabular-nums">{current + 1} / {total}</span>}
        {fileProxyUrl && (
          <a href={fileProxyUrl} download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">
            <Download className="w-4 h-4" /> Download
          </a>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === "pptx" && fileProxyUrl ? (
          <PptxViewer key={fileProxyUrl} fileUrl={fileProxyUrl} />
        ) : (
          /* Outline / native slide viewer */
          <div className="w-full h-full bg-gray-950 flex flex-col">
            <div className="flex-1 flex items-center justify-center px-16 py-8 relative">
              {slidesLoading ? (
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm">Parsing slides…</p>
                </div>
              ) : slide ? (
                <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl">
                  <SlideCard slide={slide} pres={pres} deckIdx={0} scale={1.6} />
                </div>
              ) : (
                <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl"
                  style={{ background: PALETTE[0].bg }}>
                  <div className="w-full h-full flex flex-col items-center justify-center text-white px-10">
                    <Layers className="w-12 h-12 mb-4 opacity-60" />
                    <h2 className="text-2xl font-bold text-center">{pres.presentation_name || pres.name}</h2>
                    {pres.project_name && <p className="text-sm text-white/60 mt-2 uppercase tracking-widest">{pres.project_name}</p>}
                  </div>
                </div>
              )}

              {slides.length > 1 && (
                <>
                  <button onClick={() => setCurrent(c => (c - 1 + total) % total)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all backdrop-blur-sm">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button onClick={() => setCurrent(c => (c + 1) % total)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all backdrop-blur-sm">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {slides.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 py-3 flex-shrink-0">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)}
                    className={`rounded-full transition-all ${i === current ? "w-6 h-2 bg-blue-500" : "w-2 h-2 bg-gray-600 hover:bg-gray-400"}`} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Deck List Item ────────────────────────────────────────────────────────────
function DeckListItem({ pres, index, active, numSlides, onClick }: {
  pres: Presentation; index: number; active: boolean; numSlides: number; onClick: () => void;
}) {
  const views = [24, 67, 142, 89][index % 4];
  const date = pres.modified ? formatDate(pres.modified) : "—";
  const palette = PALETTE[index % PALETTE.length];

  return (
    <button onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
        active ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50 border border-transparent"
      }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: active ? "#dbeafe" : `${palette.bg}22` }}>
          <Layers className="w-4 h-4" style={{ color: active ? "#2563eb" : palette.bg }} />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-medium leading-snug truncate ${active ? "text-blue-700" : "text-gray-800"}`}>
            {pres.presentation_name || pres.name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {numSlides} {numSlides === 1 ? "slide" : "slides"} · {date}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0 ml-2">
        <Eye className="w-3 h-3" /><span>{views}</span>
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PresentationPage() {
  const [records, setRecords] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  // Playback mode
  const [mode, setMode] = useState<"manual" | "video">("manual");
  const [playing, setPlaying] = useState(false);
  const [intervalSecs, setIntervalSecs] = useState(5);
  const [showIntervalMenu, setShowIntervalMenu] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE}/api/presentations`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecords(Array.isArray(data) ? data : []);
      setActiveIdx(0); setActiveSlide(0);
    } catch (e: any) {
      setError(e.message || "Failed to load presentations");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const active = records[activeIdx] ?? null;
  const activeExt = active?.file_upload ? fileExt(active.file_upload) : "";
  const isPptx = activeExt === "pptx" || activeExt === "ppt";
  const { slides, loading: slidesLoading } = usePptxSlides(active?.file_upload ?? null, activeExt);
  const numSlides = slides.length || 1;
  const currentSlide = slides[activeSlide] ?? null;

  const next = useCallback(() => {
    setActiveSlide(s => (s + 1) % numSlides);
    setProgress(0);
  }, [numSlides]);

  const prev = useCallback(() => {
    setActiveSlide(s => (s - 1 + numSlides) % numSlides);
    setProgress(0);
  }, [numSlides]);

  // Auto-play (video mode)
  useEffect(() => {
    if (mode !== "video" || !playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(0);
      return;
    }
    setProgress(0);
    const step = 100 / (intervalSecs * 20);
    progressRef.current = setInterval(() => setProgress(p => Math.min(p + step, 100)), 50);
    timerRef.current = setInterval(() => { next(); }, intervalSecs * 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [mode, playing, intervalSecs, next]);

  // Stop auto-play when switching decks
  useEffect(() => { setPlaying(false); setActiveSlide(0); }, [activeIdx]);

  const palette = PALETTE[activeIdx % PALETTE.length];

  return (
    <>
      {fullscreen && active && <FullscreenViewer pres={active} slides={slides} slidesLoading={slidesLoading} onClose={() => setFullscreen(false)} />}

      <Layout>
        <div className="p-6 space-y-6 max-w-7xl">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Presentations</h1>
              <p className="text-sm text-gray-500 mt-0.5">View and manage slide decks from ERPNext</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} disabled={loading}
                className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow transition-colors">
                <Plus className="w-4 h-4" /> New Deck
              </button>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="py-24 flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Fetching presentations…</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-2" />
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <button onClick={load} className="text-sm text-blue-600 underline">Retry</button>
            </div>
          ) : records.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No presentations found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* ── Left panel ── */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">

                  {/* Deck header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-gray-900 truncate">
                        {active?.presentation_name || active?.name}
                      </h2>
                      {active?.project_name && (
                        <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">{active.project_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      {active?.file_upload && (
                        <a href={proxyAbsUrl(active.file_upload)} download
                          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" title="Download">
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      {active?.file_upload && (
                        <a href={proxyAbsUrl(active.file_upload)} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" title="Open in new tab">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => setFullscreen(true)}
                        disabled={!active}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold shadow transition-colors">
                        <Maximize2 className="w-3.5 h-3.5" /> Full View
                      </button>
                      <button className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mode switcher */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                      <button
                        onClick={() => { setMode("manual"); setPlaying(false); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          mode === "manual" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}>
                        <Monitor className="w-3.5 h-3.5" /> Manual
                      </button>
                      <button
                        onClick={() => setMode("video")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          mode === "video" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}>
                        <Film className="w-3.5 h-3.5" /> Video
                      </button>
                    </div>

                    {mode === "video" && (
                      <>
                        <button
                          onClick={() => setPlaying(p => !p)}
                          disabled={slides.length === 0}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 ${
                            playing
                              ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}>
                          {playing ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5 fill-white" /> Play</>}
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setShowIntervalMenu(s => !s)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
                            <Clock className="w-3.5 h-3.5" /> {intervalSecs}s
                          </button>
                          {showIntervalMenu && (
                            <div className="absolute left-0 top-9 bg-white border border-gray-200 rounded-xl p-2 z-20 shadow-xl min-w-32">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide px-2 mb-1.5">Slide duration</p>
                              {[3, 5, 10, 15, 30].map(s => (
                                <button key={s} onClick={() => { setIntervalSecs(s); setShowIntervalMenu(false); }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                                    intervalSecs === s ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
                                  }`}>
                                  {s} seconds
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <div className="flex-1" />
                    <span className="text-xs text-gray-400 tabular-nums">
                      {activeSlide + 1} / {numSlides}
                    </span>
                  </div>

                  {/* Auto-play progress bar */}
                  {mode === "video" && playing && (
                    <div className="h-1 bg-gray-100 rounded-full mb-4 overflow-hidden">
                      <div className="h-full bg-blue-500 transition-none rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  )}

                  {/* Main slide preview */}
                  <div className="w-full aspect-video rounded-xl overflow-hidden bg-gray-100 relative">
                    {slidesLoading ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-100">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        <p className="text-xs text-gray-400">Loading slides…</p>
                      </div>
                    ) : currentSlide ? (
                      <SlideCard slide={currentSlide} pres={active!} deckIdx={activeIdx} scale={1} />
                    ) : active ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white p-8"
                        style={{ background: palette.bg }}>
                        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
                          <Layers className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-xs font-semibold text-white/60 mb-1 uppercase tracking-widest">
                          {active.project_name || "Presentation"}
                        </p>
                        <h2 className="text-xl font-bold text-center">{active.presentation_name || active.name}</h2>
                      </div>
                    ) : null}

                    {/* Navigation arrows — Manual mode */}
                    {mode === "manual" && slides.length > 1 && (
                      <>
                        <button onClick={prev}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 hover:bg-black/60 text-white flex items-center justify-center transition-all backdrop-blur-sm">
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={next}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 hover:bg-black/60 text-white flex items-center justify-center transition-all backdrop-blur-sm">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Slide dots */}
                  {slides.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                      {slides.map((_, i) => (
                        <button key={i} onClick={() => { setActiveSlide(i); setProgress(0); }}
                          className={`rounded-full transition-all ${
                            i === activeSlide ? "w-5 h-2 bg-blue-600" : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
                          }`} />
                      ))}
                    </div>
                  )}
                </div>

                {/* ALL SLIDES thumbnails */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    All Slides
                    {slidesLoading && <Loader2 className="inline w-3 h-3 ml-1.5 animate-spin text-gray-300" />}
                  </p>
                  {slidesLoading ? (
                    <div className="grid grid-cols-5 gap-2">
                      {[0,1,2,3,4].map(i => (
                        <div key={i} className="aspect-video rounded-lg bg-gray-100 animate-pulse" />
                      ))}
                    </div>
                  ) : slides.length > 0 ? (
                    <div className="grid grid-cols-5 gap-2">
                      {slides.map((slide, i) => (
                        <button key={i} onClick={() => { setActiveSlide(i); setProgress(0); }}
                          className={`aspect-video rounded-lg overflow-hidden relative transition-all ${
                            i === activeSlide ? "ring-2 ring-blue-500 ring-offset-2" : "opacity-70 hover:opacity-100"
                          }`}>
                          <SlideCard slide={slide} pres={active!} deckIdx={activeIdx} scale={0.28} />
                          <span className="absolute bottom-1 right-1.5 text-[9px] font-bold text-white/80 drop-shadow">{i + 1}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                      {Array.from({ length: numSlides }, (_, i) => (
                        <button key={i} onClick={() => setActiveSlide(i)}
                          className={`aspect-video rounded-lg flex items-center justify-center transition-all text-white text-xs font-bold ${
                            i === activeSlide ? "ring-2 ring-blue-500 ring-offset-2" : "opacity-60 hover:opacity-90"
                          }`}
                          style={{ background: PALETTE[(activeIdx + i) % PALETTE.length].bg }}>
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right panel: All Decks ── */}
              <div className="lg:col-span-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4">All Decks</h3>
                  <div className="space-y-1">
                    {records.map((r, i) => (
                      <DeckListItem key={r.name} pres={r} index={i} active={i === activeIdx}
                        numSlides={i === activeIdx ? numSlides : 1}
                        onClick={() => { setActiveIdx(i); }} />
                    ))}
                  </div>
                  <button className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> New Presentation
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </Layout>
    </>
  );
}
