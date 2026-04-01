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

// ─── Live data fetcher ────────────────────────────────────────────────────────

type FetchedContext = { label: string; data: unknown }[];

function queryMatches(q: string, ...keywords: string[]): boolean {
  const lower = q.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

async function fetchLiveData(query: string, module?: string): Promise<FetchedContext> {
  const ctx: FetchedContext = [];
  const q = query.toLowerCase();
  const mod = (module || "").toLowerCase();

  const wantsProjects =
    queryMatches(q, "project", "active project", "overdue project", "project status", "how many project") ||
    mod.includes("project") || mod.includes("dashboard");

  const wantsTasks =
    queryMatches(q, "task", "todo", "in progress", "pending task", "done", "kanban", "board", "assignee") ||
    mod.includes("task") || mod.includes("board");

  const wantsCampaigns =
    queryMatches(q, "campaign", "marketing") ||
    mod.includes("campaign") || mod.includes("marketing");

  const wantsLeads =
    queryMatches(q, "lead", "crm", "pipeline", "prospect", "conversion") ||
    mod.includes("lead");

  const wantsTeam =
    queryMatches(q, "team", "member", "staff", "colleague", "who is") ||
    mod.includes("team");

  const wantsMR =
    queryMatches(q, "material request", "material", "mr", "procurement", "request") ||
    mod.includes("material");

  const wantsPO =
    queryMatches(q, "purchase order", "purchase", "po", "vendor", "supplier", "order") ||
    mod.includes("purchase");

  const wantsSummary =
    queryMatches(q, "summary", "overview", "how many", "total", "count", "all", "dashboard", "status", "report", "analytics") ||
    mod.includes("dashboard");

  try {
    if (wantsProjects || wantsSummary) {
      let projects: unknown[];
      if (isErpNextConfigured()) {
        projects = await fetchErpNextProjects();
      } else {
        const rows = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
        projects = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
      }
      ctx.push({ label: "Projects", data: projects });
    }

    if (wantsTasks || wantsSummary) {
      const rows = await db.select().from(tasksTable).orderBy(tasksTable.createdAt);
      ctx.push({ label: "Tasks", data: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) });
    }

    if (wantsCampaigns || wantsSummary) {
      const rows = await db.select().from(campaignsTable).orderBy(campaignsTable.createdAt);
      ctx.push({ label: "Campaigns", data: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) });
    }

    if (wantsLeads || wantsSummary) {
      const rows = await db.select().from(leadsTable).orderBy(leadsTable.createdAt);
      ctx.push({ label: "Leads", data: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) });
    }

    if (wantsTeam) {
      const rows = await db.select().from(teamMembersTable).orderBy(teamMembersTable.createdAt);
      ctx.push({ label: "Team Members", data: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) });
    }

    if (wantsMR && isErpNextConfigured()) {
      const mrs = await fetchErpNextMaterialRequests();
      ctx.push({ label: "Material Requests", data: mrs });
    }

    if (wantsPO && isErpNextConfigured()) {
      const pos = await fetchErpNextPurchaseOrders();
      ctx.push({ label: "Purchase Orders", data: pos });
    }

    if (wantsSummary) {
      const [ls] = await db.select({
        totalLeads: sql<number>`count(*)::int`,
        converted: sql<number>`sum(case when status='converted' then 1 else 0 end)::int`,
      }).from(leadsTable);
      const [cs] = await db.select({
        activeCampaigns: sql<number>`sum(case when status='active' then 1 else 0 end)::int`,
        totalBudget: sql<number>`coalesce(sum(budget::numeric),0)::float`,
        totalSpent: sql<number>`coalesce(sum(spent::numeric),0)::float`,
      }).from(campaignsTable);
      const [ps] = await db.select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`sum(case when status='active' then 1 else 0 end)::int`,
        completed: sql<number>`sum(case when status='completed' then 1 else 0 end)::int`,
        planning: sql<number>`sum(case when status='planning' then 1 else 0 end)::int`,
        onHold: sql<number>`sum(case when status='on-hold' then 1 else 0 end)::int`,
      }).from(projectsTable);
      const [ts] = await db.select({
        total: sql<number>`count(*)::int`,
        todo: sql<number>`sum(case when status='todo' then 1 else 0 end)::int`,
        inProgress: sql<number>`sum(case when status='in-progress' then 1 else 0 end)::int`,
        inReview: sql<number>`sum(case when status='in-review' then 1 else 0 end)::int`,
        done: sql<number>`sum(case when status='done' then 1 else 0 end)::int`,
      }).from(tasksTable);
      ctx.push({
        label: "Summary Statistics",
        data: {
          projects: ps,
          tasks: ts,
          leads: { total: ls?.totalLeads, converted: ls?.converted },
          campaigns: cs,
        },
      });
    }
  } catch (e) {
    console.error("AI data fetch error:", e);
  }

  return ctx;
}

function formatContextForPrompt(ctx: FetchedContext): string {
  if (!ctx.length) return "";
  const parts = ctx.map(({ label, data }) => {
    const json = JSON.stringify(data, null, 2);
    return `### ${label}\n\`\`\`json\n${json}\n\`\`\``;
  });
  return `\n\n## LIVE DATA FROM THE SYSTEM (use this to answer directly)\n${parts.join("\n\n")}`;
}

// ─── System prompt ────────────────────────────────────────────────────────────

