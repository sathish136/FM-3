import { Router } from "express";
import OpenAI from "openai";
import {
  isErpNextConfigured,
  fetchErpNextProjects,
  fetchErpNextMaterialRequests,
  fetchErpNextPurchaseOrders,
  fetchErpNextEmployees,
  fetchErpNextDepartments,
  fetchErpNextLeaveApplications,
  fetchErpNextAttendance,
  fetchErpNextTaskAllocations,
} from "../lib/erpnext";

const router = Router();

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
    });
  }
  return _openai;
}

const MAX_ROWS = 40;

type Row = Record<string, unknown>;

function matches(q: string, ...kw: string[]): boolean {
  const l = q.toLowerCase();
  return kw.some((k) => l.includes(k));
}

function toTable(rows: Row[], fields: string[]): string {
  if (!rows.length) return "(no records)";
  const header = fields.join(" | ");
  const sep = fields.map(() => "---").join(" | ");
  const body = rows.slice(0, MAX_ROWS).map((r) =>
    fields.map((f) => {
      const v = r[f];
      if (v == null) return "-";
      const s = String(v);
      return s.length > 60 ? s.slice(0, 57) + "..." : s;
    }).join(" | ")
  ).join("\n");
  const note = rows.length > MAX_ROWS ? `\n(showing ${MAX_ROWS} of ${rows.length} total)` : "";
  return `${header}\n${sep}\n${body}${note}`;
}

// ─── Permission helpers ────────────────────────────────────────────────────────

type ModuleRoles = Record<string, string>;

function canAccess(moduleRoles: ModuleRoles | null, ...keys: string[]): boolean {
  if (!moduleRoles) return true; // admin or fetch-failed: allow all
  return keys.some(k => moduleRoles[k] === "read" || moduleRoles[k] === "write");
}

// Map intent categories to module permission keys
const INTENT_MODULES: Record<string, string[]> = {
  projects:    ["projects", "project-board", "project-timeline", "dashboard"],
  hr:          ["hrms", "hrms-analytics", "hrms-team-performance", "hrms-task-summary", "hrms-performance", "mis-report"],
  leave:       ["hrms", "hrms-leave-request"],
  attendance:  ["hrms", "hrms-checkin", "hrms-analytics"],
  tasks:       ["tasks", "task-management", "hrms-task-summary", "hrms-team-performance"],
  purchase:    ["material-request", "purchase-order", "purchase-dashboard", "stores-dashboard"],
  finance:     ["finance-dashboard", "payment-tracker", "mis-report"],
};

function allowedModuleNames(moduleRoles: ModuleRoles | null): string {
  if (!moduleRoles) return "all modules";
  const allowed = Object.entries(moduleRoles)
    .filter(([, role]) => role === "read" || role === "write")
    .map(([key]) => key);
  return allowed.length ? allowed.join(", ") : "no modules";
}

// ─── Live data fetcher ────────────────────────────────────────────────────────

