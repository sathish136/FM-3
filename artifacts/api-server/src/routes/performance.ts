import { Router } from "express";
import { pool } from "@workspace/db";

const router = Router();

// ─── DB Setup ─────────────────────────────────────────────────────────────────

pool.query(`
  CREATE TABLE IF NOT EXISTS timesheet_entries (
    id SERIAL PRIMARY KEY,
    employee_name TEXT NOT NULL,
    employee_email TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    task_title TEXT NOT NULL DEFAULT '',
    task_id INTEGER,
    project TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    hours NUMERIC(4,1) NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS task_allocations (
    id SERIAL PRIMARY KEY,
    task_title TEXT NOT NULL,
    task_id INTEGER,
    project TEXT NOT NULL DEFAULT '',
    employee_name TEXT NOT NULL,
    employee_email TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    estimated_hours NUMERIC(5,1) DEFAULT 0,
    deadline TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'assigned',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ALTER TABLE timesheet_entries ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT '';
  ALTER TABLE task_allocations ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
`).then(() => console.log("Performance tables ready")).catch((e: any) => console.error("Performance table error:", e.message));

// ─── Timesheets ───────────────────────────────────────────────────────────────

router.get("/performance/timesheets", async (req, res) => {
  try {
    const { employee, department, from, to } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (employee) { conditions.push(`employee_name ILIKE $${i++}`); values.push(`%${employee}%`); }
    if (department) { conditions.push(`department ILIKE $${i++}`); values.push(`%${department}%`); }
    if (from) { conditions.push(`date >= $${i++}`); values.push(from); }
    if (to) { conditions.push(`date <= $${i++}`); values.push(to); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM timesheet_entries ${where} ORDER BY date DESC, created_at DESC`,
      values
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/performance/timesheets", async (req, res) => {
  try {
    const { employee_name, employee_email, department, task_title, task_id, project, date, hours, description } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO timesheet_entries (employee_name, employee_email, department, task_title, task_id, project, date, hours, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [employee_name, employee_email || "", department || "", task_title || "", task_id || null, project || "", date, hours, description || ""]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/performance/timesheets/:id", async (req, res) => {
  try {
    const { hours, description, status, task_title, project, department } = req.body;
    const { rows } = await pool.query(
      `UPDATE timesheet_entries SET
        hours = COALESCE($1, hours),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        task_title = COALESCE($4, task_title),
        project = COALESCE($5, project),
        department = COALESCE($6, department)
       WHERE id = $7 RETURNING *`,
      [hours, description, status, task_title, project, department, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/performance/timesheets/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM timesheet_entries WHERE id = $1", [req.params.id]);
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Department & Employee Stats ──────────────────────────────────────────────

router.get("/performance/department-stats", async (_req, res) => {
  try {
    const { rows: deptRows } = await pool.query(`
      SELECT
        department,
        COUNT(DISTINCT employee_name) AS employee_count,
        SUM(hours::numeric) AS total_hours,
        ROUND(AVG(hours::numeric), 1) AS avg_hours_per_entry,
        COUNT(*) AS total_entries,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_entries
      FROM timesheet_entries
      WHERE department != ''
      GROUP BY department
      ORDER BY total_hours DESC
    `);

    const { rows: empRows } = await pool.query(`
      SELECT
        employee_name,
        employee_email,
        department,
        SUM(hours::numeric) AS total_hours,
        COUNT(*) AS total_entries,
        COUNT(DISTINCT task_title) AS unique_tasks,
        COUNT(DISTINCT project) AS unique_projects,
        ROUND(SUM(hours::numeric) / NULLIF(COUNT(DISTINCT date), 0), 1) AS avg_hours_per_day,
        MAX(date) AS last_activity
      FROM timesheet_entries
      GROUP BY employee_name, employee_email, department
      ORDER BY total_hours DESC
    `);

    res.json({ departments: deptRows, employees: empRows });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/performance/weekly-summary", async (req, res) => {
  try {
    const { from, to, department } = req.query as Record<string, string>;
    const weekStart = from || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const weekEnd = to || new Date().toISOString().slice(0, 10);

    const deptFilter = department ? `AND department ILIKE $3` : "";
    const params: unknown[] = [weekStart, weekEnd];
    if (department) params.push(`%${department}%`);

    const { rows } = await pool.query(`
      SELECT
        employee_name,
        department,
        date,
        SUM(hours::numeric) AS hours,
        STRING_AGG(DISTINCT task_title, ', ') AS tasks
      FROM timesheet_entries
      WHERE date BETWEEN $1 AND $2 ${deptFilter}
      GROUP BY employee_name, department, date
      ORDER BY employee_name, date
    `, params);

    res.json(rows);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Task Allocations ─────────────────────────────────────────────────────────

router.get("/performance/allocations", async (req, res) => {
  try {
    const { department, employee, status } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (department) { conditions.push(`department ILIKE $${i++}`); values.push(`%${department}%`); }
    if (employee) { conditions.push(`employee_name ILIKE $${i++}`); values.push(`%${employee}%`); }
    if (status) { conditions.push(`status = $${i++}`); values.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM task_allocations ${where} ORDER BY created_at DESC`,
      values
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/performance/allocations", async (req, res) => {
  try {
    const { task_title, task_id, project, employee_name, employee_email, department, estimated_hours, deadline, priority, notes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO task_allocations (task_title, task_id, project, employee_name, employee_email, department, estimated_hours, deadline, priority, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [task_title, task_id || null, project || "", employee_name, employee_email || "", department || "", estimated_hours || 0, deadline || "", priority || "medium", notes || ""]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/performance/allocations/:id", async (req, res) => {
  try {
    const fields = ["task_title","project","employee_name","employee_email","department","estimated_hours","deadline","priority","status","notes"];
    const updates = fields.filter(f => req.body[f] !== undefined);
    if (!updates.length) return res.status(400).json({ error: "No fields to update" });
    const sets = updates.map((f, i) => `${f} = $${i + 1}`).join(", ");
    const vals = [...updates.map(f => req.body[f]), req.params.id];
    const { rows } = await pool.query(`UPDATE task_allocations SET ${sets} WHERE id = $${updates.length + 1} RETURNING *`, vals);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/performance/allocations/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM task_allocations WHERE id = $1", [req.params.id]);
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Python Agent Download ────────────────────────────────────────────────────

router.get("/performance/agent-script", (req, res) => {
  const apiBase = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}/api`
    : "http://localhost:8080/api";

  const script = `#!/usr/bin/env python3
"""
WTT FlowMatriX - Employee Activity Agent
Monitors active application usage and reports to the platform.
Run: python flowtask_agent.py --email your@email.com --name "Your Name" --dept "Engineering"
"""

import time
import datetime
import argparse
import json
import urllib.request
import urllib.error
import platform
import subprocess
import threading
import os
import sys

API_BASE = "${apiBase}"
CHECK_INTERVAL = 300  # seconds between reports (5 minutes)
IDLE_THRESHOLD = 120  # seconds of no input = idle

def get_active_window_title():
    """Get the currently active window title."""
    system = platform.system()
    try:
        if system == "Windows":
            import ctypes
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
            buf = ctypes.create_unicode_buffer(length + 1)
            ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
            return buf.value or "Unknown"
        elif system == "Darwin":
            result = subprocess.run(
                ['osascript', '-e', 'tell application "System Events" to get name of first process whose frontmost is true'],
                capture_output=True, text=True, timeout=3
            )
            return result.stdout.strip() or "Unknown"
        elif system == "Linux":
            result = subprocess.run(['xdotool', 'getactivewindow', 'getwindowname'], capture_output=True, text=True, timeout=3)
            return result.stdout.strip() or "Unknown"
    except Exception:
        pass
    return "Unknown"

def get_idle_seconds():
    """Get system idle time in seconds."""
    system = platform.system()
    try:
        if system == "Windows":
            import ctypes
            class LASTINPUTINFO(ctypes.Structure):
                _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]
            lii = LASTINPUTINFO()
            lii.cbSize = ctypes.sizeof(LASTINPUTINFO)
            ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii))
            millis = ctypes.windll.kernel32.GetTickCount() - lii.dwTime
            return millis / 1000.0
        elif system == "Darwin":
            result = subprocess.run(['ioreg', '-c', 'IOHIDSystem'], capture_output=True, text=True, timeout=3)
            for line in result.stdout.split('\\n'):
                if 'HIDIdleTime' in line:
                    ns = int(line.split('=')[-1].strip())
                    return ns / 1e9
        elif system == "Linux":
            result = subprocess.run(['xprintidle'], capture_output=True, text=True, timeout=3)
            return int(result.stdout.strip()) / 1000.0
    except Exception:
        pass
    return 0

def log_activity(employee_name, employee_email, department, task_title, project, hours, description):
    """Send a timesheet entry to the API."""
    today = datetime.date.today().isoformat()
    payload = json.dumps({
        "employee_name": employee_name,
        "employee_email": employee_email,
        "department": department,
        "task_title": task_title,
        "project": project,
        "date": today,
        "hours": round(hours, 1),
        "description": description
    }).encode("utf-8")
    
    try:
        req = urllib.request.Request(
            f"{API_BASE}/performance/timesheets",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            print(f"[OK] Logged {hours:.1f}h on '{task_title}' at {datetime.datetime.now().strftime('%H:%M')}")
            return data
    except urllib.error.URLError as e:
        print(f"[ERROR] Could not reach server: {e}")
    except Exception as e:
        print(f"[ERROR] {e}")
    return None

class ActivityTracker:
    def __init__(self, employee_name, employee_email, department):
        self.employee_name = employee_name
        self.employee_email = employee_email
        self.department = department
        self.session_start = time.time()
        self.active_seconds = 0
        self.current_window = ""
        self.window_start = time.time()
        self.window_log: list = []
        self.running = True

    def track(self):
        """Background tracking loop."""
        while self.running:
            window = get_active_window_title()
            idle = get_idle_seconds()
            
            if idle < IDLE_THRESHOLD:
                self.active_seconds += 5
                if window != self.current_window:
                    if self.current_window:
                        elapsed = (time.time() - self.window_start) / 3600
                        if elapsed > 0.01:
                            self.window_log.append((self.current_window, round(elapsed, 2)))
                    self.current_window = window
                    self.window_start = time.time()
            time.sleep(5)

    def flush(self, task_title, project):
        """Send accumulated time to API."""
        hours = self.active_seconds / 3600
        if hours < 0.05:
            print("[INFO] Less than 3 minutes active — skipping this interval.")
            self.active_seconds = 0
            return
        
        top_apps = sorted(self.window_log, key=lambda x: x[1], reverse=True)[:3]
        apps_str = ", ".join(f"{a[0]} ({a[1]:.1f}h)" for a in top_apps) if top_apps else self.current_window
        description = f"Auto-tracked via FlowTask Agent. Apps: {apps_str}"
        
        log_activity(self.employee_name, self.employee_email, self.department, task_title, project, hours, description)
        
        self.active_seconds = 0
        self.window_log = []

def main():
    parser = argparse.ArgumentParser(description="WTT FlowTask Agent - Employee Activity Tracker")
    parser.add_argument("--email", required=True, help="Your work email address")
    parser.add_argument("--name", required=True, help="Your full name")
    parser.add_argument("--dept", default="General", help="Your department name")
    parser.add_argument("--task", default="Daily Work", help="Current task title")
    parser.add_argument("--project", default="General", help="Current project name")
    parser.add_argument("--interval", type=int, default=CHECK_INTERVAL, help="Report interval in seconds (default: 300)")
    args = parser.parse_args()

    print(f"""
╔══════════════════════════════════════════╗
║   WTT FlowTask Agent v1.0               ║
║   Employee Activity Tracker             ║
╚══════════════════════════════════════════╝
  Employee : {args.name}
  Email    : {args.email}
  Dept     : {args.dept}
  Task     : {args.task}
  Project  : {args.project}
  Interval : {args.interval}s
  Server   : {API_BASE}

Press Ctrl+C to stop.
""")

    tracker = ActivityTracker(args.name, args.email, args.dept)
    
    bg = threading.Thread(target=tracker.track, daemon=True)
    bg.start()

    try:
        while True:
            time.sleep(args.interval)
            tracker.flush(args.task, args.project)
    except KeyboardInterrupt:
        tracker.running = False
        print("\\n[INFO] Stopping agent. Flushing final data...")
        tracker.flush(args.task, args.project)
        print("[OK] Agent stopped.")

if __name__ == "__main__":
    main()
`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=flowtask_agent.py");
  res.send(script);
});

export default router;
