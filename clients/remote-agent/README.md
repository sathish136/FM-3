# FlowMatrix Remote Access Agent

A lightweight Python agent that runs on IPC Windows machines to enable remote viewing and control via FlowMatrix.

## Requirements

- Python 3.9+
- Windows OS (for screen capture and input injection)

## Installation

```bash
pip install -r requirements.txt
```

Or install dependencies individually:

```bash
pip install websockets mss pillow pyautogui
```

## Setup Steps

1. In FlowMatrix, go to **Monitoring → Remote Access**
2. Click **Register Machine** and enter the machine name and site
3. Copy the generated token (shown only once)
4. On this IPC Windows machine, run the agent:

```bash
python agent.py --server wss://your-flowmatrix-domain.com --token ra-<your-token>
```

5. The machine will appear as **Online** in FlowMatrix — click **Connect** to start a session

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--server` | *required* | FlowMatrix server URL (`wss://...`) |
| `--token` | *required* | Machine token from FlowMatrix |
| `--fps` | `10` | Frames per second (1–30) |
| `--quality` | `60` | JPEG quality (1–95, lower = faster) |
| `--monitor` | `1` | Monitor index to capture (1 = primary) |

## Example

```bash
# Basic usage
python agent.py --server wss://flowmatrix.wttindia.com --token ra-abc123...

# Higher quality, lower FPS
python agent.py --server wss://flowmatrix.wttindia.com --token ra-abc123... --fps 5 --quality 80

# Second monitor
python agent.py --server wss://flowmatrix.wttindia.com --token ra-abc123... --monitor 2
```

## Running as a Windows Service (optional)

To run automatically on startup, use `pythonw.exe` with the Windows Task Scheduler:

1. Open Task Scheduler → Create Basic Task
2. Trigger: At log on (or at startup)
3. Action: Start a program
4. Program: `C:\Python39\pythonw.exe`
5. Arguments: `C:\path\to\agent.py --server wss://... --token ra-...`

## Notes

- The agent streams **JPEG-compressed screenshots** — no audio is transmitted
- Mouse and keyboard input from the FlowMatrix viewer is executed on this machine
- The agent automatically reconnects if the connection drops
- To revoke access, delete the machine from FlowMatrix or regenerate its token
