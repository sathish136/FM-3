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
    idle_hours NUMERIC(4,1) NOT NULL DEFAULT 0,
    active_hours NUMERIC(4,1) NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    system_user TEXT NOT NULL DEFAULT '',
    hostname TEXT NOT NULL DEFAULT '',
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
  ALTER TABLE timesheet_entries ADD COLUMN IF NOT EXISTS idle_hours NUMERIC(4,1) NOT NULL DEFAULT 0;
  ALTER TABLE timesheet_entries ADD COLUMN IF NOT EXISTS active_hours NUMERIC(4,1) NOT NULL DEFAULT 0;
  ALTER TABLE timesheet_entries ADD COLUMN IF NOT EXISTS system_user TEXT NOT NULL DEFAULT '';
  ALTER TABLE timesheet_entries ADD COLUMN IF NOT EXISTS hostname TEXT NOT NULL DEFAULT '';
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
    const { employee_name, employee_email, department, task_title, task_id, project, date, hours, idle_hours, active_hours, description, system_user, hostname } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO timesheet_entries
        (employee_name, employee_email, department, task_title, task_id, project, date, hours, idle_hours, active_hours, description, system_user, hostname)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        employee_name, employee_email || "", department || "", task_title || "", task_id || null,
        project || "", date, hours, idle_hours || 0, active_hours || 0,
        description || "", system_user || "", hostname || ""
      ]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Get tasks for a specific employee (by system username / ERPNext ID) ──────

