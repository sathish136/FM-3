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

// UI codes → Whisper ISO 639-1 language hints. The UI now sends bare ISO codes
// for international languages (e.g. "en", "ta", "fr", "ja"). "auto" and any
// unknown code fall through to Whisper's built-in auto-detection.
const WHISPER_LANGS = new Set([
  "en","ta","hi","ar","bn","zh","nl","fr","de","el","he","id","it",
  "ja","ko","ms","fa","pl","pt","ru","es","sv","th","tr","uk","ur","vi",
  // Filipino isn't in Whisper's list — fall back to Tagalog ("tl") below.
  "tl",
]);
function mapToWhisperLang(uiCode: string): string | undefined {
  if (!uiCode || uiCode === "auto") return undefined;
  // Filipino → Tagalog (closest Whisper-supported variant).
  if (uiCode === "fil") return "tl";
  // Backward-compat for old hyphenated codes if any cached client still sends them.
  if (uiCode.includes("-")) {
    const base = uiCode.split("-")[0].toLowerCase();
    return WHISPER_LANGS.has(base) ? base : undefined;
  }
  return WHISPER_LANGS.has(uiCode) ? uiCode : undefined;
}

// Whisper is famous for inventing greetings, captions and "Thanks for watching"
// out of silence or background noise. Drop anything that looks like one of
// these stock hallucinations rather than displaying it as a real transcript.
const HALLUCINATION_PATTERNS: RegExp[] = [
  // English captioner / YouTube boilerplate
  /^thanks? (for|to) watch(ing)?[!.\s]*$/i,
  /^thank you( for watching)?[!.\s]*$/i,
  /^please (subscribe|like and subscribe)[!.\s]*$/i,
  /^subtitles? (by|done by|provided by) .+$/i,
  /^(captions|subtitles?) by .+$/i,
  /^transcribed by .+$/i,
  /^\[?(music|applause|silence|laughter)\]?[!.\s]*$/i,
  /^you$/i,
  // Tamil hallucination — bare "வணக்கம்" (Hello) with optional punctuation
  /^வணக்கம்[!.\s]*$/,
  // Hindi/Devanagari bare greeting
  /^नमस्ते[!.\s]*$/,
  /^नमस्कார[!.\s]*$/,
  // Common Japanese hallucinations Whisper produces from silence/noise.
  // (Whisper was trained on a lot of anime/YouTube subtitles in Japanese.)
  /^おい[、。!.\s]*行(く|こ)う?ぞ?[!.\s]*$/,
  /^ご視聴(ありがとうございました|いただきありがとうございます)[!.\s]*$/,
  /^チャンネル登録(お願いします)?[!.\s]*$/,
  /^字幕(by|提供)?.*$/i,
  /^(はい|うん|ええ|あの|えー)[!.\s]*$/,
  // Korean filler hallucinations
  /^(네|예|아|음)[!.\s]*$/,
  // Pure punctuation / dots
  /^[\.\s\-…।!?]+$/,
];

function isLikelyHallucination(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.length < 3) return true;
  return HALLUCINATION_PATTERNS.some((re) => re.test(t));
}

// Each language is associated with one or more Unicode script ranges. When the
// user has explicitly selected a language, we drop any transcript that is
// dominated by characters from a *different* script — this catches the classic
// "Tamil session randomly returns Japanese" Whisper failure mode.
type ScriptName = "latin" | "tamil" | "devanagari" | "bengali" | "gurmukhi"
  | "gujarati" | "oriya" | "telugu" | "kannada" | "malayalam"
  | "arabic" | "hebrew" | "cjk" | "hangul" | "kana" | "thai" | "cyrillic" | "greek";

// Codepoint test for each script we care about.
const SCRIPT_TESTS: Record<ScriptName, (cp: number) => boolean> = {
  latin:      (c) => (c >= 0x0041 && c <= 0x024F) || (c >= 0x1E00 && c <= 0x1EFF),
  tamil:      (c) => c >= 0x0B80 && c <= 0x0BFF,
  devanagari: (c) => c >= 0x0900 && c <= 0x097F,
  bengali:    (c) => c >= 0x0980 && c <= 0x09FF,
  gurmukhi:   (c) => c >= 0x0A00 && c <= 0x0A7F,
  gujarati:   (c) => c >= 0x0A80 && c <= 0x0AFF,
  oriya:      (c) => c >= 0x0B00 && c <= 0x0B7F,
  telugu:     (c) => c >= 0x0C00 && c <= 0x0C7F,
  kannada:    (c) => c >= 0x0C80 && c <= 0x0CFF,
  malayalam:  (c) => c >= 0x0D00 && c <= 0x0D7F,
  arabic:     (c) => (c >= 0x0600 && c <= 0x06FF) || (c >= 0x0750 && c <= 0x077F),
  hebrew:     (c) => c >= 0x0590 && c <= 0x05FF,
  cjk:        (c) => (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF),
  hangul:     (c) => (c >= 0xAC00 && c <= 0xD7AF) || (c >= 0x1100 && c <= 0x11FF),
  kana:       (c) => (c >= 0x3040 && c <= 0x309F) || (c >= 0x30A0 && c <= 0x30FF),
  thai:       (c) => c >= 0x0E00 && c <= 0x0E7F,
  cyrillic:   (c) => c >= 0x0400 && c <= 0x04FF,
  greek:      (c) => c >= 0x0370 && c <= 0x03FF,
};

