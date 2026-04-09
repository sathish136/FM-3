import { Router } from "express";
import multer from "multer";
import { db, pool } from "@workspace/db";
import { meetingMinutesTable, projectsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

// Ensure meeting_minutes and spreadsheets tables exist on startup
pool.query(`
  CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT,
    status TEXT NOT NULL DEFAULT 'planning', priority TEXT DEFAULT 'medium',
    progress INTEGER NOT NULL DEFAULT 0, due_date TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS meeting_minutes (
    id SERIAL PRIMARY KEY, title TEXT NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    attendees TEXT, venue TEXT, date TEXT NOT NULL,
    raw_notes TEXT, ai_summary TEXT, action_items TEXT,
    status TEXT NOT NULL DEFAULT 'draft', mode TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS spreadsheets (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    data TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`).then(() => console.log("Meeting minutes & spreadsheets tables ready"))
  .catch((e: any) => console.error("Meeting minutes tables migration error:", e.message));
import OpenAI from "openai";
import { toFile } from "openai";
import { Readable } from "stream";

async function resolveProjectId(rawId: any): Promise<number | null> {
  if (!rawId) return null;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return null;
  const [row] = await db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.id, id));
  return row ? id : null;
}

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

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

router.get("/meeting-minutes", async (_req, res) => {
  try {
    const rows = await db.select().from(meetingMinutesTable).orderBy(desc(meetingMinutesTable.createdAt));
    res.json(rows);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/meeting-minutes", async (req, res) => {
  try {
    const { projectId, ...rest } = req.body;
    const safeProjectId = await resolveProjectId(projectId);
    // Strip unknown keys; only pass known schema fields
    const allowed = ["title","date","venue","attendees","status","mode","rawNotes","aiSummary","actionItems"];
    const clean: Record<string, any> = {};
    for (const k of allowed) if (rest[k] !== undefined) clean[k] = rest[k] ?? null;
    const [row] = await db.insert(meetingMinutesTable).values({ ...clean, projectId: safeProjectId }).returning();
    res.status(201).json(row);
  } catch (e: any) {
    console.error("POST /meeting-minutes error:", e?.cause ?? e);
    res.status(500).json({ error: String(e?.cause ?? e) });
  }
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
    const { projectId, ...rest } = req.body;
    const updates: Record<string, any> = { ...rest };
    if (projectId !== undefined) updates.projectId = await resolveProjectId(projectId);
    const [row] = await db.update(meetingMinutesTable).set(updates).where(eq(meetingMinutesTable.id, Number(req.params.id))).returning();
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
    const result = await getOpenAI().audio.transcriptions.create({ model: "gpt-4o-mini-transcribe", file: audioFile, response_format: "json" });
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

    const baseMime = req.file.mimetype.split(";")[0].trim();
    const ext = baseMime.includes("webm") ? "webm"
      : baseMime.includes("mp4") ? "mp4"
      : baseMime.includes("ogg") ? "ogg"
      : "wav";

    const audioFile = await toFile(req.file.buffer, `audio.${ext}`, { type: baseMime });

    const result = await getOpenAI().audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
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

    const prompt = `You are an expert corporate meeting secretary at WTT International India. Your task is to produce clear, professional, and comprehensive Minutes of Meeting from the transcript or notes provided.

Meeting Details:
- Title: ${meeting.title}
- Date: ${meeting.date}
- Attendees: ${meeting.attendees || "Not specified"}
- Venue: ${(meeting as any).venue || "Not specified"}

Transcript / Notes:
"""
${meeting.rawNotes || "No notes provided"}
"""

Instructions:
1. Read the full transcript carefully to understand context, speakers, and topics.
2. If the transcript contains speech from multiple people, identify and attribute statements where possible.
3. Write in formal, concise professional English.
4. Produce the following sections — include ALL sections even if brief:

## Summary
A 3–5 sentence executive overview covering the purpose, key outcomes, and overall tone of the meeting.

## Agenda Items Discussed
List each main topic or agenda item discussed as a bullet.

## Key Discussion Points
For each topic, summarise the key points raised, concerns expressed, and information shared. Use sub-bullets where helpful.

## Decisions Made
List every decision agreed upon. If no decisions were made, write "No formal decisions recorded."

## Action Items
List every follow-up task. Format each as:
- [ ] [Task description] — Owner: [Name or "TBD"] | Due: [Date or "TBD"]

## Next Steps
Summarise what happens next — follow-up meetings, milestones, or deadlines mentioned.

Be thorough and accurate. Do not invent information not present in the transcript. Use professional language throughout.`;

    const stream = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 4096,
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
