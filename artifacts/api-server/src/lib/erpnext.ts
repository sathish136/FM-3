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

export interface ErpPID {
  name: string;
  project: string;
  project_name: string;
  revision: string;
  attach: string | null;
  modified: string;
}

export async function fetchErpNextPID(): Promise<ErpPID[]> {
  const fields = JSON.stringify([
    "name", "project", "project_name", "revision", "attach", "modified",
  ]);

  const params = new URLSearchParams({
    fields,
    limit_page_length: "500",
    order_by: "modified desc",
  });

  const url = `${ERPNEXT_URL}/api/resource/P and ID?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERPNext P&ID API error ${res.status}: ${body}`);
  }

  const json = await res.json();
  return (json.data || []) as ErpPID[];
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

// ── Material Request ──────────────────────────────────────────────────────────

export interface ErpMaterialRequestItem {
  name: string;
  item_code: string;
  item_name: string;
  description: string | null;
  qty: number;
  uom: string;
  warehouse: string | null;
  schedule_date: string | null;
}

export interface ErpMaterialRequest {
  name: string;
  title: string | null;
  material_request_type: string;
  status: string;
  transaction_date: string;
  schedule_date: string | null;
  company: string | null;
  requested_by: string | null;
  project: string | null;
  modified: string | null;
  items?: ErpMaterialRequestItem[];
}

export async function fetchErpNextMaterialRequests(filters?: { status?: string; type?: string; project?: string }): Promise<ErpMaterialRequest[]> {
  const fields = JSON.stringify([
    "name", "title", "material_request_type", "status",
    "transaction_date", "schedule_date", "company", "project", "modified", "owner",
  ]);

  const fArr: any[] = [];
  if (filters?.status)  fArr.push(["Material Request", "status", "=", filters.status]);
  if (filters?.type)    fArr.push(["Material Request", "material_request_type", "=", filters.type]);
  if (filters?.project) fArr.push(["Material Request", "project", "like", `%${filters.project}%`]);

  const params = new URLSearchParams({
    fields,
    limit_page_length: "500",
    order_by: "modified desc",
  });
  if (fArr.length) params.set("filters", JSON.stringify(fArr));

  const url = `${ERPNEXT_URL}/api/resource/Material Request?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERPNext Material Request API error ${res.status}: ${body}`);
  }
  const json = await res.json();
  return (json.data || []) as ErpMaterialRequest[];
}

export async function fetchErpNextMaterialRequest(name: string): Promise<ErpMaterialRequest> {
  const url = `${ERPNEXT_URL}/api/resource/Material Request/${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERPNext Material Request fetch error ${res.status}: ${body}`);
  }
  const json = await res.json();
  return json.data as ErpMaterialRequest;
}

export async function createErpNextMaterialRequest(payload: {
  title: string;
  material_request_type: string;
  schedule_date: string;
  company?: string;
  requested_by?: string;
  items: Array<{
    item_code: string;
    item_name?: string;
    qty: number;
    uom?: string;
    warehouse?: string;
    schedule_date?: string;
  }>;
}): Promise<ErpMaterialRequest> {
  const url = `${ERPNEXT_URL}/api/resource/Material Request`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERPNext create Material Request error ${res.status}: ${body}`);
  }
  const json = await res.json();
  return json.data as ErpMaterialRequest;
}

export async function fetchErpNextMaterialRequestItems(): Promise<string[]> {
  const fields = JSON.stringify(["name", "item_name"]);
  const params = new URLSearchParams({ fields, limit_page_length: "500", order_by: "item_name asc" });
  const url = `${ERPNEXT_URL}/api/resource/Item?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return ((json.data || []) as any[]).map((i: any) => i.name);
}

