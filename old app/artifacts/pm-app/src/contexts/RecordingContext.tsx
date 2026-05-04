import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";

// Global state stored on `window` — survives Vite HMR module replacement
interface GlobalRec {
  recorder: MediaRecorder | null;
  stream: MediaStream | null;
  chunks: Blob[];
  mime: string;
  meetingId: number | null;
  startTime: number | null;
}

declare global {
  interface Window { _fm_rec: GlobalRec; }
}

function g(): GlobalRec {
  if (!window._fm_rec) {
    window._fm_rec = { recorder: null, stream: null, chunks: [], mime: "audio/webm", meetingId: null, startTime: null };
  }
  return window._fm_rec;
}

export function getGlobalRec(): GlobalRec { return g(); }

interface RecordingContextValue {
  isRecording: boolean;
  currentMeetingId: number | null;
  duration: number;
  startRecording: (meetingId: number) => Promise<{ stream: MediaStream; mime: string } | null>;
  stopAndGetBlob: () => Promise<{ blob: Blob; mime: string } | null>;
  cancelRecording: () => void;
}

const RecordingCtx = createContext<RecordingContextValue | null>(null);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const state = g();

  const [isRecording, setIsRecording] = useState(() => state.recorder?.state === "recording");
  const [currentMeetingId, setCurrentMeetingId] = useState<number | null>(() => state.meetingId);
  const [duration, setDuration] = useState(() =>
    state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // On mount — reconnect timer if a recording was already active (e.g. after HMR)
  useEffect(() => {
    const state = g();
    if (state.recorder?.state === "recording" && state.startTime) {
      setIsRecording(true);
      setCurrentMeetingId(state.meetingId);
      setDuration(Math.floor((Date.now() - state.startTime) / 1000));
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - (g().startTime ?? Date.now())) / 1000));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startRecording = useCallback(async (meetingId: number): Promise<{ stream: MediaStream; mime: string } | null> => {
    const state = g();
    // Already recording for this exact meeting — just return existing stream
    if (state.recorder?.state === "recording" && state.meetingId === meetingId && state.stream) {
      return { stream: state.stream, mime: state.mime };
    }
    // Cancel any other active recording first
    if (state.recorder && state.recorder.state !== "inactive") {
      try { state.recorder.stop(); } catch {}
    }
    if (state.stream) { state.stream.getTracks().forEach(t => t.stop()); state.stream = null; }
    state.chunks = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus") ? "audio/ogg;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg") ? "audio/ogg"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) g().chunks.push(e.data); };
      recorder.start(250);

      state.recorder = recorder;
      state.stream = stream;
      state.mime = mimeType || "audio/webm";
      state.meetingId = meetingId;
      state.startTime = Date.now();

      setIsRecording(true);
      setCurrentMeetingId(meetingId);
      setDuration(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - (g().startTime ?? Date.now())) / 1000));
      }, 1000);

      return { stream, mime: state.mime };
    } catch {
      return null;
    }
  }, []);

  const stopAndGetBlob = useCallback(async (): Promise<{ blob: Blob; mime: string } | null> => {
    const state = g();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    await new Promise<void>(resolve => {
      if (!state.recorder || state.recorder.state === "inactive") { resolve(); return; }
      state.recorder.onstop = () => resolve();
      state.recorder.stop();
    });

    if (state.stream) { state.stream.getTracks().forEach(t => t.stop()); state.stream = null; }

    const chunks = [...state.chunks];
    const mime = state.mime;

    state.recorder = null;
    state.chunks = [];
    state.meetingId = null;
    state.startTime = null;

    setIsRecording(false);
    setCurrentMeetingId(null);
    setDuration(0);

    if (chunks.length === 0) return null;
    return { blob: new Blob(chunks, { type: mime }), mime };
  }, []);

  const cancelRecording = useCallback(() => {
    const state = g();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (state.recorder && state.recorder.state !== "inactive") { try { state.recorder.stop(); } catch {} }
    if (state.stream) { state.stream.getTracks().forEach(t => t.stop()); state.stream = null; }
    state.recorder = null;
    state.chunks = [];
    state.meetingId = null;
    state.startTime = null;
    setIsRecording(false);
    setCurrentMeetingId(null);
    setDuration(0);
  }, []);

  return (
    <RecordingCtx.Provider value={{ isRecording, currentMeetingId, duration, startRecording, stopAndGetBlob, cancelRecording }}>
      {children}
    </RecordingCtx.Provider>
  );
}

export function useRecording(): RecordingContextValue {
  const ctx = useContext(RecordingCtx);
  if (!ctx) throw new Error("useRecording must be used within RecordingProvider");
  return ctx;
}
