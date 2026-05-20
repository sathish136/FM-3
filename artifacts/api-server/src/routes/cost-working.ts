import { Router } from "express";
import { pool } from "@workspace/db";
import { isErpNextConfigured, authHeader } from "../lib/erpnext";

const router = Router();

const ERPNEXT_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const DOCTYPE = "Cost Working Tool";

pool.query(`
  CREATE TABLE IF NOT EXISTS cost_working (
    id SERIAL PRIMARY KEY,
    erp_name TEXT UNIQUE,
    quote_no TEXT NOT NULL,
    project_name TEXT NOT NULL,
    customer TEXT NOT NULL,
    date DATE,
    capacity TEXT,
    plant_type TEXT,
    equipment_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
    civil_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
    erection_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
    electrical_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
    piping_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
    commissioning_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
    others_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
    margin_pct NUMERIC(6,2) NOT NULL DEFAULT 20,
    discount_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
    gst_pct NUMERIC(6,2) NOT NULL DEFAULT 18,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ALTER TABLE cost_working ADD COLUMN IF NOT EXISTS erp_name TEXT;
  CREATE UNIQUE INDEX IF NOT EXISTS cost_working_erp_name_uidx ON cost_working(erp_name) WHERE erp_name IS NOT NULL;
`).catch(console.error);

