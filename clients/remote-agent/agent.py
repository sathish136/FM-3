#!/usr/bin/env python3
"""
FlowMatrix Remote Access Agent
================================
Run on an IPC Windows machine to enable remote viewing and control via FlowMatrix.

Usage:
    python agent.py --server wss://your-flowmatrix-domain.com --token ra-<your-token>

Options:
    --server   WebSocket server URL  (e.g. wss://flowmatrix.example.com)
    --token    Machine token issued from FlowMatrix Remote Access settings
    --fps      Frames per second to stream (default: 10, max: 30)
    --quality  JPEG quality 1-95 (default: 60)
    --monitor  Monitor index to capture (default: 1 = primary)
    --help     Show this help message
"""

import asyncio
import argparse
import base64
import io
import json
import logging
import signal
import sys
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("remote-agent")

try:
    import websockets
except ImportError:
    log.error("Missing dependency: websockets. Run: pip install websockets")
    sys.exit(1)

try:
    import mss
    import mss.tools
except ImportError:
    log.error("Missing dependency: mss. Run: pip install mss")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    log.error("Missing dependency: Pillow. Run: pip install pillow")
    sys.exit(1)

try:
    import pyautogui
    pyautogui.FAILSAFE = False
    pyautogui.PAUSE = 0
except ImportError:
    log.error("Missing dependency: pyautogui. Run: pip install pyautogui")
    sys.exit(1)


PYAUTOGUI_KEY_MAP = {
    "Enter": "return",
    "Backspace": "backspace",
    "Delete": "delete",
    "Tab": "tab",
    "Escape": "escape",
    "ArrowLeft": "left",
    "ArrowRight": "right",
    "ArrowUp": "up",
    "ArrowDown": "down",
    "Home": "home",
    "End": "end",
    "PageUp": "pageup",
    "PageDown": "pagedown",
    "F1": "f1", "F2": "f2", "F3": "f3", "F4": "f4",
    "F5": "f5", "F6": "f6", "F7": "f7", "F8": "f8",
    "F9": "f9", "F10": "f10", "F11": "f11", "F12": "f12",
    "Control": "ctrl", "Alt": "alt", "Shift": "shift",
    "Meta": "winleft", "CapsLock": "capslock",
    "Insert": "insert", "PrintScreen": "printscreen",
    " ": "space",
}

MOUSE_BUTTON_MAP = {0: "left", 1: "middle", 2: "right"}


def get_ws_url(server: str, token: str) -> str:
    server = server.strip().rstrip("/")
    if not server.startswith(("ws://", "wss://")):
        server = "wss://" + server
    # Keep only scheme + host (strip any path the user may have included)
    from urllib.parse import urlparse
    parsed = urlparse(server)
    base = f"{parsed.scheme}://{parsed.netloc}"
    return f"{base}/api/remote-ws?role=agent&token={token}"


async def capture_and_send(ws, sct, monitor, fps: int, quality: int):
    interval = 1.0 / fps
    while True:
        t0 = time.monotonic()
        try:
            screenshot = sct.grab(monitor)
            img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=quality, optimize=False)
            frame_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
            await ws.send(json.dumps({
                "type": "frame",
                "data": frame_b64,
                "ping_ts": int(time.time() * 1000),
                "w": screenshot.width,
                "h": screenshot.height,
            }))
        except websockets.exceptions.ConnectionClosed:
            raise
        except Exception as e:
            log.warning(f"Capture error: {e}")

        elapsed = time.monotonic() - t0
        sleep = interval - elapsed
        if sleep > 0:
            await asyncio.sleep(sleep)


