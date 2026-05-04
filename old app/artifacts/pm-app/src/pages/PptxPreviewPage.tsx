import { useEffect, useRef, useState } from "react";
import { init as initPptxPreview } from "pptx-preview";
import { Loader2, AlertCircle, Download } from "lucide-react";

export default function PptxPreviewPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const params = new URLSearchParams(window.location.search);
  const fileUrl = params.get("url") || "";

  useEffect(() => {
    if (!fileUrl || !containerRef.current) return;

    const container = containerRef.current;
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;

      const w = window.innerWidth;
      const h = window.innerHeight;

      container.innerHTML = "";

      let viewer: ReturnType<typeof initPptxPreview>;
      try {
        viewer = initPptxPreview(container, { width: w, height: h, mode: "slide" });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) { setErrorMsg(msg); setStatus("error"); }
        return;
      }

      try {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        await viewer.preview(buf);
        if (!cancelled) setStatus("ready");
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg || "Failed to load presentation");
        setStatus("error");
      }
    };

    requestAnimationFrame(() => requestAnimationFrame(() => run()));

    return () => { cancelled = true; };
  }, [fileUrl]);

  if (!fileUrl) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-950 text-gray-400 text-sm">
        No file URL provided.
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-gray-950 overflow-hidden relative">
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-gray-950">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-gray-300">Rendering slides…</p>
          <p className="text-xs text-gray-500">Parsing PPTX content, please wait</p>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-950 z-10">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-sm font-medium text-red-300">Could not render presentation</p>
          <p className="text-xs text-gray-500 max-w-xs text-center">{errorMsg}</p>
          <a
            href={fileUrl}
            download
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Download file
          </a>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ opacity: status === "loading" ? 0 : 1, transition: "opacity 0.3s ease" }}
      />
    </div>
  );
}
