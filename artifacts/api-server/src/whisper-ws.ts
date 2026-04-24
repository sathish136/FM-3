import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";
import { URL } from "url";
import OpenAI, { toFile } from "openai";

// Realtime speech-to-text + translation via OpenAI Whisper + GPT-4o-mini.
//
//   browser ──(audio chunks)──▶ /api/whisper-ws ──▶ OpenAI Whisper (transcribe)
//                                                ──▶ GPT-4o-mini (translate to English)
//                              ◀──(segment payload)──┘
//
// The client records short audio segments (each one a self-contained WebM/Opus
// blob) and sends them as binary frames. For each segment we transcribe in the
// caller's spoken language, then translate to English in parallel, and stream
// both pieces back. Latency = transcribe latency (≈1–3s for a 4s clip).
//
// Why a complete blob per message rather than a continuous stream:
//   The Whisper REST API needs a self-decodable file. WebM/Opus chunks from a
//   single MediaRecorder.start(timeslice) call are NOT individually decodable —
//   only the first chunk has the EBML header. The client therefore stops &
//   restarts MediaRecorder every few seconds and ships each finished blob.

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
    });
  }
  return _openai;
}

// UI codes → Whisper ISO 639-1 language hints. Whisper supports all of these
// at production-grade quality, including Tamil/Telugu/Kannada/Malayalam etc.
function mapToWhisperLang(uiCode: string): string | undefined {
  switch (uiCode) {
    case "en-IN":
    case "en-US": return "en";
    case "hi-IN": return "hi";
    case "ta-IN": return "ta";
    case "te-IN": return "te";
    case "kn-IN": return "kn";
    case "ml-IN": return "ml";
    case "mr-IN": return "mr";
    case "gu-IN": return "gu";
    case "bn-IN": return "bn";
    case "pa-IN": return "pa";
    case "auto":  return undefined; // let Whisper auto-detect
    default:      return undefined;
  }
}

// Friendly language name we feed to GPT for the translation prompt.
const LANG_NAME: Record<string, string> = {
  "en-IN": "English",
  "en-US": "English",
  "hi-IN": "Hindi",
  "ta-IN": "Tamil",
  "te-IN": "Telugu",
  "kn-IN": "Kannada",
  "ml-IN": "Malayalam",
  "mr-IN": "Marathi",
  "gu-IN": "Gujarati",
  "bn-IN": "Bengali",
  "pa-IN": "Punjabi",
  auto:    "the spoken language",
};

export function setupWhisperWS(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false });

  httpServer.on("upgrade", (req: IncomingMessage, socket, head) => {
    if (!req.url) return;
    const pathname = req.url.split("?")[0];
    if (pathname !== "/api/whisper-ws") return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });
  console.log("[Whisper WS] ready at /api/whisper-ws");

  wss.on("connection", (clientWs: WebSocket, req) => {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      try { clientWs.send(JSON.stringify({ type: "error", message: "OPENAI_API_KEY not configured" })); } catch {}
      try { clientWs.close(); } catch {}
      return;
    }

    const u = new URL(req.url || "/", "http://x");
    const uiLang = u.searchParams.get("lang") || "auto";
    const whisperLang = mapToWhisperLang(uiLang);
    const langLabel = LANG_NAME[uiLang] || uiLang;
    let mime = u.searchParams.get("mime") || "audio/webm";
    let seq = 0;

    console.log(`[Whisper WS] client connected lang=${uiLang} whisper=${whisperLang ?? "auto"} mime=${mime}`);
    try { clientWs.send(JSON.stringify({ type: "ready", lang: uiLang, whisperLang: whisperLang ?? "auto" })); } catch {}

    clientWs.on("message", async (data, isBinary) => {
      // Control frames are JSON text — used to update the audio mime mid-session.
      if (!isBinary) {
        try {
          const msg = JSON.parse(data.toString());
          if (msg?.type === "meta" && typeof msg.mime === "string") mime = msg.mime;
          if (msg?.type === "stop") { try { clientWs.close(); } catch {} }
        } catch {}
        return;
      }

      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      // Ignore implausibly small blobs — almost certainly silence/noise that
      // Whisper would either reject or hallucinate over.
      if (buf.length < 2000) return;

      const id = ++seq;
      try {
        const baseMime = mime.split(";")[0].trim();
        const ext = baseMime.includes("webm") ? "webm"
          : baseMime.includes("mp4") ? "mp4"
          : baseMime.includes("ogg") ? "ogg"
          : baseMime.includes("wav") ? "wav"
          : "webm";

        const audioFile = await toFile(buf, `seg-${id}.${ext}`, { type: baseMime });

        // 1) Transcribe in the spoken language. We use whisper-1 explicitly: it
        //    has the broadest language coverage of OpenAI's STT models and
        //    accepts an explicit `language` hint.
        const transcribeOpts: any = {
          model: "whisper-1",
          file: audioFile,
          response_format: "json",
        };
        if (whisperLang) transcribeOpts.language = whisperLang;

        const tr = await getOpenAI().audio.transcriptions.create(transcribeOpts);
        const original = (tr.text || "").trim();

        // Whisper sometimes returns empty / placeholder text for silence.
        if (!original || /^[\.\s\-…]+$/.test(original)) {
          try { clientWs.send(JSON.stringify({ type: "segment", id, original: "", translation: "", skipped: true })); } catch {}
          return;
        }

        // Send the original immediately so the user sees their words ASAP.
        try {
          clientWs.send(JSON.stringify({ type: "segment", id, original, translation: null }));
        } catch {}

        // 2) Translate to English with GPT-4o-mini in a separate round trip.
        let translation = "";
        try {
          const tx = await getOpenAI().chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            max_tokens: 600,
            messages: [
              {
                role: "system",
                content:
                  `You are a professional simultaneous interpreter. Translate the user's text from ${langLabel} into natural English. ` +
                  `If the input is already English, return it unchanged. Output ONLY the translation — no quotes, no commentary, no language label.`,
              },
              { role: "user", content: original },
            ],
          });
          translation = (tx.choices[0]?.message?.content || "").trim();
        } catch (e: any) {
          translation = `(translation failed: ${e?.message || "error"})`;
        }

        try {
          clientWs.send(JSON.stringify({ type: "translation", id, translation }));
        } catch {}
      } catch (e: any) {
        console.error("[Whisper WS] segment error:", e?.message || e);
        try {
          clientWs.send(JSON.stringify({ type: "error", id, message: e?.message || String(e) }));
        } catch {}
      }
    });

    clientWs.on("close", () => {
      console.log(`[Whisper WS] client disconnected (${seq} segments processed)`);
    });
  });
}
