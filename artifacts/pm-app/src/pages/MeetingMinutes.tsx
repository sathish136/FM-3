import { Layout } from "@/components/Layout";
import {
  FileText, Plus, Trash2, Sparkles, Calendar, Users,
  X, Save, Loader2, CheckCircle, Clock, Mic,
  Square, Type, Radio, MapPin, Search, FolderOpen,
  Printer, MessageSquare, Mail, ChevronDown, Globe,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRecording, getGlobalRec } from "@/contexts/RecordingContext";
import { useListProjects } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";

type Meeting = {
  id: number; title: string; projectId: number | null;
  attendees: string | null; venue: string | null; date: string; rawNotes: string | null;
  aiSummary: string | null; actionItems: string | null;
  status: string; mode?: string; audioData?: string | null; createdAt: string;
};

const BASE = "/api";

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, opts);
  if (!r.ok && r.status !== 204) throw new Error(await r.text());
  return r;
}

function ModeBadge({ mode }: { mode: string }) {
  if (mode === "record") return <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-bold tracking-wide text-red-600 bg-red-50 border border-red-200"><Mic className="w-2 h-2" />REC</span>;
  if (mode === "speech") return <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-bold tracking-wide text-teal-600 bg-teal-50 border border-teal-200"><Globe className="w-2 h-2" />SPEECH</span>;
  return <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-bold tracking-wide text-blue-600 bg-blue-50 border border-blue-200"><Type className="w-2 h-2" />MANUAL</span>;
}

function StatusBadge({ status }: { status: string }) {
  return status === "completed"
    ? <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-bold text-green-700 bg-green-50 border border-green-200"><CheckCircle className="w-2 h-2" />Done</span>
    : <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200"><Clock className="w-2 h-2" />Draft</span>;
}

