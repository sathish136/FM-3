import { Router } from "express";
import { pool } from "@workspace/db";
import { isErpNextConfigured, authHeader } from "../lib/erpnext";

const router = Router();

pool.query(`
  CREATE TABLE IF NOT EXISTS startup_sheets (
    id SERIAL PRIMARY KEY,
    site_name TEXT NOT NULL,
    startup_date DATE,
    plant_type TEXT NOT NULL DEFAULT 'RO',
    capacity_m3_per_day NUMERIC(10,2),
    feed_flow_lph NUMERIC(10,2),
    permeate_flow_lph NUMERIC(10,2),
    reject_flow_lph NUMERIC(10,2),
    feed_pressure_bar NUMERIC(6,2),
    op_pressure_bar NUMERIC(6,2),
    feed_tds_ppm NUMERIC(10,2),
    permeate_tds_ppm NUMERIC(10,2),
    feed_ph NUMERIC(4,2),
    permeate_ph NUMERIC(4,2),
    antiscalant_dose_ppm NUMERIC(8,2),
    chlorine_dose_ppm NUMERIC(8,2),
    chemical_notes TEXT,
    remarks TEXT,
    operator TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ALTER TABLE startup_sheets ADD COLUMN IF NOT EXISTS erp_name TEXT UNIQUE;
`).catch(console.error);

router.get("/startup-sheets", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM startup_sheets ORDER BY startup_date DESC, created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch startup sheets" });
  }
});

router.get("/startup-sheets/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM startup_sheets WHERE id = $1",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch record" });
  }
});

router.post("/startup-sheets/sync", async (_req, res) => {
  if (!isErpNextConfigured()) {
    return res.status(503).json({ error: "ERPNext is not configured (ERPNEXT_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET required)" });
  }
  try {
    const erpUrl = process.env.ERPNEXT_URL!.replace(/\/$/, "");
    const fields = JSON.stringify([
      "name", "site_name", "startup_date", "plant_type",
      "capacity_m3_per_day", "feed_flow_lph", "permeate_flow_lph", "reject_flow_lph",
      "feed_pressure_bar", "op_pressure_bar", "feed_tds_ppm", "permeate_tds_ppm",
      "feed_ph", "permeate_ph", "antiscalant_dose_ppm", "chlorine_dose_ppm",
      "chemical_notes", "remarks", "operator",
    ]);
    const url = `${erpUrl}/api/resource/Startup Sheet?fields=${encodeURIComponent(fields)}&limit_page_length=500`;
    const r = await fetch(url, { headers: { Authorization: authHeader() } });
    if (!r.ok) throw new Error(`ERPNext returned ${r.status}`);
    const json = await r.json();
    const rows: any[] = json.data ?? [];
    let synced = 0;
    for (const row of rows) {
      await pool.query(
        `INSERT INTO startup_sheets
          (erp_name, site_name, startup_date, plant_type,
           capacity_m3_per_day, feed_flow_lph, permeate_flow_lph, reject_flow_lph,
           feed_pressure_bar, op_pressure_bar, feed_tds_ppm, permeate_tds_ppm,
           feed_ph, permeate_ph, antiscalant_dose_ppm, chlorine_dose_ppm,
           chemical_notes, remarks, operator)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         ON CONFLICT (erp_name) DO UPDATE SET
           site_name = EXCLUDED.site_name,
           startup_date = EXCLUDED.startup_date,
           plant_type = EXCLUDED.plant_type,
           capacity_m3_per_day = EXCLUDED.capacity_m3_per_day,
           feed_flow_lph = EXCLUDED.feed_flow_lph,
           permeate_flow_lph = EXCLUDED.permeate_flow_lph,
           reject_flow_lph = EXCLUDED.reject_flow_lph,
           feed_pressure_bar = EXCLUDED.feed_pressure_bar,
           op_pressure_bar = EXCLUDED.op_pressure_bar,
           feed_tds_ppm = EXCLUDED.feed_tds_ppm,
           permeate_tds_ppm = EXCLUDED.permeate_tds_ppm,
           feed_ph = EXCLUDED.feed_ph,
           permeate_ph = EXCLUDED.permeate_ph,
           antiscalant_dose_ppm = EXCLUDED.antiscalant_dose_ppm,
           chlorine_dose_ppm = EXCLUDED.chlorine_dose_ppm,
           chemical_notes = EXCLUDED.chemical_notes,
           remarks = EXCLUDED.remarks,
           operator = EXCLUDED.operator`,
        [
          row.name, row.site_name, row.startup_date ?? null, row.plant_type ?? "RO",
          row.capacity_m3_per_day ?? null, row.feed_flow_lph ?? null,
          row.permeate_flow_lph ?? null, row.reject_flow_lph ?? null,
          row.feed_pressure_bar ?? null, row.op_pressure_bar ?? null,
          row.feed_tds_ppm ?? null, row.permeate_tds_ppm ?? null,
          row.feed_ph ?? null, row.permeate_ph ?? null,
          row.antiscalant_dose_ppm ?? null, row.chlorine_dose_ppm ?? null,
          row.chemical_notes ?? null, row.remarks ?? null, row.operator ?? null,
        ]
      );
      synced++;
    }
    res.json({ ok: true, synced });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Sync failed" });
  }
});

