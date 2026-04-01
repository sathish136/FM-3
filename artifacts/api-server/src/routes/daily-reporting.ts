import { Router } from "express";

const router = Router();

const ERP_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const auth = () => `token ${process.env.ERPNEXT_API_KEY}:${process.env.ERPNEXT_API_SECRET}`;
function isConfigured() { return !!(ERP_URL && process.env.ERPNEXT_API_KEY && process.env.ERPNEXT_API_SECRET); }

// Map Frappe docstatus integer to a human-readable label
function mapDocStatus(docstatus: number): string {
  if (docstatus === 1) return "Submitted";
  if (docstatus === 2) return "Cancelled";
  return "Draft";
}

// ─── List Daily Reports ───────────────────────────────────────────────────────
// IMPORTANT: Frappe blocks many field names as SQL reserved keywords in get_list:
//   "date", "status", "type", "order", "group", "key", "value", "interval" …
// Solution: only request guaranteed-safe meta fields, use docstatus for status,
// derive the date from the document name or creation timestamp,
// and do all filtering server-side.
router.get("/daily-reporting", async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: "ERPNext not configured" });

  const { from_date, to_date, employee, department, status, limit = "30", page = "0" } = req.query as Record<string, string>;

  try {
    // Only safe Frappe meta fields that don't conflict with SQL reserved words
    const fields = JSON.stringify([
      "name", "employee", "employee_name", "department",
      "docstatus", "modified", "creation",
    ]);

    // No ERPNext-side filters — all filtering done server-side to avoid keyword conflicts
    const params = new URLSearchParams({
      fields,
      limit_page_length: "500",
      limit_start: "0",
      order_by: "creation desc",
    });

    const r = await fetch(`${ERP_URL}/api/resource/Daily Reporting?${params}`, {
      headers: { Authorization: auth() },
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(r.status).json({ error: `ERPNext error: ${text.slice(0, 300)}` });
    }

    const json = await r.json() as { data: any[] };
    let rows: any[] = (json.data || []).map(row => ({
      ...row,
      // Derive date from document name (e.g. DR-2026-03-01) or creation timestamp
      date: row.name?.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || row.creation?.split(" ")[0] || null,
      // Map numeric docstatus to readable label
      status: mapDocStatus(row.docstatus),
    }));

    // Server-side filtering
    if (from_date) rows = rows.filter(r => r.date && r.date >= from_date);
    if (to_date)   rows = rows.filter(r => r.date && r.date <= to_date);
    if (employee)  rows = rows.filter(r => (r.employee_name || r.employee || "").toLowerCase().includes((employee as string).toLowerCase()));
    if (department) rows = rows.filter(r => (r.department || "").toLowerCase().includes((department as string).toLowerCase()));
    if (status)    rows = rows.filter(r => r.status === status);

    // Sort by derived date desc
    rows.sort((a, b) => (b.date || b.creation || "").localeCompare(a.date || a.creation || ""));

    // Paginate
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

// ─── Create New Daily Report ─────────────────────────────────────────────────
router.post("/daily-reporting", async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: "ERPNext not configured" });

  const { employee_name, date, activities = [] } = req.body;
  if (!employee_name || !date) return res.status(400).json({ error: "employee_name and date are required" });

  try {
    const docData: any = {
      doctype: "Daily Reporting",
      employee_name,
      date,
    };

    // Add activities as child table if provided
    if (Array.isArray(activities) && activities.length > 0) {
      const validRows = activities.filter(a => a.activity || a.project);
      if (validRows.length > 0) {
        docData.daily_reporting_detail = validRows.map((a: any) => ({
          doctype: "Daily Reporting Detail",
          activity: a.activity || "",
          project: a.project || "",
          no_of_hours: parseFloat(a.hours) || 0,
          remarks: a.remarks || "",
        }));
      }
    }

    const r = await fetch(`${ERP_URL}/api/resource/Daily Reporting`, {
      method: "POST",
      headers: { Authorization: auth(), "Content-Type": "application/json" },
      body: JSON.stringify(docData),
    });

    const json = await r.json() as any;
    if (!r.ok) return res.status(r.status).json({ error: json.exception || json.message || "Failed to create" });

    res.json({ name: json.data?.name, success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Single Daily Report Detail ───────────────────────────────────────────────
// Single document fetch uses a different Frappe endpoint that doesn't have the
// same field-name restrictions as get_list.
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
