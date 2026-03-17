import { Layout } from "@/components/Layout";
import {
  Layers, Eye, Share2, ChevronLeft, ChevronRight,
  Plus, Loader2, FolderOpen, AlertCircle, Play, RefreshCw,
  X, Clock, FileText,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import JSZip from "jszip";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  { bg: "#1a56db", text: "#ffffff", sub: "rgba(255,255,255,0.65)" },
  { bg: "#6d28d9", text: "#ffffff", sub: "rgba(255,255,255,0.65)" },
  { bg: "#047857", text: "#ffffff", sub: "rgba(255,255,255,0.65)" },
  { bg: "#b45309", text: "#ffffff", sub: "rgba(255,255,255,0.65)" },
  { bg: "#0e7490", text: "#ffffff", sub: "rgba(255,255,255,0.65)" },
  { bg: "#be185d", text: "#ffffff", sub: "rgba(255,255,255,0.65)" },
];

function fileExt(f: string) { return (f.split(".").pop() || "").toLowerCase(); }
function proxyUrl(f: string) { return `${BASE}/api/file-proxy?url=${encodeURIComponent(f)}`; }

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

    // Background color
    let bgColor = "";
    const solidFills = byLocalName(doc, "solidFill");
    if (solidFills.length > 0) {
      const clr = solidFills[0].getElementsByTagNameNS("*", "srgbClr")[0];
      if (clr) bgColor = `#${clr.getAttribute("val") || ""}`;
    }

    // Extract text from shapes
    let title = "";
    const body: string[] = [];
    const shapes = byLocalName(doc, "sp");

    for (const sp of shapes) {
      const ph = byLocalName(sp, "ph")[0];
      const phType = ph?.getAttribute("type") || "";

      const texts = byLocalName(sp, "t")
        .map(t => t.textContent?.trim())
        .filter(Boolean);

      if (!texts.length) continue;
      const joined = texts.join(" ");

      if (phType === "title" || phType === "ctrTitle") {
        title = joined;
      } else {
        body.push(joined);
      }
    }

    slides.push({
      index: i,
      title,
      body: body.slice(0, 4),
      bgColor: bgColor || PALETTE[i % PALETTE.length].bg,
      hasContent: !!(title || body.length),
    });
  }

  return slides.length > 0 ? slides : [];
}

// ── Single Slide Renderer ─────────────────────────────────────────────────────
// Uses absolute inset-0 so it always fills its positioned parent
function SlideCard({
  slide, pres, deckIdx,
}: {
  slide: SlideData; pres: Presentation; deckIdx: number;
}) {
  const palette = PALETTE[deckIdx % PALETTE.length];
  const bg = slide.bgColor || palette.bg;
  const isLight = /^#[ef][ef]/i.test(bg) || bg.toLowerCase() === "#ffffff";
  const textColor = isLight ? "#111" : "#fff";
  const subColor = isLight ? "#555" : "rgba(255,255,255,0.72)";

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden select-none px-10"
      style={{ background: bg }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.18)" }}>
        <Layers className="w-4 h-4" style={{ color: isLight ? "#333" : "#fff" }} />
      </div>
      {slide.title ? (
        <h2
          className="font-bold text-center leading-tight mb-2 flex-shrink-0"
          style={{ color: textColor, fontSize: "clamp(0.75rem, 3cqw, 2rem)", maxWidth: "80%" }}
        >
          {slide.title}
        </h2>
      ) : (
        <h2
          className="font-bold text-center leading-tight mb-2 flex-shrink-0"
          style={{ color: subColor, fontSize: "clamp(0.7rem, 2.5cqw, 1.6rem)", maxWidth: "80%" }}
        >
          {pres.presentation_name || pres.name}
        </h2>
      )}
      {slide.body.slice(0, 3).map((line, li) => (
        <p
          key={li}
          className="text-center leading-snug mb-1 flex-shrink-0"
          style={{ color: subColor, fontSize: "clamp(0.55rem, 1.8cqw, 1.1rem)", maxWidth: "85%" }}
        >
          {line}
        </p>
      ))}
      {!slide.hasContent && (
        <p className="flex-shrink-0" style={{ color: subColor, fontSize: "clamp(0.5rem, 1.5cqw, 0.85rem)", marginTop: "0.25em" }}>
          Slide {slide.index + 1}
        </p>
      )}
    </div>
  );
}