// Which scripts are acceptable for a given UI language. English uses Latin;
// most Indian languages use their own script; Japanese accepts both kana and
// CJK; Filipino/Indonesian/etc. use Latin; etc.
const LANG_SCRIPTS: Record<string, ScriptName[]> = {
  en:  ["latin"],
  ta:  ["tamil"],
  hi:  ["devanagari"],
  ar:  ["arabic"],
  bn:  ["bengali"],
  zh:  ["cjk"],
  nl:  ["latin"],
  fil: ["latin"],
  fr:  ["latin"],
  de:  ["latin"],
  el:  ["greek"],
  he:  ["hebrew"],
  id:  ["latin"],
  it:  ["latin"],
  ja:  ["kana", "cjk"],
  ko:  ["hangul"],
  ms:  ["latin"],
  fa:  ["arabic"],
  pl:  ["latin"],
  pt:  ["latin"],
  ru:  ["cyrillic"],
  es:  ["latin"],
  sv:  ["latin"],
  th:  ["thai"],
  tr:  ["latin"],
  uk:  ["cyrillic"],
  ur:  ["arabic"],
  vi:  ["latin"],
};

// Returns true iff the transcript is in a script that does NOT match the
// user-selected language. A small sprinkle of Latin punctuation/digits is
// always allowed (numbers, brand names, "OK", etc.).
function isWrongScript(text: string, uiLang: string): boolean {
  const allowed = LANG_SCRIPTS[uiLang];
  if (!allowed || !text) return false;

  const allowedTests = allowed.map((s) => SCRIPT_TESTS[s]);
  // Latin is always considered "neutral" — most transcripts contain digits,
  // brand names, or English loan words.
  const latinNeutral = !allowed.includes("latin");

  let allowedCount = 0;
  let foreignCount = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    // Skip whitespace, ASCII digits, and ASCII punctuation entirely.
    if (cp <= 0x007F && !((cp >= 0x0041 && cp <= 0x005A) || (cp >= 0x0061 && cp <= 0x007A))) continue;

    const isAllowed = allowedTests.some((t) => t(cp));
    if (isAllowed) { allowedCount++; continue; }

    if (latinNeutral && SCRIPT_TESTS.latin(cp)) continue;

    // Any character belonging to a known *other* script counts as foreign.
    for (const [name, test] of Object.entries(SCRIPT_TESTS) as [ScriptName, (c: number) => boolean][]) {
      if (allowed.includes(name)) continue;
      if (name === "latin" && latinNeutral) continue;
      if (test(cp)) { foreignCount++; break; }
    }
  }

  if (allowedCount === 0 && foreignCount === 0) return false;
  // Drop the segment if more than ~30% of the meaningful characters are from
  // an unrelated script. This is generous enough that a single stray symbol
  // won't trigger a false drop, but catches "おい、行くぞ" hard.
  return foreignCount / Math.max(1, allowedCount + foreignCount) > 0.3;
}

