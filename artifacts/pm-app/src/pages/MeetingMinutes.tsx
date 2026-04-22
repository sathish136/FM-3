import { Layout } from "@/components/Layout";
import {
  FileText, Plus, Trash2, Sparkles, Calendar, Users,
  X, Save, Loader2, CheckCircle, Clock, Mic,
  Square, Type, Radio, MapPin, Search, FolderOpen,
  Printer, MessageSquare, Mail, ChevronDown, Globe,
  Camera, Image as ImageIcon, StickyNote, Paperclip, Pause, Play,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRecording, getGlobalRec } from "@/contexts/RecordingContext";
import { useListProjects } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";

type Meeting = {
  id: number; title: string; projectId: number | null;
  attendees: string | null; venue: string | null; date: string; rawNotes: string | null;
  aiSummary: string | null; actionItems: string | null;
  status: string; mode?: string; audioData?: string | null;
  createdBy: string | null; createdAt: string;
};

const BASE = "/api";

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, opts);
  if (!r.ok && r.status !== 204) throw new Error(await r.text());
  return r;
}

function ModeBadge({ mode }: { mode: string }) {
  if (mode === "record") return <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-bold tracking-wide text-red-600 bg-red-50 border border-red-200"><Mic className="w-2 h-2" />REC</span>;
  if (mode === "speech") return <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-bold tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200"><Users className="w-2 h-2" />CUSTOMER</span>;
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
  { code: "auto",  label: "Auto Detect", native: "Multi-language",   flag: "🌐" },
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

// ─── Language detection from text ────────────────────────────────────────────
function detectScript(text: string): { lang: string; flag: string; isEnglish: boolean } {
  if (!text.trim()) return { lang: "English", flag: "🇬🇧", isEnglish: true };
  const counts = { tamil: 0, hindi: 0, arabic: 0, chinese: 0, japanese: 0, korean: 0, latin: 0 };
  for (const c of text) {
    const cp = c.codePointAt(0) ?? 0;
    if (cp >= 0x0B80 && cp <= 0x0BFF) counts.tamil++;
    else if (cp >= 0x0900 && cp <= 0x097F) counts.hindi++;
    else if (cp >= 0x0600 && cp <= 0x06FF) counts.arabic++;
    else if (cp >= 0x4E00 && cp <= 0x9FFF) counts.chinese++;
    else if ((cp >= 0x3040 && cp <= 0x30FF) || (cp >= 0xFF65 && cp <= 0xFF9F)) counts.japanese++;
    else if (cp >= 0xAC00 && cp <= 0xD7FF) counts.korean++;
    else if ((cp >= 0x0041 && cp <= 0x007A) || (cp >= 0x00C0 && cp <= 0x024F)) counts.latin++;
  }
  const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
  if (top[1] === 0 || top[0] === "latin") return { lang: "English", flag: "🇬🇧", isEnglish: true };
  const map: Record<string, [string, string]> = {
    tamil: ["Tamil", "🇮🇳"], hindi: ["Hindi", "🇮🇳"], arabic: ["Arabic", "🇸🇦"],
    chinese: ["Chinese", "🇨🇳"], japanese: ["Japanese", "🇯🇵"], korean: ["Korean", "🇰🇷"],
  };
  const [name, flag] = map[top[0]] ?? ["Unknown", "🌐"];
  return { lang: name, flag, isEnglish: false };
}

type Block =
  | { kind: "speech"; id: number; text: string; translated: string | null; ts: string; tsMs: number; detectedLang: string; detectedFlag: string; isEnglish: boolean; translating: boolean }
  | { kind: "note"; id: number; text: string; ts: string; tsMs: number }
  | { kind: "image"; id: number; dataUrl: string; caption: string; ts: string; tsMs: number; source: "upload" | "capture" };

const PARAGRAPH_GAP_MS = 4000; // commit a speech paragraph after 4s of silence
const AUTO_LANGS = ["en-IN", "ta-IN", "hi-IN"];
const CHUNK_MS = 3500; // upload an audio chunk to Whisper roughly every 3.5s

// Pick a MediaRecorder mime type the browser actually supports
function pickRecorderMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const m of candidates) {
    try { if ((window as any).MediaRecorder?.isTypeSupported?.(m)) return m; } catch {}
  }
  return "";
}

