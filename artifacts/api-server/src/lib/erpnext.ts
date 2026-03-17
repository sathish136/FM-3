const ERPNEXT_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;

export function isErpNextConfigured(): boolean {
  return !!(ERPNEXT_URL && ERPNEXT_API_KEY && ERPNEXT_API_SECRET);
}

function authHeader(): string {
  return `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
}

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function mapStatus(erpStatus: string): string {
  switch (erpStatus) {
    case "Open":       return "active";
    case "Completed":  return "completed";
    case "Cancelled":  return "on_hold";
    case "Hold":       return "on_hold";
    default:           return "planning";
  }
}

function mapPriority(erpPriority: string): string {
  switch ((erpPriority || "").toLowerCase()) {
    case "high":   return "high";
    case "medium": return "medium";
    case "low":    return "low";
    default:       return "medium";
  }
}

export interface ErpProject {
  id: number;
  erpnextName: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  dueDate: string | null;
  createdAt: string;
}

export async function fetchErpNextProjects(): Promise<ErpProject[]> {
  const fields = JSON.stringify([
    "name", "project_name", "status", "priority",
    "percent_complete", "expected_end_date", "notes",
    "creation"
  ]);
  const url = `${ERPNEXT_URL}/api/resource/Project?fields=${encodeURIComponent(fields)}&limit_page_length=500&order_by=creation+desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERPNext API error ${res.status}: ${body}`);
  }

  const json = await res.json();
  const data: any[] = json.data || [];

  return data.map((p: any) => ({
    id: hashName(p.name),
    erpnextName: p.name,
    name: p.project_name || p.name,
    description: p.notes || null,
    status: mapStatus(p.status),
    priority: mapPriority(p.priority),
    progress: Math.round(p.percent_complete || 0),
    dueDate: p.expected_end_date || null,
    createdAt: p.creation || new Date().toISOString(),
  }));
}