// Friendly language name we feed to GPT for the translation prompt.
const LANG_NAME: Record<string, string> = {
  auto: "the spoken language",
  en:   "English",
  ta:   "Tamil",
  hi:   "Hindi",
  ar:   "Arabic",
  bn:   "Bengali",
  zh:   "Chinese (Mandarin)",
  nl:   "Dutch",
  fil:  "Filipino",
  fr:   "French",
  de:   "German",
  el:   "Greek",
  he:   "Hebrew",
  id:   "Indonesian",
  it:   "Italian",
  ja:   "Japanese",
  ko:   "Korean",
  ms:   "Malay",
  fa:   "Persian",
  pl:   "Polish",
  pt:   "Portuguese",
  ru:   "Russian",
  es:   "Spanish",
  sv:   "Swedish",
  th:   "Thai",
  tr:   "Turkish",
  uk:   "Ukrainian",
  ur:   "Urdu",
  vi:   "Vietnamese",
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
    // Track the last accepted transcript so we can suppress duplicate back-to-back
    // outputs (another Whisper-on-silence failure mode where the model just
    // echoes the previous segment).
    let lastAccepted = "";
    // Pitch (Hz) of the most recent meta frame — attached to the next audio
    // blob and round-tripped to the client for speaker diarization.
    let pendingPitchHz = 0;

    console.log(`[Whisper WS] client connected lang=${uiLang} whisper=${whisperLang ?? "auto"} mime=${mime}`);
    try { clientWs.send(JSON.stringify({ type: "ready", lang: uiLang, whisperLang: whisperLang ?? "auto" })); } catch {}

    clientWs.on("message", async (data, isBinary) => {
      // Control frames are JSON text — used to update the audio mime mid-session
      // and to attach pitch metadata to the next audio blob.
      if (!isBinary) {
        try {
          const msg = JSON.parse(data.toString());
          if (msg?.type === "meta") {
            if (typeof msg.mime === "string") mime = msg.mime;
            if (typeof msg.pitchHz === "number") pendingPitchHz = msg.pitchHz;
          }
          if (msg?.type === "stop") { try { clientWs.close(); } catch {} }
        } catch {}
        return;
      }
      const pitchForThisBlob = pendingPitchHz;
      pendingPitchHz = 0;

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
        //    accepts an explicit `language` hint. verbose_json gives us per-
        //    segment confidence (no_speech_prob, avg_logprob) which is the
        //    most reliable way to detect Whisper hallucinations.
        const transcribeOpts: any = {
          model: "whisper-1",
          file: audioFile,
          response_format: "verbose_json",
          temperature: 0,
        };
        if (whisperLang) transcribeOpts.language = whisperLang;

        const tr: any = await getOpenAI().audio.transcriptions.create(transcribeOpts);
        const original = (tr.text || "").trim();

        // Confidence-based filter: drop segments Whisper itself thinks were
        // mostly silence, or where its acoustic confidence is very low. This
        // catches the long, plausible-looking Tamil hallucinations (e.g.
        // "எப்போது கிளம்பலாம்?", "வாழ்த்துகள்") that pass the regex filter.
        const segs: any[] = Array.isArray(tr.segments) ? tr.segments : [];
        if (segs.length > 0) {
          const avgNoSpeech = segs.reduce((a, s) => a + (s.no_speech_prob ?? 0), 0) / segs.length;
          const avgLogProb  = segs.reduce((a, s) => a + (s.avg_logprob   ?? 0), 0) / segs.length;
          const maxComp     = segs.reduce((a, s) => Math.max(a, s.compression_ratio ?? 0), 0);
          // Loose thresholds: only drop the *clearly* hallucinated segments.
          // Real speech in noisy environments routinely has avg_logprob around
          // -0.7 to -1.0, so we keep that and only drop very low confidence.
          if (avgNoSpeech > 0.75 || avgLogProb < -1.4 || maxComp > 2.6) {
            console.log(
              `[Whisper WS] dropped low-confidence seg=${id}: "${original}" ` +
              `noSpeech=${avgNoSpeech.toFixed(2)} logProb=${avgLogProb.toFixed(2)} comp=${maxComp.toFixed(2)}`
            );
            try { clientWs.send(JSON.stringify({ type: "segment", id, original: "", translation: "", skipped: true })); } catch {}
            return;
          }
        }

        // Skip well-known Whisper hallucinations on silent / noise-only segments.
        if (isLikelyHallucination(original)) {
          console.log(`[Whisper WS] dropped hallucination seg=${id}: "${original}"`);
          try { clientWs.send(JSON.stringify({ type: "segment", id, original: "", translation: "", skipped: true })); } catch {}
          return;
        }

        // Drop transcripts that came back in the wrong script — i.e. user
        // selected Tamil but Whisper produced Japanese. This is the most
        // common accuracy complaint with the realtime pipeline.
        if (uiLang !== "auto" && isWrongScript(original, uiLang)) {
          console.log(`[Whisper WS] dropped wrong-script seg=${id} (expected ${uiLang}): "${original}"`);
          try { clientWs.send(JSON.stringify({ type: "segment", id, original: "", translation: "", skipped: true })); } catch {}
          return;
        }
        // Suppress identical back-to-back outputs (Whisper echoing itself).
        if (original === lastAccepted) {
          console.log(`[Whisper WS] dropped duplicate seg=${id}: "${original}"`);
          try { clientWs.send(JSON.stringify({ type: "segment", id, original: "", translation: "", skipped: true })); } catch {}
          return;
        }
        lastAccepted = original;

        // Send the original immediately so the user sees their words ASAP.
        // pitchHz is round-tripped so the client can do speaker diarization.
        try {
          clientWs.send(JSON.stringify({
            type: "segment", id, original, translation: null,
            pitchHz: pitchForThisBlob,
          }));
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
