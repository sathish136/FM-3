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

// Operator lookup by 2-digit prefix (based on TRAI numbering plan)
const PREFIX2_OPERATOR: Record<string, string> = {
  // Jio: all 6-series
  "60": "Jio", "61": "Jio", "62": "Jio", "63": "Jio", "64": "Jio",
  "65": "Jio", "66": "Jio", "67": "Jio", "68": "Jio", "69": "Jio",
  // 7-series
  "70": "Airtel", "71": "Airtel", "72": "Jio",   "73": "Vi",
  "74": "Airtel", "75": "Vi",     "76": "Airtel", "77": "Airtel",
  "78": "Airtel", "79": "Airtel",
  // 8-series
  "80": "Jio",    "81": "Airtel", "82": "Vi",     "83": "Airtel",
  "84": "Vi",     "85": "Vi",     "86": "Vi",     "87": "BSNL",
  "88": "Vi",     "89": "Jio",
  // 9-series
  "90": "BSNL",   "91": "Airtel", "92": "Airtel", "93": "Airtel",
  "94": "BSNL",   "95": "Vi",     "96": "Vi",     "97": "Airtel",
  "98": "Airtel", "99": "Airtel",
};

// Known 4-digit prefixes that override the 2-digit map
const PREFIX4_OPERATOR: Record<string, string> = {
  // Jio 7-series overrides
  "7000": "Jio", "7001": "Jio", "7002": "Jio", "7003": "Jio",
  "7200": "Jio", "7201": "Jio", "7202": "Jio", "7203": "Jio",
  "7204": "Jio", "7205": "Jio", "7206": "Jio", "7207": "Jio",
  "7208": "Jio", "7209": "Jio", "7210": "Jio", "7211": "Jio",
  "7212": "Jio", "7213": "Jio", "7214": "Jio", "7215": "Jio",
  // BSNL specific known series
  "7005": "BSNL", "7006": "BSNL", "7007": "BSNL", "7009": "BSNL",
  "9000": "BSNL", "9001": "BSNL", "9002": "BSNL", "9003": "BSNL",
  "9004": "BSNL", "9005": "BSNL", "9007": "BSNL", "9009": "BSNL",
  "9434": "BSNL", "9435": "BSNL", "9436": "BSNL", "9476": "BSNL",
  "9832": "BSNL", "9862": "BSNL", "9856": "BSNL", "9857": "BSNL",
  "9858": "BSNL", "9895": "BSNL", "9896": "BSNL", "9897": "BSNL",
  "9447": "BSNL", "9446": "BSNL", "9400": "BSNL", "9496": "BSNL",
  // Vi specific known series
  "8800": "Vi", "8801": "Vi", "8802": "Vi", "8803": "Vi",
  "9811": "Vi", "9312": "Vi", "9810": "Airtel",
};

function detectOperatorFromMobile(mobile: string): string {
  const num = mobile.replace(/\D/g, "");
  if (num.length < 10) return "Unknown";

  const p4 = num.slice(0, 4);
  if (PREFIX4_OPERATOR[p4]) return PREFIX4_OPERATOR[p4];

  const p2 = num.slice(0, 2);
  return PREFIX2_OPERATOR[p2] || "Unknown";
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
