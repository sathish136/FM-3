import { Router } from "express";
import { pool } from "@workspace/db";
import { fetchErpNextEmployees } from "../lib/erpnext";

const router = Router();

const ULTRAMSG_INSTANCE = "instance149987";
const ULTRAMSG_TOKEN = "6baxh4iuxajibxez";

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
      reminder_sent_for TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reminder_sent_for TEXT;
  `)
  .then(() => console.log("Calendar tables ready"))
  .catch((e: any) => console.error("Calendar migration error:", e.message));

// ── In-memory set to track recurring event reminders ──────────────────────────
// Key: `eventId-startDatetime`
const sentRecurringReminders = new Set<string>();

// ── Employee phone cache (TTL: 5 min) ────────────────────────────────────────
let employeeCache: { email: string; phone: string }[] = [];
let employeeCacheAt = 0;

async function getPhoneForEmail(email: string): Promise<string | null> {
  if (!email) return null;

  // Refresh cache every 5 minutes
  if (Date.now() - employeeCacheAt > 5 * 60 * 1000) {
    try {
      const employees = await fetchErpNextEmployees({ status: "Active" });
      employeeCache = employees
        .filter(e => e.user_id && e.cell_number)
        .map(e => ({ email: e.user_id!, phone: e.cell_number! }));
      employeeCacheAt = Date.now();
    } catch {
      // ERPNext may not be reachable; keep old cache
    }
  }

  // 1. Try ERPNext cell_number
  const emp = employeeCache.find(e => e.email.toLowerCase() === email.toLowerCase());
  if (emp?.phone) return emp.phone;

  // 2. Fall back to notification settings phone
  try {
    const { rows } = await pool.query(
      `SELECT notif_whatsapp_phone FROM user_permissions WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (rows[0]?.notif_whatsapp_phone) return rows[0].notif_whatsapp_phone;
  } catch {}

  return null;
}

