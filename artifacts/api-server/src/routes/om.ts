import { Router } from "express";
import { db, sql } from "@db";
import { authHeader, isErpConfigured } from "../lib/erpnext";

const router = Router();
const ERPNEXT_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");

// ── Table Init ────────────────────────────────────────────────────────────────
(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS om_chemical_consumption (
        id              SERIAL PRIMARY KEY,
        site_name       TEXT NOT NULL,
        project_number  TEXT,
        date            DATE NOT NULL,
        chemical_name   TEXT NOT NULL,
        chemical_type   TEXT,
        unit            TEXT NOT NULL DEFAULT 'kg',
        quantity_used   NUMERIC(12,3) NOT NULL DEFAULT 0,
        cost_per_unit   NUMERIC(12,2),
        total_cost      NUMERIC(12,2),
        operator_name   TEXT,
        remarks         TEXT,
        created_by      TEXT,
        created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS om_lab_reports (
        id                SERIAL PRIMARY KEY,
        site_name         TEXT NOT NULL,
        project_number    TEXT,
        report_date       DATE NOT NULL,
        sample_point      TEXT,
        sample_type       TEXT NOT NULL DEFAULT 'treated',
        ph                NUMERIC(5,2),
        turbidity         NUMERIC(10,3),
        tds               NUMERIC(10,2),
        hardness          NUMERIC(10,2),
        alkalinity        NUMERIC(10,2),
        chlorine_free     NUMERIC(10,3),
        chlorine_total    NUMERIC(10,3),
        bod               NUMERIC(10,2),
        cod               NUMERIC(10,2),
        tss               NUMERIC(10,2),
        toc               NUMERIC(10,2),
        conductivity      NUMERIC(10,2),
        salinity          NUMERIC(10,3),
        lab_technician    TEXT,
        remarks           TEXT,
        created_by        TEXT,
        created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS om_site_performance (
        id                      SERIAL PRIMARY KEY,
        site_name               TEXT NOT NULL,
        project_number          TEXT,
        report_date             DATE NOT NULL,
        period_type             TEXT NOT NULL DEFAULT 'daily',
        inflow_m3               NUMERIC(12,2),
        outflow_m3              NUMERIC(12,2),
        recovery_pct            NUMERIC(5,2),
        plant_availability_pct  NUMERIC(5,2),
        energy_kwh              NUMERIC(12,2),
        specific_energy         NUMERIC(10,3),
        chemical_cost           NUMERIC(12,2),
        operational_hours       NUMERIC(5,2),
        downtime_hours          NUMERIC(5,2),
        downtime_reason         TEXT,
        remarks                 TEXT,
        created_by              TEXT,
        created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log("O&M tables ready");
  } catch (e) {
    console.error("O&M table init error:", e);
  }
})();

// ── Sites (from ERPNext) ──────────────────────────────────────────────────────
router.get("/om/sites", async (req, res) => {
  try {
    if (!isErpConfigured() || !ERPNEXT_URL) {
      return res.json({ data: [] });
    }
    const params = new URLSearchParams({
      fields: JSON.stringify(["name", "project_name", "status", "customer"]),
      filters: JSON.stringify([["Project", "status", "in", ["On going", "Open"]]]),
      limit_page_length: "500",
      order_by: "project_name asc",
    });
    const resp = await fetch(`${ERPNEXT_URL}/api/resource/Project?${params}`, {
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    });
    if (!resp.ok) return res.json({ data: [] });
    const json = await resp.json();
    const sites = (json.data || []).map((p: any) => ({
      code: p.name,
      name: p.project_name || p.name,
      customer: p.customer,
      status: p.status,
    }));
    res.json({ data: sites });
  } catch (e) {
    res.json({ data: [] });
  }
});

// ── Chemical Consumption ──────────────────────────────────────────────────────
router.get("/om/chemical-consumption", async (req, res) => {
  try {
    const { site, from, to } = req.query as Record<string, string>;
    let q = `SELECT * FROM om_chemical_consumption WHERE 1=1`;
    const params: any[] = [];
    if (site)  { params.push(site);  q += ` AND site_name = $${params.length}`; }
    if (from)  { params.push(from);  q += ` AND date >= $${params.length}`; }
    if (to)    { params.push(to);    q += ` AND date <= $${params.length}`; }
    q += ` ORDER BY date DESC, id DESC`;
    const r = await db.execute(sql.raw(q, params));
    res.json({ data: (r as any).rows ?? r });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/om/chemical-consumption", async (req, res) => {
  try {
    const b = req.body;
    const n = (v: any) => (v === "" || v === undefined) ? null : v;
    const r = await db.execute(sql`
      INSERT INTO om_chemical_consumption
        (site_name, project_number, date, chemical_name, chemical_type, unit,
         quantity_used, cost_per_unit, total_cost, operator_name, remarks, created_by)
      VALUES
        (${b.site_name}, ${n(b.project_number)}, ${b.date}, ${b.chemical_name}, ${n(b.chemical_type)},
         ${b.unit || "kg"}, ${Number(b.quantity_used) || 0}, ${n(b.cost_per_unit)},
         ${n(b.total_cost)}, ${n(b.operator_name)}, ${n(b.remarks)}, ${n(b.created_by)})
      RETURNING *
    `);
    res.json(((r as any).rows ?? r)[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/om/chemical-consumption/:id", async (req, res) => {
  try {
    const b = req.body;
    const n = (v: any) => (v === "" || v === undefined) ? null : v;
    const r = await db.execute(sql`
      UPDATE om_chemical_consumption SET
        site_name=${b.site_name}, project_number=${n(b.project_number)}, date=${b.date},
        chemical_name=${b.chemical_name}, chemical_type=${n(b.chemical_type)}, unit=${b.unit || "kg"},
        quantity_used=${Number(b.quantity_used) || 0}, cost_per_unit=${n(b.cost_per_unit)},
        total_cost=${n(b.total_cost)}, operator_name=${n(b.operator_name)},
        remarks=${n(b.remarks)}, updated_at=NOW()
      WHERE id=${Number(req.params.id)} RETURNING *
    `);
    const rows = (r as any).rows ?? r;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/om/chemical-consumption/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM om_chemical_consumption WHERE id=${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Lab Reports ───────────────────────────────────────────────────────────────
router.get("/om/lab-reports", async (req, res) => {
  try {
    const { site, from, to } = req.query as Record<string, string>;
    let q = `SELECT * FROM om_lab_reports WHERE 1=1`;
    const params: any[] = [];
    if (site)  { params.push(site);  q += ` AND site_name = $${params.length}`; }
    if (from)  { params.push(from);  q += ` AND report_date >= $${params.length}`; }
    if (to)    { params.push(to);    q += ` AND report_date <= $${params.length}`; }
    q += ` ORDER BY report_date DESC, id DESC`;
    const r = await db.execute(sql.raw(q, params));
    res.json({ data: (r as any).rows ?? r });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/om/lab-reports", async (req, res) => {
  try {
    const b = req.body;
    const n = (v: any) => (v === "" || v === undefined || v === null) ? null : Number(v);
    const s = (v: any) => (v === "" || v === undefined) ? null : v;
    const r = await db.execute(sql`
      INSERT INTO om_lab_reports
        (site_name, project_number, report_date, sample_point, sample_type,
         ph, turbidity, tds, hardness, alkalinity, chlorine_free, chlorine_total,
         bod, cod, tss, toc, conductivity, salinity, lab_technician, remarks, created_by)
      VALUES
        (${b.site_name}, ${s(b.project_number)}, ${b.report_date}, ${s(b.sample_point)}, ${b.sample_type || "treated"},
         ${n(b.ph)}, ${n(b.turbidity)}, ${n(b.tds)}, ${n(b.hardness)}, ${n(b.alkalinity)},
         ${n(b.chlorine_free)}, ${n(b.chlorine_total)}, ${n(b.bod)}, ${n(b.cod)}, ${n(b.tss)},
         ${n(b.toc)}, ${n(b.conductivity)}, ${n(b.salinity)},
         ${s(b.lab_technician)}, ${s(b.remarks)}, ${s(b.created_by)})
      RETURNING *
    `);
    res.json(((r as any).rows ?? r)[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/om/lab-reports/:id", async (req, res) => {
  try {
    const b = req.body;
    const n = (v: any) => (v === "" || v === undefined || v === null) ? null : Number(v);
    const s = (v: any) => (v === "" || v === undefined) ? null : v;
    const r = await db.execute(sql`
      UPDATE om_lab_reports SET
        site_name=${b.site_name}, project_number=${s(b.project_number)}, report_date=${b.report_date},
        sample_point=${s(b.sample_point)}, sample_type=${b.sample_type || "treated"},
        ph=${n(b.ph)}, turbidity=${n(b.turbidity)}, tds=${n(b.tds)}, hardness=${n(b.hardness)},
        alkalinity=${n(b.alkalinity)}, chlorine_free=${n(b.chlorine_free)}, chlorine_total=${n(b.chlorine_total)},
        bod=${n(b.bod)}, cod=${n(b.cod)}, tss=${n(b.tss)}, toc=${n(b.toc)},
        conductivity=${n(b.conductivity)}, salinity=${n(b.salinity)},
        lab_technician=${s(b.lab_technician)}, remarks=${s(b.remarks)}, updated_at=NOW()
      WHERE id=${Number(req.params.id)} RETURNING *
    `);
    const rows = (r as any).rows ?? r;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/om/lab-reports/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM om_lab_reports WHERE id=${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ── Site Performance ──────────────────────────────────────────────────────────
router.get("/om/site-performance", async (req, res) => {
  try {
    const { site, from, to } = req.query as Record<string, string>;
    let q = `SELECT * FROM om_site_performance WHERE 1=1`;
    const params: any[] = [];
    if (site)  { params.push(site);  q += ` AND site_name = $${params.length}`; }
    if (from)  { params.push(from);  q += ` AND report_date >= $${params.length}`; }
    if (to)    { params.push(to);    q += ` AND report_date <= $${params.length}`; }
    q += ` ORDER BY report_date DESC, id DESC`;
    const r = await db.execute(sql.raw(q, params));
    res.json({ data: (r as any).rows ?? r });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/om/site-performance", async (req, res) => {
  try {
    const b = req.body;
    const n = (v: any) => (v === "" || v === undefined || v === null) ? null : Number(v);
    const s = (v: any) => (v === "" || v === undefined) ? null : v;
    const r = await db.execute(sql`
      INSERT INTO om_site_performance
        (site_name, project_number, report_date, period_type,
         inflow_m3, outflow_m3, recovery_pct, plant_availability_pct,
         energy_kwh, specific_energy, chemical_cost,
         operational_hours, downtime_hours, downtime_reason, remarks, created_by)
      VALUES
        (${b.site_name}, ${s(b.project_number)}, ${b.report_date}, ${b.period_type || "daily"},
         ${n(b.inflow_m3)}, ${n(b.outflow_m3)}, ${n(b.recovery_pct)}, ${n(b.plant_availability_pct)},
         ${n(b.energy_kwh)}, ${n(b.specific_energy)}, ${n(b.chemical_cost)},
         ${n(b.operational_hours)}, ${n(b.downtime_hours)}, ${s(b.downtime_reason)},
         ${s(b.remarks)}, ${s(b.created_by)})
      RETURNING *
    `);
    res.json(((r as any).rows ?? r)[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/om/site-performance/:id", async (req, res) => {
  try {
    const b = req.body;
    const n = (v: any) => (v === "" || v === undefined || v === null) ? null : Number(v);
    const s = (v: any) => (v === "" || v === undefined) ? null : v;
    const r = await db.execute(sql`
      UPDATE om_site_performance SET
        site_name=${b.site_name}, project_number=${s(b.project_number)}, report_date=${b.report_date},
        period_type=${b.period_type || "daily"}, inflow_m3=${n(b.inflow_m3)}, outflow_m3=${n(b.outflow_m3)},
        recovery_pct=${n(b.recovery_pct)}, plant_availability_pct=${n(b.plant_availability_pct)},
        energy_kwh=${n(b.energy_kwh)}, specific_energy=${n(b.specific_energy)},
        chemical_cost=${n(b.chemical_cost)}, operational_hours=${n(b.operational_hours)},
        downtime_hours=${n(b.downtime_hours)}, downtime_reason=${s(b.downtime_reason)},
        remarks=${s(b.remarks)}, updated_at=NOW()
      WHERE id=${Number(req.params.id)} RETURNING *
    `);
    const rows = (r as any).rows ?? r;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/om/site-performance/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM om_site_performance WHERE id=${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

export default router;
