import { Router } from "express";
import { pool } from "@workspace/db";
import { isErpNextConfigured, authHeader } from "../lib/erpnext";

const router = Router();

pool.query(`
  CREATE TABLE IF NOT EXISTS cost_working (
    id SERIAL PRIMARY KEY,
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
  ALTER TABLE cost_working ADD COLUMN IF NOT EXISTS erp_name TEXT UNIQUE;
`).catch(console.error);

router.get("/cost-working", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM cost_working ORDER BY date DESC, created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch cost workings" });
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

router.post("/cost-working/sync", async (_req, res) => {
  if (!isErpNextConfigured()) {
    return res.status(503).json({ error: "ERPNext is not configured (ERPNEXT_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET required)" });
  }
  try {
    const erpUrl = process.env.ERPNEXT_URL!.replace(/\/$/, "");
    const fields = JSON.stringify([
      "name", "quotation_to", "party_name", "transaction_date",
      "grand_total", "net_total", "status",
    ]);
    const url = `${erpUrl}/api/resource/Quotation?fields=${encodeURIComponent(fields)}&limit_page_length=500&order_by=transaction_date desc`;
    const r = await fetch(url, { headers: { Authorization: authHeader() } });
    if (!r.ok) throw new Error(`ERPNext returned ${r.status}`);
    const json = await r.json();
    const rows: any[] = json.data ?? [];
    const MAX_NUMERIC = 999_999_999_999.99;
    let synced = 0;
    for (const row of rows) {
      const netTotal = Math.min(Number(row.net_total ?? 0), MAX_NUMERIC);
      const grandTotal = Math.min(Number(row.grand_total ?? 0), MAX_NUMERIC);
      const gstAmt = grandTotal - netTotal;
      const gstPct = Math.min(netTotal > 0 ? Math.round((gstAmt / netTotal) * 100) : 18, 100);
      try {
        await pool.query(
          `INSERT INTO cost_working
            (erp_name, quote_no, project_name, customer, date, equipment_cost, gst_pct, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (erp_name) DO UPDATE SET
             quote_no = EXCLUDED.quote_no,
             project_name = EXCLUDED.project_name,
             customer = EXCLUDED.customer,
             date = EXCLUDED.date,
             equipment_cost = EXCLUDED.equipment_cost,
             gst_pct = EXCLUDED.gst_pct,
             status = EXCLUDED.status`,
          [
            row.name,
            row.name,
            row.name,
            row.party_name ?? "—",
            row.transaction_date ?? null,
            netTotal,
            gstPct,
            row.status === "Submitted" ? "Sent" : row.status === "Cancelled" ? "Lost" : "Draft",
          ]
        );
        synced++;
      } catch (rowErr: any) {
        console.warn(`Skipping ERP row ${row.name}:`, rowErr.message);
      }
    }
    res.json({ ok: true, synced });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Sync failed" });
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
