import { Router } from "express";
import { db } from "@workspace/db";
import { projectDrawingsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return _openai;
}

const ERPNEXT_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;

function authHeader(): string {
  return `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
}

const router = Router();

// ── Project Drawings DB CRUD ──────────────────────────────────────────────────

// GET /api/project-drawings — return all drawings ordered newest first
router.get("/project-drawings", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(projectDrawingsTable)
      .orderBy(desc(projectDrawingsTable.createdAt));
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/project-drawings — create a new drawing
router.post("/project-drawings", async (req, res) => {
  try {
    const body = req.body as any;
    if (!body.id || !body.drawingNo || !body.uploadedAt) {
      return res.status(400).json({ error: "id, drawingNo and uploadedAt are required" });
    }
    const [row] = await db
      .insert(projectDrawingsTable)
      .values({
        id: body.id,
        drawingNo: body.drawingNo,
        title: body.title ?? "",
        project: body.project ?? "",
        department: body.department ?? "",
        systemName: body.systemName ?? "",
        uploadedAt: body.uploadedAt,
        status: body.status ?? "draft",
        revisionNo: body.revisionNo ?? 0,
        revisionLabel: body.revisionLabel ?? "",
        fileData: body.fileData ?? "",
        fileName: body.fileName ?? "",
        note: body.note ?? "",
        uploadedBy: body.uploadedBy ?? "",
        history: body.history ?? [],
        viewLog: body.viewLog ?? [],
        checkedBy: body.checkedBy ?? null,
        approvedBy: body.approvedBy ?? null,
        erpFileUrl: body.erpFileUrl ?? null,
      })
      .returning();
    // Set drawingType via update to work around Drizzle DEFAULT behaviour for this column
    const drawingType = body.drawingType ?? "";
    console.log("[POST drawing] drawingType from body:", JSON.stringify(drawingType), "row before patch:", JSON.stringify(row.drawingType));
    if (drawingType) {
      const updateResult = await db.execute(
        sql`UPDATE project_drawings SET drawing_type = ${drawingType} WHERE id = ${body.id}`
      );
      console.log("[POST drawing] update result:", JSON.stringify(updateResult));
      (row as any).drawingType = drawingType;
      console.log("[POST drawing] row.drawingType after patch:", JSON.stringify((row as any).drawingType));
    }
    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/project-drawings/:id — partial update (status, revision, view log, approvals…)
router.patch("/project-drawings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body as any;
    const updateFields: Partial<typeof projectDrawingsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    const allowed = [
      "title","project","department","drawingType","systemName","status","revisionNo",
      "revisionLabel","fileData","fileName","note","uploadedBy","history",
      "viewLog","checkedBy","approvedBy","erpFileUrl",
    ] as const;
    for (const key of allowed) {
      if (key in body) (updateFields as any)[key] = body[key];
    }
    const [row] = await db
      .update(projectDrawingsTable)
      .set(updateFields)
      .where(eq(projectDrawingsTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Drawing not found" });
    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/project-drawings/:id
router.delete("/project-drawings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(projectDrawingsTable).where(eq(projectDrawingsTable.id, id));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── AI Drawing Analysis ───────────────────────────────────────────────────────

const DRAWING_ANALYSIS_PROMPT = `You are an expert engineering drawing reviewer with deep knowledge of process, mechanical, electrical, civil, and instrumentation drawings.

Analyze this engineering drawing image carefully and return a JSON object with this exact structure:
{
  "detectedType": "The most likely drawing type (e.g. P&ID, PFD, General Arrangement, Electrical SLD, Civil Drawing, Isometric, Layout, Instrument Drawing, etc.)",
  "suggestedDepartment": "One of: Mechanical | Electrical | Civil | Instrumentation | Process | Project | Quality | HSE",
  "summary": "2-3 sentence summary of what this drawing shows",
  "keyElements": ["List of key equipment, components, or systems visible in the drawing"],
  "observations": ["Technical observations about the drawing — scale, standards, completeness, etc."],
  "recommendations": ["Any issues, missing info, or improvements to note"]
}

Rules:
- Return ONLY valid JSON, no markdown, no extra text
- Be specific and technical
- keyElements should have 5-15 items
- observations and recommendations should each have 2-6 items`;

router.post("/drawings/analyze-page", async (req, res) => {
  try {
    const { imageBase64, drawingNo, title, department } = req.body as {
      imageBase64: string;
      drawingNo?: string;
      title?: string;
      department?: string;
    };

    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    const context = [
      drawingNo ? `Drawing No: ${drawingNo}` : null,
      title ? `Title: ${title}` : null,
      department ? `Department: ${department}` : null,
    ].filter(Boolean).join(" | ");

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "user",
        content: [
          ...(context ? [{ type: "text" as const, text: context }] : []),
          { type: "text" as const, text: DRAWING_ANALYSIS_PROMPT },
          {
            type: "image_url" as const,
            image_url: {
              url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
              detail: "high",
            },
          },
        ],
      },
    ];

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 4096,
      messages,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let parsed: {
      detectedType?: string;
      suggestedDepartment?: string;
      summary?: string;
      keyElements?: string[];
      observations?: string[];
      recommendations?: string[];
    };
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "AI returned invalid JSON", raw });
    }

    return res.json({
      detectedType: parsed.detectedType ?? "",
      suggestedDepartment: parsed.suggestedDepartment ?? "",
      summary: parsed.summary ?? "",
      keyElements: Array.isArray(parsed.keyElements) ? parsed.keyElements : [],
      observations: Array.isArray(parsed.observations) ? parsed.observations : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    });
  } catch (e: any) {
    console.error("Drawing analyze error:", e);
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
});

// ── ERPNext file helpers ──────────────────────────────────────────────────────

router.post("/drawings/upload-file", async (req, res) => {
  try {
    if (!ERPNEXT_URL || !ERPNEXT_API_KEY || !ERPNEXT_API_SECRET) {
      return res.status(503).json({ error: "ERPNext not configured" });
    }

    const { fileData, fileName, folder } = req.body as {
      fileData: string;
      fileName: string;
      folder?: string;
    };

    if (!fileData || !fileName) {
      return res.status(400).json({ error: "fileData and fileName are required" });
    }

    const base64Data = fileData.includes(",") ? fileData.split(",")[1] : fileData;
    const buffer = Buffer.from(base64Data, "base64");

    const blob = new Blob([buffer], { type: "application/pdf" });
    const form = new FormData();
    form.append("file", blob, fileName);
    form.append("is_private", "1");
    form.append("folder", folder || "Home/FlowMatrix");

    const uploadRes = await fetch(`${ERPNEXT_URL}/api/method/upload_file`, {
      method: "POST",
      headers: { Authorization: authHeader() },
      body: form,
    });

    if (!uploadRes.ok) {
      const body = await uploadRes.text().catch(() => "");
      return res.status(uploadRes.status).json({ error: `ERPNext upload failed: ${body}` });
    }

    const json = await uploadRes.json() as any;
    const fileUrl: string | null = json.message?.file_url || json.message?.name || null;

    return res.json({ fileUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/drawings/list-private", async (req, res) => {
  try {
    if (!ERPNEXT_URL || !ERPNEXT_API_KEY || !ERPNEXT_API_SECRET) {
      return res.status(503).json({ error: "ERPNext not configured" });
    }

    const folder = (req.query.folder as string) || "Home/FlowMatrix";

    const filters = JSON.stringify([
      ["File", "folder", "=", folder],
      ["File", "is_private", "=", "1"],
    ]);
    const fields = JSON.stringify([
      "name", "file_name", "file_url", "file_size", "creation", "modified", "folder", "attached_to_doctype", "attached_to_name",
    ]);

    const params = new URLSearchParams({ filters, fields, limit_page_length: "200", order_by: "creation desc" });
    const listRes = await fetch(`${ERPNEXT_URL}/api/resource/File?${params}`, {
      headers: { Authorization: authHeader() },
    });

    if (!listRes.ok) {
      const body = await listRes.text().catch(() => "");
      return res.status(listRes.status).json({ error: `ERPNext error: ${body}` });
    }

    const json = await listRes.json() as any;
    return res.json(json.data || []);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
