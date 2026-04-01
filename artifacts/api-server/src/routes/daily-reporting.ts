import { Router } from "express";

const router = Router();

const ERP_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const auth = () => `token ${process.env.ERPNEXT_API_KEY}:${process.env.ERPNEXT_API_SECRET}`;
function isConfigured() { return !!(ERP_URL && process.env.ERPNEXT_API_KEY && process.env.ERPNEXT_API_SECRET); }

// ─── List Daily Reports ───────────────────────────────────────────────────────
router.get("/daily-reporting", async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: "ERPNext not configured" });

  const { from_date, to_date, employee, department, status, limit = "50", page = "0" } = req.query as Record<string, string>;

  try {
    const fields = JSON.stringify([
      "name", "employee", "employee_name", "department",
      "date", "status", "modified", "creation",
    ]);

    const filters: any[] = [];
    if (from_date) filters.push(["Daily Reporting", "date", ">=", from_date]);
    if (to_date) filters.push(["Daily Reporting", "date", "<=", to_date]);
    if (employee) filters.push(["Daily Reporting", "employee_name", "like", `%${employee}%`]);
    if (department) filters.push(["Daily Reporting", "department", "like", `%${department}%`]);
    if (status) filters.push(["Daily Reporting", "status", "=", status]);

    const params = new URLSearchParams({
      fields,
      limit_page_length: limit,
      limit_start: String(Number(page) * Number(limit)),
      order_by: "date desc, creation desc",
    });
    if (filters.length) params.set("filters", JSON.stringify(filters));

    const r = await fetch(`${ERP_URL}/api/resource/Daily Reporting?${params}`, {
      headers: { Authorization: auth() },
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(r.status).json({ error: `ERPNext error: ${text.slice(0, 200)}` });
    }

    const json = await r.json() as { data: any[] };
    res.json({ reports: json.data || [] });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Single Daily Report Detail ───────────────────────────────────────────────
router.get("/daily-reporting/:name", async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: "ERPNext not configured" });

  const { name } = req.params;
  try {
    const r = await fetch(`${ERP_URL}/api/resource/Daily Reporting/${encodeURIComponent(name)}`, {
      headers: { Authorization: auth() },
    });

    if (!r.ok) return res.status(r.status).json({ error: "Report not found" });

    const json = await r.json() as { data: any };
    res.json({ report: json.data });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
