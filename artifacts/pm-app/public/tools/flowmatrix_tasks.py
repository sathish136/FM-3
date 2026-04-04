"""
FlowMatriX Task Manager - Windows Desktop Client
================================================
A standalone Python GUI application to manage tasks from FlowMatriX.

Requirements:
    pip install requests

Run:
    python flowmatrix_tasks.py
"""

import tkinter as tk
from tkinter import ttk, messagebox, simpledialog, font as tkfont
import threading
import json
import os
import sys
import time
from datetime import datetime, date

try:
    import requests
    REQUESTS_OK = True
except ImportError:
    REQUESTS_OK = False

# ── Config ───────────────────────────────────────────────────────────────────
CONFIG_FILE = os.path.join(os.path.expanduser("~"), ".flowmatrix_config.json")
DEFAULT_API = "https://225c2066-465f-4f25-be56-82d920826ba6-00-l4ly2mlawd6s.sisko.replit.dev/api"

STATUS_LABELS = {
    "todo":        "To Do",
    "in_progress": "In Progress",
    "review":      "Review",
    "done":        "Done",
}
STATUS_COLORS = {
    "todo":        "#6b7280",
    "in_progress": "#3b82f6",
    "review":      "#f59e0b",
    "done":        "#10b981",
}
PRIORITY_COLORS = {
    "high":   "#ef4444",
    "medium": "#f59e0b",
    "low":    "#6b7280",
}

# ── Config helpers ────────────────────────────────────────────────────────────
def load_config():
    try:
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {"api_url": DEFAULT_API, "token": ""}

def save_config(cfg):
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(cfg, f, indent=2)
    except Exception:
        pass

# ── API client ────────────────────────────────────────────────────────────────
class FlowMatrixAPI:
    def __init__(self, base_url: str, token: str = ""):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json",
        })
        if token:
            self.session.headers["Authorization"] = f"Bearer {token}"

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def get_projects(self):
        r = self.session.get(self._url("/projects"), timeout=10)
        r.raise_for_status()
        return r.json()

    def get_tasks(self, project_id=None):
        params = {}
        if project_id is not None:
            params["projectId"] = project_id
        r = self.session.get(self._url("/tasks"), params=params, timeout=10)
        r.raise_for_status()
        return r.json()

    def create_task(self, data: dict):
        r = self.session.post(self._url("/tasks"), json=data, timeout=10)
        r.raise_for_status()
        return r.json()

    def update_task(self, task_id: int, data: dict):
        r = self.session.patch(self._url(f"/tasks/{task_id}"), json=data, timeout=10)
        r.raise_for_status()
        return r.json()

    def delete_task(self, task_id: int):
        r = self.session.delete(self._url(f"/tasks/{task_id}"), timeout=10)
        r.raise_for_status()

    def get_users(self):
        try:
            r = self.session.get(self._url("/erpnext-users"), timeout=10)
            r.raise_for_status()
            return r.json()
        except Exception:
            return []

