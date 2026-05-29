import { Router } from "express";
import crypto from "crypto";
import { pool } from "@workspace/db";

const router = Router();

async function initModemTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS modem_devices (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      device_config_id INTEGER,
      make TEXT DEFAULT 'Teltonika',
      model TEXT DEFAULT 'RUT200',
      imei TEXT,
      sim_no TEXT,
      carrier TEXT,
      description TEXT,
      token TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      is_online BOOLEAN DEFAULT FALSE,
      last_seen TIMESTAMPTZ,
      signal_rssi INTEGER,
      signal_rsrp INTEGER,
      operator TEXT,
      wan_ip TEXT,
      uptime BIGINT,
      sim_state TEXT,
      fw_version TEXT,
      data_rx BIGINT,
      data_tx BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

initModemTables().catch((e) =>
  console.error("modem_devices table init failed:", e)
);

function generateToken(): { token: string; hash: string } {
  const token = "mod-" + crypto.randomBytes(18).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

function hashToken(t: string) {
  return crypto.createHash("sha256").update(t).digest("hex");
}

router.get("/modems/devices", async (_req, res) => {
  const result = await pool.query(
    `SELECT id, name, device_config_id, make, model, imei, sim_no, carrier,
            description, token, is_online, last_seen, signal_rssi, signal_rsrp,
            operator, wan_ip, uptime, sim_state, fw_version, data_rx, data_tx,
            created_at
     FROM modem_devices ORDER BY created_at DESC`
  );
  res.json(result.rows);
});

router.get("/modems/by-device-config/:configId", async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, make, model, imei, token, is_online, last_seen,
            signal_rssi, operator, wan_ip, uptime
     FROM modem_devices WHERE device_config_id = $1 ORDER BY created_at DESC`,
    [req.params["configId"]]
  );
  res.json(result.rows);
});

router.post("/modems/devices", async (req, res) => {
  const {
    name, device_config_id, make, model, imei, sim_no,
    carrier, description,
  } = req.body as {
    name: string;
    device_config_id?: number;
    make?: string;
    model?: string;
    imei?: string;
    sim_no?: string;
    carrier?: string;
    description?: string;
  };
  if (!name) return res.status(400).json({ error: "name required" });
  const { token, hash } = generateToken();
  const result = await pool.query(
    `INSERT INTO modem_devices
       (name, device_config_id, make, model, imei, sim_no, carrier, description, token, token_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, name, device_config_id, make, model, imei, sim_no, carrier,
               description, token, is_online, last_seen, signal_rssi, operator,
               wan_ip, uptime, created_at`,
    [
      name,
      device_config_id ?? null,
      make ?? "Teltonika",
      model ?? "RUT200",
      imei ?? null,
      sim_no ?? null,
      carrier ?? null,
      description ?? null,
      token,
      hash,
    ]
  );
  res.json(result.rows[0]);
});

router.delete("/modems/devices/:id", async (req, res) => {
  await pool.query("DELETE FROM modem_devices WHERE id = $1", [req.params["id"]]);
  res.json({ ok: true });
});

router.post("/modems/devices/:id/regenerate-token", async (req, res) => {
  const { token, hash } = generateToken();
  const result = await pool.query(
    `UPDATE modem_devices SET token=$1, token_hash=$2 WHERE id=$3
     RETURNING id, token`,
    [token, hash, req.params["id"]]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

router.post("/modems/heartbeat", async (req, res) => {
  // Token accepted from URL query (?token=) or JSON body — supports both
  // Teltonika "Data to Server" (token in URL) and custom scripts (token in body)
  const body = req.body as Record<string, unknown>;
  const tokenRaw =
    (req.query["token"] as string | undefined) ??
    (body["token"] as string | undefined);

  if (!tokenRaw) return res.status(401).json({ error: "token required" });

  const hash = hashToken(tokenRaw);
  const find = await pool.query(
    "SELECT id FROM modem_devices WHERE token_hash = $1",
    [hash]
  );
  if (find.rowCount === 0) return res.status(401).json({ error: "invalid token" });
  const id = find.rows[0].id;

  // Teltonika GSM JSON type wraps payload under a "data" key.
  // Fall back to flat body for custom/script formats.
  const d = (typeof body["data"] === "object" && body["data"] !== null)
    ? (body["data"] as Record<string, unknown>)
    : body;

  // Normalise field names — Teltonika GSM JSON uses "signal" for RSSI and "ip" for WAN IP
  const rssi    = num(d["signal"]   ?? d["rssi"]     ?? d["gsm_signal"]);
  const rsrp    = num(d["rsrp"]     ?? d["gsm_rsrp"]);
  const operator = str(d["operator"] ?? d["gsm_operator"]);
  const wan_ip  = str(d["ip"]       ?? d["wan_ip"]   ?? d["gsm_ip"]);
  const uptime  = num(d["uptime"]);
  const sim_state = str(d["sim_state"] ?? d["gsm_sim_state"]);
  const fw_version = str(d["fw_version"] ?? d["firmware"]);
  // Mobile usage type: rx_bytes / tx_bytes or data_rx / data_tx
  const data_rx = num(d["rx_bytes"] ?? d["data_rx"]);
  const data_tx = num(d["tx_bytes"] ?? d["data_tx"]);

  await pool.query(
    `UPDATE modem_devices SET
       is_online    = TRUE,
       last_seen    = NOW(),
       signal_rssi  = COALESCE($1, signal_rssi),
       signal_rsrp  = COALESCE($2, signal_rsrp),
       operator     = COALESCE($3, operator),
       wan_ip       = COALESCE($4, wan_ip),
       uptime       = COALESCE($5, uptime),
       sim_state    = COALESCE($6, sim_state),
       fw_version   = COALESCE($7, fw_version),
       data_rx      = COALESCE($8, data_rx),
       data_tx      = COALESCE($9, data_tx)
     WHERE id = $10`,
    [rssi, rsrp, operator, wan_ip, uptime, sim_state, fw_version, data_rx, data_tx, id]
  );

  res.json({ ok: true });
});

function num(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function str(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  return String(v);
}

setInterval(async () => {
  try {
    await pool.query(
      `UPDATE modem_devices SET is_online = FALSE
       WHERE is_online = TRUE AND last_seen < NOW() - INTERVAL '3 minutes'`
    );
  } catch {}
}, 60_000);

export default router;