async function fetchLiveData(
  query: string,
  module?: string,
  moduleRoles?: ModuleRoles | null,
  hodDept?: string | null,
): Promise<string> {
  if (!isErpNextConfigured()) return "";

  const q = query.toLowerCase();
  const mod = (module || "").toLowerCase();
  const parts: string[] = [];

  const today = new Date().toISOString().split("T")[0];
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  // ── Permission-aware access check ──
  // null moduleRoles = admin (no restriction), otherwise check per-intent
  const allowProjects   = canAccess(moduleRoles, ...INTENT_MODULES.projects);
  const allowHR         = canAccess(moduleRoles, ...INTENT_MODULES.hr) || !!hodDept;
  const allowLeave      = canAccess(moduleRoles, ...INTENT_MODULES.leave) || !!hodDept;
  const allowAttendance = canAccess(moduleRoles, ...INTENT_MODULES.attendance) || !!hodDept;
  const allowTasks      = canAccess(moduleRoles, ...INTENT_MODULES.tasks) || !!hodDept;
  const allowPurchase   = canAccess(moduleRoles, ...INTENT_MODULES.purchase);

  // ── Precise keyword intent detection ──
  const wantProjects   = matches(q, "project", "active project", "ongoing project", "march", "april", "may", "created");
  const wantMR         = matches(q, "material request", "material req", "purchase request", "mr-");
  const wantPO         = matches(q, "purchase order", "vendor", "po-", "supplier");
  const wantEmployees  = matches(q, "employee", "staff", "worker", "headcount", "how many people", "team member", "personnel", "wtt");
  const wantDepts      = matches(q, "department", "dept", "division") && !matches(q, "project");
  const wantLeave      = matches(q, "leave", "vacation", "sick leave", "leave application", "on leave");
  const wantAttendance = matches(q, "attendance", "present", "absent", "check-in", "punch");
  const wantTasks      = matches(q, "task", "allocation", "task assign", "idle", "no task", "unassign");

  // ── Module context ──
  const onProjects  = mod.includes("project") && !mod.includes("dashboard");
  const onPurchase  = mod.includes("purchase") || mod.includes("material");
  const onHR        = mod.includes("hrms") || mod.includes("task summary") || mod.includes("team performance") || mod.includes("hr analytics");

  // ── Build list of fetches to run in parallel ──
  const fetches: Promise<void>[] = [];

  if (allowProjects && (wantProjects || onProjects)) {
    fetches.push(
      fetchErpNextProjects().then(projects => {
        const rows = (projects as Row[]).slice(0, MAX_ROWS).map((p: any) => ({
          name: p.name,
          status: p.status || "-",
          priority: p.priority || "-",
          progress: p.progress != null ? `${p.progress}%` : "-",
          due_date: p.dueDate || "-",
        }));
        parts.push(`ACTIVE PROJECTS FROM ERPNEXT (${projects.length} total):\n${toTable(rows, ["name", "status", "priority", "progress", "due_date"])}`);
      }).catch(() => {})
    );
  }

  if (allowHR && (wantEmployees || (onHR && matches(q, "employee", "staff", "how many", "member", "personnel", "headcount")))) {
    fetches.push(
      fetchErpNextEmployees({ status: "Active" }).then(employees => {
        // Group by dept for summary
        const byDept: Record<string, number> = {};
        employees.forEach((e: any) => {
          const d = e.department || "Unknown";
          byDept[d] = (byDept[d] || 0) + 1;
        });
        const deptSummary = Object.entries(byDept)
          .sort((a, b) => b[1] - a[1])
          .map(([d, c]) => `${d}: ${c}`)
          .join(" | ");
        const rows = employees.slice(0, MAX_ROWS).map((e: any) => ({
          id: e.name,
          name: e.employee_name,
          department: e.department || "-",
          designation: e.designation || "-",
        }));
        parts.push(
          `ACTIVE EMPLOYEES FROM ERPNEXT (${employees.length} total):\n` +
          `By Department: ${deptSummary}\n\n` +
          toTable(rows as Row[], ["id", "name", "department", "designation"])
        );
      }).catch(() => {})
    );
  }

  if (allowHR && (wantDepts || (onHR && matches(q, "department", "dept")))) {
    fetches.push(
      fetchErpNextDepartments().then(depts => {
        const rows = depts.map((d: any) => ({
          name: d.name,
          manager: d.department_manager_name || d.department_manager || "-",
          parent: d.parent_department || "-",
        }));
        parts.push(`DEPARTMENTS FROM ERPNEXT (${depts.length} total):\n${toTable(rows as Row[], ["name", "manager", "parent"])}`);
      }).catch(() => {})
    );
  }

  if (allowLeave && wantLeave) {
    fetches.push(
      fetchErpNextLeaveApplications().then(leaves => {
        const rows = (leaves as Row[]).slice(0, MAX_ROWS).map((l: any) => ({
          employee: l.employee_name || l.employee,
          type: l.leave_type || "-",
          from: l.from_date || "-",
          to: l.to_date || "-",
          days: l.total_leave_days || "-",
          status: l.status || "-",
        }));
        parts.push(`LEAVE APPLICATIONS FROM ERPNEXT (${leaves.length} total):\n${toTable(rows, ["employee", "type", "from", "to", "days", "status"])}`);
      }).catch(() => {})
    );
  }

  if (allowAttendance && wantAttendance) {
    fetches.push(
      fetchErpNextAttendance({ from_date: lastWeek, to_date: today, limit: 200 }).then(att => {
        const present = (att as any[]).filter((a: any) => a.status === "Present").length;
        const absent  = (att as any[]).filter((a: any) => a.status === "Absent").length;
        const onLeave = (att as any[]).filter((a: any) => a.status === "On Leave").length;
        parts.push(
          `ATTENDANCE (Last 7 days, ${att.length} records): Present=${present} | Absent=${absent} | On Leave=${onLeave}\n` +
          toTable((att as Row[]).slice(0, 30), ["employee_name", "attendance_date", "status", "department"])
        );
      }).catch(() => {})
    );
  }

  if (allowTasks && (wantTasks || (onHR && matches(q, "task", "idle", "allocation", "assign")))) {
    fetches.push(
      fetchErpNextTaskAllocations({ from_date: lastWeek, to_date: today }).then(allocs => {
        if (allocs.length > 0) {
          const rows = (allocs as Row[]).slice(0, MAX_ROWS).map((a: any) => ({
            employee: a.employee_name || a.employee,
            task: a.task_name || a.name || "-",
            department: a.department || "-",
            status: a.status || "-",
            hours: a.expected_hours ?? "-",
          }));
          parts.push(`TASK ALLOCATIONS (${allocs.length} total, last 7 days):\n${toTable(rows, ["employee", "task", "department", "status", "hours"])}`);
        }
      }).catch(() => {})
    );
  }

  if (allowPurchase && (wantMR || onPurchase)) {
    fetches.push(
      fetchErpNextMaterialRequests().then(mrs => {
        const rows = (mrs as Row[]).slice(0, MAX_ROWS).map((m: any) => ({
          name: m.name, status: m.status,
          project: m.project || "-", date: m.transaction_date || "-",
        }));
        parts.push(`MATERIAL REQUESTS FROM ERPNEXT (${mrs.length} total):\n${toTable(rows, ["name", "status", "project", "date"])}`);
      }).catch(() => {})
    );
  }

  if (allowPurchase && (wantPO || onPurchase)) {
    fetches.push(
      fetchErpNextPurchaseOrders().then(pos => {
        const rows = (pos as Row[]).slice(0, MAX_ROWS).map((p: any) => ({
          name: p.name,
          supplier: p.supplier_name ?? p.supplier,
          status: p.status,
          amount: p.grand_total != null ? `₹${Number(p.grand_total).toLocaleString("en-IN")}` : "-",
          date: p.transaction_date || "-",
        }));
        parts.push(`PURCHASE ORDERS FROM ERPNEXT (${pos.length} total):\n${toTable(rows, ["name", "supplier", "status", "amount", "date"])}`);
      }).catch(() => {})
    );
  }

  // Run all fetches in parallel
  await Promise.all(fetches);

  if (!parts.length) return "";
  return `\n\n## LIVE DATA FROM ERPNEXT & FLOWMATRIX\n${parts.join("\n\n")}`;
}

