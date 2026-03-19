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
  "HRMS":                    "The HRMS module connects to ERPNext to display employee directories, attendance records, and leave management data.",
  "User Management":         "The User Management module is an admin panel for managing user accounts, assigning roles (Admin, Editor, Viewer), and controlling module-level permissions.",
  "Settings":                "The Settings module covers application-level configuration: user management, roles & permissions, notification preferences, appearance/theme, external integrations, and API key management.",
  "Profile":                 "The Profile module lets users update their personal information, profile picture, and account credentials.",
  "Campaigns":               "The Campaigns module tracks marketing campaigns including status, budget, performance metrics, and scheduling.",
  "Leads":                   "The Leads module is a CRM tool for tracking sales leads, pipeline stages, follow-up tasks, and lead assignments.",
  "Team":                    "The Team module is a directory of all team members with their contact information and department.",
  "Gallery":                 "The Gallery module is a media asset library. Users can upload, search, filter, tag, download, and delete files including images, documents, and videos.",
};

function buildSystemPrompt(module?: string): string {
  const base = `You are a helpful AI assistant embedded in WTT Project Management — a comprehensive project management and engineering workflow platform. The platform includes the following modules:

- Dashboard: KPIs and project overview
- Tasks: Kanban board (To Do, In Progress, In Review, Done)
- Projects: Project list and details
- Project Board: Per-project kanban task board
- P&ID Process: Piping & instrumentation diagram viewer with AI BOM generation
- Drawings: Engineering drawings (Mechanical, Electrical, Civil)
- Design 2D: 2D CAD drawing viewer and annotator
- Design 3D: 3D STEP/IGES model viewer
- Viewer Options: 3D system selector (ETP, STP, WTP/RO, AHU, HVAC, Fire, Thermic, Process, Electrical, Instrumentation)
- Mechanical Viewer: Full 3D STEP file viewer with mesh panel
- Presentation: PPTX slide deck viewer
- Meeting Minutes: Meeting recording, transcription (Whisper AI), and AI summarization
- Sheets: Collaborative spreadsheet editor
- Material Request: Procurement and material request workflow
- HRMS: Employee directory, attendance, leave management (ERPNext)
- User Management: Admin panel for users, roles, and permissions
- Settings: App configuration (users, roles, notifications, appearance, integrations, API keys)
- Profile: Personal account settings
- Campaigns: Marketing campaign tracking
- Leads: CRM lead management and pipeline
- Team: Team member directory
- Gallery: Media asset library (images, documents, videos)

Be concise, practical, and helpful. Answer questions about how to use the platform, what features are available, and work-related topics.`;

  if (module) {
    const moduleKey = module.split("–")[0]?.trim();
    const description = moduleKey ? MODULE_DESCRIPTIONS[moduleKey] : null;
    if (description) {
      return `${base}\n\nThe user is currently on the **${moduleKey}** module. ${description}\n\nFocus your answers on this module's features and context, but also help with general platform questions if asked.`;
    }
    return `${base}\n\nThe user is currently viewing: ${module}.`;
  }

  return base;
}

router.post("/ai-search", async (req, res) => {
  try {
    const { query, history = [], module } = req.body as {
      query: string;
      history?: { role: "user" | "assistant"; content: string }[];
      module?: string;
    };

    if (!query?.trim()) {
      return res.status(400).json({ error: "Query is required" });
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: buildSystemPrompt(module),
      },
      ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
      { role: "user", content: query },
    ];

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1024,
    });

    const answer = completion.choices[0]?.message?.content ?? "No response";
    res.json({ answer });
  } catch (e) {
    console.error("AI search error:", e);
    res.status(500).json({ error: String(e) });
  }
});

export default router;
