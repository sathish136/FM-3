"""
FlowMatriX Activity Agent  v6.0
================================
Opens the FlowMatriX Employee Dashboard in a NATIVE app window (not the browser).
The heartbeat & activity monitor run silently in the background.

SETUP (run once):
    pip install requests psutil pywebview

    Windows extra (for WebView2):
        pip install pywebview[winforms]
        -- or --
        The app will use Microsoft Edge WebView2 automatically if Edge is installed.

RUN:
    python flowmatrix_activity_agent.py

PACKAGE AS EXE (Windows, single file, no console):
    pip install pyinstaller
    pyinstaller --onefile --noconsole --name FlowMatrixAgent flowmatrix_activity_agent.py
"""

import sys, time, socket, platform, getpass, os, threading, logging, urllib.parse
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL        = "https://766e4ea0-5b9e-488a-ad69-f3453d798d6d-00-3m118gokkcn7o.pike.replit.dev"
API_URL         = f"{BASE_URL}/api"
EMP_AGENT_PATH  = "/pm-app/emp-agent"

DEVICE_USERNAME = "AUTO"   # set to your Windows username if auto-detect fails
HEARTBEAT_SEC   = 30
IDLE_THRESHOLD  = 300      # seconds before marked idle

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
# Background Agent  (heartbeat only — no GUI dependency)
# ─────────────────────────────────────────────────────────────────────────────

class BackgroundAgent:
    """Sends heartbeats silently in background threads."""

    def __init__(self, username: str):
        self.username  = username
        self._running  = True
        self._session  = None
        self._hb_count = 0

    def start(self):
        threading.Thread(target=self._init_session, daemon=True).start()

    def stop(self):
        self._running = False

    def _init_session(self):
        try:
            import requests
        except ImportError:
            log.error("requests not installed — run: pip install requests psutil pywebview")
            return
        self._session = requests.Session()
        self._session.headers.update({
            "Content-Type": "application/json",
            "User-Agent":   "FlowMatriX-Agent/6.0",
        })
        # Start heartbeat loop
        threading.Thread(target=self._hb_loop, daemon=True).start()
        log.info("Agent started for user: %s", self.username)

    def _hb_loop(self):
        while self._running:
            self._heartbeat()
            time.sleep(HEARTBEAT_SEC)

    def _heartbeat(self):
        app, win = get_active_window()
        idle     = get_idle_seconds()
        active   = idle < IDLE_THRESHOLD
        try:
            r = self._session.post(
                f"{API_URL}/activity/heartbeat",
                timeout=10,
                json={
                    "deviceUsername": self.username,
                    "activeApp":      app,
                    "windowTitle":    win[:250],
                    "isActive":       active,
                    "idleSeconds":    int(idle),
                    "deviceName":     socket.gethostname(),
                },
            )
            if r.ok:
                self._hb_count += 1
                log.debug("Heartbeat #%d — app=%s idle=%ds", self._hb_count, app, int(idle))
            else:
                log.warning("Heartbeat failed: %s", r.status_code)
        except Exception as e:
            log.warning("Heartbeat error: %s", e)


# ─────────────────────────────────────────────────────────────────────────────
# Main — embed the dashboard in a native window via pywebview
# ─────────────────────────────────────────────────────────────────────────────

def main():
    username = detect_username()
    log.info("Detected user: %s  |  Platform: %s", username, PLATFORM)

    # Build the URL with the username query param
    dashboard_url = (
        f"{BASE_URL}{EMP_AGENT_PATH}"
        f"?username={urllib.parse.quote(username)}"
    )
    log.info("Dashboard URL: %s", dashboard_url)

    # Start background heartbeat agent
    agent = BackgroundAgent(username)
    agent.start()

    # Launch native window via pywebview
    try:
        import webview
    except ImportError:
        # Fallback: open in system browser if pywebview not installed
        log.warning("pywebview not installed. Falling back to system browser.")
        log.warning("Install with: pip install pywebview")
        import webbrowser
        webbrowser.open(dashboard_url)
        # Keep agent alive
        try:
            while True:
                time.sleep(60)
        except KeyboardInterrupt:
            pass
        agent.stop()
        return

    # Create the pywebview window — this IS the app, no external browser
    window = webview.create_window(
        title      = "FlowMatriX · Activity Agent",
        url        = dashboard_url,
        width      = 1280,
        height     = 800,
        min_size   = (900, 600),
        background_color = "#0D0B1A",
        confirm_close    = False,
    )

    def on_closed():
        log.info("Window closed — stopping agent.")
        agent.stop()

    window.events.closed += on_closed

    # Start — blocks until the window is closed
    webview.start(
        debug  = False,          # set True to get DevTools
        # private_mode keeps cookies/sessions per-run (no browser history)
        private_mode = False,
    )
    agent.stop()


if __name__ == "__main__":
    main()