// ─── System prompt ────────────────────────────────────────────────────────────

const MODULE_KNOWLEDGE = `
FLOWMATRIX MODULES & CAPABILITIES:
- Dashboard: Live KPIs, project summaries, task status, attendance overview, recent activity
- Projects: Full project list from ERPNext — status, priority, progress %, due dates, departments
- Project Board: Procurement tracking — Material Request quantities, PO status, delivery dates, aging
- Project Timeline: Gantt-style milestone and schedule tracking per project
- Tasks (Kanban): Task board with To Do / In Progress / In Review / Done columns
- Task Summary: Employee & department task performance report — completion %, efficiency %, idle analysis
- Team Performance: Detailed breakdown of tasks per employee across departments
- P&ID Process: Piping & Instrumentation diagram viewer with AI BOM analysis
- Drawings: Engineering drawing repository — Mechanical, Electrical, Civil (from ERPNext)
- Design 2D: 2D CAD drawing viewer and annotator (DWG/DXF files from ERPNext)
- Design 3D: 3D STEP/IGES model viewer
- Viewer Options: 3D system selector — ETP, STP, WTP/RO, AHU, HVAC, Mechanical systems
- Presentation: PPTX slide deck viewer linked to ERPNext projects
- Meeting Minutes: Meeting recording, Whisper AI transcription, AI meeting summarization
- Material Request: Procurement workflow — create, track, and approve material requests via ERPNext
- Purchase Order: PO management and vendor payment tracking from ERPNext
- Purchase Dashboard: Analytics and overview of all purchase activities
- Stores Dashboard: Inventory and stores management overview
- HRMS: Full HR management — employee directory, departments, attendance, leave, payroll (all ERPNext live data)
- HR Incidents: Track HR incidents, safety events, and misconduct reports
- HR Analytics: Department-wise HR analytics, leave trends, attendance rates
- Leave Request: Employee leave application and approval workflow (ERPNext)
- Attendance: Employee attendance check-in/out tracking (ERPNext)
- Daily Reporting: Daily task reporting by employees
- Site Data: Live monitoring and data from field sites and equipment
- FlowTalk (Chat): Real-time team messaging with channels and direct messages
- Smart Inbox: AI-powered email — classifies, summarizes, and drafts replies automatically
- Email: Full email client integrated with Gmail/IMAP
- Sheets: Collaborative spreadsheet editor with formula support
- Marketing: Campaign management — budget, leads, conversions, ROI tracking
- Leads (CRM): Lead pipeline — status tracking, follow-ups, conversion analytics
- Campaigns: Marketing campaign performance and metrics
- Nesting: Material layout optimization algorithm for cutting/sheet metal manufacturing
- Gallery: Media asset library — images, documents, videos
- User Management: Admin panel — users, roles, module permissions
- Settings: App configuration — appearance, integrations, API keys
- Recruitment: HR recruitment and hiring pipeline
- Payment Tracker: Track payments and financial transactions
- MIS Report: Management information system reporting
- Process & Proposal: Technical proposal and process documentation management
- Finance Dashboard: Financial analytics and reporting
`;