function MarkdownBlock({ text }: { text: string }) {
  return (
    <div className="text-sm text-gray-700 space-y-0.5">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## ")) return <p key={i} className="font-bold text-gray-900 mt-3 mb-1 text-sm">{line.slice(3)}</p>;
        if (line.startsWith("- [ ] ") || line.startsWith("- [x] ")) {
          const done = line.startsWith("- [x]");
          return (
            <p key={i} className="pl-3 flex items-start gap-2">
              <span className={`mt-0.5 w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[9px] ${done ? "bg-green-500 border-green-500 text-white" : "border-gray-300"}`}>{done && "✓"}</span>
              <span>{line.slice(6)}</span>
            </p>
          );
        }
        if (line.startsWith("- ")) return <p key={i} className="pl-3 flex items-start gap-1.5"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" /><span>{line.slice(2)}</span></p>;
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

// ─── Streaming AI helper ────────────────────────────────────────────────────
async function streamGenerate(
  id: number,
  onChunk: (text: string) => void,
  onDone: (meeting: Meeting) => void,
) {
  const res = await fetch(`${BASE}/meeting-minutes/${id}/generate`, { method: "POST" });
  if (!res.body) return;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n"); buf = parts.pop() || "";
    for (const p of parts) {
      if (!p.startsWith("data: ")) continue;
      try {
        const j = JSON.parse(p.slice(6));
        if (j.content) { full += j.content; onChunk(full); }
        if (j.done) {
          const refreshed = await apiFetch(`/meeting-minutes/${id}`).then(r => r.json());
          onDone(refreshed);
        }
      } catch {}
    }
  }
}

// ─── Recording Mode ─────────────────────────────────────────────────────────
type RecordPhase = "idle" | "recording" | "transcribing" | "generating" | "done" | "error";
const BAR_COUNT = 30;

function RecordingView({ meeting, onUpdate, autoStart }: { meeting: Meeting; onUpdate: (m: Meeting) => void; autoStart?: boolean }) {
  const rec = useRecording();
  const [phase, setPhase] = useState<RecordPhase>(meeting.aiSummary ? "done" : "idle");
  const [micError, setMicError] = useState("");
  const [streamText, setStreamText] = useState("");
  const [transcript, setTranscript] = useState(meeting.rawNotes || "");
  const [waveData, setWaveData] = useState<number[]>(new Array(BAR_COUNT).fill(0));
  const [liveText, setLiveText] = useState("");
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const phaseRef = useRef<RecordPhase>(meeting.aiSummary ? "done" : "idle");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const liveTextRef = useRef("");

  useEffect(() => {
    setTranscript(meeting.rawNotes || "");
    const newPhase: RecordPhase = meeting.aiSummary ? "done" : "idle";
    setPhase(newPhase);
    phaseRef.current = newPhase;
  }, [meeting.id]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => { if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl); };
  }, [audioBlobUrl]);

  // HMR / navigation recovery: if a recording is already active for this meeting, reconnect visuals
  useEffect(() => {
    const g = getGlobalRec();
    if (rec.isRecording && rec.currentMeetingId === meeting.id && g.stream) {
      const p: RecordPhase = "recording";
      setPhase(p); phaseRef.current = p;
      startWaveform(g.stream);
      startSpeechRecognition();
    }
    // On unmount: stop waveform/speech but keep the MediaRecorder alive in global state
    return () => {
      stopWaveform();
      stopSpeechRecognition();
    };
  }, [meeting.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const startWaveform = (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256; // must be power of 2; gives 128 time-domain samples
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const step = Math.floor(analyser.fftSize / BAR_COUNT);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        const bars: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          const v = data[i * step] ?? 128;
          bars.push(Math.abs((v - 128) / 128)); // 0 = silence, 1 = max amplitude
        }
        setWaveData(bars);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } catch {}
  };

  const stopWaveform = () => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    setWaveData(new Array(BAR_COUNT).fill(0));
  };

  // Tracks per-language live text from three parallel recognition instances
  const langTextsRef = useRef<Record<string, string>>({ "ta-IN": "", "hi-IN": "", "en-IN": "" });
  const recognitionsRef = useRef<any[]>([]);

  const startSpeechRecognition = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const langs = ["ta-IN", "hi-IN", "en-IN"];
    recognitionsRef.current = [];
    langs.forEach(lang => {
      try {
        const r = new SR();
        r.continuous = true;
        r.interimResults = true;
        r.lang = lang;
        r.onresult = (e: any) => {
          let text = "";
          for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + " ";
          langTextsRef.current[lang] = text.trim();
          const combined = langs.map(l => langTextsRef.current[l]).filter(Boolean).join(" ").trim();
          liveTextRef.current = combined;
          setLiveText(combined);
        };
        r.onerror = () => {};
        r.onend = () => { try { r.start(); } catch {} }; // auto-restart if it stops
        r.start();
        recognitionsRef.current.push(r);
      } catch {}
    });
  };

  const stopSpeechRecognition = () => {
    recognitionsRef.current.forEach(r => {
      r.onend = null;
      try { r.stop(); } catch {}
    });
    recognitionsRef.current = [];
    langTextsRef.current = { "ta-IN": "", "hi-IN": "", "en-IN": "" };
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  };

  const startRecording = async () => {
    setMicError("");
    setLiveText("");
    liveTextRef.current = "";
    const result = await rec.startRecording(meeting.id);
    if (!result) {
      setMicError("Could not start microphone. Please allow microphone access in your browser.");
      return;
    }
    const { stream } = result;
    const p: RecordPhase = "recording";
    setPhase(p); phaseRef.current = p;
    startWaveform(stream);
    startSpeechRecognition();
  };

  // Auto-start recording when this component mounts with autoStart=true
  useEffect(() => {
    if (autoStart && phaseRef.current === "idle") {
      const t = setTimeout(() => { startRecording(); }, 400);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopAndProcess = async () => {
    stopWaveform();
    stopSpeechRecognition();

    // Stop recorder via global context — collects all chunks (even from background recording)
    const blobResult = await rec.stopAndGetBlob();
    if (!blobResult) {
      setMicError("No audio recorded. Please try again.");
      setPhase("idle"); phaseRef.current = "idle";
      return;
    }
    const { blob, mime: recordMime } = blobResult;

    // Step 1: Transcribe full audio
    setPhase("transcribing"); phaseRef.current = "transcribing";
    try {
      const baseMime = recordMime.split(";")[0].trim();
      const ext = baseMime.includes("ogg") ? "ogg" : "webm";

      // Capture blob URL for in-session playback
      const url = URL.createObjectURL(blob);
      setAudioBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url; });

      const fd = new FormData();
      fd.append("audio", blob, `meeting.${ext}`);

      const tRes = await fetch(`${BASE}/meeting-minutes/${meeting.id}/transcribe`, { method: "POST", body: fd });
      if (!tRes.ok) throw new Error(await tRes.text());
      const tData = await tRes.json();
      let text = tData.transcript?.trim() || "";
      if (!text && liveTextRef.current) text = liveTextRef.current;
      setTranscript(text);
      if (tData.meeting) onUpdate(tData.meeting);

      if (!text) {
        setMicError("No speech detected. Please speak clearly and try again.");
        setPhase("idle");
        return;
      }

      // Step 2: Auto-generate meeting minutes
      setPhase("generating"); phaseRef.current = "generating";
      setStreamText("");
      await streamGenerate(
        tData.meeting?.id ?? meeting.id,
        setStreamText,
        m => { onUpdate(m); setPhase("done"); phaseRef.current = "done"; },
      );
    } catch (e) {
      console.error(e);
      setMicError(`Processing failed: ${e instanceof Error ? e.message : String(e)}`);
      setPhase("error"); phaseRef.current = "error";
    }
  };

  const handleReRecord = () => {
    setPhase("idle"); phaseRef.current = "idle";
    setMicError("");
    setStreamText("");
    setAudioBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
  };

  const handleRegenerate = async () => {
    setPhase("generating");
    setStreamText("");
    await streamGenerate(meeting.id, setStreamText, m => { onUpdate(m); setPhase("done"); });
  };

  const isProcessing = phase === "transcribing" || phase === "generating";

  return (
    <div className="space-y-4">
      {/* Main Recording Card */}
      <div className={`rounded-2xl border-2 p-6 flex flex-col items-center gap-4 transition-all duration-300
        ${phase === "recording" ? "border-red-300 bg-red-50"
        : phase === "transcribing" ? "border-violet-200 bg-violet-50"
        : phase === "generating" ? "border-blue-200 bg-blue-50"
        : phase === "done" ? "border-green-200 bg-green-50"
        : micError ? "border-orange-200 bg-orange-50"
        : "border-gray-200 bg-white"}`}>

        {/* Status label */}
        <div className="flex items-center gap-2 text-sm font-semibold">
          {phase === "idle" && !micError && <><Mic className="w-4 h-4 text-gray-400" /><span className="text-gray-400">Ready to record your meeting</span></>}
          {phase === "recording" && <><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /><span className="text-red-600">Recording — {fmt(rec.duration)}</span></>}
          {phase === "transcribing" && <><Loader2 className="w-4 h-4 text-violet-600 animate-spin" /><span className="text-violet-700">Transcribing your audio…</span></>}
          {phase === "generating" && <><Loader2 className="w-4 h-4 text-blue-600 animate-spin" /><span className="text-blue-700">Generating meeting minutes…</span></>}
          {phase === "done" && <><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-green-700">Meeting minutes ready</span></>}
          {(phase === "error" || micError) && <><span className="text-orange-600 text-center max-w-xs">{micError}</span></>}
        </div>

        {/* Live waveform + real-time transcript */}
        {phase === "recording" && (
          <div className="w-full flex flex-col items-center gap-3">
            {/* Waveform: bars grow from center up & down */}
            <div className="flex items-center gap-[3px] h-16 px-2">
              {waveData.map((v, i) => {
                const amp = Math.max(0.03, v);
                const halfH = Math.round(amp * 28); // half-bar height in px (max 28 → 56px total)
                const bright = 200 + Math.round(v * 55); // intensity: darker when louder
                return (
                  <div key={i} className="flex flex-col items-center justify-center" style={{ height: 64 }}>
                    <div
                      className="rounded-full transition-[height] duration-75"
                      style={{
                        width: 4,
                        height: halfH * 2,
                        background: `rgb(${bright},50,50)`,
                        boxShadow: v > 0.4 ? `0 0 5px rgba(239,68,68,0.5)` : "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>
            {liveText && (
              <div className="w-full max-w-md rounded-lg px-3 py-2 bg-white/80 border border-red-100 text-[11px] text-gray-600 leading-relaxed text-center italic line-clamp-3">
                {liveText}
              </div>
            )}
          </div>
        )}

        {/* Processing steps */}
        {isProcessing && (
          <div className="flex items-center gap-4 text-xs">
            <div className={`flex items-center gap-1.5 ${phase === "transcribing" ? "text-violet-700 font-semibold" : "text-gray-400"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${phase === "transcribing" ? "bg-violet-600 text-white" : "bg-green-500 text-white"}`}>
                {phase === "transcribing" ? "1" : "✓"}
              </div>
              Transcribe
            </div>
            <div className="w-6 h-px bg-gray-200" />
            <div className={`flex items-center gap-1.5 ${phase === "generating" ? "text-blue-700 font-semibold" : "text-gray-400"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${phase === "generating" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"}`}>2</div>
              Analyse
            </div>
            <div className="w-6 h-px bg-gray-200" />
            <div className="flex items-center gap-1.5 text-gray-400">
              <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-400">3</div>
              Minutes
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          {phase === "idle" || phase === "error" ? (
            <button onClick={startRecording}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-sm text-sm transition-colors">
              <Mic className="w-4 h-4" /> Start Recording
            </button>
          ) : phase === "recording" ? (
            <button onClick={stopAndProcess}
              className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-semibold shadow-sm text-sm transition-colors">
              <Square className="w-3.5 h-3.5" /> Stop & Process
            </button>
          ) : phase === "done" ? (
            <>
              <button onClick={handleReRecord}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200">
                <Mic className="w-3.5 h-3.5" /> Record Again
              </button>
              <button onClick={handleRegenerate}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 text-white rounded-xl font-semibold text-sm transition-all shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> Re-analyse
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Audio playback — shown when audio is available */}
      {(audioBlobUrl || meeting.audioData) && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <Mic className="w-3 h-3 text-red-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Recorded Audio</span>
          </div>
          <div className="px-4 py-3">
            <audio
              controls
              src={audioBlobUrl || meeting.audioData || undefined}
              className="w-full h-9"
              style={{ borderRadius: 8 }}
            />
          </div>
        </div>
      )}

      {/* Transcript box — shown after transcribing */}
      {transcript && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <Radio className="w-3 h-3 text-blue-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Full Transcript</span>
            <span className="ml-auto text-[10px] text-gray-400">{transcript.split(/\s+/).filter(Boolean).length} words</span>
          </div>
          <div className="px-4 py-3 max-h-48 overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {transcript}
          </div>
        </div>
      )}

      {/* AI Minutes — streaming + done */}
      {(phase === "generating" || phase === "done") && (meeting.aiSummary || streamText) && (
        <div className="bg-white rounded-2xl border border-violet-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-blue-50 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span className="text-xs font-semibold text-violet-800 uppercase tracking-wide">AI Meeting Minutes</span>
            {phase === "generating" && <Loader2 className="w-3 h-3 text-violet-400 animate-spin ml-auto" />}
          </div>
          <div className="px-4 py-4">
            <MarkdownBlock text={phase === "generating" ? streamText : `${meeting.aiSummary || ""}${meeting.actionItems ? "\n## Action Items\n" + meeting.actionItems : ""}`} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── @Mention hook ───────────────────────────────────────────────────────────
type MentionUser = { id: string; name: string; designation: string; department: string; avatar: string | null };

function useMentionUsers(query: string, active: boolean) {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!active) { setUsers([]); return; }
    setLoading(true);
    fetch(`${BASE}/users/mention?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setUsers([]); setLoading(false); });
  }, [query, active]);
  return { users, loading };
}

function getAtQuery(text: string, cursor: number): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([^\s@]*)$/);
  if (!match) return null;
  return { query: match[1], start: before.lastIndexOf("@") };
}

// ─── Attendees Picker ────────────────────────────────────────────────────────
function UserAvatar({ user, size = "md" }: { user: MentionUser; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-5 h-5 text-[9px]" : "w-7 h-7 text-[10px]";
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden`}>
      {user.avatar
        ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        : user.name.charAt(0).toUpperCase()}
    </div>
  );
}

function AttendeesPicker({ selected, onChange }: { selected: MentionUser[]; onChange: (users: MentionUser[]) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(0);
  const { users, loading } = useMentionUsers(search, open);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredUsers = users.filter(u => !selected.find(s => s.id === u.id));

  const addUser = useCallback((user: MentionUser) => {
    onChange([...selected, user]);
    setSearch("");
    inputRef.current?.focus();
  }, [selected, onChange]);

  const addManual = useCallback(() => {
    const name = search.trim();
    if (!name) return;
    if (selected.find(s => s.name.toLowerCase() === name.toLowerCase())) { setSearch(""); return; }
    const manual: MentionUser = { id: `manual-${Date.now()}`, name, designation: "", department: "", avatar: null };
    onChange([...selected, manual]);
    setSearch("");
    inputRef.current?.focus();
  }, [search, selected, onChange]);

  const removeUser = (id: string) => onChange(selected.filter(s => s.id !== id));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && filteredUsers.length > 0 && filteredUsers[hoverIdx]) { addUser(filteredUsers[hoverIdx]); return; }
      if (search.trim()) { addManual(); return; }
    }
    if (!open || filteredUsers.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHoverIdx(i => Math.min(i + 1, filteredUsers.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHoverIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Backspace" && !search && selected.length > 0) removeUser(selected[selected.length - 1].id);
  };

  useEffect(() => { setHoverIdx(0); }, [search]);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="min-h-[36px] w-full px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white flex flex-wrap gap-1 items-center cursor-text focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-400 transition-all"
        onClick={() => { inputRef.current?.focus(); setOpen(true); }}
      >
        {selected.map(u => (
          <span key={u.id} className={`inline-flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-full text-xs font-medium border ${u.id.startsWith("manual-") ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
            <UserAvatar user={u} size="sm" />
            <span className="max-w-[100px] truncate">{u.name}</span>
            <button type="button" onClick={e => { e.stopPropagation(); removeUser(u.id); }} className="ml-0.5 text-current opacity-40 hover:opacity-100 transition-opacity">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? "Search ERPNext users or type name + Enter…" : "Add more…"}
          className="flex-1 min-w-[140px] outline-none text-xs text-gray-700 placeholder:text-gray-400 bg-transparent"
        />
        {loading && <Loader2 className="w-3 h-3 text-gray-400 animate-spin flex-shrink-0" />}
      </div>

      {open && (search || filteredUsers.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {filteredUsers.map((u, i) => (
            <button key={u.id} type="button"
              onMouseDown={e => { e.preventDefault(); addUser(u); }}
              onMouseEnter={() => setHoverIdx(i)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${i === hoverIdx ? "bg-blue-50" : "hover:bg-gray-50"}`}
            >
              <UserAvatar user={u} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                {(u.designation || u.department) && (
                  <p className="text-[10px] text-gray-400 truncate">{u.designation}{u.designation && u.department ? " · " : ""}{u.department}</p>
                )}
              </div>
            </button>
          ))}
          {search.trim() && !loading && (
            <button type="button"
              onMouseDown={e => { e.preventDefault(); addManual(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-t border-gray-100 hover:bg-amber-50 transition-colors">
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-600 shrink-0">
                +
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800">Add "<span className="text-amber-700">{search.trim()}</span>" manually</p>
                <p className="text-[10px] text-gray-400">Not in ERPNext — add as free-text attendee</p>
              </div>
            </button>
          )}
          {!search && filteredUsers.length === 0 && !loading && (
            <div className="px-4 py-3 text-xs text-gray-400 text-center">Start typing to search ERPNext users</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Manual Notes Mode ──────────────────────────────────────────────────────
function ManualView({ meeting, onUpdate }: { meeting: Meeting; onUpdate: (m: Meeting) => void }) {
  const [notes, setNotes] = useState(meeting.rawNotes || "");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [mention, setMention] = useState<{ active: boolean; query: string; start: number; idx: number }>({
    active: false, query: "", start: 0, idx: 0,
  });
  const { users, loading: mentionLoading } = useMentionUsers(mention.query, mention.active);

  useEffect(() => { setNotes(meeting.rawNotes || ""); }, [meeting.id]);

  const closeMention = () => setMention(m => ({ ...m, active: false, idx: 0 }));

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    const cursor = e.target.selectionStart ?? val.length;
    const result = getAtQuery(val, cursor);
    if (result) {
      setMention({ active: true, query: result.query, start: result.start, idx: 0 });
    } else {
      closeMention();
    }
  };

  const insertMention = (user: MentionUser) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart ?? notes.length;
    const before = notes.slice(0, mention.start);
    const after = notes.slice(cursor);
    const inserted = `@${user.name} `;
    const newNotes = before + inserted + after;
    setNotes(newNotes);
    closeMention();
    setTimeout(() => {
      ta.focus();
      const pos = before.length + inserted.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mention.active || users.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setMention(m => ({ ...m, idx: Math.min(m.idx + 1, users.length - 1) })); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMention(m => ({ ...m, idx: Math.max(m.idx - 1, 0) })); }
    else if (e.key === "Enter") { e.preventDefault(); insertMention(users[mention.idx]); }
    else if (e.key === "Escape") { closeMention(); }
  };

  const handleSave = async () => {
    setSaving(true);
    const updated = await apiFetch(`/meeting-minutes/${meeting.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawNotes: notes }),
    }).then(r => r.json());
    onUpdate(updated);
    setSaving(false);
  };

  const handleGenerate = async () => {
    await handleSave();
    setGenerating(true); setStreamText("");
    await streamGenerate(meeting.id, setStreamText, m => { onUpdate(m); setGenerating(false); });
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Meeting Notes</span>
          <div className="flex items-center gap-1.5">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
            </button>
            <button onClick={handleGenerate} disabled={generating || !notes.trim()}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all">
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Analyse
            </button>
          </div>
        </div>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={handleNotesChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(closeMention, 150)}
            rows={10}
            placeholder={"Type your meeting notes here…\n\nInclude:\n• What was discussed\n• Decisions made\n• Who said what\n\nAI will generate a structured summary with action items.\n\nTip: Type @ to mention a team member"}
            className="w-full px-4 py-3 text-sm text-gray-700 focus:outline-none resize-none bg-white"
          />
          {mention.active && (
            <div className="absolute left-4 bottom-2 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              <div className="px-3 py-1.5 border-b border-gray-100 flex items-center gap-1.5">
                <Users className="w-3 h-3 text-blue-500" />
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Mention team member</span>
                {mentionLoading && <Loader2 className="w-2.5 h-2.5 text-gray-400 animate-spin ml-auto" />}
              </div>
              {users.length === 0 && !mentionLoading && (
                <div className="px-3 py-3 text-xs text-gray-400 text-center">No users found</div>
              )}
              {users.map((u, i) => (
                <button
                  key={u.id}
                  onMouseDown={e => { e.preventDefault(); insertMention(u); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${i === mention.idx ? "bg-blue-50" : "hover:bg-gray-50"}`}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 overflow-hidden">
                    {u.avatar
                      ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      : u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                    {(u.designation || u.department) && (
                      <p className="text-[10px] text-gray-400 truncate">{u.designation || u.department}</p>
                    )}
                  </div>
                </button>
              ))}
              <div className="px-3 py-1 border-t border-gray-100 bg-gray-50">
                <p className="text-[9px] text-gray-400">↑↓ navigate · Enter select · Esc close</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {(generating || meeting.aiSummary) && (
        <div className="bg-white rounded-2xl border border-violet-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-blue-50 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span className="text-xs font-semibold text-violet-800 uppercase tracking-wide">AI Summary</span>
            {generating && <Loader2 className="w-3 h-3 text-violet-400 animate-spin ml-auto" />}
          </div>
          <div className="px-4 py-4">
            <MarkdownBlock text={generating ? streamText : `${meeting.aiSummary || ""}${meeting.actionItems ? "\n## Action Items\n" + meeting.actionItems : ""}`} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Report Helpers ──────────────────────────────────────────────────────────
function parseSections(text: string | null): Record<string, string[]> {
  if (!text) return {};
  const sections: Record<string, string[]> = {};
  let cur = "";
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      cur = line.slice(3).trim();
      sections[cur] = [];
    } else if (cur && line.startsWith("- ")) {
      sections[cur].push(line.slice(2).replace(/^(\[x\]|\[ \])\s*/, "").trim());
    } else if (cur && line && !line.startsWith("#")) {
      sections[cur].push(line);
    }
  }
  return sections;
}

type ActionRow = { task: string; person: string; deadline: string };
function parseActionRows(text: string | null): ActionRow[] {
  if (!text) return [];
  return text.split("\n")
    .filter(l => l.trim().startsWith("- "))
    .map(l => {
      const content = l.trim().slice(2).replace(/^(\[x\]|\[ \])\s*/, "").trim();
      const parts = content.split(/\s*[|\-–]\s*/);
      if (parts.length >= 3) return { task: parts[0], person: parts[1], deadline: parts[2] };
      if (parts.length === 2) return { task: parts[0], person: parts[1], deadline: "—" };
      return { task: content, person: "—", deadline: "—" };
    });
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return d; }
}

// ─── Meeting Report Component ────────────────────────────────────────────────
function MeetingReport({ meeting, onClose, preparedBy, preparedByDesignation, userEmail }: { meeting: Meeting; onClose: () => void; preparedBy: string; preparedByDesignation?: string | null; userEmail: string }) {
  const sections = parseSections(meeting.aiSummary);
  const actionRows = parseActionRows(meeting.actionItems);
  const attendeesList = (meeting.attendees || "").split(",").map(s => s.trim()).filter(Boolean);
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const [shareStatus, setShareStatus] = useState<{ channel: "whatsapp" | "email" | null; state: "idle" | "sending" | "success" | "error"; msg?: string }>({ channel: null, state: "idle" });

  const sectionOrder = ["Agenda", "Discussion Points", "Discussions", "Key Points", "Summary", "Decisions Made", "Decisions", "Next Steps"];
  const orderedKeys = [
    ...sectionOrder.filter(k => sections[k]),
    ...Object.keys(sections).filter(k => !sectionOrder.includes(k)),
  ];

  const handlePrint = () => window.print();

  const share = async (channel: "whatsapp" | "email") => {
    setShareStatus({ channel, state: "sending" });
    try {
      const res = await fetch(`${BASE}/meeting-minutes/${meeting.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, userEmail, preparedBy, preparedByDesignation }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setShareStatus({ channel, state: "error", msg: data.error || "Failed to send" });
      } else {
        setShareStatus({ channel, state: "success", msg: channel === "whatsapp" ? "Sent to your WhatsApp!" : "Email sent successfully!" });
      }
    } catch (e: any) {
      setShareStatus({ channel, state: "error", msg: e.message || "Network error" });
    }
    setTimeout(() => setShareStatus({ channel: null, state: "idle" }), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4 print:p-0 print:bg-white print:block">
      {/* Toolbar */}
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <span className="text-white font-semibold text-sm tracking-wide">Minutes of Meeting Preview</span>
          <div className="flex items-center gap-2">
            {/* Share status toast */}
            {shareStatus.state !== "idle" && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${shareStatus.state === "sending" ? "bg-white/10 text-white/70" : shareStatus.state === "success" ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"}`}>
                {shareStatus.state === "sending" ? `Sending ${shareStatus.channel === "whatsapp" ? "WhatsApp" : "Email"}…` : shareStatus.msg}
              </span>
            )}
            <button onClick={() => share("whatsapp")} disabled={shareStatus.state === "sending"}
              className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow transition-colors">
              {shareStatus.channel === "whatsapp" && shareStatus.state === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} WhatsApp
            </button>
            <button onClick={() => share("email")} disabled={shareStatus.state === "sending"}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow transition-colors">
              {shareStatus.channel === "email" && shareStatus.state === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Email
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow transition-colors">
              <Printer className="w-4 h-4" /> Print / PDF
            </button>
            <button onClick={onClose}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Document ── */}
        <div id="mom-report" className="bg-white rounded-2xl shadow-2xl overflow-hidden print:rounded-none print:shadow-none">
          {/* Company / Title Banner */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-600 px-10 py-8 text-white print:bg-blue-700">
            <p className="text-xs font-bold tracking-widest text-blue-200 uppercase mb-1">WTT INTERNATIONAL INDIA</p>
            <h1 className="text-2xl font-extrabold tracking-tight">Minutes of Meeting</h1>
            <h2 className="text-base font-medium text-blue-100 mt-1">{meeting.title}</h2>
          </div>

          <div className="px-10 py-8">
            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-8 pb-6 border-b border-gray-100 text-sm">
              <div className="flex gap-2">
                <span className="font-semibold text-gray-600 w-24 flex-shrink-0">Date</span>
                <span className="text-gray-800">{formatDate(meeting.date)}</span>
              </div>
              {meeting.venue && (
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-600 w-24 flex-shrink-0">Location</span>
                  <span className="text-gray-800">{meeting.venue}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="font-semibold text-gray-600 w-24 flex-shrink-0">Report Date</span>
                <span className="text-gray-500">{today}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold text-gray-600 w-24 flex-shrink-0">Prepared by</span>
                <span className="flex flex-col">
                  <span className="text-gray-800 font-medium">{preparedBy}</span>
                  {preparedByDesignation && (
                    <span className="text-xs text-blue-600 font-semibold">{preparedByDesignation}</span>
                  )}
                </span>
              </div>
            </div>

            {/* Attendees */}
            {attendeesList.length > 0 && (
              <div className="mb-7">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-6 h-0.5 bg-blue-500 rounded-full inline-block" />
                  Attendees
                </h3>
                <ul className="space-y-1.5 pl-2">
                  {attendeesList.map((a, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI-generated sections */}
            {orderedKeys.map(key => (
              sections[key]?.length > 0 && (
                <div key={key} className="mb-7">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-6 h-0.5 bg-blue-500 rounded-full inline-block" />
                    {key}
                  </h3>
                  <ul className="space-y-1.5 pl-2">
                    {sections[key].map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}

            {/* Raw Notes fallback when no AI summary */}
            {!meeting.aiSummary && meeting.rawNotes && (
              <div className="mb-7">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-6 h-0.5 bg-blue-500 rounded-full inline-block" />
                  Notes
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap pl-2 leading-relaxed">{meeting.rawNotes}</p>
              </div>
            )}

            {/* Action Items Table */}
            {actionRows.length > 0 && (
              <div className="mb-7">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-6 h-0.5 bg-blue-500 rounded-full inline-block" />
                  Action Items
                </h3>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="border border-blue-100 px-4 py-2.5 text-left font-semibold text-blue-900">#</th>
                      <th className="border border-blue-100 px-4 py-2.5 text-left font-semibold text-blue-900">Task</th>
                      <th className="border border-blue-100 px-4 py-2.5 text-left font-semibold text-blue-900">Responsible Person</th>
                      <th className="border border-blue-100 px-4 py-2.5 text-left font-semibold text-blue-900">Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionRows.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-200 px-4 py-2.5 text-gray-500 font-medium">{i + 1}</td>
                        <td className="border border-gray-200 px-4 py-2.5 text-gray-800">{row.task}</td>
                        <td className="border border-gray-200 px-4 py-2.5 text-gray-700">{row.person}</td>
                        <td className="border border-gray-200 px-4 py-2.5 text-gray-700">{row.deadline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <div className="mt-10 pt-5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span>FlowMatriX · WTT INTERNATIONAL INDIA</span>
              <span>Generated on {today}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Live Speech Minutes Tab ──────────────────────────────────────────────────
const SPEECH_LANGS = [
  { code: "en-IN", label: "English",    native: "English",          flag: "🇬🇧" },
  { code: "ta-IN", label: "Tamil",      native: "தமிழ்",            flag: "🇮🇳" },
  { code: "hi-IN", label: "Hindi",      native: "हिन्दी",           flag: "🇮🇳" },
  { code: "te-IN", label: "Telugu",     native: "తెలుగు",           flag: "🇮🇳" },
  { code: "ml-IN", label: "Malayalam",  native: "മലയാളം",          flag: "🇮🇳" },
  { code: "kn-IN", label: "Kannada",    native: "ಕನ್ನಡ",            flag: "🇮🇳" },
  { code: "mr-IN", label: "Marathi",    native: "मराठी",            flag: "🇮🇳" },
  { code: "gu-IN", label: "Gujarati",   native: "ગુજરાતી",          flag: "🇮🇳" },
  { code: "bn-IN", label: "Bengali",    native: "বাংলা",           flag: "🇮🇳" },
  { code: "es-ES", label: "Spanish",    native: "Español",          flag: "🇪🇸" },
  { code: "fr-FR", label: "French",     native: "Français",         flag: "🇫🇷" },
  { code: "de-DE", label: "German",     native: "Deutsch",          flag: "🇩🇪" },
  { code: "pt-BR", label: "Portuguese", native: "Português",        flag: "🇧🇷" },
  { code: "it-IT", label: "Italian",    native: "Italiano",         flag: "🇮🇹" },
  { code: "ru-RU", label: "Russian",    native: "Русский",          flag: "🇷🇺" },
  { code: "zh-CN", label: "Chinese",    native: "中文 (简体)",       flag: "🇨🇳" },
  { code: "ja-JP", label: "Japanese",   native: "日本語",           flag: "🇯🇵" },
  { code: "ko-KR", label: "Korean",     native: "한국어",            flag: "🇰🇷" },
  { code: "ar-SA", label: "Arabic",     native: "العربية",          flag: "🇸🇦" },
  { code: "tr-TR", label: "Turkish",    native: "Türkçe",           flag: "🇹🇷" },
  { code: "vi-VN", label: "Vietnamese", native: "Tiếng Việt",       flag: "🇻🇳" },
];

function SpeechLangPicker({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sel = SPEECH_LANGS.find(l => l.code === value) || SPEECH_LANGS[0];
  const filtered = q.trim() ? SPEECH_LANGS.filter(l => l.label.toLowerCase().includes(q.toLowerCase()) || l.native.toLowerCase().includes(q.toLowerCase())) : SPEECH_LANGS;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { if (!disabled) { setOpen(v => !v); setQ(""); setTimeout(() => inputRef.current?.focus(), 50); } }}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all shadow-sm min-w-[180px]
          ${disabled ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50" : "border-teal-200 bg-white text-gray-800 hover:border-teal-400 cursor-pointer"}`}
      >
        <span className="text-lg">{sel.flag}</span>
        <div className="text-left flex-1">
          <p className="leading-tight text-sm">{sel.label}</p>
          {sel.native !== sel.label && <p className="text-[10px] text-gray-400 font-normal">{sel.native}</p>}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-2xl z-50 w-56 flex flex-col overflow-hidden">
          <div className="px-2 pt-2 pb-1 border-b border-gray-100">
            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-teal-300 placeholder:text-gray-300" />
          </div>
          <div className="overflow-y-auto max-h-60 py-1">
            {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No match</p>}
            {filtered.map(l => (
              <button key={l.code} onClick={() => { onChange(l.code); setOpen(false); setQ(""); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${value === l.code ? "bg-teal-50 text-teal-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                <span className="text-base flex-shrink-0">{l.flag}</span>
                <div className="min-w-0">
                  <p className="font-semibold leading-tight">{l.label}</p>
                  {l.native !== l.label && <p className="text-[10px] text-gray-400 truncate">{l.native}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type LiveEntry = { id: number; text: string; ts: string };

function LiveSpeechMinutesView({
  onSaved,
  projects,
}: {
  onSaved: (meeting: Meeting) => void;
  projects: any[];
}) {
  const [lang, setLang] = useState("en-IN");
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [entries, setEntries] = useState<LiveEntry[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const recognitionRef = useRef<any>(null);
  const liveTextRef = useRef("");
  const entryCountRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as entries grow
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [entries, liveText]);

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition is not supported in this browser. Please use Chrome."); return; }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = lang;
    r.onresult = (e: any) => {
      let interim = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      liveTextRef.current = interim;
      setLiveText(interim);
      if (finalText.trim()) {
        const id = ++entryCountRef.current;
        const now = new Date();
        const ts = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setEntries(prev => [...prev, { id, text: finalText.trim(), ts }]);
        liveTextRef.current = "";
        setLiveText("");
      }
    };
    r.onerror = () => {};
    r.onend = () => { if (recognitionRef.current === r && isRecording) { try { r.start(); } catch {} } };
    r.start();
    recognitionRef.current = r;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (liveTextRef.current.trim()) {
      const id = ++entryCountRef.current;
      const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setEntries(prev => [...prev, { id, text: liveTextRef.current.trim(), ts }]);
    }
    setLiveText("");
    liveTextRef.current = "";
    setIsRecording(false);
  };

  const clearAll = () => { setEntries([]); setLiveText(""); liveTextRef.current = ""; entryCountRef.current = 0; };

  const handleSave = async () => {
    if (!title.trim() || entries.length === 0) return;
    setSaving(true);
    try {
      const transcript = entries.map(e => `[${e.ts}] ${e.text}`).join("\n");
      const created = await apiFetch("/meeting-minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), date, rawNotes: transcript,
          status: "draft", mode: "speech",
          attendees: null, venue: null, projectId: null,
        }),
      }).then(r => r.json());
      setSaved(true);
      setTimeout(() => { onSaved(created); }, 800);
    } catch {}
    finally { setSaving(false); }
  };

  const langLabel = SPEECH_LANGS.find(l => l.code === lang)?.label || "English";
  const fullTranscript = entries.map(e => e.text).join(" ");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 px-5 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-teal-100 text-[9px] font-bold uppercase tracking-widest">Meeting Minutes</p>
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <Mic className="w-4 h-4" /> Live Speech Minutes
            </h2>
            <p className="text-teal-100 text-xs mt-0.5">Speak and your words are captured as meeting minutes in real-time</p>
          </div>
          <SpeechLangPicker value={lang} onChange={v => { setLang(v); }} disabled={isRecording} />
        </div>
      </div>

      {/* Save form strip */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Meeting title (required to save)…"
            className="w-full text-sm font-semibold text-gray-800 placeholder:text-gray-300 placeholder:font-normal bg-transparent outline-none border-b border-gray-200 focus:border-teal-400 pb-0.5 transition-colors"
          />
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-teal-300" />
        {entries.length > 0 && (
          <button onClick={clearAll} disabled={isRecording}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-40">
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        )}
        <button onClick={handleSave}
          disabled={!title.trim() || entries.length === 0 || saving || saved}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm">
          {saved ? <><CheckCircle className="w-3.5 h-3.5" /> Saved!</> : saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Save className="w-3.5 h-3.5" /> Save as Meeting</>}
        </button>
      </div>

      {/* Transcript area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-[#f8fafc]">
        {entries.length === 0 && !liveText && !isRecording && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center pb-12">
            <div className="w-20 h-20 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center">
              <Mic className="w-9 h-9 text-teal-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Ready to record</p>
              <p className="text-xs text-gray-400 mt-1">Select your language and press the mic button below to start speaking</p>
            </div>
          </div>
        )}

        {entries.map(entry => (
          <div key={entry.id} className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-teal-400" />
            <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
              <p className="text-sm text-gray-800 leading-relaxed">{entry.text}</p>
              <p className="text-[10px] text-gray-400 mt-1">{entry.ts}</p>
            </div>
          </div>
        ))}

        {/* Live (interim) text */}
        {liveText && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-teal-200 animate-pulse" />
            <div className="flex-1 bg-teal-50 rounded-xl border border-teal-100 px-4 py-3">
              <p className="text-sm text-teal-700 italic leading-relaxed">{liveText}</p>
              <p className="text-[10px] text-teal-400 mt-1">Speaking…</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Stats + Mic button */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-5 py-4 flex items-center justify-between">
        <div className="text-xs text-gray-400 space-y-0.5">
          <p>{entries.length} phrase{entries.length !== 1 ? "s" : ""} recorded · {fullTranscript.split(/\s+/).filter(Boolean).length} words</p>
          <p className="text-[10px] text-gray-300">Language: {langLabel}</p>
        </div>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 focus:outline-none
            ${isRecording
              ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-200 scale-110"
              : "bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-200 hover:scale-105"
            }`}
        >
          {isRecording && (
            <span className="absolute inset-0 rounded-full bg-red-400 opacity-30 animate-ping" />
          )}
          {isRecording
            ? <Square className="w-6 h-6 text-white" fill="white" />
            : <Mic className="w-6 h-6 text-white" />
          }
        </button>

        <div className="text-xs text-right text-gray-400 space-y-0.5">
          {isRecording
            ? <p className="text-red-500 font-semibold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" /> Recording…</p>
            : <p>Tap mic to start</p>
          }
          <p className="text-[10px] text-gray-300">Tap again to stop</p>
        </div>
      </div>
    </div>
  );
}

// ─── Project Field (dropdown + manual toggle) ────────────────────────────────
function ProjectField({ form, setForm, projects }: {
  form: { projectId: string; projectName: string; projectMode: "select" | "manual" };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  projects: any[];
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
      <div className="flex items-center justify-between mb-1">
        <label className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">
          <FolderOpen className="w-2.5 h-2.5" /> Project
        </label>
        <button type="button"
          onClick={() => setForm((f: any) => ({ ...f, projectMode: f.projectMode === "manual" ? "select" : "manual", projectId: "", projectName: "" }))}
          className="text-[9px] font-semibold text-blue-500 hover:text-blue-700 transition-colors">
          {form.projectMode === "manual" ? "← Pick from list" : "Type manually →"}
        </button>
      </div>
      {form.projectMode === "manual" ? (
        <input
          value={form.projectName}
          onChange={e => setForm((f: any) => ({ ...f, projectName: e.target.value }))}
          placeholder="Enter project name…"
          className="w-full text-xs font-semibold text-gray-700 placeholder:text-gray-300 placeholder:font-normal bg-transparent outline-none border-none"
        />
      ) : (
        <select
          value={form.projectId}
          onChange={e => setForm((f: any) => ({ ...f, projectId: e.target.value }))}
          className="w-full text-xs font-semibold text-gray-700 bg-transparent outline-none border-none cursor-pointer"
        >
          <option value="">— No project linked —</option>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function MeetingMinutes() {
  const { user } = useAuth();
  const preparedBy = user?.full_name || user?.email?.split("@")[0] || "FlowMatriX";
  const preparedByDesignation = user?.designation || null;
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [newMode, setNewMode] = useState<"record" | "manual" | "live-speech">("record");
  const autoStartMeetingIdRef = useRef<number | null>(null);
  const [form, setForm] = useState({ title: "", date: new Date().toISOString().slice(0, 10), venue: "", projectId: "", projectName: "", projectMode: "select" as "select" | "manual" });
  const [selectedAttendees, setSelectedAttendees] = useState<MentionUser[]>([]);
  const { data: projects = [] } = useListProjects();

  useEffect(() => {
    if (meetings === null && !loading) {
      setLoading(true);
      fetch(`${BASE}/meeting-minutes`).then(r => r.json())
        .then(data => { setMeetings(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => { setMeetings([]); setLoading(false); });
    }
  }, []);

  const handleCreate = async () => {
    if (!form.title || !form.date) return;
    const attendeesStr = selectedAttendees.length > 0 ? selectedAttendees.map(u => u.name).join(", ") : null;

    let resolvedProjectId: number | null = null;
    if (form.projectMode === "select" && form.projectId) {
      resolvedProjectId = Number(form.projectId);
    } else if (form.projectMode === "manual" && form.projectName.trim()) {
      try {
        const r = await fetch(`${BASE}/projects`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.projectName.trim(), status: "planning", priority: "medium", progress: 0 }),
        });
        if (r.ok) { const np = await r.json(); resolvedProjectId = np.id; }
      } catch {}
    }

    const apiMode = newMode === "live-speech" ? "speech" : newMode;
    const created = await apiFetch("/meeting-minutes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title, date: form.date,
        venue: form.venue || null, attendees: attendeesStr,
        projectId: resolvedProjectId, status: "draft", mode: apiMode,
      }),
    }).then(r => r.json());
    setMeetings(prev => [created, ...(prev || [])]);
    if (newMode === "record") autoStartMeetingIdRef.current = created.id;
    setSelected({ ...created, mode: apiMode });
    setShowNew(false);
    setForm({ title: "", date: new Date().toISOString().slice(0, 10), venue: "", projectId: "", projectName: "", projectMode: "select" });
    setSelectedAttendees([]);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiFetch(`/meeting-minutes/${id}`, { method: "DELETE" });
    setMeetings(prev => prev?.filter(m => m.id !== id) || []);
    if (selected?.id === id) setSelected(null);
  };

  const handleUpdate = (updated: Meeting) => {
    setSelected(s => s ? { ...updated, mode: s.mode } : updated);
    setMeetings(prev => prev?.map(m => m.id === updated.id ? updated : m) || null);
  };

  const modeOf = (m: Meeting) => (m as any).mode || "manual";

  return (
    <Layout>
      <div className="flex h-[calc(100vh-48px)]">

        {/* ── Left list panel ── */}
        <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="px-3 py-2.5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-800 text-sm">Meeting Minutes</span>
              </div>
              <button onClick={() => { setShowNew(true); setSelected(null); setNewMode("record"); }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors">
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2">
            {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse mb-1.5" />)}
            {!loading && meetings?.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-8 h-8 text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">No meetings yet</p>
              </div>
            )}
            {meetings?.map(m => (
              <div key={m.id} onClick={() => { setSelected(m); setShowNew(false); setShowReport(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg mb-0.5 transition-all group cursor-pointer ${selected?.id === m.id ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-gray-50"}`}>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <ModeBadge mode={modeOf(m)} />
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{m.title}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-0.5 leading-tight"><Calendar className="w-2.5 h-2.5 shrink-0" />{m.date}</p>
                  </div>
                  <button onClick={e => handleDelete(m.id, e)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-300 hover:text-red-500 transition-all flex-shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right content panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">

          {/* NEW MEETING FORM */}
          {showNew && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Gradient hero header — compact */}
              <div className={`relative px-4 pt-3 pb-2.5 flex-shrink-0 ${newMode === "record" ? "bg-gradient-to-br from-red-600 via-rose-500 to-orange-400" : "bg-gradient-to-br from-blue-700 via-blue-500 to-indigo-400"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      {newMode === "record" ? <Mic className="w-3.5 h-3.5 text-white" /> : <Type className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div>
                      <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest leading-none">New Meeting</p>
                      <h2 className="text-white text-sm font-bold leading-snug">
                        {newMode === "record" ? "Auto Record & Transcribe" : "Manual Notes"}
                      </h2>
                    </div>
                  </div>
                  <button onClick={() => { setShowNew(false); setSelectedAttendees([]); setForm({ title: "", date: new Date().toISOString().slice(0, 10), venue: "", projectId: "", projectName: "", projectMode: "select" }); }}
                    className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white/80 hover:text-white transition-all flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Mode toggle */}
                <div className="mt-2 flex items-center gap-0.5 bg-black/20 p-0.5 rounded-lg w-fit">
                  <button onClick={() => setNewMode("record")}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${newMode === "record" ? "bg-white text-red-600 shadow-sm" : "text-white/70 hover:text-white"}`}>
                    <Mic className="w-2.5 h-2.5" /> Auto Record
                  </button>
                  <button onClick={() => setNewMode("manual")}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${newMode === "manual" ? "bg-white text-blue-600 shadow-sm" : "text-white/70 hover:text-white"}`}>
                    <Type className="w-2.5 h-2.5" /> Manual Notes
                  </button>
                </div>
              </div>

              {/* Form body */}
              <div className="flex-1 overflow-y-auto bg-[#f8fafc] px-4 py-3 space-y-2">

                {/* Meeting Title */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Meeting Title <span className="text-red-400 normal-case">*</span></label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && form.title && form.date && handleCreate()}
                    placeholder="e.g. Weekly Project Sync, Q1 Review, Sprint Planning…"
                    autoFocus
                    className="w-full text-sm font-semibold text-gray-800 placeholder:text-gray-300 placeholder:font-normal bg-transparent outline-none border-none"
                  />
                  <div className={`mt-1.5 h-px rounded-full transition-all ${form.title ? (newMode === "record" ? "bg-red-400" : "bg-blue-400") : "bg-gray-100"}`} />
                </div>

                {/* Date + Venue row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
                    <label className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                      <Calendar className="w-2.5 h-2.5" /> Date <span className="text-red-400 normal-case">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full text-xs font-semibold text-gray-700 bg-transparent outline-none border-none"
                    />
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
                    <label className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                      <MapPin className="w-2.5 h-2.5" /> Venue
                    </label>
                    <input
                      value={form.venue}
                      onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                      placeholder="Conference Room A, Zoom…"
                      className="w-full text-xs font-semibold text-gray-700 placeholder:text-gray-300 placeholder:font-normal bg-transparent outline-none border-none"
                    />
                  </div>
                </div>

                {/* Project — dropdown OR manual text toggle */}
                <ProjectField form={form} setForm={setForm} projects={projects as any[]} />

                {/* Attendees — ERPNext search with manual fallback */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
                  <label className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                    <Users className="w-2.5 h-2.5" /> Attendees
                    {selectedAttendees.length > 0 && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white ${newMode === "record" ? "bg-red-500" : "bg-blue-500"}`}>
                        {selectedAttendees.length}
                      </span>
                    )}
                  </label>
                  <AttendeesPicker selected={selectedAttendees} onChange={setSelectedAttendees} />
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-4 py-2.5 bg-white border-t border-gray-100 flex items-center justify-between">
                <p className="text-[11px] text-gray-400 italic">
                  {newMode === "record" ? "Recording starts after creation" : "Add notes & AI summary after creation"}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setShowNew(false); setSelectedAttendees([]); setForm({ title: "", date: new Date().toISOString().slice(0, 10), venue: "", projectId: "", projectName: "", projectMode: "select" }); }}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!form.title || !form.date}
                    className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg ${
                      newMode === "record"
                        ? "bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 shadow-red-200"
                        : "bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 shadow-blue-200"
                    }`}
                  >
                    {newMode === "record" ? <Mic className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                    Create & {newMode === "record" ? "Start Recording" : "Start Writing"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MEETING DETAIL */}
          {selected && !showNew && (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto w-full p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <ModeBadge mode={modeOf(selected)} />
                      <StatusBadge status={selected.status} />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">{selected.title}</h1>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{selected.date}</span>
                      {selected.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selected.venue}</span>}
                      {selected.attendees && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{selected.attendees}</span>}
                    </div>
                  </div>
                  {/* Generate Report button */}
                  <button
                    onClick={() => setShowReport(true)}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    Generate Report
                  </button>
                </div>

                {modeOf(selected) === "record"
                  ? <RecordingView key={selected.id} meeting={selected} onUpdate={handleUpdate} autoStart={autoStartMeetingIdRef.current === selected.id} />
                  : <ManualView meeting={selected} onUpdate={handleUpdate} />}
              </div>
            </div>
          )}

          {/* REPORT MODAL */}
          {showReport && selected && (
            <MeetingReport meeting={selected} onClose={() => setShowReport(false)} preparedBy={preparedBy} preparedByDesignation={preparedByDesignation} userEmail={user?.email || ""} />
          )}

          {/* EMPTY STATE */}
          {!selected && !showNew && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Meeting Minutes</h2>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">Auto-record with live transcription, or type notes manually — AI analyses both.</p>
              <button onClick={() => setShowNew(true)}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors">
                <Plus className="w-4 h-4" /> Create First Meeting
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
