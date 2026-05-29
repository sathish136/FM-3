#!/usr/bin/env python3
"""
FlowMatrix Remote Access Agent
================================
Run on an IPC Windows machine to enable remote viewing and control via FlowMatrix.

Usage:
    python agent.py --server wss://your-flowmatrix-domain.com --token ra-<your-token>

Options:
    --server   FlowMatrix server URL (e.g. wss://flowmatrix.example.com)
    --token    Machine token issued from FlowMatrix Remote Access settings
    --fps      Frames per second to stream (default: 15, max: 30)
    --quality  JPEG quality 1-95 (default: 60)
    --monitor  Monitor index to capture (default: 1 = primary)
    --help     Show this help message
"""

import asyncio
import argparse
import io
import json
import logging
import sys
import time
from urllib.parse import urlparse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("remote-agent")

# ── Dependency checks ──────────────────────────────────────────────────────────

try:
    import websockets
    import websockets.exceptions
except ImportError:
    log.error("Missing: websockets — run: pip install websockets")
    sys.exit(1)

try:
    import mss
except ImportError:
    log.error("Missing: mss — run: pip install mss")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    log.error("Missing: Pillow — run: pip install pillow")
    sys.exit(1)

try:
    import pyautogui
    pyautogui.FAILSAFE = False
    pyautogui.PAUSE = 0
except ImportError:
    log.error("Missing: pyautogui — run: pip install pyautogui")
    sys.exit(1)

try:
    import pyperclip
    _HAS_CLIPBOARD = True
except ImportError:
    log.warning("pyperclip not installed — clipboard sync disabled. Run: pip install pyperclip")
    _HAS_CLIPBOARD = False

# ── Key / button maps ──────────────────────────────────────────────────────────

PYAUTOGUI_KEY_MAP = {
    "Enter": "return", "Backspace": "backspace", "Delete": "delete",
    "Tab": "tab", "Escape": "escape",
    "ArrowLeft": "left", "ArrowRight": "right", "ArrowUp": "up", "ArrowDown": "down",
    "Home": "home", "End": "end", "PageUp": "pageup", "PageDown": "pagedown",
    "F1": "f1",  "F2": "f2",  "F3": "f3",  "F4": "f4",
    "F5": "f5",  "F6": "f6",  "F7": "f7",  "F8": "f8",
    "F9": "f9",  "F10": "f10","F11": "f11","F12": "f12",
    "Control": "ctrl", "Alt": "alt", "Shift": "shift",
    "Meta": "winleft", "CapsLock": "capslock",
    "Insert": "insert", "PrintScreen": "printscreen",
    " ": "space",
}

MOUSE_BUTTON_MAP = {0: "left", 1: "middle", 2: "right"}

# ── URL builder ────────────────────────────────────────────────────────────────

def get_ws_url(server: str, token: str) -> str:
    server = server.strip().rstrip("/")
    if not server.startswith(("ws://", "wss://")):
        server = "wss://" + server
    parsed = urlparse(server)
    base = f"{parsed.scheme}://{parsed.netloc}"
    return f"{base}/api/remote-ws?role=agent&token={token}"

# ── Screen capture & streaming ─────────────────────────────────────────────────

async def capture_and_send(ws, monitor: dict, fps: int, quality: int):
    """Capture screen and send raw JPEG binary frames at target FPS."""
    interval = 1.0 / fps
    # Use MSS (new API, no deprecation warning)
    with mss.MSS() as sct:
        while True:
            t0 = time.monotonic()
            try:
                shot = sct.grab(monitor)
                img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=quality, optimize=False, subsampling=2)
                # Send raw binary JPEG — much faster than base64 JSON
                await ws.send(buf.getvalue())
            except websockets.exceptions.ConnectionClosed:
                raise
            except Exception as e:
                log.warning(f"Capture error: {e}")

            elapsed = time.monotonic() - t0
            wait = interval - elapsed
            if wait > 0:
                await asyncio.sleep(wait)

# ── Input handling ─────────────────────────────────────────────────────────────