async function erpFetch(path: string) {
  const res = await fetch(`${ERPNEXT_URL}${path}`, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERPNext ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

router.get("/cost-working", async (_req, res) => {
  if (isErpNextConfigured()) {
    try {
      const fields = JSON.stringify([
        "name", "project", "startup_sheet", "flow", "revision",
        "exchange_rate_usd", "exchange_rate_eur", "modified", "creation",
        "docstatus",
      ]);
      const params = new URLSearchParams({
        fields,
        limit_page_length: "500",
        order_by: "modified desc",
      });
      const json = await erpFetch(`/api/resource/${encodeURIComponent(DOCTYPE)}?${params}`);
      return res.json({ source: "erp", data: json.data ?? [] });
    } catch (err: any) {
      console.error("ERPNext list fetch failed:", err.message);
    }
  }
  try {
    const { rows } = await pool.query(
      "SELECT * FROM cost_working ORDER BY date DESC, created_at DESC"
    );
    res.json({ source: "local", data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch cost workings" });
  }
});

router.get("/cost-working/erp/:name", async (req, res) => {
  if (!isErpNextConfigured()) {
    return res.status(503).json({ error: "ERPNext not configured" });
  }
  try {
    const json = await erpFetch(
      `/api/resource/${encodeURIComponent(DOCTYPE)}/${encodeURIComponent(req.params.name)}`
    );
    res.json(json.data ?? json);
  } catch (err: any) {
    console.error("ERPNext doc fetch failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/cost-working/sync", async (_req, res) => {
  if (!isErpNextConfigured()) {
    return res.status(503).json({ error: "ERPNext not configured (ERPNEXT_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET required)" });
  }
  try {
    const fields = JSON.stringify([
      "name", "project", "startup_sheet", "flow", "revision",
      "exchange_rate_usd", "exchange_rate_eur", "modified", "creation",
    ]);
    const params = new URLSearchParams({
      fields,
      limit_page_length: "500",
      order_by: "modified desc",
    });
    const json = await erpFetch(`/api/resource/${encodeURIComponent(DOCTYPE)}?${params}`);
    const rows: any[] = json.data ?? [];
    let synced = 0;
    for (const row of rows) {
      try {
        await pool.query(
          `INSERT INTO cost_working (erp_name, quote_no, project_name, customer, date, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (erp_name) DO UPDATE SET
             quote_no = EXCLUDED.quote_no,
             project_name = EXCLUDED.project_name,
             date = EXCLUDED.date`,
          [
            row.name,
            row.name,
            row.project ?? row.name,
            row.startup_sheet ?? "—",
            row.creation ? row.creation.slice(0, 10) : null,
            "Synced",
          ]
        );
        synced++;
      } catch (rowErr: any) {
        console.warn(`Skipping row ${row.name}:`, rowErr.message);
      }
    }
    res.json({ ok: true, synced, total: rows.length });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Sync failed" });
  }
});

router.post("/cost-working/erp", async (req, res) => {
  if (!isErpNextConfigured()) {
    return res.status(503).json({ error: "ERPNext not configured" });
  }
  try {
    const r = await fetch(`${ERPNEXT_URL}/api/resource/${encodeURIComponent(DOCTYPE)}`, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    if (!r.ok) {
      const body = await r.text();
      return res.status(r.status).json({ error: body });
    }
    const json = await r.json();
    res.status(201).json(json.data ?? json);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/cost-working/erp/:name", async (req, res) => {
  if (!isErpNextConfigured()) {
    return res.status(503).json({ error: "ERPNext not configured" });
  }
  try {
    const r = await fetch(
      `${ERPNEXT_URL}/api/resource/${encodeURIComponent(DOCTYPE)}/${encodeURIComponent(req.params.name)}`,
      {
        method: "PUT",
        headers: { Authorization: authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      }
    );
    if (!r.ok) {
      const body = await r.text();
      return res.status(r.status).json({ error: body });
    }
    const json = await r.json();
    res.json(json.data ?? json);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/cost-working/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM cost_working WHERE id = $1",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch record" });
  }
});

router.post("/cost-working", async (req, res) => {
  const {
    quote_no, project_name, customer, date, capacity, plant_type,
    equipment_cost, civil_cost, erection_cost, electrical_cost,
    piping_cost, commissioning_cost, others_cost,
    margin_pct, discount_pct, gst_pct, notes, status,
  } = req.body;

  if (!quote_no || !project_name || !customer) {
    return res.status(400).json({ error: "quote_no, project_name, customer required" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO cost_working
        (quote_no, project_name, customer, date, capacity, plant_type,
         equipment_cost, civil_cost, erection_cost, electrical_cost,
         piping_cost, commissioning_cost, others_cost,
         margin_pct, discount_pct, gst_pct, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        quote_no, project_name, customer,
        date ?? null, capacity ?? null, plant_type ?? null,
        equipment_cost ?? 0, civil_cost ?? 0, erection_cost ?? 0,
        electrical_cost ?? 0, piping_cost ?? 0, commissioning_cost ?? 0,
        others_cost ?? 0, margin_pct ?? 20, discount_pct ?? 0,
        gst_pct ?? 18, notes ?? null, status ?? "Draft",
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create record" });
  }
});

router.patch("/cost-working/:id", async (req, res) => {
  const {
    quote_no, project_name, customer, date, capacity, plant_type,
    equipment_cost, civil_cost, erection_cost, electrical_cost,
    piping_cost, commissioning_cost, others_cost,
    margin_pct, discount_pct, gst_pct, notes, status,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE cost_working SET
        quote_no = COALESCE($1, quote_no),
        project_name = COALESCE($2, project_name),
        customer = COALESCE($3, customer),
        date = COALESCE($4, date),
        capacity = $5,
        plant_type = $6,
        equipment_cost = COALESCE($7, equipment_cost),
        civil_cost = COALESCE($8, civil_cost),
        erection_cost = COALESCE($9, erection_cost),
        electrical_cost = COALESCE($10, electrical_cost),
        piping_cost = COALESCE($11, piping_cost),
        commissioning_cost = COALESCE($12, commissioning_cost),
        others_cost = COALESCE($13, others_cost),
        margin_pct = COALESCE($14, margin_pct),
        discount_pct = COALESCE($15, discount_pct),
        gst_pct = COALESCE($16, gst_pct),
        notes = $17,
        status = COALESCE($18, status)
       WHERE id = $19 RETURNING *`,
      [
        quote_no ?? null, project_name ?? null, customer ?? null,
        date ?? null, capacity ?? null, plant_type ?? null,
        equipment_cost ?? null, civil_cost ?? null, erection_cost ?? null,
        electrical_cost ?? null, piping_cost ?? null, commissioning_cost ?? null,
        others_cost ?? null, margin_pct ?? null, discount_pct ?? null,
        gst_pct ?? null, notes ?? null, status ?? null,
        req.params.id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update record" });
  }
});

router.delete("/cost-working/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM cost_working WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
