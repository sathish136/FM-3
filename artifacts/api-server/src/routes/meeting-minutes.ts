import { Router } from "express";
import { db } from "@workspace/db";
import { meetingMinutesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";

const router = Router();

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

router.post("/meeting-minutes/:id/generate", async (req, res) => {
  try {
    const [meeting] = await db.select().from(meetingMinutesTable).where(eq(meetingMinutesTable.id, Number(req.params.id)));
    if (!meeting) return res.status(404).json({ error: "Not found" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const prompt = `You are a professional meeting secretary. Given the following raw meeting notes, generate:
1. A concise executive summary (2-4 sentences)
2. Key discussion points (bullet list)
3. Action items with owners and deadlines if mentioned

Meeting Title: ${meeting.title}
Date: ${meeting.date}
Attendees: ${meeting.attendees || "Not specified"}

Raw Notes:
${meeting.rawNotes || "No notes provided"}

Format your response as:
## Summary
[summary here]

## Key Points
- [point 1]
- [point 2]

## Action Items
- [action 1]
- [action 2]`;

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

    const sections = fullResponse.split("## Action Items");
    const actionItems = sections[1]?.trim() || "";
    const summaryAndPoints = sections[0] || fullResponse;

    await db.update(meetingMinutesTable).set({
      aiSummary: summaryAndPoints.trim(),
      actionItems: actionItems,
      status: "completed",
    }).where(eq(meetingMinutesTable.id, Number(req.params.id)));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: String(e) })}\n\n`);
    res.end();
  }
});

export default router;
