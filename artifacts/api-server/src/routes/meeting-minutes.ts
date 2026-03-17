import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { meetingMinutesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
import { toFile } from "openai";
import { Readable } from "stream";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.get("/meeting-minutes", async (_req, res) => {
  try {
    const rows = await db.select().from(meetingMinutesTable).orderBy(desc(meetingMinutesTable.createdAt));
    res.json(rows);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/meeting-minutes", async (req, res) => {
  try {
    const [row] = await db.insert(meetingMinutesTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/meeting-minutes/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(meetingMinutesTable).where(eq(meetingMinutesTable.id, Number(req.params.id)));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/meeting-minutes/:id", async (req, res) => {
  try {
    const [row] = await db.update(meetingMinutesTable).set(req.body).where(eq(meetingMinutesTable.id, Number(req.params.id))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/meeting-minutes/:id", async (req, res) => {
  try {
    await db.delete(meetingMinutesTable).where(eq(meetingMinutesTable.id, Number(req.params.id)));
    res.status(204).end();
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Quick transcribe — just returns text, no DB save (for live recording chunks)
router.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file" });
    const baseMime = req.file.mimetype.split(";")[0].trim();
    const ext = baseMime.includes("webm") ? "webm"
      : baseMime.includes("mp4") ? "mp4"
      : baseMime.includes("ogg") ? "ogg"
      : baseMime.includes("wav") ? "wav"
      : "webm";
    const audioFile = await toFile(req.file.buffer, `audio.${ext}`, { type: baseMime });
    const result = await openai.audio.transcriptions.create({ model: "whisper-1", file: audioFile, response_format: "json" });
    res.json({ transcript: result.text });
  } catch (e) {
    console.error("Transcription error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// Transcribe audio — accepts multipart audio file, returns transcript text
router.post("/meeting-minutes/:id/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file" });

    const ext = req.file.mimetype.includes("webm") ? "webm"
      : req.file.mimetype.includes("mp4") ? "mp4"
      : req.file.mimetype.includes("ogg") ? "ogg"
      : "wav";

    const audioFile = await toFile(req.file.buffer, `audio.${ext}`, { type: req.file.mimetype });

    const result = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      response_format: "json",
    });

    // Append transcript to rawNotes
    const [existing] = await db.select().from(meetingMinutesTable).where(eq(meetingMinutesTable.id, Number(req.params.id)));
    const newNotes = existing?.rawNotes
      ? `${existing.rawNotes}\n\n[Transcribed ${new Date().toLocaleTimeString()}]\n${result.text}`
      : `[Transcribed ${new Date().toLocaleTimeString()}]\n${result.text}`;

    const [updated] = await db.update(meetingMinutesTable).set({ rawNotes: newNotes }).where(eq(meetingMinutesTable.id, Number(req.params.id))).returning();
    res.json({ transcript: result.text, meeting: updated });
  } catch (e) {
    console.error("Transcription error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// Generate AI summary from raw notes
router.post("/meeting-minutes/:id/generate", async (req, res) => {
  try {
    const [meeting] = await db.select().from(meetingMinutesTable).where(eq(meetingMinutesTable.id, Number(req.params.id)));
    if (!meeting) return res.status(404).json({ error: "Not found" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const prompt = `You are a professional meeting secretary. Given the following meeting notes/transcript, generate a structured meeting summary.

Meeting Title: ${meeting.title}
Date: ${meeting.date}
Attendees: ${meeting.attendees || "Not specified"}

Notes/Transcript:
${meeting.rawNotes || "No notes provided"}

Format your response as:
## Summary
[2-4 sentence executive summary]

## Key Discussion Points
- [point 1]
- [point 2]

## Decisions Made
- [decision 1]

## Action Items
- [ ] [action 1] — Owner: [name if mentioned]
- [ ] [action 2] — Owner: [name if mentioned]`;

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    const actionIdx = fullResponse.indexOf("## Action Items");
    const aiSummary = actionIdx > -1 ? fullResponse.slice(0, actionIdx).trim() : fullResponse.trim();
    const actionItems = actionIdx > -1 ? fullResponse.slice(actionIdx + "## Action Items".length).trim() : "";

    await db.update(meetingMinutesTable).set({ aiSummary, actionItems, status: "completed" }).where(eq(meetingMinutesTable.id, Number(req.params.id)));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: String(e) })}\n\n`);
    res.end();
  }
});

export default router;
