import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";

export function setupTranscribeWS(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req: IncomingMessage, socket, head) => {
    if (req.url === "/api/transcribe-ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });

  wss.on("connection", (clientWs: WebSocket) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      clientWs.send(JSON.stringify({ type: "error", message: "No API key configured" }));
      clientWs.close();
      return;
    }

    const openaiWs = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      }
    );

    openaiWs.on("open", () => {
      // Configure session: transcription only, server VAD, no audio output
      openaiWs.send(JSON.stringify({
        type: "session.update",
        session: {
          modalities: ["text"],
          input_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 600,
          },
        },
      }));
      clientWs.send(JSON.stringify({ type: "ready" }));
    });

    openaiWs.on("message", (raw) => {
      try {
        const event = JSON.parse(raw.toString());
        const t = event.type;

        if (t === "conversation.item.input_audio_transcription.delta") {
          clientWs.send(JSON.stringify({ type: "delta", text: event.delta }));
        } else if (t === "conversation.item.input_audio_transcription.completed") {
          clientWs.send(JSON.stringify({ type: "final", text: event.transcript }));
        } else if (t === "input_audio_buffer.speech_started") {
          clientWs.send(JSON.stringify({ type: "speech_started" }));
        } else if (t === "input_audio_buffer.speech_stopped") {
          clientWs.send(JSON.stringify({ type: "speech_stopped" }));
        } else if (t === "error") {
          console.error("OpenAI realtime error:", event.error);
          clientWs.send(JSON.stringify({ type: "error", message: event.error?.message || "OpenAI error" }));
        }
      } catch {}
    });

    openaiWs.on("error", (err) => {
      console.error("OpenAI WS error:", err.message);
      clientWs.send(JSON.stringify({ type: "error", message: err.message }));
    });

    openaiWs.on("close", () => {
      if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
    });

    clientWs.on("message", (data) => {
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.send(JSON.stringify({
          type: "input_audio_buffer.append",
          audio: data.toString(),
        }));
      }
    });

    clientWs.on("close", () => {
      if (openaiWs.readyState === WebSocket.OPEN) openaiWs.close();
    });
  });
}
