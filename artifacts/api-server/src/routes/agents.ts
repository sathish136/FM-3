import { Router } from "express";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "@workspace/db";

const agentsRouter = Router();

const ERP_URL = process.env.ERPNEXT_URL || "https://erp.wttint.com";
const API_KEY = process.env.ERPNEXT_API_KEY || "";
const API_SECRET = process.env.ERPNEXT_API_SECRET || "";
const AGENT_PWD_SALT = process.env.AGENT_PWD_SALT || "wtt-flowmatrix-agent-salt-2026";

// ── DB migrations ─────────────────────────────────────────────────────────────
db.execute(sql`
  CREATE TABLE IF NOT EXISTS erp_agents (
    erp_name        TEXT PRIMARY KEY,
    agent_name      TEXT NOT NULL,
    region          TEXT,
    agent_login_id  TEXT UNIQUE,
    agent_password_hash TEXT,
    agent_password_plain TEXT,
    lead_ids        TEXT NOT NULL DEFAULT '[]',
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ALTER TABLE erp_agents ADD COLUMN IF NOT EXISTS agent_password_plain TEXT;

  -- Legacy tables kept for backward compat
  ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS is_agent BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS agent_login_id TEXT;
  ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS agent_password_hash TEXT;

  CREATE TABLE IF NOT EXISTS agent_lead_assignments (
    id SERIAL PRIMARY KEY,
    agent_email TEXT NOT NULL UNIQUE,
    lead_ids TEXT NOT NULL DEFAULT '[]',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`)
  .then(() => console.log("Agent tables ready"))
  .catch((e: any) => console.error("Agent tables migration error:", e.message));

// ── Helper: fetch agents from ERPNext Agent Details DocType ───────────────────
async function fetchErpAgents(): Promise<{ name: string; agent_name: string; region: string }[]> {
  const url = `${ERP_URL}/api/resource/Agent%20Details?fields=%5B%22name%22%2C%22agent_name%22%2C%22region%22%5D&limit_page_length=500`;
  const res = await fetch(url, {
    headers: { Authorization: `token ${API_KEY}:${API_SECRET}` },
  });
  if (!res.ok) throw new Error(`ERPNext responded ${res.status}`);
  const data = await res.json() as { data: { name: string; agent_name: string; region: string }[] };
  return data.data ?? [];
}