router.post("/startup-sheets", async (req, res) => {
  const {
    site_name, startup_date, plant_type, capacity_m3_per_day,
    feed_flow_lph, permeate_flow_lph, reject_flow_lph,
    feed_pressure_bar, op_pressure_bar,
    feed_tds_ppm, permeate_tds_ppm, feed_ph, permeate_ph,
    antiscalant_dose_ppm, chlorine_dose_ppm,
    chemical_notes, remarks, operator,
  } = req.body;

  if (!site_name) return res.status(400).json({ error: "site_name required" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO startup_sheets
        (site_name, startup_date, plant_type, capacity_m3_per_day, feed_flow_lph,
         permeate_flow_lph, reject_flow_lph, feed_pressure_bar, op_pressure_bar,
         feed_tds_ppm, permeate_tds_ppm, feed_ph, permeate_ph,
         antiscalant_dose_ppm, chlorine_dose_ppm, chemical_notes, remarks, operator)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        site_name, startup_date ?? null, plant_type ?? "RO",
        capacity_m3_per_day ?? null, feed_flow_lph ?? null,
        permeate_flow_lph ?? null, reject_flow_lph ?? null,
        feed_pressure_bar ?? null, op_pressure_bar ?? null,
        feed_tds_ppm ?? null, permeate_tds_ppm ?? null,
        feed_ph ?? null, permeate_ph ?? null,
        antiscalant_dose_ppm ?? null, chlorine_dose_ppm ?? null,
        chemical_notes ?? null, remarks ?? null, operator ?? null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create record" });
  }
});

router.patch("/startup-sheets/:id", async (req, res) => {
  const {
    site_name, startup_date, plant_type, capacity_m3_per_day,
    feed_flow_lph, permeate_flow_lph, reject_flow_lph,
    feed_pressure_bar, op_pressure_bar,
    feed_tds_ppm, permeate_tds_ppm, feed_ph, permeate_ph,
    antiscalant_dose_ppm, chlorine_dose_ppm,
    chemical_notes, remarks, operator,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE startup_sheets SET
        site_name = COALESCE($1, site_name),
        startup_date = COALESCE($2, startup_date),
        plant_type = COALESCE($3, plant_type),
        capacity_m3_per_day = $4,
        feed_flow_lph = $5,
        permeate_flow_lph = $6,
        reject_flow_lph = $7,
        feed_pressure_bar = $8,
        op_pressure_bar = $9,
        feed_tds_ppm = $10,
        permeate_tds_ppm = $11,
        feed_ph = $12,
        permeate_ph = $13,
        antiscalant_dose_ppm = $14,
        chlorine_dose_ppm = $15,
        chemical_notes = $16,
        remarks = $17,
        operator = $18
       WHERE id = $19 RETURNING *`,
      [
        site_name ?? null, startup_date ?? null, plant_type ?? null,
        capacity_m3_per_day ?? null, feed_flow_lph ?? null,
        permeate_flow_lph ?? null, reject_flow_lph ?? null,
        feed_pressure_bar ?? null, op_pressure_bar ?? null,
        feed_tds_ppm ?? null, permeate_tds_ppm ?? null,
        feed_ph ?? null, permeate_ph ?? null,
        antiscalant_dose_ppm ?? null, chlorine_dose_ppm ?? null,
        chemical_notes ?? null, remarks ?? null, operator ?? null,
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

router.delete("/startup-sheets/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM startup_sheets WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
