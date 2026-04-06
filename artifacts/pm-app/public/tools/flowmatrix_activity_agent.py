"""
FlowMatriX Activity Agent
=========================
Runs silently in the background on Windows/Mac/Linux.
Sends a heartbeat to FlowMatriX every 30 seconds with:
  - Current active application + window title
  - Idle time (seconds since last mouse/keyboard input)
  - Device hostname

SETUP (run once):
    pip install requests psutil pygetwindow

CONFIGURE below then run:
    python flowmatrix_activity_agent.py

To run at Windows startup:
    Place a shortcut to this script in:
    C:\\Users\\<YourName>\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup
"""

import sys
import time
import socket
import logging
import platform

# ─────────────────────────────────────────────────────────────────
# CONFIGURE THESE BEFORE RUNNING
# ─────────────────────────────────────────────────────────────────
API_URL       = "https://225c2066-465f-4f25-be56-82d920826ba6-00-l4ly2mlawd6s.sisko.replit.dev/api"
USER_EMAIL    = "your.email@company.com"      # e.g. john.doe@wtt.com
USER_FULLNAME = "Your Full Name"              # e.g. John Doe
DEPARTMENT    = "Engineering"                 # e.g. Engineering / HR / Procurement
HEARTBEAT_SEC = 30                            # How often to send (seconds)
IDLE_THRESHOLD = 300                          # Seconds of no input = idle (5 min)
# ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("flowmatrix-agent")

PLATFORM = platform.system()  # "Windows" | "Darwin" | "Linux"


def get_idle_seconds() -> float:
    """Return seconds since last mouse/keyboard input."""
    try:
        if PLATFORM == "Windows":
            import ctypes

            class _LASTINPUTINFO(ctypes.Structure):
                _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_ulong)]

            lii = _LASTINPUTINFO()
            lii.cbSize = ctypes.sizeof(_LASTINPUTINFO)
            ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii))
            millis = ctypes.windll.kernel32.GetTickCount() - lii.dwTime
            return max(0.0, millis / 1000.0)

        elif PLATFORM == "Darwin":
            import subprocess
            out = subprocess.check_output(
                ["ioreg", "-c", "IOHIDSystem"], stderr=subprocess.DEVNULL
            ).decode()
            for line in out.split("\n"):
                if "HIDIdleTime" in line:
                    ns = int(line.split("=")[-1].strip())
                    return ns / 1_000_000_000
    except Exception:
        pass
    return 0.0


def get_active_window() -> tuple[str, str]:
    """Return (app_name, window_title)."""
    try:
        if PLATFORM == "Windows":
            import ctypes
            import ctypes.wintypes as wintypes

            buf = ctypes.create_unicode_buffer(512)
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            ctypes.windll.user32.GetWindowTextW(hwnd, buf, 512)
            title = buf.value or ""

            # Try to get the process name via psutil
            try:
                import ctypes as ct
                pid = wintypes.DWORD()
                ct.windll.user32.GetWindowThreadProcessId(hwnd, ct.byref(pid))
                import psutil
                proc = psutil.Process(pid.value)
                app = proc.name().replace(".exe", "").replace(".EXE", "")
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
            try:
                wid = subprocess.check_output(
                    ["xdotool", "getactivewindow"], stderr=subprocess.DEVNULL
                ).strip().decode()
                title = subprocess.check_output(
                    ["xdotool", "getwindowname", wid], stderr=subprocess.DEVNULL
                ).strip().decode()
                app = title.split(" — ")[-1] if " — " in title else title.split(" - ")[-1] if " - " in title else title
                return app[:60], title
            except Exception:
                pass

    except Exception as exc:
        log.debug("get_active_window error: %s", exc)

    return "Unknown", "Unknown"


def send_heartbeat(session) -> bool:
    app, title = get_active_window()
    idle_secs = get_idle_seconds()
    is_active = idle_secs < IDLE_THRESHOLD

    payload = {
        "email":       USER_EMAIL,
        "fullName":    USER_FULLNAME,
        "department":  DEPARTMENT,
        "activeApp":   app,
        "windowTitle": title[:250],
        "isActive":    is_active,
        "idleSeconds": int(idle_secs),
        "deviceName":  socket.gethostname(),
    }

    try:
        r = session.post(f"{API_URL}/activity/heartbeat", json=payload, timeout=10)
        if r.status_code == 200:
            status = "active" if is_active else f"idle {int(idle_secs // 60)}m"
            log.info("OK  [%s]  %s — %s", status, app, title[:60])
            return True
        else:
            log.warning("Server returned %d: %s", r.status_code, r.text[:120])
    except Exception as exc:
        log.warning("Send failed: %s", exc)
    return False


def main():
    log.info("FlowMatriX Activity Agent starting…")
    log.info("  User    : %s (%s)", USER_FULLNAME, USER_EMAIL)
    log.info("  API URL : %s", API_URL)
    log.info("  Platform: %s | Host: %s", PLATFORM, socket.gethostname())
    log.info("  Heartbeat every %ds, idle threshold %ds", HEARTBEAT_SEC, IDLE_THRESHOLD)

    try:
        import requests
    except ImportError:
        log.error("'requests' not installed. Run:  pip install requests psutil")
        sys.exit(1)

    if USER_EMAIL == "your.email@company.com":
        log.error("Please set USER_EMAIL and USER_FULLNAME at the top of this script before running.")
        sys.exit(1)

    session = requests.Session()
    session.headers.update({"Content-Type": "application/json", "User-Agent": "FlowMatriX-Agent/1.0"})

    while True:
        try:
            send_heartbeat(session)
        except Exception as exc:
            log.error("Unexpected error: %s", exc)
        time.sleep(HEARTBEAT_SEC)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Agent stopped by user.")
