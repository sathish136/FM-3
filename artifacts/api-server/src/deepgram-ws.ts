import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";
import { URL } from "url";

// Realtime speech-to-text proxy: browser ↔ this server ↔ Deepgram.
// We never expose DEEPGRAM_API_KEY to the browser.
//
// Client connects to:  /api/deepgram-ws?lang=multi
// Then streams binary audio frames (e.g. webm/opus from MediaRecorder timeslice,
// or raw PCM16 from a ScriptProcessor/AudioWorklet) over the socket.
//
// The proxy forwards every Deepgram JSON frame back so the browser can render
// interim + final transcripts in true realtime (sub-second latency).

export function setupDeepgramWS(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req: IncomingMessage, socket, head) => {
    if (!req.url) return;
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/api/deepgram-ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });

  wss.on("connection", (clientWs: WebSocket, req) => {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      clientWs.send(JSON.stringify({ type: "error", message: "DEEPGRAM_API_KEY not configured" }));
      clientWs.close();
      return;
    }

    const u = new URL(req.url || "/", "http://x");
    const lang = u.searchParams.get("lang") || "multi"; // "multi" = auto-detect Tamil/Hindi/English/etc.
    const encoding = u.searchParams.get("encoding") || "opus"; // "opus" (webm) or "linear16"
    const sampleRate = u.searchParams.get("sampleRate") || "48000";

    // Build Deepgram listen URL — nova-2 supports multilingual streaming + smart formatting.
    const dgUrl = new URL("wss://api.deepgram.com/v1/listen");
    dgUrl.searchParams.set("model", "nova-2");
    if (lang === "multi") {
      dgUrl.searchParams.set("language", "multi");
    } else {
      dgUrl.searchParams.set("language", lang);
    }
    dgUrl.searchParams.set("smart_format", "true");
    dgUrl.searchParams.set("interim_results", "true");
    dgUrl.searchParams.set("punctuate", "true");
    dgUrl.searchParams.set("endpointing", "300");
    dgUrl.searchParams.set("utterance_end_ms", "1000");
    dgUrl.searchParams.set("vad_events", "true");
    if (encoding === "linear16") {
      dgUrl.searchParams.set("encoding", "linear16");
      dgUrl.searchParams.set("sample_rate", sampleRate);
      dgUrl.searchParams.set("channels", "1");
    }
    // For "opus" we send a continuous webm/ogg container; Deepgram auto-detects format.

    const dgWs = new WebSocket(dgUrl.toString(), {
      headers: { Authorization: `Token ${apiKey}` },
    });

    let dgOpen = false;
    const pending: Buffer[] = [];

    dgWs.on("open", () => {
      dgOpen = true;
      clientWs.send(JSON.stringify({ type: "ready" }));
      // Flush any audio that arrived before Deepgram was open
      while (pending.length) {
        const buf = pending.shift()!;
        try { dgWs.send(buf); } catch {}
      }
    });

    dgWs.on("message", (raw) => {
      try {
        const text = raw.toString();
        // Forward Deepgram JSON straight through; client knows the format.
        if (clientWs.readyState === WebSocket.OPEN) clientWs.send(text);
      } catch {}
    });

    dgWs.on("error", (err) => {
      console.error("[Deepgram WS] error:", err.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "error", message: err.message }));
      }
    });

    dgWs.on("close", (code, reason) => {
      console.log("[Deepgram WS] closed:", code, reason.toString());
      if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
    });

    // Client → Deepgram: binary audio
    clientWs.on("message", (data, isBinary) => {
      if (!isBinary) {
        // Allow client to send a JSON control message such as { type: "stop" }
        try {
          const msg = JSON.parse(data.toString());
          if (msg?.type === "stop" && dgOpen) {
            try { dgWs.send(JSON.stringify({ type: "CloseStream" })); } catch {}
          }
        } catch {}
        return;
      }
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      if (dgOpen && dgWs.readyState === WebSocket.OPEN) {
        try { dgWs.send(buf); } catch {}
      } else {
        pending.push(buf);
      }
    });

    clientWs.on("close", () => {
      try {
        if (dgWs.readyState === WebSocket.OPEN) {
          dgWs.send(JSON.stringify({ type: "CloseStream" }));
          dgWs.close();
        }
      } catch {}
    });

    // Keep-alive ping every 8s — Deepgram closes idle sockets after ~10s of silence.
    const ka = setInterval(() => {
      if (dgWs.readyState === WebSocket.OPEN) {
        try { dgWs.send(JSON.stringify({ type: "KeepAlive" })); } catch {}
      } else {
        clearInterval(ka);
      }
    }, 8000);
    dgWs.on("close", () => clearInterval(ka));
  });
}
