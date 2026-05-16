import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { projectDrawingsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import OpenAI from "openai";
import { sendEmailNotification, buildEmailHtml } from "./notifications";

const drawingUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

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

// POST /api/project-drawings — create a new drawing (supports multipart or JSON)
router.post("/project-drawings", drawingUpload.single("file"), async (req, res) => {
  try {
    // When uploaded as multipart, metadata comes in req.body.meta (JSON string)
    let body: any;
    if (req.file) {
      try {
        body = JSON.parse((req.body as any).meta ?? "{}");
      } catch {
        return res.status(400).json({ error: "Invalid meta JSON in multipart upload" });
      }
      // Embed the PDF as base64 so it can be stored / served later
      body.fileData = `data:application/pdf;base64,${req.file.buffer.toString("base64")}`;
      body.fileName = body.fileName || req.file.originalname;
    } else {
      body = req.body as any;
    }

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
        uploaderEmail: body.uploaderEmail ?? null,
        workflowStatus: body.workflowStatus ?? "pending_review",
      } as any)
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
      "viewLog","checkedBy","approvedBy","erpFileUrl","aiAnalysis",
      "workflowStatus","reviewerEmail","uploaderEmail","corrections","hodRemarks",
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

const DRAWING_ANALYSIS_PROMPT = `You are a senior engineering drawing reviewer and technical auditor with deep expertise in process, mechanical, electrical, civil, and instrumentation drawings.

Analyze this engineering drawing image carefully and return a JSON object with this EXACT structure:
{
  "detectedType": "The most likely drawing type (e.g. P&ID, PFD, General Arrangement, Electrical SLD, Civil Drawing, Isometric, Layout, Instrument Drawing, etc.)",
  "suggestedDepartment": "One of: Mechanical | Electrical | Civil | Instrumentation | Process | Project | Quality | HSE",
  "summary": "3-5 sentence technical summary of what this drawing shows, including scope and purpose",
  "keyElements": ["Comprehensive list of key equipment, components, systems, tags, and references visible"],
  "observations": ["Detailed technical observations — scale, standards compliance, title block completeness, revision status, symbology, drawing conventions, legibility, etc."],
  "recommendations": ["Specific actionable improvements, missing information, non-conformances, or safety concerns to address"],
  "report": "A detailed professional engineering review report (minimum 150 words) covering: drawing scope and purpose, design intent, technical correctness, standards compliance (IEC/IS/BS/ASME as applicable), completeness of information, revision control, and overall quality assessment",
  "actionPlan": ["Prioritized list of action items with clear owner responsibility — each item should start with a priority indicator: [HIGH], [MEDIUM], or [LOW]"]
}

For ELECTRICAL drawings (SLD, layout, wiring, panel, distribution), additionally analyse and include in report and observations:
- Voltage levels and system configuration (LT/HT/EHT)
- Protection scheme and relay coordination
- Cable sizing and routing adequacy
- Panel/switchgear specification and make
- Earthing and grounding arrangements
- Compliance with IE Rules, IEC 60364, or applicable standards
- Energy metering and power factor correction
- Emergency / safety circuits (fire alarm, UPS, DG hookup)

Rules:
- Return ONLY valid JSON, no markdown, no extra text
- Be specific and technical — use actual equipment names, tag numbers, and values if visible
- keyElements should have 8-20 items
- observations and recommendations should each have 4-8 items
- actionPlan should have 5-10 prioritized items
- report must be a single detailed string (not array)`;

const ELECTRICAL_CONTEXT = `This is an ELECTRICAL drawing. Provide exhaustive electrical engineering analysis including protection schemes, voltage levels, cable sizing, panel specs, earthing, and all applicable IEC/IE Rules compliance checks.`;

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

    const isElectrical = department?.toLowerCase().includes("electrical") ?? false;

    const contextParts = [
      drawingNo ? `Drawing No: ${drawingNo}` : null,
      title ? `Title: ${title}` : null,
      department ? `Department: ${department}` : null,
      isElectrical ? ELECTRICAL_CONTEXT : null,
    ].filter(Boolean);

    const context = contextParts.join(" | ");

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
      report?: string;
      actionPlan?: string[];
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
      report: typeof parsed.report === "string" ? parsed.report : "",
      actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [],
      isElectrical,
    });
  } catch (e: any) {
    console.error("Drawing analyze error:", e);
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
});