export async function fetchErpNextWarehouses(): Promise<string[]> {
  const fields = JSON.stringify(["name"]);
  const params = new URLSearchParams({ fields, limit_page_length: "200", order_by: "name asc" });
  const url = `${ERPNEXT_URL}/api/resource/Warehouse?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return ((json.data || []) as any[]).map((w: any) => w.name);
}

export async function fetchErpNextCompanies(): Promise<string[]> {
  const fields = JSON.stringify(["name"]);
  const params = new URLSearchParams({ fields, limit_page_length: "50" });
  const url = `${ERPNEXT_URL}/api/resource/Company?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return ((json.data || []) as any[]).map((c: any) => c.name);
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

export interface ErpUser {
  email: string;
  full_name: string;
  user_image: string | null;
  enabled: number;
}

// ── Project Board ─────────────────────────────────────────────────────────────

export interface ErpProjectBoardChildRow {
  technical_description: string;
  mr_qty: number;
  store_qty: number;
  production_qty: number;
  not_req_qty: number;
  buy_required: number;
  po_qty: number;
  received_qty: number;
  po_pending: number;
  pr_pending: number;
  delivery_from: string | null;
  delivery_to: string | null;
  aging: string;
  mr_no: string;
  po_no: string;
}

export interface ErpProjectBoardRow {
  description: string;
  mr_qty: number;
  store_qty: number;
  production_qty: number;
  not_req_qty: number;
  buy_required: number;
  po_qty: number;
  received_qty: number;
  po_pending: number;
  pr_pending: number;
  delivery_from: string | null;
  delivery_to: string | null;
  aging: string;
  mr_no: string;
  po_no: string;
  child_rows: ErpProjectBoardChildRow[];
}

export async function fetchErpNextProjectBoard(filters?: {
  project?: string;
  mr_remarks?: string;
}): Promise<ErpProjectBoardRow[]> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");

  const params = new URLSearchParams({
    method: "wtt_module.wtt_module.page.project_board.project_board.get_project_dashboard",
  });
  const body: Record<string, string> = {};
  if (filters?.project)    body["project"]    = filters.project;
  if (filters?.mr_remarks) body["mr_remarks"] = filters.mr_remarks;

  const url = `${ERPNEXT_URL}/api/method/wtt_module.wtt_module.page.project_board.project_board.get_project_dashboard`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ERPNext Project Board API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  return (json.message || []) as ErpProjectBoardRow[];
}

export async function fetchErpNextMrRemarks(project?: string): Promise<string[]> {
  if (!ERPNEXT_URL) return [];
  const fields = JSON.stringify(["name"]);
  const fArr: any[] = [];
  if (project) fArr.push(["MR Remarks", "project", "=", project]);
  const params = new URLSearchParams({ fields, limit_page_length: "200", order_by: "name asc" });
  if (fArr.length) params.set("filters", JSON.stringify(fArr));
  const url = `${ERPNEXT_URL}/api/resource/MR Remarks?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.data || []) as any[]).map((r: any) => r.name);
}

export async function fetchErpNextProjectList(): Promise<{ name: string; project_name: string }[]> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const fields = JSON.stringify(["name", "project_name"]);
  const params = new URLSearchParams({ fields, limit_page_length: "2000", order_by: "project_name asc" });
  const url = `${ERPNEXT_URL}/api/resource/Project?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data || []) as { name: string; project_name: string }[];
}

export interface ErpProjectDetail {
  name: string;
  project_name: string;
  status: string;
  priority: string;
  percent_complete: number;
  expected_start_date: string | null;
  expected_end_date: string | null;
  estimated_costing: number;
  actual_expense: number;
  actual_time: number;
  department: string | null;
  notes: string | null;
  creation: string;
  modified: string;
}

