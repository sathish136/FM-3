import { Router } from "express";

const router = Router();

const ERP_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const auth = () => `token ${process.env.ERPNEXT_API_KEY}:${process.env.ERPNEXT_API_SECRET}`;
function isConfigured() { return !!(ERP_URL && process.env.ERPNEXT_API_KEY && process.env.ERPNEXT_API_SECRET); }

const DEPT_CONFIG: Record<string, { doctype: string; childField: string }> = {
  hr:        { doctype: "HR Call Logs",        childField: "hr_call_logs_table" },
  project:   { doctype: "Project Call Logs",   childField: "project_call_logs_table" },
  purchase:  { doctype: "Purchase Call Logs",  childField: "o_and_m_call_logs" },
  marketing: { doctype: "Marketing Call Logs", childField: "o_and_m_call_logs" },
};

type DeptCall = {
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
  status?: string;
  followup_date?: string;
  remarks?: string;
  row_name?: string;
  [key: string]: string | undefined;
};

const deptCache: Record<string, { data: DeptCall[]; ts: number }> = {};
const CACHE_TTL = 8 * 60 * 1000;

async function fetchDeptCalls(dept: string): Promise<DeptCall[]> {
  if (!ERP_URL) return [];
  const cfg = DEPT_CONFIG[dept];
  if (!cfg) return [];

  const listParams = new URLSearchParams({
    fields: JSON.stringify(["name", "phone_number"]),
    limit_page_length: "500",
    order_by: "modified desc",
  });

  const listRes = await fetch(
    `${ERP_URL}/api/resource/${encodeURIComponent(cfg.doctype)}?${listParams}`,
    { headers: { Authorization: auth() } }
  );
  if (!listRes.ok) return [];
  const listJson = await listRes.json() as { data: any[] };
  const parents: Array<{ name: string; phone_number: string }> = (listJson.data || []).map((d: any) => ({
    name: d.name,
    phone_number: d.phone_number || d.name,
  }));

  const BATCH = 20;
  const allCalls: DeptCall[] = [];

  for (let i = 0; i < parents.length; i += BATCH) {
    const batch = parents.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (p) => {
        const r = await fetch(
          `${ERP_URL}/api/resource/${encodeURIComponent(cfg.doctype)}/${encodeURIComponent(p.name)}`,
          { headers: { Authorization: auth() } }
        );
        if (!r.ok) return [];
        const json = await r.json() as { data: any };
        const rows: any[] = (json.data?.[cfg.childField] || []);
        return rows.map((row: any): DeptCall => ({
          contact_name:     p.name,
          phone_number:     p.phone_number,
          call_date:        row.call_date || "",
          call_time:        row.call_time || "",
          call_type:        row.call_type || "",
          extension:        row.extension || "",
          extension_owner:  row.extension_owner || "",
          recording:        row.recording || "",
          call_transcript:  row.call_transcript || "",
          summary:          row.summary || "",
          status:           row.status || "",
          followup_date:    row.followup_date || "",
          remarks:          row.remarks || "",
          row_name:         row.name || "",
        }));
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") allCalls.push(...r.value);
    }
  }

  return allCalls.sort((a, b) => (b.call_time || b.call_date || "").localeCompare(a.call_time || a.call_date || ""));
}

router.get("/dept-call-logs", async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: "ERPNext not configured" });

  const { dept, from_date, to_date, search, limit = "500", refresh } = req.query as Record<string, string>;

  if (!dept || !DEPT_CONFIG[dept]) {
    return res.status(400).json({ error: "Invalid dept. Use: hr, project, purchase, marketing" });
  }

  try {
    if (!deptCache[dept] || Date.now() - deptCache[dept].ts > CACHE_TTL || refresh === "1") {
      const data = await fetchDeptCalls(dept);
      deptCache[dept] = { data, ts: Date.now() };
    }

    let calls = deptCache[dept].data;

    if (from_date) calls = calls.filter(c => (c.call_date || c.call_time?.slice(0, 10) || "") >= from_date);
    if (to_date)   calls = calls.filter(c => (c.call_date || c.call_time?.slice(0, 10) || "") <= to_date);
    if (search) {
      const q = search.toLowerCase();
      calls = calls.filter(c =>
        (c.phone_number || "").includes(q) ||
        (c.contact_name || "").toLowerCase().includes(q) ||
        (c.extension_owner || "").toLowerCase().includes(q) ||
        (c.remarks || "").toLowerCase().includes(q)
      );
    }

    const pageSize = Math.min(500, Math.max(1, parseInt(limit, 10)));
    const paged = calls.slice(0, pageSize);

    const stats = {
      total:    calls.length,
      incoming: calls.filter(c => c.call_type === "Incoming").length,
      outgoing: calls.filter(c => c.call_type === "Outgoing").length,
    };

    res.json({ calls: paged, stats, cached_at: deptCache[dept].ts });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export async function warmupDeptCallLogs() {
  if (!isConfigured()) return;
  for (const dept of Object.keys(DEPT_CONFIG)) {
    try {
      const data = await fetchDeptCalls(dept);
      deptCache[dept] = { data, ts: Date.now() };
      console.log(`Dept call logs warmed up: ${dept} (${data.length} records)`);
    } catch (e) {
      console.warn(`Dept call logs warm-up failed for ${dept}:`, e);
    }
  }
}

export default router;