# ── Task Dialog ────────────────────────────────────────────────────────────────
class TaskDialog(tk.Toplevel):
    def __init__(self, parent, title, projects, users, task=None, default_project_id=None):
        super().__init__(parent)
        self.title(title)
        self.projects = projects
        self.users = users
        self.task = task
        self.result = None
        self.resizable(False, False)
        self.grab_set()
        self.configure(bg="#f9fafb")

        # Center the dialog
        self.geometry("460x520")
        self.update_idletasks()
        x = (self.winfo_screenwidth() - 460) // 2
        y = (self.winfo_screenheight() - 520) // 2
        self.geometry(f"460x520+{x}+{y}")

        self._build(default_project_id)
        self.wait_window()

    def _label(self, parent, text):
        lbl = tk.Label(parent, text=text, bg="#f9fafb", fg="#374151",
                       font=("Segoe UI", 8, "bold"))
        lbl.pack(anchor="w", padx=4, pady=(8, 2))
        return lbl

    def _entry(self, parent, default=""):
        e = tk.Entry(parent, font=("Segoe UI", 10), relief="solid", bd=1,
                     bg="white", fg="#111827")
        e.pack(fill="x", padx=4)
        if default:
            e.insert(0, default)
        return e

    def _build(self, default_project_id):
        main = tk.Frame(self, bg="#f9fafb", padx=16, pady=12)
        main.pack(fill="both", expand=True)

        # Title
        self._label(main, "Task Title *")
        self.title_var = tk.StringVar(value=self.task.get("title", "") if self.task else "")
        tk.Entry(main, textvariable=self.title_var, font=("Segoe UI", 11),
                 relief="solid", bd=1, bg="white", fg="#111827").pack(fill="x", padx=4)

        # Description
        self._label(main, "Description")
        self.desc_text = tk.Text(main, height=3, font=("Segoe UI", 10),
                                 relief="solid", bd=1, bg="white", fg="#111827", wrap="word")
        self.desc_text.pack(fill="x", padx=4)
        if self.task and self.task.get("description"):
            self.desc_text.insert("1.0", self.task["description"])

        # Row: Status + Priority
        row1 = tk.Frame(main, bg="#f9fafb")
        row1.pack(fill="x", pady=2)
        l_st = tk.Frame(row1, bg="#f9fafb")
        l_st.pack(side="left", fill="x", expand=True, padx=(0, 6))
        l_pr = tk.Frame(row1, bg="#f9fafb")
        l_pr.pack(side="left", fill="x", expand=True)

        tk.Label(l_st, text="Status", bg="#f9fafb", fg="#374151",
                 font=("Segoe UI", 8, "bold")).pack(anchor="w", padx=4, pady=(8, 2))
        self.status_var = tk.StringVar(value=self.task.get("status", "todo") if self.task else "todo")
        status_cb = ttk.Combobox(l_st, textvariable=self.status_var, state="readonly",
                                  values=list(STATUS_LABELS.values()), font=("Segoe UI", 10))
        status_cb.pack(fill="x", padx=4)
        if self.task:
            status_cb.set(STATUS_LABELS.get(self.task.get("status", "todo"), "To Do"))

        tk.Label(l_pr, text="Priority", bg="#f9fafb", fg="#374151",
                 font=("Segoe UI", 8, "bold")).pack(anchor="w", padx=4, pady=(8, 2))
        self.priority_var = tk.StringVar(value=self.task.get("priority", "medium") if self.task else "medium")
        prio_cb = ttk.Combobox(l_pr, textvariable=self.priority_var, state="readonly",
                                values=["low", "medium", "high"], font=("Segoe UI", 10))
        prio_cb.pack(fill="x", padx=4)
        if self.task:
            prio_cb.set(self.task.get("priority", "medium"))

        # Row: Project + Due Date
        row2 = tk.Frame(main, bg="#f9fafb")
        row2.pack(fill="x", pady=2)
        l_pj = tk.Frame(row2, bg="#f9fafb")
        l_pj.pack(side="left", fill="x", expand=True, padx=(0, 6))
        l_dd = tk.Frame(row2, bg="#f9fafb")
        l_dd.pack(side="left", fill="x", expand=True)

        tk.Label(l_pj, text="Project", bg="#f9fafb", fg="#374151",
                 font=("Segoe UI", 8, "bold")).pack(anchor="w", padx=4, pady=(8, 2))
        project_names = ["(No project)"] + [p["name"] for p in self.projects]
        self.project_var = tk.StringVar()
        proj_cb = ttk.Combobox(l_pj, textvariable=self.project_var, state="readonly",
                                values=project_names, font=("Segoe UI", 10))
        proj_cb.pack(fill="x", padx=4)
        if self.task and self.task.get("projectId"):
            proj = next((p for p in self.projects if p["id"] == self.task["projectId"]), None)
            proj_cb.set(proj["name"] if proj else "(No project)")
        elif default_project_id:
            proj = next((p for p in self.projects if p["id"] == default_project_id), None)
            proj_cb.set(proj["name"] if proj else "(No project)")
        else:
            proj_cb.set("(No project)")

        tk.Label(l_dd, text="Due Date (YYYY-MM-DD)", bg="#f9fafb", fg="#374151",
                 font=("Segoe UI", 8, "bold")).pack(anchor="w", padx=4, pady=(8, 2))
        self.due_var = tk.StringVar(value=(self.task or {}).get("dueDate", "") or "")
        if self.due_var.get() and "T" in self.due_var.get():
            self.due_var.set(self.due_var.get()[:10])
        tk.Entry(l_dd, textvariable=self.due_var, font=("Segoe UI", 10),
                 relief="solid", bd=1, bg="white", fg="#111827").pack(fill="x", padx=4)

        # Assignee
        tk.Label(main, text="Assignee", bg="#f9fafb", fg="#374151",
                 font=("Segoe UI", 8, "bold")).pack(anchor="w", padx=4, pady=(8, 2))
        user_names = ["(Unassigned)"] + [u.get("full_name", u.get("email", "")) for u in self.users]
        self.assignee_var = tk.StringVar(value=self.task.get("assignee", "") if self.task else "")
        assignee_cb = ttk.Combobox(main, textvariable=self.assignee_var, values=user_names,
                                    font=("Segoe UI", 10))
        assignee_cb.pack(fill="x", padx=4)

        # Buttons
        btn_frame = tk.Frame(main, bg="#f9fafb")
        btn_frame.pack(fill="x", pady=(16, 0))
        tk.Button(btn_frame, text="Cancel", command=self.destroy,
                  font=("Segoe UI", 10), bg="#e5e7eb", fg="#374151",
                  relief="flat", padx=16, pady=6, cursor="hand2").pack(side="right", padx=(4, 0))
        tk.Button(btn_frame, text="Save Task", command=self._save,
                  font=("Segoe UI", 10, "bold"), bg="#2563eb", fg="white",
                  relief="flat", padx=16, pady=6, cursor="hand2").pack(side="right")

    def _save(self):
        title = self.title_var.get().strip()
        if not title:
            messagebox.showwarning("Validation", "Task title is required.", parent=self)
            return

        # Resolve status back to key
        status_key = "todo"
        for k, v in STATUS_LABELS.items():
            if v == self.status_var.get():
                status_key = k
                break
        if self.status_var.get() in STATUS_LABELS:
            status_key = self.status_var.get()

        # Resolve project ID
        project_id = None
        pname = self.project_var.get()
        if pname and pname != "(No project)":
            proj = next((p for p in self.projects if p["name"] == pname), None)
            if proj:
                project_id = proj["id"]

        # Resolve assignee
        assignee = self.assignee_var.get().strip()
        if assignee == "(Unassigned)":
            assignee = None

        self.result = {
            "title": title,
            "description": self.desc_text.get("1.0", "end-1c").strip() or None,
            "status": status_key,
            "priority": self.priority_var.get() or "medium",
            "projectId": project_id,
            "dueDate": self.due_var.get().strip() or None,
            "assignee": assignee or None,
        }
        self.destroy()

