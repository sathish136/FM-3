import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Monitor, WifiOff, X, Maximize2, Minimize2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface MachineInfo {
  id: number;
  name: string;
  site: string;
}

type ConnState = "connecting" | "connected" | "offline" | "error";

export default function RemoteViewer() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [machine, setMachine] = useState<MachineInfo | null>(null);
  const [connState, setConnState] = useState<ConnState>("connecting");
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);

  const fpsRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastPingRef = useRef(0);
  const sessionStartRef = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      setSessionDuration(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const fetchMachine = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/remote-access/machines/${id}`);
      if (res.ok) setMachine(await res.json());
    } catch {}
  }, [id]);

  useEffect(() => { fetchMachine(); }, [fetchMachine]);

  const getUser = () => {
    try {
      const u = JSON.parse(localStorage.getItem("flowmatrix_user") || "{}");
      return u.email || "viewer";
    } catch { return "viewer"; }
  };

  useEffect(() => {
    if (!id) return;

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const wsUrl = `${proto}://${host}/api/remote-ws?role=viewer&machineId=${id}&user=${encodeURIComponent(getUser())}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.binaryType = "blob";

    ws.onopen = () => {};

    ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        frameCountRef.current++;
        const url = URL.createObjectURL(event.data);
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) { URL.revokeObjectURL(url); return; }
          const ctx = canvas.getContext("2d");
          if (!ctx) { URL.revokeObjectURL(url); return; }
          if (canvas.width !== img.width || canvas.height !== img.height) {
            canvas.width = img.width;
            canvas.height = img.height;
          }
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
        };
        img.src = url;
        return;
      }

      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "connected") {
          setConnState(msg.online ? "connected" : "offline");
        }
        if (msg.type === "machine_status") {
          setConnState(msg.online ? "connected" : "offline");
        }
        if (msg.type === "frame") {
          frameCountRef.current++;
          if (msg.ping_ts) {
            setLatency(Date.now() - msg.ping_ts);
          }
          if (msg.data && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            const img = new Image();
            img.onload = () => {
              if (canvas.width !== img.width || canvas.height !== img.height) {
                canvas.width = img.width;
                canvas.height = img.height;
              }
              ctx.drawImage(img, 0, 0);
            };
            img.src = `data:image/jpeg;base64,${msg.data}`;
          }
        }
        if (msg.type === "pong") {
          setLatency(Date.now() - lastPingRef.current);
        }
      } catch {}
    };

    ws.onclose = () => {
      setConnState("error");
    };

    ws.onerror = () => {
      setConnState("error");
    };

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        lastPingRef.current = Date.now();
        ws.send(JSON.stringify({ type: "ping", ts: lastPingRef.current }));
      }
    }, 3000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [id]);

  const sendInput = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    sendInput({ type: "mousemove", ...getCanvasCoords(e) });
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    sendInput({ type: "mousedown", button: e.button, ...getCanvasCoords(e) });
  };

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    sendInput({ type: "mouseup", button: e.button, ...getCanvasCoords(e) });
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    sendInput({ type: "scroll", dx: e.deltaX, dy: e.deltaY, ...getCanvasCoords(e) });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    sendInput({ type: "keydown", key: e.key, code: e.code, modifiers: { ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey } });
  };

  const onKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    sendInput({ type: "keyup", key: e.key, code: e.code });
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black flex flex-col outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            connState === "connected" ? "bg-emerald-400 animate-pulse" : "bg-red-400"
          )} />
          <Monitor className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-white">
            {machine ? `${machine.name} · ${machine.site}` : "Remote Viewer"}
          </span>
        </div>

        <div className="flex items-center gap-3 ml-auto text-xs text-slate-400">
          {connState === "connected" && (
            <>
              <span className="bg-slate-800 px-2 py-1 rounded-lg">{fps} FPS</span>
              {latency > 0 && <span className="bg-slate-800 px-2 py-1 rounded-lg">{latency}ms</span>}
              <span className="bg-slate-800 px-2 py-1 rounded-lg">{formatDuration(sessionDuration)}</span>
            </>
          )}
          <button
            onClick={() => setShowInfo(v => !v)}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate("/remote-access")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Disconnect
          </button>
        </div>
      </div>

      {/* Viewer area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {connState === "connecting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-300 text-sm">Connecting to remote machine...</p>
          </div>
        )}

        {connState === "offline" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <WifiOff className="w-12 h-12 text-slate-600" />
            <p className="text-slate-300 text-sm font-medium">Machine is offline</p>
            <p className="text-slate-500 text-xs">Start the remote agent on the IPC machine to connect</p>
          </div>
        )}

        {connState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <WifiOff className="w-12 h-12 text-red-500" />
            <p className="text-slate-300 text-sm font-medium">Connection lost</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
            >
              Reconnect
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={cn(
            "max-w-full max-h-full object-contain cursor-crosshair select-none",
            connState !== "connected" && "opacity-20"
          )}
          onMouseMove={onMouseMove}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onContextMenu={e => e.preventDefault()}
          onWheel={onWheel}
          style={{ imageRendering: "crisp-edges" }}
        />
      </div>

      {/* Info overlay */}
      {showInfo && (
        <div className="absolute top-14 right-4 bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs text-slate-300 space-y-1.5 w-56 z-20">
          <p className="font-semibold text-white mb-2">Session Info</p>
          <p>Machine: <span className="text-slate-400">{machine?.name || id}</span></p>
          <p>Site: <span className="text-slate-400">{machine?.site || "—"}</span></p>
          <p>Status: <span className={connState === "connected" ? "text-emerald-400" : "text-red-400"}>{connState}</span></p>
          <p>FPS: <span className="text-slate-400">{fps}</span></p>
          <p>Latency: <span className="text-slate-400">{latency}ms</span></p>
          <p>Duration: <span className="text-slate-400">{formatDuration(sessionDuration)}</span></p>
          <hr className="border-slate-700 my-2" />
          <p className="text-slate-500">Click canvas to capture keyboard input. Right-click is suppressed.</p>
        </div>
      )}
    </div>
  );
}
