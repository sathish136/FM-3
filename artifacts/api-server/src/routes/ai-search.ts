import { Router } from "express";
import OpenAI from "openai";

const router = Router();

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const MODULE_DESCRIPTIONS: Record<string, string> = {
  "Dashboard":               "The Dashboard shows high-level KPIs, project summaries, recent activity, and key metrics across the system.",
  "Tasks":                   "The Tasks module is a kanban board with four columns: To Do, In Progress, In Review, and Done. Users can create, edit, assign, prioritize, and drag tasks between columns.",
  "Projects":                "The Projects module lists all ongoing projects with status, deadlines, and team assignments. Users can view project details, update status, and track progress.",
  "Project Board":           "The Project Board is a kanban-style view scoped to a specific project, showing tasks by workflow stage.",
  "Project Timeline":        "The Project Timeline is a Gantt-style scheduler for tracking project milestones and deadlines.",
  "Kanban":                  "The Kanban board organizes tasks visually by status columns for workflow management.",
  "P&ID Process":            "The P&ID module is a piping and instrumentation diagram viewer. It supports PDF uploads, page navigation, and AI-powered analysis that generates a Bill of Materials (BOM) from the diagram.",
  "Drawings":                "The Drawings module stores and displays engineering drawings across three categories: Mechanical, Electrical, and Civil. Drawings can be uploaded as PDFs.",
  "Design 2D":               "The Design 2D module is a 2D CAD drawing viewer and annotator supporting DWG and DXF files.",
  "Design 3D":               "The Design 3D module renders 3D STEP/IGES mechanical models with orbit, pan, and zoom controls.",
  "Viewer Options":          "The Viewer Options module is the 3D system selector. It lists engineering systems (ETP, STP, WTP/RO, AHU, HVAC, Fire, Thermic, Process, Electrical, Instrumentation) and allows users to open their 3D STEP models.",
  "Mechanical Viewer":       "The Mechanical Viewer is a full 3D STEP file viewer with a mesh panel for toggling component visibility, view modes (solid, wireframe), and background color controls.",
  "Presentation":            "The Presentation module displays slide decks. It supports PPTX file uploads and renders slides with navigation controls.",
  "Meeting Minutes":         "The Meeting Minutes module lets users record, transcribe (via Whisper AI), and summarize meetings. It generates structured summaries with key points, decisions, and action items.",
  "Sheets":                  "The Sheets module is a collaborative spreadsheet editor supporting formulas, multiple sheets, and data import.",
  "Material Request":        "The Material Request module manages procurement workflows. Users can submit, review, and approve material requests.",
  "Purchase Order":          "The Purchase Order module manages and tracks purchase orders, vendor payments, and order approvals.",
  "HRMS":                    "The HRMS module connects to ERPNext to display employee directories, attendance records, and leave management data.",
  "User Management":         "The User Management module is an admin panel for managing user accounts, assigning roles (Admin, Editor, Viewer), and controlling module-level permissions.",
  "Settings":                "The Settings module covers application-level configuration: user management, roles & permissions, notification preferences, appearance/theme, external integrations, and API key management.",
  "Profile":                 "The Profile module lets users update their personal information, profile picture, and account credentials.",
  "Campaigns":               "The Campaigns module tracks marketing campaigns including status, budget, performance metrics, and scheduling.",
  "Leads":                   "The Leads module is a CRM tool for tracking sales leads, pipeline stages, follow-up tasks, and lead assignments.",
  "Team":                    "The Team module is a directory of all team members with their contact information and department.",
  "Gallery":                 "The Gallery module is a media asset library. Users can upload, search, filter, tag, download, and delete files including images, documents, and videos.",
  "Smart Inbox":             "The Smart Inbox uses AI to classify, summarize, and draft replies for incoming emails automatically.",
  "FlowTalk":                "FlowTalk is the real-time team messaging platform with public/private channels, reactions, and file sharing.",
  "Site Data":               "The Site Data module provides live monitoring and data from field sites and equipment.",
  "Nesting":                 "The Nesting module optimizes material layout for cutting and sheet metal using algorithms.",
};

