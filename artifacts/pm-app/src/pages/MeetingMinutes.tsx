import { Layout } from "@/components/Layout";
import {
  FileText, Plus, Trash2, Sparkles, ChevronRight,
  Calendar, Users, X, Save, Loader2, CheckCircle,
  Clock, ArrowLeft,
} from "lucide-react";
import { useState, useRef } from "react";
import { useListProjects } from "@workspace/api-client-react";

type Meeting = {
  id: number;
  title: string;
  projectId: number | null;
  attendees: string | null;
  date: string;
  rawNotes: string | null;
  aiSummary: string | null;
  actionItems: string | null;
  status: string;
  createdAt: string;
};

const BASE = "/api";

async function fetchMeetings(): Promise<Meeting[]> {
  const r = await fetch(`${BASE}/meeting-minutes`);
  return r.json();
}

async function createMeeting(data: Partial<Meeting>): Promise<Meeting> {
  const r = await fetch(`${BASE}/meeting-minutes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return r.json();
}

async function updateMeeting(id: number, data: Partial<Meeting>): Promise<Meeting> {
  const r = await fetch(`${BASE}/meeting-minutes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return r.json();
}

async function deleteMeeting(id: number) {
  await fetch(`${BASE}/meeting-minutes/${id}`, { method: "DELETE" });
}

function statusBadge(status: string) {
  if (status === "completed") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-[10px] font-semibold"><CheckCircle className="w-2.5 h-2.5" />Completed</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold"><Clock className="w-2.5 h-2.5" />Draft</span>;
}

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="text-sm text-gray-700 space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <p key={i} className="font-bold text-gray-900 mt-3 mb-1 text-base">{line.slice(3)}</p>;
        if (line.startsWith("- ")) return <p key={i} className="pl-4 before:content-['•'] before:mr-2 before:text-blue-500">{line.slice(2)}</p>;
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export default function MeetingMinutes() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "", date: new Date().toISOString().slice(0, 10),
    attendees: "", rawNotes: "", projectId: "" as string | number,
  });

  const { data: projects = [] } = useListProjects();

  const loadMeetings = async () => {
    setLoading(true);
    const data = await fetchMeetings();
    setMeetings(data);
    setLoading(false);
  };

  if (meetings === null && !loading) loadMeetings();

  const handleNew = async () => {
    if (!form.title || !form.date) return;
    const created = await createMeeting({
      title: form.title,
      date: form.date,
      attendees: form.attendees || null,
      rawNotes: form.rawNotes || null,
      projectId: form.projectId ? Number(form.projectId) : null,
      status: "draft",
    });
    setMeetings(prev => [created, ...(prev || [])]);
    setSelected(created);
    setShowNew(false);
    setForm({ title: "", date: new Date().toISOString().slice(0, 10), attendees: "", rawNotes: "", projectId: "" });
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    setSaving(true);
    const updated = await updateMeeting(selected.id, { rawNotes: selected.rawNotes });
    setSelected(updated);
    setMeetings(prev => prev?.map(m => m.id === updated.id ? updated : m) || null);
    setSaving(false);
  };

  const handleGenerate = async () => {
    if (!selected) return;
    await handleSaveNotes();
    setGenerating(true);
    setStreamText("");

    const res = await fetch(`${BASE}/meeting-minutes/${selected.id}/generate`, { method: "POST" });
    if (!res.body) { setGenerating(false); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.content) { full += parsed.content; setStreamText(full); }
            if (parsed.done) {
              const refreshed = await fetch(`${BASE}/meeting-minutes/${selected.id}`).then(r => r.json());
              setSelected(refreshed);
              setMeetings(prev => prev?.map(m => m.id === refreshed.id ? refreshed : m) || null);
            }
          } catch {}
        }
      }
    }
    setGenerating(false);
  };

  const handleDelete = async (id: number) => {
    await deleteMeeting(id);
    setMeetings(prev => prev?.filter(m => m.id !== id) || []);
    if (selected?.id === id) setSelected(null);
  };

  const projectName = (id: number | null) => {
    if (!id) return null;
    return (projects as any[]).find(p => p.id === id)?.name;
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-48px)]">
        {/* Left panel — list */}
        <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-800 text-sm">Meeting Minutes</span>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {loading && (
              <div className="flex flex-col gap-2 px-3 pt-2">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />)}
              </div>
            )}
            {!loading && meetings?.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <FileText className="w-8 h-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No meetings yet</p>
                <p className="text-xs text-gray-300 mt-1">Click New to create one</p>
              </div>
            )}
            {meetings?.map(m => (
              <button
                key={m.id}
                onClick={() => { setSelected(m); setShowNew(false); setStreamText(""); }}
                className={`w-full text-left px-3 py-3 mx-1 rounded-lg transition-all group relative ${selected?.id === m.id ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}
                style={{ width: "calc(100% - 8px)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{m.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{m.date}
                    </p>
                    <div className="mt-1">{statusBadge(m.status)}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(m.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0 mt-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right panel — detail / new form */}
        <div className="flex-1 flex flex-col bg-[#f8fafc] overflow-y-auto">
          {/* NEW MEETING FORM */}
          {showNew && (
            <div className="max-w-2xl mx-auto w-full p-8 space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <h2 className="text-xl font-bold text-gray-900">New Meeting</h2>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Meeting Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Weekly Project Review"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                    placeholder="John, Jane, Bob..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Raw Notes</label>
                  <textarea value={form.rawNotes} onChange={e => setForm(f => ({ ...f, rawNotes: e.target.value }))}
                    rows={6} placeholder="Paste or type your raw meeting notes here. AI will generate a structured summary."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                  <button onClick={handleNew} disabled={!form.title || !form.date}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5" /> Create Meeting
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DETAIL VIEW */}
          {selected && !showNew && (
            <div className="max-w-3xl mx-auto w-full p-8 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {statusBadge(selected.status)}
                    {selected.projectId && (
                      <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                        {projectName(selected.projectId)}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{selected.title}</h1>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{selected.date}</span>
                    {selected.attendees && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{selected.attendees}</span>}
                  </div>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow-sm transition-all flex-shrink-0"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generating ? "Generating…" : "Generate with AI"}
                </button>
              </div>

              {/* Raw notes editor */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Raw Notes</span>
                  <button onClick={handleSaveNotes} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </button>
                </div>
                <textarea
                  value={selected.rawNotes || ""}
                  onChange={e => setSelected(s => s ? { ...s, rawNotes: e.target.value } : s)}
                  rows={8}
                  placeholder="Type or paste your raw meeting notes here, then click Generate with AI..."
                  className="w-full px-5 py-4 text-sm text-gray-700 focus:outline-none resize-none bg-white"
                />
              </div>

              {/* AI Output */}
              {(generating || selected.aiSummary) && (
                <div className="bg-white rounded-2xl border border-violet-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-blue-50 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    <span className="text-sm font-semibold text-violet-800">AI Summary</span>
                    {generating && <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin ml-auto" />}
                  </div>
                  <div className="px-5 py-4">
                    <MarkdownContent text={generating ? streamText : ((selected.aiSummary || "") + (selected.actionItems ? "\n## Action Items\n" + selected.actionItems : ""))} />
                  </div>
                </div>
              )}

              {/* Action items (if completed) */}
              {!generating && selected.actionItems && (
                <div className="bg-white rounded-2xl border border-green-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-green-100 bg-green-50 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-800">Action Items</span>
                  </div>
                  <div className="px-5 py-4">
                    <MarkdownContent text={selected.actionItems} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EMPTY STATE */}
          {!selected && !showNew && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Meeting Minutes</h2>
              <p className="text-sm text-gray-400 mt-1 max-w-sm">
                Record your meeting notes and let AI generate a structured summary with action items.
              </p>
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