export async function fetchErpNextProjectDetail(projectName: string): Promise<ErpProjectDetail | null> {
  if (!ERPNEXT_URL) return null;
  const fields = JSON.stringify([
    "name", "project_name", "status", "priority", "percent_complete",
    "expected_start_date", "expected_end_date",
    "estimated_costing", "actual_expense", "actual_time",
    "department", "notes", "creation", "modified",
  ]);
  const params = new URLSearchParams({ fields });
  const url = `${ERPNEXT_URL}/api/resource/Project/${encodeURIComponent(projectName)}?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return null;
  const json = await res.json();
  const d = json.data;
  if (!d) return null;
  return {
    name: d.name,
    project_name: d.project_name || d.name,
    status: d.status || "Unknown",
    priority: d.priority || "Medium",
    percent_complete: d.percent_complete || 0,
    expected_start_date: d.expected_start_date || null,
    expected_end_date: d.expected_end_date || null,
    estimated_costing: d.estimated_costing || 0,
    actual_expense: d.actual_expense || 0,
    actual_time: d.actual_time || 0,
    department: d.department || null,
    notes: d.notes || null,
    creation: d.creation || "",
    modified: d.modified || "",
  };
}

// ── HRMS ─────────────────────────────────────────────────────────────────────

export interface ErpEmployee {
  name: string;
  employee_name: string;
  department: string | null;
  designation: string | null;
  status: string;
  date_of_joining: string | null;
  user_id: string | null;
  image: string | null;
  gender: string | null;
  cell_number: string | null;
  company: string | null;
}

export interface ErpLeaveApplication {
  name: string;
  employee: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_leave_days: number;
  status: string;
  description: string | null;
}

export interface ErpAttendance {
  name: string;
  employee: string;
  employee_name: string;
  attendance_date: string;
  status: string;
  department: string | null;
}

export async function fetchErpNextEmployees(filters?: { status?: string; department?: string }): Promise<ErpEmployee[]> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const fields = JSON.stringify([
    "name", "employee_name", "department", "designation",
    "status", "date_of_joining", "user_id", "image",
    "gender", "cell_number", "company",
  ]);
  const fArr: any[] = [];
  if (filters?.status)     fArr.push(["Employee", "status", "=", filters.status]);
  if (filters?.department) fArr.push(["Employee", "department", "like", `%${filters.department}%`]);
  const params = new URLSearchParams({ fields, limit_page_length: "500", order_by: "employee_name asc" });
  if (fArr.length) params.set("filters", JSON.stringify(fArr));
  const url = `${ERPNEXT_URL}/api/resource/Employee?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) throw new Error(`ERPNext employees: ${res.status}`);
  const data = await res.json();
  return data.data ?? [];
}

export async function fetchErpNextLeaveApplications(filters?: { status?: string; employee?: string }): Promise<ErpLeaveApplication[]> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const fields = JSON.stringify([
    "name", "employee", "employee_name", "leave_type",
    "from_date", "to_date", "total_leave_days", "status", "description",
  ]);
  const fArr: any[] = [];
  if (filters?.status)   fArr.push(["Leave Application", "status", "=", filters.status]);
  if (filters?.employee) fArr.push(["Leave Application", "employee_name", "like", `%${filters.employee}%`]);
  const params = new URLSearchParams({ fields, limit_page_length: "200", order_by: "from_date desc" });
  if (fArr.length) params.set("filters", JSON.stringify(fArr));
  const url = `${ERPNEXT_URL}/api/resource/Leave Application?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) throw new Error(`ERPNext leave: ${res.status}`);
  const data = await res.json();
  return data.data ?? [];
}

export async function fetchErpNextAttendance(filters?: { status?: string; department?: string; employee?: string; from_date?: string; to_date?: string; limit?: number }): Promise<ErpAttendance[]> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const fields = JSON.stringify([
    "name", "employee", "employee_name", "attendance_date", "status", "department",
  ]);
  const fArr: any[] = [];
  if (filters?.status)     fArr.push(["Attendance", "status", "=", filters.status]);
  if (filters?.department) fArr.push(["Attendance", "department", "like", `%${filters.department}%`]);
  if (filters?.employee)   fArr.push(["Attendance", "employee", "=", filters.employee]);
  if (filters?.from_date)  fArr.push(["Attendance", "attendance_date", ">=", filters.from_date]);
  if (filters?.to_date)    fArr.push(["Attendance", "attendance_date", "<=", filters.to_date]);
  const limit = String(filters?.limit ?? 500);
  const params = new URLSearchParams({ fields, limit_page_length: limit, order_by: "attendance_date desc" });
  if (fArr.length) params.set("filters", JSON.stringify(fArr));
  const url = `${ERPNEXT_URL}/api/resource/Attendance?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) throw new Error(`ERPNext attendance: ${res.status}`);
  const data = await res.json();
  return data.data ?? [];
}

export interface ErpGrievance {
  name: string;
  employee: string;
  employee_name: string;
  grievance_type: string | null;
  date: string;
  status: string;
  department: string | null;
}

