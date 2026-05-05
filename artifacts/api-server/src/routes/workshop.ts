import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// ── Bootstrap tables ─────────────────────────────────────────────────────────
(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS workshop_job_cards (
        id              SERIAL PRIMARY KEY,
        card_type       TEXT NOT NULL,
        card_no         TEXT,
        project_number  TEXT,
        project_name    TEXT,
        drawing_number  TEXT,
        work_order_no   TEXT,
        location_area   TEXT,
        worker_name     TEXT,
        supervisor_name TEXT,
        date            TEXT,
        start_time      TEXT,
        end_time        TEXT,
        total_hours     TEXT,
        shift           TEXT,
        details         JSONB NOT NULL DEFAULT '[]',
        summary         JSONB NOT NULL DEFAULT '{}',
        signatures      JSONB NOT NULL DEFAULT '[]',
        status          TEXT NOT NULL DEFAULT 'Draft',
        created_by      TEXT,
        created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("Workshop job cards table ready");
  } catch (e) {
    console.error("Workshop table init error:", e);
  }
})();

// GET /api/workshop/job-cards
router.get("/workshop/job-cards", async (req, res) => {
  try {
    const { type, search } = req.query as { type?: string; search?: string };
    let rows: any[];

    if (type && search) {
      const result = await db.execute(sql`
        SELECT id, card_type, card_no, project_number, project_name,
               drawing_number, work_order_no, location_area, worker_name,
               supervisor_name, date, start_time, end_time, total_hours,
               shift, summary, status, created_by, created_at
        FROM workshop_job_cards
        WHERE card_type = ${type}
          AND (project_name ILIKE ${'%' + search + '%'}
            OR project_number ILIKE ${'%' + search + '%'}
            OR worker_name ILIKE ${'%' + search + '%'}
            OR card_no ILIKE ${'%' + search + '%'})
        ORDER BY created_at DESC LIMIT 200
      `);
      rows = (result as any).rows ?? result;
    } else if (type) {
      const result = await db.execute(sql`
        SELECT id, card_type, card_no, project_number, project_name,
               drawing_number, work_order_no, location_area, worker_name,
               supervisor_name, date, start_time, end_time, total_hours,
               shift, summary, status, created_by, created_at
        FROM workshop_job_cards
        WHERE card_type = ${type}
        ORDER BY created_at DESC LIMIT 200
      `);
      rows = (result as any).rows ?? result;
    } else if (search) {
      const result = await db.execute(sql`
        SELECT id, card_type, card_no, project_number, project_name,
               drawing_number, work_order_no, location_area, worker_name,
               supervisor_name, date, start_time, end_time, total_hours,
               shift, summary, status, created_by, created_at
        FROM workshop_job_cards
        WHERE project_name ILIKE ${'%' + search + '%'}
           OR project_number ILIKE ${'%' + search + '%'}
           OR worker_name ILIKE ${'%' + search + '%'}
           OR card_no ILIKE ${'%' + search + '%'}
        ORDER BY created_at DESC LIMIT 200
      `);
      rows = (result as any).rows ?? result;
    } else {
      const result = await db.execute(sql`
        SELECT id, card_type, card_no, project_number, project_name,
               drawing_number, work_order_no, location_area, worker_name,
               supervisor_name, date, start_time, end_time, total_hours,
               shift, summary, status, created_by, created_at
        FROM workshop_job_cards
        ORDER BY created_at DESC LIMIT 200
      `);
      rows = (result as any).rows ?? result;
    }

    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/workshop/job-cards/:id
router.get("/workshop/job-cards/:id", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT * FROM workshop_job_cards WHERE id = ${Number(req.params.id)}
    `);
    const rows = (result as any).rows ?? result;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/workshop/job-cards
router.post("/workshop/job-cards", async (req, res) => {
  try {
    const {
      card_type, card_no, project_number, project_name,
      drawing_number, work_order_no, location_area, worker_name,
      supervisor_name, date, start_time, end_time, total_hours,
      shift, details, summary, signatures, status, created_by,
    } = req.body;

    if (!card_type) return res.status(400).json({ error: "card_type required" });

    const detailsJson = JSON.stringify(details ?? []);
    const summaryJson = JSON.stringify(summary ?? {});
    const signaturesJson = JSON.stringify(signatures ?? []);

    const result = await db.execute(sql`
      INSERT INTO workshop_job_cards
        (card_type, card_no, project_number, project_name, drawing_number,
         work_order_no, location_area, worker_name, supervisor_name,
         date, start_time, end_time, total_hours, shift,
         details, summary, signatures, status, created_by)
      VALUES
        (${card_type}, ${card_no ?? null}, ${project_number ?? null},
         ${project_name ?? null}, ${drawing_number ?? null},
         ${work_order_no ?? null}, ${location_area ?? null},
         ${worker_name ?? null}, ${supervisor_name ?? null},
         ${date ?? null}, ${start_time ?? null}, ${end_time ?? null},
         ${total_hours ?? null}, ${shift ?? null},
         ${detailsJson}::jsonb,
         ${summaryJson}::jsonb,
         ${signaturesJson}::jsonb,
         ${status ?? "Draft"}, ${created_by ?? null})
      RETURNING *
    `);
    const rows = (result as any).rows ?? result;
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// PATCH /api/workshop/job-cards/:id
router.patch("/workshop/job-cards/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    await db.execute(sql`
      UPDATE workshop_job_cards
      SET status = COALESCE(${status ?? null}, status),
          updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// DELETE /api/workshop/job-cards/:id
router.delete("/workshop/job-cards/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM workshop_job_cards WHERE id = ${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
