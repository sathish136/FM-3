import { Layout } from "@/components/Layout";
import {
  FileText, Plus, Trash2, Sparkles, Calendar, Users,
  X, Save, Loader2, CheckCircle, Clock, Mic,
  Square, Type, Radio,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useListProjects } from "@workspace/api-client-react";

type Meeting = {
  id: number; title: string; projectId: number | null;
  attendees: string | null; date: string; rawNotes: string | null;
  aiSummary: string | null; actionItems: string | null;
  status: string; mode?: string; createdAt: string;
};

const BASE = "/api";

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, opts);
  if (!r.ok && r.status !== 204) throw new Error(await r.text());
  return r;
}

function ModeBadge({ mode }: { mode: string }) {
  return mode === "record"
    ? <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-bold tracking-wide text-red-600 bg-red-50 border border-red-200"><Mic className="w-2 h-2" />REC</span>
    : <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-bold tracking-wide text-blue-600 bg-blue-50 border border-blue-200"><Type className="w-2 h-2" />MANUAL</span>;
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

// ─── Live Recording Mode ────────────────────────────────────────────────────
declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

const CHUNK_INTERVAL_MS = 8000;

function RecordingView({ meeting, onUpdate }: { meeting: Meeting; onUpdate: (m: Meeting) => void }) {
  const [recording, setRecording] = useState(false);
  const [micStatus, setMicStatus] = useState<"idle" | "requesting" | "active" | "transcribing" | "error">("idle");
  const [micError, setMicError] = useState("");
  const [duration, setDuration] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [finalText, setFinalText] = useState(meeting.rawNotes || "");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef(false);
  const finalTextRef = useRef(finalText);
  const transcriptBoxRef = useRef<HTMLDivElement>(null);
  finalTextRef.current = finalText;

  useEffect(() => { setFinalText(meeting.rawNotes || ""); }, [meeting.id]);

  useEffect(() => {
    if (transcriptBoxRef.current) {
      transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
    }
  }, [finalText]);

  const transcribeChunk = async (blob: Blob) => {
    if (blob.size < 1000) return;
    setMicStatus("transcribing");
    try {
      const fd = new FormData();
      fd.append("audio", blob, "chunk.webm");
      const res = await fetch(`${BASE}/transcribe`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.transcript && data.transcript.trim()) {
        setFinalText(prev => prev ? prev + " " + data.transcript.trim() : data.transcript.trim());
      }
    } catch (e) {
      console.error("Transcription chunk error:", e);
    }
    if (recordingRef.current) setMicStatus("active");
  };

  const flushChunk = () => {
    if (!recorderRef.current || recorderRef.current.state !== "recording") return;
    recorderRef.current.requestData();
  };

  const startRecording = async () => {
    setMicError("");
    setMicStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
          const blob = new Blob(chunksRef.current, { type: mimeType });
          chunksRef.current = [];
          transcribeChunk(blob);
        }
      };

      recorder.start();
      recordingRef.current = true;
      setRecording(true);
      setMicStatus("active");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      chunkTimerRef.current = setInterval(flushChunk, CHUNK_INTERVAL_MS);
    } catch (err: any) {
      const msg = err?.name === "NotAllowedError"
        ? "Microphone access denied. Please allow microphone in your browser settings."
        : `Could not access microphone: ${err?.message || err}`;
      setMicError(msg);
      setMicStatus("error");
    }
  };

  const stopRecording = async () => {
    recordingRef.current = false;
    if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.requestData();
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setRecording(false);
    setMicStatus("idle");

    await new Promise(r => setTimeout(r, 600));
    const text = finalTextRef.current.trim();
    if (!text) return;
    const updated = await apiFetch(`/meeting-minutes/${meeting.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawNotes: text }),
    }).then(r => r.json());
    onUpdate(updated);
  };

  const handleGenerate = async () => {
    setGenerating(true); setStreamText("");
    await streamGenerate(meeting.id, setStreamText, m => { onUpdate(m); setGenerating(false); });
    setGenerating(false);
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const statusLabel = () => {
    if (!recording) return null;
    if (micStatus === "requesting") return <span className="ml-auto text-[10px] text-amber-500 font-semibold">Requesting mic…</span>;
    if (micStatus === "transcribing") return <span className="ml-auto flex items-center gap-1 text-[10px] text-violet-500 font-semibold"><Loader2 className="w-2.5 h-2.5 animate-spin" />Transcribing…</span>;
    return <span className="ml-auto flex items-center gap-1 text-[10px] text-red-500 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Listening…</span>;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className={`rounded-2xl border-2 p-5 flex flex-col items-center gap-3 transition-all ${recording ? "border-red-300 bg-red-50" : micStatus === "error" ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"}`}>
        {recording ? (
          <div className="flex items-center gap-2 text-red-600 font-semibold text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            Recording — {fmt(duration)}
          </div>
        ) : micStatus === "error" ? (
          <p className="text-sm text-orange-600 text-center max-w-xs">{micError}</p>
        ) : (
          <p className="text-sm text-gray-400">Press the button to start recording your meeting</p>
        )}

        {recording && (
          <div className="relative flex items-center justify-center w-16 h-16">
            <span className="absolute w-16 h-16 rounded-full bg-red-200 animate-ping opacity-50" />
            <div className="relative w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shadow-md">
              <Mic className="w-5 h-5 text-white" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          {!recording ? (
            <button onClick={startRecording}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-sm text-sm transition-colors">
              <Mic className="w-4 h-4" /> Start Recording
            </button>
          ) : (
            <button onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-semibold shadow-sm text-sm transition-colors">
              <Square className="w-3.5 h-3.5" /> Stop
            </button>
          )}
          {!recording && finalText.trim() && (
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 disabled:opacity-60 text-white rounded-xl font-semibold shadow-sm text-sm transition-all">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analyse
            </button>
          )}
        </div>

        {recording && (
          <p className="text-[11px] text-gray-400">Transcript updates every ~8 seconds as you speak</p>
        )}
      </div>

      {/* Live transcript box — always visible in voice/record mode */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
          <Radio className={`w-3 h-3 ${recording ? "text-red-500" : "text-blue-500"}`} />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Live Transcript</span>
          {statusLabel()}
          {!recording && !finalText && <span className="ml-auto text-[10px] text-gray-400">Press Start Recording to begin</span>}
        </div>
        <div ref={transcriptBoxRef} className="px-4 py-3 min-h-[120px] max-h-64 overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {!finalText && (
            <span className="text-gray-300 italic">
              {recording ? "Speak now — transcript will appear after each 8-second segment…" : "Your transcribed speech will appear here as you speak…"}
            </span>
          )}
          {finalText}
        </div>
      </div>

      {/* AI Summary */}
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

// ─── Manual Notes Mode ──────────────────────────────────────────────────────
function ManualView({ meeting, onUpdate }: { meeting: Meeting; onUpdate: (m: Meeting) => void }) {
  const [notes, setNotes] = useState(meeting.rawNotes || "");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");

  useEffect(() => { setNotes(meeting.rawNotes || ""); }, [meeting.id]);

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
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={10}
          placeholder={"Type your meeting notes here…\n\nInclude:\n• What was discussed\n• Decisions made\n• Who said what\n\nAI will generate a structured summary with action items."}
          className="w-full px-4 py-3 text-sm text-gray-700 focus:outline-none resize-none bg-white"
        />
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

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function MeetingMinutes() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newMode, setNewMode] = useState<"record" | "manual">("record");
  const [form, setForm] = useState({ title: "", date: new Date().toISOString().slice(0, 10), attendees: "", projectId: "" });
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
    const created = await apiFetch("/meeting-minutes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, date: form.date, attendees: form.attendees || null, projectId: form.projectId ? Number(form.projectId) : null, status: "draft", mode: newMode }),
    }).then(r => r.json());
    setMeetings(prev => [created, ...(prev || [])]);
    setSelected({ ...created, mode: newMode });
    setShowNew(false);
    setForm({ title: "", date: new Date().toISOString().slice(0, 10), attendees: "", projectId: "" });
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
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-800 text-sm">Meeting Minutes</span>
            </div>
            <button onClick={() => { setShowNew(true); setSelected(null); }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors">
              <Plus className="w-3 h-3" /> New
            </button>
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
              <div key={m.id} onClick={() => { setSelected(m); setShowNew(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-all group cursor-pointer ${selected?.id === m.id ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-gray-50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <ModeBadge mode={modeOf(m)} />
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{m.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{m.date}</p>
                  </div>
                  <button onClick={e => handleDelete(m.id, e)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 transition-all flex-shrink-0 mt-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right content panel ── */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc]">

          {/* NEW MEETING FORM */}
          {showNew && (
            <div className="max-w-xl mx-auto w-full p-8 space-y-5">
              <div className="flex items-center gap-2">
                <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"><X className="w-4 h-4" /></button>
                <h2 className="text-xl font-bold text-gray-900">New Meeting</h2>
              </div>

              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                <button onClick={() => setNewMode("record")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${newMode === "record" ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  <Mic className="w-3 h-3" /> Auto Record
                </button>
                <button onClick={() => setNewMode("manual")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${newMode === "manual" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  <Type className="w-3 h-3" /> Manual Notes
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3.5 shadow-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Meeting Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Weekly Project Review"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Project</label>
                    <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">No project</option>
                      {(projects as any[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1"><Users className="inline w-3 h-3 mr-1" />Attendees</label>
                  <input value={form.attendees} onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))}
                    placeholder="John, Jane, Bob…"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                  <button onClick={handleCreate} disabled={!form.title || !form.date}
                    className={`px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5 ${newMode === "record" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                    {newMode === "record" ? <Mic className="w-3.5 h-3.5" /> : <Type className="w-3.5 h-3.5" />}
                    Create & {newMode === "record" ? "Start Recording" : "Start Writing"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MEETING DETAIL */}
          {selected && !showNew && (
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
                    {selected.attendees && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{selected.attendees}</span>}
                  </div>
                </div>
              </div>

              {modeOf(selected) === "record"
                ? <RecordingView meeting={selected} onUpdate={handleUpdate} />
                : <ManualView meeting={selected} onUpdate={handleUpdate} />}
            </div>
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