export async function fetchErpNextGrievances(filters?: { from_date?: string; to_date?: string }): Promise<ErpGrievance[]> {
  if (!ERPNEXT_URL) return [];
  try {
    const fields = JSON.stringify(["name", "employee", "employee_name", "grievance_type", "date", "status", "department"]);
    const fArr: any[] = [];
    if (filters?.from_date) fArr.push(["Employee Grievance", "date", ">=", filters.from_date]);
    if (filters?.to_date)   fArr.push(["Employee Grievance", "date", "<=", filters.to_date]);
    const params = new URLSearchParams({ fields, limit_page_length: "500", order_by: "date desc" });
    if (fArr.length) params.set("filters", JSON.stringify(fArr));
    const url = `${ERPNEXT_URL}/api/resource/Employee Grievance?${params}`;
    const res = await fetch(url, { headers: { Authorization: authHeader() } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []) as ErpGrievance[];
  } catch { return []; }
}

export async function fetchErpNextUserRoles(email: string): Promise<string[]> {
  if (!ERPNEXT_URL) return [];
  const fields = JSON.stringify(["role"]);
  const filters = JSON.stringify([["Has Role", "parent", "=", email]]);
  const params = new URLSearchParams({ fields, filters, limit_page_length: "100" });
  const url = `${ERPNEXT_URL}/api/resource/Has Role?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.data || []) as any[]).map((r: any) => r.role as string);
}

// Fetch ERPNext User Permission restrictions — returns allowed department names for the user
export async function fetchErpNextUserDepartmentPermissions(email: string): Promise<string[]> {
  if (!ERPNEXT_URL) return [];
  const fields = JSON.stringify(["for_value"]);
  const filters = JSON.stringify([
    ["User Permission", "user", "=", email],
    ["User Permission", "allow", "=", "Department"],
  ]);
  const params = new URLSearchParams({ fields, filters, limit_page_length: "50" });
  const url = `${ERPNEXT_URL}/api/resource/User Permission?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.data || []) as any[]).map((d: any) => d.for_value as string).filter(Boolean);
}

// Check if an employee has any subordinates (employees with reports_to = employeeId)
// This is used to determine HOD/manager status when role API is restricted
export async function fetchErpNextSubordinates(employeeId: string): Promise<{ name: string; department: string | null }[]> {
  if (!ERPNEXT_URL) return [];
  const fields = JSON.stringify(["name", "department"]);
  const filters = JSON.stringify([["Employee", "reports_to", "=", employeeId], ["Employee", "status", "=", "Active"]]);
  const params = new URLSearchParams({ fields, filters, limit_page_length: "200" });
  const url = `${ERPNEXT_URL}/api/resource/Employee?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || []) as { name: string; department: string | null }[];
}

export async function fetchErpNextManagedDepartments(employeeId: string): Promise<string[]> {
  if (!ERPNEXT_URL) return [];
  const fields = JSON.stringify(["name", "department_name"]);
  const filters = JSON.stringify([["Department", "department_manager", "=", employeeId]]);
  const params = new URLSearchParams({ fields, filters, limit_page_length: "50" });
  const url = `${ERPNEXT_URL}/api/resource/Department?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.data || []) as any[]).map((d: any) => d.name as string);
}

export interface ErpDepartment {
  name: string;
  department_name: string;
  parent_department: string | null;
  department_manager: string | null;
  department_manager_name: string | null;
  company: string | null;
  is_group: number;
  disabled: number;
}

