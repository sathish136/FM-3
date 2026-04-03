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
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

// ─── Live data fetcher ────────────────────────────────────────────────────────

async function fetchLiveData(query: string, module?: string): Promise<string> {
  const q = query.toLowerCase();
  const mod = (module || "").toLowerCase();
  const parts: string[] = [];
  const erp = isErpNextConfigured();

  // ── Keyword intent detection ──
  const wantProjects    = matches(q, "project", "active project", "ongoing project");
  const wantTasks       = matches(q, "task", "allocation", "assigned task", "task assign", "todo", "in progress", "kanban");
  const wantMR          = matches(q, "material request", "material req", "purchase request");
  const wantPO          = matches(q, "purchase order", "vendor", "po ");
  const wantEmployees   = matches(q, "employee", "staff", "worker", "headcount", "who work", "team member", "personnel");
  const wantDepts       = matches(q, "department", "dept", "division", "team");
  const wantLeave       = matches(q, "leave", "absent", "off day", "holiday", "vacation", "sick", "leave application");
  const wantAttendance  = matches(q, "attendance", "present", "absent", "checkin", "checkout", "punch");
  const wantHRMS        = matches(q, "hrms", "hr ", "human resource", "payroll", "salary");
  const wantIdleEmp     = matches(q, "idle", "no task", "without task", "not assign", "unassign");
  const wantSummary     = matches(q, "summary", "overview", "how many", "total", "count", "report", "analytics", "dashboard", "kpi");

  // ── Module-based intent detection ──
  const onHRMS       = mod.includes("hrms") || mod.includes("hr") || mod.includes("task summary") || mod.includes("team performance");
  const onProjects   = mod.includes("project") && !mod.includes("dashboard");
  const onPurchase   = mod.includes("purchase") || mod.includes("material");
  const onDashboard  = mod.includes("dashboard");

  try {

    // ── Projects ──────────────────────────────────────────────────────────────
    if ((wantProjects || onProjects || (onDashboard && wantSummary)) && erp) {
      const projects = await fetchErpNextProjects();
      const rows = (projects as Row[]).slice(0, MAX_ROWS).map((p: any) => ({
        name: p.name,
        status: p.status || "-",
        priority: p.priority || "-",
        progress: p.progress != null ? `${p.progress}%` : "-",
        due_date: p.dueDate || "-",
      }));
      parts.push(`ACTIVE PROJECTS FROM ERPNEXT (${projects.length} total):\n${toTable(rows, ["name", "status", "priority", "progress", "due_date"])}`);
    }

    // ── Employees ─────────────────────────────────────────────────────────────
    if ((wantEmployees || wantHRMS || onHRMS || wantSummary) && erp) {
      const employees = await fetchErpNextEmployees({ status: "Active" });
      const rows = employees.map((e: any) => ({
        id: e.name,
        name: e.employee_name,
        department: e.department || "-",
        designation: e.designation || "-",
        gender: e.gender || "-",
        contact: e.cell_number || "-",
      }));
      parts.push(`ACTIVE EMPLOYEES FROM ERPNEXT (${employees.length} total):\n${toTable(rows, ["id", "name", "department", "designation", "gender"])}`);
    }

    // ── Departments ───────────────────────────────────────────────────────────
    if ((wantDepts || onHRMS || wantHRMS) && erp) {
      const depts = await fetchErpNextDepartments();
      const rows = depts.map((d: any) => ({
        name: d.name,
        manager: d.department_manager_name || d.department_manager || "-",
        parent: d.parent_department || "-",
        company: d.company || "-",
      }));
      parts.push(`DEPARTMENTS FROM ERPNEXT (${depts.length} total):\n${toTable(rows, ["name", "manager", "parent"])}`);
    }

    // ── Leave Applications ────────────────────────────────────────────────────
    if ((wantLeave || onHRMS) && erp) {
      const leaves = await fetchErpNextLeaveApplications();
      const rows = (leaves as Row[]).slice(0, MAX_ROWS).map((l: any) => ({
        employee: l.employee_name || l.employee,
        type: l.leave_type || "-",
        from: l.from_date || "-",
        to: l.to_date || "-",
        days: l.total_leave_days || "-",
        status: l.status || "-",
      }));
      parts.push(`LEAVE APPLICATIONS FROM ERPNEXT (${leaves.length} total):\n${toTable(rows, ["employee", "type", "from", "to", "days", "status"])}`);
    }

    // ── Attendance ────────────────────────────────────────────────────────────
    if ((wantAttendance || onHRMS) && erp) {
      const today = new Date().toISOString().split("T")[0];
      const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const att = await fetchErpNextAttendance({ from_date: lastWeek, to_date: today, limit: 200 });
      const presentCount = (att as any[]).filter((a: any) => a.status === "Present").length;
      const absentCount  = (att as any[]).filter((a: any) => a.status === "Absent").length;
      const leaveCount   = (att as any[]).filter((a: any) => a.status === "On Leave").length;
      parts.push(
        `ATTENDANCE SUMMARY (Last 7 days, ${att.length} records):\n` +
        `Present: ${presentCount} | Absent: ${absentCount} | On Leave: ${leaveCount}\n\n` +
        `RECENT ATTENDANCE:\n${toTable((att as Row[]).slice(0, 30), ["employee_name", "attendance_date", "status", "department"])}`
      );
    }

    // ── Task Allocations ──────────────────────────────────────────────────────
    if ((wantTasks || wantIdleEmp || onHRMS) && erp) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
        const allocs = await fetchErpNextTaskAllocations({ from_date: lastWeek, to_date: today });
        if (allocs.length > 0) {
          const rows = (allocs as Row[]).slice(0, MAX_ROWS).map((a: any) => ({
            employee: a.employee_name || a.employee,
            task: a.task_name || a.name || "-",
            department: a.department || "-",
            status: a.status || "-",
            date: a.date || a.creation?.split(" ")[0] || "-",
            hours: a.expected_hours ?? "-",
          }));
          parts.push(`TASK ALLOCATIONS FROM ERPNEXT (${allocs.length} total, last 7 days):\n${toTable(rows, ["employee", "task", "department", "status", "date", "hours"])}`);
        }
      } catch { /* skip if task allocations not available */ }
    }

    // ── Material Requests ─────────────────────────────────────────────────────
    if ((wantMR || onPurchase) && erp) {
      const mrs = await fetchErpNextMaterialRequests();
      const rows = (mrs as Row[]).slice(0, MAX_ROWS).map((m: any) => ({
        name: m.name,
        status: m.status,
        project: m.project || "-",
        date: m.transaction_date || "-",
        type: m.material_request_type || "-",
      }));
      parts.push(`MATERIAL REQUESTS FROM ERPNEXT (${mrs.length} total):\n${toTable(rows, ["name", "status", "project", "date", "type"])}`);
    }

    // ── Purchase Orders ───────────────────────────────────────────────────────
    if ((wantPO || onPurchase) && erp) {
      const pos = await fetchErpNextPurchaseOrders();
      const rows = (pos as Row[]).slice(0, MAX_ROWS).map((p: any) => ({
        name: p.name,
        supplier: p.supplier_name ?? p.supplier,
        status: p.status,
        amount: p.grand_total != null ? `₹${Number(p.grand_total).toLocaleString("en-IN")}` : "-",
        date: p.transaction_date || "-",
      }));
      parts.push(`PURCHASE ORDERS FROM ERPNEXT (${pos.length} total):\n${toTable(rows, ["name", "supplier", "status", "amount", "date"])}`);
    }

    // ── General summary / dashboard ───────────────────────────────────────────
    if (wantSummary && onDashboard && erp && !parts.length) {
      const [projects, employees, mrs, pos] = await Promise.allSettled([
        fetchErpNextProjectList(),
        fetchErpNextEmployees({ status: "Active" }),
        fetchErpNextMaterialRequests(),
        fetchErpNextPurchaseOrders(),
      ]);
      const pCount = projects.status === "fulfilled" ? projects.value.length : "?";
      const eCount = employees.status === "fulfilled" ? employees.value.length : "?";
      const mCount = mrs.status === "fulfilled" ? mrs.value.length : "?";
      const poCount = pos.status === "fulfilled" ? pos.value.length : "?";
      parts.push(
        `WTT ERPNEXT LIVE SUMMARY:\n` +
        `Total Active Projects: ${pCount}\n` +
        `Total Active Employees: ${eCount}\n` +
        `Material Requests: ${mCount}\n` +
        `Purchase Orders: ${poCount}`
      );
    }

  } catch (e) {
    console.error("AI context fetch error:", e);
  }

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

function buildSystemPrompt(module?: string, liveData?: string): string {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata",
  });

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

router.post("/ai-search", async (req, res) => {
  const { query, history = [], module } = req.body as {
    query: string;
    history?: { role: "user" | "assistant"; content: string }[];
    module?: string;
  };

  if (!query?.trim()) {
    return res.status(400).json({ error: "Query is required" });
  }

  const stream = req.query.stream === "true" || req.body.stream === true;
  const liveData = await fetchLiveData(query, module);
  const systemPrompt = buildSystemPrompt(module, liveData);

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
