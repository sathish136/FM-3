import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Mic, MicOff, X, Send, Bot, Loader2, Download, FileText, Calendar, Copy, Check, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { jsPDF } from "jspdf";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "").replace("/pm-app", "") + "/api";

type MessageType = "text" | "timeline" | "report";

type Message = {
  role: "user" | "assistant";
  content: string;
  type?: MessageType;
};

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const MODULE_HINTS: Record<string, string> = {
  "/":                          "Dashboard – project overview, KPIs, quick actions, and status breakdown",
  "/projects":                  "Projects – full project list with details and management",
  "/project-board":             "Project Board – kanban-style task tracking board for projects",
  "/project-timeline":          "Project Timeline – Gantt-style scheduling and milestone tracking for projects",
  "/meeting-minutes":           "Meeting Minutes – meeting notes, AI summarization, and action item tracking",
  "/material-request":          "Material Request – procurement and material request workflow and approvals",
  "/purchase-order":            "Purchase Order – manage and track purchase orders and vendor payments",
  "/presentation":              "Presentation – slide deck viewer and manager (supports PPTX files)",
  "/drawings":                  "Drawings – mechanical, electrical, and civil engineering drawings",
  "/drawings/mechanical":       "Drawings – mechanical design drawings",
  "/drawings/electrical":       "Drawings – electrical design drawings",
  "/drawings/civil":            "Drawings – civil design drawings",
  "/design-2d":                 "Design 2D – 2D CAD drawing viewer and annotator",
  "/design-3d":                 "Design 3D – 3D mechanical model viewer (STEP/IGES files)",
  "/pid":                       "P&ID Process – piping and instrumentation diagrams with AI analysis and BOM generation",
  "/nesting":                   "Nesting – material layout optimization algorithm for cutting and sheet metal",
  "/project-drawings":          "Project Drawings – drawing repository linked to projects for easy access",
  "/email":                     "Email – full email client integrated with your mailbox",
  "/smart-inbox":               "Smart Inbox (AI) – AI-powered email inbox that classifies, summarizes, and drafts replies",
  "/chat":                      "FlowTalk – real-time team messaging and group chat",
  "/sheets":                    "Sheets – collaborative spreadsheet editor with formula support",
  "/marketing":                 "Marketing – marketing module for campaigns, leads, and performance tracking",
  "/leads":                     "Leads – CRM lead management, follow-ups, and pipeline tracking",
  "/campaigns":                 "Campaigns – marketing campaign tracking and performance metrics",
  "/purchase-dashboard":        "Purchase Dashboard – analytics and overview of all purchase activities",
  "/stores-dashboard":          "Stores Dashboard – inventory and stores management overview",
  "/site-data":                 "Site Data – live monitoring and data from field sites and equipment",
  "/hrms":                      "HRMS – employee directory, attendance, leave management, and HR data from ERPNext",
  "/hrms/incidents":            "HR Incidents – track and manage HR incidents, safety events, and misconduct reports",
  "/user-management":           "User Management – admin panel for managing user access and module permissions",
  "/settings":                  "Settings – application settings including appearance, integrations, and API keys",
  "/profile":                   "Profile – user profile settings and personal account information",
  "/tasks":                     "Tasks – kanban board for managing all tasks by status: To Do, In Progress, In Review, and Done",
  "/team":                      "Team – team member directory and contact information",
  "/gallery":                   "Gallery – media asset library for images, documents, and videos",
  "/viewer-options":            "Viewer Options – 3D system viewer selector",
  "/viewer-options/mechanical": "Mechanical Viewer – 3D STEP file viewer for mechanical systems",
};

const QUICK_ACTIONS = [
  { label: "Generate PDF Report", prompt: "Generate a comprehensive project status report that I can export as PDF. Include executive summary, key milestones, risks, and next steps.", icon: FileText },
  { label: "Create Timeline", prompt: "Create a detailed project timeline with milestones, tasks, and deadlines for a typical 6-month engineering project.", icon: Calendar },
  { label: "Summarize Module", prompt: "Explain what this module does and give me a quick-start guide for using it effectively.", icon: Sparkles },
];

