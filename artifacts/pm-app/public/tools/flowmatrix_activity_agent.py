"""
FlowMatriX Activity Agent  v5.0
================================
Runs the FlowMatriX Employee Dashboard in your browser AND shows
a compact live-status window on your desktop.

SETUP (run once):
    pip install requests psutil customtkinter

RUN:
    python flowmatrix_activity_agent.py

PACKAGE AS EXE (Windows):
    pip install pyinstaller
    pyinstaller --onefile --noconsole --name FlowMatrixAgent flowmatrix_activity_agent.py
"""

import sys, time, socket, platform, getpass, os, threading, logging, webbrowser
from datetime import datetime

# ── Web App URL ───────────────────────────────────────────────────────────────
# Change this to your deployed FlowMatriX URL if needed
WEB_APP_URL = "https://766e4ea0-5b9e-488a-ad69-f3453d798d6d-00-3m118gokkcn7o.pike.replit.dev/pm-app/emp-agent"

# ── Config ────────────────────────────────────────────────────────────────────
API_URL        = "https://766e4ea0-5b9e-488a-ad69-f3453d798d6d-00-3m118gokkcn7o.pike.replit.dev/api"
DEVICE_USERNAME = "AUTO"
HEARTBEAT_SEC   = 30
IDLE_THRESHOLD  = 300

PLATFORM = platform.system()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("fm")

# ── FlowMatriX Palette ────────────────────────────────────────────────────────
FM = {
    "bg":           "#0D0B1A",   # deepest background
    "sidebar":      "#12102A",   # sidebar bg
    "card":         "#1A1836",   # card bg
    "card_hover":   "#1F1D40",
    "border":       "#2A2850",   # subtle borders
    "blue":         "#2492FF",   # primary blue
    "blue_dim":     "#1A3A6E",   # muted blue bg
    "purple":       "#7C3AED",
    "purple_dim":   "#2D1B69",
    "accent":       "#FF3C00",   # orange-red
    "accent_dim":   "#4A1500",
    "green":        "#10B981",
    "green_dim":    "#064E3B",
    "amber":        "#F59E0B",
    "amber_dim":    "#451A03",
    "red":          "#EF4444",
    "red_dim":      "#450A0A",
    "text":         "#F1F0FF",   # primary text
    "text_sub":     "#9491B4",   # muted text
    "text_dim":     "#5B5880",   # very muted
    "white":        "#FFFFFF",
    "input_bg":     "#1E1C3A",
}


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
                if "@" in v:  return v.split("@")[0]
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
                import psutil
                app = psutil.Process(pid.value).name().replace(".exe","").replace(".EXE","")
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
    if m < 60: return f"{m} min"
    return f"{m//60}h {m%60}m"


def initials(name):
    parts = (name or "?").split()
    return "".join(p[0].upper() for p in parts[:2]) or "?"


# ── CustomTkinter check ───────────────────────────────────────────────────────
try:
    import customtkinter as ctk
    import tkinter as tk
    from tkinter import Canvas
except ImportError:
    print("\n  customtkinter not found.\n  Run:  pip install customtkinter\n")
    sys.exit(1)

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")


# ── Toast Notification ────────────────────────────────────────────────────────
class Toast(ctk.CTkToplevel):
    def __init__(self, master, title: str, body: str, ms: int = 6000):
        super().__init__(master)
        self.overrideredirect(True)
        self.attributes("-topmost", True)
        self.configure(fg_color=FM["card"])
        try: self.attributes("-alpha", 0.97)
        except Exception: pass

        W = 340
        # Blue accent strip (left border via canvas)
        strip = tk.Canvas(self, width=4, bg=FM["blue"], highlightthickness=0)
        strip.pack(side="left", fill="y")

        wrap = ctk.CTkFrame(self, fg_color=FM["card"], corner_radius=0)
        wrap.pack(side="left", fill="both", expand=True, padx=16, pady=14)

        # Header
        hdr = ctk.CTkFrame(wrap, fg_color="transparent")
        hdr.pack(fill="x")
        ctk.CTkLabel(hdr, text="⚡ FlowMatriX",
                     font=ctk.CTkFont(size=10, weight="bold"),
                     text_color=FM["blue"]).pack(side="left")
        ctk.CTkLabel(hdr, text=datetime.now().strftime("%H:%M"),
                     font=ctk.CTkFont(size=9),
                     text_color=FM["text_dim"]).pack(side="right")

        ctk.CTkFrame(wrap, height=1, fg_color=FM["border"]).pack(fill="x", pady=(8, 10))

        ctk.CTkLabel(wrap, text=title,
                     font=ctk.CTkFont(size=11, weight="bold"),
                     text_color=FM["text"], wraplength=W-50, justify="left").pack(anchor="w")
        if body:
            ctk.CTkLabel(wrap, text=body,
                         font=ctk.CTkFont(size=9),
                         text_color=FM["text_sub"], wraplength=W-50, justify="left").pack(anchor="w", pady=(4, 0))

        self.update_idletasks()
        h = self.winfo_reqheight() + 10
        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        self.geometry(f"{W}x{h}+{sw-W-20}+{sh-h-60}")
        self.after(ms, self.destroy)


