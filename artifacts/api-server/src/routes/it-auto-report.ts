import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// ─── Table init ───────────────────────────────────────────────────────────────
(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS it_auto_members (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        role        TEXT NOT NULL,
        team        TEXT NOT NULL,
        email       TEXT,
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS it_auto_routine_tasks (
        id                  SERIAL PRIMARY KEY,
        role                TEXT NOT NULL,
        team                TEXT NOT NULL,
        task_name           TEXT NOT NULL,
        description         TEXT,
        estimated_minutes   INTEGER NOT NULL DEFAULT 60,
        is_active           BOOLEAN NOT NULL DEFAULT true,
        sort_order          INTEGER NOT NULL DEFAULT 0,
        created_at          TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS it_auto_daily_reports (
        id            SERIAL PRIMARY KEY,
        member_id     INTEGER NOT NULL REFERENCES it_auto_members(id) ON DELETE CASCADE,
        report_date   DATE NOT NULL,
        submitted_by  TEXT,
        submitted_at  TIMESTAMP,
        notes         TEXT,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(member_id, report_date)
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS it_auto_report_items (
        id                    SERIAL PRIMARY KEY,
        report_id             INTEGER NOT NULL REFERENCES it_auto_daily_reports(id) ON DELETE CASCADE,
        routine_task_id       INTEGER,
        task_name             TEXT NOT NULL,
        description           TEXT,
        estimated_minutes     INTEGER,
        actual_minutes        INTEGER,
        status                TEXT NOT NULL DEFAULT 'Pending',
        is_compliant          BOOLEAN,
        delay_reason          TEXT,
        non_compliance_days   INTEGER NOT NULL DEFAULT 0,
        due_date              DATE,
        completed_date        DATE,
        created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.error("[it-auto-report] table init error:", e);
  }
})();

// ─── Members ──────────────────────────────────────────────────────────────────

router.get("/it-auto/members", async (_req, res) => {
  try {
    const r = await db.execute(sql`
      SELECT * FROM it_auto_members ORDER BY team, role, name
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/it-auto/members", async (req, res) => {
  try {
    const { name, role, team, email } = req.body as {
      name: string; role: string; team: string; email?: string;
    };
    const r = await db.execute(sql`
      INSERT INTO it_auto_members (name, role, team, email)
      VALUES (${name}, ${role}, ${team}, ${email ?? null})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/it-auto/members/:id", async (req, res) => {
  try {
    const { name, role, team, email, is_active } = req.body as {
      name?: string; role?: string; team?: string; email?: string; is_active?: boolean;
    };
    const r = await db.execute(sql`
      UPDATE it_auto_members SET
        name       = COALESCE(${name ?? null}, name),
        role       = COALESCE(${role ?? null}, role),
        team       = COALESCE(${team ?? null}, team),
        email      = COALESCE(${email ?? null}, email),
        is_active  = COALESCE(${is_active ?? null}, is_active)
      WHERE id = ${Number(req.params["id"])}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/it-auto/members/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM it_auto_members WHERE id = ${Number(req.params["id"])}`);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Routine Tasks ────────────────────────────────────────────────────────────

router.get("/it-auto/routine-tasks", async (req, res) => {
  try {
    const { role, team } = req.query as { role?: string; team?: string };
    let q = `SELECT * FROM it_auto_routine_tasks WHERE is_active = true`;
    const params: any[] = [];
    if (role) { params.push(role); q += ` AND role = $${params.length}`; }
    if (team) { params.push(team); q += ` AND team = $${params.length}`; }
    q += ` ORDER BY sort_order, task_name`;
    const r = await db.execute(sql.raw(q, params));
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/it-auto/routine-tasks", async (req, res) => {
  try {
    const { role, team, task_name, description, estimated_minutes, sort_order } = req.body as {
      role: string; team: string; task_name: string; description?: string;
      estimated_minutes?: number; sort_order?: number;
    };
    const r = await db.execute(sql`
      INSERT INTO it_auto_routine_tasks (role, team, task_name, description, estimated_minutes, sort_order)
      VALUES (${role}, ${team}, ${task_name}, ${description ?? null}, ${estimated_minutes ?? 60}, ${sort_order ?? 0})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/it-auto/routine-tasks/:id", async (req, res) => {
  try {
    const { task_name, description, estimated_minutes, is_active, sort_order } = req.body as {
      task_name?: string; description?: string; estimated_minutes?: number;
      is_active?: boolean; sort_order?: number;
    };
    const r = await db.execute(sql`
      UPDATE it_auto_routine_tasks SET
        task_name         = COALESCE(${task_name ?? null}, task_name),
        description       = COALESCE(${description ?? null}, description),
        estimated_minutes = COALESCE(${estimated_minutes ?? null}, estimated_minutes),
        is_active         = COALESCE(${is_active ?? null}, is_active),
        sort_order        = COALESCE(${sort_order ?? null}, sort_order)
      WHERE id = ${Number(req.params["id"])}
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/it-auto/routine-tasks/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM it_auto_routine_tasks WHERE id = ${Number(req.params["id"])}`);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Reports ──────────────────────────────────────────────────────────────────

router.get("/it-auto/reports", async (req, res) => {
  try {
    const { date, member_id, team, start_date, end_date } = req.query as {
      date?: string; member_id?: string; team?: string; start_date?: string; end_date?: string;
    };

    let conds = [`1=1`];
    const params: any[] = [];

    if (date) {
      params.push(date);
      conds.push(`r.report_date = $${params.length}::date`);
    }
    if (start_date) {
      params.push(start_date);
      conds.push(`r.report_date >= $${params.length}::date`);
    }
    if (end_date) {
      params.push(end_date);
      conds.push(`r.report_date <= $${params.length}::date`);
    }
    if (member_id) {
      params.push(Number(member_id));
      conds.push(`r.member_id = $${params.length}`);
    }
    if (team) {
      params.push(team);
      conds.push(`m.team = $${params.length}`);
    }

    const q = `
      SELECT r.*,
             m.name   AS member_name,
             m.role   AS member_role,
             m.team   AS member_team,
             (SELECT json_agg(i ORDER BY i.id) FROM it_auto_report_items i WHERE i.report_id = r.id) AS items
      FROM it_auto_daily_reports r
      JOIN it_auto_members m ON m.id = r.member_id
      WHERE ${conds.join(" AND ")}
      ORDER BY r.report_date DESC, m.team, m.role, m.name
    `;
    const result = await db.execute(sql.raw(q, params));
    res.json(result.rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/it-auto/reports/:id", async (req, res) => {
  try {
    const r = await db.execute(sql`
      SELECT r.*,
             m.name  AS member_name,
             m.role  AS member_role,
             m.team  AS member_team,
             (SELECT json_agg(i ORDER BY i.id) FROM it_auto_report_items i WHERE i.report_id = r.id) AS items
      FROM it_auto_daily_reports r
      JOIN it_auto_members m ON m.id = r.member_id
      WHERE r.id = ${Number(req.params["id"])}
    `);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Upsert report with items
router.post("/it-auto/reports", async (req, res) => {
  try {
    const { member_id, report_date, submitted_by, notes, items } = req.body as {
      member_id: number;
      report_date: string;
      submitted_by?: string;
      notes?: string;
      items: Array<{
        routine_task_id?: number;
        task_name: string;
        description?: string;
        estimated_minutes?: number;
        actual_minutes?: number;
        status: string;
        is_compliant?: boolean;
        delay_reason?: string;
        due_date?: string;
        completed_date?: string;
      }>;
    };

    // Upsert report
    const rr = await db.execute(sql`
      INSERT INTO it_auto_daily_reports (member_id, report_date, submitted_by, submitted_at, notes)
      VALUES (${member_id}, ${report_date}::date, ${submitted_by ?? null}, NOW(), ${notes ?? null})
      ON CONFLICT (member_id, report_date) DO UPDATE SET
        submitted_by = EXCLUDED.submitted_by,
        submitted_at = EXCLUDED.submitted_at,
        notes        = EXCLUDED.notes,
        updated_at   = NOW()
      RETURNING *
    `);
    const report = rr.rows[0] as { id: number };

    // Delete existing items then re-insert
    await db.execute(sql`DELETE FROM it_auto_report_items WHERE report_id = ${report.id}`);

    for (const item of (items || [])) {
      // Compute non_compliance_days
      let ncDays = 0;
      if (item.is_compliant === false || item.status === "Delayed" || item.status === "Not Started") {
        const base = item.due_date || report_date;
        const endDate = item.completed_date || report_date;
        const diffMs = new Date(endDate).getTime() - new Date(base).getTime();
        ncDays = Math.max(0, Math.ceil(diffMs / 86400000));
      }

      await db.execute(sql`
        INSERT INTO it_auto_report_items
          (report_id, routine_task_id, task_name, description, estimated_minutes,
           actual_minutes, status, is_compliant, delay_reason, non_compliance_days,
           due_date, completed_date)
        VALUES
          (${report.id},
           ${item.routine_task_id ?? null},
           ${item.task_name},
           ${item.description ?? null},
           ${item.estimated_minutes ?? null},
           ${item.actual_minutes ?? null},
           ${item.status},
           ${item.is_compliant ?? null},
           ${item.delay_reason ?? null},
           ${ncDays},
           ${item.due_date ?? null},
           ${item.completed_date ?? null})
      `);
    }

    // Return full report
    const full = await db.execute(sql`
      SELECT r.*,
             m.name  AS member_name,
             m.role  AS member_role,
             m.team  AS member_team,
             (SELECT json_agg(i ORDER BY i.id) FROM it_auto_report_items i WHERE i.report_id = r.id) AS items
      FROM it_auto_daily_reports r
      JOIN it_auto_members m ON m.id = r.member_id
      WHERE r.id = ${report.id}
    `);
    res.json(full.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/it-auto/reports/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM it_auto_daily_reports WHERE id = ${Number(req.params["id"])}`);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Compliance summary ───────────────────────────────────────────────────────

router.get("/it-auto/compliance", async (req, res) => {
  try {
    const { start_date, end_date, team } = req.query as {
      start_date?: string; end_date?: string; team?: string;
    };

    const sd = start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const ed = end_date || new Date().toISOString().slice(0, 10);

    let teamFilter = ``;
    const params: any[] = [sd, ed];
    if (team) { params.push(team); teamFilter = ` AND m.team = $${params.length}`; }

    const q = `
      SELECT
        m.id              AS member_id,
        m.name            AS member_name,
        m.role,
        m.team,
        COUNT(DISTINCT r.report_date)::int                                  AS days_reported,
        COUNT(i.id)::int                                                     AS total_tasks,
        SUM(CASE WHEN i.is_compliant = true  THEN 1 ELSE 0 END)::int        AS compliant_tasks,
        SUM(CASE WHEN i.is_compliant = false THEN 1 ELSE 0 END)::int        AS non_compliant_tasks,
        COALESCE(SUM(i.non_compliance_days),0)::int                         AS total_nc_days,
        MAX(i.non_compliance_days)::int                                      AS max_nc_days,
        ROUND(
          100.0 * SUM(CASE WHEN i.is_compliant = true THEN 1 ELSE 0 END)
          / NULLIF(COUNT(i.id), 0), 1
        )::float                                                             AS compliance_pct
      FROM it_auto_members m
      LEFT JOIN it_auto_daily_reports r
        ON r.member_id = m.id AND r.report_date BETWEEN $1::date AND $2::date
      LEFT JOIN it_auto_report_items i ON i.report_id = r.id
      WHERE m.is_active = true${teamFilter}
      GROUP BY m.id, m.name, m.role, m.team
      ORDER BY m.team, m.role, m.name
    `;
    const result = await db.execute(sql.raw(q, params));
    res.json(result.rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Daily digest (all members for a date) ───────────────────────────────────

router.get("/it-auto/digest", async (req, res) => {
  try {
    const { date } = req.query as { date?: string };
    const d = date || new Date().toISOString().slice(0, 10);

    const members = await db.execute(sql`SELECT * FROM it_auto_members WHERE is_active = true ORDER BY team, role, name`);
    const reports = await db.execute(sql`
      SELECT r.*,
             (SELECT json_agg(i ORDER BY i.id) FROM it_auto_report_items i WHERE i.report_id = r.id) AS items
      FROM it_auto_daily_reports r
      WHERE r.report_date = ${d}::date
    `);

    const reportMap: Record<number, any> = {};
    for (const rpt of reports.rows as any[]) reportMap[rpt.member_id] = rpt;

    const result = (members.rows as any[]).map(m => ({
      member: m,
      report: reportMap[m.id] || null,
    }));
    res.json({ date: d, data: result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── ERP employees ────────────────────────────────────────────────────────────

const ERP_URL = (process.env.ERPNEXT_URL || "https://erp.wttint.com").replace(/\/$/, "");
const ERP_AUTH = () => `token ${process.env.ERPNEXT_API_KEY || ""}:${process.env.ERPNEXT_API_SECRET || ""}`;

router.get("/it-auto/erp-employees", async (req, res) => {
  try {
    const { department } = req.query as { department?: string };
    const dept = department || "It - WTT";

    const fields = JSON.stringify([
      "name", "employee_name", "department", "designation", "status", "user_id", "cell_number",
    ]);
    const filters = JSON.stringify([
      ["Employee", "department", "descendants of (inclusive)", dept],
      ["Employee", "status", "=", "Active"],
    ]);
    const params = new URLSearchParams({ fields, filters, limit_page_length: "500", order_by: "employee_name asc" });
    const url = `${ERP_URL}/api/resource/Employee?${params}`;
    const r = await fetch(url, { headers: { Authorization: ERP_AUTH() } });
    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: `ERPNext: ${txt}` });
    }
    const data = await r.json();
    res.json(data.data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Sync members from ERPNext — upsert by employee_id (ERP name)
router.post("/it-auto/sync-erp-members", async (req, res) => {
  try {
    const { employees } = req.body as {
      employees: Array<{
        erp_name: string;
        name: string;
        role: string;
        team: string;
        email?: string;
      }>;
    };

    // Add erp_id column if missing
    await db.execute(sql`
      ALTER TABLE it_auto_members ADD COLUMN IF NOT EXISTS erp_id TEXT UNIQUE
    `);

    let added = 0, updated = 0;
    for (const emp of employees) {
      const existing = await db.execute(sql`
        SELECT id FROM it_auto_members WHERE erp_id = ${emp.erp_name}
      `);
      if (existing.rows.length > 0) {
        await db.execute(sql`
          UPDATE it_auto_members SET name=${emp.name}, role=${emp.role}, team=${emp.team},
            email=${emp.email ?? null}, is_active=true WHERE erp_id=${emp.erp_name}
        `);
        updated++;
      } else {
        await db.execute(sql`
          INSERT INTO it_auto_members (name, role, team, email, erp_id)
          VALUES (${emp.name}, ${emp.role}, ${emp.team}, ${emp.email ?? null}, ${emp.erp_name})
        `);
        added++;
      }
    }

    const all = await db.execute(sql`SELECT * FROM it_auto_members ORDER BY team, role, name`);
    res.json({ ok: true, added, updated, members: all.rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
