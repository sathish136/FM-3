import { Router } from "express";
import { pool } from "@workspace/db";

const router = Router();

pool
  .query(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_datetime TEXT NOT NULL,
      end_datetime TEXT,
      all_day BOOLEAN NOT NULL DEFAULT false,
      event_type TEXT NOT NULL DEFAULT 'meeting',
      color TEXT NOT NULL DEFAULT '#3b82f6',
      recurrence TEXT NOT NULL DEFAULT 'none',
      reminder_minutes INTEGER DEFAULT 15,
      created_by TEXT,
      related_module TEXT,
      related_id TEXT,
      location TEXT,
      attendees TEXT DEFAULT '[]',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)
  .then(() => console.log("Calendar tables ready"))
  .catch((e: any) => console.error("Calendar migration error:", e.message));

router.get("/calendar/events", async (req, res) => {
  try {
    const { start, end, created_by } = req.query as Record<string, string>;
    let query = `SELECT * FROM calendar_events WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;
    if (start) { query += ` AND start_datetime >= $${idx++}`; params.push(start); }
    if (end)   { query += ` AND start_datetime <= $${idx++}`; params.push(end); }
    if (created_by) { query += ` AND created_by = $${idx++}`; params.push(created_by); }
    query += ` ORDER BY start_datetime ASC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/calendar/events/upcoming", async (req, res) => {
  try {
    const { created_by, limit = "20" } = req.query as Record<string, string>;
    const now = new Date().toISOString();
    let query = `SELECT * FROM calendar_events WHERE start_datetime >= $1`;
    const params: any[] = [now];
    let idx = 2;
    if (created_by) { query += ` AND created_by = $${idx++}`; params.push(created_by); }
    query += ` ORDER BY start_datetime ASC LIMIT $${idx}`;
    params.push(parseInt(limit));
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/calendar/events", async (req, res) => {
  try {
    const {
      title, description, start_datetime, end_datetime, all_day,
      event_type, color, recurrence, reminder_minutes, created_by,
      related_module, related_id, location, attendees,
    } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO calendar_events
        (title, description, start_datetime, end_datetime, all_day, event_type, color, recurrence, reminder_minutes, created_by, related_module, related_id, location, attendees)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        title, description || null,
        start_datetime, end_datetime || null,
        all_day ?? false,
        event_type || "meeting",
        color || "#3b82f6",
        recurrence || "none",
        reminder_minutes ?? 15,
        created_by || null,
        related_module || null,
        related_id || null,
        location || null,
        JSON.stringify(attendees || []),
      ],
    );
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/calendar/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, start_datetime, end_datetime, all_day,
      event_type, color, recurrence, reminder_minutes, location, attendees,
    } = req.body;
    const { rows } = await pool.query(
      `UPDATE calendar_events SET
        title=$1, description=$2, start_datetime=$3, end_datetime=$4,
        all_day=$5, event_type=$6, color=$7, recurrence=$8,
        reminder_minutes=$9, location=$10, attendees=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [
        title, description || null, start_datetime, end_datetime || null,
        all_day ?? false, event_type || "meeting", color || "#3b82f6",
        recurrence || "none", reminder_minutes ?? 15,
        location || null, JSON.stringify(attendees || []), parseInt(id),
      ],
    );
    if (!rows[0]) return res.status(404).json({ error: "Event not found" });
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/calendar/events/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM calendar_events WHERE id=$1`, [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