// GET /api/erp-agents — list all agents from ERPNext merged with FlowMatrix DB
agentsRouter.get("/erp-agents", async (_req, res) => {
  try {
    const erpList = await fetchErpAgents();

    // Fetch all stored credentials / leads from our DB
    const dbRows = await db.execute(sql`
      SELECT erp_name, agent_login_id,
             (agent_password_hash IS NOT NULL AND agent_password_hash != '') AS has_password,
             agent_password_plain,
             lead_ids
      FROM erp_agents
    `);
    const dbMap: Record<string, { login_id: string | null; has_password: boolean; password_plain: string | null; lead_ids: string[] }> = {};
    for (const row of dbRows.rows as any[]) {
      let lead_ids: string[] = [];
      try { lead_ids = JSON.parse(row.lead_ids ?? "[]"); } catch { lead_ids = []; }
      dbMap[row.erp_name] = {
        login_id: row.agent_login_id ?? null,
        has_password: row.has_password === true || row.has_password === "true" || row.has_password === "t",
        password_plain: row.agent_password_plain ?? null,
        lead_ids,
      };
    }

    const merged = erpList.map(agent => ({
      erp_name: agent.name,
      agent_name: agent.agent_name || agent.name,
      region: (agent.region || "").trim(),
      agent_login_id: dbMap[agent.name]?.login_id ?? null,
      has_password: dbMap[agent.name]?.has_password ?? false,
      password_plain: dbMap[agent.name]?.password_plain ?? null,
      lead_ids: dbMap[agent.name]?.lead_ids ?? [],
    }));

    res.json(merged);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/erp-agents/:name/leads
agentsRouter.get("/erp-agents/:name/leads", async (req, res) => {
  const erp_name = decodeURIComponent(req.params.name);
  try {
    const rows = await db.execute(sql`
      SELECT lead_ids FROM erp_agents WHERE erp_name = ${erp_name}
    `);
    const raw = rows.rows.length > 0 ? String((rows.rows[0] as any).lead_ids ?? "[]") : "[]";
    let lead_ids: string[] = [];
    try { lead_ids = JSON.parse(raw); } catch { lead_ids = []; }
    res.json({ lead_ids });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/erp-agents/:name/leads — save assigned lead IDs
agentsRouter.post("/erp-agents/:name/leads", async (req, res) => {
  const erp_name = decodeURIComponent(req.params.name);
  const { lead_ids } = req.body as { lead_ids: string[] };
  if (!Array.isArray(lead_ids)) return res.status(400).json({ error: "lead_ids must be an array" });
  try {
    await db.execute(sql`
      INSERT INTO erp_agents (erp_name, agent_name, lead_ids, updated_at)
      VALUES (${erp_name}, ${erp_name}, ${JSON.stringify(lead_ids)}, NOW())
      ON CONFLICT (erp_name) DO UPDATE SET
        lead_ids = EXCLUDED.lead_ids,
        updated_at = NOW()
    `);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/erp-agents/:name/credentials
agentsRouter.get("/erp-agents/:name/credentials", async (req, res) => {
  const erp_name = decodeURIComponent(req.params.name);
  try {
    const rows = await db.execute(sql`
      SELECT agent_login_id,
             (agent_password_hash IS NOT NULL AND agent_password_hash != '') AS has_password
      FROM erp_agents WHERE erp_name = ${erp_name}
    `);
    if (rows.rows.length === 0) return res.json({ login_id: null, has_password: false });
    const row = rows.rows[0] as any;
    res.json({
      login_id: row.agent_login_id ?? null,
      has_password: row.has_password === true || row.has_password === "true" || row.has_password === "t",
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// PATCH /api/erp-agents/:name/credentials — set login ID and/or password
agentsRouter.patch("/erp-agents/:name/credentials", async (req, res) => {
  const erp_name = decodeURIComponent(req.params.name);
  const { login_id, password, agent_name } = req.body as { login_id: string; password?: string; agent_name?: string };
  if (!login_id?.trim()) return res.status(400).json({ error: "login_id is required" });
  try {
    const displayName = agent_name || erp_name;
    if (password) {
      const hash = createHash("sha256").update(password + AGENT_PWD_SALT).digest("hex");
      await db.execute(sql`
        INSERT INTO erp_agents (erp_name, agent_name, agent_login_id, agent_password_hash, agent_password_plain, updated_at)
        VALUES (${erp_name}, ${displayName}, ${login_id.trim()}, ${hash}, ${password}, NOW())
        ON CONFLICT (erp_name) DO UPDATE SET
          agent_login_id = EXCLUDED.agent_login_id,
          agent_password_hash = EXCLUDED.agent_password_hash,
          agent_password_plain = EXCLUDED.agent_password_plain,
          updated_at = NOW()
      `);
    } else {
      await db.execute(sql`
        INSERT INTO erp_agents (erp_name, agent_name, agent_login_id, updated_at)
        VALUES (${erp_name}, ${displayName}, ${login_id.trim()}, NOW())
        ON CONFLICT (erp_name) DO UPDATE SET
          agent_login_id = EXCLUDED.agent_login_id,
          updated_at = NOW()
      `);
    }
    res.json({ ok: true });
  } catch (e: any) {
    if (e.code === "23505" || String(e).toLowerCase().includes("unique")) {
      return res.status(409).json({ error: "This Login ID is already taken by another agent." });
    }
    res.status(500).json({ error: String(e) });
  }
});

// ── Legacy routes kept for backward compat ────────────────────────────────────
agentsRouter.get("/agents", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT erp_name AS email, agent_name AS full_name, TRUE AS is_agent, lead_ids
      FROM erp_agents WHERE agent_login_id IS NOT NULL
      ORDER BY agent_name
    `);
    res.json(rows.rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

agentsRouter.get("/agents/:email/leads", async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  try {
    // Try erp_agents first
    const rows = await db.execute(sql`
      SELECT lead_ids FROM erp_agents WHERE erp_name = ${email} OR agent_login_id = ${email}
    `);
    if (rows.rows.length > 0) {
      const raw = String((rows.rows[0] as any).lead_ids ?? "[]");
      let lead_ids: string[] = [];
      try { lead_ids = JSON.parse(raw); } catch { lead_ids = []; }
      return res.json({ lead_ids });
    }
    // Fallback: legacy agent_lead_assignments
    const legacyRows = await db.execute(sql`
      SELECT lead_ids FROM agent_lead_assignments WHERE agent_email = ${email}
    `);
    const raw = legacyRows.rows.length > 0 ? String((legacyRows.rows[0] as any).lead_ids ?? "[]") : "[]";
    let lead_ids: string[] = [];
    try { lead_ids = JSON.parse(raw); } catch { lead_ids = []; }
    res.json({ lead_ids });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default agentsRouter;
