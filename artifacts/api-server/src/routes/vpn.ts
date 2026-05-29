import { Router } from "express";
import crypto from "crypto";
import { pool } from "@workspace/db";

const router = Router();

// ─── WireGuard Key Generation ─────────────────────────────────────────────────
function generateWgKeys(): { privateKey: string; publicKey: string } {
  const { privateKey: priv, publicKey: pub } =
    crypto.generateKeyPairSync("x25519");
  const privRaw = (priv.export({ type: "pkcs8", format: "der" }) as Buffer).slice(-32);
  const pubRaw  = (pub.export({ type: "spki",  format: "der" }) as Buffer).slice(-32);
  return {
    privateKey: privRaw.toString("base64"),
    publicKey:  pubRaw.toString("base64"),
  };
}

function generatePsk(): string {
  return crypto.randomBytes(32).toString("base64");
}

function generateApiKey(): string {
  return "wgfm-" + crypto.randomBytes(24).toString("hex");
}

// ─── DB Init ─────────────────────────────────────────────────────────────────
async function initVpnTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vpn_server_config (
      id            SERIAL PRIMARY KEY,
      private_key   TEXT NOT NULL,
      public_key    TEXT NOT NULL,
      listen_port   INTEGER NOT NULL DEFAULT 51820,
      server_ip     TEXT NOT NULL DEFAULT '15.15.60.1',
      network_cidr  TEXT NOT NULL DEFAULT '15.15.60.0/24',
      endpoint      TEXT,
      dns           TEXT NOT NULL DEFAULT '1.1.1.1',
      interface     TEXT NOT NULL DEFAULT 'wg0',
      agent_api_key TEXT,
      last_status   JSONB,
      status_at     TIMESTAMPTZ,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Migrate: add new columns if they don't exist
  await pool.query(`ALTER TABLE vpn_server_config ADD COLUMN IF NOT EXISTS agent_api_key TEXT`);
  await pool.query(`ALTER TABLE vpn_server_config ADD COLUMN IF NOT EXISTS last_status JSONB`);
  await pool.query(`ALTER TABLE vpn_server_config ADD COLUMN IF NOT EXISTS status_at TIMESTAMPTZ`);
  // Migrate: update old default 10.8.0.x IPs to 15.15.60.x
  await pool.query(`UPDATE vpn_server_config SET server_ip='15.15.60.1', network_cidr='15.15.60.0/24' WHERE server_ip='10.8.0.1'`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vpn_peers (
      id                   SERIAL PRIMARY KEY,
      name                 TEXT NOT NULL,
      device_type          TEXT NOT NULL DEFAULT 'linux',
      private_key          TEXT NOT NULL,
      public_key           TEXT NOT NULL,
      preshared_key        TEXT NOT NULL,
      peer_ip              TEXT NOT NULL,
      lan_ranges           TEXT NOT NULL DEFAULT '',
      persistent_keepalive INTEGER NOT NULL DEFAULT 25,
      notes                TEXT,
      is_active            BOOLEAN NOT NULL DEFAULT TRUE,
      created_at           TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}
initVpnTables().catch((e) => console.error("vpn table init:", e));

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getServer() {
  const r = await pool.query("SELECT * FROM vpn_server_config LIMIT 1");
  return r.rows[0] ?? null;
}

async function nextPeerIp(): Promise<string> {
  const srv = await getServer();
  const base = srv?.server_ip ?? "10.8.0.1";
  const parts = base.split(".");
  const prefix = parts.slice(0, 3).join(".");
  const r = await pool.query("SELECT peer_ip FROM vpn_peers WHERE is_active = TRUE ORDER BY created_at");
  const usedLast = new Set(r.rows.map((row: { peer_ip: string }) => parseInt(row.peer_ip.split(".")[3])));
  for (let i = 2; i <= 254; i++) {
    if (!usedLast.has(i)) return `${prefix}.${i}`;
  }
  throw new Error("IP pool exhausted");
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET server config (safe, no private key)
router.get("/vpn/server", async (_req, res) => {
  const srv = await getServer();
  if (!srv) return res.json(null);
  const { private_key: _pk, ...safe } = srv;
  res.json(safe);
});

// POST initialize / update server
router.post("/vpn/server/init", async (req, res) => {
  const { endpoint, listen_port, dns, interface: iface } = req.body as {
    endpoint?: string;
    listen_port?: number;
    dns?: string;
    interface?: string;
  };

  const existing = await getServer();
  if (existing) {
    await pool.query(
      `UPDATE vpn_server_config SET endpoint=$1, listen_port=$2, dns=$3, updated_at=NOW() WHERE id=$4`,
      [endpoint ?? existing.endpoint, listen_port ?? existing.listen_port, dns ?? existing.dns, existing.id]
    );
    return res.json({ ok: true, message: "Server config updated" });
  }

  const keys = generateWgKeys();
  const apiKey = generateApiKey();
  await pool.query(
    `INSERT INTO vpn_server_config (private_key, public_key, listen_port, endpoint, dns, interface, agent_api_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      keys.privateKey,
      keys.publicKey,
      listen_port ?? 51820,
      endpoint ?? null,
      dns ?? "1.1.1.1",
      iface ?? "wg0",
      apiKey,
    ]
  );
  res.json({ ok: true, message: "Server initialized" });
});

// POST regenerate server keys
router.post("/vpn/server/regenerate-keys", async (_req, res) => {
  const existing = await getServer();
  if (!existing) return res.status(400).json({ error: "Server not initialized" });
  const keys = generateWgKeys();
  await pool.query(
    `UPDATE vpn_server_config SET private_key=$1, public_key=$2, updated_at=NOW() WHERE id=$3`,
    [keys.privateKey, keys.publicKey, existing.id]
  );
  res.json({ ok: true });
});

// POST regenerate agent API key
router.post("/vpn/server/regenerate-api-key", async (_req, res) => {
  const existing = await getServer();
  if (!existing) return res.status(400).json({ error: "Server not initialized" });
  const apiKey = generateApiKey();
  await pool.query(
    `UPDATE vpn_server_config SET agent_api_key=$1, updated_at=NOW() WHERE id=$2`,
    [apiKey, existing.id]
  );
  res.json({ ok: true, agent_api_key: apiKey });
});

// ─── Remote Agent Heartbeat ───────────────────────────────────────────────────
// Called by the Python agent running on the remote WireGuard server.
// Body: { peers: Record<pubkey, { endpoint, lastHandshake, rxBytes, txBytes }> }
router.post("/vpn/server/heartbeat", async (req, res) => {
  const auth = req.headers["authorization"] ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "Missing Authorization header" });

  const srv = await getServer();
  if (!srv) return res.status(404).json({ error: "VPN server not configured" });
  if (srv.agent_api_key !== token) return res.status(403).json({ error: "Invalid API key" });

  const { peers } = req.body as {
    peers: Record<string, { endpoint: string | null; lastHandshake: number; rxBytes: number; txBytes: number }>;
  };

  await pool.query(
    `UPDATE vpn_server_config SET last_status=$1, status_at=NOW(), updated_at=NOW() WHERE id=$2`,
    [JSON.stringify({ available: true, peers: peers ?? {} }), srv.id]
  );

  // Return updated wg0.conf so the agent can apply new peers immediately
  const peersRows = await pool.query("SELECT * FROM vpn_peers WHERE is_active = TRUE");
  const confLines = [
    `[Interface]`,
    `PrivateKey = ${srv.private_key}`,
    `Address = ${srv.server_ip}/24`,
    `ListenPort = ${srv.listen_port}`,
    ``,
  ];
  for (const p of peersRows.rows) {
    confLines.push(`# ${p.name}`);
    confLines.push(`[Peer]`);
    confLines.push(`PublicKey = ${p.public_key}`);
    confLines.push(`PresharedKey = ${p.preshared_key}`);
    const allowedIPs = [
      p.peer_ip + "/32",
      ...p.lan_ranges.split(",").map((s: string) => s.trim()).filter(Boolean),
    ].join(", ");
    confLines.push(`AllowedIPs = ${allowedIPs}`);
    confLines.push(``);
  }

  res.json({ ok: true, config: confLines.join("\n") });
});

// GET live VPN status (returns last status pushed by the remote agent)
router.get("/vpn/status", async (_req, res) => {
  const srv = await getServer();
  if (!srv) return res.json({ available: false, peers: {}, stale: false });

  if (!srv.last_status) {
    return res.json({ available: false, peers: {}, stale: false, neverReported: true });
  }

  // Mark stale if not reported in last 3 minutes
  const stale = srv.status_at
    ? (Date.now() - new Date(srv.status_at).getTime()) > 3 * 60 * 1000
    : true;

  res.json({ ...srv.last_status, stale, lastReportedAt: srv.status_at });
});

// GET all peers
router.get("/vpn/peers", async (_req, res) => {
  const r = await pool.query(
    `SELECT id, name, device_type, public_key, peer_ip, lan_ranges,
            persistent_keepalive, notes, is_active, created_at
     FROM vpn_peers ORDER BY created_at`
  );
  res.json(r.rows);
});

// POST create peer
router.post("/vpn/peers", async (req, res) => {
  const srv = await getServer();
  if (!srv) return res.status(400).json({ error: "Initialize VPN server first" });

  const { name, device_type, lan_ranges, persistent_keepalive, notes } = req.body as {
    name: string;
    device_type?: string;
    lan_ranges?: string;
    persistent_keepalive?: number;
    notes?: string;
  };
  if (!name) return res.status(400).json({ error: "name required" });

  const keys = generateWgKeys();
  const psk  = generatePsk();
  const peerIp = await nextPeerIp();

  const r = await pool.query(
    `INSERT INTO vpn_peers
       (name, device_type, private_key, public_key, preshared_key, peer_ip, lan_ranges, persistent_keepalive, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, name, device_type, public_key, peer_ip, lan_ranges, persistent_keepalive, notes, is_active, created_at`,
    [
      name, device_type ?? "linux", keys.privateKey, keys.publicKey, psk,
      peerIp, lan_ranges ?? "", persistent_keepalive ?? 25, notes ?? null,
    ]
  );
  res.json(r.rows[0]);
});

// DELETE peer
router.delete("/vpn/peers/:id", async (req, res) => {
  await pool.query("DELETE FROM vpn_peers WHERE id=$1", [req.params["id"]]);
  res.json({ ok: true });
});

// GET WireGuard .conf file for a peer (for the peer device itself)
router.get("/vpn/peers/:id/wg-config", async (req, res) => {
  const srv = await getServer();
  if (!srv) return res.status(400).json({ error: "Server not initialized" });

  const r = await pool.query("SELECT * FROM vpn_peers WHERE id=$1", [req.params["id"]]);
  if (r.rowCount === 0) return res.status(404).json({ error: "Peer not found" });
  const peer = r.rows[0];

  const endpoint = srv.endpoint
    ? `${srv.endpoint}:${srv.listen_port}`
    : `<YOUR_SERVER_IP>:${srv.listen_port}`;

  const lanRoutes = peer.lan_ranges
    ? peer.lan_ranges.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];
  const allowedIPs = [srv.server_ip + "/32", ...lanRoutes].join(", ");

  const conf = [
    `[Interface]`,
    `PrivateKey = ${peer.private_key}`,
    `Address = ${peer.peer_ip}/32`,
    `DNS = ${srv.dns}`,
    ``,
    `[Peer]`,
    `PublicKey = ${srv.public_key}`,
    `PresharedKey = ${peer.preshared_key}`,
    `Endpoint = ${endpoint}`,
    `AllowedIPs = ${allowedIPs}`,
    `PersistentKeepalive = ${peer.persistent_keepalive}`,
  ].join("\n");

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="flowmatrix-vpn-${peer.name}.conf"`);
  res.send(conf);
});

// GET Python setup script for a peer device
router.get("/vpn/peers/:id/python-client", async (req, res) => {
  const srv = await getServer();
  if (!srv) return res.status(400).json({ error: "Server not initialized" });

  const r = await pool.query("SELECT * FROM vpn_peers WHERE id=$1", [req.params["id"]]);
  if (r.rowCount === 0) return res.status(404).json({ error: "Peer not found" });
  const peer = r.rows[0];

  const endpoint = srv.endpoint
    ? `${srv.endpoint}:${srv.listen_port}`
    : `<YOUR_SERVER_IP>:${srv.listen_port}`;

  const lanRoutes = peer.lan_ranges
    ? peer.lan_ranges.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];
  const allowedIPs = [srv.server_ip + "/32", ...lanRoutes].join(", ");

  const wgConf = [
    `[Interface]`,
    `PrivateKey = ${peer.private_key}`,
    `Address = ${peer.peer_ip}/32`,
    `DNS = ${srv.dns}`,
    ``,
    `[Peer]`,
    `PublicKey = ${srv.public_key}`,
    `PresharedKey = ${peer.preshared_key}`,
    `Endpoint = ${endpoint}`,
    `AllowedIPs = ${allowedIPs}`,
    `PersistentKeepalive = ${peer.persistent_keepalive}`,
  ].join("\\n");

  const script = `#!/usr/bin/env python3
"""
FlowMatrix VPN Client Setup Script
Peer  : ${peer.name}
VPN IP: ${peer.peer_ip}
Generated automatically — keep this file private.
"""
import subprocess, sys, os, platform, textwrap

INTERFACE = "wg-flowmatrix"
PEER_IP   = "${peer.peer_ip}"

WG_CONF = textwrap.dedent("""${wgConf.replace(/\\n/g, "\n")}""").strip()


def run(cmd, check=True, capture=False):
    return subprocess.run(cmd, shell=True, check=check, capture_output=capture, text=True)

def has_cmd(cmd):
    return run(f"which {cmd}", check=False, capture=True).returncode == 0

def install_wireguard():
    if has_cmd("wg"):
        return
    print("Installing WireGuard tools...")
    system = platform.system().lower()
    if system == "linux":
        if has_cmd("apt-get"):
            run("apt-get update -qq && apt-get install -y wireguard-tools")
        elif has_cmd("yum"):
            run("yum install -y wireguard-tools")
        elif has_cmd("dnf"):
            run("dnf install -y wireguard-tools")
        elif has_cmd("pacman"):
            run("pacman -S --noconfirm wireguard-tools")
        else:
            sys.exit("Unsupported package manager. Install wireguard-tools manually.")
    elif system == "darwin":
        if has_cmd("brew"):
            run("brew install wireguard-tools")
        else:
            sys.exit("Install Homebrew first: https://brew.sh")
    else:
        sys.exit("Windows: download WireGuard from https://wireguard.com/install/")

def write_config():
    config_dir = "/etc/wireguard"
    os.makedirs(config_dir, mode=0o700, exist_ok=True)
    config_path = f"{config_dir}/{INTERFACE}.conf"
    with open(config_path, "w") as f:
        f.write(WG_CONF + "\\n")
    os.chmod(config_path, 0o600)
    print(f"Config written to {config_path}")
    return config_path

def bring_up():
    run(f"wg-quick down {INTERFACE}", check=False)
    run(f"wg-quick up {INTERFACE}")
    print(f"VPN tunnel UP — this device IP: {PEER_IP}")

def enable_on_boot():
    if has_cmd("systemctl"):
        run(f"systemctl enable wg-quick@{INTERFACE}", check=False)
        print("Enabled on boot via systemd")

def status():
    run("wg show")

def down():
    run(f"wg-quick down {INTERFACE}", check=False)
    print("VPN tunnel DOWN")

COMMANDS = {
    "up":     lambda: (install_wireguard(), write_config(), bring_up(), enable_on_boot()),
    "down":   down,
    "status": status,
    "config": lambda: (install_wireguard(), write_config()),
}

if __name__ == "__main__":
    if os.geteuid() != 0:
        print("Run as root:  sudo python3 flowmatrix_vpn.py up")
        sys.exit(1)
    cmd = sys.argv[1] if len(sys.argv) > 1 else "up"
    if cmd not in COMMANDS:
        print(f"Usage: sudo python3 flowmatrix_vpn.py [{' | '.join(COMMANDS)}]")
        sys.exit(1)
    result = COMMANDS[cmd]()
    if isinstance(result, tuple):
        pass
`;

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="flowmatrix_vpn_${peer.name.replace(/\s+/g, "_")}.py"`);
  res.send(script);
});

// GET the Python agent script for the REMOTE WireGuard server (pushes status back to FlowMatrix)
router.get("/vpn/server/agent-script", async (req, res) => {
  const srv = await getServer();
  if (!srv) return res.status(400).json({ error: "Server not initialized" });

  // Determine the public URL of FlowMatrix
  const host = req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "your-flowmatrix-domain.com";
  const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() ?? "https";
  const flowmatrixUrl = `${proto}://${host}`;

  const apiKey = srv.agent_api_key ?? "<YOUR_API_KEY>";
  const wgInterface = srv.interface ?? "wg0";

  const script = `#!/usr/bin/env python3
"""
FlowMatrix VPN Server Agent
============================
Run this script on your WireGuard server (the VPS/cloud host).
It does two things every 30 seconds:
  1. Reads live peer status via  wg show dump
  2. POSTs status to FlowMatrix  (so the dashboard stays live)
  3. Receives the latest wg0.conf back and applies any new peers automatically

Requirements:  python3, wireguard-tools (wg command), root or CAP_NET_ADMIN

Usage:
  sudo python3 flowmatrix_wg_agent.py

To run as a service (systemd):
  sudo cp flowmatrix_wg_agent.py /usr/local/bin/
  sudo chmod +x /usr/local/bin/flowmatrix_wg_agent.py

  Create /etc/systemd/system/flowmatrix-vpn-agent.service:
    [Unit]
    Description=FlowMatrix WireGuard Agent
    After=network.target wg-quick@${wgInterface}.service

    [Service]
    ExecStart=/usr/bin/python3 /usr/local/bin/flowmatrix_wg_agent.py
    Restart=always
    RestartSec=10

    [Install]
    WantedBy=multi-user.target

  sudo systemctl daemon-reload
  sudo systemctl enable --now flowmatrix-vpn-agent
"""

import subprocess, time, json, os, sys, hashlib, urllib.request, urllib.error

# ── Configuration ──────────────────────────────────────────────────────────────
FLOWMATRIX_URL = "${flowmatrixUrl}"
API_KEY        = "${apiKey}"
WG_INTERFACE   = "${wgInterface}"
CONF_PATH      = f"/etc/wireguard/{WG_INTERFACE}.conf"
HEARTBEAT_URL  = f"{FLOWMATRIX_URL}/api/vpn/server/heartbeat"
INTERVAL       = 30   # seconds between heartbeats
# ──────────────────────────────────────────────────────────────────────────────


def run(cmd, check=False):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return r.stdout.strip(), r.stderr.strip(), r.returncode


def wg_show_dump():
    """Parse  wg show <iface> dump  into a peers dict."""
    out, err, rc = run(f"wg show {WG_INTERFACE} dump")
    if rc != 0:
        print(f"[warn] wg show dump failed: {err}")
        return None

    peers = {}
    lines = out.strip().split("\\n")
    for line in lines[1:]:   # skip interface line
        parts = line.split("\\t")
        if len(parts) < 8:
            continue
        pub_key, _, endpoint, _, last_hs, rx, tx, _ = parts[:8]
        peers[pub_key] = {
            "endpoint":      None if endpoint == "(none)" else endpoint,
            "lastHandshake": int(last_hs) if last_hs.isdigit() else 0,
            "rxBytes":       int(rx) if rx.isdigit() else 0,
            "txBytes":       int(tx) if tx.isdigit() else 0,
        }
    return peers


def read_conf_hash():
    try:
        with open(CONF_PATH, "rb") as f:
            return hashlib.md5(f.read()).hexdigest()
    except FileNotFoundError:
        return None


def apply_config(new_conf: str):
    """Write new config and reload WireGuard without dropping tunnels."""
    with open(CONF_PATH, "w") as f:
        f.write(new_conf)
    os.chmod(CONF_PATH, 0o600)

    # Try syncconf (hot-reload, no downtime)
    _, err, rc = run(f"wg syncconf {WG_INTERFACE} <(wg-quick strip {WG_INTERFACE})")
    if rc != 0:
        print(f"[warn] syncconf failed ({err}), trying wg addconf...")
        # Fallback: strip new [Interface] block and use wg addconf for just peers
        peer_block = "\\n".join(
            line for line in new_conf.splitlines()
            if not line.startswith("[Interface]") and not line.startswith("PrivateKey")
               and not line.startswith("Address") and not line.startswith("ListenPort")
        )
        tmp = "/tmp/fm_wg_peers.conf"
        with open(tmp, "w") as f:
            f.write(peer_block)
        run(f"wg addconf {WG_INTERFACE} {tmp}")
    print("[info] Config applied.")


def heartbeat(peers: dict):
    payload = json.dumps({"peers": peers}).encode()
    req = urllib.request.Request(
        HEARTBEAT_URL,
        data=payload,
        headers={
            "Content-Type":  "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read())
            return body
    except urllib.error.HTTPError as e:
        print(f"[error] Heartbeat HTTP {e.code}: {e.read().decode()}")
    except Exception as e:
        print(f"[error] Heartbeat failed: {e}")
    return None


def main():
    if os.geteuid() != 0:
        sys.exit("Run as root: sudo python3 flowmatrix_wg_agent.py")

    print(f"[info] FlowMatrix WG Agent starting — interface={WG_INTERFACE}")
    print(f"[info] Reporting to {HEARTBEAT_URL}")

    last_conf_hash = read_conf_hash()

    while True:
        peers = wg_show_dump()
        if peers is None:
            print(f"[warn] Could not read WireGuard status. Is wg-quick@{WG_INTERFACE} running?")
            time.sleep(INTERVAL)
            continue

        print(f"[info] Reporting {len(peers)} peer(s)...")
        result = heartbeat(peers)

        if result and "config" in result:
            new_conf = result["config"]
            new_hash = hashlib.md5(new_conf.encode()).hexdigest()
            if new_hash != last_conf_hash:
                print("[info] New config received from FlowMatrix — applying...")
                apply_config(new_conf)
                last_conf_hash = new_hash
            else:
                print("[info] Config unchanged.")
        else:
            print("[warn] No config in heartbeat response.")

        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
`;

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="flowmatrix_wg_agent.py"`);
  res.send(script);
});

// GET full WireGuard server .conf (for manual setup or initial deployment)
router.get("/vpn/server/full-config", async (_req, res) => {
  const srv = await getServer();
  if (!srv) return res.status(400).json({ error: "Not initialized" });

  const peers = await pool.query("SELECT * FROM vpn_peers WHERE is_active = TRUE");

  const lines = [
    `[Interface]`,
    `PrivateKey = ${srv.private_key}`,
    `Address = ${srv.server_ip}/24`,
    `ListenPort = ${srv.listen_port}`,
    ``,
  ];

  for (const p of peers.rows) {
    lines.push(`# ${p.name}`);
    lines.push(`[Peer]`);
    lines.push(`PublicKey = ${p.public_key}`);
    lines.push(`PresharedKey = ${p.preshared_key}`);
    const allowedIPs = [
      p.peer_ip + "/32",
      ...p.lan_ranges.split(",").map((s: string) => s.trim()).filter(Boolean),
    ].join(", ");
    lines.push(`AllowedIPs = ${allowedIPs}`);
    lines.push(``);
  }

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="wg0.conf"`);
  res.send(lines.join("\n"));
});

export default router;
