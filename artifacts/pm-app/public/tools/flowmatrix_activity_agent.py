"""
FlowMatriX Activity Agent  v4.0 — Modern GUI
=============================================
Desktop app that tracks your activity, shows assigned tasks,
and fires toast notifications when tasks are assigned to you.

SETUP:
    pip install requests psutil

OPTIONAL (system-tray icon):
    pip install pillow pystray

RUN:
    python flowmatrix_activity_agent.py
"""

import sys, time, socket, platform, getpass, os, threading, logging
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
API_URL         = "https://766e4ea0-5b9e-488a-ad69-f3453d798d6d-00-3m118gokkcn7o.pike.replit.dev/api"
DEVICE_USERNAME = "AUTO"
HEARTBEAT_SEC   = 30
IDLE_THRESHOLD  = 300

# ── Brand palette ─────────────────────────────────────────────────────────────
BG          = "#F6F5F4"
SIDEBAR     = "#1E1530"      # deep navy-purple
SIDEBAR2    = "#2A1F42"      # slightly lighter sidebar
BLUE        = "#2492FF"
ACCENT      = "#FF3C00"
WHITE       = "#FFFFFF"
TEXT        = "#2F3034"
MUTED       = "#9CA3AF"
BORDER      = "#E5E7EB"
CARD        = "#FFFFFF"
GREEN       = "#10B981"
GREEN_LIGHT = "#D1FAE5"
AMBER       = "#F59E0B"
AMBER_LIGHT = "#FEF3C7"
RED         = "#EF4444"
RED_LIGHT   = "#FEE2E2"
BLUE_LIGHT  = "#DBEAFE"
PURPLE      = "#7C3AED"
GRAY100     = "#F3F4F6"
GRAY200     = "#E5E7EB"
GRAY700     = "#374151"

PLATFORM = platform.system()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("fm")

# ── Platform helpers ──────────────────────────────────────────────────────────
def detect_username():
    if DEVICE_USERNAME != "AUTO": return DEVICE_USERNAME
    if PLATFORM == "Windows":
        try:
            import ctypes
            buf = ctypes.create_unicode_buffer(256)
            size = ctypes.c_ulong(256)
            if ctypes.windll.secur32.GetUserNameExW(2, buf, ctypes.byref(size)):
                v = buf.value
                if "\\" in v: return v.split("\\")[-1]
                if "@" in v: return v.split("@")[0]
                return v
        except Exception: pass
    try: return getpass.getuser()
    except Exception: pass
    return (os.environ.get("USERNAME") or os.environ.get("USER")
            or os.environ.get("LOGNAME") or socket.gethostname())

def get_idle_seconds():
    try:
        if PLATFORM == "Windows":
            import ctypes
            class LII(ctypes.Structure):
                _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_ulong)]
            lii = LII(); lii.cbSize = ctypes.sizeof(LII)
            ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii))
            return max(0.0, (ctypes.windll.kernel32.GetTickCount() - lii.dwTime) / 1000.0)
        if PLATFORM == "Darwin":
            import subprocess
            out = subprocess.check_output(["ioreg","-c","IOHIDSystem"],stderr=subprocess.DEVNULL).decode()
            for line in out.split("\n"):
                if "HIDIdleTime" in line:
                    return int(line.split("=")[-1].strip()) / 1_000_000_000
    except Exception: pass
    return 0.0

def get_active_window():
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
                import psutil; app = psutil.Process(pid.value).name().replace(".exe","").replace(".EXE","")
            except Exception: app = "Unknown"
            return app, title
        if PLATFORM == "Darwin":
            from AppKit import NSWorkspace  # type: ignore
            app = NSWorkspace.sharedWorkspace().frontmostApplication().localizedName() or "Unknown"
            return app, app
        if PLATFORM == "Linux":
            import subprocess
            wid = subprocess.check_output(["xdotool","getactivewindow"],stderr=subprocess.DEVNULL).strip().decode()
            title = subprocess.check_output(["xdotool","getwindowname",wid],stderr=subprocess.DEVNULL).strip().decode()
            app = title.split(" — ")[-1] if " — " in title else title.split(" - ")[-1] if " - " in title else title
            return app[:60], title
    except Exception: pass
    return "Unknown", "Unknown"

