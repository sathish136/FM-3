"""
FlowMatriX Activity Agent
=========================
Runs silently in the background on Windows/Mac/Linux.
Automatically detects your Windows/system username and matches it to your
ERPNext employee profile — no manual configuration needed.

Sends a heartbeat to FlowMatriX every 30 seconds with:
  - Your device username (auto-detected)
  - Current active application + window title
  - Idle time (seconds since last mouse/keyboard input)
  - Device hostname

SETUP (run once):
    pip install requests psutil

CONFIGURATION:
  - API_URL: Set this to your FlowMatriX server URL.
      Use the deployed (published) URL for permanent use — e.g.:
          https://flowmatrix-yourcompany.replit.app/api
      For testing on dev, use the current Replit dev URL.

  - DEVICE_USERNAME:
      Leave as "AUTO" to auto-detect from your Windows login name.
      If your Windows username does NOT match your WTT employee ID
      (e.g. username is "IT" but your ERP ID is "WTT1194"),
      set it manually: DEVICE_USERNAME = "WTT1194"

To run at Windows startup:
    Place a shortcut to this script in:
    C:\\Users\\<YourName>\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup
"""

import sys
import time
import socket
import logging
import platform
import getpass
import os

# ─────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────
#
# API_URL: Point this to your deployed FlowMatriX server.
#   PRODUCTION (use this once the app is deployed/published):
#       API_URL = "https://flowmatrix-yourcompany.replit.app/api"
#   DEVELOPMENT (temporary — this URL changes every Replit session):
API_URL         = "https://06515121-4ed5-426e-b553-3c1b183b238b-00-2vxxyxljjpr80.pike.replit.dev/api"
#
# DEVICE_USERNAME: Your WTT employee ID (e.g. "WTT1194").
#   "AUTO" = use your Windows login name (works if it matches your WTT ID).
#   Set manually if your Windows username differs from your ERP employee ID.
DEVICE_USERNAME = "AUTO"
#
HEARTBEAT_SEC   = 30          # How often to send (seconds)
IDLE_THRESHOLD  = 300         # Seconds of no input = idle (5 min)
# ─────────────────────────────────────────────────────────────────


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("flowmatrix-agent")

PLATFORM = platform.system()  # "Windows" | "Darwin" | "Linux"


def detect_username() -> str:
    """Auto-detect the current logged-in username."""
    if DEVICE_USERNAME != "AUTO":
        return DEVICE_USERNAME

    # Try Windows-specific methods first for domain/AD usernames
    if PLATFORM == "Windows":
        try:
            import ctypes
            buf = ctypes.create_unicode_buffer(256)
            size = ctypes.c_ulong(256)
            if ctypes.windll.secur32.GetUserNameExW(2, buf, ctypes.byref(size)):
                # Returns DOMAIN\\username or UPN — extract the short username
                val = buf.value
                if "\\" in val:
                    return val.split("\\")[-1]
                if "@" in val:
                    return val.split("@")[0]
                return val
        except Exception:
            pass

    # Fallback: standard Python method
    try:
        name = getpass.getuser()
        return name
    except Exception:
        pass

    # Last resort: environment variables
    return (
        os.environ.get("USERNAME")
        or os.environ.get("USER")
        or os.environ.get("LOGNAME")
        or socket.gethostname()
    )


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


def get_active_window() -> tuple:
    """Return (app_name, window_title)."""
    try:
        if PLATFORM == "Windows":
            import ctypes
            import ctypes.wintypes as wintypes

            buf = ctypes.create_unicode_buffer(512)
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            ctypes.windll.user32.GetWindowTextW(hwnd, buf, 512)
            title = buf.value or ""

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


def send_heartbeat(session, device_username: str) -> bool:
    app, title = get_active_window()
    idle_secs = get_idle_seconds()
    is_active = idle_secs < IDLE_THRESHOLD

    payload = {
        "deviceUsername": device_username,
        "activeApp":      app,
        "windowTitle":    title[:250],
        "isActive":       is_active,
        "idleSeconds":    int(idle_secs),
        "deviceName":     socket.gethostname(),
    }

    try:
        r = session.post(f"{API_URL}/activity/heartbeat", json=payload, timeout=10)
        if r.status_code == 200:
            data = r.json()
            resolved = data.get("resolvedName", device_username)
            dept = data.get("resolvedDept", "")
            desig = data.get("resolvedDesignation", "")
            status_str = "active" if is_active else f"idle {int(idle_secs // 60)}m"
            info = f"{resolved}"
            if desig: info += f" | {desig}"
            if dept: info += f" | {dept}"
            log.info("OK  [%s]  %s  →  %s — %s", status_str, info, app, title[:50])
            return True
        else:
            log.warning("Server returned %d: %s", r.status_code, r.text[:120])
    except Exception as exc:
        log.warning("Send failed: %s", exc)
    return False


def main():
    device_username = detect_username()

    log.info("FlowMatriX Activity Agent starting…")
    log.info("  Device Username : %s  (will be matched to ERPNext)", device_username)
    log.info("  API URL         : %s", API_URL)
    log.info("  Platform        : %s | Host: %s", PLATFORM, socket.gethostname())
    log.info("  Heartbeat every %ds, idle threshold %ds", HEARTBEAT_SEC, IDLE_THRESHOLD)
    log.info("")
    log.info("  The server will automatically look up your ERPNext employee")
    log.info("  profile using your device username — no manual setup needed.")

    try:
        import requests
    except ImportError:
        log.error("'requests' not installed. Run:  pip install requests psutil")
        sys.exit(1)

    session = requests.Session()
    session.headers.update({"Content-Type": "application/json", "User-Agent": "FlowMatriX-Agent/2.0"})

    while True:
        try:
            send_heartbeat(session, device_username)
        except Exception as exc:
            log.error("Unexpected error: %s", exc)
        time.sleep(HEARTBEAT_SEC)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Agent stopped by user.")
