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
    case "On going":   return "active";
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

export interface ErpDrawing {
  name: string;
  project: string;
  project_name: string;
  department: string;
  revision: string;
  tag: string;
  attach: string | null;
  modified: string;
}

export async function fetchErpNextDrawings(department?: string): Promise<ErpDrawing[]> {
  const fields = JSON.stringify([
    "name", "project", "project_name", "department",
    "tag", "attach", "modified",
  ]);

  const filters: any[] = [];
  if (department) {
    filters.push(["Drawings", "department", "like", `%${department}%`]);
  }

  const params = new URLSearchParams({
    fields,
    limit_page_length: "500",
    order_by: "modified desc",
  });
  if (filters.length) params.set("filters", JSON.stringify(filters));

  const url = `${ERPNEXT_URL}/api/resource/Drawings?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERPNext Drawings API error ${res.status}: ${body}`);
  }

  const json = await res.json();
  return (json.data || []) as ErpDrawing[];
}

export interface ErpDesign3D {
  name: string;
  project: string;
  project_name: string;
  department: string;
  revision: string;
  tag: string;
  system_name: string;
  attach: string | null;
  modified: string;
}

export interface ErpPresentation {
  name: string;
  project: string;
  project_name: string;
  presentation_name: string;
  file_upload: string | null;
  modified: string;
}

export async function fetchErpNextPresentations(): Promise<ErpPresentation[]> {
  const fields = JSON.stringify([
    "name", "project", "project_name", "presentation_name", "file_upload", "modified",
  ]);

  const params = new URLSearchParams({
    fields,
    limit_page_length: "500",
    order_by: "modified desc",
  });

  const url = `${ERPNEXT_URL}/api/resource/Marketing Presentation?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERPNext Marketing Presentation API error ${res.status}: ${body}`);
  }

  const json = await res.json();
  return (json.data || []) as ErpPresentation[];
}

export async function fetchErpNextDesign3D(department?: string): Promise<ErpDesign3D[]> {
  const fields = JSON.stringify([
    "name", "project", "project_name", "department",
    "tag", "system_name", "attach", "modified",
  ]);

  const filters: any[] = [];
  if (department) {
    filters.push(["Design 3D", "department", "like", `%${department}%`]);
  }

  const params = new URLSearchParams({
    fields,
    limit_page_length: "500",
    order_by: "modified desc",
  });
  if (filters.length) params.set("filters", JSON.stringify(filters));

  const url = `${ERPNEXT_URL}/api/resource/Design 3D?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERPNext Design 3D API error ${res.status}: ${body}`);
  }

  const json = await res.json();
  return (json.data || []) as ErpDesign3D[];
}

export interface ErpDesign2D {
  name: string;
  project: string;
  project_name: string;
  department: string;
  revision: string;
  tag: string;
  system_name: string;
  attach: string | null;
  modified: string;
}

export async function fetchErpNextDesign2D(department?: string): Promise<ErpDesign2D[]> {
  const fields = JSON.stringify([
    "name", "project", "project_name", "department",
    "revision", "tag", "system_name", "attach", "modified",
  ]);

  const filters: any[] = [];
  if (department) {
    filters.push(["Design 2D", "department", "like", `%${department}%`]);
  }

  const params = new URLSearchParams({
    fields,
    limit_page_length: "500",
    order_by: "modified desc",
  });
  if (filters.length) params.set("filters", JSON.stringify(filters));

  const url = `${ERPNEXT_URL}/api/resource/Design 2D?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERPNext Design 2D API error ${res.status}: ${body}`);
  }

  const json = await res.json();
  return (json.data || []) as ErpDesign2D[];
}

export async function fetchErpNextProjects(): Promise<ErpProject[]> {
  const fields = JSON.stringify([
    "name", "project_name", "status", "priority",
    "percent_complete", "expected_end_date", "notes",
    "creation"
  ]);

  const filters = JSON.stringify([["Project", "status", "=", "On going"]]);
  const url = `${ERPNEXT_URL}/api/resource/Project?fields=${encodeURIComponent(fields)}&filters=${encodeURIComponent(filters)}&limit_page_length=500&order_by=modified+desc`;

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