# ── Settings Dialog ────────────────────────────────────────────────────────────
class SettingsDialog(tk.Toplevel):
    def __init__(self, parent, cfg):
        super().__init__(parent)
        self.title("Settings - FlowMatriX")
        self.cfg = cfg.copy()
        self.result = None
        self.resizable(False, False)
        self.grab_set()
        self.configure(bg="#f9fafb")
        self.geometry("420x220")
        self.update_idletasks()
        x = (self.winfo_screenwidth() - 420) // 2
        y = (self.winfo_screenheight() - 220) // 2
        self.geometry(f"420x220+{x}+{y}")
        self._build()
        self.wait_window()

    def _build(self):
        main = tk.Frame(self, bg="#f9fafb", padx=20, pady=16)
        main.pack(fill="both", expand=True)

        tk.Label(main, text="FlowMatriX API URL", bg="#f9fafb", fg="#374151",
                 font=("Segoe UI", 9, "bold")).pack(anchor="w", pady=(0, 4))
        self.url_var = tk.StringVar(value=self.cfg.get("api_url", DEFAULT_API))
        tk.Entry(main, textvariable=self.url_var, font=("Segoe UI", 10),
                 relief="solid", bd=1, bg="white", fg="#111827", width=50).pack(fill="x")

        tk.Label(main, text="Auth Token (optional)", bg="#f9fafb", fg="#374151",
                 font=("Segoe UI", 9, "bold")).pack(anchor="w", pady=(12, 4))
        self.token_var = tk.StringVar(value=self.cfg.get("token", ""))
        tk.Entry(main, textvariable=self.token_var, font=("Segoe UI", 10),
                 relief="solid", bd=1, bg="white", fg="#111827", show="*").pack(fill="x")

        tk.Label(main, text="Tip: Use the deployed app URL ending in /api",
                 bg="#f9fafb", fg="#9ca3af", font=("Segoe UI", 8)).pack(anchor="w", pady=(4, 0))

        btn_frame = tk.Frame(main, bg="#f9fafb")
        btn_frame.pack(fill="x", pady=(16, 0))
        tk.Button(btn_frame, text="Cancel", command=self.destroy,
                  font=("Segoe UI", 10), bg="#e5e7eb", fg="#374151",
                  relief="flat", padx=14, pady=5, cursor="hand2").pack(side="right", padx=(4, 0))
        tk.Button(btn_frame, text="Save", command=self._save,
                  font=("Segoe UI", 10, "bold"), bg="#2563eb", fg="white",
                  relief="flat", padx=14, pady=5, cursor="hand2").pack(side="right")

    def _save(self):
        self.result = {
            "api_url": self.url_var.get().strip(),
            "token": self.token_var.get().strip(),
        }
        self.destroy()

