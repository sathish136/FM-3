import { Router } from "express";

const router = Router();

const ERP_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const auth = () => `token ${process.env.ERPNEXT_API_KEY}:${process.env.ERPNEXT_API_SECRET}`;
function isConfigured() { return !!(ERP_URL && process.env.ERPNEXT_API_KEY && process.env.ERPNEXT_API_SECRET); }

const PARENT_DOCTYPE = "HR Call Logs";
const CHILD_FIELD    = "hr_call_logs_table";

// ─── In-memory flat calls cache (TTL: 8 min) ─────────────────────────────────
let callsCache: { data: FlatCall[]; ts: number } | null = null;
const CACHE_TTL = 8 * 60 * 1000;

type FlatCall = {
  contact_name: string;
  phone_number: string;
  call_date?: string;
  call_time?: string;
  call_type?: string;
  extension?: string;
  extension_owner?: string;
  recording?: string;
  call_transcript?: string;
  summary?: string;
  row_name?: string;
};

async function fetchAllCalls(): Promise<FlatCall[]> {
  if (!ERP_URL) return [];

  // 1. Fetch all parent doc names
  const listParams = new URLSearchParams({
    fields: JSON.stringify(["name", "phone_number"]),
    limit_page_length: "500",
    order_by: "modified desc",
  });
  const listRes = await fetch(`${ERP_URL}/api/resource/${encodeURIComponent(PARENT_DOCTYPE)}?${listParams}`, {
    headers: { Authorization: auth() },
  });
  if (!listRes.ok) return [];
  const listJson = await listRes.json() as { data: any[] };
  const parents: Array<{ name: string; phone_number: string }> = (listJson.data || []).map((d: any) => ({
    name: d.name,
    phone_number: d.phone_number || d.name,
  }));

  // 2. Fetch all full docs concurrently (batch to avoid overwhelming ERPNext)
  const BATCH = 20;
  const allCalls: FlatCall[] = [];

  for (let i = 0; i < parents.length; i += BATCH) {
    const batch = parents.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (p) => {
        const r = await fetch(
          `${ERP_URL}/api/resource/${encodeURIComponent(PARENT_DOCTYPE)}/${encodeURIComponent(p.name)}`,
          { headers: { Authorization: auth() } }
        );
        if (!r.ok) return [];
        const json = await r.json() as { data: any };
        const rows: any[] = (json.data?.[CHILD_FIELD] || []);
        return rows.map((row: any): FlatCall => ({
          contact_name: p.name,
          phone_number: p.phone_number,
          call_date:        row.call_date || "",
          call_time:        row.call_time || "",
          call_type:        row.call_type || "",
          extension:        row.extension || "",
          extension_owner:  row.extension_owner || "",
          recording:        row.recording || "",
          call_transcript:  row.call_transcript || "",
          summary:          row.summary || "",
          row_name:         row.name || "",
        }));
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") allCalls.push(...r.value);
    }
  }

  // Sort newest first
  return allCalls.sort((a, b) => (b.call_time || "").localeCompare(a.call_time || ""));
}

// ─── GET /api/call-logs — flat list of all calls with filters ─────────────────
router.get("/call-logs", async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: "ERPNext not configured" });

  const { from_date, to_date, owner, call_type, phone, page = "1", limit = "50", refresh } = req.query as Record<string, string>;

  try {
    // Refresh cache if stale or explicitly requested
    if (!callsCache || Date.now() - callsCache.ts > CACHE_TTL || refresh === "1") {
      const data = await fetchAllCalls();
      callsCache = { data, ts: Date.now() };
    }

    let calls = callsCache.data;

    // Apply filters
    if (from_date) calls = calls.filter(c => (c.call_date || c.call_time?.slice(0, 10) || "") >= from_date);
    if (to_date)   calls = calls.filter(c => (c.call_date || c.call_time?.slice(0, 10) || "") <= to_date);
    if (owner)     calls = calls.filter(c => c.extension_owner?.toLowerCase() === owner.toLowerCase());
    if (call_type) calls = calls.filter(c => c.call_type?.toLowerCase() === call_type.toLowerCase());
    if (phone)     calls = calls.filter(c => (c.phone_number || "").includes(phone));

    const total    = calls.length;
    const pageNum  = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const skip     = (pageNum - 1) * pageSize;
    const paged    = calls.slice(skip, skip + pageSize);

    // Aggregate stats on the full filtered set
    const stats = {
      total,
      incoming:    calls.filter(c => c.call_type === "Incoming").length,
      outgoing:    calls.filter(c => c.call_type === "Outgoing").length,
      transcribed: calls.filter(c => c.call_transcript?.trim()).length,
      recorded:    calls.filter(c => c.recording?.trim()).length,
    };

    res.json({ calls: paged, stats, total, page: pageNum, limit: pageSize, cached_at: callsCache.ts });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── GET /api/call-logs/contacts — contacts list with per-contact stats ────────
router.get("/call-logs/contacts", async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: "ERPNext not configured" });

  try {
    if (!callsCache || Date.now() - callsCache.ts > CACHE_TTL) {
      const data = await fetchAllCalls();
      callsCache = { data, ts: Date.now() };
    }
    const grouped: Record<string, FlatCall[]> = {};
    for (const c of callsCache.data) {
      if (!grouped[c.phone_number]) grouped[c.phone_number] = [];
      grouped[c.phone_number].push(c);
    }
    const contacts = Object.entries(grouped).map(([phone, calls]) => ({
      phone_number: phone,
      total: calls.length,
      incoming: calls.filter(c => c.call_type === "Incoming").length,
      outgoing: calls.filter(c => c.call_type === "Outgoing").length,
      last_call: calls[0]?.call_time || "",
      owners: [...new Set(calls.map(c => c.extension_owner).filter(Boolean))],
    })).sort((a, b) => b.last_call.localeCompare(a.last_call));

    res.json({ contacts });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── GET /api/call-logs/:phone — full call history for one contact ─────────────
router.get("/call-logs/:phone", async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: "ERPNext not configured" });

  const { phone } = req.params;

  try {
    const r = await fetch(
      `${ERP_URL}/api/resource/${encodeURIComponent(PARENT_DOCTYPE)}/${encodeURIComponent(phone)}`,
      { headers: { Authorization: auth() } }
    );
    if (!r.ok) {
      if (r.status === 404) return res.status(404).json({ error: "Contact not found" });
      const text = await r.text().catch(() => "");
      return res.status(r.status).json({ error: text.slice(0, 300) });
    }
    const json = await r.json() as { data: any };
    const doc  = json.data || {};
    const calls: any[] = (doc[CHILD_FIELD] || []).sort((a: any, b: any) =>
      (b.call_time || "").localeCompare(a.call_time || "")
    );
    res.json({ phone_number: doc.phone_number || doc.name, calls });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
