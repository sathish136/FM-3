import { Router } from "express";
import { pool } from "@workspace/db";

const router = Router();

pool.query(`
  CREATE TABLE IF NOT EXISTS payment_subscriptions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'mobile',
    mobile_or_account TEXT,
    operator TEXT,
    plan_name TEXT,
    plan_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    validity_days INTEGER NOT NULL DEFAULT 30,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    auto_recharge BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS payment_history (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES payment_subscriptions(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    paid_date TEXT NOT NULL,
    method TEXT DEFAULT 'manual',
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS payment_followups (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES payment_subscriptions(id) ON DELETE CASCADE,
    followup_date TEXT NOT NULL,
    notes TEXT,
    done BOOLEAN NOT NULL DEFAULT false,
    done_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`).then(() => console.log("payment_tracker tables ready"))
  .catch((e: any) => console.error("payment_tracker tables error:", e.message));

function addDays(dateStr: string | null | undefined, days: number): string {
  const base = dateStr ? new Date(dateStr) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().split("T")[0];
}

function detectOperatorFromMobile(mobile: string): string {
  const num = mobile.replace(/\D/g, "");
  if (num.length < 10) return "Unknown";
  const prefix4 = parseInt(num.slice(0, 4));
  const prefix2 = parseInt(num.slice(0, 2));

  if ([6000,6001,6002,6003,6004,6005,6006,6007,6008,6009,6200,6201,6202,6203,6204,6205,6206,6207,6208,6209,6210,6211,6212,6213,6214,6215,6216,6217,6218,6219,6220,6221,6222,6223,6224,6225,6226,6227,6228,6229,6230,6231,6232,6233,6234,6235,6236,6237,6238,6239,6240,6241,6242,6243,6244,6245,6246,6247,6248,6249,6250,6251,6252,6253,6254,6255,6256,6257,6258,6259,6260,6261,6262,6263,6264,6265,6266,6267,6268,6269,6270,6271,6272,6273,6274,6275,6276,6277,6278,6279,6280,6281,6282,6283,6284,6285,6286,6287,6288,6289,6290,6291,6292,6293,6294,6295,6296,6297,6298,6299].includes(prefix4)) return "Jio";

  const jioStart = parseInt(num.slice(0, 1));
  if (jioStart === 6) return "Jio";

  const p3 = parseInt(num.slice(0, 3));
  if ([700,701,702,703,704,705,706,707,708,709,800,801,802,803,804,805,806,807,808,809,810,811,812,813,814,815,816,817,818,819,820,821,822,823,824,825,826,827,828,829].includes(p3)) {
    const subPrefix = parseInt(num.slice(0, 5));
    if (subPrefix >= 70000 && subPrefix <= 70019) return "BSNL";
    if (subPrefix >= 70200 && subPrefix <= 70299) return "Airtel";
    return "Airtel";
  }

  if (prefix2 === 99 || prefix2 === 98 || prefix2 === 97 || prefix2 === 96 || prefix2 === 95) return "Airtel";
  if (prefix2 === 90 || prefix2 === 91 || prefix2 === 92 || prefix2 === 93 || prefix2 === 94) return "Vi";
  if (prefix2 === 88 || prefix2 === 89) return "BSNL";

  return "Unknown";
}

router.get("/admin/payment-tracker/subscriptions", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*,
        (SELECT COUNT(*) FROM payment_history h WHERE h.subscription_id = s.id) AS payment_count,
        (SELECT COUNT(*) FROM payment_followups f WHERE f.subscription_id = s.id AND f.done = false) AS pending_followups
      FROM payment_subscriptions s
      ORDER BY s.due_date ASC NULLS LAST, s.created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/admin/payment-tracker/subscriptions", async (req, res) => {
  try {
    const { name, type, mobile_or_account, operator, plan_name, plan_amount, validity_days, due_date, notes } = req.body;
    const detectedOperator = operator || (type === "mobile" ? detectOperatorFromMobile(mobile_or_account || "") : "");
    const { rows } = await pool.query(
      `INSERT INTO payment_subscriptions (name, type, mobile_or_account, operator, plan_name, plan_amount, validity_days, due_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, type || "mobile", mobile_or_account, detectedOperator, plan_name, plan_amount || 0, validity_days || 30, due_date, notes]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/admin/payment-tracker/subscriptions/:id", async (req, res) => {
  try {
    const { name, type, mobile_or_account, operator, plan_name, plan_amount, validity_days, due_date, status, notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE payment_subscriptions SET name=$1, type=$2, mobile_or_account=$3, operator=$4, plan_name=$5, plan_amount=$6, validity_days=$7, due_date=$8, status=$9, notes=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [name, type, mobile_or_account, operator, plan_name, plan_amount, validity_days, due_date, status, notes, req.params.id]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/admin/payment-tracker/subscriptions/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM payment_subscriptions WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/admin/payment-tracker/subscriptions/:id/pay", async (req, res) => {
  try {
    const { amount, paid_date, method, reference, notes } = req.body;
    const subRes = await pool.query("SELECT * FROM payment_subscriptions WHERE id=$1", [req.params.id]);
    if (!subRes.rows.length) { res.status(404).json({ error: "Not found" }); return; }
    const sub = subRes.rows[0];
    const newDueDate = addDays(paid_date || sub.due_date, sub.validity_days || 30);
    await pool.query(
      `INSERT INTO payment_history (subscription_id, amount, paid_date, method, reference, notes) VALUES ($1,$2,$3,$4,$5,$6)`,
      [req.params.id, amount || sub.plan_amount, paid_date || new Date().toISOString().split("T")[0], method || "manual", reference, notes]
    );
    const { rows } = await pool.query(
      `UPDATE payment_subscriptions SET due_date=$1, status='active', updated_at=NOW() WHERE id=$2 RETURNING *`,
      [newDueDate, req.params.id]
    );
    res.json({ subscription: rows[0], new_due_date: newDueDate });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/admin/payment-tracker/subscriptions/:id/history", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM payment_history WHERE subscription_id=$1 ORDER BY paid_date DESC, created_at DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/admin/payment-tracker/subscriptions/:id/followups", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM payment_followups WHERE subscription_id=$1 ORDER BY followup_date ASC",
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/admin/payment-tracker/subscriptions/:id/followups", async (req, res) => {
  try {
    const { followup_date, notes } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO payment_followups (subscription_id, followup_date, notes) VALUES ($1,$2,$3) RETURNING *",
      [req.params.id, followup_date, notes]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/admin/payment-tracker/followups/:id/done", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE payment_followups SET done=true, done_at=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/admin/payment-tracker/lookup-mobile", async (req, res) => {
  try {
    const { mobile } = req.body as { mobile: string };
    const operator = detectOperatorFromMobile(mobile || "");
    res.json({ operator, mobile });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