router.get("/performance/my-tasks", async (req, res) => {
  try {
    const { system_user, employee } = req.query as Record<string, string>;
    const identifier = system_user || employee;
    if (!identifier) return res.status(400).json({ error: "system_user or employee required" });

    const { rows } = await pool.query(
      `SELECT * FROM task_allocations
       WHERE (employee_name ILIKE $1 OR employee_email ILIKE $1)
         AND status != 'completed'
       ORDER BY
         CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         deadline ASC NULLS LAST,
         created_at DESC`,
      [`%${identifier}%`]
    );
    res.json(rows);
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
WTT FlowMatriX - FlowTask Agent v2.0
System-aware employee activity tracker.

- Auto-detects OS login username (= ERPNext Employee ID)
- Fetches YOUR allocated tasks from the server automatically
- Tracks active window + idle time with no manual input required
- Reports timesheet entries every 5 minutes

Usage (zero-config):
    python flowtask_agent.py

Optional overrides:
    python flowtask_agent.py --server https://yourserver.com/api
    python flowtask_agent.py --interval 600 --idle-threshold 180
"""

import time
import datetime
import argparse
import json
import urllib.request
import urllib.error
import urllib.parse
import platform
import subprocess
import threading
import socket
import getpass
import os
import sys

# ─── Configuration ────────────────────────────────────────────────────────────

API_BASE        = "${apiBase}"
CHECK_INTERVAL  = 300   # seconds between auto-reports (5 minutes)
IDLE_THRESHOLD  = 120   # seconds of no input before considered idle
TRACK_INTERVAL  = 5     # seconds between activity samples

# ─── System Identity ──────────────────────────────────────────────────────────

def get_system_user():
    """Get the OS logged-in username (same as ERPNext Employee ID)."""
    try:
        return getpass.getuser()
    except Exception:
        try:
            return os.environ.get("USERNAME") or os.environ.get("USER") or os.environ.get("LOGNAME") or "unknown"
        except Exception:
            return "unknown"

def get_hostname():
    """Get the machine hostname."""
    try:
        return socket.gethostname()
    except Exception:
        return "unknown-host"

# ─── Active Window Detection ──────────────────────────────────────────────────

def get_active_window_title():
    """Get the currently focused window/application name."""
    system = platform.system()
    try:
        if system == "Windows":
            import ctypes
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
            buf = ctypes.create_unicode_buffer(length + 1)
            ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
            title = buf.value or ""
            # Also get process name for better identification
            try:
                import ctypes.wintypes
                pid = ctypes.wintypes.DWORD()
                ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                h = ctypes.windll.kernel32.OpenProcess(0x0400, False, pid)
                buf2 = ctypes.create_unicode_buffer(512)
                ctypes.windll.psapi.GetModuleFileNameExW(h, None, buf2, 512)
                ctypes.windll.kernel32.CloseHandle(h)
                proc = os.path.basename(buf2.value).replace(".exe", "")
                return f"{proc}: {title}" if title else proc
            except Exception:
                return title or "Unknown"

        elif system == "Darwin":
            script = 'tell application "System Events" to get name of first process whose frontmost is true'
            r = subprocess.run(['osascript', '-e', script], capture_output=True, text=True, timeout=3)
            app_name = r.stdout.strip()
            # Try to get window title too
            try:
                script2 = f'tell application "{app_name}" to get name of front window'
                r2 = subprocess.run(['osascript', '-e', script2], capture_output=True, text=True, timeout=3)
                title = r2.stdout.strip()
                return f"{app_name}: {title}" if title else app_name
            except Exception:
                return app_name or "Unknown"

        elif system == "Linux":
            try:
                r = subprocess.run(['xdotool', 'getactivewindow', 'getwindowname'], capture_output=True, text=True, timeout=3)
                return r.stdout.strip() or "Unknown"
            except FileNotFoundError:
                try:
                    r = subprocess.run(['wmctrl', '-a', ':ACTIVE:', '-v'], capture_output=True, text=True, timeout=3)
                    return r.stderr.strip().split("\\n")[0] or "Unknown"
                except Exception:
                    return "Unknown"
    except Exception:
        pass
    return "Unknown"

# ─── Idle Time Detection ──────────────────────────────────────────────────────

def get_idle_seconds():
    """Return seconds since last keyboard/mouse input."""
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
            r = subprocess.run(['ioreg', '-c', 'IOHIDSystem'], capture_output=True, text=True, timeout=3)
            for line in r.stdout.split("\\n"):
                if 'HIDIdleTime' in line:
                    ns = int(line.split('=')[-1].strip())
                    return ns / 1_000_000_000.0

        elif system == "Linux":
            try:
                r = subprocess.run(['xprintidle'], capture_output=True, text=True, timeout=3)
                return int(r.stdout.strip()) / 1000.0
            except FileNotFoundError:
                # Fallback: check /proc/uptime and X server last event
                return 0
    except Exception:
        pass
    return 0

# ─── API Calls ────────────────────────────────────────────────────────────────

def api_get(path, params=None):
    """HTTP GET to the API."""
    url = API_BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  [WARN] API GET {path} failed: {e}")
        return None

def api_post(path, payload):
    """HTTP POST to the API."""
    url = API_BASE + path
    data = json.dumps(payload).encode("utf-8")
    try:
        req = urllib.request.Request(url, data=data,
            headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  [ERROR] POST {path} → HTTP {e.code}: {body}")
    except urllib.error.URLError as e:
        print(f"  [ERROR] Cannot reach server: {e.reason}")
    except Exception as e:
        print(f"  [ERROR] {e}")
    return None

# ─── Fetch Allocated Tasks ────────────────────────────────────────────────────

def fetch_my_tasks(system_user):
    """Get tasks allocated to this employee from the platform."""
    result = api_get("/performance/my-tasks", {"system_user": system_user})
    if isinstance(result, list):
        return result
    return []

def choose_task(tasks, system_user):
    """Interactive terminal menu to pick a task to work on."""
    print("")
    if not tasks:
        print("  No tasks allocated to your account yet.")
        print("  Ask your manager to assign tasks via FlowMatriX > HR > Performance > Task Allocation.")
        print("")
        task_title = input("  Enter task title manually (or press Enter for 'Daily Work'): ").strip()
        project    = input("  Enter project name (or press Enter to skip): ").strip()
        return task_title or "Daily Work", project or "General", None

    print(f"  Tasks assigned to '{system_user}':")
    print(f"  {'#':<3} {'PRIORITY':<10} {'TASK':<35} {'PROJECT':<20} {'EST':<6} {'DEADLINE'}")
    print("  " + "─" * 80)

    prio_sym = {"critical": "!!!!", "high": "!! ", "medium": "!  ", "low": "   "}
    for i, t in enumerate(tasks, 1):
        p   = t.get("priority", "medium")
        sym = prio_sym.get(p, "   ")
        print(f"  {i:<3} {sym+p:<10} {t['task_title'][:34]:<35} {(t.get('project') or 'General')[:19]:<20} "
              f"{str(t.get('estimated_hours','?'))+'h':<6} {t.get('deadline') or '—'}")

    print("")
    while True:
        choice = input(f"  Select task [1-{len(tasks)}] or type 'M' for manual entry: ").strip()
        if choice.upper() == "M":
            task_title = input("  Task title: ").strip() or "Daily Work"
            project    = input("  Project: ").strip() or "General"
            return task_title, project, None
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(tasks):
                t = tasks[idx]
                return t["task_title"], t.get("project") or "General", t.get("id")
        except ValueError:
            pass
        print(f"  Please enter a number between 1 and {len(tasks)}.")

# ─── Activity Tracker ─────────────────────────────────────────────────────────

class ActivityTracker:
    def __init__(self, system_user, hostname, employee_name, department, idle_threshold):
        self.system_user     = system_user
        self.hostname        = hostname
        self.employee_name   = employee_name
        self.department      = department
        self.idle_threshold  = idle_threshold

        # Per-interval counters (reset after each flush)
        self.active_secs     = 0
        self.idle_secs       = 0

        # Window tracking
        self.current_window  = ""
        self.window_start    = time.time()
        self.window_log: list = []   # [(app_name, seconds)]

        self.is_idle         = False
        self.running         = True
        self.lock            = threading.Lock()

    def sample(self):
        """Called every TRACK_INTERVAL seconds from background thread."""
        window = get_active_window_title()
        idle   = get_idle_seconds()

        with self.lock:
            if idle >= self.idle_threshold:
                self.idle_secs  += TRACK_INTERVAL
                self.is_idle     = True
            else:
                self.active_secs += TRACK_INTERVAL
                self.is_idle      = False

                # Track per-app time
                if window != self.current_window:
                    if self.current_window and self.window_start:
                        secs = time.time() - self.window_start
                        self.window_log.append((self.current_window, secs))
                    self.current_window = window
                    self.window_start   = time.time()

    def _track_loop(self):
        while self.running:
            self.sample()
            time.sleep(TRACK_INTERVAL)

    def start(self):
        t = threading.Thread(target=self._track_loop, daemon=True)
        t.start()

    def status_line(self, task_title, elapsed_total):
        """One-line live status for terminal display."""
        with self.lock:
            state  = "IDLE  " if self.is_idle else "ACTIVE"
            active = self.active_secs / 3600
            idle   = self.idle_secs   / 3600
            win    = (self.current_window or "—")[:40]
        total  = elapsed_total / 3600
        now    = datetime.datetime.now().strftime("%H:%M:%S")
        return (f"[{now}] {state} | Active:{active:.2f}h  Idle:{idle:.2f}h  "
                f"Total:{total:.2f}h | App: {win} | Task: {task_title[:30]}")

    def flush(self, task_title, project, task_id, employee_email):
        """Send accumulated time to the platform API."""
        with self.lock:
            active_h = round(self.active_secs / 3600, 1)
            idle_h   = round(self.idle_secs   / 3600, 1)
            total_h  = round((self.active_secs + self.idle_secs) / 3600, 1)

            # Top apps used
            if self.current_window and self.window_start:
                secs = time.time() - self.window_start
                self.window_log.append((self.current_window, secs))
                self.current_window = ""
                self.window_start   = time.time()

            top_apps = sorted(self.window_log, key=lambda x: x[1], reverse=True)[:5]
            self.window_log  = []
            self.active_secs = 0
            self.idle_secs   = 0

        if total_h < 0.01:
            print("  [SKIP] No time tracked in this interval — skipping.")
            return

        apps_str = ", ".join(
            f"{a[0][:30]} ({a[1]/3600:.1f}h)" for a in top_apps
        ) if top_apps else "No window data"

        description = (
            f"Machine: {self.hostname} | System User: {self.system_user} | "
            f"Active: {active_h}h | Idle: {idle_h}h | Apps: {apps_str}"
        )

        today = datetime.date.today().isoformat()
        payload = {
            "employee_name":  self.employee_name,
            "employee_email": employee_email,
            "department":     self.department,
            "task_title":     task_title,
            "task_id":        task_id,
            "project":        project,
            "date":           today,
            "hours":          total_h,
            "active_hours":   active_h,
            "idle_hours":     idle_h,
            "description":    description,
            "system_user":    self.system_user,
            "hostname":       self.hostname,
        }

        result = api_post("/performance/timesheets", payload)
        if result:
            print(f"  [OK ] Logged — Active: {active_h}h | Idle: {idle_h}h | Task: {task_title}")
        # else error already printed by api_post

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="WTT FlowTask Agent v2.0 — System-aware employee activity tracker"
    )
    parser.add_argument("--server",         default=API_BASE,        help="API server base URL")
    parser.add_argument("--name",           default="",              help="Override display name (default: same as system username)")
    parser.add_argument("--dept",           default="General",       help="Department (optional)")
    parser.add_argument("--email",          default="",              help="Work email (optional)")
    parser.add_argument("--interval",       type=int, default=CHECK_INTERVAL,   help="Report interval in seconds (default: 300)")
    parser.add_argument("--idle-threshold", type=int, default=IDLE_THRESHOLD,   help="Idle threshold in seconds (default: 120)")
    args = parser.parse_args()

    global API_BASE, IDLE_THRESHOLD
    API_BASE       = args.server
    IDLE_THRESHOLD = args.idle_threshold

    system_user    = get_system_user()
    hostname       = get_hostname()
    employee_name  = args.name or system_user
    department     = args.dept
    employee_email = args.email or f"{system_user}@wtt.com"

    print("""
╔══════════════════════════════════════════════════╗
║   WTT FlowMatriX — FlowTask Agent v2.0          ║
║   System-Aware Employee Activity Tracker         ║
╚══════════════════════════════════════════════════╝""")
    print(f"  System User  : {system_user}  (ERPNext Employee ID)")
    print(f"  Machine      : {hostname}")
    print(f"  Display Name : {employee_name}")
    print(f"  Department   : {department}")
    print(f"  Report every : {args.interval}s  |  Idle after: {IDLE_THRESHOLD}s")
    print(f"  Server       : {API_BASE}")
    print("")

    # Fetch tasks from the platform
    print("  Fetching your tasks from the platform...")
    tasks = fetch_my_tasks(system_user)
    if not tasks:
        # Try again with display name
        tasks = fetch_my_tasks(employee_name)

    task_title, project, task_id = choose_task(tasks, system_user)

    print(f"""
  ┌──────────────────────────────────────────────────┐
  │  Now tracking:  {task_title[:32]:<32}  │
  │  Project:       {project[:32]:<32}  │
  │  Press Ctrl+C to stop and flush remaining data   │
  └──────────────────────────────────────────────────┘
""")

    tracker = ActivityTracker(system_user, hostname, employee_name, department, IDLE_THRESHOLD)
    tracker.start()

    session_start  = time.time()
    last_report    = time.time()
    last_status    = time.time()

    try:
        while True:
            time.sleep(1)
            now = time.time()

            # Print status line every 30 seconds
            if now - last_status >= 30:
                elapsed = now - session_start
                print("  " + tracker.status_line(task_title, elapsed))
                last_status = now

            # Flush every interval
            if now - last_report >= args.interval:
                print(f"\\n  [REPORT] Sending interval report...")
                tracker.flush(task_title, project, task_id, employee_email)
                last_report = now

    except KeyboardInterrupt:
        tracker.running = False
        print("\\n\\n  [STOP] Ctrl+C received — flushing final session data...")
        tracker.flush(task_title, project, task_id, employee_email)
        elapsed = time.time() - session_start
        print(f"  [DONE] Session complete. Total session: {elapsed/3600:.2f}h")
        print("         Data saved to FlowMatriX. Goodbye!")

if __name__ == "__main__":
    main()
`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=flowtask_agent.py");
  res.send(script);
});

export default router;
