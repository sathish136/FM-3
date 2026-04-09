import { Router } from "express";
import multer from "multer";
import { db, pool } from "@workspace/db";
import { meetingMinutesTable, projectsTable, userPermissionsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { sendWhatsApp, sendEmailNotification } from "./notifications";

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

Be thorough and accurate. Do not invent information not present in the transcript. Use professional language throughout.
IMPORTANT: Do NOT add any "Prepared by", signature, footer, or closing line at the end. Stop after the Next Steps section.`;

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

    // Strip any AI-generated "Prepared by" footer from the response
    const preparedByIdx = fullResponse.search(/\n[\*_]*\s*Prepared by[\s\S]*$/i);
    const cleanedResponse = preparedByIdx > -1 ? fullResponse.slice(0, preparedByIdx).trim() : fullResponse.trim();

    const actionIdx = cleanedResponse.indexOf("## Action Items");
    const aiSummary = actionIdx > -1 ? cleanedResponse.slice(0, actionIdx).trim() : cleanedResponse.trim();
    const actionItems = actionIdx > -1 ? cleanedResponse.slice(actionIdx + "## Action Items".length).trim() : "";

    await db.update(meetingMinutesTable).set({ aiSummary, actionItems, status: "completed" }).where(eq(meetingMinutesTable.id, Number(req.params.id)));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: String(e) })}\n\n`);
    res.end();
  }
});