async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      token: ULTRAMSG_TOKEN,
      to,
      body: message,
      priority: "10",
    });
    const res = await fetch(`https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json() as Record<string, unknown>;
    return data.sent === "true" || data.sent === true;
  } catch {
    return false;
  }
}

function formatReminderMessage(ev: {
  title: string;
  start_datetime: string;
  reminder_minutes: number;
  location?: string | null;
  description?: string | null;
  event_type?: string;
}): string {
  const start = new Date(ev.start_datetime);
  const timeStr = start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr = start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const mins = ev.reminder_minutes ?? 0;

  const lines = [
    `⏰ *Calendar Reminder*`,
    ``,
    `📌 *${ev.title}*`,
    mins > 0 ? `🕐 Starts in *${mins < 60 ? `${mins} minutes` : mins === 60 ? "1 hour" : `${mins / 60} hours`}*` : `🕐 Starting *now*`,
    `📅 ${dateStr} at ${timeStr}`,
  ];
  if (ev.location) lines.push(`📍 ${ev.location}`);
  if (ev.description) lines.push(`📝 ${ev.description}`);
  lines.push(``, `_FlowMatriX Calendar_`);

  return lines.join("\n");
}

async function checkAndFireReminders() {
  try {
    const now = Date.now();
    const windowMs = 2 * 60 * 1000; // 2-minute window

    // Fetch upcoming events within the next 24 hours (for non-recurring) + all recurring
    const lookAhead = new Date(now + 24 * 60 * 60 * 1000).toISOString();
    const { rows: allEvents } = await pool.query(`
      SELECT * FROM calendar_events
      WHERE created_by IS NOT NULL
        AND (
          recurrence != 'none'
          OR (
            recurrence = 'none'
            AND start_datetime >= $1
            AND start_datetime <= $2
            AND (reminder_sent_for IS DISTINCT FROM start_datetime)
          )
        )
      ORDER BY start_datetime ASC
    `, [new Date().toISOString(), lookAhead]);

    type CalRow = {
      id: number;
      title: string;
      description: string | null;
      start_datetime: string;
      end_datetime: string | null;
      recurrence: string;
      reminder_minutes: number;
      created_by: string;
      location: string | null;
      event_type: string;
      reminder_sent_for: string | null;
    };
    const events = allEvents as CalRow[];
    const nonRecurring = events.filter(e => e.recurrence === "none" || !e.recurrence);
    const recurring = events.filter(e => e.recurrence && e.recurrence !== "none");

    // Filter non-recurring: check if reminder time falls in window
    const toFire: Array<CalRow & { _instanceKey?: string }> = [];
    for (const ev of nonRecurring) {
      const start = new Date(ev.start_datetime).getTime();
      const remMs = (ev.reminder_minutes ?? 15) * 60 * 1000;
      const fireAt = start - remMs;
      if (fireAt >= now && fireAt < now + windowMs) {
        toFire.push(ev);
      }
    }

    // Expand recurring events and find occurrences needing reminders
    const lookAheadMs = now + 7 * 24 * 60 * 60 * 1000;
    for (const ev of recurring) {
      const base = new Date(ev.start_datetime).getTime();
      const remMs = (ev.reminder_minutes ?? 15) * 60 * 1000;
      let cur = base;
      while (cur <= lookAheadMs) {
        const fireAt = cur - remMs;
        if (fireAt >= now && fireAt < now + windowMs) {
          const instanceKey = `${ev.id}-${new Date(cur).toISOString()}`;
          if (!sentRecurringReminders.has(instanceKey)) {
            sentRecurringReminders.add(instanceKey);
            toFire.push({ ...ev, start_datetime: new Date(cur).toISOString(), _instanceKey: instanceKey });
          }
        }
        const d = new Date(cur);
        if (ev.recurrence === "daily") d.setDate(d.getDate() + 1);
        else if (ev.recurrence === "weekday") { do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6); }
        else if (ev.recurrence === "weekly") d.setDate(d.getDate() + 7);
        else if (ev.recurrence === "monthly") d.setMonth(d.getMonth() + 1);
        else break;
        if (d.getTime() <= cur) break; // safety: no infinite loops
        cur = d.getTime();
      }
    }

    for (const ev of toFire) {
      const email = ev.created_by as string;
      const phone = await getPhoneForEmail(email);

      if (phone) {
        const msg = formatReminderMessage({
          title: ev.title,
          start_datetime: ev.start_datetime,
          reminder_minutes: ev.reminder_minutes ?? 15,
          location: ev.location,
          description: ev.description,
          event_type: ev.event_type,
        });
        const sent = await sendWhatsApp(phone, msg);
        if (sent) {
          console.log(`📲 WhatsApp reminder sent to ${email} (${phone}) for event "${ev.title}"`);
        } else {
          console.warn(`⚠️  WhatsApp reminder failed for ${email} event "${ev.title}"`);
        }
      } else {
        console.log(`ℹ️  No WhatsApp phone found for ${email} — skipping reminder for "${ev.title}"`);
      }

      // Mark non-recurring reminders as sent in DB
      if (ev.recurrence === "none" || !ev.recurrence) {
        await pool.query(
          `UPDATE calendar_events SET reminder_sent_for = $1 WHERE id = $2`,
          [ev.start_datetime, ev.id]
        );
      }
    }
  } catch (e: any) {
    console.error("Reminder check error:", e.message);
  }
}

// Start the server-side reminder scheduler
setInterval(checkAndFireReminders, 60 * 1000);
// Also run immediately on startup after a short delay
setTimeout(checkAndFireReminders, 5000);

// ── Routes ──────────────────────────────────────────────────────────────────

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
        reminder_minutes=$9, location=$10, attendees=$11,
        reminder_sent_for=NULL, updated_at=NOW()
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

// Endpoint to get a user's WhatsApp phone (for display in calendar UI)
router.get("/calendar/user-phone", async (req, res) => {
  try {
    const { email } = req.query as { email: string };
    if (!email) return res.status(400).json({ error: "email required" });
    const phone = await getPhoneForEmail(email);
    res.json({ phone: phone || null, source: phone ? (employeeCache.find(e => e.email.toLowerCase() === email.toLowerCase()) ? "erpnext" : "settings") : null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Test endpoint: send a WhatsApp reminder message immediately
router.post("/calendar/test-reminder", async (req, res) => {
  try {
    const { phone, email } = req.body as { phone?: string; email?: string };

    let targetPhone = phone || null;

    // If no phone supplied directly, look it up by email
    if (!targetPhone && email) {
      targetPhone = await getPhoneForEmail(email);
    }

    if (!targetPhone) {
      return res.status(400).json({ error: "No phone number found. Provide 'phone' or a valid 'email' with a phone on file." });
    }

    const now = new Date();
    const testEvent = {
      title: "Test Reminder",
      start_datetime: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      reminder_minutes: 15,
      location: null,
      description: "This is a test calendar reminder from FlowMatriX.",
      event_type: "meeting",
    };

    const msg = formatReminderMessage(testEvent);
    const sent = await sendWhatsApp(targetPhone, msg);

    if (sent) {
      console.log(`📲 Test reminder sent to ${targetPhone}`);
      res.json({ ok: true, phone: targetPhone, message: "Test reminder sent successfully." });
    } else {
      console.warn(`⚠️  Test reminder failed for ${targetPhone}`);
      res.status(502).json({ ok: false, phone: targetPhone, error: "WhatsApp API returned failure. Check phone number and UltraMsg configuration." });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
