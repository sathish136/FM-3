import { Layout } from "@/components/Layout";
import {
  Layers, Eye, Share2, Plus, Loader2, FolderOpen,
  AlertCircle, Maximize2, Download, RefreshCw, ExternalLink, X,
} from "lucide-react";
import { useState, useEffect } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Presentation {
  name: string;
  project: string;
  project_name: string;
  presentation_name: string;
  file_upload: string | null;
  modified: string;
}

const PALETTE = [
  { bg: "#1a56db", text: "#ffffff" },
  { bg: "#6d28d9", text: "#ffffff" },
  { bg: "#047857", text: "#ffffff" },
  { bg: "#b45309", text: "#ffffff" },
  { bg: "#0e7490", text: "#ffffff" },
  { bg: "#be185d", text: "#ffffff" },
];

function fileExt(f: string) { return (f.split(".").pop() || "").toLowerCase(); }

function proxyAbsUrl(fileUrl: string): string {
  const origin = window.location.origin;
  const base = BASE;
  return `${origin}${base}/api/file-proxy?url=${encodeURIComponent(fileUrl)}`;
}

function officeViewerUrl(fileUrl: string): string {
  const abs = proxyAbsUrl(fileUrl);
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(abs)}`;
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

function DeckListItem({
  pres, index, active, onClick,
}: { pres: Presentation; index: number; active: boolean; onClick: () => void }) {
  const MOCK_VIEWS = [24, 67, 142, 89];
  const views = MOCK_VIEWS[index % MOCK_VIEWS.length];
  const date = pres.modified ? formatDate(pres.modified) : "—";
  const palette = PALETTE[index % PALETTE.length];
  const ext = pres.file_upload ? fileExt(pres.file_upload) : "";

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
          <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">
            {ext.toUpperCase() || "FILE"} · {date}
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

function FullscreenViewer({
  pres, onClose,
}: { pres: Presentation; onClose: () => void }) {
  const ext = pres.file_upload ? fileExt(pres.file_upload) : "";
  const isPptx = ext === "pptx" || ext === "ppt";
  const viewerUrl = pres.file_upload && isPptx ? officeViewerUrl(pres.file_upload) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-950 border-b border-gray-800 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <X className="w-4 h-4" /> Exit
        </button>
        <div className="h-4 w-px bg-gray-700" />
        <p className="text-sm font-semibold text-white truncate flex-1">
          {pres.presentation_name || pres.name}
        </p>
        {pres.project_name && (
          <p className="text-xs text-gray-400 uppercase tracking-wide">{pres.project_name}</p>
        )}
        {pres.file_upload && (
          <a
            href={proxyAbsUrl(pres.file_upload)}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Download
          </a>
        )}
      </div>
      <div className="flex-1 overflow-hidden bg-gray-900">
        {viewerUrl ? (
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0"
            title={pres.presentation_name || pres.name}
            allow="fullscreen"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No preview available for this file type.
          </div>
        )}
      </div>
    </div>
  );
}

export default function PresentationPage() {
  const [records, setRecords] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

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
  const viewerUrl = active?.file_upload && isPptx ? officeViewerUrl(active.file_upload) : null;
  const palette = PALETTE[activeIdx % PALETTE.length];

  return (
    <>
      {fullscreen && active && (
        <FullscreenViewer pres={active} onClose={() => setFullscreen(false)} />
      )}

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

              {/* ── Left panel: slide viewer ── */}
              <div className="lg:col-span-8 space-y-4">
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
                      {active?.file_upload && (
                        <a
                          href={proxyAbsUrl(active.file_upload)}
                          download
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>
                      )}
                      {active?.file_upload && (
                        <a
                          href={proxyAbsUrl(active.file_upload)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => setFullscreen(true)}
                        disabled={!isPptx || !active?.file_upload}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold shadow transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        Present
                      </button>
                      <button className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* ── Slide viewer ── */}
                  <div className="w-full rounded-xl overflow-hidden bg-gray-100 relative" style={{ paddingBottom: "56.25%" }}>
                    <div className="absolute inset-0">
                      {viewerUrl ? (
                        <iframe
                          key={viewerUrl}
                          src={viewerUrl}
                          className="w-full h-full border-0"
                          title={active?.presentation_name || active?.name}
                          allow="fullscreen"
                        />
                      ) : active ? (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center text-white p-8"
                          style={{ background: palette.bg }}
                        >
                          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
                            <Layers className="w-7 h-7 text-white" />
                          </div>
                          <p className="text-xs font-semibold text-white/60 mb-1 uppercase tracking-widest">
                            {active.project_name || "Presentation"}
                          </p>
                          <h2 className="text-xl font-bold text-center">
                            {active.presentation_name || active.name}
                          </h2>
                          <p className="text-sm text-white/50 mt-3">
                            {activeExt ? `${activeExt.toUpperCase()} — preview not available` : "No file attached"}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Info bar */}
                  {active?.file_upload && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase font-semibold tracking-wide">
                        {activeExt || "file"}
                      </span>
                      <span>·</span>
                      <span>{active.modified ? formatDate(active.modified) : "—"}</span>
                      {isPptx && (
                        <>
                          <span>·</span>
                          <span className="text-blue-500">Rendered via Office Online</span>
                        </>
                      )}
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
                      <DeckListItem
                        key={r.name}
                        pres={r}
                        index={i}
                        active={i === activeIdx}
                        onClick={() => setActiveIdx(i)}
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