async def handle_input(message: str):
    try:
        msg = json.loads(message)
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
            x, y = msg.get("x", 0), msg.get("y", 0)
            dy = msg.get("dy", 0)
            clicks = -1 if dy > 0 else 1
            pyautogui.scroll(clicks, x=x, y=y)

        elif t == "keydown":
            key = msg.get("key", "")
            modifiers = msg.get("modifiers", {})
            mapped = PYAUTOGUI_KEY_MAP.get(key, key.lower() if len(key) == 1 else None)
            if not mapped:
                return
            keys_to_press = []
            if modifiers.get("ctrl"):
                keys_to_press.append("ctrl")
            if modifiers.get("alt"):
                keys_to_press.append("alt")
            if modifiers.get("shift"):
                keys_to_press.append("shift")
            if len(keys_to_press) > 0:
                pyautogui.hotkey(*keys_to_press, mapped)
            else:
                pyautogui.keyDown(mapped)

        elif t == "keyup":
            key = msg.get("key", "")
            mapped = PYAUTOGUI_KEY_MAP.get(key, key.lower() if len(key) == 1 else None)
            if mapped:
                pyautogui.keyUp(mapped)

        elif t == "viewer_joined":
            log.info(f"Viewer connected: {msg.get('userEmail', 'unknown')}")

        elif t == "viewer_left":
            remaining = msg.get("remaining", 0)
            log.info(f"Viewer disconnected. Active viewers: {remaining}")

        elif t == "ping":
            pass

    except Exception as e:
        log.warning(f"Input handling error: {e}")


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
                log.info("WebSocket connected, waiting for auth...")

                auth_msg = await asyncio.wait_for(ws.recv(), timeout=10)
                auth = json.loads(auth_msg)

                if auth.get("type") == "error":
                    log.error(f"Auth failed: {auth.get('message')}")
                    return

                if auth.get("type") == "auth_ok":
                    machine_id = auth.get("machineId")
                    name = auth.get("name", "Unknown")
                    log.info(f"Authenticated! Machine: {name} (ID: {machine_id})")

                with mss.mss() as sct:
                    monitors = sct.monitors
                    if monitor_idx >= len(monitors):
                        monitor_idx = 1
                    monitor = monitors[monitor_idx]
                    log.info(
                        f"Streaming monitor {monitor_idx}: "
                        f"{monitor['width']}x{monitor['height']} at {fps}fps, quality={quality}"
                    )

                    capture_task = asyncio.create_task(
                        capture_and_send(ws, sct, monitor, fps, quality)
                    )

                    try:
                        async for message in ws:
                            if isinstance(message, str):
                                await handle_input(message)
                    finally:
                        capture_task.cancel()
                        try:
                            await capture_task
                        except asyncio.CancelledError:
                            pass

        except websockets.exceptions.ConnectionClosed as e:
            log.warning(f"Connection closed: {e}. Reconnecting in {backoff}s...")
        except OSError as e:
            log.warning(f"Connection error: {e}. Reconnecting in {backoff}s...")
        except asyncio.TimeoutError:
            log.warning(f"Connection timeout. Reconnecting in {backoff}s...")
        except Exception as e:
            log.error(f"Unexpected error: {e}. Reconnecting in {backoff}s...")

        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, 60)


def main():
    parser = argparse.ArgumentParser(
        description="FlowMatrix Remote Access Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--server", required=True, help="FlowMatrix server URL (wss://...)")
    parser.add_argument("--token", required=True, help="Machine token from FlowMatrix")
    parser.add_argument("--fps", type=int, default=10, help="Frames per second (default: 10)")
    parser.add_argument("--quality", type=int, default=60, help="JPEG quality 1-95 (default: 60)")
    parser.add_argument("--monitor", type=int, default=1, help="Monitor index (default: 1 = primary)")
    args = parser.parse_args()

    fps = max(1, min(30, args.fps))
    quality = max(1, min(95, args.quality))

    ws_url = get_ws_url(args.server, args.token)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    def shutdown(sig, frame):
        log.info("Shutting down agent...")
        loop.stop()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        loop.run_until_complete(run_agent(ws_url, fps, quality, args.monitor))
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        loop.close()
        log.info("Agent stopped.")


if __name__ == "__main__":
    main()
