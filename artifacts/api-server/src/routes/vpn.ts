import { Router } from "express";
import crypto from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import { pool } from "@workspace/db";

const router = Router();
const execAsync = promisify(exec);

// ─── WireGuard Key Generation ─────────────────────────────────────────────────
// Uses Node.js built-in x25519 (Curve25519) — no external deps required
function generateWgKeys(): { privateKey: string; publicKey: string } {
  const { privateKey: priv, publicKey: pub } =
    crypto.generateKeyPairSync("x25519");
  // Raw 32-byte key is the last 32 bytes of the DER export
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

// ─── DB Init ─────────────────────────────────────────────────────────────────
async function initVpnTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vpn_server_config (
      id           SERIAL PRIMARY KEY,
      private_key  TEXT NOT NULL,
      public_key   TEXT NOT NULL,
      listen_port  INTEGER NOT NULL DEFAULT 51820,
      server_ip    TEXT NOT NULL DEFAULT '10.8.0.1',
      network_cidr TEXT NOT NULL DEFAULT '10.8.0.0/24',
      endpoint     TEXT,
      dns          TEXT NOT NULL DEFAULT '1.1.1.1',
      interface    TEXT NOT NULL DEFAULT 'wg0',
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);
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
  // Parse base e.g. 10.8.0.1 → prefix 10.8.0
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

// GET server config
router.get("/vpn/server", async (_req, res) => {
  const srv = await getServer();
  if (!srv) return res.json(null);
  // Never expose private key to client
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
    // Update mutable fields
    await pool.query(
      `UPDATE vpn_server_config SET endpoint=$1, listen_port=$2, dns=$3, updated_at=NOW() WHERE id=$4`,
      [endpoint ?? existing.endpoint, listen_port ?? existing.listen_port, dns ?? existing.dns, existing.id]
    );
    return res.json({ ok: true, message: "Server config updated" });
  }

  const keys = generateWgKeys();
  await pool.query(
    `INSERT INTO vpn_server_config (private_key, public_key, listen_port, endpoint, dns, interface)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      keys.privateKey,
      keys.publicKey,
      listen_port ?? 51820,
      endpoint ?? null,
      dns ?? "1.1.1.1",
      iface ?? "wg0",
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
      name,
      device_type ?? "linux",
      keys.privateKey,
      keys.publicKey,
      psk,
      peerIp,
      lan_ranges ?? "",
      persistent_keepalive ?? 25,
      notes ?? null,
    ]
  );
  res.json(r.rows[0]);
});

// DELETE peer
router.delete("/vpn/peers/:id", async (req, res) => {
  await pool.query("DELETE FROM vpn_peers WHERE id=$1", [req.params["id"]]);
  res.json({ ok: true });
});

// GET WireGuard .conf file for a peer
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

// GET Python setup script for a peer
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
    return subprocess.run(
        cmd, shell=True, check=check,
        capture_output=capture, text=True
    )


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
        pass  # multi-step already ran
`;

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="flowmatrix_vpn_${peer.name.replace(/\s+/g, "_")}.py"`);
  res.send(script);
});

// GET live WireGuard status from `wg show dump`
router.get("/vpn/status", async (_req, res) => {
  const srv = await getServer();
  if (!srv) return res.json({ available: false, peers: [] });

  try {
    const { stdout } = await execAsync(`wg show ${srv.interface} dump 2>/dev/null`);
    const lines = stdout.trim().split("\n").filter(Boolean);
    // First line is the interface line, rest are peers
    const peerLines = lines.slice(1);
    const peers: Record<string, {
      publicKey: string;
      endpoint: string | null;
      lastHandshake: number;
      rxBytes: number;
      txBytes: number;
    }> = {};
    for (const line of peerLines) {
      const parts = line.split("\t");
      // public_key  preshared_key  endpoint  allowed_ips  last_handshake  rx_bytes  tx_bytes  keepalive
      if (parts.length < 8) continue;
      const [pk, , endpoint, , lastHandshake, rxBytes, txBytes] = parts;
      peers[pk] = {
        publicKey: pk,
        endpoint: endpoint === "(none)" ? null : endpoint,
        lastHandshake: parseInt(lastHandshake) || 0,
        rxBytes: parseInt(rxBytes) || 0,
        txBytes: parseInt(txBytes) || 0,
      };
    }
    res.json({ available: true, peers });
  } catch {
    // wg not installed or interface not up
    res.json({ available: false, peers: {} });
  }
});

// GET full WireGuard server .conf (for applying to wg0)
router.get("/vpn/server/full-config", async (_req, res) => {
  const srv = await getServer();
  if (!srv) return res.status(400).json({ error: "Not initialized" });

  const peers = await pool.query(
    "SELECT * FROM vpn_peers WHERE is_active = TRUE"
  );

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
    const allowedIPs = [p.peer_ip + "/32", ...p.lan_ranges.split(",").map((s: string) => s.trim()).filter(Boolean)].join(", ");
    lines.push(`AllowedIPs = ${allowedIPs}`);
    lines.push(``);
  }

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="wg0.conf"`);
  res.send(lines.join("\n"));
});

// POST apply WireGuard config (requires wg + root)
router.post("/vpn/apply", async (_req, res) => {
  const srv = await getServer();
  if (!srv) return res.status(400).json({ error: "Not initialized" });

  try {
    const peers = await pool.query("SELECT * FROM vpn_peers WHERE is_active = TRUE");
    const lines = [
      `[Interface]`,
      `PrivateKey = ${srv.private_key}`,
      `Address = ${srv.server_ip}/24`,
      `ListenPort = ${srv.listen_port}`,
      ``,
    ];
    for (const p of peers.rows) {
      lines.push(`[Peer]`);
      lines.push(`PublicKey = ${p.public_key}`);
      lines.push(`PresharedKey = ${p.preshared_key}`);
      const allowedIPs = [p.peer_ip + "/32", ...p.lan_ranges.split(",").map((s: string) => s.trim()).filter(Boolean)].join(", ");
      lines.push(`AllowedIPs = ${allowedIPs}`);
      lines.push(``);
    }
    const conf = lines.join("\n");
    const confPath = `/etc/wireguard/${srv.interface}.conf`;
    await execAsync(`echo ${JSON.stringify(conf)} > ${confPath} && chmod 600 ${confPath}`);
    // Try syncconf first (no interface restart), fall back to wg-quick
    try {
      await execAsync(`wg syncconf ${srv.interface} <(wg-quick strip ${srv.interface})`);
    } catch {
      await execAsync(`wg-quick down ${srv.interface} 2>/dev/null; wg-quick up ${srv.interface}`);
    }
    res.json({ ok: true, message: "WireGuard config applied" });
  } catch (e: unknown) {
    const err = e as { message?: string };
    res.status(500).json({ error: err.message ?? "Apply failed" });
  }
});

export default router;