function buildSystemPrompt(
  module?: string,
  liveData?: string,
  moduleRoles?: ModuleRoles | null,
  userEmail?: string,
  hodDept?: string | null,
): string {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata",
  });

  const isAdmin = !moduleRoles; // null = admin bypass

  let prompt = `You are FlowMatriX AI — the intelligent assistant for WTT (Water Treatment Technologies) company's FlowMatriX enterprise platform. Today is ${today} (IST).

ABOUT WTT & FLOWMATRIX:
- WTT (WTT India) is an engineering company specializing in water treatment, ETP, STP, WTP, RO systems, AHU, HVAC
- FlowMatriX is WTT's internal project management, HRMS, procurement, and engineering platform
- All employee, HR, attendance, leave, and project data is live from ERPNext (erp.wttint.com)
- Employee IDs follow the format WTT001, WTT002, etc.
- Departments include: Production, O&M, Project, Design-Electrical, Marketing, IT, Process, Procurement, HR, etc.

${MODULE_KNOWLEDGE}

ANSWER RULES:
1. ALWAYS answer directly with real data — NEVER say "navigate to X module" or "go to Y page"
2. When LIVE DATA is provided below, use those exact records and numbers to answer
3. If ERPNext data is not yet loaded for a specific query, say "Let me pull that — please ask again with more detail"
4. Present tables using markdown format for clarity
5. For timeline/schedule requests: number each milestone and end with <!-- TYPE:TIMELINE -->
6. For full report/PDF requests: write a complete structured document and end with <!-- TYPE:REPORT -->
7. You know all WTT modules — answer questions about any module confidently
8. For HR queries (attendance, leave, employees) — always reference ERPNext as the data source
9. Never invent or assume data — only use what is in the LIVE DATA section below`;

  // ── Permission constraints ──
  if (isAdmin) {
    prompt += `\n\nUSER CONTEXT: This user is an admin — they have full access to all FlowMatriX modules and data.`;
  } else {
    const allowed = Object.entries(moduleRoles!)
      .filter(([, role]) => role === "read" || role === "write")
      .map(([key]) => key);

    if (hodDept) {
      prompt += `\n\nUSER CONTEXT: User${userEmail ? ` (${userEmail})` : ""} is the Head of Department for "${hodDept}". They can view data for their department team members (employees, attendance, leave, tasks in "${hodDept}").`;
    } else if (userEmail) {
      prompt += `\n\nUSER CONTEXT: User (${userEmail}) has limited module access.`;
    }

    if (allowed.length === 0) {
      prompt += `\n\nPERMISSION RULES:
- This user has NO module access configured yet.
- Do NOT reveal any company data (employees, projects, procurement, attendance, HR records, financials).
- If asked for data, politely respond: "You don't have permission to view this information. Please contact your administrator to get access."
- You may still answer general questions about FlowMatriX platform features.`;
    } else {
      const canSeeProjects   = allowed.some(k => INTENT_MODULES.projects.includes(k));
      const canSeeHR         = allowed.some(k => INTENT_MODULES.hr.includes(k)) || !!hodDept;
      const canSeeLeave      = allowed.some(k => INTENT_MODULES.leave.includes(k)) || !!hodDept;
      const canSeeAttendance = allowed.some(k => INTENT_MODULES.attendance.includes(k)) || !!hodDept;
      const canSeeTasks      = allowed.some(k => INTENT_MODULES.tasks.includes(k)) || !!hodDept;
      const canSeePurchase   = allowed.some(k => INTENT_MODULES.purchase.includes(k));
      const canSeeFinance    = allowed.some(k => INTENT_MODULES.finance.includes(k));

      const restrictions: string[] = [];
      if (!canSeeProjects)   restrictions.push("projects and project timelines");
      if (!canSeeHR)         restrictions.push("employee directories and HR records");
      if (!canSeeLeave)      restrictions.push("leave applications");
      if (!canSeeAttendance) restrictions.push("attendance records");
      if (!canSeeTasks)      restrictions.push("task allocations");
      if (!canSeePurchase)   restrictions.push("material requests and purchase orders");
      if (!canSeeFinance)    restrictions.push("financial reports and payment data");

      prompt += `\n\nPERMISSION RULES:
- This user has access to these modules: ${allowed.join(", ")}`;
      if (hodDept) prompt += `\n- As Head of "${hodDept}" department, they can also query HR/attendance/leave data for their team.`;
      if (restrictions.length) {
        prompt += `\n- This user CANNOT view: ${restrictions.join("; ")}.
- If asked about restricted data, respond: "You don't have permission to view [topic]. Please contact your administrator."
- Never show restricted data even if LIVE DATA section is empty (do not explain what the data would contain).`;
      }
    }
  }

  if (module) {
    const key = module.split("–")[0]?.trim().split(" – ")[0]?.trim();
    prompt += `\n\nCURRENT MODULE THE USER IS VIEWING: ${module}`;
    if (key) prompt += ` — Be especially helpful about this module's features and data`;
  }

  if (liveData) {
    prompt += liveData;
  } else if (isErpNextConfigured()) {
    prompt += `\n\n## DATA SOURCE\nERPNext is connected (erp.wttint.com). Live data is available — ask specific questions to pull employee, project, HR, or procurement data.`;
  }

  return prompt;
}