export async function fetchErpNextDepartments(): Promise<ErpDepartment[]> {
  if (!ERPNEXT_URL) return [];
  const fields = JSON.stringify([
    "name", "department_name", "parent_department",
    "department_manager", "department_manager_name",
    "company", "is_group", "disabled",
  ]);
  const filters = JSON.stringify([["Department", "disabled", "=", 0]]);
  const params = new URLSearchParams({
    fields,
    filters,
    limit_page_length: "500",
    order_by: "department_name asc",
  });
  const url = `${ERPNEXT_URL}/api/resource/Department?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || []) as ErpDepartment[];
}

export interface ErpTaskAllocationTask {
  task_name: string;
  description: string | null;
  expected_hours: number;
  hours_completed: number;
  expected_end_date: string | null;
  status: string;
}

export interface ErpTaskAllocation {
  name: string;
  employee: string;
  employee_name: string;
  date: string;
  tasks: ErpTaskAllocationTask[];
}

export async function fetchErpNextTaskAllocations(options?: {
  fromDate?: string;
  toDate?: string;
}): Promise<ErpTaskAllocation[]> {
  if (!ERPNEXT_URL) return [];
  const fields = JSON.stringify([
    "name", "employee", "employee_name", "date",
    "tasks.task_name", "tasks.expected_hours", "tasks.hours_completed",
    "tasks.expected_end_date", "tasks.status", "tasks.description",
  ]);
  const fArr: any[] = [];
  if (options?.fromDate) fArr.push(["Task Allocation", "date", ">=", options.fromDate]);
  if (options?.toDate)   fArr.push(["Task Allocation", "date", "<=", options.toDate]);
  const params = new URLSearchParams({ fields, limit_page_length: "1000", order_by: "date desc" });
  if (fArr.length) params.set("filters", JSON.stringify(fArr));
  const url = `${ERPNEXT_URL}/api/resource/Task Allocation?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const json = await res.json();
  return ((json.data || []) as any[]).map((a: any) => ({
    name: a.name,
    employee: a.employee || "",
    employee_name: a.employee_name || a.employee || "",
    date: a.date || "",
    tasks: Array.isArray(a.tasks) ? a.tasks.map((t: any) => ({
      task_name: t.task_name || "",
      description: t.description || null,
      expected_hours: t.expected_hours || 0,
      hours_completed: t.hours_completed || 0,
      expected_end_date: t.expected_end_date || null,
      status: t.status || "Open",
    })) : [],
  }));
}

export async function createErpNextTaskAllocation(data: {
  employee: string;
  date: string;
  tasks: { task_name: string; description?: string; expected_hours?: number; expected_end_date?: string }[];
}): Promise<{ name: string }> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const body = {
    employee: data.employee,
    date: data.date,
    tasks: data.tasks.map(t => ({
      task_name: t.task_name,
      description: t.description || "",
      expected_hours: t.expected_hours ?? 1,
      expected_end_date: t.expected_end_date || data.date,
      status: "Open",
    })),
  };
  const res = await fetch(`${ERPNEXT_URL}/api/resource/Task Allocation`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ERPNext Task Allocation: ${res.status} — ${err}`);
  }
  const result = await res.json();
  return { name: result.data?.name || result.name || "created" };
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export interface ErpTask {
  name: string;
  subject: string;
  project: string;
  status: string;
  priority: string;
  exp_start_date: string | null;
  exp_end_date: string | null;
  completed_on: string | null;
  progress: number;
  description: string | null;
  assigned_to: string | null;
}

export async function fetchErpNextTasks(project?: string): Promise<ErpTask[]> {
  if (!ERPNEXT_URL) return [];
  const fields = JSON.stringify([
    "name", "subject", "project", "status", "priority",
    "exp_start_date", "exp_end_date", "completed_on", "progress",
    "description", "_assign",
  ]);
  const fArr: any[] = [];
  if (project) fArr.push(["Task", "project", "=", project]);
  const params = new URLSearchParams({
    fields,
    limit_page_length: "500",
    order_by: "exp_start_date asc",
  });
  if (fArr.length) params.set("filters", JSON.stringify(fArr));
  const url = `${ERPNEXT_URL}/api/resource/Task?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const json = await res.json();
  return ((json.data || []) as any[]).map((t: any) => ({
    name: t.name,
    subject: t.subject,
    project: t.project,
    status: t.status,
    priority: t.priority || "Medium",
    exp_start_date: t.exp_start_date || null,
    exp_end_date: t.exp_end_date || null,
    completed_on: t.completed_on || null,
    progress: t.progress || 0,
    description: t.description || null,
    assigned_to: t._assign ? (() => { try { const a = JSON.parse(t._assign); return Array.isArray(a) ? a[0] : null; } catch { return null; } })() : null,
  })) as ErpTask[];
}

// ── Purchase Order ────────────────────────────────────────────────────────────

export interface ErpPOItem {
  parent: string;
  item_code: string;
  item_name: string;
  description: string | null;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  received_qty: number;
}

