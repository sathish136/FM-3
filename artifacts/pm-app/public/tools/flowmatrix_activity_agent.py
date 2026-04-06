"""
FlowMatriX Activity Agent — GUI Edition
========================================
A desktop GUI agent that:
  • Sends heartbeats every 30 s (active app, idle time, device info)
  • Shows your assigned tasks in real-time
  • Pops a toast notification whenever a new task is assigned to you
  • Sits in the system tray (minimise to tray on close)

SETUP (run once):
    pip install requests psutil pillow pystray

Run:
    python flowmatrix_activity_agent.py
"""

import sys, time, socket, logging, platform, getpass, os, threading, json
from datetime import datetime

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
API_URL         = "https://766e4ea0-5b9e-488a-ad69-f3453d798d6d-00-3m118gokkcn7o.pike.replit.dev/api"
DEVICE_USERNAME = "AUTO"
HEARTBEAT_SEC   = 30
IDLE_THRESHOLD  = 300

# FlowMatriX brand colours
C_BG        = "#F6F5F4"
C_DARK      = "#382C4F"
C_BLUE      = "#2492FF"
C_ACCENT    = "#FF3C00"
C_WHITE     = "#FFFFFF"
C_TEXT      = "#2F3034"
C_MUTED     = "#6B7280"
C_BORDER    = "#E5E7EB"
C_GREEN     = "#10B981"
C_AMBER     = "#F59E0B"
C_CARD      = "#FFFFFF"

PLATFORM = platform.system()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("flowmatrix-gui")

# ─────────────────────────────────────────────────────────────────────────────
# Platform helpers (same as headless agent)
# ─────────────────────────────────────────────────────────────────────────────
def detect_username() -> str:
    if DEVICE_USERNAME != "AUTO":
        return DEVICE_USERNAME
    if PLATFORM == "Windows":
        try:
            import ctypes
            buf = ctypes.create_unicode_buffer(256)
            size = ctypes.c_ulong(256)
            if ctypes.windll.secur32.GetUserNameExW(2, buf, ctypes.byref(size)):
                val = buf.value
                if "\\" in val: return val.split("\\")[-1]
                if "@" in val: return val.split("@")[0]
                return val
        except Exception:
            pass
    try:
        return getpass.getuser()
    except Exception:
        pass
    return (os.environ.get("USERNAME") or os.environ.get("USER")
            or os.environ.get("LOGNAME") or socket.gethostname())


def get_idle_seconds() -> float:
    try:
        if PLATFORM == "Windows":
            import ctypes
            class _LII(ctypes.Structure):
                _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_ulong)]
            lii = _LII()
            lii.cbSize = ctypes.sizeof(_LII)
            ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii))
            return max(0.0, (ctypes.windll.kernel32.GetTickCount() - lii.dwTime) / 1000.0)
        elif PLATFORM == "Darwin":
            import subprocess
            out = subprocess.check_output(["ioreg", "-c", "IOHIDSystem"], stderr=subprocess.DEVNULL).decode()
            for line in out.split("\n"):
                if "HIDIdleTime" in line:
                    return int(line.split("=")[-1].strip()) / 1_000_000_000
    except Exception:
        pass
    return 0.0


def get_active_window() -> tuple:
    try:
        if PLATFORM == "Windows":
            import ctypes, ctypes.wintypes as wt
            buf = ctypes.create_unicode_buffer(512)
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            ctypes.windll.user32.GetWindowTextW(hwnd, buf, 512)
            title = buf.value or ""
            try:
                pid = wt.DWORD()
                ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                import psutil
                app = psutil.Process(pid.value).name().replace(".exe","").replace(".EXE","")
            except Exception:
                app = "Unknown"
            return app, title
        elif PLATFORM == "Darwin":
            from AppKit import NSWorkspace  # type: ignore
            ws = NSWorkspace.sharedWorkspace()
            app = ws.frontmostApplication().localizedName() or "Unknown"
            return app, app
        elif PLATFORM == "Linux":
            import subprocess
            wid = subprocess.check_output(["xdotool","getactivewindow"], stderr=subprocess.DEVNULL).strip().decode()
            title = subprocess.check_output(["xdotool","getwindowname",wid], stderr=subprocess.DEVNULL).strip().decode()
            app = title.split(" — ")[-1] if " — " in title else title.split(" - ")[-1] if " - " in title else title
            return app[:60], title
    except Exception:
        pass
    return "Unknown", "Unknown"


