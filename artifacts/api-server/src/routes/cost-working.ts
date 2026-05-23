import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { erpFetch } from "../lib/erp";

const router = Router();

const ERP_URL = (process.env.ERPNEXT_URL || "https://erp.wttint.com").replace(/\/$/, "");
const ERP_AUTH = () => `token ${process.env.ERPNEXT_API_KEY || ""}:${process.env.ERPNEXT_API_SECRET || ""}`;

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "cost-working-step");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${ts}_${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cost_working_sessions (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      erp_project TEXT,
      step_file_name TEXT,
      step_file_path TEXT,
      created_by  TEXT,
      created_at  TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cost_working_items (
      id               SERIAL PRIMARY KEY,
      session_id       INTEGER NOT NULL REFERENCES cost_working_sessions(id) ON DELETE CASCADE,
      part_name        TEXT NOT NULL,
      material_category TEXT NOT NULL DEFAULT 'General',
      description      TEXT,
      quantity         NUMERIC(12,3) NOT NULL DEFAULT 1,
      unit_price       NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_price      NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
      erp_po_no        TEXT,
      erp_item_code    TEXT,
      supplier         TEXT,
      uom              TEXT DEFAULT 'Nos',
      source           TEXT DEFAULT 'manual',
      notes            TEXT,
      created_at       TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("Cost Working tables ready");
}

ensureTables().catch(e => console.error("Cost Working table init error:", e));

// ── Sessions ──────────────────────────────────────────────────────────────────

router.get("/cost-working/sessions", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT s.*,
        COUNT(i.id)::int AS item_count,
        COALESCE(SUM(i.total_price), 0)::float AS total_cost
      FROM cost_working_sessions s
      LEFT JOIN cost_working_items i ON i.session_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.json(rows.rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/cost-working/sessions", async (req, res) => {
  const { name, description, erp_project, created_by } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  try {
    const r = await db.execute(sql`
      INSERT INTO cost_working_sessions (name, description, erp_project, created_by)
      VALUES (${name}, ${description ?? null}, ${erp_project ?? null}, ${created_by ?? null})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/cost-working/sessions/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, erp_project } = req.body;
  try {
    const r = await db.execute(sql`
      UPDATE cost_working_sessions
      SET name=${name}, description=${description ?? null}, erp_project=${erp_project ?? null}
      WHERE id=${id} RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/cost-working/sessions/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const sess = await db.execute(sql`SELECT step_file_path FROM cost_working_sessions WHERE id=${id}`);
    const fp = (sess.rows[0] as any)?.step_file_path;
    if (fp && fs.existsSync(fp)) fs.unlinkSync(fp);
    await db.execute(sql`DELETE FROM cost_working_sessions WHERE id=${id}`);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── STEP File Upload ──────────────────────────────────────────────────────────

router.post("/cost-working/sessions/:id/upload-step", upload.single("step_file"), async (req, res) => {
  const id = Number(req.params.id);
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const existing = await db.execute(sql`SELECT step_file_path FROM cost_working_sessions WHERE id=${id}`);
    const oldPath = (existing.rows[0] as any)?.step_file_path;
    if (oldPath && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    const r = await db.execute(sql`
      UPDATE cost_working_sessions
      SET step_file_name=${req.file.originalname}, step_file_path=${req.file.path}
      WHERE id=${id} RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/cost-working/sessions/:id/step-download", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const r = await db.execute(sql`SELECT step_file_name, step_file_path FROM cost_working_sessions WHERE id=${id}`);
    const row = r.rows[0] as any;
    if (!row?.step_file_path || !fs.existsSync(row.step_file_path))
      return res.status(404).json({ error: "File not found" });
    res.download(row.step_file_path, row.step_file_name || "drawing.step");
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Items ─────────────────────────────────────────────────────────────────────

router.get("/cost-working/sessions/:id/items", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const r = await db.execute(sql`
      SELECT * FROM cost_working_items WHERE session_id=${id} ORDER BY created_at ASC
    `);
    res.json(r.rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/cost-working/sessions/:id/items", async (req, res) => {
  const session_id = Number(req.params.id);
  const { part_name, material_category, description, quantity, unit_price, erp_po_no, erp_item_code, supplier, uom, source, notes } = req.body;
  if (!part_name) return res.status(400).json({ error: "part_name required" });
  try {
    const r = await db.execute(sql`
      INSERT INTO cost_working_items
        (session_id, part_name, material_category, description, quantity, unit_price, erp_po_no, erp_item_code, supplier, uom, source, notes)
      VALUES
        (${session_id}, ${part_name}, ${material_category ?? "General"}, ${description ?? null},
         ${Number(quantity) || 1}, ${Number(unit_price) || 0},
         ${erp_po_no ?? null}, ${erp_item_code ?? null}, ${supplier ?? null},
         ${uom ?? "Nos"}, ${source ?? "manual"}, ${notes ?? null})
      RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/cost-working/items/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { part_name, material_category, description, quantity, unit_price, erp_po_no, erp_item_code, supplier, uom, notes } = req.body;
  try {
    const r = await db.execute(sql`
      UPDATE cost_working_items SET
        part_name=${part_name}, material_category=${material_category ?? "General"},
        description=${description ?? null}, quantity=${Number(quantity) || 1},
        unit_price=${Number(unit_price) || 0}, erp_po_no=${erp_po_no ?? null},
        erp_item_code=${erp_item_code ?? null}, supplier=${supplier ?? null},
        uom=${uom ?? "Nos"}, notes=${notes ?? null}
      WHERE id=${id} RETURNING *
    `);
    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/cost-working/items/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await db.execute(sql`DELETE FROM cost_working_items WHERE id=${id}`);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── ERP Data ──────────────────────────────────────────────────────────────────

router.get("/cost-working/erp/projects", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_project");
    const raw: string = data?.message ?? "";
    const projects = raw.trim().split("\n").filter(Boolean).map(line => {
      const parts = line.split(" - ", 2);
      return { code: parts[0].trim(), name: parts[1]?.trim() ?? parts[0].trim() };
    });
    res.json({ projects });
  } catch (e: any) {
    res.status(502).json({ error: e.message, projects: [] });
  }
});

router.get("/cost-working/erp/purchase-orders", async (req, res) => {
  const project = (req.query.project as string) || "";
  try {
    const params = new URLSearchParams({
      fields: JSON.stringify(["name", "supplier", "status", "grand_total", "transaction_date", "project"]),
      filters: JSON.stringify([
        ["docstatus", "=", 1],
        ...(project ? [["project", "like", `%${project}%`]] : []),
      ]),
      limit_page_length: "200",
      order_by: "transaction_date desc",
    });
    const url = `${ERP_URL}/api/resource/Purchase Order?${params}`;
    const r = await fetch(url, { headers: { Authorization: ERP_AUTH() } });
    if (!r.ok) throw new Error(`ERP ${r.status}`);
    const json = await r.json();
    res.json({ purchase_orders: json.data ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e.message, purchase_orders: [] });
  }
});

router.get("/cost-working/erp/po-items/:poName", async (req, res) => {
  const poName = req.params.poName;
  try {
    const url = `${ERP_URL}/api/resource/Purchase Order/${encodeURIComponent(poName)}`;
    const r = await fetch(url, { headers: { Authorization: ERP_AUTH() } });
    if (!r.ok) throw new Error(`ERP ${r.status}`);
    const json = await r.json();
    const doc = json.data ?? {};
    const items = (doc.items ?? []).map((it: any) => ({
      item_code: it.item_code,
      item_name: it.item_name,
      description: it.description,
      qty: it.qty,
      rate: it.rate,
      amount: it.amount,
      uom: it.uom,
      supplier: doc.supplier,
      po_name: poName,
    }));
    res.json({ items });
  } catch (e: any) {
    res.status(502).json({ error: e.message, items: [] });
  }
});

export default router;
