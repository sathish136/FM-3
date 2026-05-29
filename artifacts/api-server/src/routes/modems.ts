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
      signal_rsrq INTEGER,
      signal_sinr INTEGER,
      operator TEXT,
      operator_state TEXT,
      conn_state TEXT,
      conn_stage TEXT,
      network_type TEXT,
      wan_ip TEXT,
      uptime BIGINT,
      sim_state TEXT,
      fw_version TEXT,
      data_rx BIGINT,
      data_tx BIGINT,
      band TEXT,
      carrier_agg TEXT,
      bandwidth TEXT,
      apn TEXT,
      mtu INTEGER,
      cell_id TEXT,
      tac TEXT,
      pcid TEXT,
      earfcn TEXT,
      mcc TEXT,
      mnc TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add new columns to existing tables (idempotent)
  const newCols = [
    "signal_rsrq INTEGER",
    "signal_sinr INTEGER",
    "operator_state TEXT",
    "conn_state TEXT",
    "conn_stage TEXT",
    "network_type TEXT",
    "band TEXT",
    "carrier_agg TEXT",
    "bandwidth TEXT",
    "apn TEXT",
    "mtu INTEGER",
    "cell_id TEXT",
    "tac TEXT",
    "pcid TEXT",
    "earfcn TEXT",
    "mcc TEXT",
    "mnc TEXT",
  ];
  for (const col of newCols) {
    const [colName] = col.split(" ");
    await pool.query(
      `ALTER TABLE modem_devices ADD COLUMN IF NOT EXISTS ${colName} ${col.slice(colName.length + 1)}`
    );
  }
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

const ALL_COLS = `
  id, name, device_config_id, make, model, imei, sim_no, carrier,
  description, token, is_online, last_seen,
  signal_rssi, signal_rsrp, signal_rsrq, signal_sinr,
  operator, operator_state, conn_state, conn_stage, network_type,
  wan_ip, uptime, sim_state, fw_version,
  data_rx, data_tx,
  band, carrier_agg, bandwidth, apn, mtu,
  cell_id, tac, pcid, earfcn, mcc, mnc,
  created_at
`;

router.get("/modems/devices", async (_req, res) => {
  const result = await pool.query(
    `SELECT ${ALL_COLS} FROM modem_devices ORDER BY created_at DESC`
  );
  res.json(result.rows);
});

router.get("/modems/by-device-config/:configId", async (req, res) => {
  const result = await pool.query(
    `SELECT ${ALL_COLS} FROM modem_devices WHERE device_config_id = $1 ORDER BY created_at DESC`,
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
     RETURNING ${ALL_COLS}`,
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
    `UPDATE modem_devices SET token=$1, token_hash=$2 WHERE id=$3 RETURNING id, token`,
    [token, hash, req.params["id"]]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

// Token in URL path — used by Teltonika GSM/Mobile usage JSON types
router.post("/modems/heartbeat/:token", heartbeatHandler);

// Token in body or query string
router.post("/modems/heartbeat", heartbeatHandler);

async function heartbeatHandler(req: import("express").Request, res: import("express").Response) {
  const body = req.body as Record<string, unknown>;
  const tokenRaw: string | undefined =
    (req.params["token"] as string | undefined) ||
    (req.query["token"] as string | undefined) ||
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
  const d = (typeof body["data"] === "object" && body["data"] !== null)
    ? (body["data"] as Record<string, unknown>)
    : body;

  // ── Signal / Radio ────────────────────────────────────────────────────────
  const rssi         = num(d["signal"]          ?? d["rssi"]         ?? d["gsm_signal"]);
  const rsrp         = num(d["rsrp"]            ?? d["gsm_rsrp"]);
  const rsrq         = num(d["rsrq"]            ?? d["gsm_rsrq"]);
  const sinr         = num(d["rssnr"]           ?? d["sinr"]         ?? d["gsm_sinr"]);

  // ── Connection ────────────────────────────────────────────────────────────
  const operator      = str(d["operator"]       ?? d["gsm_operator"]);
  const operator_state = str(d["operator_state"] ?? d["gsm_operator_state"]);
  const conn_state    = str(d["connection_state"] ?? d["conn_state"]  ?? d["gsm_conn_state"]);
  const conn_stage    = str(d["connection_stage"] ?? d["conn_stage"]  ?? d["gsm_conn_stage"]);
  const network_type  = str(d["network_type"]   ?? d["gsm_network_type"]);
  const wan_ip        = str(d["ip"]             ?? d["wan_ip"]       ?? d["gsm_ip"]);
  const uptime        = num(d["uptime"]);
  const sim_state     = str(d["sim_state"]      ?? d["gsm_sim_state"]);
  const fw_version    = str(d["fw_version"]     ?? d["firmware"]);

  // ── Data Transmission ─────────────────────────────────────────────────────
  const data_rx       = num(d["rx_bytes"]       ?? d["data_rx"]);
  const data_tx       = num(d["tx_bytes"]       ?? d["data_tx"]);
  const band          = str(d["band"]           ?? d["connected_band"] ?? d["gsm_band"]);
  const carrier_agg   = str(d["carrier_agg"]   ?? d["carrier_aggregation"]);
  const bandwidth     = str(d["bw"]            ?? d["bandwidth"]);
  const apn           = str(d["apn"]);
  const mtu           = num(d["mtu"]);

  // ── Cell Info ─────────────────────────────────────────────────────────────
  const cell_id       = str(d["cell_id"]       ?? d["cellid"]);
  const tac           = str(d["tac"]);
  const pcid          = str(d["pcid"]          ?? d["physical_cell_id"]);
  const earfcn        = str(d["earfcn"]);
  const mcc           = str(d["mcc"]);
  const mnc           = str(d["mnc"]);

  await pool.query(
    `UPDATE modem_devices SET
       is_online      = TRUE,
       last_seen      = NOW(),
       signal_rssi    = COALESCE($1,  signal_rssi),
       signal_rsrp    = COALESCE($2,  signal_rsrp),
       signal_rsrq    = COALESCE($3,  signal_rsrq),
       signal_sinr    = COALESCE($4,  signal_sinr),
       operator       = COALESCE($5,  operator),
       operator_state = COALESCE($6,  operator_state),
       conn_state     = COALESCE($7,  conn_state),
       conn_stage     = COALESCE($8,  conn_stage),
       network_type   = COALESCE($9,  network_type),
       wan_ip         = COALESCE($10, wan_ip),
       uptime         = COALESCE($11, uptime),
       sim_state      = COALESCE($12, sim_state),
       fw_version     = COALESCE($13, fw_version),
       data_rx        = COALESCE($14, data_rx),
       data_tx        = COALESCE($15, data_tx),
       band           = COALESCE($16, band),
       carrier_agg    = COALESCE($17, carrier_agg),
       bandwidth      = COALESCE($18, bandwidth),
       apn            = COALESCE($19, apn),
       mtu            = COALESCE($20, mtu),
       cell_id        = COALESCE($21, cell_id),
       tac            = COALESCE($22, tac),
       pcid           = COALESCE($23, pcid),
       earfcn         = COALESCE($24, earfcn),
       mcc            = COALESCE($25, mcc),
       mnc            = COALESCE($26, mnc)
     WHERE id = $27`,
    [
      rssi, rsrp, rsrq, sinr,
      operator, operator_state, conn_state, conn_stage, network_type,
      wan_ip, uptime, sim_state, fw_version,
      data_rx, data_tx,
      band, carrier_agg, bandwidth, apn, mtu,
      cell_id, tac, pcid, earfcn, mcc, mnc,
      id,
    ]
  );

  res.json({ ok: true });
}

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