// ─── Share meeting minutes via WhatsApp or Email ─────────────────────────────
router.post("/meeting-minutes/:id/share", async (req, res) => {
  try {
    const { channel, userEmail, preparedBy, preparedByDesignation, toEmail } = req.body;
    if (!channel || !userEmail) return res.status(400).json({ error: "channel and userEmail are required" });

    const [meeting] = await db.select().from(meetingMinutesTable).where(eq(meetingMinutesTable.id, Number(req.params.id)));
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const [prefs] = await db.select().from(userPermissionsTable).where(eq(userPermissionsTable.email, userEmail));
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    const formattedDate = meeting.date ? new Date(meeting.date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : meeting.date;

    if (channel === "whatsapp") {
      const phone = prefs?.notifWhatsappPhone;
      if (!phone) return res.status(400).json({ error: "No WhatsApp phone number configured in notification settings. Please set it in Settings → Notifications." });

      // Build WhatsApp message (plain text with bold via *)
      const lines: string[] = [
        `*📋 Minutes of Meeting*`,
        `*${meeting.title}*`,
        ``,
        `📅 *Date:* ${formattedDate}`,
        meeting.venue ? `📍 *Venue:* ${meeting.venue}` : "",
        meeting.attendees ? `👥 *Attendees:* ${meeting.attendees}` : "",
        `📝 *Prepared by:* ${preparedBy || ""}${preparedByDesignation ? ` — ${preparedByDesignation}` : ""}`,
        ``,
      ].filter(l => l !== undefined && !(l === "" && lines?.length === 0));

      if (meeting.aiSummary) {
        // Parse sections from aiSummary
        const sectionRegex = /^##\s+(.+)$/gm;
        let match; let lastIdx = 0; const secs: {title: string; content: string}[] = [];
        while ((match = sectionRegex.exec(meeting.aiSummary)) !== null) {
          if (secs.length > 0) secs[secs.length-1].content = meeting.aiSummary.slice(lastIdx, match.index).trim();
          secs.push({ title: match[1], content: "" });
          lastIdx = match.index + match[0].length;
        }
        if (secs.length > 0) secs[secs.length-1].content = meeting.aiSummary.slice(lastIdx).trim();
        for (const sec of secs) {
          lines.push(`*${sec.title}*`);
          const bullets = sec.content.split("\n").filter(l => l.trim()).map(l => l.replace(/^[-•]\s*/, "• ").replace(/^\d+\.\s*/, "• "));
          lines.push(...bullets);
          lines.push("");
        }
      }

      if (meeting.actionItems) {
        lines.push(`*Action Items*`);
        meeting.actionItems.split("\n").filter(l => l.trim()).forEach(l => {
          lines.push(l.replace(/^- \[[ x]\] /, "✅ ").replace(/^[-•]\s*/, "• "));
        });
        lines.push("");
      }

      lines.push(`_Generated by FlowMatriX · WTT INTERNATIONAL INDIA · ${today}_`);
      const message = lines.filter((l, i, arr) => !(l === "" && (arr[i-1] === "" || i === 0))).join("\n");

      const result = await sendWhatsApp(phone, message);
      return res.json(result);
    }

    if (channel === "email") {
      const recipient = toEmail || userEmail;
      if (!recipient) return res.status(400).json({ error: "No email address available" });

      // Build rich HTML email
      const sectionHtml = (() => {
        if (!meeting.aiSummary) return "";
        const sectionRegex = /^##\s+(.+)$/gm;
        let match; let lastIdx = 0; const secs: {title: string; content: string}[] = [];
        while ((match = sectionRegex.exec(meeting.aiSummary)) !== null) {
          if (secs.length > 0) secs[secs.length-1].content = meeting.aiSummary.slice(lastIdx, match.index).trim();
          secs.push({ title: match[1], content: "" });
          lastIdx = match.index + match[0].length;
        }
        if (secs.length > 0) secs[secs.length-1].content = meeting.aiSummary.slice(lastIdx).trim();
        return secs.map(sec => {
          const bullets = sec.content.split("\n").filter(l => l.trim()).map(l => {
            const text = l.replace(/^[-•]\s*/, "").replace(/^\d+\.\s*/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
            return `<li style="margin:4px 0;color:#334155;font-size:14px;">${text}</li>`;
          }).join("");
          return `<div style="margin-bottom:20px;"><h3 style="font-size:13px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;">${sec.title}</h3><ul style="margin:0;padding-left:20px;">${bullets}</ul></div>`;
        }).join("");
      })();

      const actionHtml = (() => {
        if (!meeting.actionItems) return "";
        const rows = meeting.actionItems.split("\n").filter(l => l.trim() && !l.startsWith("##"));
        if (!rows.length) return "";
        const items = rows.map(l => {
          const text = l.replace(/^- \[[ x]\] /, "").replace(/^[-•]\s*/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
          return `<li style="margin:6px 0;color:#334155;font-size:14px;">${text}</li>`;
        }).join("");
        return `<div style="margin-bottom:20px;"><h3 style="font-size:13px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;">Action Items</h3><ul style="margin:0;padding-left:20px;">${items}</ul></div>`;
      })();

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:680px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1d4ed8,#4338ca);padding:32px 40px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.12em;color:#93c5fd;text-transform:uppercase;">WTT INTERNATIONAL INDIA</p>
      <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#fff;letter-spacing:-.02em;">Minutes of Meeting</h1>
      <p style="margin:0;font-size:15px;color:#bfdbfe;font-weight:500;">${meeting.title}</p>
    </div>
    <!-- Meta -->
    <div style="padding:24px 40px;border-bottom:1px solid #f1f5f9;display:flex;flex-wrap:wrap;gap:16px;background:#f8fafc;">
      <div style="min-width:140px;"><span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Date</span><p style="margin:4px 0 0;font-size:14px;color:#1e293b;font-weight:600;">${formattedDate}</p></div>
      ${meeting.venue ? `<div style="min-width:140px;"><span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Venue</span><p style="margin:4px 0 0;font-size:14px;color:#1e293b;font-weight:600;">${meeting.venue}</p></div>` : ""}
      ${meeting.attendees ? `<div style="min-width:200px;"><span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Attendees</span><p style="margin:4px 0 0;font-size:14px;color:#1e293b;font-weight:600;">${meeting.attendees}</p></div>` : ""}
      <div style="min-width:160px;"><span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Prepared by</span><p style="margin:4px 0 0;font-size:14px;color:#1e293b;font-weight:600;">${preparedBy || ""}${preparedByDesignation ? `<br><span style="font-size:12px;color:#2563eb;font-weight:600;">${preparedByDesignation}</span>` : ""}</p></div>
    </div>
    <!-- Content -->
    <div style="padding:28px 40px;">
      ${sectionHtml}
      ${actionHtml}
    </div>
    <!-- Footer -->
    <div style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">Generated by <strong style="color:#1d4ed8;">FlowMatriX</strong> · WTT INTERNATIONAL INDIA · ${today}</p>
    </div>
  </div>
</body>
</html>`;

      const result = await sendEmailNotification(recipient, `Minutes of Meeting — ${meeting.title}`, html);
      return res.json(result);
    }

    res.status(400).json({ error: "channel must be 'whatsapp' or 'email'" });
  } catch (e) {
    console.error("Share meeting-minutes error:", e);
    res.status(500).json({ error: String(e) });
  }
});

export default router;
