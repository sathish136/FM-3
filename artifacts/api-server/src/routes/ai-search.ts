import { Router } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import {
  projectsTable,
  tasksTable,
  campaignsTable,
  leadsTable,
  teamMembersTable,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import {
  isErpNextConfigured,
  fetchErpNextProjects,
  fetchErpNextMaterialRequests,
  fetchErpNextPurchaseOrders,
} from "../lib/erpnext";

const router = Router();

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// ─── Compact data formatter ───────────────────────────────────────────────────

const MAX_ROWS = 30;

function matches(q: string, ...kw: string[]): boolean {
  const l = q.toLowerCase();
  return kw.some((k) => l.includes(k));
}

type Row = Record<string, unknown>;

function toTable(rows: Row[], fields: string[]): string {
  if (!rows.length) return "(no records)";
  const header = fields.join(" | ");
  const sep = fields.map(() => "---").join(" | ");
  const body = rows.slice(0, MAX_ROWS).map((r) =>
    fields.map((f) => {
      const v = r[f];
      if (v == null) return "-";
      const s = String(v);
      return s.length > 50 ? s.slice(0, 47) + "..." : s;
    }).join(" | ")
  ).join("\n");
  const note = rows.length > MAX_ROWS ? `\n(${MAX_ROWS} of ${rows.length} shown)` : "";
  return `${header}\n${sep}\n${body}${note}`;
}

// ─── Live data fetcher ────────────────────────────────────────────────────────

async function fetchLiveData(query: string, module?: string): Promise<string> {
  const q = query.toLowerCase();
  const mod = (module || "").toLowerCase();
  const parts: string[] = [];

  const onDashboard = mod.includes("dashboard");
  const onProjects  = mod.includes("project") && !onDashboard;
  const onTasks     = mod.includes("task") || mod.includes("board");
  const onLeads     = mod.includes("lead") && !onDashboard;
  const onCampaigns = mod.includes("campaign") && !onDashboard;
  const onTeam      = mod.includes("team");
  const onMR        = mod.includes("material");
  const onPO        = mod.includes("purchase");

  const askProjects  = matches(q, "project", "active project") || onProjects;
  const askTasks     = matches(q, "task", "todo", "in progress", "in review", "done", "kanban", "board", "assignee") || onTasks;
  const askCampaigns = matches(q, "campaign", "marketing") || onCampaigns;
  const askLeads     = matches(q, "lead", "crm", "pipeline", "prospect") || onLeads;
  const askTeam      = matches(q, "team", "member", "staff", "who is") || onTeam;
  const askMR        = matches(q, "material request") || onMR;
  const askPO        = matches(q, "purchase order") || onPO;
  const askCounts    = matches(q, "how many", "total", "count", "summary", "overview", "analytics") || onDashboard;

  try {
    if (askCounts) {
      const [ps] = await db.select({
        total:     sql<number>`count(*)::int`,
        active:    sql<number>`sum(case when status='active' then 1 else 0 end)::int`,
        completed: sql<number>`sum(case when status='completed' then 1 else 0 end)::int`,
        planning:  sql<number>`sum(case when status='planning' then 1 else 0 end)::int`,
        on_hold:   sql<number>`sum(case when status='on-hold' then 1 else 0 end)::int`,
      }).from(projectsTable);
      const [ts] = await db.select({
        total:       sql<number>`count(*)::int`,
        todo:        sql<number>`sum(case when status='todo' then 1 else 0 end)::int`,
        in_progress: sql<number>`sum(case when status='in-progress' then 1 else 0 end)::int`,
        in_review:   sql<number>`sum(case when status='in-review' then 1 else 0 end)::int`,
        done:        sql<number>`sum(case when status='done' then 1 else 0 end)::int`,
      }).from(tasksTable);
      const [ls] = await db.select({
        total:     sql<number>`count(*)::int`,
        converted: sql<number>`sum(case when status='converted' then 1 else 0 end)::int`,
        new_leads: sql<number>`sum(case when status='new' then 1 else 0 end)::int`,
      }).from(leadsTable);
      const [cs] = await db.select({
        total:           sql<number>`count(*)::int`,
        active:          sql<number>`sum(case when status='active' then 1 else 0 end)::int`,
        total_budget:    sql<number>`coalesce(sum(budget::numeric),0)::float`,
        total_spent:     sql<number>`coalesce(sum(spent::numeric),0)::float`,
      }).from(campaignsTable);
      parts.push(
        `SUMMARY STATISTICS:\n` +
        `Projects: total=${ps?.total}, active=${ps?.active}, completed=${ps?.completed}, planning=${ps?.planning}, on-hold=${ps?.on_hold}\n` +
        `Tasks: total=${ts?.total}, todo=${ts?.todo}, in-progress=${ts?.in_progress}, in-review=${ts?.in_review}, done=${ts?.done}\n` +
        `Leads: total=${ls?.total}, new=${ls?.new_leads}, converted=${ls?.converted}\n` +
        `Campaigns: total=${cs?.total}, active=${cs?.active}, budget=₹${cs?.total_budget?.toFixed(0)}, spent=₹${cs?.total_spent?.toFixed(0)}`
      );
    }

    if (askProjects && !askCounts) {
      let rows: Row[];
      if (isErpNextConfigured()) {
        const erp = await fetchErpNextProjects();
        rows = erp.map((p: Row) => ({
          name: p.name || p.project_name,
          status: p.status,
          priority: p.priority,
          progress: p.percent_complete ?? p.progress,
          due_date: p.expected_end_date ?? p.due_date,
        }));
      } else {
        const dbRows = await db.select({
          id: projectsTable.id,
          name: projectsTable.name,
          status: projectsTable.status,
          priority: projectsTable.priority,
          progress: projectsTable.progress,
          due_date: projectsTable.dueDate,
        }).from(projectsTable).orderBy(projectsTable.createdAt);
        rows = dbRows as unknown as Row[];
      }
      parts.push(`PROJECTS (${rows.length} total):\n${toTable(rows, ["name", "status", "priority", "progress", "due_date"])}`);
    }

    if (askTasks) {
      const dbRows = await db.select({
        id: tasksTable.id,
        title: tasksTable.title,
        status: tasksTable.status,
        priority: tasksTable.priority,
        assignee: tasksTable.assignee,
        due_date: tasksTable.dueDate,
      }).from(tasksTable).orderBy(tasksTable.createdAt);
      parts.push(`TASKS (${dbRows.length} total):\n${toTable(dbRows as unknown as Row[], ["title", "status", "priority", "assignee", "due_date"])}`);
    }

    if (askLeads && !askCounts) {
      const dbRows = await db.select({
        id: leadsTable.id,
        name: leadsTable.name,
        company: leadsTable.company,
        status: leadsTable.status,
        email: leadsTable.email,
      }).from(leadsTable).orderBy(leadsTable.createdAt);
      parts.push(`LEADS (${dbRows.length} total):\n${toTable(dbRows as unknown as Row[], ["name", "company", "status", "email"])}`);
    }

    if (askCampaigns && !askCounts) {
      const dbRows = await db.select({
        id: campaignsTable.id,
        name: campaignsTable.name,
        status: campaignsTable.status,
        type: campaignsTable.type,
        budget: campaignsTable.budget,
        spent: campaignsTable.spent,
        start_date: campaignsTable.startDate,
        end_date: campaignsTable.endDate,
      }).from(campaignsTable).orderBy(campaignsTable.createdAt);
      parts.push(`CAMPAIGNS (${dbRows.length} total):\n${toTable(dbRows as unknown as Row[], ["name", "status", "type", "budget", "spent"])}`);
    }

    if (askTeam) {
      const dbRows = await db.select({
        name: teamMembersTable.name,
        role: teamMembersTable.role,
        department: teamMembersTable.department,
        email: teamMembersTable.email,
      }).from(teamMembersTable).orderBy(teamMembersTable.createdAt);
      parts.push(`TEAM MEMBERS (${dbRows.length} total):\n${toTable(dbRows as unknown as Row[], ["name", "role", "department", "email"])}`);
    }

    if (askMR && isErpNextConfigured()) {
      const mrs = await fetchErpNextMaterialRequests();
      const rows = (mrs as Row[]).slice(0, MAX_ROWS).map((m) => ({
        name: m.name,
        status: m.status,
        project: m.project,
        date: m.transaction_date,
      }));
      parts.push(`MATERIAL REQUESTS (${mrs.length} total):\n${toTable(rows, ["name", "status", "project", "date"])}`);
    }

    if (askPO && isErpNextConfigured()) {
      const pos = await fetchErpNextPurchaseOrders();
      const rows = (pos as Row[]).slice(0, MAX_ROWS).map((p) => ({
        name: p.name,
        supplier: p.supplier_name ?? p.supplier,
        status: p.status,
        amount: p.grand_total,
        date: p.transaction_date,
      }));
      parts.push(`PURCHASE ORDERS (${pos.length} total):\n${toTable(rows, ["name", "supplier", "status", "amount", "date"])}`);
    }
  } catch (e) {
    console.error("AI context fetch error:", e);
  }

  if (!parts.length) return "";
  return `\n\n## LIVE SYSTEM DATA\n${parts.join("\n\n")}`;
}

// ─── System prompt ────────────────────────────────────────────────────────────

const MODULE_DESCRIPTIONS: Record<string, string> = {
  "Dashboard":        "KPIs, project summaries, recent activity, and key metrics.",
  "Tasks":            "Kanban board: To Do, In Progress, In Review, Done.",
  "Projects":         "Project list with status, deadlines, and team assignments.",
  "Project Board":    "Kanban view scoped to a specific project.",
  "Project Timeline": "Gantt-style milestone and schedule tracking.",
  "P&ID Process":     "Piping & instrumentation diagram viewer with AI BOM generation.",
  "Drawings":         "Engineering drawings: Mechanical, Electrical, Civil.",
  "Design 2D":        "2D CAD viewer and annotator (DWG/DXF).",
  "Design 3D":        "3D STEP/IGES model viewer.",
  "Viewer Options":   "3D system selector (ETP, STP, WTP/RO, AHU, HVAC, etc.).",
  "Mechanical Viewer":"Full 3D STEP viewer with mesh panel.",
  "Presentation":     "PPTX slide deck viewer.",
  "Meeting Minutes":  "Meeting recording, Whisper AI transcription, AI summarization.",
  "Sheets":           "Collaborative spreadsheet editor.",
  "Material Request": "Procurement and material request workflow.",
  "Purchase Order":   "Purchase order management and vendor tracking.",
  "HRMS":             "Employee directory, attendance, leave management (ERPNext).",
  "User Management":  "Admin panel for users, roles, and permissions.",
  "Settings":         "App configuration: users, notifications, integrations, API keys.",
  "Profile":          "Personal account settings.",
  "Campaigns":        "Marketing campaigns: status, budget, metrics.",
  "Leads":            "CRM lead and pipeline management.",
  "Team":             "Team member directory.",
  "Gallery":          "Media asset library.",
  "Smart Inbox":      "AI email inbox: classify, summarize, draft replies.",
  "FlowTalk":         "Real-time team messaging with channels.",
  "Site Data":        "Live monitoring from field sites and equipment.",
  "Nesting":          "Material layout optimization for cutting/sheet metal.",
};

function buildSystemPrompt(module?: string, liveData?: string): string {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  let prompt = `You are a helpful AI assistant in WTT FlowMatriX (project management & engineering platform). Today is ${today}.

RULES:
1. NEVER say "navigate to X" or "go to the Y module" — always answer directly with data or information.
2. When LIVE SYSTEM DATA is provided below, use those exact numbers/records to answer. Do not guess.
3. Present data clearly using markdown tables or bullet lists.
4. For timeline requests, number the milestones and end with <!-- TYPE:TIMELINE -->
5. For PDF/report requests, write a full structured document and end with <!-- TYPE:REPORT -->
6. You can answer any general question too (math, science, coding, writing, etc.).`;

  if (module) {
    const key = module.split("–")[0]?.trim();
    const desc = key ? MODULE_DESCRIPTIONS[key] : null;
    prompt += desc
      ? `\n\nCURRENT MODULE: ${key} — ${desc}`
      : `\n\nCURRENT MODULE: ${module}`;
  }

  if (liveData) {
    prompt += liveData;
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
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
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
        max_tokens: 2048,
        temperature: 0.4,
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
        max_tokens: 2048,
        temperature: 0.4,
      });
      res.json({ answer: completion.choices[0]?.message?.content ?? "No response" });
    } catch (e) {
      console.error("AI error:", e);
      res.status(500).json({ error: String(e) });
    }
  }
});

export default router;