// ── PDF single-page preview ───────────────────────────────────────────────────
function PdfSlidePreview({ src, page, onNumPages }: {
  src: string; page: number; onNumPages?: (n: number) => void;
}) {
  const [err, setErr] = useState(false);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white overflow-hidden">
      {err ? (
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <FileText className="w-8 h-8 opacity-40" />
          <p className="text-xs">Unable to render PDF</p>
        </div>
      ) : (
        <Document
          file={src}
          onLoadSuccess={({ numPages }) => onNumPages?.(numPages)}
          onLoadError={() => setErr(true)}
          loading={<Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
        >
          <Page
            pageNumber={page}
            height={320}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      )}
    </div>
  );
}

// ── PDF fullscreen presenter ───────────────────────────────────────────────────
function PdfPresentModal({ src, numPages, pres, onClose }: {
  src: string; numPages: number; pres: Presentation; onClose: () => void;
}) {
  const [current, setCurrent] = useState(1);
  const [autoPlay, setAutoPlay] = useState(false);
  const [intervalSecs, setIntervalSecs] = useState(5);
  const [progress, setProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setCurrent(c => c < numPages ? c + 1 : 1);
    setProgress(0);
  }, [numPages]);
  const prev = useCallback(() => {
    setCurrent(c => c > 1 ? c - 1 : numPages);
    setProgress(0);
  }, [numPages]);

  useEffect(() => {
    if (!autoPlay) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(0);
      return;
    }
    setProgress(0);
    const step = 100 / (intervalSecs * 20);
    progressRef.current = setInterval(() => setProgress(p => Math.min(p + step, 100)), 50);
    timerRef.current = setInterval(() => { setCurrent(c => c < numPages ? c + 1 : 1); setProgress(0); }, intervalSecs * 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [autoPlay, intervalSecs, numPages]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, next, prev]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-950/90 border-b border-gray-800 flex-shrink-0">
        <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">
          <X className="w-4 h-4" /> Exit
        </button>
        <div className="h-4 w-px bg-gray-700" />
        <p className="flex-1 text-sm font-semibold text-white truncate">{pres.presentation_name || pres.name}</p>
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
          <button onClick={() => setAutoPlay(false)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!autoPlay ? "bg-white text-gray-900" : "text-gray-400 hover:text-white"}`}>Manual</button>
          <button onClick={() => setAutoPlay(true)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${autoPlay ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}><Play className="w-3 h-3" /> Auto Play</button>
        </div>
        {autoPlay && (
          <div className="relative">
            <button onClick={() => setShowSettings(s => !s)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-700">
              <Clock className="w-3.5 h-3.5" /> {intervalSecs}s
            </button>
            {showSettings && (
              <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-xl p-3 z-10 shadow-xl min-w-36">
                <p className="text-xs text-gray-400 mb-2">Slide duration</p>
                {[3, 5, 10, 15, 30].map(s => (
                  <button key={s} onClick={() => { setIntervalSecs(s); setShowSettings(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors ${intervalSecs === s ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"}`}
                  >{s} seconds</button>
                ))}
              </div>
            )}
          </div>
        )}
        <span className="text-xs text-gray-400 tabular-nums">{current} / {numPages}</span>
      </div>
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        <PdfSlidePreview src={src} page={current} />
        <button onClick={prev} disabled={current <= 1 && !autoPlay} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={next} disabled={current >= numPages && !autoPlay} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      {autoPlay && (
        <div className="h-1 bg-gray-800 flex-shrink-0">
          <div className="h-full bg-blue-500" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="flex items-center justify-center gap-1.5 py-3 bg-gray-950/90 flex-shrink-0">
        {Array.from({ length: numPages }, (_, i) => (
          <button key={i} onClick={() => { setCurrent(i + 1); setProgress(0); }}
            className={`rounded-full transition-all ${i + 1 === current ? "w-5 h-2 bg-blue-500" : "w-2 h-2 bg-gray-600 hover:bg-gray-400"}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Present Modal ─────────────────────────────────────────────────────────────
function PresentModal({
  slides, pres, deckIdx, onClose,
}: {
  slides: SlideData[]; pres: Presentation; deckIdx: number; onClose: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [interval, setIntervalSecs] = useState(5);
  const [progress, setProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = slides.length;

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % total);
    setProgress(0);
  }, [total]);

  const prev = useCallback(() => {
    setCurrent(c => (c - 1 + total) % total);
    setProgress(0);
  }, [total]);

  // Auto-play logic
  useEffect(() => {
    if (!autoPlay) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(0);
      return;
    }
    setProgress(0);
    const step = 100 / (interval * 20);
    progressRef.current = setInterval(() => {
      setProgress(p => Math.min(p + step, 100));
    }, 50);
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % total);
      setProgress(0);
    }, interval * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [autoPlay, interval, total]);

  // Keyboard nav
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, next, prev]);

  const slide = slides[current];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Top controls */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-950/90 backdrop-blur border-b border-gray-800 flex-shrink-0">
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">
          <X className="w-4 h-4" /> Exit
        </button>
        <div className="h-4 w-px bg-gray-700" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{pres.presentation_name || pres.name}</p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setAutoPlay(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              !autoPlay ? "bg-white text-gray-900" : "text-gray-400 hover:text-white"
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setAutoPlay(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              autoPlay ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Play className="w-3 h-3" /> Auto Play
          </button>
        </div>

        {/* Auto-play settings */}
        {autoPlay && (
          <div className="relative">
            <button
              onClick={() => setShowSettings(s => !s)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" /> {interval}s
            </button>
            {showSettings && (
              <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-xl p-3 z-10 shadow-xl min-w-36">
                <p className="text-xs text-gray-400 mb-2">Slide duration</p>
                {[3, 5, 10, 15, 30].map(s => (
                  <button key={s} onClick={() => { setIntervalSecs(s); setShowSettings(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                      interval === s ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {s} seconds
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Slide counter */}
        <span className="text-xs text-gray-400 tabular-nums">{current + 1} / {total}</span>
      </div>

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        {slide && <SlideCard slide={slide} pres={pres} deckIdx={deckIdx} />}

        {/* Side navigation arrows */}
        <button
          onClick={prev}
          disabled={current === 0 && !autoPlay}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all disabled:opacity-20 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={next}
          disabled={current === total - 1 && !autoPlay}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all disabled:opacity-20 disabled:pointer-events-none"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Auto-play progress bar */}
      {autoPlay && (
        <div className="h-1 bg-gray-800 flex-shrink-0">
          <div
            className="h-full bg-blue-500 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Bottom: slide dots */}
      <div className="flex items-center justify-center gap-1.5 py-3 bg-gray-950/90 flex-shrink-0">
        {slides.map((_, i) => (
          <button key={i} onClick={() => { setCurrent(i); setProgress(0); }}
            className={`rounded-full transition-all ${
              i === current ? "w-5 h-2 bg-blue-500" : "w-2 h-2 bg-gray-600 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Deck List Item ────────────────────────────────────────────────────────────
function DeckListItem({
  pres, index, active, numSlides, onClick,
}: { pres: Presentation; index: number; active: boolean; numSlides: number; onClick: () => void }) {
  const MOCK_VIEWS = [24, 67, 142, 89];
  const views = MOCK_VIEWS[index % MOCK_VIEWS.length];
  const date = pres.modified ? formatDate(pres.modified) : "—";
  const palette = PALETTE[index % PALETTE.length];

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
        active ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: active ? "#dbeafe" : `${palette.bg}22` }}
        >
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
        <Eye className="w-3 h-3" />
        <span>{views}</span>
      </div>
    </button>
  );
}

// ── Hook: load + parse PPTX slides ────────────────────────────────────────────
function usePptxSlides(fileUrl: string | null, ext: string) {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileUrl || (ext !== "pptx" && ext !== "ppt")) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSlides([]);
    parsePptx(proxyUrl(fileUrl))
      .then(s => { if (!cancelled) { setSlides(s); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [fileUrl, ext]);

  return { slides, loading, error };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PresentationPage() {
  const [records, setRecords] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [pdfNumPages, setPdfNumPages] = useState(1);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/presentations`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecords(Array.isArray(data) ? data : []);
      setActiveIdx(0);
      setActiveSlide(0);
    } catch (e: any) {
      setError(e.message || "Failed to load presentations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const active = records[activeIdx] ?? null;
  const activeExt = active?.file_upload ? fileExt(active.file_upload) : "";
  const isPptx = activeExt === "pptx" || activeExt === "ppt";
  const isPdf = activeExt === "pdf";

  const { slides, loading: slidesLoading } = usePptxSlides(active?.file_upload ?? null, activeExt);

  const numSlides = isPdf ? pdfNumPages : (slides.length || 1);
  const currentSlide = slides[activeSlide] ?? null;

  const handleSelectDeck = (i: number) => {
    setActiveIdx(i);
    setActiveSlide(0);
    setPdfNumPages(1);
  };

  return (
    <>
      {presenting && isPdf && active?.file_upload && (
        <PdfPresentModal
          src={proxyUrl(active.file_upload)}
          numPages={pdfNumPages}
          pres={active}
          onClose={() => setPresenting(false)}
        />
      )}
      {presenting && isPptx && slides.length > 0 && (
        <PresentModal
          slides={slides}
          pres={active!}
          deckIdx={activeIdx}
          onClose={() => setPresenting(false)}
        />
      )}

      <Layout>
        <div className="p-6 space-y-6 max-w-7xl">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Presentations</h1>
              <p className="text-sm text-gray-500 mt-0.5">Create and manage slide decks</p>
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
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">

                  {/* Deck header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-gray-900 truncate">
                        {active?.presentation_name || active?.name}
                      </h2>
                      {active?.project_name && (
                        <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">
                          {active.project_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <button
                        onClick={() => { setActiveSlide(0); setPresenting(true); }}
                        disabled={(!isPptx && !isPdf) || (isPptx && (slidesLoading || slides.length === 0))}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold shadow transition-colors"
                      >
                        {slidesLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-white" />
                        )}
                        Present
                      </button>
                      <button className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Main slide preview */}
                  <div className="w-full aspect-video rounded-xl overflow-hidden bg-gray-100 relative">
                    {slidesLoading ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        <p className="text-xs text-gray-400">Loading slides…</p>
                      </div>
                    ) : isPdf && active?.file_upload ? (
                      <PdfSlidePreview src={proxyUrl(active.file_upload)} page={activeSlide + 1} onNumPages={setPdfNumPages} />
                    ) : currentSlide ? (
                      <SlideCard slide={currentSlide} pres={active!} deckIdx={activeIdx} />
                    ) : active ? (
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center text-white p-8"
                        style={{ background: PALETTE[activeIdx % PALETTE.length].bg }}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
                          <Layers className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-xs font-semibold text-white/60 mb-1 uppercase tracking-widest">
                          {active.project_name || "Presentation"}
                        </p>
                        <h2 className="text-xl font-bold text-center">{active.presentation_name || active.name}</h2>
                      </div>
                    ) : null}
                  </div>

                  {/* Slide counter dots + arrows */}
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
                      disabled={activeIdx === 0}
                      className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1.5">
                      {records.map((_, i) => (
                        <button key={i} onClick={() => handleSelectDeck(i)}
                          className={`rounded-full transition-all ${
                            i === activeIdx ? "w-5 h-2 bg-blue-600" : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setActiveIdx(i => Math.min(records.length - 1, i + 1))}
                      disabled={activeIdx === records.length - 1}
                      className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ALL SLIDES thumbnails */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    All Slides
                    {slidesLoading && <Loader2 className="inline w-3 h-3 ml-1.5 animate-spin text-gray-300" />}
                  </p>
                  {isPdf && active?.file_upload ? (
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: pdfNumPages }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveSlide(i)}
                          className={`aspect-video rounded-lg overflow-hidden relative bg-white border transition-all ${
                            i === activeSlide ? "ring-2 ring-blue-500 ring-offset-2" : "opacity-70 hover:opacity-100"
                          }`}
                        >
                          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                            <Document file={proxyUrl(active.file_upload)} loading="">
                              <Page pageNumber={i + 1} height={80} renderTextLayer={false} renderAnnotationLayer={false} />
                            </Document>
                          </div>
                          <span className="absolute bottom-1 right-1.5 text-[10px] font-bold bg-black/40 text-white rounded px-1">{i + 1}</span>
                        </button>
                      ))}
                    </div>
                  ) : slidesLoading ? (
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="aspect-video rounded-lg bg-gray-100 animate-pulse" />
                      ))}
                    </div>
                  ) : slides.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {slides.map((slide, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveSlide(i)}
                          className={`aspect-video rounded-lg overflow-hidden relative transition-all ${
                            i === activeSlide ? "ring-2 ring-blue-500 ring-offset-2" : "opacity-70 hover:opacity-100"
                          }`}
                        >
                          <SlideCard slide={slide} pres={active!} deckIdx={activeIdx} />
                          <span className="absolute bottom-1 right-1.5 text-[10px] font-bold text-white/80 drop-shadow">{i + 1}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: numSlides }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveSlide(i)}
                          className={`aspect-video rounded-lg flex items-center justify-center transition-all ${
                            i === activeSlide ? "ring-2 ring-blue-500 ring-offset-2" : "opacity-60 hover:opacity-90"
                          }`}
                          style={{ background: PALETTE[(activeIdx + i) % PALETTE.length].bg }}
                        >
                          <span className="text-white font-bold text-sm">{i + 1}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right panel: All Decks ── */}
              <div className="lg:col-span-5">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm h-full">
                  <h3 className="font-semibold text-gray-900 mb-4">All Decks</h3>
                  <div className="space-y-1">
                    {records.map((r, i) => (
                      <DeckListItem
                        key={r.name}
                        pres={r}
                        index={i}
                        active={i === activeIdx}
                        numSlides={i === activeIdx ? numSlides : 1}
                        onClick={() => handleSelectDeck(i)}
                      />
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