function detectType(content: string): MessageType {
  if (content.includes("<!-- TYPE:TIMELINE -->")) return "timeline";
  if (content.includes("<!-- TYPE:REPORT -->")) return "report";
  return "text";
}

function cleanContent(content: string): string {
  return content
    .replace(/<!-- TYPE:TIMELINE -->/g, "")
    .replace(/<!-- TYPE:REPORT -->/g, "")
    .trim();
}

function TimelineView({ content }: { content: string }) {
  const lines = content.split("\n").filter(Boolean);
  const items: { label: string; detail: string }[] = [];
  let current: { label: string; detail: string } | null = null;

  for (const line of lines) {
    const numbered = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*[:\s–-]*(.*)/);
    const header = line.match(/^#{1,4}\s+(.+)/);
    const bold = line.match(/^\*\*(.+?)\*\*[:\s–-]*(.*)/);

    if (numbered) {
      if (current) items.push(current);
      current = { label: numbered[2], detail: numbered[3] || "" };
    } else if (header && !current) {
      if (current) items.push(current);
      current = { label: header[1], detail: "" };
    } else if (bold && !numbered) {
      if (current) items.push(current);
      current = { label: bold[1], detail: bold[2] || "" };
    } else if (current && line.trim()) {
      current.detail += (current.detail ? " " : "") + line.replace(/^[-*]\s+/, "").trim();
    }
  }
  if (current) items.push(current);

  if (items.length < 2) {
    return <MarkdownView content={content} />;
  }

  return (
    <div className="w-full mt-1">
      <div className="relative">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 mb-3 relative">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 z-10">
                {i + 1}
              </div>
              {i < items.length - 1 && (
                <div className="w-0.5 flex-1 bg-blue-200 mt-1" />
              )}
            </div>
            <div className="flex-1 pb-2">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{item.label}</p>
              {item.detail && (
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarkdownView({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-gray-800
      prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:mt-3 prose-headings:mb-1
      prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
      prose-p:my-1 prose-p:leading-relaxed
      prose-li:my-0.5 prose-li:leading-relaxed
      prose-code:bg-gray-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
      prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:text-xs prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto
      prose-table:text-xs prose-th:bg-blue-50 prose-th:font-semibold
      prose-strong:font-semibold prose-strong:text-gray-900
      prose-blockquote:border-l-blue-400 prose-blockquote:text-gray-600
      prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
    ">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function exportToPDF(content: string, title?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const usableWidth = pageWidth - margin * 2;
  let y = 22;

  const addPageIfNeeded = (needed = 10) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 64, 175);
  const docTitle = title || "FlowAI Report";
  doc.text(docTitle, margin, y);
  y += 8;

  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated by FlowAI  •  ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}`, margin, y);
  y += 10;

  const lines = content.replace(/<!-- TYPE:[A-Z]+ -->/g, "").split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (/^# /.test(line)) {
      addPageIfNeeded(12);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 64, 175);
      const wrapped = doc.splitTextToSize(line.replace(/^# /, ""), usableWidth);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 6 + 3;
    } else if (/^## /.test(line)) {
      addPageIfNeeded(10);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 80, 150);
      const wrapped = doc.splitTextToSize(line.replace(/^## /, ""), usableWidth);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 5.5 + 2;
    } else if (/^### /.test(line)) {
      addPageIfNeeded(8);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      const wrapped = doc.splitTextToSize(line.replace(/^### /, ""), usableWidth);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 5 + 1.5;
    } else if (/^[-*] /.test(line)) {
      addPageIfNeeded(7);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const text = line.replace(/^[-*] /, "").replace(/\*\*/g, "");
      const wrapped = doc.splitTextToSize(`• ${text}`, usableWidth - 4);
      doc.text(wrapped, margin + 3, y);
      y += wrapped.length * 4.8 + 0.5;
    } else if (/^\d+\. /.test(line)) {
      addPageIfNeeded(7);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const text = line.replace(/\*\*/g, "");
      const wrapped = doc.splitTextToSize(text, usableWidth - 4);
      doc.text(wrapped, margin + 3, y);
      y += wrapped.length * 4.8 + 0.5;
    } else if (line.trim() === "" || line.trim() === "---") {
      y += 3;
    } else if (line.trim()) {
      addPageIfNeeded(7);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const text = line.replace(/\*\*/g, "").replace(/\*/g, "");
      const wrapped = doc.splitTextToSize(text, usableWidth);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 4.8 + 0.5;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`Page ${p} of ${pageCount}  •  WTT FlowMatriX`, margin, doc.internal.pageSize.getHeight() - 8);
  }

  const filename = (docTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "flowai_report") + ".pdf";
  doc.save(filename);
}

export function AISearch({ currentPath, forceOpen, hideTriggerOnMobile }: { currentPath?: string; forceOpen?: number; hideTriggerOnMobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const moduleHint = currentPath ? (MODULE_HINTS[currentPath] ?? "") : "";
  const moduleLabel = moduleHint.split("–")[0]?.trim() ?? "";

  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Voice input not supported. Please use Chrome."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const current = Array.from(event.results).map((r) => r[0].transcript).join("");
      setTranscript(current);
      setQuery(current);
    };
    recognition.onend = () => { setListening(false); setTranscript(""); };
    recognition.onerror = () => { setListening(false); setTranscript(""); };
    recognition.start();
  }, []);

  const toggleVoice = useCallback(() => {
    if (listening) stopListening(); else startListening();
  }, [listening, startListening, stopListening]);

  const sendQuery = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    if (listening) stopListening();

    const userMsg: Message = { role: "user", content: text.trim() };
    const historyForRequest = [...messages];
    const newMessages = [...historyForRequest, userMsg];
    setMessages(newMessages);
    setQuery("");
    setLoading(true);

    const assistantIndex = newMessages.length;
    setMessages([...newMessages, { role: "assistant", content: "", type: "text" }]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch(`${API_BASE}/ai-search?stream=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text.trim(),
          history: historyForRequest.map((m) => ({ role: m.role, content: m.content })),
          module: moduleHint,
          stream: true,
        }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("Stream failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.delta) {
              accumulated += parsed.delta;
              const msgType = detectType(accumulated);
              setMessages((prev) => {
                const updated = [...prev];
                updated[assistantIndex] = { role: "assistant", content: accumulated, type: msgType };
                return updated;
              });
            } else if (parsed.error) {
              accumulated = `Sorry, I encountered an error: ${parsed.error}`;
              setMessages((prev) => {
                const updated = [...prev];
                updated[assistantIndex] = { role: "assistant", content: accumulated, type: "text" };
                return updated;
              });
            }
          } catch { /* skip parse errors */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIndex] = { role: "assistant", content: "Sorry, I couldn't reach the AI service. Please try again.", type: "text" };
        return updated;
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [loading, listening, messages, stopListening, moduleHint]);

  const stopGeneration = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const copyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(cleanContent(content));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuery(query); }
    if (e.key === "Escape") setOpen(false);
  };

  const clearChat = () => { setMessages([]); setQuery(""); inputRef.current?.focus(); };

  const moduleSuggestions: Record<string, string[]> = {
    "/":                  ["What projects are active?", "Show my pending tasks", "Generate a weekly status report"],
    "/projects":          ["What projects are in progress?", "Generate a project summary report", "Create a project timeline"],
    "/project-board":     ["What tasks are pending?", "Show blocked tasks", "Summarize the board status"],
    "/project-timeline":  ["Create a 6-month project timeline", "What milestones are due this month?", "Generate a Gantt chart breakdown"],
    "/meeting-minutes":   ["Summarize recent meetings", "Generate a meeting minutes template", "What were the action items?"],
    "/material-request":  ["What materials are pending?", "Generate a procurement report", "List recent requests"],
    "/purchase-order":    ["Show open purchase orders", "Generate a PO summary report", "What POs need approval?"],
    "/email":             ["Draft a professional follow-up email", "How do I compose a new email?", "Write a project update email"],
    "/smart-inbox":       ["What emails need attention?", "Draft a reply to a supplier email", "Classify my inbox"],
    "/chat":              ["How do I start a group chat?", "What channels are available?", "How do I share files?"],
    "/pid":               ["What is a P&ID diagram?", "How do I generate a BOM?", "Explain P&ID symbols"],
    "/tasks":             ["What tasks are in progress?", "Create a task checklist for project setup", "Show all To Do tasks"],
    "/hrms":              ["Who is on leave today?", "Generate an attendance report", "List employees in my department"],
  };

  const suggestions = (currentPath && moduleSuggestions[currentPath])
    ? moduleSuggestions[currentPath]
    : ["Generate a PDF project report", "Create a project timeline", "What can you help me with?"];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 px-3 h-7 rounded-full border transition-all text-xs font-medium",
          "bg-gray-50 border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600",
          hideTriggerOnMobile && "hidden md:flex"
        )}
        title="Ask AI"
      >
        <Bot className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Ask AI</span>
        <Search className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-10 px-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-10"
            style={{ maxHeight: "calc(100vh - 60px)" }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0">
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white">FlowAI</span>
              {moduleLabel && (
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium ml-0.5">
                  {moduleLabel}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="text-xs text-white/70 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> New chat
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-8 text-center px-6 shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-3 shadow-sm">
                  <Sparkles className="w-7 h-7 text-blue-600" />
                </div>
                <p className="text-base font-semibold text-gray-800 mb-1">
                  {moduleLabel ? `Hi! I'm FlowAI — your assistant for ${moduleLabel}` : "Hi! I'm FlowAI — ask me anything"}
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  I can answer questions, generate reports, create timelines, write documents, and more
                </p>

                <div className="flex gap-2 mb-4 w-full justify-center flex-wrap">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendQuery(action.prompt)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors border border-blue-200 font-medium"
                    >
                      <action.icon className="w-3 h-3" />
                      {action.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendQuery(s)}
                      className="text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors border border-gray-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(messages.length > 0 || loading) && (
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
                {messages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  const cleaned = cleanContent(msg.content);
                  const msgType = msg.type || detectType(msg.content);

                  return (
                    <div key={i} className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5",
                        isUser ? "bg-blue-600 text-white" : "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700"
                      )}>
                        {isUser ? "U" : <Sparkles className="w-3.5 h-3.5" />}
                      </div>

                      <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start", "max-w-[85%]")}>
                        {isUser ? (
                          <div className="bg-blue-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm leading-relaxed">
                            {msg.content}
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 w-full">
                            {!cleaned && loading && i === messages.length - 1 ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                                <span className="text-xs text-gray-400">Thinking…</span>
                              </div>
                            ) : msgType === "timeline" ? (
                              <>
                                <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-blue-700">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Timeline View
                                </div>
                                <TimelineView content={cleaned} />
                              </>
                            ) : (
                              <MarkdownView content={cleaned} />
                            )}

                            {cleaned && !loading && (
                              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-gray-100">
                                <button
                                  onClick={() => copyMessage(msg.content, i)}
                                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
                                >
                                  {copiedIndex === i ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                  {copiedIndex === i ? "Copied" : "Copy"}
                                </button>
                                {(msgType === "report" || msgType === "timeline" || cleaned.length > 300) && (
                                  <button
                                    onClick={() => exportToPDF(msg.content)}
                                    className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                                  >
                                    <Download className="w-3 h-3" />
                                    Download PDF
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {loading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-2.5 flex-row">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                      <span className="text-xs text-gray-400">Thinking…</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            <div className="px-3 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
              {listening && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                  <span className="text-xs text-red-500 font-medium">Listening… {transcript && `"${transcript}"`}</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={moduleLabel ? `Ask FlowAI about ${moduleLabel}…` : "Ask anything — reports, timelines, questions…"}
                  className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder:text-gray-400"
                  disabled={loading}
                />
                <button
                  onClick={toggleVoice}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    listening ? "bg-red-100 text-red-500 hover:bg-red-200" : "text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                  )}
                  title={listening ? "Stop listening" : "Voice input"}
                >
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                {loading ? (
                  <button
                    onClick={stopGeneration}
                    className="p-1.5 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition-all"
                    title="Stop generating"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => sendQuery(query)}
                    disabled={!query.trim()}
                    className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Send"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-1.5">
                FlowAI · GPT-4o · Enter to send · Esc to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
