import { Layout } from "@/components/Layout";
import {
  FileText, Plus, Trash2, Sparkles, Calendar, Users,
  X, Save, Loader2, CheckCircle, Clock, Mic,
  Square, Type, Radio, MapPin, Search, FolderOpen,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useListProjects } from "@workspace/api-client-react";

type Meeting = {
  id: number; title: string; projectId: number | null;
  attendees: string | null; venue: string | null; date: string; rawNotes: string | null;
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
function RecordingView({ meeting, onUpdate }: { meeting: Meeting; onUpdate: (m: Meeting) => void }) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micError, setMicError] = useState("");
  const [duration, setDuration] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [transcript, setTranscript] = useState(meeting.rawNotes || "");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);
  const mimeRef = useRef("audio/webm");
  const transcriptRef = useRef(transcript);
  const transcriptBoxRef = useRef<HTMLDivElement>(null);
  transcriptRef.current = transcript;

  useEffect(() => { setTranscript(meeting.rawNotes || ""); }, [meeting.id]);
  useEffect(() => {
    if (transcriptBoxRef.current) transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
  }, [transcript]);

  const sendChunk = async () => {
    if (chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: mimeRef.current });
    chunksRef.current = [];
    if (blob.size < 3000) return;
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("audio", blob, `chunk.${mimeRef.current.includes("ogg") ? "ogg" : "webm"}`);
      const res = await fetch(`${BASE}/transcribe`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.transcript?.trim()) {
        setTranscript(prev => prev ? `${prev} ${data.transcript.trim()}` : data.transcript.trim());
      }
    } catch (e) {
      console.error("Transcription error:", e);
    }
    setTranscribing(false);
  };

  const startRecording = async () => {
    setMicError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg") ? "audio/ogg" : "";
      mimeRef.current = mime || "audio/webm";

      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(500);
      activeRef.current = true;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      chunkTimerRef.current = setInterval(sendChunk, 4000);
    } catch (err: any) {
      setMicError(err?.name === "NotAllowedError"
        ? "Microphone access denied. Please allow microphone access in your browser."
        : `Could not start microphone: ${err?.message}`);
    }
  };

  const stopRecording = async () => {
    activeRef.current = false;
    if (chunkTimerRef.current) { clearInterval(chunkTimerRef.current); chunkTimerRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setRecording(false);

    await new Promise(r => setTimeout(r, 400));
    await sendChunk();

    const text = transcriptRef.current.trim();
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

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className={`rounded-2xl border-2 p-5 flex flex-col items-center gap-3 transition-all ${recording ? "border-red-300 bg-red-50" : micError ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"}`}>
        {recording ? (
          <div className="flex items-center gap-2 text-red-600 font-semibold text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            Recording — {fmt(duration)}
          </div>
        ) : micError ? (
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
          {!recording && transcript.trim() && (
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 disabled:opacity-60 text-white rounded-xl font-semibold shadow-sm text-sm transition-all">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analyse
            </button>
          )}
        </div>
      </div>

      {/* Live transcript box */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
          <Radio className={`w-3 h-3 ${recording ? "text-red-500" : "text-blue-500"}`} />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Live Transcript</span>
          {transcribing
            ? <span className="ml-auto flex items-center gap-1 text-[10px] text-violet-500 font-semibold"><Loader2 className="w-2.5 h-2.5 animate-spin" />Transcribing…</span>
            : recording
            ? <span className="ml-auto flex items-center gap-1 text-[10px] text-red-500 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Listening…</span>
            : !transcript && <span className="ml-auto text-[10px] text-gray-400">Press Start Recording to begin</span>
          }
        </div>
        <div ref={transcriptBoxRef} className="px-4 py-3 min-h-[120px] max-h-64 overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {!transcript && (
            <span className="text-gray-300 italic">
              {recording ? "Speak now — text will appear every few seconds…" : "Your transcribed speech will appear here as you speak…"}
            </span>
          )}
          {transcript}
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

  const removeUser = (id: string) => onChange(selected.filter(s => s.id !== id));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filteredUsers.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHoverIdx(i => Math.min(i + 1, filteredUsers.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHoverIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filteredUsers[hoverIdx]) addUser(filteredUsers[hoverIdx]); }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Backspace" && !search && selected.length > 0) removeUser(selected[selected.length - 1].id);
  };

  useEffect(() => { setHoverIdx(0); }, [search]);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="min-h-[42px] w-full px-3 py-2 border border-gray-200 rounded-xl bg-white flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-400 transition-all"
        onClick={() => { inputRef.current?.focus(); setOpen(true); }}
      >
        {selected.map(u => (
          <span key={u.id} className="inline-flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-full text-xs font-medium">
            <UserAvatar user={u} size="sm" />
            <span className="max-w-[120px] truncate">{u.name}</span>
            <button type="button" onClick={e => { e.stopPropagation(); removeUser(u.id); }} className="ml-0.5 text-blue-400 hover:text-blue-700 transition-colors">
              <X className="w-3 h-3" />
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
          placeholder={selected.length === 0 ? "Search ERPNext users…" : "Add more…"}
          className="flex-1 min-w-[120px] outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent"
        />
        {loading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin flex-shrink-0" />}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {filteredUsers.length === 0 && !loading && (
            <div className="px-4 py-3 text-xs text-gray-400 text-center">
              {search ? "No users found" : "Start typing to search users"}
            </div>
          )}
          {filteredUsers.map((u, i) => (
            <button
              key={u.id}
              type="button"
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
              <CheckCircle className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100" />
            </button>
          ))}
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

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function MeetingMinutes() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newMode, setNewMode] = useState<"record" | "manual">("record");
  const [form, setForm] = useState({ title: "", date: new Date().toISOString().slice(0, 10), venue: "", projectId: "" });
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
    const created = await apiFetch("/meeting-minutes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        date: form.date,
        venue: form.venue || null,
        attendees: attendeesStr,
        projectId: form.projectId ? Number(form.projectId) : null,
        status: "draft",
        mode: newMode,
      }),
    }).then(r => r.json());
    setMeetings(prev => [created, ...(prev || [])]);
    setSelected({ ...created, mode: newMode });
    setShowNew(false);
    setForm({ title: "", date: new Date().toISOString().slice(0, 10), venue: "", projectId: "" });
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
            <div className="flex-1 flex flex-col bg-white">
              {/* Header bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${newMode === "record" ? "bg-red-50" : "bg-blue-50"}`}>
                    {newMode === "record" ? <Mic className="w-4 h-4 text-red-500" /> : <Type className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">New Meeting</h2>
                    <p className="text-[11px] text-gray-400">Create a meeting record</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mode toggle */}
                  <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg">
                    <button onClick={() => setNewMode("record")}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${newMode === "record" ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                      <Mic className="w-3 h-3" /> Record
                    </button>
                    <button onClick={() => setNewMode("manual")}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${newMode === "manual" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                      <Type className="w-3 h-3" /> Manual
                    </button>
                  </div>
                  <button onClick={() => { setShowNew(false); setSelectedAttendees([]); setForm({ title: "", date: new Date().toISOString().slice(0, 10), venue: "", projectId: "" }); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Form body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Meeting Title <span className="text-red-400">*</span></label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && form.title && form.date && handleCreate()}
                    placeholder="e.g. Weekly Sync, Q1 Review…"
                    autoFocus
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all placeholder:text-gray-300"
                  />
                </div>

                {/* Date + Venue */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5"><Calendar className="inline w-3 h-3 mr-1 text-gray-400" />Date <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5"><MapPin className="inline w-3 h-3 mr-1 text-gray-400" />Venue</label>
                    <input
                      value={form.venue}
                      onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                      placeholder="Room A, Zoom…"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all placeholder:text-gray-300"
                    />
                  </div>
                </div>

                {/* Project */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5"><FolderOpen className="inline w-3 h-3 mr-1 text-gray-400" />Project</label>
                  <select
                    value={form.projectId}
                    onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white transition-all"
                  >
                    <option value="">No project linked</option>
                    {(projects as any[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {/* Attendees */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    <Users className="inline w-3 h-3 mr-1 text-gray-400" />
                    Attendees
                    {selectedAttendees.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                        {selectedAttendees.length}
                      </span>
                    )}
                  </label>
                  <AttendeesPicker selected={selectedAttendees} onChange={setSelectedAttendees} />
                  {selectedAttendees.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedAttendees.map((u) => (
                        <div key={u.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full pl-1 pr-2.5 py-0.5">
                          <UserAvatar user={u} size="sm" />
                          <p className="text-[11px] font-semibold text-blue-800 truncate max-w-[100px]">{u.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
                <button
                  onClick={() => { setShowNew(false); setSelectedAttendees([]); setForm({ title: "", date: new Date().toISOString().slice(0, 10), venue: "", projectId: "" }); }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!form.title || !form.date}
                  className={`px-5 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 ${
                    newMode === "record"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {newMode === "record" ? <Mic className="w-3.5 h-3.5" /> : <Type className="w-3.5 h-3.5" />}
                  Create & {newMode === "record" ? "Start Recording" : "Start Writing"}
                </button>
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
                    {selected.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selected.venue}</span>}
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
