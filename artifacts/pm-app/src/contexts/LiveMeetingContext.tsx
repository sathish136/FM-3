import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";

interface GlobalLive {
  isRecording: boolean;
  isPaused: boolean;
  startTime: number | null;
  title: string;
  blocks: any[];
  stream: MediaStream | null;
  ws: WebSocket | null;
  onSegment: ((text: string) => void) | null;
}

declare global {
  interface Window { _fm_live: GlobalLive; }
}

function glive(): GlobalLive {
  if (!window._fm_live) {
    window._fm_live = {
      isRecording: false, isPaused: false, startTime: null, title: "",
      blocks: [], stream: null, ws: null, onSegment: null,
    };
  }
  return window._fm_live;
}

export function getGlobalLive(): GlobalLive { return glive(); }

interface LiveMeetingCtxValue {
  isLiveRecording: boolean;
  isLivePaused: boolean;
  liveDuration: number;
  liveBlockCount: number;
  liveTitle: string;
  notifyStarted: (title: string, pauseFn: () => void, resumeFn: () => void, stopFn: () => void) => void;
  notifyPaused: () => void;
  notifyResumed: () => void;
  notifyStopped: () => void;
  notifyBlock: (count: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

let _livePause: (() => void) | null = null;
let _liveResume: (() => void) | null = null;
let _liveStop: (() => void) | null = null;

const LiveMeetingCtx = createContext<LiveMeetingCtxValue | null>(null);

export function LiveMeetingProvider({ children }: { children: ReactNode }) {
  glive();
  const [isLiveRecording, setIsLiveRecording] = useState(() => !!window._fm_live?.isRecording);
  const [isLivePaused, setIsLivePaused] = useState(() => !!window._fm_live?.isPaused);
  const [liveBlockCount, setLiveBlockCount] = useState(() => window._fm_live?.blocks?.length ?? 0);
  const [liveDuration, setLiveDuration] = useState(0);
  const [liveTitle, setLiveTitle] = useState(() => window._fm_live?.title ?? "");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLiveRecording && !isLivePaused) {
      timerRef.current = setInterval(() => {
        const st = window._fm_live?.startTime;
        if (st) setLiveDuration(Math.floor((Date.now() - st) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [isLiveRecording, isLivePaused]);

  const notifyStarted = useCallback((title: string, pauseFn: () => void, resumeFn: () => void, stopFn: () => void) => {
    const g = glive();
    g.isRecording = true; g.isPaused = false;
    if (!g.startTime) g.startTime = Date.now();
    g.title = title;
    _livePause = pauseFn; _liveResume = resumeFn; _liveStop = stopFn;
    setIsLiveRecording(true); setIsLivePaused(false);
    setLiveTitle(title); setLiveBlockCount(g.blocks.length);
  }, []);

  const notifyPaused = useCallback(() => {
    glive().isPaused = true; setIsLivePaused(true);
  }, []);

  const notifyResumed = useCallback(() => {
    glive().isPaused = false; setIsLivePaused(false);
  }, []);

  const notifyStopped = useCallback(() => {
    const g = glive();
    g.isRecording = false; g.isPaused = false; g.startTime = null;
    g.title = ""; g.blocks = []; g.stream = null; g.ws = null; g.onSegment = null;
    _livePause = null; _liveResume = null; _liveStop = null;
    setIsLiveRecording(false); setIsLivePaused(false);
    setLiveDuration(0); setLiveTitle(""); setLiveBlockCount(0);
  }, []);

  const notifyBlock = useCallback((count: number) => {
    setLiveBlockCount(count);
  }, []);

  const pause = useCallback(() => { _livePause?.(); }, []);
  const resume = useCallback(() => { _liveResume?.(); }, []);
  const stop = useCallback(() => { _liveStop?.(); }, []);

  return (
    <LiveMeetingCtx.Provider value={{
      isLiveRecording, isLivePaused, liveDuration, liveBlockCount, liveTitle,
      notifyStarted, notifyPaused, notifyResumed, notifyStopped, notifyBlock,
      pause, resume, stop,
    }}>
      {children}
    </LiveMeetingCtx.Provider>
  );
}

export function useLiveMeeting(): LiveMeetingCtxValue {
  const ctx = useContext(LiveMeetingCtx);
  if (!ctx) throw new Error("useLiveMeeting must be used within LiveMeetingProvider");
  return ctx;
}