export async function fetchErpNextPOItems(poNames: string[]): Promise<ErpPOItem[]> {
  if (!ERPNEXT_URL || poNames.length === 0) return [];
  const fields = JSON.stringify([
    "parent", "item_code", "item_name", "description",
    "qty", "uom", "rate", "amount", "received_qty",
  ]);
  const filters = JSON.stringify([["Purchase Order Item", "parent", "in", poNames]]);
  const params = new URLSearchParams({ fields, filters, limit_page_length: "2000" });
  const url = `${ERPNEXT_URL}/api/resource/Purchase Order Item?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data || []) as ErpPOItem[];
}

export interface ErpPurchaseOrderItem {
  name: string;
  item_code: string;
  item_name: string;
  description: string | null;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  received_qty: number;
  billed_amt: number;
  warehouse: string | null;
  schedule_date: string | null;
}

export interface ErpPurchaseOrder {
  name: string;
  supplier: string;
  supplier_name: string | null;
  status: string;
  transaction_date: string;
  schedule_date: string | null;
  company: string | null;
  project: string | null;
  grand_total: number;
  currency: string | null;
  modified: string | null;
  owner: string | null;
  per_received: number;
  per_billed: number;
  items?: ErpPurchaseOrderItem[];
}

export async function fetchErpNextPurchaseOrders(filters?: {
  status?: string;
  supplier?: string;
  project?: string;
}): Promise<ErpPurchaseOrder[]> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const fields = JSON.stringify([
    "name", "supplier", "supplier_name", "status",
    "transaction_date", "schedule_date", "company", "project",
    "grand_total", "currency", "modified", "owner",
    "per_received", "per_billed",
  ]);
  const fArr: any[] = [];
  if (filters?.status)   fArr.push(["Purchase Order", "status", "=", filters.status]);
  if (filters?.supplier) fArr.push(["Purchase Order", "supplier", "like", `%${filters.supplier}%`]);
  if (filters?.project)  fArr.push(["Purchase Order", "project", "like", `%${filters.project}%`]);

  const params = new URLSearchParams({ fields, limit_page_length: "500", order_by: "modified desc" });
  if (fArr.length) params.set("filters", JSON.stringify(fArr));

  const url = `${ERPNEXT_URL}/api/resource/Purchase Order?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: authHeader(), "Content-Type": "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERPNext Purchase Order API error ${res.status}: ${body}`);
  }
  const json = await res.json();
  return (json.data || []) as ErpPurchaseOrder[];
}

export async function fetchErpNextPurchaseOrder(name: string): Promise<ErpPurchaseOrder> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const url = `${ERPNEXT_URL}/api/resource/Purchase Order/${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: { Authorization: authHeader(), "Content-Type": "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERPNext Purchase Order detail error ${res.status}: ${body}`);
  }
  const json = await res.json();
  const d = json.data;
  return {
    ...d,
    items: (d.items || []).map((i: any) => ({
      name: i.name,
      item_code: i.item_code,
      item_name: i.item_name || i.item_code,
      description: i.description || null,
      qty: Number(i.qty) || 0,
      uom: i.uom || "",
      rate: Number(i.rate) || 0,
      amount: Number(i.amount) || 0,
      received_qty: Number(i.received_qty) || 0,
      billed_amt: Number(i.billed_amt) || 0,
      warehouse: i.warehouse || null,
      schedule_date: i.schedule_date || null,
    })),
  } as ErpPurchaseOrder;
}