const MODULE_DESCRIPTIONS: Record<string, string> = {
  "Dashboard":               "The Dashboard shows high-level KPIs, project summaries, recent activity, and key metrics across the system.",
  "Tasks":                   "The Tasks module is a kanban board with four columns: To Do, In Progress, In Review, and Done.",
  "Projects":                "The Projects module lists all ongoing projects with status, deadlines, and team assignments.",
  "Project Board":           "The Project Board is a kanban-style view scoped to a specific project.",
  "Project Timeline":        "The Project Timeline is a Gantt-style scheduler for tracking project milestones and deadlines.",
  "P&ID Process":            "The P&ID module is a piping and instrumentation diagram viewer with AI BOM generation.",
  "Drawings":                "The Drawings module stores engineering drawings across Mechanical, Electrical, and Civil categories.",
  "Design 2D":               "The Design 2D module is a 2D CAD drawing viewer and annotator (DWG/DXF).",
  "Design 3D":               "The Design 3D module renders 3D STEP/IGES mechanical models.",
  "Viewer Options":          "The Viewer Options module is the 3D system selector for engineering systems.",
  "Mechanical Viewer":       "The Mechanical Viewer is a full 3D STEP file viewer with mesh panel.",
  "Presentation":            "The Presentation module displays PPTX slide decks.",
  "Meeting Minutes":         "The Meeting Minutes module lets users record, transcribe (Whisper AI), and summarize meetings.",
  "Sheets":                  "The Sheets module is a collaborative spreadsheet editor.",
  "Material Request":        "The Material Request module manages procurement workflows.",
  "Purchase Order":          "The Purchase Order module manages and tracks purchase orders and vendor payments.",
  "HRMS":                    "The HRMS module connects to ERPNext for employee directories, attendance, and leave management.",
  "User Management":         "The User Management module is an admin panel for users, roles, and permissions.",
  "Settings":                "The Settings module covers application-level configuration.",
  "Profile":                 "The Profile module lets users update personal information and credentials.",
  "Campaigns":               "The Campaigns module tracks marketing campaigns including status, budget, and metrics.",
  "Leads":                   "The Leads module is a CRM tool for tracking sales leads and pipeline stages.",
  "Team":                    "The Team module is a directory of all team members.",
  "Gallery":                 "The Gallery module is a media asset library.",
  "Smart Inbox":             "The Smart Inbox uses AI to classify, summarize, and draft replies for emails.",
  "FlowTalk":                "FlowTalk is the real-time team messaging platform with public/private channels.",
  "Site Data":               "The Site Data module provides live monitoring from field sites and equipment.",
  "Nesting":                 "The Nesting module optimizes material layout for cutting and sheet metal.",
};

function buildSystemPrompt(module?: string, liveDataCtx?: string): string {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const base = `You are a helpful AI assistant embedded in WTT FlowMatriX — a comprehensive project management and engineering platform. Today is ${today}.

## CRITICAL RULES
1. **NEVER tell the user to navigate anywhere** — do not say "go to the Projects module", "navigate to X", "you can find this in Y". Always answer directly.
2. **When live data is provided below, use it to answer directly** — show the actual records, counts, statuses, names. Present the data clearly in your response.
3. **If no live data is provided**, answer based on your general knowledge of the platform.
4. **For data questions** (how many projects, what tasks are pending, who is on the team, etc.) — present the actual data in a clear table or list format.
5. You can also answer any general knowledge question (science, math, coding, writing, etc.).

## Response formatting
- Use **Markdown**: headers, bullet lists, numbered lists, **bold**, tables
- For lists of items: use a markdown table or bullet list with key fields (name, status, date, assignee, etc.)
- For counts/summaries: give the exact numbers from the data
- For timelines: use structured numbered format — end with <!-- TYPE:TIMELINE -->
- For PDF reports: use full document structure — end with <!-- TYPE:REPORT -->
- Be direct and data-driven

## Platform modules
- Dashboard, Tasks, Projects, Project Board, Project Timeline, P&ID, Drawings, Design 2D/3D, Presentation, Meeting Minutes, Sheets, Material Request, Purchase Order, Smart Inbox, FlowTalk, HRMS, Site Data, Nesting, Campaigns, Leads, Team, Gallery, User Management, Settings`;

  let contextSection = "";
  if (module) {
    const moduleKey = module.split("–")[0]?.trim();
    const desc = moduleKey ? MODULE_DESCRIPTIONS[moduleKey] : null;
    if (desc) {
      contextSection = `\n\n## Current module\nUser is on **${moduleKey}**. ${desc}`;
    } else {
      contextSection = `\n\n## Current module\nUser is viewing: ${module}.`;
    }
  }

  return base + contextSection + (liveDataCtx || "");
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

  const liveCtx = await fetchLiveData(query, module);
  const liveDataStr = formatContextForPrompt(liveCtx);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(module, liveDataStr) },
    ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
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
        max_tokens: 4096,
        temperature: 0.4,
        stream: true,
      });

      for await (const chunk of streamResponse) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (e) {
      console.error("AI search stream error:", e);
      res.write(`data: ${JSON.stringify({ error: String(e) })}\n\n`);
      res.end();
    }
  } else {
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 4096,
        temperature: 0.4,
      });

      const answer = completion.choices[0]?.message?.content ?? "No response";
      res.json({ answer });
    } catch (e) {
      console.error("AI search error:", e);
      res.status(500).json({ error: String(e) });
    }
  }
});

export default router;