// ─── Route ────────────────────────────────────────────────────────────────────

const ADMIN_EMAILS = ["edp@wttindia.com", "venkat@wttindia.com"];

router.post("/ai-search", async (req, res) => {
  const { query, history = [], module, userEmail, moduleRoles: rawModuleRoles, hodDept } = req.body as {
    query: string;
    history?: { role: "user" | "assistant"; content: string }[];
    module?: string;
    userEmail?: string;
    moduleRoles?: ModuleRoles;
    hodDept?: string | null;
  };

  if (!query?.trim()) {
    return res.status(400).json({ error: "Query is required" });
  }

  // Admins (by email) get null moduleRoles = full access; others get their actual roles
  const isAdmin = !userEmail || ADMIN_EMAILS.includes(userEmail.toLowerCase());
  const moduleRoles: ModuleRoles | null = isAdmin ? null : (rawModuleRoles ?? {});

  const stream = req.query.stream === "true" || req.body.stream === true;
  const liveData = await fetchLiveData(query, module, moduleRoles, hodDept);
  const systemPrompt = buildSystemPrompt(module, liveData, moduleRoles, userEmail, hodDept);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
    { role: "user", content: query },
  ];

  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    try {
      const streamResponse = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 3000,
        temperature: 0.3,
        stream: true,
      });

      for await (const chunk of streamResponse) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (e) {
      console.error("AI stream error:", e);
      res.write(`data: ${JSON.stringify({ error: String(e) })}\n\n`);
      res.end();
    }
  } else {
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 3000,
        temperature: 0.3,
      });
      res.json({ answer: completion.choices[0]?.message?.content ?? "No response" });
    } catch (e) {
      console.error("AI error:", e);
      res.status(500).json({ error: String(e) });
    }
  }
});

export default router;
