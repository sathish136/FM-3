"""
FlowMatriX Activity Agent  v6.1
================================
Shows a fully self-contained Employee Dashboard window.
No browser redirect. No external web server required.
The dashboard HTML is embedded right here and calls the API directly.

SETUP (run once):
    pip install requests psutil pywebview

RUN:
    python flowmatrix_activity_agent.py

PACKAGE AS EXE (Windows):
    pip install pyinstaller
    pyinstaller --onefile --noconsole --name FlowMatrixAgent flowmatrix_activity_agent.py
"""

import sys, time, socket, platform, getpass, os, threading, logging, urllib.parse
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
# API server — accessible from your PC over the internet
API_URL = "https://766e4ea0-5b9e-488a-ad69-f3453d798d6d-00-3m118gokkcn7o.pike.replit.dev/api"

DEVICE_USERNAME = "AUTO"   # override with your ERPNext username if auto-detect fails
HEARTBEAT_SEC   = 30
IDLE_THRESHOLD  = 300      # seconds idle → marked Idle

PLATFORM = platform.system()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("fm")


# ─────────────────────────────────────────────────────────────────────────────
# Platform helpers
# ─────────────────────────────────────────────────────────────────────────────

def detect_username():
    if DEVICE_USERNAME != "AUTO":
        return DEVICE_USERNAME
    if PLATFORM == "Windows":
        try:
            import ctypes
            buf  = ctypes.create_unicode_buffer(256)
            size = ctypes.c_ulong(256)
            if ctypes.windll.secur32.GetUserNameExW(2, buf, ctypes.byref(size)):
                v = buf.value
                if "\\" in v: return v.split("\\")[-1]
                if "@"  in v: return v.split("@")[0]
                return v
        except Exception:
            pass
    try:
        return getpass.getuser()
    except Exception:
        pass
    return (os.environ.get("USERNAME") or os.environ.get("USER")
            or os.environ.get("LOGNAME") or socket.gethostname())


def get_idle_seconds():
    try:
        if PLATFORM == "Windows":
            import ctypes
            class LII(ctypes.Structure):
                _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_ulong)]
            lii = LII()
            lii.cbSize = ctypes.sizeof(LII)
            ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii))
            return max(0.0, (ctypes.windll.kernel32.GetTickCount() - lii.dwTime) / 1000.0)
        if PLATFORM == "Darwin":
            import subprocess
            out = subprocess.check_output(
                ["ioreg", "-c", "IOHIDSystem"], stderr=subprocess.DEVNULL).decode()
            for line in out.split("\n"):
                if "HIDIdleTime" in line:
                    return int(line.split("=")[-1].strip()) / 1_000_000_000
    except Exception:
        pass
    return 0.0


def get_active_window():
    try:
        if PLATFORM == "Windows":
            import ctypes
            hwnd  = ctypes.windll.user32.GetForegroundWindow()
            pid   = ctypes.c_ulong()
            ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            buf = ctypes.create_unicode_buffer(512)
            ctypes.windll.user32.GetWindowTextW(hwnd, buf, 512)
            win_title = buf.value or ""
            try:
                import psutil
                proc = psutil.Process(pid.value)
                return proc.name(), win_title
            except Exception:
                return "Windows", win_title
        if PLATFORM == "Darwin":
            import subprocess
            out = subprocess.check_output(
                ["osascript", "-e",
                 'tell application "System Events" to get name of first application process '
                 'whose frontmost is true'],
                stderr=subprocess.DEVNULL).decode().strip()
            return out, ""
    except Exception:
        pass
    return "", ""


# ─────────────────────────────────────────────────────────────────────────────
# Background heartbeat agent
# ─────────────────────────────────────────────────────────────────────────────

class BackgroundAgent:
    def __init__(self, username: str):
        self.username  = username
        self._running  = True
        self._session  = None

    def start(self):
        threading.Thread(target=self._init, daemon=True).start()

    def stop(self):
        self._running = False

    def _init(self):
        try:
            import requests
        except ImportError:
            log.error("Install with: pip install requests psutil pywebview")
            return
        self._session = requests.Session()
        self._session.headers.update({
            "Content-Type": "application/json",
            "User-Agent":   "FlowMatriX-Agent/6.1",
        })
        threading.Thread(target=self._loop, daemon=True).start()
        log.info("Heartbeat started — user: %s", self.username)

    def _loop(self):
        while self._running:
            self._beat()
            time.sleep(HEARTBEAT_SEC)

    def _beat(self):
        app, win = get_active_window()
        idle     = get_idle_seconds()
        try:
            r = self._session.post(
                f"{API_URL}/activity/heartbeat",
                timeout=10,
                json={
                    "deviceUsername": self.username,
                    "activeApp":      app,
                    "windowTitle":    win[:250],
                    "isActive":       idle < IDLE_THRESHOLD,
                    "idleSeconds":    int(idle),
                    "deviceName":     socket.gethostname(),
                },
            )
            log.debug("Heartbeat → %s  app=%s  idle=%ds", r.status_code, app, int(idle))
        except Exception as e:
            log.warning("Heartbeat error: %s", e)