# ── Avatar Canvas widget ──────────────────────────────────────────────────────
class AvatarCanvas(tk.Canvas):
    def __init__(self, master, size=64, color=None, **kw):
        self._size = size
        super().__init__(master, width=size, height=size,
                         bg=FM["sidebar"], bd=0, highlightthickness=0, **kw)
        self._color = color or FM["blue"]
        self._oval  = self.create_oval(2, 2, size-2, size-2,
                                        fill=self._color, outline="")
        self._text  = self.create_text(size//2, size//2, text="?",
                                        fill=FM["white"],
                                        font=("Segoe UI", size//4, "bold"))
        # Status dot
        d = size // 5
        x0 = size - d - 2; y0 = size - d - 2
        self._dot_bg = self.create_oval(x0-2, y0-2, x0+d+2, y0+d+2,
                                         fill=FM["sidebar"], outline="")
        self._dot    = self.create_oval(x0, y0, x0+d, y0+d,
                                         fill=FM["amber"], outline="")

    def set_initials(self, name):
        self.itemconfig(self._text, text=initials(name))

    def set_status(self, color):
        self.itemconfig(self._dot, fill=color)


# ── Main Application ──────────────────────────────────────────────────────────
class FlowMatrixApp(ctk.CTk):
    W, H = 940, 660

    def __init__(self):
        super().__init__()
        self.title("FlowMatriX · Activity Agent")
        self.configure(fg_color=FM["bg"])
        self.resizable(True, True)
        self.minsize(780, 540)

        # State
        self.dev_user  = detect_username()
        self.session   = None
        self._running  = True
        self._hb_ok    = 0
        self.seen_ids  : set  = set()
        self.tasks     : list = []

        # StringVars
        self.v_name    = tk.StringVar(value=self.dev_user)
        self.v_dept    = tk.StringVar(value="Not linked")
        self.v_desig   = tk.StringVar(value="—")
        self.v_emp_id  = tk.StringVar(value="")
        self.v_app     = tk.StringVar(value="—")
        self.v_win     = tk.StringVar(value="—")
        self.v_idle    = tk.StringVar(value="None")
        self.v_state   = tk.StringVar(value="Connecting…")
        self.v_hb_time = tk.StringVar(value="—")
        self.v_hb_cnt  = tk.StringVar(value="0")
        self.v_task_ct = tk.StringVar(value="0")

        self._build_layout()
        self._start_agent()
        self.protocol("WM_DELETE_WINDOW", self._quit)

        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        self.geometry(f"{self.W}x{self.H}+{(sw-self.W)//2}+{(sh-self.H)//2}")

    # ── Layout ───────────────────────────────────────────────────────────────

    def _build_layout(self):
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)
        self._build_sidebar()
        self._build_main()

    # ── Sidebar ──────────────────────────────────────────────────────────────

    def _build_sidebar(self):
        sb = ctk.CTkFrame(self, width=240, corner_radius=0, fg_color=FM["sidebar"])
        sb.grid(row=0, column=0, sticky="nsew")
        sb.grid_propagate(False)
        sb.grid_rowconfigure(10, weight=1)
        sb.grid_columnconfigure(0, weight=1)

        # ── Logo ──
        logo = ctk.CTkFrame(sb, fg_color="transparent")
        logo.grid(row=0, column=0, padx=20, pady=(22, 16), sticky="ew")

        logo_row = ctk.CTkFrame(logo, fg_color="transparent")
        logo_row.pack(anchor="w")
        ctk.CTkLabel(logo_row, text="⚡",
                     font=ctk.CTkFont(size=20, weight="bold"),
                     text_color=FM["blue"]).pack(side="left")
        ctk.CTkLabel(logo_row, text=" FlowMatriX",
                     font=ctk.CTkFont(size=16, weight="bold"),
                     text_color=FM["text"]).pack(side="left")
        ctk.CTkLabel(logo, text="Activity Agent",
                     font=ctk.CTkFont(size=9),
                     text_color=FM["text_dim"]).pack(anchor="w", pady=(2, 0))

        self._divider(sb, row=1)

        # ── Employee profile ──
        emp = ctk.CTkFrame(sb, fg_color="transparent")
        emp.grid(row=2, column=0, padx=20, pady=18, sticky="ew")

        # Avatar
        self._avatar = AvatarCanvas(emp, size=68)
        self._avatar.pack()

        # Status pill under avatar
        self._state_lbl = ctk.CTkLabel(
            emp, textvariable=self.v_state,
            font=ctk.CTkFont(size=9, weight="bold"),
            text_color=FM["bg"],
            fg_color=FM["amber"],
            corner_radius=20, padx=14, pady=4)
        self._state_lbl.pack(pady=(10, 0))

        # Name
        ctk.CTkLabel(emp, textvariable=self.v_name,
                     font=ctk.CTkFont(size=13, weight="bold"),
                     text_color=FM["text"],
                     wraplength=195).pack(pady=(12, 0))

        # Designation
        ctk.CTkLabel(emp, textvariable=self.v_desig,
                     font=ctk.CTkFont(size=9, weight="bold"),
                     text_color=FM["blue"]).pack(pady=(2, 0))

        # Department
        ctk.CTkLabel(emp, textvariable=self.v_dept,
                     font=ctk.CTkFont(size=9),
                     text_color=FM["text_sub"],
                     wraplength=195).pack(pady=(2, 0))

        # Employee ID
        ctk.CTkLabel(emp, textvariable=self.v_emp_id,
                     font=ctk.CTkFont(size=8, family="Courier"),
                     text_color=FM["text_dim"]).pack(pady=(2, 0))

        self._divider(sb, row=3)

        # ── Stats row ──
        stats = ctk.CTkFrame(sb, fg_color="transparent")
        stats.grid(row=4, column=0, padx=16, pady=(12, 8), sticky="ew")
        stats.grid_columnconfigure((0, 1), weight=1)

        self._stat_card(stats, "Heartbeats", self.v_hb_cnt, FM["blue"], 0)
        self._stat_card(stats, "Last Sync",  self.v_hb_time, FM["green"], 1)

        self._divider(sb, row=5)

        # ── Live activity ──
        act = ctk.CTkFrame(sb, fg_color="transparent")
        act.grid(row=6, column=0, padx=20, pady=(14, 8), sticky="ew")

        ctk.CTkLabel(act, text="LIVE ACTIVITY",
                     font=ctk.CTkFont(size=8, weight="bold"),
                     text_color=FM["text_dim"]).pack(anchor="w", pady=(0, 10))

        rows = [("App", self.v_app, FM["text"]),
                ("Window", self.v_win, FM["text_sub"]),
                ("Idle", self.v_idle, FM["amber"])]
        for label, var, color in rows:
            r = ctk.CTkFrame(act, fg_color="transparent")
            r.pack(fill="x", pady=(0, 6))
            ctk.CTkLabel(r, text=label, width=52,
                         font=ctk.CTkFont(size=8, weight="bold"),
                         text_color=FM["text_dim"],
                         anchor="w").pack(side="left")
            ctk.CTkLabel(r, textvariable=var,
                         font=ctk.CTkFont(size=9),
                         text_color=color,
                         anchor="w",
                         wraplength=150,
                         justify="left").pack(side="left", fill="x", expand=True)

        # Spacer
        ctk.CTkFrame(sb, fg_color="transparent").grid(row=10, column=0, sticky="nsew")

        # ── Open Dashboard button ──
        dash_frame = ctk.CTkFrame(sb, fg_color="transparent")
        dash_frame.grid(row=9, column=0, padx=16, pady=(0, 8), sticky="ew")
        ctk.CTkButton(
            dash_frame,
            text="🌐  Open My Dashboard",
            font=ctk.CTkFont(size=11, weight="bold"),
            fg_color=FM["blue"],
            hover_color="#1A7FE8",
            text_color=FM["white"],
            corner_radius=10,
            height=38,
            command=lambda: webbrowser.open(
                f"{WEB_APP_URL}?username={__import__('urllib.parse', fromlist=['quote']).quote(DEVICE_USERNAME)}"
            ),
        ).pack(fill="x")

        # ── Device footer ──
        foot = ctk.CTkFrame(sb, fg_color=FM["bg"], corner_radius=0)
        foot.grid(row=11, column=0, sticky="ew")
        foot_in = ctk.CTkFrame(foot, fg_color="transparent")
        foot_in.pack(fill="x", padx=16, pady=12)

        ctk.CTkLabel(foot_in, text=f"🖥  {socket.gethostname()}",
                     font=ctk.CTkFont(size=8), text_color=FM["text_dim"],
                     anchor="w").pack(fill="x")
        ctk.CTkLabel(foot_in, text=f"👤  {self.dev_user}",
                     font=ctk.CTkFont(size=8), text_color=FM["text_dim"],
                     anchor="w").pack(fill="x", pady=(3, 0))
        ctk.CTkLabel(foot_in, text=f"🌐  {PLATFORM}",
                     font=ctk.CTkFont(size=8), text_color=FM["text_dim"],
                     anchor="w").pack(fill="x", pady=(3, 0))

    def _stat_card(self, parent, label, var, color, col):
        card = ctk.CTkFrame(parent, fg_color=FM["card"], corner_radius=8)
        card.grid(row=0, column=col, padx=(0, 6) if col == 0 else (0, 0), sticky="ew", ipady=8, ipadx=6)
        ctk.CTkLabel(card, text=label, font=ctk.CTkFont(size=7, weight="bold"),
                     text_color=FM["text_dim"]).pack(anchor="w", padx=10, pady=(8, 2))
        ctk.CTkLabel(card, textvariable=var, font=ctk.CTkFont(size=13, weight="bold"),
                     text_color=color).pack(anchor="w", padx=10, pady=(0, 8))

    def _divider(self, parent, row):
        ctk.CTkFrame(parent, height=1, fg_color=FM["border"], corner_radius=0).grid(
            row=row, column=0, sticky="ew", padx=16)

    # ── Main panel ───────────────────────────────────────────────────────────

    def _build_main(self):
        main = ctk.CTkFrame(self, corner_radius=0, fg_color=FM["bg"])
        main.grid(row=0, column=1, sticky="nsew")
        main.grid_rowconfigure(1, weight=1)
        main.grid_columnconfigure(0, weight=1)

        # ── Top bar ──
        topbar = ctk.CTkFrame(main, height=60, corner_radius=0,
                              fg_color=FM["sidebar"],
                              border_width=0)
        topbar.grid(row=0, column=0, sticky="ew")
        topbar.grid_propagate(False)
        topbar.grid_columnconfigure(1, weight=1)

        left_hdr = ctk.CTkFrame(topbar, fg_color="transparent")
        left_hdr.grid(row=0, column=0, padx=24, sticky="w", pady=14)

        ctk.CTkLabel(left_hdr, text="My Tasks",
                     font=ctk.CTkFont(size=16, weight="bold"),
                     text_color=FM["text"]).pack(side="left")

        # Count badge
        self._count_badge = ctk.CTkLabel(
            left_hdr, textvariable=self.v_task_ct,
            font=ctk.CTkFont(size=9, weight="bold"),
            text_color=FM["white"],
            fg_color=FM["blue"],
            corner_radius=10, padx=10, pady=3, width=28)
        self._count_badge.pack(side="left", padx=(10, 0))

        # Refresh button
        ctk.CTkButton(topbar, text="↻  Refresh",
                      font=ctk.CTkFont(size=10, weight="bold"),
                      fg_color=FM["blue_dim"],
                      hover_color=FM["blue"],
                      text_color=FM["blue"],
                      corner_radius=8, height=30, width=100,
                      command=lambda: threading.Thread(target=self._fetch_tasks, daemon=True).start()
                      ).grid(row=0, column=2, padx=20, pady=14, sticky="e")

        # ── Scroll area ──
        scroll = ctk.CTkScrollableFrame(main, fg_color=FM["bg"], scrollbar_button_color=FM["border"],
                                        scrollbar_button_hover_color=FM["text_dim"])
        scroll.grid(row=1, column=0, sticky="nsew", padx=0, pady=0)
        scroll.grid_columnconfigure(0, weight=1)
        self._scroll = scroll

        self._render_placeholder("Loading tasks…")

    # ── Task rendering ────────────────────────────────────────────────────────

    STATUS_META = {
        "todo":        ("To Do",       FM["text_dim"], FM["card"]),
        "in_progress": ("In Progress", FM["blue"],     FM["blue_dim"]),
        "review":      ("In Review",   FM["amber"],    FM["amber_dim"]),
        "done":        ("Done",        FM["green"],    FM["green_dim"]),
    }
    PRIORITY_META = {
        "high":   (FM["red"],    FM["red_dim"],    "High"),
        "medium": (FM["amber"],  FM["amber_dim"],  "Medium"),
        "low":    (FM["green"],  FM["green_dim"],  "Low"),
    }
    PRIORITY_STRIPE = {
        "high": FM["red"], "medium": FM["amber"], "low": FM["green"]
    }
    GROUP_ORDER = ["in_progress", "todo", "review", "done"]
    GROUP_NAMES = {
        "in_progress": "In Progress", "todo": "To Do",
        "review": "In Review", "done": "Done",
    }

    def _clear_scroll(self):
        for w in self._scroll.winfo_children():
            w.destroy()

    def _render_placeholder(self, msg):
        self._clear_scroll()
        wrap = ctk.CTkFrame(self._scroll, fg_color="transparent")
        wrap.grid(row=0, column=0, pady=80)
        ctk.CTkLabel(wrap, text="📋", font=ctk.CTkFont(size=36)).pack()
        ctk.CTkLabel(wrap, text=msg,
                     font=ctk.CTkFont(size=12),
                     text_color=FM["text_sub"]).pack(pady=(10, 0))

    def _render_tasks(self):
        self._clear_scroll()
        self.v_task_ct.set(str(len(self.tasks)))

        if not self.tasks:
            self._render_placeholder("No tasks assigned to you yet.")
            return

        row_idx = 0
        for status in self.GROUP_ORDER:
            group = [t for t in self.tasks if t.get("status") == status]
            if not group: continue

            # Group header
            gh = ctk.CTkFrame(self._scroll, fg_color="transparent")
            gh.grid(row=row_idx, column=0, sticky="ew", padx=20, pady=(20, 6))
            gh.grid_columnconfigure(1, weight=1)
            row_idx += 1

            s_label, s_fg, s_bg = self.STATUS_META.get(status, ("—", FM["text_sub"], FM["card"]))
            ctk.CTkLabel(gh, text=s_label,
                         font=ctk.CTkFont(size=9, weight="bold"),
                         fg_color=s_bg, text_color=s_fg,
                         corner_radius=6, padx=10, pady=4).grid(row=0, column=0)
            ctk.CTkLabel(gh, text=f" {len(group)}",
                         font=ctk.CTkFont(size=9),
                         text_color=FM["text_dim"]).grid(row=0, column=1, sticky="w", padx=(4, 0))
            ctk.CTkFrame(gh, height=1, fg_color=FM["border"]).grid(
                row=0, column=2, sticky="ew", padx=(12, 0))
            gh.grid_columnconfigure(2, weight=1)

            for task in group:
                self._task_card(task, row_idx)
                row_idx += 1

    def _task_card(self, task, row):
        status   = task.get("status", "todo")
        priority = task.get("priority", "medium")
        s_label, s_fg, s_bg = self.STATUS_META.get(status, ("—", FM["text_sub"], FM["card"]))
        p_fg, p_bg, p_name  = self.PRIORITY_META.get(priority, (FM["text_sub"], FM["card"], "Medium"))
        stripe_c = self.PRIORITY_STRIPE.get(priority, FM["border"])

        title    = task.get("title", "Untitled")
        desc     = task.get("description") or ""
        due      = task.get("dueDate") or ""
        tags_raw = task.get("tags") or ""
        by       = (task.get("createdBy") or "").split("@")[0]
        is_over  = due and due < datetime.now().strftime("%Y-%m-%d") and status != "done"

        # Card outer
        outer = ctk.CTkFrame(self._scroll, fg_color=FM["card"], corner_radius=10)
        outer.grid(row=row, column=0, sticky="ew", padx=20, pady=(0, 8))
        outer.grid_columnconfigure(1, weight=1)

        # Priority stripe
        stripe = ctk.CTkFrame(outer, width=4, fg_color=stripe_c, corner_radius=0)
        stripe.grid(row=0, column=0, sticky="ns", rowspan=10, padx=(0, 0))

        body = ctk.CTkFrame(outer, fg_color="transparent")
        body.grid(row=0, column=1, sticky="ew", padx=16, pady=14)
        body.grid_columnconfigure(0, weight=1)

        # Row 1: title + status badge
        r1 = ctk.CTkFrame(body, fg_color="transparent")
        r1.grid(row=0, column=0, sticky="ew")
        r1.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(r1, text=title,
                     font=ctk.CTkFont(size=12, weight="bold"),
                     text_color=FM["text"],
                     anchor="w", justify="left",
                     wraplength=380).grid(row=0, column=0, sticky="w")

        ctk.CTkLabel(r1, text=s_label,
                     font=ctk.CTkFont(size=8, weight="bold"),
                     text_color=s_fg, fg_color=s_bg,
                     corner_radius=6, padx=10, pady=4).grid(row=0, column=1, sticky="e", padx=(8, 0))

        # Row 2: description
        if desc.strip():
            short = desc[:180] + ("…" if len(desc) > 180 else "")
            ctk.CTkLabel(body, text=short,
                         font=ctk.CTkFont(size=9),
                         text_color=FM["text_sub"],
                         anchor="w", justify="left",
                         wraplength=480).grid(row=1, column=0, sticky="w", pady=(6, 0))

        # Divider
        ctk.CTkFrame(body, height=1, fg_color=FM["border"]).grid(
            row=2, column=0, sticky="ew", pady=(10, 8))

        # Row 3: meta pills
        meta = ctk.CTkFrame(body, fg_color="transparent")
        meta.grid(row=3, column=0, sticky="ew")

        # Priority pill
        ctk.CTkLabel(meta,
                     text=f"● {p_name}",
                     font=ctk.CTkFont(size=8, weight="bold"),
                     text_color=p_fg, fg_color=p_bg,
                     corner_radius=6, padx=8, pady=3).pack(side="left")

        # Tag pills
        for tag in [t.strip() for t in tags_raw.split(",") if t.strip()][:3]:
            ctk.CTkLabel(meta, text=f"# {tag}",
                         font=ctk.CTkFont(size=8),
                         text_color=FM["purple"],
                         fg_color=FM["purple_dim"],
                         corner_radius=6, padx=8, pady=3).pack(side="left", padx=(6, 0))

        # Created by
        if by:
            ctk.CTkLabel(meta, text=f"by {by}",
                         font=ctk.CTkFont(size=8),
                         text_color=FM["text_dim"]).pack(side="left", padx=(10, 0))

        # Due date
        if due:
            due_fg  = FM["red"]  if is_over else FM["text_dim"]
            due_bg  = FM["red_dim"] if is_over else FM["card"]
            due_txt = ("⚠  Overdue " if is_over else "📅  ") + due
            ctk.CTkLabel(meta, text=due_txt,
                         font=ctk.CTkFont(size=8, weight="bold" if is_over else "normal"),
                         text_color=due_fg, fg_color=due_bg,
                         corner_radius=6, padx=8, pady=3).pack(side="right")

    # ── Agent logic ──────────────────────────────────────────────────────────

    def _start_agent(self):
        try:
            import requests
            self.session = requests.Session()
            self.session.headers.update({
                "Content-Type": "application/json",
                "User-Agent": "FlowMatriX-Agent/5.0",
            })
        except ImportError:
            self.v_state.set("requests missing"); return

        threading.Thread(target=self._hb_loop,    daemon=True).start()
        threading.Thread(target=self._task_loop,  daemon=True).start()
        # Open the employee dashboard in the default browser
        threading.Thread(target=self._open_browser, daemon=True).start()

    def _open_browser(self):
        time.sleep(1.5)   # brief delay so the window appears first
        try:
            import urllib.parse
            url = f"{WEB_APP_URL}?username={urllib.parse.quote(DEVICE_USERNAME)}"
            webbrowser.open(url)
            log.info("Opened employee dashboard: %s", url)
        except Exception as e:
            log.warning("Could not open browser: %s", e)

    def _hb_loop(self):
        while self._running:
            self._heartbeat()
            time.sleep(HEARTBEAT_SEC)

    def _task_loop(self):
        time.sleep(4)
        while self._running:
            self._fetch_tasks()
            time.sleep(30)

    def _heartbeat(self):
        app, win = get_active_window()
        idle     = get_idle_seconds()
        active   = idle < IDLE_THRESHOLD
        try:
            r = self.session.post(f"{API_URL}/activity/heartbeat", timeout=10, json={
                "deviceUsername": self.dev_user,
                "activeApp":      app,
                "windowTitle":    win[:250],
                "isActive":       active,
                "idleSeconds":    int(idle),
                "deviceName":     socket.gethostname(),
            })
            if r.status_code == 200:
                self._hb_ok += 1
                self.after(0, self._on_hb, app, win, idle, active, r.json())
            else:
                self.after(0, self._set_offline)
        except Exception:
            self.after(0, self._set_offline)

    def _fetch_tasks(self):
        try:
            r = self.session.get(f"{API_URL}/fm-tasks", timeout=10)
            if r.status_code != 200: return
            my_name = self.v_name.get().lower()
            my = [t for t in r.json()
                  if my_name and (
                      my_name in (t.get("assigneeName") or "").lower() or
                      (t.get("assigneeName") or "").lower() in my_name
                  )]
            new_ids = {t["id"] for t in my} - self.seen_ids
            if self.seen_ids:
                for t in my:
                    if t["id"] in new_ids:
                        self.after(0, self._show_toast, t)
            self.seen_ids = {t["id"] for t in my}
            self.tasks    = my
            self.after(0, self._render_tasks)
        except Exception as e:
            log.warning("tasks: %s", e)

    def _on_hb(self, app, win, idle, active, data):
        name  = data.get("resolvedName")  or self.dev_user
        dept  = data.get("resolvedDept")  or ""
        desig = data.get("resolvedDesignation") or ""
        emp   = data.get("erpEmployeeId") or ""

        self.v_name.set(name)
        self.v_dept.set(dept  or "Not linked to ERPNext")
        self.v_desig.set(desig or "—")
        self.v_emp_id.set(emp)
        self.v_app.set(app or "—")
        self.v_win.set((win[:52]+"…") if len(win) > 52 else (win or "—"))
        self.v_idle.set(fmt_idle(idle) if idle > 5 else "None")
        self.v_hb_time.set(datetime.now().strftime("%H:%M:%S"))
        self.v_hb_cnt.set(str(self._hb_ok))
        self._avatar.set_initials(name)

        if active:
            self.v_state.set("● Active")
            self._state_lbl.configure(fg_color=FM["green"])
            self._avatar.set_status(FM["green"])
        else:
            label = fmt_idle(idle) if idle > 5 else "Idle"
            self.v_state.set(f"● {label}")
            self._state_lbl.configure(fg_color=FM["amber"])
            self._avatar.set_status(FM["amber"])

    def _set_offline(self):
        self.v_state.set("● Offline")
        self._state_lbl.configure(fg_color=FM["red"])
        self._avatar.set_status(FM["red"])

    def _show_toast(self, task):
        prio = task.get("priority", "medium").capitalize()
        due  = (f"  ·  Due {task['dueDate']}" if task.get("dueDate") else "")
        try:
            Toast(self, f"📌  {task.get('title','New Task')}", f"{prio} priority{due}")
        except Exception: pass

    def _quit(self):
        self._running = False
        self.destroy()


# ── Entry ─────────────────────────────────────────────────────────────────────
def main():
    try:
        import requests  # noqa
    except ImportError:
        print("\n  requests not installed.\n  Run:  pip install requests psutil customtkinter\n")
        sys.exit(1)
    FlowMatrixApp().mainloop()


if __name__ == "__main__":
    main()
