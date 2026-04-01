import { Router } from "express";

const router = Router();

const ERP_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const auth = () => `token ${process.env.ERPNEXT_API_KEY}:${process.env.ERPNEXT_API_SECRET}`;
function isConfigured() { return !!(ERP_URL && process.env.ERPNEXT_API_KEY && process.env.ERPNEXT_API_SECRET); }

// ─── List Daily Reports ───────────────────────────────────────────────────────
router.get("/daily-reporting", async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: "ERPNext not configured" });

  const { from_date, to_date, employee, department, status, limit = "30", page = "0" } = req.query as Record<string, string>;

  try {
    const fields = JSON.stringify([
      "name", "employee", "employee_name", "department",
      "date", "status", "modified", "creation",
    ]);

    // Only use non-reserved fields in ERPNext filters
    const filters: any[] = [];
    if (employee) filters.push(["Daily Reporting", "employee_name", "like", `%${employee}%`]);
    if (department) filters.push(["Daily Reporting", "department", "like", `%${department}%`]);
    if (status) filters.push(["Daily Reporting", "status", "=", status]);

    // Fetch a larger batch to accommodate server-side date filtering + pagination
    const fetchLimit = from_date || to_date ? "500" : limit;
    const fetchStart = from_date || to_date ? "0" : String(Number(page) * Number(limit));

    const params = new URLSearchParams({
      fields,
      limit_page_length: fetchLimit,
      limit_start: fetchStart,
      order_by: "creation desc",
    });
    if (filters.length) params.set("filters", JSON.stringify(filters));

    const r = await fetch(`${ERP_URL}/api/resource/Daily Reporting?${params}`, {
      headers: { Authorization: auth() },
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(r.status).json({ error: `ERPNext error: ${text.slice(0, 300)}` });
    }

    const json = await r.json() as { data: any[] };
    let rows: any[] = json.data || [];

    // Server-side date filtering (since "date" is a reserved SQL keyword in ERPNext filters)
    if (from_date) rows = rows.filter(r => r.date && r.date >= from_date);
    if (to_date) rows = rows.filter(r => r.date && r.date <= to_date);

    // Sort by date desc then creation desc
    rows.sort((a, b) => {
      const da = a.date || a.creation || "";
      const db = b.date || b.creation || "";
      return db.localeCompare(da);
    });

    // Paginate after filtering
    const pageNum = Number(page);
    const pageSize = Number(limit);
    const start = pageNum * pageSize;
    const paged = rows.slice(start, start + pageSize + 1);
    const hasMore = paged.length > pageSize;

    res.json({ reports: paged.slice(0, pageSize), hasMore, total: rows.length });
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