export async function fetchErpNextSuppliers(): Promise<{ name: string; supplier_name: string }[]> {
  if (!ERPNEXT_URL) return [];
  const fields = JSON.stringify(["name", "supplier_name"]);
  const params = new URLSearchParams({ fields, limit_page_length: "500", order_by: "supplier_name asc" });
  const url = `${ERPNEXT_URL}/api/resource/Supplier?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data || []) as { name: string; supplier_name: string }[];
}

// ── Recruitment Tracker ───────────────────────────────────────────────────────

export interface ErpRecruitmentFollowup {
  name: string;
  date: string;
  time: string;
  employee: string;
  employee_name: string;
  mode_of_communication: string;
  conversation: string;
  next_followup: string | null;
  end_time: string | null;
}

export interface ErpRecruitmentTracker {
  name: string;
  date: string;
  company: string | null;
  candidate_name: string;
  qualification: string | null;
  applying_for_the_post: string;
  department: string | null;
  location: string | null;
  existing_salary_per_month: number;
  expected_salary: number;
  status: string;
  rt_telephonic_interview: string | null;
  telephonic_interview_commands: string | null;
  rt_last_convo: string | null;
  not_suitable_reason: string | null;
  experience_status: string | null;
  candidate_resume: string | null;
  owner: string;
  modified: string;
  followup_table?: ErpRecruitmentFollowup[];
}

export async function fetchErpNextRecruitmentTrackers(filters?: {
  status?: string;
  department?: string;
  position?: string;
}): Promise<ErpRecruitmentTracker[]> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const fields = JSON.stringify([
    "name", "date", "company", "candidate_name", "qualification",
    "applying_for_the_post", "department", "location",
    "existing_salary_per_month", "expected_salary",
    "status", "rt_telephonic_interview", "telephonic_interview_commands",
    "rt_last_convo", "not_suitable_reason", "experience_status",
    "candidate_resume", "owner", "modified",
  ]);
  const fArr: any[] = [];
  if (filters?.status)     fArr.push(["Recruitment Tracker", "status", "=", filters.status]);
  if (filters?.department) fArr.push(["Recruitment Tracker", "department", "like", `%${filters.department}%`]);
  if (filters?.position)   fArr.push(["Recruitment Tracker", "applying_for_the_post", "like", `%${filters.position}%`]);

  const params = new URLSearchParams({ fields, limit_page_length: "500", order_by: "modified desc" });
  if (fArr.length) params.set("filters", JSON.stringify(fArr));

  const url = `${ERPNEXT_URL}/api/resource/Recruitment Tracker?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: authHeader(), "Content-Type": "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERPNext Recruitment Tracker API error ${res.status}: ${body}`);
  }
  const json = await res.json();
  return (json.data || []) as ErpRecruitmentTracker[];
}

export async function fetchErpNextRecruitmentTracker(name: string): Promise<ErpRecruitmentTracker> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const url = `${ERPNEXT_URL}/api/resource/Recruitment Tracker/${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: { Authorization: authHeader(), "Content-Type": "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ERPNext Recruitment Tracker detail error ${res.status}: ${body}`);
  }
  const json = await res.json();
  return json.data as ErpRecruitmentTracker;
}

// ── Employee Checkin ──────────────────────────────────────────────────────────

export interface ErpEmployeeCheckin {
  name: string;
  employee: string;
  employee_name: string;
  time: string;
  log_type: string;
  device_id: string | null;
  shift: string | null;
  creation: string;
}

export async function fetchErpNextCheckins(filters?: {
  employee?: string;
  from_date?: string;
  to_date?: string;
}): Promise<ErpEmployeeCheckin[]> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const fields = JSON.stringify([
    "name", "employee", "employee_name", "time", "log_type", "device_id", "shift", "creation",
  ]);
  const fArr: any[] = [];
  if (filters?.employee)  fArr.push(["Employee Checkin", "employee", "=", filters.employee]);
  if (filters?.from_date) fArr.push(["Employee Checkin", "time", ">=", filters.from_date]);
  if (filters?.to_date)   fArr.push(["Employee Checkin", "time", "<=", filters.to_date + " 23:59:59"]);
  const params = new URLSearchParams({ fields, limit_page_length: "500", order_by: "time desc" });
  if (fArr.length) params.set("filters", JSON.stringify(fArr));
  const url = `${ERPNEXT_URL}/api/resource/Employee Checkin?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) throw new Error(`ERPNext checkin: ${res.status}`);
  const data = await res.json();
  return data.data ?? [];
}

export async function createErpNextCheckin(payload: {
  employee: string;
  time: string;
  log_type: "IN" | "OUT";
  device_id?: string;
}): Promise<ErpEmployeeCheckin> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const res = await fetch(`${ERPNEXT_URL}/api/resource/Employee Checkin`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ERPNext create checkin: ${res.status} — ${err}`);
  }
  const json = await res.json();
  return json.data as ErpEmployeeCheckin;
}

// ── Leave Types ───────────────────────────────────────────────────────────────

