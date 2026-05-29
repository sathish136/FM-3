import { Router } from "express";
import crypto from "crypto";
import { pool } from "@workspace/db";
import { getAgentStatus } from "../remote-access-ws";

const router = Router();

async function initTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS remote_access_machines (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        site TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        description TEXT,
        is_online BOOLEAN NOT NULL DEFAULT false,
        last_seen TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by TEXT
      );

      CREATE TABLE IF NOT EXISTS remote_access_sessions (
        id SERIAL PRIMARY KEY,
        machine_id INTEGER NOT NULL REFERENCES remote_access_machines(id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        initiated_by TEXT
      );
    `);

    await pool.query(`
      ALTER TABLE remote_access_machines
        ADD COLUMN IF NOT EXISTS device_config_id INTEGER REFERENCES plc_device_configs(id) ON DELETE SET NULL;
    `);

    await pool.query(`
      ALTER TABLE remote_access_machines
        ADD COLUMN IF NOT EXISTS token TEXT;
    `);

    console.log("Remote access tables ready");
  } catch (e) {
    console.error("remote_access table init error:", e);
  }
}

initTables();

function generateToken(): string {
  return `ra-${crypto.randomBytes(24).toString("hex")}`;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

router.get("/remote-access/machines", async (req, res) => {
  try {
    const rows = await pool.query(
      `SELECT m.id, m.name,
              COALESCE(dc.project_name, m.site) AS site,
              m.site AS site_raw,
              m.device_config_id,
              dc.project_name AS device_config_name,
              dc.project_number AS device_config_number,
              m.description, m.is_online, m.last_seen, m.created_at, m.created_by
       FROM remote_access_machines m
       LEFT JOIN plc_device_configs dc ON dc.id = m.device_config_id
       ORDER BY COALESCE(dc.project_name, m.site), m.name`
    );
    const machines = rows.rows.map((m: any) => ({
      ...m,
      is_online: getAgentStatus(m.id) || m.is_online,
    }));
    res.json(machines);
  } catch (e) {
    res.status(500).json({ error: "Failed to list machines" });
  }
});

router.post("/remote-access/machines", async (req, res) => {
  try {
    const { name, site, description, device_config_id } = req.body;

    let resolvedSite = site?.trim();
    let resolvedDeviceConfigId = device_config_id ? Number(device_config_id) : null;

    if (resolvedDeviceConfigId) {
      const dc = await pool.query(
        `SELECT project_name, project_number FROM plc_device_configs WHERE id = $1`,
        [resolvedDeviceConfigId]
      );
      if (dc.rows[0]) {
        resolvedSite = dc.rows[0].project_name || dc.rows[0].project_number || resolvedSite || "Unknown";
      }
    }

    if (!name?.trim() || !resolvedSite) {
      return res.status(400).json({ error: "name and site (or device_config_id) are required" });
    }

    const token = generateToken();
    const tokenHash = hashToken(token);
    const createdBy = (req as any).user?.email || null;

    const r = await pool.query(
      `INSERT INTO remote_access_machines (name, site, description, token_hash, token, created_by, device_config_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, site, description, is_online, last_seen, created_at, created_by, device_config_id, token`,
      [name.trim(), resolvedSite, description?.trim() || null, tokenHash, token, createdBy, resolvedDeviceConfigId]
    );

    res.json({ ...r.rows[0], token });
  } catch (e) {
    res.status(500).json({ error: "Failed to register machine" });
  }
});

router.get("/remote-access/machines/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `SELECT m.id, m.name,
              COALESCE(dc.project_name, m.site) AS site,
              m.site AS site_raw,
              m.device_config_id,
              dc.project_name AS device_config_name,
              dc.project_number AS device_config_number,
              m.description, m.is_online, m.last_seen, m.created_at, m.created_by
       FROM remote_access_machines m
       LEFT JOIN plc_device_configs dc ON dc.id = m.device_config_id
       WHERE m.id = $1`,
      [id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Machine not found" });
    const machine = { ...r.rows[0], is_online: getAgentStatus(parseInt(id)) || r.rows[0].is_online };
    res.json(machine);
  } catch {
    res.status(500).json({ error: "Failed to get machine" });
  }
});

router.get("/remote-access/machines/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const machineId = parseInt(id);
    const agentOnline = getAgentStatus(machineId);
    const r = await pool.query(
      `SELECT is_online, last_seen FROM remote_access_machines WHERE id = $1`,
      [machineId]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Machine not found" });
    res.json({
      machineId,
      online: agentOnline || r.rows[0].is_online,
      agentConnected: agentOnline,
      lastSeen: r.rows[0].last_seen,
    });
  } catch {
    res.status(500).json({ error: "Failed to get machine status" });
  }
});

router.put("/remote-access/machines/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, site, description } = req.body;
    const r = await pool.query(
      `UPDATE remote_access_machines SET name = COALESCE($1, name), site = COALESCE($2, site), description = COALESCE($3, description)
       WHERE id = $4 RETURNING id, name, site, description, is_online, last_seen, created_at`,
      [name || null, site || null, description !== undefined ? description : null, id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Machine not found" });
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to update machine" });
  }
});

router.delete("/remote-access/machines/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM remote_access_machines WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete machine" });
  }
});

router.post("/remote-access/machines/:id/regenerate-token", async (req, res) => {
  try {
    const { id } = req.params;
    const token = generateToken();
    const tokenHash = hashToken(token);
    const r = await pool.query(
      `UPDATE remote_access_machines SET token_hash = $1, token = $2 WHERE id = $3 RETURNING id, name`,
      [tokenHash, token, id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Machine not found" });
    res.json({ token });
  } catch {
    res.status(500).json({ error: "Failed to regenerate token" });
  }
});

router.get("/remote-access/machines/:id/sessions", async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `SELECT id, machine_id, started_at, ended_at, initiated_by,
        EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::int AS duration_seconds
       FROM remote_access_sessions WHERE machine_id = $1 ORDER BY started_at DESC LIMIT 50`,
      [id]
    );
    res.json(r.rows);
  } catch {
    res.status(500).json({ error: "Failed to get sessions" });
  }
});

router.get("/remote-access/by-device-config/:configId", async (req, res) => {
  try {
    const { configId } = req.params;
    const rows = await pool.query(
      `SELECT id, name, site, description, is_online, last_seen, created_at, created_by, device_config_id, token
       FROM remote_access_machines
       WHERE device_config_id = $1
       ORDER BY name`,
      [configId]
    );
    const machines = rows.rows.map((m: any) => ({
      ...m,
      is_online: getAgentStatus(m.id) || m.is_online,
    }));
    res.json(machines);
  } catch {
    res.status(500).json({ error: "Failed to list machines for config" });
  }
});

export default router;