function buildSystemPrompt(module?: string): string {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const base = `You are FlowAI — an intelligent, versatile AI assistant integrated into WTT FlowMatriX, a comprehensive project management and engineering platform. Today is ${today}.

## Your capabilities
You can help with ANYTHING the user asks, including:
- **General knowledge**: Science, history, math, technology, business, engineering, coding, writing, language, etc.
- **Platform help**: How to use any module in the FlowMatriX platform
- **Document generation**: Write reports, proposals, meeting summaries, project briefs, technical docs
- **Data analysis**: Interpret data, suggest insights, answer analytical questions
- **Timeline generation**: Create project timelines, schedules, Gantt-style breakdowns — output as structured markdown
- **PDF-ready reports**: Generate well-structured reports that can be exported as PDFs

## Platform modules available
- **Dashboard** – KPIs, project overview, recent activity
- **Tasks** – Kanban board (To Do, In Progress, In Review, Done)
- **Projects** – Project list, status, deadlines, team assignments
- **Project Board** – Per-project kanban task board
- **Project Timeline** – Gantt-style milestone and schedule tracking
- **P&ID Process** – Piping & instrumentation diagrams with AI BOM generation
- **Drawings** – Engineering drawings (Mechanical, Electrical, Civil)
- **Design 2D** – 2D CAD viewer and annotator (DWG/DXF)
- **Design 3D** – 3D STEP/IGES model viewer
- **Viewer Options** – 3D system selector (ETP, STP, WTP/RO, AHU, HVAC, Fire, Thermic, etc.)
- **Presentation** – PPTX slide deck viewer
- **Meeting Minutes** – Meeting recording, Whisper AI transcription, AI summarization
- **Sheets** – Collaborative spreadsheet editor
- **Material Request** – Procurement and material request workflow
- **Purchase Order** – PO management and vendor tracking
- **Smart Inbox** – AI-powered email inbox (classify, summarize, draft replies)
- **FlowTalk** – Real-time team messaging and channels
- **HRMS** – Employee directory, attendance, leave management (ERPNext)
- **Site Data** – Live field monitoring and equipment data
- **Nesting** – Material layout optimization for cutting/sheet metal
- **Campaigns** – Marketing campaign tracking
- **Leads** – CRM lead and pipeline management
- **Team** – Team member directory
- **Gallery** – Media asset library
- **User Management** – Admin panel for users, roles, permissions
- **Settings** – App configuration

## Response formatting
- Use **Markdown** for all responses: headers (##, ###), bullet lists, numbered lists, bold, tables, code blocks
- For timelines: use a structured format with dates and milestones as a numbered or table format
- For reports: use clear sections with ## headings, summaries, and structured content
- For code: use fenced code blocks with the correct language tag
- Be thorough, detailed, and accurate — prefer rich, complete answers over brief ones
- If asked to generate a PDF report or document, produce a well-structured, professional markdown document with a clear title, sections, and content

## Special output hints
- When generating a timeline, include a line at the very end: <!-- TYPE:TIMELINE -->
- When generating a report/PDF, include a line at the very end: <!-- TYPE:REPORT -->`;

  if (module) {
    const moduleKey = module.split("–")[0]?.trim();
    const description = moduleKey ? MODULE_DESCRIPTIONS[moduleKey] : null;
    if (description) {
      return `${base}\n\n## Current context\nThe user is currently on the **${moduleKey}** module. ${description}\n\nPrioritize helping with this module, but answer any question the user asks.`;
    }
    return `${base}\n\n## Current context\nThe user is currently viewing: ${module}.`;
  }

  return base;
}

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

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(module) },
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
        temperature: 0.7,
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
        temperature: 0.7,
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