export async function fetchErpNextLeaveTypes(): Promise<string[]> {
  if (!ERPNEXT_URL) return [];
  const fields = JSON.stringify(["name"]);
  const params = new URLSearchParams({ fields, limit_page_length: "100", order_by: "name asc" });
  const url = `${ERPNEXT_URL}/api/resource/Leave Type?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.data || []) as any[]).map((lt: any) => lt.name as string);
}

export async function createErpNextLeaveApplication(payload: {
  employee: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  half_day?: number;
  half_day_date?: string;
  description?: string;
  follow_via_email?: number;
  status?: string;
}): Promise<{ name: string }> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const body = { ...payload, docstatus: 0 };
  const res = await fetch(`${ERPNEXT_URL}/api/resource/Leave Application`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ERPNext create leave: ${res.status} — ${err}`);
  }
  const json = await res.json();
  return { name: json.data?.name || "" };
}

// ── Expense Claim ─────────────────────────────────────────────────────────────

export interface ErpExpenseClaimItem {
  expense_date: string;
  expense_type: string;
  description: string | null;
  amount: number;
  sanctioned_amount: number;
}

export interface ErpExpenseClaim {
  name: string;
  employee: string;
  employee_name: string;
  posting_date: string;
  company: string | null;
  approval_status: string;
  total_claimed_amount: number;
  total_sanctioned_amount: number;
  remark: string | null;
  modified: string;
  expenses?: ErpExpenseClaimItem[];
}

export async function fetchErpNextExpenseClaims(filters?: {
  employee?: string;
  approval_status?: string;
}): Promise<ErpExpenseClaim[]> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const fields = JSON.stringify([
    "name", "employee", "employee_name", "posting_date", "company",
    "approval_status", "total_claimed_amount", "total_sanctioned_amount", "remark", "modified",
  ]);
  const fArr: any[] = [];
  if (filters?.employee)        fArr.push(["Expense Claim", "employee", "=", filters.employee]);
  if (filters?.approval_status) fArr.push(["Expense Claim", "approval_status", "=", filters.approval_status]);
  const params = new URLSearchParams({ fields, limit_page_length: "200", order_by: "modified desc" });
  if (fArr.length) params.set("filters", JSON.stringify(fArr));
  const url = `${ERPNEXT_URL}/api/resource/Expense Claim?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) throw new Error(`ERPNext expense claim: ${res.status}`);
  const data = await res.json();
  return data.data ?? [];
}

export async function fetchErpNextExpenseClaimTypes(): Promise<string[]> {
  if (!ERPNEXT_URL) return [];
  const fields = JSON.stringify(["name"]);
  const params = new URLSearchParams({ fields, limit_page_length: "100", order_by: "name asc" });
  const url = `${ERPNEXT_URL}/api/resource/Expense Claim Type?${params}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.data || []) as any[]).map((t: any) => t.name as string);
}

export async function createErpNextExpenseClaim(payload: {
  employee: string;
  posting_date: string;
  company?: string;
  remark?: string;
  expenses: Array<{
    expense_date: string;
    expense_type: string;
    description?: string;
    amount: number;
  }>;
}): Promise<{ name: string }> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const body = { ...payload, docstatus: 0, approval_status: "Draft" };
  const res = await fetch(`${ERPNEXT_URL}/api/resource/Expense Claim`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ERPNext create expense claim: ${res.status} — ${err}`);
  }
  const json = await res.json();
  return { name: json.data?.name || "" };
}

export async function fetchErpNextUsers(): Promise<ErpUser[]> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const fields = JSON.stringify(["name", "full_name", "user_image", "enabled"]);
  const filters = JSON.stringify([
    ["User", "user_type", "=", "System User"],
    ["User", "enabled", "=", 1],
  ]);
  const params = new URLSearchParams({ fields, filters, limit_page_length: "500", order_by: "full_name asc" });
  const url = `${ERPNEXT_URL}/api/resource/User?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) throw new Error(`ERPNext users: ${res.status}`);
  const data = await res.json();
  return (data.data ?? []).map((u: any) => ({
    email: u.name,
    full_name: u.full_name || u.name,
    user_image: u.user_image || null,
    enabled: u.enabled ?? 1,
  }));
}