def fmt_idle(s):
    s = int(s)
    if s < 60: return f"{s}s"
    m = s // 60
    if m < 60: return f"{m}m idle"
    return f"{m//60}h {m%60}m idle"

def initials(name):
    parts = (name or "?").split()
    return "".join(p[0].upper() for p in parts[:2]) or "?"

# ── Tkinter ───────────────────────────────────────────────────────────────────
try:
    import tkinter as tk
    from tkinter import ttk
except ImportError:
    print("tkinter is not available. Please install it."); sys.exit(1)


# ── Rounded-rectangle helper on Canvas ───────────────────────────────────────
def round_rect(canvas, x1, y1, x2, y2, r=8, **kw):
    pts = [
        x1+r, y1,   x2-r, y1,
        x2,   y1,   x2,   y1+r,
        x2,   y2-r, x2,   y2,
        x2-r, y2,   x1+r, y2,
        x1,   y2,   x1,   y2-r,
        x1,   y1+r, x1,   y1,
        x1+r, y1,
    ]
    return canvas.create_polygon(pts, smooth=True, **kw)


# ── Toast ─────────────────────────────────────────────────────────────────────
class Toast(tk.Toplevel):
    def __init__(self, master, title, body, ms=6000):
        super().__init__(master)
        self.overrideredirect(True)
        self.attributes("-topmost", True)
        try: self.attributes("-alpha", 0.97)
        except Exception: pass

        W, PAD = 320, 16
        self.configure(bg=SIDEBAR)

        # Blue left accent
        accent = tk.Frame(self, bg=BLUE, width=4)
        accent.place(relx=0, rely=0, relheight=1)

        wrap = tk.Frame(self, bg=SIDEBAR, padx=PAD+4, pady=14)
        wrap.pack(fill="both", expand=True)

        # header row
        hdr = tk.Frame(wrap, bg=SIDEBAR)
        hdr.pack(fill="x")
        dot = tk.Label(hdr, text="⚡", font=("Segoe UI", 10), fg=BLUE, bg=SIDEBAR)
        dot.pack(side="left")
        tk.Label(hdr, text=" FlowMatriX", font=("Segoe UI", 9, "bold"), fg=BLUE, bg=SIDEBAR).pack(side="left")
        ts = tk.Label(hdr, text=datetime.now().strftime("%H:%M"), font=("Segoe UI", 8), fg=MUTED, bg=SIDEBAR)
        ts.pack(side="right")

        tk.Frame(wrap, bg="#2E2A45", height=1).pack(fill="x", pady=(8, 8))

        tk.Label(wrap, text=title, font=("Segoe UI", 10, "bold"), fg=WHITE, bg=SIDEBAR,
                 wraplength=W-2*PAD-20, justify="left", anchor="w").pack(fill="x")
        if body:
            tk.Label(wrap, text=body, font=("Segoe UI", 9), fg="#94A3B8", bg=SIDEBAR,
                     wraplength=W-2*PAD-20, justify="left", anchor="w").pack(fill="x", pady=(4, 0))

        self.update_idletasks()
        h = self.winfo_reqheight() + 10
        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        self.geometry(f"{W}x{h}+{sw-W-20}+{sh-h-60}")
        self.after(ms, self.destroy)


# ── Pill label ────────────────────────────────────────────────────────────────
def pill(parent, text, fg, bg, pad_x=10, pad_y=3, size=8):
    return tk.Label(parent, text=text, font=("Segoe UI", size, "bold"),
                    fg=fg, bg=bg, padx=pad_x, pady=pad_y)