# ─────────────────────────────────────────────────────────────────────────────
# Self-contained HTML dashboard
# ─────────────────────────────────────────────────────────────────────────────

def build_html(api_url: str, username: str) -> str:
    """Return a complete standalone HTML page that renders the employee dashboard."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>FlowMatriX · Activity Agent</title>
<style>
  *,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
  :root{{
    --bg:#0D0B1A;--sidebar:#12102A;--card:#1A1836;--border:#2A2850;
    --blue:#2492FF;--blue-dim:#1A3A6E;--purple:#7C3AED;--purple-dim:#2D1B69;
    --green:#10B981;--green-dim:#064E3B;--amber:#F59E0B;--amber-dim:#451A03;
    --red:#EF4444;--red-dim:#450A0A;--accent:#FF3C00;
    --text:#F1F0FF;--text-sub:#9491B4;--text-dim:#5B5880;
  }}
  html,body{{height:100%;overflow:hidden;background:var(--bg);color:var(--text);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px}}
  /* Scrollbar */
  ::-webkit-scrollbar{{width:6px;height:6px}}
  ::-webkit-scrollbar-track{{background:transparent}}
  ::-webkit-scrollbar-thumb{{background:var(--border);border-radius:99px}}

  /* Layout */
  #app{{display:flex;flex-direction:column;height:100vh}}
  #topbar{{flex-shrink:0;height:52px;background:var(--sidebar);
    border-bottom:1px solid var(--border);display:flex;align-items:center;
    justify-content:space-between;padding:0 20px;gap:12px}}
  #body{{display:flex;flex:1;overflow:hidden}}
  #sidebar{{width:280px;flex-shrink:0;background:var(--sidebar);
    border-right:1px solid var(--border);overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}}
  #main{{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px}}

  /* Topbar */
  .tb-brand{{display:flex;align-items:center;gap:8px}}
  .tb-bolt{{color:var(--blue);font-size:18px;font-weight:900}}
  .tb-name{{color:var(--text);font-weight:800;font-size:14px}}
  .tb-sep{{color:var(--border)}}
  .tb-sub{{color:var(--text-sub);font-size:12px}}
  .tb-right{{display:flex;align-items:center;gap:12px}}
  .status-dot{{width:8px;height:8px;border-radius:50%;display:inline-block}}
  .pulse{{animation:pulse 1.5s infinite}}
  @keyframes pulse{{0%,100%{{opacity:1}}50%{{opacity:.4}}}}
  .status-lbl{{font-size:11px;color:var(--text-sub);font-weight:600}}
  .btn{{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;
    border:1px solid var(--border);background:var(--card);color:var(--text-sub);
    font-size:11px;font-weight:600;cursor:pointer;transition:all .15s}}
  .btn:hover{{background:var(--border);color:var(--text)}}
  .btn-blue{{background:var(--blue);border-color:var(--blue);color:#fff}}
  .btn-blue:hover{{background:#1a7fe8;border-color:#1a7fe8;color:#fff}}
  .ts{{font-size:10px;color:var(--text-dim)}}

  /* Cards */
  .card{{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden}}
  .card-body{{padding:16px}}
  .section-title{{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;
    color:var(--text-dim);margin-bottom:12px}}

  /* Profile */
  .profile-hero{{height:64px;background:linear-gradient(135deg,rgba(36,146,255,.3),rgba(124,58,237,.2),var(--card))}}
  .profile-inner{{padding:0 16px 16px}}
  .avatar-wrap{{margin-top:-36px;margin-bottom:10px}}
  .avatar{{width:72px;height:72px;border-radius:12px;border:3px solid var(--card);
    object-fit:cover;box-shadow:0 4px 16px rgba(0,0,0,.4)}}
  .avatar-init{{width:72px;height:72px;border-radius:12px;border:3px solid var(--card);
    background:linear-gradient(135deg,var(--blue),var(--purple));
    display:flex;align-items:center;justify-content:center;
    font-size:22px;font-weight:900;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.4)}}
  .emp-name{{font-size:14px;font-weight:900;color:var(--text);line-height:1.2}}
  .emp-desig{{font-size:11px;font-weight:700;color:var(--blue);margin-top:1px}}
  .emp-dept{{font-size:11px;color:var(--text-sub)}}
  .emp-id{{display:inline-flex;align-items:center;gap:5px;margin-top:8px;
    padding:5px 10px;border-radius:7px;background:var(--sidebar);
    border:1px solid var(--border);font-family:monospace;font-size:11px;color:var(--text-sub)}}
  .name-row{{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:2px}}
  .status-badge{{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;
    border-radius:99px;font-size:9px;font-weight:700;color:#fff;white-space:nowrap}}

  /* Details list */
  .detail-row{{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}}
  .detail-icon{{color:var(--text-dim);flex-shrink:0;margin-top:1px;font-size:12px}}
  .detail-lbl{{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-dim)}}
  .detail-val{{font-size:11px;color:var(--text);font-weight:500;word-break:break-all}}

  /* Activity */
  .act-row{{display:flex;align-items:flex-start;gap:10px;padding:10px;
    background:var(--sidebar);border-radius:10px;margin-bottom:8px}}
  .act-icon{{color:var(--blue);font-size:14px;flex-shrink:0}}
  .act-lbl{{font-size:8px;font-weight:700;text-transform:uppercase;color:var(--text-dim)}}
  .act-val{{font-size:11px;color:#fff;font-weight:700}}
  .act-sub{{font-size:10px;color:var(--text-sub);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
  .offline-box{{display:flex;flex-direction:column;align-items:center;padding:24px;gap:8px}}
  .offline-icon{{font-size:28px;color:var(--border)}}
  .offline-txt{{font-size:11px;color:var(--text-dim);text-align:center;line-height:1.5}}

  /* Stat cards */
  #stats{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}}
  .stat{{background:var(--card);border:1px solid var(--border);border-radius:14px;
    padding:16px;display:flex;align-items:center;gap:12px}}
  .stat-icon{{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;
    justify-content:center;font-size:18px;flex-shrink:0}}
  .stat-val{{font-size:22px;font-weight:900;line-height:1}}
  .stat-lbl{{font-size:10px;font-weight:600;color:var(--text-sub);margin-top:2px}}
  .stat-sub{{font-size:9px;color:var(--text-dim);margin-top:1px}}

  /* Welcome banner */
  #welcome{{background:linear-gradient(90deg,rgba(36,146,255,.1),rgba(124,58,237,.1),transparent);
    border:1px solid rgba(36,146,255,.2);border-radius:14px;padding:18px 22px;
    display:flex;align-items:center;justify-content:space-between;gap:12px}}
  .welcome-name{{font-size:16px;font-weight:900;color:var(--text)}}
  .welcome-date{{font-size:12px;color:var(--text-sub);margin-top:2px}}
  .badge-active{{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;
    background:var(--green-dim);border:1px solid rgba(16,185,129,.3);
    font-size:11px;font-weight:700;color:var(--green)}}
  .badge-idle{{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;
    background:var(--amber-dim);border:1px solid rgba(245,158,11,.3);
    font-size:11px;font-weight:700;color:var(--amber)}}
  .badge-offline{{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;
    background:var(--card);border:1px solid var(--border);
    font-size:11px;font-weight:700;color:var(--text-dim)}}

  /* Progress */
  #progress-wrap{{background:var(--card);border:1px solid var(--border);border-radius:14px;
    padding:14px 18px;display:flex;align-items:center;gap:16px}}
  .prog-bar-bg{{flex:1;height:8px;background:var(--sidebar);border-radius:99px;overflow:hidden}}
  .prog-bar-fill{{height:100%;background:linear-gradient(90deg,var(--blue),var(--green));border-radius:99px;transition:width .4s}}
  .prog-label{{font-size:10px;font-weight:700;color:var(--text-sub)}}
  .prog-pct{{font-size:13px;font-weight:900;color:var(--text)}}
  .prog-stats{{display:flex;align-items:center;gap:14px;flex-shrink:0}}
  .prog-stat{{text-align:center}}
  .prog-stat-val{{font-size:14px;font-weight:900;line-height:1}}
  .prog-stat-lbl{{font-size:9px;color:var(--text-dim);margin-top:1px}}

  /* Task groups */
  .group-header{{display:flex;align-items:center;gap:8px;margin-bottom:10px;margin-top:8px}}
  .group-badge{{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;
    border-radius:7px;font-size:9px;font-weight:700}}
  .group-count{{font-size:10px;color:var(--text-dim)}}
  .group-line{{flex:1;height:1px;background:var(--border)}}
  .tasks-grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}}
  @media(max-width:900px){{.tasks-grid{{grid-template-columns:1fr}}}}

  /* Task card */
  .task-card{{background:var(--card);border:1px solid var(--border);border-radius:10px;
    border-left-width:4px;overflow:hidden;transition:border-color .15s}}
  .task-card:hover{{border-color:rgba(36,146,255,.4)}}
  .task-body{{padding:14px}}
  .task-top{{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}}
  .task-title{{font-size:12px;font-weight:700;color:var(--text);line-height:1.4;flex:1}}
  .task-status{{display:inline-flex;align-items:center;gap:4px;padding:4px 9px;
    border-radius:6px;font-size:9px;font-weight:700;white-space:nowrap;flex-shrink:0}}
  .task-desc{{font-size:10px;color:var(--text-sub);line-height:1.5;margin-bottom:10px;
    display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}}
  .task-meta{{display:flex;align-items:center;gap:6px;flex-wrap:wrap}}
  .pill{{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;
    border-radius:5px;font-size:9px;font-weight:700}}
  .task-footer{{margin-top:10px;padding-top:10px;border-top:1px solid var(--border);
    display:flex;align-items:center;justify-content:space-between}}
  .task-by{{font-size:9px;color:var(--text-dim)}}
  .task-ago{{font-size:9px;color:var(--text-dim)}}
  .ml-auto{{margin-left:auto}}

  /* Empty */
  .empty{{background:var(--card);border:1px solid var(--border);border-radius:14px;
    padding:60px;display:flex;flex-direction:column;align-items:center;gap:10px}}
  .empty-icon{{font-size:36px;color:var(--border)}}
  .empty-title{{font-size:13px;font-weight:600;color:var(--text-sub)}}
  .empty-sub{{font-size:11px;color:var(--text-dim)}}

  /* Spinner */
  #loader{{position:fixed;inset:0;background:var(--bg);display:flex;
    flex-direction:column;align-items:center;justify-content:center;gap:16px;z-index:99}}
  .spinner{{width:36px;height:36px;border-radius:50%;border:2px solid var(--border);
    border-top-color:var(--blue);animation:spin .8s linear infinite}}
  @keyframes spin{{to{{transform:rotate(360deg)}}}}
  .loader-text{{font-size:12px;color:var(--text-sub)}}

  /* Notif */
  .notif-item{{padding:10px;border-radius:9px;border:1px solid var(--border);
    background:var(--sidebar);margin-bottom:6px}}
  .notif-title{{font-size:9px;font-weight:700;margin-bottom:3px}}
  .notif-msg{{font-size:9px;color:var(--text-sub);line-height:1.4}}
  .notif-time{{font-size:8px;color:var(--text-dim);margin-top:4px}}
  .unread{{background:var(--card);border-color:var(--border)}}
</style>
</head>
<body>

<div id="loader">
  <div class="spinner"></div>
  <div class="loader-text">Loading your dashboard…</div>
</div>

<div id="app" style="display:none">

  <!-- TOP BAR -->
  <div id="topbar">
    <div class="tb-brand">
      <span class="tb-bolt">⚡</span>
      <span class="tb-name">FlowMatriX</span>
      <span class="tb-sep">|</span>
      <span class="tb-sub">Employee Dashboard</span>
    </div>
    <div class="tb-right">
      <span class="status-dot pulse" id="status-dot" style="background:#4B5563"></span>
      <span class="status-lbl" id="status-lbl">Loading…</span>
      <button class="btn" onclick="loadData()">↻ Refresh</button>
      <span class="ts" id="ts-lbl"></span>
    </div>
  </div>

  <!-- BODY -->
  <div id="body">

    <!-- SIDEBAR -->
    <div id="sidebar">

      <!-- Profile card -->
      <div class="card" id="profile-card">
        <div class="profile-hero"></div>
        <div class="profile-inner">
          <div class="avatar-wrap" id="avatar-wrap">
            <div class="avatar-init" id="avatar-init">?</div>
          </div>
          <div class="name-row">
            <span class="emp-name" id="emp-name">—</span>
            <span class="status-badge" id="profile-status" style="background:#4B5563">Offline</span>
          </div>
          <div class="emp-desig" id="emp-desig"></div>
          <div class="emp-dept"  id="emp-dept"></div>
          <div class="emp-id"    id="emp-id" style="display:none">🪪 <span id="emp-id-val">—</span></div>
        </div>
      </div>

      <!-- Employee details -->
      <div class="card card-body" id="details-card">
        <div class="section-title">Employee Details</div>
        <div id="details-list"></div>
      </div>

      <!-- Live activity -->
      <div class="card card-body">
        <div class="section-title" style="display:flex;align-items:center;gap:6px">
          <span class="status-dot" id="act-dot" style="background:#4B5563"></span>
          Live Activity
        </div>
        <div id="activity-panel">
          <div class="offline-box">
            <div class="offline-icon">📡</div>
            <div class="offline-txt">Waiting for heartbeat…</div>
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="card card-body" id="notif-card" style="display:none">
        <div class="section-title" style="display:flex;justify-content:space-between">
          Notifications <span id="unread-badge" style="background:var(--accent);color:#fff;padding:1px 6px;border-radius:99px;font-size:8px;display:none"></span>
        </div>
        <div id="notif-list"></div>
      </div>

    </div>

    <!-- MAIN -->
    <div id="main">

      <!-- Welcome banner -->
      <div id="welcome">
        <div>
          <div class="welcome-name">Welcome back, <span id="welcome-name">Employee</span> 👋</div>
          <div class="welcome-date" id="welcome-date"></div>
        </div>
        <div id="welcome-badge"><div class="badge-offline">⚡ Loading…</div></div>
      </div>

      <!-- Stats -->
      <div id="stats">
        <div class="stat">
          <div class="stat-icon" style="background:var(--blue-dim)">📋</div>
          <div><div class="stat-val" id="s-total">0</div><div class="stat-lbl">Total Tasks</div><div class="stat-sub">All assigned</div></div>
        </div>
        <div class="stat">
          <div class="stat-icon" style="background:var(--amber-dim)">▶</div>
          <div><div class="stat-val" id="s-prog">0</div><div class="stat-lbl">In Progress</div><div class="stat-sub">Working on</div></div>
        </div>
        <div class="stat">
          <div class="stat-icon" style="background:var(--green-dim)">✔</div>
          <div><div class="stat-val" id="s-done">0</div><div class="stat-lbl">Completed</div><div class="stat-sub" id="s-done-pct"></div></div>
        </div>
        <div class="stat">
          <div class="stat-icon" style="background:var(--red-dim)">⚠</div>
          <div><div class="stat-val" id="s-over">0</div><div class="stat-lbl">Overdue</div><div class="stat-sub">Needs attention</div></div>
        </div>
      </div>

      <!-- Progress bar -->
      <div id="progress-wrap" style="display:none">
        <span style="font-size:16px">📈</span>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span class="prog-label">Overall Completion</span>
            <span class="prog-pct" id="prog-pct">0%</span>
          </div>
          <div class="prog-bar-bg"><div class="prog-bar-fill" id="prog-bar" style="width:0%"></div></div>
        </div>
        <div class="prog-stats">
          <div class="prog-stat"><div class="prog-stat-val" id="p-todo"  style="color:var(--text-sub)">0</div><div class="prog-stat-lbl">To Do</div></div>
          <div class="prog-stat"><div class="prog-stat-val" id="p-prog"  style="color:var(--amber)">0</div><div class="prog-stat-lbl">In Prog</div></div>
          <div class="prog-stat"><div class="prog-stat-val" id="p-rev"   style="color:var(--purple)">0</div><div class="prog-stat-lbl">Review</div></div>
          <div class="prog-stat"><div class="prog-stat-val" id="p-done2" style="color:var(--green)">0</div><div class="prog-stat-lbl">Done</div></div>
        </div>
      </div>

      <!-- Task groups -->
      <div id="tasks-area"></div>

    </div>
  </div>
</div>

<script>
const API = "{api_url}";
const USERNAME = "{username}";

// ── Colour maps ───────────────────────────────────────────────────────────────
const STATUS = {{
  todo:        {{label:"To Do",       color:"var(--text-dim)", bg:"var(--card)",       border:"#4B5563"}},
  in_progress: {{label:"In Progress", color:"var(--blue)",    bg:"var(--blue-dim)",   border:"var(--blue)"}},
  review:      {{label:"In Review",   color:"var(--amber)",   bg:"var(--amber-dim)",  border:"var(--amber)"}},
  done:        {{label:"Done",        color:"var(--green)",   bg:"var(--green-dim)",  border:"var(--green)"}},
}};
const PRIORITY = {{
  critical: {{dot:"var(--accent)", pill:"var(--red-dim)",    label:"Critical", color:"var(--accent)"}},
  high:     {{dot:"var(--red)",    pill:"var(--red-dim)",    label:"High",     color:"var(--red)"}},
  medium:   {{dot:"var(--amber)",  pill:"var(--amber-dim)",  label:"Medium",   color:"var(--amber)"}},
  low:      {{dot:"var(--green)",  pill:"var(--green-dim)",  label:"Low",      color:"var(--green)"}},
}};
const GROUP_ORDER = ["in_progress","todo","review","done"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeSince(iso) {{
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)   return Math.floor(s) + "s ago";
  if (s < 3600) return Math.floor(s/60) + "m ago";
  if (s < 86400)return Math.floor(s/3600) + "h ago";
  return Math.floor(s/86400) + "d ago";
}}
function fmtIdle(s) {{
  if (s < 60) return s + "s";
  const m = Math.floor(s/60);
  if (m < 60) return m + " min";
  return Math.floor(m/60) + "h " + (m%60) + "m";
}}
function isOverdue(due, status) {{
  return due && due < new Date().toISOString().slice(0,10) && status !== "done";
}}
function initials(name) {{
  return (name||"?").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
}}
function esc(s) {{
  return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}}
function el(id){{return document.getElementById(id)}}

// ── Render ────────────────────────────────────────────────────────────────────
function renderProfile(profile, activity) {{
  const name  = (profile&&profile.full_name)  || (activity&&activity.fullName)  || USERNAME;
  const desig = (profile&&profile.designation)|| (activity&&activity.designation)|| "";
  const dept  = (profile&&profile.department) || (activity&&activity.department) || "";
  const empId = (profile&&profile.employee_number) || (activity&&activity.erpEmployeeId) || "";
  const photo = (profile&&profile.photo) ? profile.photo : (activity&&activity.erpImage ? activity.erpImage : null);

  el("emp-name").textContent  = name;
  el("emp-desig").textContent = desig;
  el("emp-dept").textContent  = dept;
  el("welcome-name").textContent = name.split(" ")[0];

  if (empId) {{
    el("emp-id").style.display = "inline-flex";
    el("emp-id-val").textContent = empId;
  }}

  const aw = el("avatar-wrap");
  if (photo) {{
    // proxy through API to avoid CORS on ERP images
    const proxied = API + "/auth/photo?url=" + encodeURIComponent(photo);
    aw.innerHTML = `<img class="avatar" src="${{proxied}}" alt="${{esc(name)}}" onerror="this.style.display='none';document.getElementById('avatar-init').style.display='flex'"/>
                    <div class="avatar-init" id="avatar-init" style="display:none">${{esc(initials(name))}}</div>`;
  }} else {{
    aw.innerHTML = `<div class="avatar-init">${{esc(initials(name))}}</div>`;
  }}

  // Details list
  const rows = [
    ["✉", "Email",       (profile&&profile.email)||(activity&&activity.email)||""],
    ["📱", "Mobile",      profile&&profile.mobile_no],
    ["🏢", "Company",     profile&&profile.company],
    ["📍", "Branch",      profile&&profile.branch],
    ["📅", "Joined",      profile&&profile.date_of_joining],
    ["💼", "Employment",  profile&&profile.employment_type],
    ["👤", "Gender",      profile&&profile.gender],
    ["⭐", "Grade",       profile&&profile.grade],
    ["🏅", "Reports To",  profile&&profile.reports_to],
    ["🔵", "Status",      profile&&profile.employee_status],
  ];
  el("details-list").innerHTML = rows.filter(r=>r[2]).map(([icon,label,val])=>`
    <div class="detail-row">
      <span class="detail-icon">${{icon}}</span>
      <div>
        <div class="detail-lbl">${{esc(label)}}</div>
        <div class="detail-val">${{esc(val)}}</div>
      </div>
    </div>
  `).join("");
}}

function renderActivity(act) {{
  const secsAgo = act ? (Date.now()-new Date(act.lastSeen).getTime())/1000 : Infinity;
  const online  = secsAgo < 300;
  const idle    = online && (!act.isActive || (act.idleSeconds||0) > 300);
  const active  = online && !idle;

  const dotColor   = active ? "var(--green)" : idle ? "var(--amber)" : "#4B5563";
  const dotClass   = active ? " pulse" : "";
  const statusText = active ? "Active" : idle ? "Idle" : "Offline";
  const badgeColor = active ? "var(--green)" : idle ? "var(--amber)" : "#4B5563";

  el("status-dot").style.background = dotColor;
  el("status-dot").className = "status-dot" + dotClass;
  el("status-lbl").textContent = statusText;
  el("act-dot").style.background = dotColor;
  el("act-dot").className = "status-dot" + dotClass;
  el("profile-status").textContent = statusText;
  el("profile-status").style.background = badgeColor;

  // Welcome badge
  if (active) {{
    el("welcome-badge").innerHTML = `<div class="badge-active">⚡ You're Active</div>`;
  }} else if (idle) {{
    el("welcome-badge").innerHTML = `<div class="badge-idle">☕ Idle · ${{fmtIdle(act.idleSeconds||0)}}</div>`;
  }} else {{
    el("welcome-badge").innerHTML = `<div class="badge-offline">📡 Agent Offline</div>`;
  }}

  // Activity panel
  if (act && online) {{
    let html = `
      <div class="act-row">
        <span class="act-icon">🖥</span>
        <div style="min-width:0">
          <div class="act-lbl">Current App</div>
          <div class="act-val">${{esc(act.activeApp||"—")}}</div>
          ${{act.windowTitle && act.windowTitle !== act.activeApp
            ? `<div class="act-sub" title="${{esc(act.windowTitle)}}">${{esc(act.windowTitle)}}</div>` : ""}}
        </div>
      </div>`;
    if (idle && (act.idleSeconds||0) > 0) {{
      html += `<div class="act-row" style="background:rgba(69,26,3,.4);border:1px solid rgba(245,158,11,.2)">
        <span class="act-icon" style="color:var(--amber)">☕</span>
        <div><div class="act-lbl" style="color:var(--amber)">Idle Time</div>
        <div class="act-val" style="color:var(--amber)">${{fmtIdle(act.idleSeconds)}}</div></div>
      </div>`;
    }}
    html += `<div class="act-row">
      <span class="act-icon" style="color:var(--text-dim)">💻</span>
      <div><div class="act-lbl">Device</div>
      <div class="act-val" style="font-family:monospace;font-size:10px;color:var(--text-sub)">${{esc(act.deviceName||"—")}}</div></div>
    </div>
    <div style="font-size:9px;color:var(--text-dim);display:flex;align-items:center;gap:5px;padding:4px 2px">
      🕐 Last seen ${{timeSince(act.lastSeen)}}
    </div>`;
    el("activity-panel").innerHTML = html;
  }} else {{
    el("activity-panel").innerHTML = `<div class="offline-box">
      <div class="offline-icon">📡</div>
      <div class="offline-txt">${{act ? "Agent offline" : "No heartbeat received yet"}}<br>
        <span style="font-size:9px">Keep the desktop agent running</span></div>
    </div>`;
  }}
}}

function renderNotifications(notifs) {{
  if (!notifs || !notifs.length) {{
    el("notif-card").style.display = "none";
    return;
  }}
  el("notif-card").style.display = "block";
  const unread = notifs.filter(n=>!n.read).length;
  if (unread > 0) {{
    el("unread-badge").style.display = "inline";
    el("unread-badge").textContent = unread;
  }}
  const typeColor = {{success:"var(--green)",warning:"var(--amber)",error:"var(--red)",info:"var(--blue)"}};
  el("notif-list").innerHTML = notifs.slice(0,5).map(n=>`
    <div class="notif-item ${{n.read?'':'unread'}}">
      <div class="notif-title" style="color:${{typeColor[n.type]||'var(--blue)'}}">
        ${{esc(n.title)}}
      </div>
      <div class="notif-msg">${{esc(n.message)}}</div>
      <div class="notif-time">${{timeSince(n.createdAt)}}</div>
    </div>
  `).join("");
}}

function renderTasks(tasks) {{
  const total  = tasks.length;
  const inProg = tasks.filter(t=>t.status==="in_progress").length;
  const done   = tasks.filter(t=>t.status==="done").length;
  const over   = tasks.filter(t=>isOverdue(t.dueDate,t.status)).length;

  el("s-total").textContent = total;
  el("s-prog").textContent  = inProg;
  el("s-done").textContent  = done;
  el("s-over").textContent  = over;
  el("s-done-pct").textContent = total>0 ? Math.round(done/total*100)+"% done" : "";

  if (total > 0) {{
    const pct = Math.round(done/total*100);
    el("progress-wrap").style.display = "flex";
    el("prog-pct").textContent = pct+"%";
    el("prog-bar").style.width = pct+"%";
    el("p-todo").textContent  = tasks.filter(t=>t.status==="todo").length;
    el("p-prog").textContent  = inProg;
    el("p-rev").textContent   = tasks.filter(t=>t.status==="review").length;
    el("p-done2").textContent = done;
  }} else {{
    el("progress-wrap").style.display = "none";
  }}

  const area = el("tasks-area");
  if (total === 0) {{
    area.innerHTML = `<div class="empty">
      <div class="empty-icon">✅</div>
      <div class="empty-title">No tasks assigned to you yet</div>
      <div class="empty-sub">Your manager will assign tasks and they'll appear here</div>
    </div>`;
    return;
  }}

  let html = "";
  for (const status of GROUP_ORDER) {{
    const group = tasks.filter(t=>t.status===status);
    if (!group.length) continue;
    const s = STATUS[status] || STATUS.todo;
    html += `
      <div class="group-header">
        <span class="group-badge" style="color:${{s.color}};background:${{s.bg}}">${{s.label}}</span>
        <span class="group-count">${{group.length}} task${{group.length!==1?"s":""}}</span>
        <div class="group-line"></div>
      </div>
      <div class="tasks-grid">`;
    for (const t of group) {{
      const s   = STATUS[t.status]   || STATUS.todo;
      const p   = PRIORITY[t.priority] || PRIORITY.medium;
      const ov  = isOverdue(t.dueDate, t.status);
      const tags= (t.tags||"").split(",").filter(x=>x.trim()).slice(0,2);
      html += `
        <div class="task-card" style="border-left-color:${{s.border}}">
          <div class="task-body">
            <div class="task-top">
              <div class="task-title">${{esc(t.title)}}</div>
              <span class="task-status" style="color:${{s.color}};background:${{s.bg}}">${{s.label}}</span>
            </div>
            ${{t.description ? `<div class="task-desc">${{esc(t.description)}}</div>` : ""}}
            <div class="task-meta">
              <span class="pill" style="color:${{p.color}};background:${{p.pill}}">
                ● ${{p.label}}
              </span>
              ${{tags.map(tag=>`<span class="pill" style="color:var(--purple);background:var(--purple-dim)"># ${{esc(tag.trim())}}</span>`).join("")}}
              ${{t.dueDate ? `<span class="pill ml-auto" style="color:${{ov?"var(--red)":"var(--text-dim)"}};background:${{ov?"var(--red-dim)":"var(--card)"}}">
                ${{ov?"⚠ Overdue · ":""}}${{esc(t.dueDate)}}
              </span>` : ""}}
            </div>
            <div class="task-footer">
              <span class="task-by">by ${{esc((t.createdBy||"").split("@")[0]||"—")}}</span>
              <span class="task-ago">${{timeSince(t.updatedAt||t.createdAt)}}</span>
            </div>
          </div>
        </div>`;
    }}
    html += `</div>`;
  }}
  area.innerHTML = html;
}}

// ── Data load ─────────────────────────────────────────────────────────────────
let _timer = null;
async function loadData() {{
  try {{
    const res  = await fetch(`${{API}}/emp-agent/data?username=${{encodeURIComponent(USERNAME)}}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.status);

    renderProfile(data.profile, data.activity);
    renderActivity(data.activity);
    renderNotifications(data.notifications||[]);
    renderTasks(data.tasks||[]);

    el("welcome-date").textContent = new Date().toLocaleDateString("en-IN",
      {{weekday:"long",day:"numeric",month:"long",year:"numeric"}});
    el("ts-lbl").textContent = "Updated " + new Date().toLocaleTimeString();
  }} catch(e) {{
    console.error("Load error:", e);
  }} finally {{
    el("loader").style.display  = "none";
    el("app").style.display     = "flex";
  }}
}}

// Auto-refresh every 30 s
loadData();
setInterval(loadData, 30000);
</script>
</body>
</html>"""


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main():
    username = detect_username()
    log.info("User: %s  |  Platform: %s", username, PLATFORM)

    # Start background heartbeat (non-blocking)
    agent = BackgroundAgent(username)
    agent.start()

    # Build self-contained HTML (no external server needed)
    html = build_html(API_URL, username)

    try:
        import webview
    except ImportError:
        log.error(
            "pywebview not installed.\n"
            "Run:  pip install pywebview\n"
            "Then re-run this script."
        )
        sys.exit(1)

    window = webview.create_window(
        title            = "FlowMatriX · Activity Agent",
        html             = html,           # ← load HTML string, no URL
        width            = 1280,
        height           = 820,
        min_size         = (900, 600),
        background_color = "#0D0B1A",
        confirm_close    = False,
    )

    def on_closed():
        agent.stop()

    window.events.closed += on_closed

    webview.start(debug=False, private_mode=False)
    agent.stop()


if __name__ == "__main__":
    main()
