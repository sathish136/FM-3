import { Router } from "express";

const router = Router();

const ERP_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const auth = () => `token ${process.env.ERPNEXT_API_KEY}:${process.env.ERPNEXT_API_SECRET}`;
function isConfigured() { return !!(ERP_URL && process.env.ERPNEXT_API_KEY && process.env.ERPNEXT_API_SECRET); }

// ─── List Daily Reports ───────────────────────────────────────────────────────
// NOTE: "date" is a reserved SQL keyword in Frappe/ERPNext and cannot be used
// in fields[], filters[], or order_by. We fetch without it and pull it from
// the document name or the full detail endpoint.
router.get("/daily-reporting", async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: "ERPNext not configured" });

  const { from_date, to_date, employee, department, status, limit = "30", page = "0" } = req.query as Record<string, string>;

  try {
    // Avoid "date" in fields — it's a reserved SQL keyword in Frappe
    const fields = JSON.stringify([
      "name", "employee", "employee_name", "department",
      "status", "modified", "creation",
    ]);

    const filters: any[] = [];
    if (employee) filters.push(["Daily Reporting", "employee_name", "like", `%${employee}%`]);
    if (department) filters.push(["Daily Reporting", "department", "like", `%${department}%`]);
    if (status) filters.push(["Daily Reporting", "status", "=", status]);

    // Fetch larger batch when date range filter is requested (filter server-side)
    const needsDateFilter = !!(from_date || to_date);
    const fetchLimit = needsDateFilter ? "500" : String(Number(limit) + 1);
    const fetchStart = needsDateFilter ? "0" : String(Number(page) * Number(limit));

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

    // Extract date from document name (common ERPNext naming: DR-2026-03-01 or DR-2026-00001)
    // Also parse from creation as fallback
    rows = rows.map(row => {
      const dateFromName = row.name?.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || null;
      const dateFromCreation = row.creation ? row.creation.split(" ")[0] : null;
      return { ...row, date: dateFromName || dateFromCreation };
    });

    // Server-side date filtering
    if (from_date) rows = rows.filter(r => r.date && r.date >= from_date);
    if (to_date) rows = rows.filter(r => r.date && r.date <= to_date);

    // Sort by date desc
    rows.sort((a, b) => (b.date || b.creation || "").localeCompare(a.date || a.creation || ""));

    // Paginate
    const pageNum = Number(page);
    const pageSize = Number(limit);
    const start = needsDateFilter ? pageNum * pageSize : 0;
    const paged = rows.slice(start, start + pageSize + 1);
    const hasMore = paged.length > pageSize;

    res.json({ reports: paged.slice(0, pageSize), hasMore, total: rows.length });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Single Daily Report Detail ───────────────────────────────────────────────
// Full document fetch doesn't have the "date" field restriction
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