def fmt_idle(seconds: float) -> str:
    s = int(seconds)
    if s < 60: return f"{s}s"
    m = s // 60
    if m < 60: return f"{m}m"
    return f"{m//60}h {m%60}m"


# ─────────────────────────────────────────────────────────────────────────────
# GUI
# ─────────────────────────────────────────────────────────────────────────────
try:
    import tkinter as tk
    from tkinter import ttk, font as tkfont
except ImportError:
    print("tkinter not available. Install it via your system package manager.")
    sys.exit(1)


class ToastNotification(tk.Toplevel):
    """Small slide-in toast shown in the bottom-right corner."""

    def __init__(self, master, title: str, body: str, duration_ms: int = 5000):
        super().__init__(master)
        self.overrideredirect(True)
        self.attributes("-topmost", True)
        self.configure(bg=C_DARK)

        try:
            self.attributes("-alpha", 0.95)
        except Exception:
            pass

        # Layout
        pad = tk.Frame(self, bg=C_DARK, padx=16, pady=14)
        pad.pack(fill="both", expand=True)

        # Accent bar
        bar = tk.Frame(self, bg=C_BLUE, width=4)
        bar.place(relx=0, rely=0, relheight=1)

        hdr = tk.Frame(pad, bg=C_DARK)
        hdr.pack(fill="x")

        tk.Label(hdr, text="⚡ FlowMatriX", font=("Helvetica", 9, "bold"),
                 fg=C_BLUE, bg=C_DARK).pack(side="left")
        tk.Label(hdr, text="×", font=("Helvetica", 12),
                 fg=C_MUTED, bg=C_DARK, cursor="hand2").pack(side="right")

        tk.Label(pad, text=title, font=("Helvetica", 11, "bold"),
                 fg=C_WHITE, bg=C_DARK, wraplength=280, justify="left").pack(anchor="w", pady=(6, 2))
        tk.Label(pad, text=body, font=("Helvetica", 10),
                 fg="#CBD5E1", bg=C_DARK, wraplength=280, justify="left").pack(anchor="w")

        self.update_idletasks()
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        w, h = 310, self.winfo_reqheight() + 20
        x = sw - w - 24
        y = sh - h - 60
        self.geometry(f"{w}x{h}+{x}+{y}")

        self.after(duration_ms, self.destroy)


