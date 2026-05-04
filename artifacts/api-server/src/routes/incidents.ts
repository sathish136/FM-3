import { Router } from "express";
import { chatPool } from "../chat-ws";

const router = Router();

async function initIncidentsTable() {
  await chatPool.query(`
    CREATE TABLE IF NOT EXISTS hr_incidents (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      incident_type VARCHAR(100) DEFAULT 'Other',
      severity VARCHAR(20) DEFAULT 'Medium',
      status VARCHAR(30) DEFAULT 'Open',
      reporter_email VARCHAR(255),
      reporter_name VARCHAR(255),
      involved_employee VARCHAR(255),
      involved_employee_name VARCHAR(255),
      department VARCHAR(100),
      location VARCHAR(255),
      incident_date DATE,
      resolution TEXT,
      attachments JSONB DEFAULT '[]',
      tags JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

initIncidentsTable().catch(console.error);

router.get("/hr/incidents", async (req, res) => {
  try {
    const { status, severity, type, department, q, limit = "100", offset = "0" } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: any[] = [];
    let p = 1;

    if (status) { conditions.push(`status = $${p++}`); params.push(status); }
    if (severity) { conditions.push(`severity = $${p++}`); params.push(severity); }
    if (type) { conditions.push(`incident_type = $${p++}`); params.push(type); }
    if (department) { conditions.push(`department ILIKE $${p++}`); params.push(`%${department}%`); }
    if (q) {
      conditions.push(`(title ILIKE $${p} OR description ILIKE $${p} OR reporter_name ILIKE $${p} OR involved_employee_name ILIKE $${p})`);
      params.push(`%${q}%`); p++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await chatPool.query(
      `SELECT * FROM hr_incidents ${where} ORDER BY created_at DESC LIMIT $${p} OFFSET $${p + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const countRes = await chatPool.query(`SELECT COUNT(*) FROM hr_incidents ${where}`, params);
    res.json({ incidents: rows.rows, total: parseInt(countRes.rows[0].count) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/hr/incidents/stats", async (_req, res) => {
  try {
    const r = await chatPool.query(`
      SELECT
        COUNT(*) FILTER (WHERE true) AS total,
        COUNT(*) FILTER (WHERE status = 'Open') AS open,
        COUNT(*) FILTER (WHERE status = 'Under Investigation') AS investigating,
        COUNT(*) FILTER (WHERE status = 'Resolved') AS resolved,
        COUNT(*) FILTER (WHERE status = 'Closed') AS closed,
        COUNT(*) FILTER (WHERE severity = 'Critical') AS critical,
        COUNT(*) FILTER (WHERE severity = 'High') AS high
      FROM hr_incidents
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/hr/incidents/:id", async (req, res) => {
  try {
    const r = await chatPool.query(`SELECT * FROM hr_incidents WHERE id = $1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/hr/incidents", async (req, res) => {
  try {
    const {
      title, description, incident_type = "Other", severity = "Medium",
      reporter_email, reporter_name, involved_employee, involved_employee_name,
      department, location, incident_date, tags = [],
    } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });
    const r = await chatPool.query(`
      INSERT INTO hr_incidents
        (title, description, incident_type, severity, reporter_email, reporter_name,
         involved_employee, involved_employee_name, department, location, incident_date, tags)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [title, description || null, incident_type, severity, reporter_email || null,
       reporter_name || null, involved_employee || null, involved_employee_name || null,
       department || null, location || null,
       incident_date ? new Date(incident_date) : null, JSON.stringify(tags)]
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/hr/incidents/:id", async (req, res) => {
  try {
    const {
      title, description, incident_type, severity, status,
      involved_employee, involved_employee_name, department, location,
      incident_date, resolution, tags,
    } = req.body;
    const r = await chatPool.query(`
      UPDATE hr_incidents SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        incident_type = COALESCE($3, incident_type),
        severity = COALESCE($4, severity),
        status = COALESCE($5, status),
        involved_employee = COALESCE($6, involved_employee),
        involved_employee_name = COALESCE($7, involved_employee_name),
        department = COALESCE($8, department),
        location = COALESCE($9, location),
        incident_date = COALESCE($10, incident_date),
        resolution = COALESCE($11, resolution),
        tags = COALESCE($12, tags),
        updated_at = NOW()
      WHERE id = $13 RETURNING *`,
      [title, description, incident_type, severity, status,
       involved_employee, involved_employee_name, department, location,
       incident_date ? new Date(incident_date) : null, resolution,
       tags ? JSON.stringify(tags) : null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/hr/incidents/:id", async (req, res) => {
  try {
    await chatPool.query(`DELETE FROM hr_incidents WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