// GET /api/project-drawings/:id/file — return only the file data (for lazy loading)
router.get("/project-drawings/:id/file", async (req, res) => {
  try {
    const { id } = req.params;
    const [row] = await db
      .select({ fileData: projectDrawingsTable.fileData })
      .from(projectDrawingsTable)
      .where(eq(projectDrawingsTable.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json({ fileData: row.fileData });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Drawing Workflow Actions ──────────────────────────────────────────────────

const HOD_EMAIL = "dhilip@wttint.com";
const PM_EMAIL = "vaithees@wttint.com";

function drawingEmailHtml(title: string, body: string, drawing: { drawingNo: string; title?: string; project?: string }) {
  const meta = [
    `<p style="margin:4px 0;color:#1e293b;font-size:14px;"><strong>Drawing No:</strong> ${drawing.drawingNo}</p>`,
    drawing.title ? `<p style="margin:4px 0;color:#1e293b;font-size:14px;"><strong>Title:</strong> ${drawing.title}</p>` : "",
    drawing.project ? `<p style="margin:4px 0;color:#1e293b;font-size:14px;"><strong>Project:</strong> ${drawing.project}</p>` : "",
  ].filter(Boolean).join("\n");
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
      <h2 style="color:#0a2463;margin:0 0 8px;">FlowMatri<span style="color:#0ea5e9">X</span></h2>
      <p style="color:#64748b;font-size:13px;margin:0 0 20px;">Project Drawing Notification</p>
      <div style="background:#fff;border:2px solid #e2e8f0;border-radius:12px;padding:24px;">
        <h3 style="margin:0 0 12px;color:#0a2463;">${title}</h3>
        ${meta}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
        <p style="color:#1e293b;font-size:14px;margin:0;">${body}</p>
      </div>
      <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:20px;">© ${new Date().getFullYear()} WTT INTERNATIONAL INDIA</p>
    </div>
  `;
}

// POST /api/project-drawings/:id/request-corrections
router.post("/project-drawings/:id/request-corrections", async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, reviewerName, reviewerEmail, uploaderEmail } = req.body as {
      comment: string;
      reviewerName: string;
      reviewerEmail: string;
      uploaderEmail: string;
    };

    const corrections = { comment, requestedAt: new Date().toISOString(), requestedBy: reviewerName };

    const [row] = await db
      .update(projectDrawingsTable)
      .set({
        workflowStatus: "correction_requested",
        corrections,
        reviewerEmail: reviewerEmail || null,
        uploaderEmail: uploaderEmail || null,
        updatedAt: new Date(),
      } as any)
      .where(eq(projectDrawingsTable.id, id))
      .returning();

    if (!row) return res.status(404).json({ error: "Drawing not found" });

    // Send email to uploader
    if (uploaderEmail) {
      const html = drawingEmailHtml(
        "Correction Required on Your Drawing",
        `Reviewer <strong>${reviewerName}</strong> has requested corrections.<br/><br/><strong>Remarks:</strong> ${comment || "Please review and re-upload the corrected drawing."}`,
        row as any,
      );
      sendEmailNotification(uploaderEmail, `Corrections Required – ${row.drawingNo}`, html).catch(() => {});
    }

    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/project-drawings/:id/correction-uploaded
router.post("/project-drawings/:id/correction-uploaded", async (req, res) => {
  try {
    const { id } = req.params;
    const { uploaderName, uploaderEmail, reviewerEmail, isIssueCorrectionCycle } = req.body as {
      uploaderName: string;
      uploaderEmail: string;
      reviewerEmail: string;
      isIssueCorrectionCycle?: boolean;
    };

    const newStatus = isIssueCorrectionCycle ? "issue_correction_uploaded" : "correction_uploaded";

    const [row] = await db
      .update(projectDrawingsTable)
      .set({ workflowStatus: newStatus, updatedAt: new Date() } as any)
      .where(eq(projectDrawingsTable.id, id))
      .returning();

    if (!row) return res.status(404).json({ error: "Drawing not found" });

    // Notify reviewer
    if (reviewerEmail) {
      const subject = isIssueCorrectionCycle
        ? `Issue Correction Uploaded – ${row.drawingNo}`
        : `Corrected Drawing Uploaded – ${row.drawingNo}`;
      const body = isIssueCorrectionCycle
        ? `<strong>${uploaderName || "The design team"}</strong> has uploaded a revised drawing in response to the reported site/workshop issue. Please review the correction and take the next action.`
        : `<strong>${uploaderName || "The uploader"}</strong> has uploaded a corrected version of this drawing. Please review it and take the next action.`;
      const html = drawingEmailHtml(isIssueCorrectionCycle ? "Issue Correction Uploaded" : "Corrected Drawing Uploaded", body, row as any);
      sendEmailNotification(reviewerEmail, subject, html).catch(() => {});
    }

    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/project-drawings/:id/submit-approval
router.post("/project-drawings/:id/submit-approval", async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewerName, reviewerEmail, uploaderEmail } = req.body as {
      reviewerName: string;
      reviewerEmail: string;
      uploaderEmail: string;
    };

    const [row] = await db
      .update(projectDrawingsTable)
      .set({
        workflowStatus: "submitted_for_approval",
        reviewerEmail: reviewerEmail || null,
        uploaderEmail: uploaderEmail || null,
        updatedAt: new Date(),
      } as any)
      .where(eq(projectDrawingsTable.id, id))
      .returning();

    if (!row) return res.status(404).json({ error: "Drawing not found" });

    // Email HOD
    const html = drawingEmailHtml(
      "Drawing Submitted for Your Approval",
      `Reviewer <strong>${reviewerName}</strong> has reviewed this drawing and submitted it for your final approval. Please log in to FlowMatriX to approve or reject.`,
      row as any,
    );
    sendEmailNotification(HOD_EMAIL, `Drawing Ready for Approval – ${row.drawingNo}`, html).catch(() => {});

    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/project-drawings/:id/hod-decision
router.post("/project-drawings/:id/hod-decision", async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, hodRemarks, hodName } = req.body as {
      decision: "approve" | "reject";
      hodRemarks?: string;
      hodName?: string;
    };

    const isApproved = decision === "approve";
    const newStatus = isApproved ? "hod_approved" : "hod_rejected";

    const [row] = await db
      .update(projectDrawingsTable)
      .set({
        workflowStatus: newStatus,
        hodRemarks: hodRemarks || null,
        updatedAt: new Date(),
      } as any)
      .where(eq(projectDrawingsTable.id, id))
      .returning();

    if (!row) return res.status(404).json({ error: "Drawing not found" });

    const rowAny = row as any;

    if (isApproved) {
      // Notify Project Manager
      const pmHtml = drawingEmailHtml(
        "Drawing Approved by Design HOD",
        `Design HOD <strong>${hodName || "dhilip@wttint.com"}</strong> has approved this drawing. It is now ready for final use.`,
        rowAny,
      );
      sendEmailNotification(PM_EMAIL, `Drawing Approved – ${row.drawingNo}`, pmHtml).catch(() => {});

      // Also notify reviewer & uploader
      if (rowAny.reviewerEmail) {
        sendEmailNotification(rowAny.reviewerEmail, `Drawing Approved – ${row.drawingNo}`, pmHtml).catch(() => {});
      }
    } else {
      // HOD rejected — notify reviewer and uploader
      const rejectMsg = `Design HOD has <strong>rejected</strong> this drawing.<br/><br/><strong>Remarks:</strong> ${hodRemarks || "No remarks provided."}`;
      const rejectHtml = drawingEmailHtml("Drawing Rejected by HOD", rejectMsg, rowAny);
      if (rowAny.reviewerEmail) {
        sendEmailNotification(rowAny.reviewerEmail, `Drawing Rejected – ${row.drawingNo}`, rejectHtml).catch(() => {});
      }
      if (rowAny.uploaderEmail && rowAny.uploaderEmail !== rowAny.reviewerEmail) {
        sendEmailNotification(rowAny.uploaderEmail, `Drawing Rejected – ${row.drawingNo}`, rejectHtml).catch(() => {});
      }
    }

    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Drawing Issues ────────────────────────────────────────────────────────────

// GET /api/project-drawings/:id/issues
router.get("/project-drawings/:id/issues", async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await db.execute(
      sql`SELECT * FROM project_drawing_issues WHERE drawing_id = ${id} ORDER BY reported_at DESC`
    );
    return res.json(rows.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/project-drawings/:id/issues — report a new issue
router.post("/project-drawings/:id/issues", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, issueType, description, reportedBy, reporterEmail, images } = req.body as {
      title: string;
      issueType: string;
      description: string;
      reportedBy: string;
      reporterEmail?: string;
      images?: unknown[];
    };

    const issueId = `iss_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const rows = await db.execute(sql`
      INSERT INTO project_drawing_issues (id, drawing_id, title, issue_type, description, reported_by, reporter_email, images)
      VALUES (${issueId}, ${id}, ${title || ""}, ${issueType || "general"}, ${description || ""}, ${reportedBy || ""}, ${reporterEmail || null}, ${JSON.stringify(images || [])}::jsonb)
      RETURNING *
    `);
    const issue = rows.rows[0] as any;

    // Fetch drawing details for email
    const drawingRows = await db.execute(sql`SELECT * FROM project_drawings WHERE id = ${id}`);
    const drawing = drawingRows.rows[0] as any;

    // Notify design HOD and reviewer
    if (drawing) {
      const issueHtml = drawingEmailHtml(
        "Issue Reported on Drawing",
        `<strong>${reportedBy || "A team member"}</strong> has reported an issue on this drawing.<br/><br/><strong>Issue Type:</strong> ${issueType || "General"}<br/><strong>Title:</strong> ${title}<br/><br/><strong>Description:</strong><br/>${description || "No description provided."}`,
        drawing,
      );
      sendEmailNotification(HOD_EMAIL, `Issue Reported – ${drawing.drawing_no || "Drawing"}`, issueHtml).catch(() => {});
      if (drawing.reviewer_email) {
        sendEmailNotification(drawing.reviewer_email, `Issue Reported – ${drawing.drawing_no || "Drawing"}`, issueHtml).catch(() => {});
      }
    }

    return res.json(issue);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/project-drawings/:id/issues/:issueId — resolve / update issue
router.patch("/project-drawings/:id/issues/:issueId", async (req, res) => {
  try {
    const { issueId } = req.params;
    const { status, resolvedBy, resolvedNote } = req.body as {
      status: string;
      resolvedBy?: string;
      resolvedNote?: string;
    };

    const rows = await db.execute(sql`
      UPDATE project_drawing_issues
      SET status = ${status},
          resolved_by = ${resolvedBy || null},
          resolved_note = ${resolvedNote || null},
          resolved_at = ${status === "resolved" ? new Date().toISOString() : null},
          updated_at = NOW()
      WHERE id = ${issueId}
      RETURNING *
    `);
    const issue = rows.rows[0];
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    return res.json(issue);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/project-drawings/:id/issues/:issueId
router.delete("/project-drawings/:id/issues/:issueId", async (req, res) => {
  try {
    const { issueId } = req.params;
    await db.execute(sql`DELETE FROM project_drawing_issues WHERE id = ${issueId}`);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/project-drawings/:id/issues/:issueId/start-correction — trigger correction from an issue
router.post("/project-drawings/:id/issues/:issueId/start-correction", async (req, res) => {
  try {
    const { id, issueId } = req.params;
    const { reportedBy, reporterEmail } = req.body as {
      reportedBy: string;
      reporterEmail?: string;
    };

    // Mark the issue as correction_triggered
    await db.execute(sql`
      UPDATE project_drawing_issues SET correction_triggered = TRUE, updated_at = NOW()
      WHERE id = ${issueId}
    `);

    // Set drawing to issue_correction_requested
    const [row] = await db
      .update(projectDrawingsTable)
      .set({
        workflowStatus: "issue_correction_requested",
        issueTriggerID: issueId,
        updatedAt: new Date(),
      } as any)
      .where(eq(projectDrawingsTable.id, id))
      .returning();

    if (!row) return res.status(404).json({ error: "Drawing not found" });

    const rowAny = row as any;

    // Notify uploader (design team)
    if (rowAny.uploaderEmail) {
      const html = drawingEmailHtml(
        "Correction Required – Site/Workshop Issue",
        `<strong>${reportedBy || "A site/workshop team member"}</strong> has reported an issue on this drawing and a correction is required.<br/><br/>Please review the reported issue in the drawing's <strong>Issues tab</strong>, make the necessary corrections, and upload the revised drawing.`,
        rowAny,
      );
      sendEmailNotification(rowAny.uploaderEmail, `Correction Required (Issue) – ${row.drawingNo}`, html).catch(() => {});
    }

    // Notify reviewer if known
    if (rowAny.reviewerEmail) {
      const html = drawingEmailHtml(
        "Issue Correction In Progress",
        `An issue has been raised on this drawing by <strong>${reportedBy || "site/workshop"}</strong> and a correction has been requested from the design team.`,
        rowAny,
      );
      sendEmailNotification(rowAny.reviewerEmail, `Issue Correction Requested – ${row.drawingNo}`, html).catch(() => {});
    }

    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/project-drawings/:id/assign-teams — PM assigns team access
router.post("/project-drawings/:id/assign-teams", async (req, res) => {
  try {
    const { id } = req.params;
    const { teams } = req.body as { teams: string[] };
    const [row] = await db
      .update(projectDrawingsTable)
      .set({ assignedTeams: teams || [] } as any)
      .where(eq(projectDrawingsTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Drawing not found" });
    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/drawings/employees — active ERPNext employees for uploader/checker picker
router.get("/drawings/employees", async (_req, res) => {
  try {
    if (!ERPNEXT_URL || !ERPNEXT_API_KEY || !ERPNEXT_API_SECRET) {
      return res.json([]);
    }
    const fields = JSON.stringify(["name", "employee_name", "user_id", "department", "designation"]);
    const filters = JSON.stringify([["Employee", "status", "=", "Active"]]);
    const params = new URLSearchParams({ fields, filters, limit_page_length: "500", order_by: "employee_name asc" });
    const r = await fetch(`${ERPNEXT_URL}/api/resource/Employee?${params}`, {
      headers: { Authorization: authHeader() },
    });
    if (!r.ok) return res.json([]);
    const data = await r.json() as any;
    const employees = (data.data ?? [])
      .filter((e: any) => e.user_id)
      .map((e: any) => ({
        id: e.name,
        name: e.employee_name,
        email: e.user_id,
        department: e.department || "",
        designation: e.designation || "",
      }));
    return res.json(employees);
  } catch {
    return res.json([]);
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