# ── Main Application ───────────────────────────────────────────────────────────
class FlowMatriXApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("FlowMatriX Task Manager")
        self.geometry("1100x680")
        self.minsize(800, 500)
        self.configure(bg="#f3f4f6")

        # Try to set icon
        try:
            self.iconbitmap(default="")
        except Exception:
            pass

        self.cfg = load_config()
        self.api = None
        self.projects = []
        self.tasks = []
        self.users = []
        self.selected_project_id = None
        self.loading = False
        self._after_id = None

        self._build_ui()
        self._connect()

    def _connect(self):
        if not REQUESTS_OK:
            messagebox.showerror("Missing Library",
                "The 'requests' library is required.\n\nRun: pip install requests",
                parent=self)
            return
        self.api = FlowMatrixAPI(self.cfg["api_url"], self.cfg.get("token", ""))
        self._reload_all()

    def _build_ui(self):
        # Menu bar
        menubar = tk.Menu(self, bg="#1e293b", fg="white")
        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="Settings", command=self._open_settings)
        file_menu.add_separator()
        file_menu.add_command(label="Refresh", command=self._reload_all)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.quit)
        menubar.add_cascade(label="FlowMatriX", menu=file_menu)

        task_menu = tk.Menu(menubar, tearoff=0)
        task_menu.add_command(label="New Task", command=self._new_task, accelerator="Ctrl+N")
        task_menu.add_command(label="Refresh Tasks", command=self._load_tasks)
        menubar.add_cascade(label="Tasks", menu=task_menu)
        self.config(menu=menubar)
        self.bind_all("<Control-n>", lambda e: self._new_task())
        self.bind_all("<F5>", lambda e: self._reload_all())

        # Top bar
        topbar = tk.Frame(self, bg="#1e3a5f", pady=8)
        topbar.pack(fill="x")
        tk.Label(topbar, text="⬡ FlowMatriX", bg="#1e3a5f", fg="white",
                 font=("Segoe UI", 14, "bold")).pack(side="left", padx=16)
        tk.Label(topbar, text="Task Manager", bg="#1e3a5f", fg="#93c5fd",
                 font=("Segoe UI", 10)).pack(side="left")

        self.status_bar_var = tk.StringVar(value="Connecting…")
        tk.Label(topbar, textvariable=self.status_bar_var, bg="#1e3a5f", fg="#94a3b8",
                 font=("Segoe UI", 9)).pack(side="right", padx=16)

        tk.Button(topbar, text="⚙ Settings", command=self._open_settings,
                  bg="#334155", fg="white", relief="flat", padx=10, pady=3,
                  font=("Segoe UI", 9), cursor="hand2").pack(side="right", padx=4)
        tk.Button(topbar, text="↻ Refresh", command=self._reload_all,
                  bg="#2563eb", fg="white", relief="flat", padx=10, pady=3,
                  font=("Segoe UI", 9), cursor="hand2").pack(side="right", padx=4)
        tk.Button(topbar, text="+ New Task", command=self._new_task,
                  bg="#059669", fg="white", relief="flat", padx=10, pady=3,
                  font=("Segoe UI", 9, "bold"), cursor="hand2").pack(side="right", padx=4)

        # Main layout
        paned = tk.PanedWindow(self, orient="horizontal", bg="#e5e7eb",
                                sashwidth=4, relief="flat")
        paned.pack(fill="both", expand=True, padx=0, pady=0)

        # ── Left: Projects ──
        left = tk.Frame(paned, bg="#f9fafb", width=220)
        paned.add(left, minsize=160)

        tk.Label(left, text="PROJECTS", bg="#f9fafb", fg="#6b7280",
                 font=("Segoe UI", 8, "bold")).pack(anchor="w", padx=12, pady=(12, 4))

        proj_scroll = tk.Frame(left, bg="#f9fafb")
        proj_scroll.pack(fill="both", expand=True, padx=4, pady=4)

        self.proj_listbox = tk.Listbox(proj_scroll, font=("Segoe UI", 10),
                                        selectbackground="#dbeafe", selectforeground="#1d4ed8",
                                        bg="#f9fafb", fg="#111827", bd=0,
                                        highlightthickness=0, activestyle="none",
                                        relief="flat", exportselection=False)
        proj_sb = ttk.Scrollbar(proj_scroll, orient="vertical",
                                  command=self.proj_listbox.yview)
        self.proj_listbox.config(yscrollcommand=proj_sb.set)
        proj_sb.pack(side="right", fill="y")
        self.proj_listbox.pack(fill="both", expand=True)
        self.proj_listbox.bind("<<ListboxSelect>>", self._on_project_select)

        # Stats frame at bottom of left panel
        self.stats_frame = tk.Frame(left, bg="#e8f4f8", relief="flat", bd=0)
        self.stats_frame.pack(fill="x", padx=8, pady=8)
        self.stats_label = tk.Label(self.stats_frame, text="", bg="#e8f4f8",
                                     fg="#374151", font=("Segoe UI", 8),
                                     justify="left", wraplength=180)
        self.stats_label.pack(padx=8, pady=6, anchor="w")

        # ── Right: Tasks (Kanban) ──
        right = tk.Frame(paned, bg="#f3f4f6")
        paned.add(right, minsize=500)

        # Filter bar
        filter_bar = tk.Frame(right, bg="#ffffff", bd=0, relief="flat")
        filter_bar.pack(fill="x", padx=0, pady=0)
        tk.Label(filter_bar, text="Filter:", bg="white", fg="#6b7280",
                 font=("Segoe UI", 9)).pack(side="left", padx=(12, 4), pady=8)
        self.filter_var = tk.StringVar(value="All")
        for val in ["All", "Todo", "In Progress", "Review", "Done"]:
            rb = tk.Radiobutton(filter_bar, text=val, variable=self.filter_var, value=val,
                                 bg="white", fg="#374151", font=("Segoe UI", 9),
                                 activebackground="white", selectcolor="white",
                                 command=self._apply_filter)
            rb.pack(side="left", padx=4, pady=8)

        # Search
        tk.Label(filter_bar, text="Search:", bg="white", fg="#6b7280",
                 font=("Segoe UI", 9)).pack(side="left", padx=(12, 4))
        self.search_var = tk.StringVar()
        self.search_var.trace("w", lambda *_: self._apply_filter())
        tk.Entry(filter_bar, textvariable=self.search_var, font=("Segoe UI", 9),
                 relief="solid", bd=1, bg="white", fg="#111827", width=18).pack(side="left", pady=6)

        sep = tk.Frame(right, height=1, bg="#e5e7eb")
        sep.pack(fill="x")

        # Kanban columns area
        kanban_outer = tk.Frame(right, bg="#f3f4f6")
        kanban_outer.pack(fill="both", expand=True)

        # Horizontal scrollable
        canvas = tk.Canvas(kanban_outer, bg="#f3f4f6", highlightthickness=0)
        h_scroll = ttk.Scrollbar(kanban_outer, orient="horizontal", command=canvas.xview)
        canvas.configure(xscrollcommand=h_scroll.set)
        h_scroll.pack(side="bottom", fill="x")
        canvas.pack(fill="both", expand=True)

        self.kanban_frame = tk.Frame(canvas, bg="#f3f4f6")
        canvas_window = canvas.create_window((0, 0), window=self.kanban_frame, anchor="nw")

        def _on_configure(e):
            canvas.configure(scrollregion=canvas.bbox("all"))
            if self.kanban_frame.winfo_reqwidth() < canvas.winfo_width():
                canvas.itemconfig(canvas_window, width=canvas.winfo_width())
        self.kanban_frame.bind("<Configure>", _on_configure)
        canvas.bind("<Configure>", _on_configure)

        # Build 4 columns
        self.col_frames = {}
        self.col_inner = {}
        self.col_count_labels = {}

        for col_id, col_title, col_color, col_bg in [
            ("todo",        "To Do",       "#6b7280", "#f9fafb"),
            ("in_progress", "In Progress", "#3b82f6", "#eff6ff"),
            ("review",      "Review",      "#f59e0b", "#fffbeb"),
            ("done",        "Done",        "#10b981", "#f0fdf4"),
        ]:
            col_frame = tk.Frame(self.kanban_frame, bg=col_bg, bd=1, relief="solid",
                                  width=240)
            col_frame.pack(side="left", fill="y", padx=6, pady=6, anchor="n")
            col_frame.pack_propagate(False)

            # Column header
            hdr = tk.Frame(col_frame, bg=col_color, pady=6)
            hdr.pack(fill="x")
            tk.Label(hdr, text=col_title, bg=col_color, fg="white",
                     font=("Segoe UI", 10, "bold")).pack(side="left", padx=10)
            count_lbl = tk.Label(hdr, text="0", bg=col_color, fg="white",
                                  font=("Segoe UI", 9, "bold"),
                                  relief="flat")
            count_lbl.pack(side="right", padx=8)
            self.col_count_labels[col_id] = count_lbl

            # Scrollable card area
            inner_canvas = tk.Canvas(col_frame, bg=col_bg, highlightthickness=0)
            v_scroll = ttk.Scrollbar(col_frame, orient="vertical", command=inner_canvas.yview)
            inner_canvas.configure(yscrollcommand=v_scroll.set)
            v_scroll.pack(side="right", fill="y")
            inner_canvas.pack(fill="both", expand=True)

            cards_frame = tk.Frame(inner_canvas, bg=col_bg)
            inner_canvas.create_window((0, 0), window=cards_frame, anchor="nw")

            def _configure(e, ic=inner_canvas):
                ic.configure(scrollregion=ic.bbox("all"))
            cards_frame.bind("<Configure>", _configure)

            self.col_frames[col_id] = col_frame
            self.col_inner[col_id] = cards_frame

        # Loading label
        self.loading_label = tk.Label(self.kanban_frame, text="Loading tasks…",
                                       bg="#f3f4f6", fg="#9ca3af",
                                       font=("Segoe UI", 12))

    def _open_settings(self):
        dlg = SettingsDialog(self, self.cfg)
        if dlg.result:
            self.cfg.update(dlg.result)
            save_config(self.cfg)
            self._connect()

    def _reload_all(self):
        self._load_projects()

    def _load_projects(self):
        if not self.api:
            return
        self.status_bar_var.set("Loading projects…")

        def worker():
            try:
                projs = self.api.get_projects()
                users = self.api.get_users()
                self.after(0, lambda: self._on_projects_loaded(projs, users))
            except Exception as e:
                self.after(0, lambda: self._on_error(str(e)))

        threading.Thread(target=worker, daemon=True).start()

    def _on_projects_loaded(self, projects, users):
        self.projects = projects
        self.users = users
        self.proj_listbox.delete(0, tk.END)
        self.proj_listbox.insert(tk.END, "📋  All Projects")
        for p in projects:
            status_icon = {"active": "🟢", "planning": "🟡", "completed": "⚪"}.get(p.get("status", ""), "🔵")
            self.proj_listbox.insert(tk.END, f"  {status_icon} {p['name']}")
        self.proj_listbox.selection_set(0)
        self.selected_project_id = None
        self.status_bar_var.set(f"Connected · {len(projects)} projects · {len(users)} users")
        self._load_tasks()

    def _on_project_select(self, event):
        sel = self.proj_listbox.curselection()
        if not sel:
            return
        idx = sel[0]
        if idx == 0:
            self.selected_project_id = None
        else:
            self.selected_project_id = self.projects[idx - 1]["id"]
        self._load_tasks()

    def _load_tasks(self):
        if not self.api:
            return
        self.status_bar_var.set("Loading tasks…")
        pid = self.selected_project_id

        def worker():
            try:
                tasks = self.api.get_tasks(project_id=pid)
                self.after(0, lambda: self._on_tasks_loaded(tasks))
            except Exception as e:
                self.after(0, lambda: self._on_error(str(e)))

        threading.Thread(target=worker, daemon=True).start()

    def _on_tasks_loaded(self, tasks):
        self.tasks = tasks
        self._apply_filter()
        proj_name = "All Projects"
        if self.selected_project_id:
            p = next((p for p in self.projects if p["id"] == self.selected_project_id), None)
            if p:
                proj_name = p["name"]
        total = len(tasks)
        done = sum(1 for t in tasks if t.get("status") == "done")
        pct = round(done / total * 100) if total > 0 else 0
        self.stats_label.config(
            text=f"{proj_name}\n{total} tasks · {done} done · {pct}%"
        )
        self.status_bar_var.set(f"Loaded {total} tasks")

    def _apply_filter(self, *_):
        flt = self.filter_var.get()
        srch = self.search_var.get().strip().lower()

        status_map = {
            "All": None,
            "Todo": "todo",
            "In Progress": "in_progress",
            "Review": "review",
            "Done": "done",
        }
        filter_status = status_map.get(flt)

        filtered = [t for t in self.tasks if
                    (filter_status is None or t.get("status") == filter_status) and
                    (not srch or srch in t.get("title", "").lower() or
                     srch in (t.get("assignee") or "").lower())]

        self._render_tasks(filtered)

    def _render_tasks(self, tasks):
        # Clear all columns
        for col_id in self.col_inner:
            for w in self.col_inner[col_id].winfo_children():
                w.destroy()

        counts = {col: 0 for col in self.col_inner}

        for task in tasks:
            status = task.get("status", "todo")
            if status not in self.col_inner:
                status = "todo"
            counts[status] += 1
            self._render_task_card(task, status)

        for col_id, count in counts.items():
            self.col_count_labels[col_id].config(text=str(count))

    def _render_task_card(self, task, col_id):
        parent = self.col_inner[col_id]
        pcolor = PRIORITY_COLORS.get(task.get("priority", "low"), "#6b7280")

        card = tk.Frame(parent, bg="white", relief="solid", bd=1, padx=10, pady=8)
        card.pack(fill="x", padx=6, pady=4)

        # Priority dot + title
        title_row = tk.Frame(card, bg="white")
        title_row.pack(fill="x")
        tk.Label(title_row, text="●", bg="white", fg=pcolor,
                 font=("Segoe UI", 8)).pack(side="left")
        tk.Label(title_row, text=f"  {task.get('priority', 'low').upper()}",
                 bg="white", fg=pcolor, font=("Segoe UI", 7, "bold")).pack(side="left")

        # Action buttons
        btn_f = tk.Frame(card, bg="white")
        btn_f.pack(fill="x")
        tk.Button(btn_f, text="✎", command=lambda t=task: self._edit_task(t),
                  bg="white", fg="#3b82f6", relief="flat", font=("Segoe UI", 10),
                  cursor="hand2", padx=0).pack(side="right")
        tk.Button(btn_f, text="✕", command=lambda t=task: self._delete_task(t),
                  bg="white", fg="#ef4444", relief="flat", font=("Segoe UI", 10),
                  cursor="hand2", padx=0).pack(side="right")

        # Title
        title_text = task.get("title", "")
        tk.Label(card, text=title_text, bg="white", fg="#111827",
                 font=("Segoe UI", 10, "bold"), wraplength=200, justify="left",
                 anchor="w").pack(fill="x", pady=(2, 0))

        # Description (short)
        desc = task.get("description", "") or ""
        if desc:
            tk.Label(card, text=desc[:80] + ("…" if len(desc) > 80 else ""),
                     bg="white", fg="#6b7280", font=("Segoe UI", 8),
                     wraplength=200, justify="left", anchor="w").pack(fill="x")

        # Footer: assignee + due date
        footer = tk.Frame(card, bg="#f8fafc")
        footer.pack(fill="x", pady=(6, 0))
        assignee = task.get("assignee") or ""
        if assignee:
            initials = assignee[:2].upper()
            tk.Label(footer, text=f"👤 {assignee[:20]}", bg="#f8fafc", fg="#374151",
                     font=("Segoe UI", 8)).pack(side="left")

        due = task.get("dueDate") or ""
        if due:
            due_short = due[:10]
            try:
                due_dt = datetime.strptime(due_short, "%Y-%m-%d").date()
                is_overdue = due_dt < date.today() and col_id != "done"
                due_color = "#ef4444" if is_overdue else "#6b7280"
                due_label = f"📅 {due_short}" + (" ⚠" if is_overdue else "")
            except Exception:
                due_color, due_label = "#6b7280", f"📅 {due_short}"
            tk.Label(footer, text=due_label, bg="#f8fafc", fg=due_color,
                     font=("Segoe UI", 8)).pack(side="right")

        # Quick-status buttons
        status_row = tk.Frame(card, bg="white")
        status_row.pack(fill="x", pady=(6, 0))
        tk.Label(status_row, text="Move to:", bg="white", fg="#9ca3af",
                 font=("Segoe UI", 7)).pack(side="left")
        for sid, slabel in [("todo", "Todo"), ("in_progress", "Active"), ("review", "Review"), ("done", "Done")]:
            if sid == col_id:
                continue
            sc = STATUS_COLORS.get(sid, "#6b7280")
            tk.Button(status_row, text=slabel,
                      command=lambda t=task, s=sid: self._quick_status(t, s),
                      bg=sc, fg="white", relief="flat", font=("Segoe UI", 7),
                      padx=4, pady=1, cursor="hand2").pack(side="left", padx=2)

    def _quick_status(self, task, new_status):
        if not self.api:
            return
        def worker():
            try:
                self.api.update_task(task["id"], {"status": new_status})
                self.after(0, self._load_tasks)
            except Exception as e:
                self.after(0, lambda: self._on_error(str(e)))
        threading.Thread(target=worker, daemon=True).start()

    def _new_task(self):
        dlg = TaskDialog(self, "Create New Task", self.projects, self.users,
                          default_project_id=self.selected_project_id)
        if dlg.result:
            def worker():
                try:
                    self.api.create_task(dlg.result)
                    self.after(0, self._load_tasks)
                except Exception as e:
                    self.after(0, lambda: self._on_error(str(e)))
            threading.Thread(target=worker, daemon=True).start()

    def _edit_task(self, task):
        dlg = TaskDialog(self, f"Edit Task: {task.get('title', '')[:40]}",
                          self.projects, self.users, task=task)
        if dlg.result:
            def worker():
                try:
                    self.api.update_task(task["id"], dlg.result)
                    self.after(0, self._load_tasks)
                except Exception as e:
                    self.after(0, lambda: self._on_error(str(e)))
            threading.Thread(target=worker, daemon=True).start()

    def _delete_task(self, task):
        if not messagebox.askyesno("Confirm Delete",
                                    f"Delete task:\n'{task.get('title', '')}'?", parent=self):
            return
        def worker():
            try:
                self.api.delete_task(task["id"])
                self.after(0, self._load_tasks)
            except Exception as e:
                self.after(0, lambda: self._on_error(str(e)))
        threading.Thread(target=worker, daemon=True).start()

    def _on_error(self, msg):
        self.status_bar_var.set(f"Error: {msg[:80]}")
        # Only show popup for connection errors, not every refresh error
        if "Connection" in msg or "Max retries" in msg:
            messagebox.showerror("Connection Error",
                f"Could not connect to FlowMatriX API.\n\n{msg}\n\n"
                "Go to Settings and verify the API URL.", parent=self)


if __name__ == "__main__":
    if not REQUESTS_OK:
        import subprocess
        print("Installing 'requests' library…")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
        import requests
        REQUESTS_OK = True

    app = FlowMatriXApp()
    app.mainloop()
