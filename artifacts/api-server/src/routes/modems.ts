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
  const { token, rssi, rsrp, operator, wan_ip, uptime, sim_state, fw_version, data_rx, data_tx } =
    req.body as {
      token?: string;
      rssi?: number;
      rsrp?: number;
      operator?: string;
      wan_ip?: string;
      uptime?: number;
      sim_state?: string;
      fw_version?: string;
      data_rx?: number;
      data_tx?: number;
    };

  if (!token) return res.status(401).json({ error: "token required" });

  const hash = hashToken(token);
  const find = await pool.query(
    "SELECT id FROM modem_devices WHERE token_hash = $1",
    [hash]
  );
  if (find.rowCount === 0) return res.status(401).json({ error: "invalid token" });

  const id = find.rows[0].id;
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
    [rssi ?? null, rsrp ?? null, operator ?? null, wan_ip ?? null,
     uptime ?? null, sim_state ?? null, fw_version ?? null,
     data_rx ?? null, data_tx ?? null, id]
  );

  res.json({ ok: true });
});

setInterval(async () => {
  try {
    await pool.query(
      `UPDATE modem_devices SET is_online = FALSE
       WHERE is_online = TRUE AND last_seen < NOW() - INTERVAL '3 minutes'`
    );
  } catch {}
}, 60_000);

export default router;