class FlowMatrixAgent(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("FlowMatriX Activity Agent")
        self.configure(bg=C_BG)
        self.resizable(False, False)

        # State
        self.device_username = detect_username()
        self.session         = None
        self.status_text     = tk.StringVar(value="Connecting…")
        self.hb_status       = tk.StringVar(value="—")
        self.app_var         = tk.StringVar(value="—")
        self.window_var      = tk.StringVar(value="—")
        self.idle_var        = tk.StringVar(value="—")
        self.user_state      = tk.StringVar(value="ACTIVE")
        self.resolved_name   = tk.StringVar(value=self.device_username)
        self.resolved_dept   = tk.StringVar(value="")
        self.last_hb         = tk.StringVar(value="Never")
        self.tasks           : list[dict] = []
        self.seen_task_ids   : set        = set()
        self._running        = True
        self._hb_count       = 0

        self._build_ui()
        self._start_agent()

        self.protocol("WM_DELETE_WINDOW", self._on_close)
        w, h = 480, 680
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        self.geometry(f"{w}x{h}+{(sw-w)//2}+{(sh-h)//2}")

    # ── UI construction ──────────────────────────────────────────────────────

    def _build_ui(self):
        # ── Header ──
        header = tk.Frame(self, bg=C_DARK, height=72)
        header.pack(fill="x")
        header.pack_propagate(False)

        tk.Label(header, text="⚡", font=("Helvetica", 22),
                 fg=C_BLUE, bg=C_DARK).place(x=18, y=18)
        tk.Label(header, text="FlowMatriX", font=("Helvetica", 17, "bold"),
                 fg=C_WHITE, bg=C_DARK).place(x=52, y=14)
        tk.Label(header, text="Activity Agent", font=("Helvetica", 9),
                 fg="#94A3B8", bg=C_DARK).place(x=54, y=38)

        self._status_dot = tk.Label(header, text="●", font=("Helvetica", 11),
                                    fg=C_AMBER, bg=C_DARK)
        self._status_dot.place(relx=1, x=-80, y=26, anchor="nw")
        tk.Label(header, textvariable=self.status_text, font=("Helvetica", 9),
                 fg="#94A3B8", bg=C_DARK).place(relx=1, x=-64, y=28, anchor="nw")

        # ── User card ──
        user_frame = tk.Frame(self, bg=C_CARD, bd=0,
                              highlightbackground=C_BORDER, highlightthickness=1)
        user_frame.pack(fill="x", padx=16, pady=(14, 0))

        inner = tk.Frame(user_frame, bg=C_CARD, padx=16, pady=12)
        inner.pack(fill="x")

        # Avatar circle (canvas)
        av = tk.Canvas(inner, width=44, height=44, bg=C_CARD, bd=0,
                       highlightthickness=0)
        av.pack(side="left", padx=(0, 12))
        av.create_oval(2, 2, 42, 42, fill=C_BLUE, outline="")
        initials = "".join([w[0].upper() for w in self.device_username.split()[:2]]) or self.device_username[:2].upper()
        av.create_text(22, 22, text=initials, fill=C_WHITE,
                       font=("Helvetica", 14, "bold"))

        info = tk.Frame(inner, bg=C_CARD)
        info.pack(side="left", fill="x", expand=True)
        tk.Label(info, textvariable=self.resolved_name,
                 font=("Helvetica", 12, "bold"), fg=C_TEXT, bg=C_CARD,
                 anchor="w").pack(fill="x")
        tk.Label(info, textvariable=self.resolved_dept,
                 font=("Helvetica", 9), fg=C_MUTED, bg=C_CARD,
                 anchor="w").pack(fill="x")

        self._state_badge = tk.Label(inner, textvariable=self.user_state,
                                     font=("Helvetica", 9, "bold"),
                                     fg=C_WHITE, bg=C_GREEN,
                                     padx=10, pady=3)
        self._state_badge.pack(side="right")

        # ── Live Activity ──
        self._section("Live Activity", 14)
        act_card = self._card(padx=16, pady=12)

        row1 = tk.Frame(act_card, bg=C_CARD)
        row1.pack(fill="x", pady=(0, 6))
        tk.Label(row1, text="App", font=("Helvetica", 9, "bold"),
                 fg=C_MUTED, bg=C_CARD, width=10, anchor="w").pack(side="left")
        tk.Label(row1, textvariable=self.app_var, font=("Helvetica", 10, "bold"),
                 fg=C_TEXT, bg=C_CARD, anchor="w").pack(side="left", fill="x", expand=True)

        row2 = tk.Frame(act_card, bg=C_CARD)
        row2.pack(fill="x", pady=(0, 6))
        tk.Label(row2, text="Window", font=("Helvetica", 9, "bold"),
                 fg=C_MUTED, bg=C_CARD, width=10, anchor="w").pack(side="left")
        tk.Label(row2, textvariable=self.window_var, font=("Helvetica", 9),
                 fg=C_TEXT, bg=C_CARD, anchor="w", wraplength=310).pack(side="left", fill="x", expand=True)

        row3 = tk.Frame(act_card, bg=C_CARD)
        row3.pack(fill="x")
        tk.Label(row3, text="Idle", font=("Helvetica", 9, "bold"),
                 fg=C_MUTED, bg=C_CARD, width=10, anchor="w").pack(side="left")
        tk.Label(row3, textvariable=self.idle_var, font=("Helvetica", 10),
                 fg=C_AMBER, bg=C_CARD, anchor="w").pack(side="left")

        # ── Heartbeat ──
        hb_row = tk.Frame(self, bg=C_BG)
        hb_row.pack(fill="x", padx=16, pady=(6, 0))
        tk.Label(hb_row, text="Last heartbeat:", font=("Helvetica", 9),
                 fg=C_MUTED, bg=C_BG).pack(side="left")
        tk.Label(hb_row, textvariable=self.last_hb, font=("Helvetica", 9, "bold"),
                 fg=C_TEXT, bg=C_BG).pack(side="left", padx=4)
        tk.Label(hb_row, textvariable=self.hb_status, font=("Helvetica", 9),
                 fg=C_GREEN, bg=C_BG).pack(side="right")

        # ── My Tasks ──
        self._section("My Assigned Tasks", 12)

        tasks_wrapper = tk.Frame(self, bg=C_BG)
        tasks_wrapper.pack(fill="both", expand=True, padx=16, pady=(0, 12))

        # Scrollable task list
        self._tasks_canvas = tk.Canvas(tasks_wrapper, bg=C_BG, bd=0,
                                       highlightthickness=0)
        scrollbar = ttk.Scrollbar(tasks_wrapper, orient="vertical",
                                  command=self._tasks_canvas.yview)
        self._tasks_canvas.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side="right", fill="y")
        self._tasks_canvas.pack(side="left", fill="both", expand=True)

        self._tasks_inner = tk.Frame(self._tasks_canvas, bg=C_BG)
        self._tasks_canvas_window = self._tasks_canvas.create_window(
            (0, 0), window=self._tasks_inner, anchor="nw")
        self._tasks_inner.bind("<Configure>", self._on_tasks_configure)
        self._tasks_canvas.bind("<Configure>", self._on_canvas_resize)

        self._no_tasks_label = tk.Label(self._tasks_inner,
                                        text="No tasks assigned to you yet.",
                                        font=("Helvetica", 10), fg=C_MUTED, bg=C_BG,
                                        pady=20)
        self._no_tasks_label.pack()

    def _section(self, title: str, top_pad: int = 14):
        f = tk.Frame(self, bg=C_BG)
        f.pack(fill="x", padx=16, pady=(top_pad, 6))
        tk.Label(f, text=title, font=("Helvetica", 10, "bold"),
                 fg=C_DARK, bg=C_BG).pack(side="left")
        tk.Frame(f, bg=C_BORDER, height=1).pack(side="left", fill="x",
                                                  expand=True, padx=(8, 0), pady=6)

    def _card(self, padx=12, pady=10) -> tk.Frame:
        outer = tk.Frame(self, bg=C_CARD,
                         highlightbackground=C_BORDER, highlightthickness=1)
        outer.pack(fill="x", padx=16, pady=(0, 4))
        inner = tk.Frame(outer, bg=C_CARD, padx=padx, pady=pady)
        inner.pack(fill="x")
        return inner

    def _on_tasks_configure(self, event):
        self._tasks_canvas.configure(
            scrollregion=self._tasks_canvas.bbox("all"))

    def _on_canvas_resize(self, event):
        self._tasks_canvas.itemconfig(
            self._tasks_canvas_window, width=event.width)

    # ── Task rendering ───────────────────────────────────────────────────────

    def _render_tasks(self):
        for w in self._tasks_inner.winfo_children():
            w.destroy()

        if not self.tasks:
            tk.Label(self._tasks_inner, text="No tasks assigned to you yet.",
                     font=("Helvetica", 10), fg=C_MUTED, bg=C_BG, pady=20).pack()
            return

        STATUS_COLORS = {
            "todo":        (C_MUTED,  "To Do"),
            "in_progress": (C_BLUE,   "In Progress"),
            "review":      (C_AMBER,  "Review"),
            "done":        (C_GREEN,  "Done"),
        }
        PRIORITY_COLORS = {
            "high":   C_ACCENT,
            "medium": C_AMBER,
            "low":    C_GREEN,
        }

        for task in self.tasks:
            status_color, status_label = STATUS_COLORS.get(
                task.get("status", "todo"), (C_MUTED, task.get("status", "—")))
            priority_color = PRIORITY_COLORS.get(task.get("priority", "medium"), C_MUTED)
            is_overdue = (task.get("dueDate") and
                          task["dueDate"] < datetime.now().strftime("%Y-%m-%d") and
                          task.get("status") != "done")

            # Card frame
            card = tk.Frame(self._tasks_inner, bg=C_CARD,
                            highlightbackground=C_BORDER, highlightthickness=1)
            card.pack(fill="x", pady=(0, 6))

            # Priority stripe
            stripe = tk.Frame(card, bg=priority_color, width=4)
            stripe.pack(side="left", fill="y")

            body = tk.Frame(card, bg=C_CARD, padx=12, pady=10)
            body.pack(side="left", fill="x", expand=True)

            # Title row
            title_row = tk.Frame(body, bg=C_CARD)
            title_row.pack(fill="x")
            tk.Label(title_row, text=task.get("title", "Untitled"),
                     font=("Helvetica", 10, "bold"), fg=C_TEXT, bg=C_CARD,
                     anchor="w", wraplength=320, justify="left").pack(side="left", fill="x", expand=True)

            # Status badge
            tk.Label(title_row, text=status_label,
                     font=("Helvetica", 8, "bold"), fg=C_WHITE,
                     bg=status_color, padx=7, pady=2).pack(side="right")

            # Description
            if task.get("description"):
                tk.Label(body, text=task["description"][:120] + ("…" if len(task.get("description","")) > 120 else ""),
                         font=("Helvetica", 9), fg=C_MUTED, bg=C_CARD,
                         anchor="w", wraplength=360, justify="left").pack(fill="x", pady=(2, 0))

            # Meta row
            meta = tk.Frame(body, bg=C_CARD)
            meta.pack(fill="x", pady=(6, 0))

            if task.get("projectId"):
                tk.Label(meta, text=f"📁 Project #{task['projectId']}",
                         font=("Helvetica", 8), fg=C_BLUE, bg=C_CARD).pack(side="left", padx=(0, 8))

            priority_text = f"● {task.get('priority','medium').capitalize()}"
            tk.Label(meta, text=priority_text,
                     font=("Helvetica", 8, "bold"), fg=priority_color, bg=C_CARD).pack(side="left")

            if task.get("dueDate"):
                due_color = C_ACCENT if is_overdue else C_MUTED
                due_icon  = "⚠ " if is_overdue else "📅 "
                tk.Label(meta, text=f"{due_icon}{task['dueDate']}",
                         font=("Helvetica", 8), fg=due_color, bg=C_CARD).pack(side="right")

        self._tasks_canvas.update_idletasks()
        self._tasks_canvas.configure(scrollregion=self._tasks_canvas.bbox("all"))

    # ── Agent logic ──────────────────────────────────────────────────────────

    def _start_agent(self):
        try:
            import requests
            self.session = requests.Session()
            self.session.headers.update({
                "Content-Type": "application/json",
                "User-Agent": "FlowMatriX-Agent-GUI/3.0",
            })
        except ImportError:
            self.status_text.set("requests not installed")
            return

        threading.Thread(target=self._heartbeat_loop, daemon=True).start()
        threading.Thread(target=self._task_poll_loop, daemon=True).start()

    def _heartbeat_loop(self):
        while self._running:
            self._send_heartbeat()
            time.sleep(HEARTBEAT_SEC)

    def _send_heartbeat(self):
        app, title = get_active_window()
        idle = get_idle_seconds()
        is_active = idle < IDLE_THRESHOLD

        payload = {
            "deviceUsername": self.device_username,
            "activeApp":      app,
            "windowTitle":    title[:250],
            "isActive":       is_active,
            "idleSeconds":    int(idle),
            "deviceName":     socket.gethostname(),
        }

        try:
            r = self.session.post(f"{API_URL}/activity/heartbeat", json=payload, timeout=10)
            if r.status_code == 200:
                data = r.json()
                self._hb_count += 1
                self.after(0, self._update_ui, app, title, idle, is_active, data)
            else:
                self.after(0, self._set_error, f"Server {r.status_code}")
        except Exception as exc:
            self.after(0, self._set_error, str(exc)[:40])

    def _task_poll_loop(self):
        time.sleep(5)
        while self._running:
            self._fetch_tasks()
            time.sleep(30)

    def _fetch_tasks(self):
        try:
            r = self.session.get(f"{API_URL}/fm-tasks", timeout=10)
            if r.status_code == 200:
                all_tasks = r.json()
                my_name   = (self.resolved_name.get() or self.device_username).lower()
                my_tasks  = [
                    t for t in all_tasks
                    if (t.get("assigneeName") or "").lower() in my_name
                    or my_name in (t.get("assigneeName") or "").lower()
                ]
                # Notify for newly seen tasks
                new_ids = {t["id"] for t in my_tasks} - self.seen_task_ids
                for t in my_tasks:
                    if t["id"] in new_ids:
                        self.after(0, self._show_task_toast, t)
                self.seen_task_ids = {t["id"] for t in my_tasks}
                self.tasks = sorted(
                    my_tasks,
                    key=lambda t: (0 if t.get("status") == "in_progress" else
                                   1 if t.get("status") == "todo" else
                                   2 if t.get("status") == "review" else 3)
                )
                self.after(0, self._render_tasks)
        except Exception as exc:
            log.warning("Task fetch failed: %s", exc)

    def _show_task_toast(self, task: dict):
        if not self.seen_task_ids:
            return
        title = f"New Task Assigned: {task.get('title','')}"
        due   = f"Due: {task['dueDate']}" if task.get("dueDate") else ""
        prio  = f"Priority: {task.get('priority','medium').capitalize()}"
        body  = " · ".join(filter(None, [prio, due]))
        try:
            ToastNotification(self, title, body)
        except Exception:
            pass

    def _update_ui(self, app: str, title: str, idle: float, is_active: bool, data: dict):
        name = data.get("resolvedName") or self.device_username
        dept = " · ".join(filter(None, [data.get("resolvedDesignation",""), data.get("resolvedDept","")]))

        self.resolved_name.set(name)
        self.resolved_dept.set(dept or "Not linked to ERPNext")
        self.app_var.set(app or "—")
        self.window_var.set((title[:80] + "…") if len(title) > 80 else (title or "—"))
        self.idle_var.set(fmt_idle(idle) if idle > 5 else "None")
        self.last_hb.set(datetime.now().strftime("%H:%M:%S"))
        self.hb_status.set(f"✓  {self._hb_count} sent")

        if is_active:
            self.user_state.set("ACTIVE")
            self._state_badge.configure(bg=C_GREEN)
            self._status_dot.configure(fg=C_GREEN)
            self.status_text.set("Connected · Active")
        else:
            self.user_state.set("IDLE")
            self._state_badge.configure(bg=C_AMBER)
            self._status_dot.configure(fg=C_AMBER)
            self.status_text.set(f"Connected · Idle {fmt_idle(idle)}")

    def _set_error(self, msg: str):
        self.status_text.set(f"Error: {msg}")
        self._status_dot.configure(fg=C_ACCENT)

    def _on_close(self):
        self._running = False
        self.destroy()


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────
def main():
    try:
        import requests  # noqa: F401
    except ImportError:
        print("ERROR: 'requests' is not installed.\nRun:  pip install requests psutil")
        sys.exit(1)

    app = FlowMatrixAgent()
    app.mainloop()


if __name__ == "__main__":
    main()