async def handle_message(ws, raw: str):
    """Execute input events received from the viewer."""
    try:
        msg = json.loads(raw)
        t = msg.get("type")

        if t == "mousemove":
            pyautogui.moveTo(msg["x"], msg["y"])

        elif t == "mousedown":
            btn = MOUSE_BUTTON_MAP.get(msg.get("button", 0), "left")
            pyautogui.mouseDown(msg["x"], msg["y"], button=btn)

        elif t == "mouseup":
            btn = MOUSE_BUTTON_MAP.get(msg.get("button", 0), "left")
            pyautogui.mouseUp(msg["x"], msg["y"], button=btn)

        elif t == "scroll":
            dy = msg.get("dy", 0)
            clicks = -1 if dy > 0 else 1
            pyautogui.scroll(clicks, x=msg.get("x", 0), y=msg.get("y", 0))

        elif t == "keydown":
            key = msg.get("key", "")
            modifiers = msg.get("modifiers", {})
            mapped = PYAUTOGUI_KEY_MAP.get(key, key.lower() if len(key) == 1 else None)
            if not mapped:
                return
            hotkeys = []
            if modifiers.get("ctrl"):  hotkeys.append("ctrl")
            if modifiers.get("alt"):   hotkeys.append("alt")
            if modifiers.get("shift"): hotkeys.append("shift")
            if hotkeys:
                pyautogui.hotkey(*hotkeys, mapped)
            else:
                pyautogui.keyDown(mapped)

        elif t == "keyup":
            key = msg.get("key", "")
            mapped = PYAUTOGUI_KEY_MAP.get(key, key.lower() if len(key) == 1 else None)
            if mapped:
                pyautogui.keyUp(mapped)

        elif t == "clipboard_read":
            # Viewer wants to read the remote clipboard
            if _HAS_CLIPBOARD:
                try:
                    text = pyperclip.paste() or ""
                except Exception:
                    text = ""
            else:
                text = ""
            await ws.send(json.dumps({"type": "clipboard_data", "text": text}))

        elif t == "clipboard_write":
            # Viewer is pasting local clipboard to the remote machine
            text = msg.get("text", "")
            if text and _HAS_CLIPBOARD:
                try:
                    pyperclip.copy(text)
                    pyautogui.hotkey("ctrl", "v")
                except Exception as e:
                    log.warning(f"Clipboard write error: {e}")

        elif t == "viewer_joined":
            log.info(f"Viewer connected: {msg.get('userEmail', 'unknown')}")

        elif t == "viewer_left":
            log.info(f"Viewer disconnected. Active viewers: {msg.get('remaining', 0)}")

    except Exception as e:
        log.warning(f"handle_message error: {e}")

# ── Main agent loop ────────────────────────────────────────────────────────────

async def run_agent(server_url: str, fps: int, quality: int, monitor_idx: int):
    log.info(f"Connecting to {server_url}")
    backoff = 2

    while True:
        try:
            async with websockets.connect(
                server_url,
                ping_interval=20,
                ping_timeout=30,
                max_size=None,
            ) as ws:
                backoff = 2
                log.info("Connected — waiting for auth...")

                auth_raw = await asyncio.wait_for(ws.recv(), timeout=10)
                auth = json.loads(auth_raw)

                if auth.get("type") == "error":
                    log.error(f"Auth failed: {auth.get('message')}")
                    return

                if auth.get("type") == "auth_ok":
                    log.info(f"Authenticated as: {auth.get('name')} (ID: {auth.get('machineId')})")

                # Pick monitor
                with mss.MSS() as sct:
                    monitors = sct.monitors
                    idx = monitor_idx if monitor_idx < len(monitors) else 1
                    monitor = monitors[idx]

                log.info(
                    f"Streaming monitor {idx}: {monitor['width']}x{monitor['height']} "
                    f"@ {fps}fps  quality={quality}"
                    + ("  clipboard=ON" if _HAS_CLIPBOARD else "  clipboard=OFF (install pyperclip)")
                )

                capture_task = asyncio.create_task(
                    capture_and_send(ws, monitor, fps, quality)
                )
                try:
                    async for message in ws:
                        if isinstance(message, str):
                            await handle_message(ws, message)
                        # binary messages from server are ignored (server sends none)
                finally:
                    capture_task.cancel()
                    try:
                        await capture_task
                    except asyncio.CancelledError:
                        pass

        except websockets.exceptions.ConnectionClosed as e:
            log.warning(f"Connection closed: {e}. Retry in {backoff}s...")
        except OSError as e:
            log.warning(f"Network error: {e}. Retry in {backoff}s...")
        except asyncio.TimeoutError:
            log.warning(f"Auth timeout. Retry in {backoff}s...")
        except asyncio.CancelledError:
            log.info("Agent cancelled.")
            return
        except Exception as e:
            log.error(f"Unexpected error: {e}. Retry in {backoff}s...")

        try:
            await asyncio.sleep(backoff)
        except asyncio.CancelledError:
            return
        backoff = min(backoff * 2, 60)


def main():
    parser = argparse.ArgumentParser(
        description="FlowMatrix Remote Access Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--server",  required=True, help="FlowMatrix server URL (wss://...)")
    parser.add_argument("--token",   required=True, help="Machine token from FlowMatrix")
    parser.add_argument("--fps",     type=int, default=15, help="Frames per second 1-30 (default: 15)")
    parser.add_argument("--quality", type=int, default=60, help="JPEG quality 1-95 (default: 60)")
    parser.add_argument("--monitor", type=int, default=1,  help="Monitor index (default: 1 = primary)")
    args = parser.parse_args()

    fps     = max(1, min(30, args.fps))
    quality = max(1, min(95, args.quality))
    ws_url  = get_ws_url(args.server, args.token)

    try:
        # asyncio.run handles loop lifecycle and clean Ctrl+C on all platforms
        asyncio.run(run_agent(ws_url, fps, quality, args.monitor))
    except KeyboardInterrupt:
        pass
    log.info("Agent stopped.")


if __name__ == "__main__":
    main()
