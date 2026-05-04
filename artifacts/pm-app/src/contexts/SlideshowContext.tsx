import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { Play, Pause, Square, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export const SLIDESHOW_PATHS = [
  "/purchase-dashboard",
  "/stores-dashboard",
  "/logistics-dashboard",
  "/process-proposal",
  "/finance-dashboard",
  "/hrms/analytics",
  "/hrms/task-summary",
];

export const SLIDESHOW_LABELS = [
  "Purchase Dashboard",
  "Stores Dashboard",
  "Logistics Dashboard",
  "Process & Proposal",
  "Finance Dashboard",
  "HR Analytics",
  "Task Summary",
];

interface SlideshowCtx {
  ssActive: boolean;
  ssPaused: boolean;
  ssIdx: number;
  ssInterval: number;
  showSsSettings: boolean;
  startSlideshow: () => void;
  stopSlideshow: () => void;
  setSsPaused: (v: boolean) => void;
  prevSlide: () => void;
  nextSlide: () => void;
  setSsInterval: (v: number) => void;
  setShowSsSettings: (v: boolean) => void;
}

const SlideshowContext = createContext<SlideshowCtx | null>(null);

export function useSlideshowContext(): SlideshowCtx {
  const ctx = useContext(SlideshowContext);
  return ctx ?? {
    ssActive: false, ssPaused: false, ssIdx: 0, ssInterval: 10, showSsSettings: false,
    startSlideshow: () => {}, stopSlideshow: () => {}, setSsPaused: () => {},
    prevSlide: () => {}, nextSlide: () => {}, setSsInterval: () => {}, setShowSsSettings: () => {},
  };
}

function SlideshowBar({ active, paused, idx, intervalSecs, onPause, onResume, onStop, onPrev, onNext, showSettings, setShowSettings, setIntervalSecs }: {
  active: boolean; paused: boolean; idx: number; intervalSecs: number;
  onPause: () => void; onResume: () => void; onStop: () => void;
  onPrev: () => void; onNext: () => void;
  showSettings: boolean; setShowSettings: (v: boolean) => void;
  setIntervalSecs: (v: number) => void;
}) {
  const [countdown, setCountdown] = useState(intervalSecs);
  const total = SLIDESHOW_PATHS.length;

  useEffect(() => {
    if (!active || paused) { setCountdown(intervalSecs); return; }
    setCountdown(intervalSecs);
    const tick = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? intervalSecs : prev - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [active, paused, idx, intervalSecs]);

  if (!active) return null;

  const pct = ((intervalSecs - countdown) / intervalSecs) * 100;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-auto">
      {showSettings && (
        <div className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 shadow-2xl flex flex-col gap-2 min-w-[220px]">
          <span className="text-white/70 text-[11px] font-bold uppercase tracking-wider">Switch Interval</span>
          <div className="flex gap-2">
            {[5, 10, 15, 30].map(s => (
              <button key={s} onClick={() => setIntervalSecs(s)}
                className={cn("flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer",
                  intervalSecs === s ? "bg-indigo-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/20")}>
                {s}s
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="relative bg-slate-900/95 border border-white/10 rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-md flex items-center gap-3 overflow-hidden">
        <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-500/60 transition-all duration-1000"
          style={{ width: `${pct}%` }} />

        <span className="text-white/40 text-[10px] font-bold tabular-nums">{idx + 1}/{total}</span>

        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={cn("rounded-full transition-all duration-300",
              i === idx ? "w-4 h-1.5 bg-indigo-400" : "w-1.5 h-1.5 bg-white/20")} />
          ))}
        </div>

        <span className="text-white/80 text-xs font-semibold max-w-[140px] truncate">
          {SLIDESHOW_LABELS[idx]}
        </span>

        <div className="flex items-center gap-1">
          <button onClick={onPrev}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer border-0 bg-transparent">
            <ChevronLeft style={{ width: 14, height: 14 }} />
          </button>
          <button onClick={paused ? onResume : onPause}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white hover:bg-white/10 transition-all cursor-pointer border-0 bg-transparent">
            {paused
              ? <Play style={{ width: 13, height: 13 }} />
              : <Pause style={{ width: 13, height: 13 }} />
            }
          </button>
          <button onClick={onNext}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer border-0 bg-transparent">
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
          <button onClick={onStop}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer border-0 bg-transparent">
            <Square style={{ width: 11, height: 11 }} />
          </button>
          <button onClick={() => setShowSettings(!showSettings)}
            className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border-0 bg-transparent",
              showSettings ? "text-indigo-400 bg-indigo-500/15" : "text-white/40 hover:text-white hover:bg-white/10")}>
            <Settings style={{ width: 13, height: 13 }} />
          </button>
        </div>

        {!paused && (
          <span className="text-white/30 text-[10px] font-mono tabular-nums">{countdown}s</span>
        )}
      </div>
    </div>
  );
}

export function SlideshowProvider({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const [ssActive, setSsActive]   = useState(false);
  const [ssPaused, setSsPaused]   = useState(false);
  const [ssIdx, setSsIdx]         = useState(0);
  const [ssInterval, setSsInterval] = useState(10);
  const [showSsSettings, setShowSsSettings] = useState(false);

  const collapseSidebar = (collapsed: boolean) => {
    try { localStorage.setItem("fm_sidebar_collapsed", String(collapsed)); } catch {}
    window.dispatchEvent(new CustomEvent("fm_sidebar_change", { detail: { collapsed } }));
  };

  const startSlideshow = () => {
    setSsIdx(0);
    setSsActive(true);
    setSsPaused(false);
    collapseSidebar(true);
  };

  const stopSlideshow = () => {
    setSsActive(false);
    setSsPaused(false);
    setSsIdx(0);
    setShowSsSettings(false);
    collapseSidebar(false);
  };

  const prevSlide = () => setSsIdx(i => (i - 1 + SLIDESHOW_PATHS.length) % SLIDESHOW_PATHS.length);
  const nextSlide = () => setSsIdx(i => (i + 1) % SLIDESHOW_PATHS.length);

  useEffect(() => {
    if (!ssActive) return;
    navigate(SLIDESHOW_PATHS[ssIdx]);
  }, [ssIdx, ssActive]);

  useEffect(() => {
    if (!ssActive || ssPaused) return;
    const timer = setInterval(() => {
      setSsIdx(i => (i + 1) % SLIDESHOW_PATHS.length);
    }, ssInterval * 1000);
    return () => clearInterval(timer);
  }, [ssActive, ssPaused, ssInterval]);

  return (
    <SlideshowContext.Provider value={{
      ssActive, ssPaused, ssIdx, ssInterval, showSsSettings,
      startSlideshow, stopSlideshow, setSsPaused, prevSlide, nextSlide,
      setSsInterval, setShowSsSettings,
    }}>
      {children}
      <SlideshowBar
        active={ssActive}
        paused={ssPaused}
        idx={ssIdx}
        intervalSecs={ssInterval}
        onPause={() => setSsPaused(true)}
        onResume={() => setSsPaused(false)}
        onStop={stopSlideshow}
        onPrev={prevSlide}
        onNext={nextSlide}
        showSettings={showSsSettings}
        setShowSettings={setShowSsSettings}
        setIntervalSecs={setSsInterval}
      />
    </SlideshowContext.Provider>
  );
}
