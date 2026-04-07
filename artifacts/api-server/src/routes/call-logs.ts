import { Router } from "express";

const router = Router();

const ERP_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const auth = () => `token ${process.env.ERPNEXT_API_KEY}:${process.env.ERPNEXT_API_SECRET}`;
function isConfigured() { return !!(ERP_URL && process.env.ERPNEXT_API_KEY && process.env.ERPNEXT_API_SECRET); }

const PARENT_DOCTYPE = "HR Call Logs";
const CHILD_FIELD    = "hr_call_logs_table";

// ─── List all contacts (parent HR Call Logs docs) ────────────────────────────
router.get("/call-logs", async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: "ERPNext not configured" });

  try {
    const fields = JSON.stringify(["name", "phone_number"]);
    const params = new URLSearchParams({
      fields,
      limit_page_length: "500",
      order_by: "modified desc",
    });

    const r = await fetch(`${ERP_URL}/api/resource/${encodeURIComponent(PARENT_DOCTYPE)}?${params}`, {
      headers: { Authorization: auth() },
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(r.status).json({ error: text.slice(0, 300) });
    }

    const json = await r.json() as { data: any[] };
    const contacts = (json.data || []).map((d: any) => ({
      name: d.name,
      phone_number: d.phone_number || d.name,
    }));

    res.json({ contacts });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Get full call history for a phone number ────────────────────────────────
router.get("/call-logs/:phone", async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: "ERPNext not configured" });

  const { phone } = req.params;

  try {
    const r = await fetch(`${ERP_URL}/api/resource/${encodeURIComponent(PARENT_DOCTYPE)}/${encodeURIComponent(phone)}`, {
      headers: { Authorization: auth() },
    });

    if (!r.ok) {
      if (r.status === 404) return res.status(404).json({ error: "Contact not found" });
      const text = await r.text().catch(() => "");
      return res.status(r.status).json({ error: text.slice(0, 300) });
    }

    const json = await r.json() as { data: any };
    const doc = json.data || {};
    const calls: any[] = (doc[CHILD_FIELD] || []).sort((a: any, b: any) => {
      return (b.call_time || "").localeCompare(a.call_time || "");
    });

    res.json({
      phone_number: doc.phone_number || doc.name,
      calls,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
