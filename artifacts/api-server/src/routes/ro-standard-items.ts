import { Router } from "express";
import { pool } from "@workspace/db";

const router = Router();

pool.query(`
  CREATE TABLE IF NOT EXISTS ro_standard_items (
    id SERIAL PRIMARY KEY,
    item_code TEXT NOT NULL UNIQUE,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Membrane',
    make TEXT,
    model TEXT,
    specifications TEXT,
    unit TEXT NOT NULL DEFAULT 'No.',
    standard_qty NUMERIC(10,3),
    unit_rate NUMERIC(14,2),
    remarks TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`).catch(console.error);

router.get("/ro-standard-items", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM ro_standard_items WHERE is_active = TRUE ORDER BY category, item_name"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

router.get("/ro-standard-items/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM ro_standard_items WHERE id = $1",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

router.post("/ro-standard-items", async (req, res) => {
  const {
    item_code, item_name, category, make, model,
    specifications, unit, standard_qty, unit_rate, remarks,
  } = req.body;

  if (!item_code || !item_name) {
    return res.status(400).json({ error: "item_code and item_name required" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO ro_standard_items
        (item_code, item_name, category, make, model, specifications, unit, standard_qty, unit_rate, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        item_code, item_name, category ?? "Membrane",
        make ?? null, model ?? null, specifications ?? null,
        unit ?? "No.", standard_qty ?? null, unit_rate ?? null,
        remarks ?? null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Item code already exists" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create item" });
  }
});

router.patch("/ro-standard-items/:id", async (req, res) => {
  const {
    item_code, item_name, category, make, model,
    specifications, unit, standard_qty, unit_rate, remarks, is_active,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE ro_standard_items SET
        item_code = COALESCE($1, item_code),
        item_name = COALESCE($2, item_name),
        category = COALESCE($3, category),
        make = $4,
        model = $5,
        specifications = $6,
        unit = COALESCE($7, unit),
        standard_qty = $8,
        unit_rate = $9,
        remarks = $10,
        is_active = COALESCE($11, is_active)
       WHERE id = $12 RETURNING *`,
      [
        item_code ?? null, item_name ?? null, category ?? null,
        make ?? null, model ?? null, specifications ?? null,
        unit ?? null, standard_qty ?? null, unit_rate ?? null,
        remarks ?? null, is_active ?? null,
        req.params.id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Item code already exists" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

router.delete("/ro-standard-items/:id", async (req, res) => {
  try {
    await pool.query(
      "UPDATE ro_standard_items SET is_active = FALSE WHERE id = $1",
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