# ── Main window ───────────────────────────────────────────────────────────────
class App(tk.Tk):
    W, H = 860, 620

    def __init__(self):
        super().__init__()
        self.title("FlowMatriX · Activity Agent")
        self.configure(bg=SIDEBAR)
        self.resizable(True, True)
        self.minsize(740, 520)

        # State
        self.dev_user   = detect_username()
        self.session    = None
        self._running   = True
        self._hb_ok     = 0
        self.seen_ids   : set  = set()
        self.tasks      : list = []

        # Live vars
        self.v_name   = tk.StringVar(value=self.dev_user)
        self.v_dept   = tk.StringVar(value="Not linked to ERPNext")
        self.v_desig  = tk.StringVar(value="")
        self.v_emp_id = tk.StringVar(value="")
        self.v_app    = tk.StringVar(value="—")
        self.v_win    = tk.StringVar(value="—")
        self.v_idle   = tk.StringVar(value="—")
        self.v_state  = tk.StringVar(value="Connecting…")
        self.v_hb     = tk.StringVar(value="Never")
        self.v_hb_cnt = tk.StringVar(value="0 sent")

        self._build()
        self._start()
        self.protocol("WM_DELETE_WINDOW", self._quit)

        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        self.geometry(f"{self.W}x{self.H}+{(sw-self.W)//2}+{(sh-self.H)//2}")

    # ── Layout ───────────────────────────────────────────────────────────────

    def _build(self):
        # Two columns: sidebar + main
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self._build_sidebar()
        self._build_main()

    # ── Sidebar ──────────────────────────────────────────────────────────────

    def _build_sidebar(self):
        sb = tk.Frame(self, bg=SIDEBAR, width=230)
        sb.grid(row=0, column=0, sticky="nsew")
        sb.grid_propagate(False)
        sb.grid_rowconfigure(9, weight=1)

        # Logo area
        logo_area = tk.Frame(sb, bg=SIDEBAR, pady=20, padx=20)
        logo_area.grid(row=0, column=0, sticky="ew")

        logo_row = tk.Frame(logo_area, bg=SIDEBAR)
        logo_row.pack(anchor="w")
        tk.Label(logo_row, text="⚡", font=("Segoe UI", 18), fg=BLUE, bg=SIDEBAR).pack(side="left")
        tk.Label(logo_row, text="FlowMatriX", font=("Segoe UI", 14, "bold"), fg=WHITE, bg=SIDEBAR).pack(side="left", padx=(4, 0))
        tk.Label(logo_area, text="Activity Agent", font=("Segoe UI", 8), fg=MUTED, bg=SIDEBAR).pack(anchor="w", pady=(2, 0))

        # Divider
        tk.Frame(sb, bg="#2A1F42", height=1).grid(row=1, column=0, sticky="ew", padx=16)

        # ── Avatar + employee card ──
        emp_pad = tk.Frame(sb, bg=SIDEBAR, padx=20, pady=20)
        emp_pad.grid(row=2, column=0, sticky="ew")

        # Avatar circle
        self._av_canvas = tk.Canvas(emp_pad, width=56, height=56, bg=SIDEBAR, bd=0, highlightthickness=0)
        self._av_canvas.pack(anchor="center")
        self._av_canvas.create_oval(3, 3, 53, 53, fill=BLUE, outline=BLUE)
        self._av_initials = self._av_canvas.create_text(
            28, 28, text=initials(self.dev_user), fill=WHITE, font=("Segoe UI", 16, "bold"))

        # Status dot on avatar
        self._av_dot = self._av_canvas.create_oval(38, 38, 52, 52, fill=AMBER, outline=SIDEBAR, width=2)

        emp_info = tk.Frame(emp_pad, bg=SIDEBAR)
        emp_info.pack(fill="x", pady=(12, 0))

        tk.Label(emp_info, textvariable=self.v_name, font=("Segoe UI", 11, "bold"),
                 fg=WHITE, bg=SIDEBAR, anchor="center", wraplength=190, justify="center").pack(fill="x")
        tk.Label(emp_info, textvariable=self.v_desig, font=("Segoe UI", 8, "bold"),
                 fg=BLUE, bg=SIDEBAR, anchor="center").pack(fill="x", pady=(2, 0))
        tk.Label(emp_info, textvariable=self.v_dept, font=("Segoe UI", 8),
                 fg=MUTED, bg=SIDEBAR, anchor="center", wraplength=190, justify="center").pack(fill="x", pady=(1, 0))
        tk.Label(emp_info, textvariable=self.v_emp_id, font=("Courier", 8),
                 fg="#6B7280", bg=SIDEBAR, anchor="center").pack(fill="x", pady=(2, 0))

        # State pill
        self._state_pill = tk.Label(emp_info, textvariable=self.v_state,
                                    font=("Segoe UI", 8, "bold"),
                                    fg=WHITE, bg=AMBER, padx=12, pady=4)
        self._state_pill.pack(pady=(10, 0))

        # Divider
        tk.Frame(sb, bg="#2A1F42", height=1).grid(row=3, column=0, sticky="ew", padx=16)

        # ── Stats grid ──
        stats_frame = tk.Frame(sb, bg=SIDEBAR, padx=20, pady=16)
        stats_frame.grid(row=4, column=0, sticky="ew")

        self._stat_boxes = {}
        stats_defs = [
            ("hb_cnt", "Heartbeats",   self.v_hb_cnt, BLUE),
            ("hb_time","Last Sync",    self.v_hb,     GREEN),
        ]
        for i, (key, label, var, color) in enumerate(stats_defs):
            box = tk.Frame(stats_frame, bg=SIDEBAR2, padx=10, pady=8)
            box.grid(row=i, column=0, sticky="ew", pady=(0, 6))
            stats_frame.grid_columnconfigure(0, weight=1)
            tk.Label(box, text=label, font=("Segoe UI", 7, "bold"), fg=MUTED, bg=SIDEBAR2).pack(anchor="w")
            tk.Label(box, textvariable=var, font=("Segoe UI", 10, "bold"), fg=color, bg=SIDEBAR2).pack(anchor="w")
            self._stat_boxes[key] = box

        # Divider
        tk.Frame(sb, bg="#2A1F42", height=1).grid(row=5, column=0, sticky="ew", padx=16)

        # ── Live activity ──
        act_frame = tk.Frame(sb, bg=SIDEBAR, padx=20, pady=16)
        act_frame.grid(row=6, column=0, sticky="ew")

        tk.Label(act_frame, text="LIVE ACTIVITY", font=("Segoe UI", 7, "bold"),
                 fg=MUTED, bg=SIDEBAR).pack(anchor="w", pady=(0, 8))

        for label, var in [("App", self.v_app), ("Window", self.v_win), ("Idle", self.v_idle)]:
            row = tk.Frame(act_frame, bg=SIDEBAR)
            row.pack(fill="x", pady=(0, 6))
            tk.Label(row, text=label, font=("Segoe UI", 8), fg=MUTED, bg=SIDEBAR, width=7, anchor="w").pack(side="left")
            color = AMBER if label == "Idle" else WHITE
            font_extra = "" if label != "App" else "bold"
            tk.Label(row, textvariable=var, font=("Segoe UI", 8, font_extra),
                     fg=color, bg=SIDEBAR, anchor="w", wraplength=140, justify="left").pack(side="left", fill="x", expand=True)

        # Spacer
        tk.Frame(sb, bg=SIDEBAR).grid(row=9, column=0, sticky="nsew")

        # Bottom: device info
        bottom = tk.Frame(sb, bg="#120E22", padx=16, pady=12)
        bottom.grid(row=10, column=0, sticky="ew")
        tk.Label(bottom, text=f"🖥  {socket.gethostname()}", font=("Segoe UI", 8), fg=MUTED, bg="#120E22", anchor="w").pack(fill="x")
        tk.Label(bottom, text=f"👤 {self.dev_user}", font=("Segoe UI", 8), fg=MUTED, bg="#120E22", anchor="w").pack(fill="x", pady=(2, 0))

    # ── Main panel ───────────────────────────────────────────────────────────

    def _build_main(self):
        main = tk.Frame(self, bg=BG)
        main.grid(row=0, column=1, sticky="nsew")
        main.grid_rowconfigure(1, weight=1)
        main.grid_columnconfigure(0, weight=1)

        # ── Top bar ──
        topbar = tk.Frame(main, bg=WHITE, height=56,
                          highlightbackground=GRAY200, highlightthickness=1)
        topbar.grid(row=0, column=0, sticky="ew")
        topbar.grid_propagate(False)

        tb_inner = tk.Frame(topbar, bg=WHITE)
        tb_inner.place(relx=0, rely=0, relwidth=1, relheight=1)

        tk.Label(tb_inner, text="My Tasks", font=("Segoe UI", 13, "bold"),
                 fg=TEXT, bg=WHITE).place(x=20, rely=0.5, anchor="w")

        # Task count badge
        self._task_count_lbl = tk.Label(tb_inner, text="0", font=("Segoe UI", 9, "bold"),
                                         fg=WHITE, bg=BLUE, padx=10, pady=3)
        self._task_count_lbl.place(x=115, rely=0.5, anchor="w")

        # Refresh button
        ref_btn = tk.Label(tb_inner, text="↻  Refresh", font=("Segoe UI", 9, "bold"),
                           fg=BLUE, bg=GRAY100, padx=12, pady=5, cursor="hand2")
        ref_btn.place(relx=1, x=-16, rely=0.5, anchor="e")
        ref_btn.bind("<Button-1>", lambda e: threading.Thread(target=self._fetch_tasks, daemon=True).start())

        # ── Scroll area ──
        scroll_frame = tk.Frame(main, bg=BG)
        scroll_frame.grid(row=1, column=0, sticky="nsew")
        scroll_frame.grid_rowconfigure(0, weight=1)
        scroll_frame.grid_columnconfigure(0, weight=1)

        self._canvas = tk.Canvas(scroll_frame, bg=BG, bd=0, highlightthickness=0)
        self._vsb = ttk.Scrollbar(scroll_frame, orient="vertical", command=self._canvas.yview)
        self._canvas.configure(yscrollcommand=self._vsb.set)
        self._vsb.grid(row=0, column=1, sticky="ns")
        self._canvas.grid(row=0, column=0, sticky="nsew")

        self._list_frame = tk.Frame(self._canvas, bg=BG)
        self._list_win = self._canvas.create_window((0, 0), window=self._list_frame, anchor="nw")

        self._list_frame.bind("<Configure>", lambda e: self._canvas.configure(
            scrollregion=self._canvas.bbox("all")))
        self._canvas.bind("<Configure>", lambda e: self._canvas.itemconfig(
            self._list_win, width=e.width))
        self._canvas.bind_all("<MouseWheel>", lambda e: self._canvas.yview_scroll(-1*(e.delta//120), "units"))

        self._render_empty("Loading your tasks…")

    # ── Task rendering ───────────────────────────────────────────────────────

    STATUS_META = {
        "todo":        ("To Do",       GRAY700, GRAY100),
        "in_progress": ("In Progress", BLUE,    BLUE_LIGHT),
        "review":      ("In Review",   AMBER,   AMBER_LIGHT),
        "done":        ("Done",        GREEN,   GREEN_LIGHT),
    }
    PRIORITY_META = {
        "high":   (RED,   RED_LIGHT,   "●  High"),
        "medium": (AMBER, AMBER_LIGHT, "●  Medium"),
        "low":    (GREEN, GREEN_LIGHT, "●  Low"),
    }
    PRIORITY_STRIPE = {"high": RED, "medium": AMBER, "low": GREEN}

    def _render_empty(self, msg="No tasks assigned to you yet."):
        for w in self._list_frame.winfo_children(): w.destroy()
        wrap = tk.Frame(self._list_frame, bg=BG)
        wrap.pack(expand=True, pady=60)
        tk.Label(wrap, text="📋", font=("Segoe UI", 32), bg=BG).pack()
        tk.Label(wrap, text=msg, font=("Segoe UI", 11), fg=MUTED, bg=BG).pack(pady=(8, 0))

    def _render_tasks(self):
        for w in self._list_frame.winfo_children(): w.destroy()

        if not self.tasks:
            self._render_empty()
            self._task_count_lbl.configure(text="0")
            return

        self._task_count_lbl.configure(text=str(len(self.tasks)))

        # Group header: In Progress first, then rest
        groups = [
            ("In Progress", [t for t in self.tasks if t.get("status") == "in_progress"]),
            ("To Do",       [t for t in self.tasks if t.get("status") == "todo"]),
            ("In Review",   [t for t in self.tasks if t.get("status") == "review"]),
            ("Done",        [t for t in self.tasks if t.get("status") == "done"]),
        ]

        for group_name, group_tasks in groups:
            if not group_tasks: continue
            self._render_group_header(group_name, len(group_tasks))
            for task in group_tasks:
                self._render_task_card(task)

    def _render_group_header(self, title, count):
        row = tk.Frame(self._list_frame, bg=BG)
        row.pack(fill="x", padx=20, pady=(16, 4))
        tk.Label(row, text=title, font=("Segoe UI", 9, "bold"),
                 fg=GRAY700, bg=BG).pack(side="left")
        tk.Label(row, text=f"  {count}", font=("Segoe UI", 9),
                 fg=MUTED, bg=BG).pack(side="left")
        tk.Frame(row, bg=GRAY200, height=1).pack(side="left", fill="x", expand=True, padx=(10, 0), pady=6)

    def _render_task_card(self, task):
        status_key = task.get("status", "todo")
        priority   = task.get("priority", "medium")
        s_label, s_fg, s_bg = self.STATUS_META.get(status_key, ("—", MUTED, GRAY100))
        p_fg, p_bg, p_label = self.PRIORITY_META.get(priority, (MUTED, GRAY100, "● Medium"))
        stripe_color         = self.PRIORITY_STRIPE.get(priority, GRAY200)

        due       = task.get("dueDate") or ""
        title_txt = task.get("title", "Untitled")
        desc_txt  = task.get("description") or ""
        is_over   = due and due < datetime.now().strftime("%Y-%m-%d") and status_key != "done"

        # Outer shadow effect (via slightly offset frame)
        shadow = tk.Frame(self._list_frame, bg=GRAY200)
        shadow.pack(fill="x", padx=20, pady=(0, 2))

        card = tk.Frame(shadow, bg=WHITE)
        card.pack(fill="x", padx=0, pady=(0, 2))

        # Priority stripe
        stripe = tk.Frame(card, bg=stripe_color, width=4)
        stripe.pack(side="left", fill="y")

        body = tk.Frame(card, bg=WHITE, padx=16, pady=14)
        body.pack(side="left", fill="both", expand=True)

        # ── Row 1: title + status badge ──
        row1 = tk.Frame(body, bg=WHITE)
        row1.pack(fill="x")

        title_lbl = tk.Label(row1, text=title_txt, font=("Segoe UI", 11, "bold"),
                             fg=TEXT, bg=WHITE, anchor="w", justify="left", wraplength=360)
        title_lbl.pack(side="left", fill="x", expand=True)

        status_badge = tk.Label(row1, text=s_label, font=("Segoe UI", 8, "bold"),
                                fg=s_fg, bg=s_bg, padx=10, pady=4)
        status_badge.pack(side="right", padx=(8, 0))

        # ── Row 2: description ──
        if desc_txt.strip():
            short = desc_txt[:160] + ("…" if len(desc_txt) > 160 else "")
            tk.Label(body, text=short, font=("Segoe UI", 9), fg=MUTED, bg=WHITE,
                     anchor="w", justify="left", wraplength=420).pack(fill="x", pady=(4, 0))

        # ── Row 3: meta pills ──
        meta = tk.Frame(body, bg=WHITE)
        meta.pack(fill="x", pady=(10, 0))

        # Priority
        p_pill = tk.Label(meta, text=p_label, font=("Segoe UI", 8, "bold"),
                          fg=p_fg, bg=p_bg, padx=8, pady=3)
        p_pill.pack(side="left")

        # Tags
        tags = task.get("tags") or ""
        for tag in [t.strip() for t in tags.split(",") if t.strip()][:3]:
            tk.Label(meta, text=f"# {tag}", font=("Segoe UI", 8),
                     fg=PURPLE, bg="#F3E8FF", padx=8, pady=3).pack(side="left", padx=(6, 0))

        # Due date
        if due:
            due_fg  = RED   if is_over else MUTED
            due_bg  = RED_LIGHT if is_over else GRAY100
            due_txt = ("⚠  Overdue " if is_over else "📅  ") + due
            tk.Label(meta, text=due_txt, font=("Segoe UI", 8, "bold" if is_over else ""),
                     fg=due_fg, bg=due_bg, padx=8, pady=3).pack(side="right")

        # Created by
        if task.get("createdBy"):
            by = task["createdBy"].split("@")[0]
            tk.Label(meta, text=f"by {by}", font=("Segoe UI", 8),
                     fg=MUTED, bg=WHITE).pack(side="right", padx=(0, 8))

        # Subtle separator at bottom
        tk.Frame(body, bg=GRAY100, height=1).pack(fill="x", pady=(10, 0))

    # ── Agent logic ──────────────────────────────────────────────────────────

    def _start(self):
        try:
            import requests
            self.session = requests.Session()
            self.session.headers.update({"Content-Type":"application/json","User-Agent":"FlowMatriX-Agent/4.0"})
        except ImportError:
            self.v_state.set("requests not installed"); return
        threading.Thread(target=self._hb_loop,   daemon=True).start()
        threading.Thread(target=self._task_loop, daemon=True).start()

    def _hb_loop(self):
        while self._running:
            self._heartbeat()
            time.sleep(HEARTBEAT_SEC)

    def _task_loop(self):
        time.sleep(3)
        while self._running:
            self._fetch_tasks()
            time.sleep(30)

    def _heartbeat(self):
        app, win = get_active_window()
        idle     = get_idle_seconds()
        active   = idle < IDLE_THRESHOLD
        payload  = {
            "deviceUsername": self.dev_user,
            "activeApp":      app,
            "windowTitle":    win[:250],
            "isActive":       active,
            "idleSeconds":    int(idle),
            "deviceName":     socket.gethostname(),
        }
        try:
            r = self.session.post(f"{API_URL}/activity/heartbeat", json=payload, timeout=10)
            if r.status_code == 200:
                data = r.json()
                self._hb_ok += 1
                self.after(0, self._on_hb_ok, app, win, idle, active, data)
            else:
                self.after(0, self._set_err, f"HTTP {r.status_code}")
        except Exception as e:
            self.after(0, self._set_err, str(e)[:50])

    def _fetch_tasks(self):
        try:
            r = self.session.get(f"{API_URL}/fm-tasks", timeout=10)
            if r.status_code != 200: return
            all_tasks = r.json()
            my = self.v_name.get().lower()
            my_tasks = [
                t for t in all_tasks
                if my and (
                    my in (t.get("assigneeName") or "").lower() or
                    (t.get("assigneeName") or "").lower() in my
                )
            ]
            # toast for newly assigned
            new_ids = {t["id"] for t in my_tasks} - self.seen_ids
            if self.seen_ids:   # skip first load
                for t in my_tasks:
                    if t["id"] in new_ids:
                        self.after(0, self._toast_task, t)
            self.seen_ids = {t["id"] for t in my_tasks}
            self.tasks    = my_tasks
            self.after(0, self._render_tasks)
        except Exception as e:
            log.warning("task fetch: %s", e)

    def _on_hb_ok(self, app, win, idle, active, data):
        name  = data.get("resolvedName") or self.dev_user
        dept  = data.get("resolvedDept") or ""
        desig = data.get("resolvedDesignation") or ""
        emp   = data.get("erpEmployeeId") or ""

        self.v_name.set(name)
        self.v_dept.set(dept or "Not linked to ERPNext")
        self.v_desig.set(desig)
        self.v_emp_id.set(emp)
        self.v_app.set(app or "—")
        self.v_win.set((win[:55]+"…") if len(win) > 55 else (win or "—"))
        self.v_idle.set(fmt_idle(idle) if idle > 5 else "None")
        self.v_hb.set(datetime.now().strftime("%H:%M:%S"))
        self.v_hb_cnt.set(f"{self._hb_ok} sent")

        # Update avatar initials
        self._av_canvas.itemconfig(self._av_initials, text=initials(name))

        if active:
            self.v_state.set("● ACTIVE")
            self._state_pill.configure(bg=GREEN)
            self._av_canvas.itemconfig(self._av_dot, fill=GREEN)
        else:
            self.v_state.set(f"● {fmt_idle(idle).upper()}")
            self._state_pill.configure(bg=AMBER)
            self._av_canvas.itemconfig(self._av_dot, fill=AMBER)

    def _set_err(self, msg):
        self.v_state.set("Offline")
        self._state_pill.configure(bg=RED)

    def _toast_task(self, task):
        prio = task.get("priority", "medium").capitalize()
        due  = (f"  ·  Due {task['dueDate']}" if task.get("dueDate") else "")
        Toast(self, f"📌  {task.get('title','New Task')}", f"{prio} priority{due}")

    def _quit(self):
        self._running = False
        self.destroy()


# ── Entry ─────────────────────────────────────────────────────────────────────
def main():
    try:
        import requests  # noqa
    except ImportError:
        print("Install requests first:  pip install requests psutil"); sys.exit(1)
    App().mainloop()

if __name__ == "__main__":
    main()