function CameraCaptureModal({ onCapture, onClose }: { onCapture: (dataUrl: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        setError(e?.message || "Could not access camera");
      }
    })();
    return () => {
      cancelled = true;
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    };
  }, []);

  const snap = () => {
    const v = videoRef.current;
    if (!v) return;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    onCapture(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-slate-700" />
            <span className="text-sm font-semibold text-slate-800">Capture Photo</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="bg-black relative aspect-video flex items-center justify-center">
          {error
            ? <p className="text-white/80 text-sm px-4 text-center">{error}</p>
            : <video ref={videoRef} playsInline muted className="w-full h-full object-contain" />
          }
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
          <p className="text-[11px] text-slate-500">Photo will be attached to the meeting timeline.</p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
            <button onClick={snap} disabled={!!error} className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-black disabled:opacity-40 text-white text-xs font-semibold rounded-lg">
              <Camera className="w-3.5 h-3.5" /> Capture
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveSpeechMinutesView({
  onSaved,
  createdBy,
}: {
  onSaved: (meeting: Meeting) => void;
  createdBy: string;
}) {
  const [lang, setLang] = useState("auto");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [venue, setVenue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [liveDetected, setLiveDetected] = useState<{ lang: string; flag: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [duration, setDuration] = useState(0);
  const durationTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Chunked Whisper recording refs
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderMimeRef = useRef<string>("");
  const chunkCycleRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);

  const idCounterRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [blocks, liveText]);
  useEffect(() => () => {
    teardownStream();
    if (durationTimerRef.current) window.clearInterval(durationTimerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Live recording timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      durationTimerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    } else if (durationTimerRef.current) {
      window.clearInterval(durationTimerRef.current); durationTimerRef.current = null;
    }
    return () => { if (durationTimerRef.current) { window.clearInterval(durationTimerRef.current); durationTimerRef.current = null; } };
  }, [isRecording, isPaused]);

  const fmtDur = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const nowTs = () => ({ ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), tsMs: Date.now() });

  // ─── Translation ──────────────────────────────────────────────────────────
  const translateBlock = async (id: number, text: string, sourceLang: string) => {
    setBlocks(prev => prev.map(b => b.kind === "speech" && b.id === id ? { ...b, translating: true } : b));
    try {
      const r = await fetch(`${BASE}/meeting-minutes/translate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLang }),
      });
      const { translated } = await r.json();
      setBlocks(prev => prev.map(b => b.kind === "speech" && b.id === id ? { ...b, translated, translating: false } : b));
    } catch {
      setBlocks(prev => prev.map(b => b.kind === "speech" && b.id === id ? { ...b, translating: false } : b));
    }
  };

  // Append a finished Whisper transcript chunk to the timeline + auto-translate
  const appendSpeechChunk = (rawText: string) => {
    const text = rawText.trim().replace(/\s+/g, " ");
    if (!text) return;

    // Filter common Whisper hallucinations on silent audio
    const lower = text.toLowerCase();
    const noise = ["thank you", "thanks for watching", "you", ".", "..", "...", "[music]", "[silence]"];
    if (text.length < 3 || noise.includes(lower)) return;

    const detected = detectScript(text);
    const id = ++idCounterRef.current;
    const t = nowTs();
    const block: Block = {
      kind: "speech", id, text, translated: null, ts: t.ts, tsMs: t.tsMs,
      detectedLang: detected.lang, detectedFlag: detected.flag, isEnglish: detected.isEnglish, translating: false,
    };
    setBlocks(prev => [...prev, block]);
    setLiveText("");
    setLiveDetected({ lang: detected.lang, flag: detected.flag });
    if (!detected.isEnglish) translateBlock(id, text, detected.lang);
  };

  // ─── Chunked Whisper recording ────────────────────────────────────────────
  const teardownStream = () => {
    try { recorderRef.current?.stop(); } catch {}
    recorderRef.current = null;
    if (chunkCycleRef.current) { window.clearTimeout(chunkCycleRef.current); chunkCycleRef.current = null; }
    if (streamRef.current) {
      try { streamRef.current.getTracks().forEach(t => t.stop()); } catch {}
      streamRef.current = null;
    }
  };

  // Start a fresh MediaRecorder that records exactly one CHUNK_MS slice,
  // then on stop uploads to Whisper and immediately starts the next chunk.
  const startChunkCycle = () => {
    if (!isRecordingRef.current || isPausedRef.current) return;
    const stream = streamRef.current;
    if (!stream) return;

    let mr: MediaRecorder;
    try {
      mr = recorderMimeRef.current
        ? new MediaRecorder(stream, { mimeType: recorderMimeRef.current })
        : new MediaRecorder(stream);
    } catch {
      try { mr = new MediaRecorder(stream); } catch { return; }
    }
    recorderRef.current = mr;

    const parts: BlobPart[] = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) parts.push(e.data); };
    mr.onstop = async () => {
      // Schedule the next cycle immediately so capture is continuous
      if (isRecordingRef.current && !isPausedRef.current) {
        chunkCycleRef.current = window.setTimeout(startChunkCycle, 0);
      }
      const mime = mr.mimeType || recorderMimeRef.current || "audio/webm";
      const blob = new Blob(parts, { type: mime });
      if (blob.size < 2000) return; // too small to contain speech

      try {
        const ext = mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "mp4" : "webm";
        const fd = new FormData();
        fd.append("audio", blob, `chunk.${ext}`);
        const r = await fetch(`${BASE}/transcribe`, { method: "POST", body: fd });
        if (!r.ok) return;
        const { transcript } = await r.json();
        if (transcript && transcript.trim()) appendSpeechChunk(transcript);
      } catch {}
    };

    mr.start();
    // Stop after CHUNK_MS so onstop fires with a complete, decodable file
    chunkCycleRef.current = window.setTimeout(() => {
      try { mr.state === "recording" && mr.stop(); } catch {}
    }, CHUNK_MS);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Microphone access is not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      recorderMimeRef.current = pickRecorderMime();
      isRecordingRef.current = true;
      isPausedRef.current = false;
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setLiveText("");
      setLiveDetected(null);
      startChunkCycle();
    } catch (e) {
      alert("Could not access the microphone. Please allow microphone access in your browser.");
    }
  };

  const pauseRecording = () => {
    isPausedRef.current = true;
    setIsPaused(true);
    if (chunkCycleRef.current) { window.clearTimeout(chunkCycleRef.current); chunkCycleRef.current = null; }
    try { recorderRef.current?.state === "recording" && recorderRef.current.stop(); } catch {}
  };

  const resumeRecording = () => {
    isPausedRef.current = false;
    setIsPaused(false);
    startChunkCycle();
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    isPausedRef.current = false;
    if (chunkCycleRef.current) { window.clearTimeout(chunkCycleRef.current); chunkCycleRef.current = null; }
    try { recorderRef.current?.state === "recording" && recorderRef.current.stop(); } catch {}
    teardownStream();
    setLiveText("");
    setLiveDetected(null);
    setIsRecording(false);
    setIsPaused(false);
  };

  const addNote = () => {
    const text = noteDraft.trim();
    if (!text) return;
    const id = ++idCounterRef.current;
    const t = nowTs();
    setBlocks(prev => [...prev, { kind: "note", id, text, ts: t.ts, tsMs: t.tsMs }]);
    setNoteDraft("");
  };

  const addImageFromFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      const id = ++idCounterRef.current;
      const t = nowTs();
      setBlocks(prev => [...prev, { kind: "image", id, dataUrl, caption: file.name, ts: t.ts, tsMs: t.tsMs, source: "upload" }]);
    };
    reader.readAsDataURL(file);
  };

  const addCapturedImage = (dataUrl: string) => {
    const id = ++idCounterRef.current;
    const t = nowTs();
    setBlocks(prev => [...prev, { kind: "image", id, dataUrl, caption: "Camera capture", ts: t.ts, tsMs: t.tsMs, source: "capture" }]);
  };

  const removeBlock = (id: number) => setBlocks(prev => prev.filter(b => b.id !== id));

  const clearAll = () => {
    setBlocks([]);
    setLiveText("");
    setLiveDetected(null);
    idCounterRef.current = 0;
  };

  const handleSave = async () => {
    if (!title.trim() || blocks.length === 0) return;
    setSaving(true);
    try {
      const transcript = blocks.map(b => {
        if (b.kind === "speech") {
          const line = `[${b.ts}] ${b.text}`;
          return b.translated && !b.isEnglish ? `${line}\n[EN] ${b.translated}` : line;
        }
        if (b.kind === "note") return `[${b.ts}] 📝 NOTE: ${b.text}`;
        return `[${b.ts}] 📷 IMAGE (${b.source}): ${b.caption}\n${b.dataUrl}`;
      }).join("\n\n");
      const created = await apiFetch("/meeting-minutes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), date, rawNotes: transcript,
          status: "draft", mode: "speech",
          attendees: null, venue: venue.trim() || null, projectId: null, createdBy,
        }),
      }).then(r => r.json());
      setSaved(true);
      setTimeout(() => { onSaved(created); }, 800);
    } catch {}
    finally { setSaving(false); }
  };

  const langLabel = SPEECH_LANGS.find(l => l.code === lang)?.label || "English";
  const speechBlocks = blocks.filter(b => b.kind === "speech") as Extract<Block, { kind: "speech" }>[];
  const wordCount = speechBlocks.reduce((sum, b) => sum + b.text.split(/\s+/).filter(Boolean).length, 0);
  const noteCount = blocks.filter(b => b.kind === "note").length;
  const imgCount = blocks.filter(b => b.kind === "image").length;
  const translatedCount = speechBlocks.filter(b => !b.isEnglish).length;

  const totalItems = blocks.length;
  const canSave = !!title.trim() && totalItems > 0 && !saving && !saved;
  const showEmpty = totalItems === 0 && !liveText && !isRecording;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
      {showCamera && <CameraCaptureModal onCapture={addCapturedImage} onClose={() => setShowCamera(false)} />}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) addImageFromFile(f); e.target.value = ""; }} />

      {/* ── Compact top bar: title + status + save ── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200">
        <div className="px-5 py-2.5 flex items-center gap-3">
          {/* Status dot/icon */}
          <button
            onClick={() => setMetaOpen(o => !o)}
            className="flex items-center gap-2 shrink-0 group"
            title="Meeting details"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isRecording && !isPaused ? "bg-rose-600" : isPaused ? "bg-amber-500" : "bg-slate-900"}`}>
              {isRecording && !isPaused
                ? <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                : isPaused
                  ? <Pause className="w-3.5 h-3.5 text-white" fill="white" />
                  : <Users className="w-4 h-4 text-white" />}
            </div>
          </button>

          {/* Title input — primary focus */}
          <div className="flex-1 min-w-0">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Untitled customer meeting"
              className="w-full text-base font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-medium bg-transparent outline-none"
            />
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              <span>{date}</span>
              {venue && <><span className="text-slate-300">·</span><span className="truncate">{venue}</span></>}
              <span className="text-slate-300">·</span>
              <button onClick={() => setMetaOpen(o => !o)} className="text-slate-500 hover:text-slate-900 font-medium inline-flex items-center gap-0.5">
                Details <ChevronDown className={`w-3 h-3 transition-transform ${metaOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {/* Right: counts + save */}
          <div className="flex items-center gap-2 shrink-0">
            {totalItems > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 px-2.5 py-1 bg-slate-100 rounded-full">
                {speechBlocks.length > 0 && <span className="font-semibold text-slate-700">{speechBlocks.length} ¶</span>}
                {noteCount > 0 && <span className="font-semibold text-amber-700">{noteCount} 📝</span>}
                {imgCount > 0 && <span className="font-semibold text-slate-700">{imgCount} 📷</span>}
              </div>
            )}
            {totalItems > 0 && !isRecording && (
              <button onClick={clearAll} title="Clear all"
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors">
              {saved
                ? <><CheckCircle className="w-3.5 h-3.5" /> Saved</>
                : saving
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving</>
                  : <><Save className="w-3.5 h-3.5" /> Save</>}
            </button>
          </div>
        </div>

        {/* Collapsible details panel */}
        {metaOpen && (
          <div className="px-5 pb-3 pt-1 grid grid-cols-12 gap-3 border-t border-slate-100 bg-slate-50/50">
            <label className="col-span-6 block">
              <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Date</span>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full text-xs font-semibold text-slate-700 px-2.5 py-1.5 rounded-md border border-slate-200 outline-none focus:border-slate-900 bg-white" />
            </label>
            <label className="col-span-6 block">
              <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Venue</span>
              <input value={venue} onChange={e => setVenue(e.target.value)}
                placeholder="On-site / Zoom / Office"
                className="w-full text-xs font-semibold text-slate-700 px-2.5 py-1.5 rounded-md border border-slate-200 outline-none focus:border-slate-900 bg-white placeholder:text-slate-300 placeholder:font-normal" />
            </label>
            <div className="col-span-12">
              <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Recognition Language</span>
              <SpeechLangPicker value={lang} onChange={setLang} disabled={isRecording && !isPaused} />
            </div>
          </div>
        )}
      </div>

      {/* ── Recording status banner (only while recording) ── */}
      {isRecording && (
        <div className={`flex-shrink-0 px-5 py-2 flex items-center gap-3 border-b ${isPaused ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"}`}>
          <span className={`flex items-center gap-1.5 text-xs font-bold ${isPaused ? "text-amber-700" : "text-rose-700"}`}>
            {isPaused
              ? <><Pause className="w-3.5 h-3.5" /> Paused</>
              : <><span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" /> Recording</>}
          </span>
          <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums">{fmtDur(duration)}</span>
          {liveDetected && (
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span>{liveDetected.flag}</span>
              <span className="font-semibold">{liveDetected.lang}</span>
            </span>
          )}
          <span className="text-[11px] text-slate-500 hidden sm:inline">· transcribed every {Math.round(CHUNK_MS / 1000)}s with auto-translate</span>
          <div className="ml-auto flex items-center gap-1.5">
            {isPaused
              ? <button onClick={resumeRecording} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors">
                  <Play className="w-3 h-3" fill="white" /> Resume
                </button>
              : <button onClick={pauseRecording} className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors">
                  <Pause className="w-3 h-3" /> Pause
                </button>}
            <button onClick={stopRecording} className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-md transition-colors">
              <Square className="w-3 h-3" fill="white" /> End
            </button>
          </div>
        </div>
      )}

      {/* ── Timeline (chat-style) ── */}
      <div className="flex-1 overflow-y-auto">
        {showEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              <Mic className="w-9 h-9 text-slate-300" />
            </div>
            <div className="max-w-sm space-y-1.5">
              <p className="text-base font-bold text-slate-800">Start your customer meeting</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Press <span className="font-semibold text-slate-700">Record</span> to capture speech in any language.
                You can also type quick notes or attach photos at any moment.
              </p>
            </div>
            <button onClick={startRecording}
              className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-md shadow-rose-200 transition-colors">
              <Mic className="w-4 h-4" /> Start Recording
            </button>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <button onClick={() => composerRef.current?.focus()} className="flex items-center gap-1 hover:text-slate-700"><StickyNote className="w-3 h-3" /> Type a note</button>
              <span>·</span>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 hover:text-slate-700"><Paperclip className="w-3 h-3" /> Attach</button>
              <span>·</span>
              <button onClick={() => setShowCamera(true)} className="flex items-center gap-1 hover:text-slate-700"><Camera className="w-3 h-3" /> Capture</button>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-5 py-4 space-y-3 pb-32">
            {blocks.map(b => (
              <div key={`${b.kind}-${b.id}`} className="group flex items-start gap-3">
                <div className="flex-shrink-0 w-12 text-right">
                  <p className="text-[10px] font-semibold text-slate-400 mt-2 tabular-nums">{b.ts}</p>
                </div>

                {b.kind === "speech" && (
                  <div className="flex-1 bg-white rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-sm leading-none">{b.detectedFlag}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{b.detectedLang}</span>
                      <button onClick={() => removeBlock(b.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{b.text}</p>
                    {!b.isEnglish && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        {b.translating ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Loader2 className="w-3 h-3 animate-spin" /> Translating to English…
                          </div>
                        ) : b.translated ? (
                          <div className="flex items-start gap-1.5">
                            <Globe className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <p className="text-[13px] text-emerald-800 leading-relaxed italic">{b.translated}</p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {b.kind === "note" && (
                  <div className="flex-1 bg-amber-50 rounded-2xl rounded-tl-sm border border-amber-200 shadow-sm px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <StickyNote className="w-3 h-3 text-amber-600" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Manual note</span>
                      <button onClick={() => removeBlock(b.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 text-amber-300 hover:text-rose-500 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{b.text}</p>
                  </div>
                )}

                {b.kind === "image" && (
                  <div className="flex-1 bg-white rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-100">
                      {b.source === "capture" ? <Camera className="w-3 h-3 text-slate-500" /> : <ImageIcon className="w-3 h-3 text-slate-500" />}
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        {b.source === "capture" ? "Photo" : "Attachment"}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">· {b.caption}</span>
                      <button onClick={() => removeBlock(b.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <a href={b.dataUrl} target="_blank" rel="noreferrer" className="block bg-slate-50">
                      <img src={b.dataUrl} alt={b.caption} className="max-h-72 w-auto mx-auto" />
                    </a>
                  </div>
                )}
              </div>
            ))}

            {/* Live interim speech */}
            {liveText && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 text-right">
                  <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse mt-3" />
                </div>
                <div className="flex-1 bg-white rounded-2xl rounded-tl-sm border border-dashed border-slate-300 px-4 py-3">
                  <p className="text-sm text-slate-500 italic leading-relaxed">{liveText}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {liveDetected ? `${liveDetected.flag} ${liveDetected.lang} · listening…` : "Listening…"}
                  </p>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Bottom composer (chat-style) ── */}
      <div className="flex-shrink-0 bg-white border-t border-slate-200 px-3 py-2.5">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          {/* Attach */}
          <button onClick={() => fileInputRef.current?.click()}
            title="Attach image"
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors shrink-0">
            <Paperclip className="w-4 h-4" />
          </button>
          {/* Camera */}
          <button onClick={() => setShowCamera(true)}
            title="Capture photo"
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors shrink-0">
            <Camera className="w-4 h-4" />
          </button>

          {/* Note composer */}
          <div className="flex-1 flex items-end bg-slate-100 rounded-2xl px-3.5 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border focus-within:border-slate-300 transition-all">
            <textarea
              ref={composerRef}
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); }
              }}
              placeholder={isRecording ? "Drop a quick note while you talk…" : "Type a note (Enter to add, Shift+Enter for newline)…"}
              rows={1}
              className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400 resize-none max-h-32 leading-snug py-0.5"
              style={{ minHeight: 20 }}
            />
            {noteDraft.trim() && (
              <button onClick={addNote}
                className="ml-2 w-7 h-7 rounded-full bg-slate-900 hover:bg-black flex items-center justify-center text-white shrink-0">
                <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
              </button>
            )}
          </div>

          {/* Record FAB */}
          {!isRecording ? (
            <button onClick={startRecording}
              title="Start recording"
              className="w-11 h-11 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center text-white shadow-md shadow-rose-200 transition-all hover:scale-105 shrink-0">
              <Mic className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={stopRecording}
              title="Stop recording"
              className="relative w-11 h-11 rounded-full bg-slate-900 hover:bg-black flex items-center justify-center text-white shadow-md transition-all shrink-0">
              <span className="absolute inset-0 rounded-full bg-rose-500 opacity-30 animate-ping" />
              <Square className="w-4 h-4 relative" fill="white" />
            </button>
          )}
        </div>

        {/* Tiny meta footer (only when not empty) */}
        {(translatedCount > 0 || wordCount > 0) && (
          <p className="max-w-3xl mx-auto mt-1.5 text-[10px] text-slate-400 px-12">
            {wordCount} word{wordCount !== 1 ? "s" : ""} captured · Recognition: {langLabel}
            {translatedCount > 0 && <> · {translatedCount} auto-translated</>}
          </p>
        )}
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
        createdBy: preparedBy,
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
        <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 leading-none">Workspace</p>
                  <span className="font-bold text-slate-800 text-sm leading-tight">Meeting Minutes</span>
                </div>
              </div>
              <button onClick={() => { setShowNew(true); setSelected(null); setNewMode("live-speech"); }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition-all">
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
            <p className="text-slate-400 text-[10px] mt-1.5">{meetings?.length ?? 0} meeting{meetings?.length !== 1 ? "s" : ""} on file</p>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2">
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse mb-1.5" />
            ))}
            {!loading && meetings?.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-200" />
                </div>
                <p className="text-xs text-gray-400 font-medium">No meetings yet</p>
                <p className="text-[10px] text-gray-300">Click New to create one</p>
              </div>
            )}
            {meetings?.map(m => {
              const initials = (m.createdBy || "?").split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("");
              const isActive = selected?.id === m.id;
              return (
                <div key={m.id} onClick={() => { setSelected(m); setShowNew(false); setShowReport(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-all group cursor-pointer ${isActive ? "bg-blue-50 ring-1 ring-blue-200 shadow-sm" : "hover:bg-gray-50"}`}>
                  <div className="flex items-start gap-2.5">
                    {/* Creator avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm mt-0.5 ${isActive ? "bg-blue-500" : "bg-gradient-to-br from-slate-400 to-slate-500"}`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 mb-0.5">
                        <ModeBadge mode={modeOf(m)} />
                        <StatusBadge status={m.status} />
                      </div>
                      <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{m.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5 shrink-0" />{m.date}</span>
                        {m.createdBy && <span className="text-[10px] text-gray-400 truncate max-w-[80px]">by {m.createdBy.split(" ")[0]}</span>}
                      </div>
                    </div>
                    <button onClick={e => handleDelete(m.id, e)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right content panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">

          {/* NEW MEETING FORM */}
          {showNew && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Professional header */}
              <div className="relative px-5 pt-3 pb-2.5 flex-shrink-0 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                      {newMode === "record" ? <Mic className="w-3.5 h-3.5 text-white" /> : newMode === "live-speech" ? <Users className="w-3.5 h-3.5 text-white" /> : <Type className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div>
                      <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.18em] leading-none">New Meeting</p>
                      <h2 className="text-slate-800 text-sm font-bold leading-snug mt-0.5">
                        {newMode === "record" ? "Auto Record & Transcribe" : newMode === "live-speech" ? "Customer Meeting" : "Manual Notes"}
                      </h2>
                    </div>
                  </div>
                  <button onClick={() => { setShowNew(false); setSelectedAttendees([]); setForm({ title: "", date: new Date().toISOString().slice(0, 10), venue: "", projectId: "", projectName: "", projectMode: "select" }); }}
                    className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Mode toggle */}
                <div className="mt-2.5 flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg w-fit">
                  <button onClick={() => setNewMode("record")}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${newMode === "record" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                    <Mic className="w-2.5 h-2.5" /> Auto Record
                  </button>
                  <button onClick={() => setNewMode("manual")}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${newMode === "manual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                    <Type className="w-2.5 h-2.5" /> Manual Notes
                  </button>
                  <button onClick={() => setNewMode("live-speech")}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${newMode === "live-speech" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                    <Users className="w-2.5 h-2.5" /> Customer Meeting
                  </button>
                </div>
              </div>

              {newMode === "live-speech" && (
                <LiveSpeechMinutesView
                  createdBy={preparedBy}
                  onSaved={m => { setMeetings(prev => [m, ...(prev || [])]); setSelected(m); setShowNew(false); }}
                />
              )}
              {newMode !== "live-speech" && (
                <div className="flex-1 overflow-y-auto bg-[#f8fafc] px-4 py-3 space-y-2">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Meeting Title <span className="text-red-400 normal-case">*</span></label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} onKeyDown={e => e.key === "Enter" && form.title && form.date && handleCreate()} placeholder="e.g. Weekly Project Sync, Q1 Review, Sprint Planning…" autoFocus className="w-full text-sm font-semibold text-gray-800 placeholder:text-gray-300 placeholder:font-normal bg-transparent outline-none border-none" />
                    <div className={["mt-1.5 h-px rounded-full transition-all", form.title ? (newMode === "record" ? "bg-red-400" : "bg-blue-400") : "bg-gray-100"].join(" ")} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
                      <label className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1"><Calendar className="w-2.5 h-2.5" /> Date <span className="text-red-400 normal-case">*</span></label>
                      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full text-xs font-semibold text-gray-700 bg-transparent outline-none border-none" />
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
                      <label className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1"><MapPin className="w-2.5 h-2.5" /> Venue</label>
                      <input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="Conference Room A, Zoom…" className="w-full text-xs font-semibold text-gray-700 placeholder:text-gray-300 placeholder:font-normal bg-transparent outline-none border-none" />
                    </div>
                  </div>
                  <ProjectField form={form} setForm={setForm} projects={projects as any[]} />
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
                    <label className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                      <Users className="w-2.5 h-2.5" /> Attendees
                      {selectedAttendees.length > 0 && (
                        <span className={["ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white", newMode === "record" ? "bg-red-500" : "bg-blue-500"].join(" ")}>
                          {selectedAttendees.length}
                        </span>
                      )}
                    </label>
                    <AttendeesPicker selected={selectedAttendees} onChange={setSelectedAttendees} />
                  </div>
                </div>
              )}
              {newMode !== "live-speech" && (
                <div className="flex-shrink-0 px-4 py-2.5 bg-white border-t border-gray-100 flex items-center justify-between">
                  <p className="text-[11px] text-gray-400 italic">
                    {newMode === "record" ? "Recording starts after creation" : "Add notes & AI summary after creation"}
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setShowNew(false); setSelectedAttendees([]); setForm({ title: "", date: new Date().toISOString().slice(0, 10), venue: "", projectId: "", projectName: "", projectMode: "select" }); }} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
                    <button onClick={handleCreate} disabled={!form.title || !form.date}
                      className={["px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg", newMode === "record" ? "bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 shadow-red-200" : "bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 shadow-blue-200"].join(" ")}
                    >
                      {newMode === "record" ? <Mic className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                      {"Create & "}{newMode === "record" ? "Start Recording" : "Start Writing"}
                    </button>
                  </div>
                </div>
              )}
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
                      {selected.createdBy && (
                        <span className="flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                            {selected.createdBy.split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("")}
                          </span>
                          {selected.createdBy}
                        </span>
                      )}
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
