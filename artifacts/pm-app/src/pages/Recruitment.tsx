import { Layout } from "@/components/Layout";
import {
  UserPlus, RefreshCw, Loader2, Search, ChevronDown, ExternalLink,
  ArrowLeft, DollarSign, MapPin, Briefcase, Building2, Phone,
  Calendar, Clock, User, FileText, MessageSquare, CheckCircle2, AlertCircle,
  Upload, X, Sparkles, Mail, Globe, Award, BookOpen, Star, Zap,
  TrendingUp, TrendingDown, Minus, Target, Shield, AlertTriangle,
  HelpCircle, Lightbulb, BarChart2, Link, Github, Linkedin, ChevronRight,
  FolderOpen, Trophy, MessageCircle, Brain, ArrowUpRight, ArrowRight,
  PieChart, Activity, XCircle, Users, BarChart, Filter,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERP_URL = "https://erp.wttint.com";

// ── Types ──────────────────────────────────────────────────────────────────

interface Followup {
  name: string; date: string; time: string; end_time: string | null;
  employee: string; employee_name: string; mode_of_communication: string;
  conversation: string; next_followup: string | null;
}

interface RecruitmentTracker {
  name: string; date: string; company: string | null; candidate_name: string;
  qualification: string | null; applying_for_the_post: string; department: string | null;
  location: string | null; existing_salary_per_month: number; expected_salary: number;
  status: string; rt_telephonic_interview: string | null; telephonic_interview_commands: string | null;
  rt_last_convo: string | null; not_suitable_reason: string | null; experience_status: string | null;
  candidate_resume: string | null; owner: string; modified: string;
  followup_table?: Followup[];
}

interface ResumeData {
  name?: string; email?: string; phone?: string; location?: string;
  current_title?: string; linkedin_url?: string; github_url?: string; portfolio_url?: string;
  career_objective?: string; summary?: string;
  skills?: string[]; technical_skills?: string[]; soft_skills?: string[];
  languages?: { language: string; proficiency: string; can_write?: boolean }[];
  experience?: { company: string; title: string; duration: string; start_year: string; end_year: string; location: string; description: string; achievements: string[] }[];
  internships?: { company: string; title: string; duration: string; location: string; description: string; responsibilities: string[] }[];
  education?: { institution: string; degree: string; field: string; year: string; gpa: string; percentage?: string; grade?: string; level?: string }[];
  certifications?: { name: string; issuer: string; platform?: string; year: string; score?: string; percentage?: string }[];
  projects?: { name: string; year?: string; description: string; technologies: string[]; highlights?: string[] }[];
  achievements?: { title: string; year: string; organization: string; description: string }[];
  awards?: string[]; publications?: string[];
  total_experience_years?: number; career_level?: string; industry?: string; has_photo?: boolean;
}

interface RatingBreakdown {
  technical_skills?: number; experience_depth?: number; career_growth?: number;
  education?: number; presentation?: number;
}

interface Assessment {
  overall_rating?: number; rating_breakdown?: RatingBreakdown;
  hiring_recommendation?: string; hiring_reason?: string;
  strengths?: string[]; concerns?: string[]; red_flags?: string[];
  career_trajectory?: string; career_trajectory_detail?: string;
  key_achievements?: string[]; personality_insights?: string;
  company_analysis?: { company: string; reputation: string; tier: string; notes: string }[];
  interview_questions?: { question: string; category: string; purpose: string }[];
  salary_assessment?: string; growth_potential?: string;
  culture_fit_notes?: string; comparable_roles?: string[];
}

interface FullAnalysis {
  resume: ResumeData;
  assessment: Assessment;
  photo_base64: string | null;
  photo_mime: string | null;
  pdf_base64: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}
function fmtTime(t: string | null) {
  if (!t) return "";
  try {
    const parts = t.split(":");
    const h = parseInt(parts[0]); const m = parts[1] || "00";
    return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
  } catch { return t; }
}
function fmtCurrency(n: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function StatusPill({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const map: Record<string, string> = {
    "open": "bg-blue-100 text-blue-700 ring-1 ring-blue-300",
    "hold": "bg-amber-100 text-amber-700 ring-1 ring-amber-300",
    "selected": "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300",
    "not suitable": "bg-red-100 text-red-700 ring-1 ring-red-300",
    "joined": "bg-teal-100 text-teal-700 ring-1 ring-teal-300",
    "offer declined": "bg-orange-100 text-orange-700 ring-1 ring-orange-300",
    "offer": "bg-violet-100 text-violet-700 ring-1 ring-violet-300",
    "interview": "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300",
    "interview scheduled": "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300",
    "shortlisted": "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-300",
    "assessment": "bg-purple-100 text-purple-700 ring-1 ring-purple-300",
    "in progress": "bg-sky-100 text-sky-700 ring-1 ring-sky-300",
    "pending": "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300",
    "rejected": "bg-red-100 text-red-700 ring-1 ring-red-300",
    "withdrawn": "bg-gray-100 text-gray-500 ring-1 ring-gray-300",
    "closed": "bg-gray-100 text-gray-500 ring-1 ring-gray-300",
    "on hold": "bg-amber-100 text-amber-700 ring-1 ring-amber-300",
  };
  const dotColor: Record<string, string> = {
    "open": "bg-blue-500", "hold": "bg-amber-400", "on hold": "bg-amber-400",
    "selected": "bg-emerald-500", "not suitable": "bg-red-400", "rejected": "bg-red-400",
    "joined": "bg-teal-500", "offer declined": "bg-orange-400", "offer": "bg-violet-500",
    "interview": "bg-indigo-500", "interview scheduled": "bg-indigo-500",
    "shortlisted": "bg-cyan-500", "assessment": "bg-purple-500",
    "in progress": "bg-sky-500", "pending": "bg-yellow-500",
    "withdrawn": "bg-gray-400", "closed": "bg-gray-400",
  };
  const cls = map[s] || "bg-gray-100 text-gray-500 ring-1 ring-gray-200";
  const dot = dotColor[s] || "bg-gray-400";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {status || "—"}
    </span>
  );
}

function CommIcon({ mode }: { mode: string }) {
  const m = (mode || "").toLowerCase();
  if (m.includes("phone") || m.includes("call")) return <Phone className="w-3.5 h-3.5" />;
  if (m.includes("email")) return <FileText className="w-3.5 h-3.5" />;
  if (m.includes("meeting") || m.includes("visit")) return <User className="w-3.5 h-3.5" />;
  return <MessageSquare className="w-3.5 h-3.5" />;
}

// ── Rating Components ──────────────────────────────────────────────────────

function RatingGauge({ value, max = 10, size = "lg" }: { value: number; max?: number; size?: "sm" | "lg" }) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  const r = size === "lg" ? 52 : 30;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct * 0.75);
  const color = pct >= 0.8 ? "#10b981" : pct >= 0.6 ? "#3b82f6" : pct >= 0.4 ? "#f59e0b" : "#ef4444";
  const svgSize = size === "lg" ? 140 : 80;
  const cx = svgSize / 2;

  return (
    <div className="flex flex-col items-center">
      <svg width={svgSize} height={svgSize * 0.75} style={{ overflow: "visible" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e5e7eb" strokeWidth={size === "lg" ? 10 : 6}
          strokeDasharray={circ} strokeDashoffset={circ * 0.25} strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cx})`} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={size === "lg" ? 10 : 6}
          strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cx})`} style={{ transition: "stroke-dashoffset 1s ease" }} />
        <text x={cx} y={cx + (size === "lg" ? 4 : 3)} textAnchor="middle" fontSize={size === "lg" ? 26 : 16}
          fontWeight="bold" fill={color}>{value.toFixed(1)}</text>
        <text x={cx} y={cx + (size === "lg" ? 20 : 14)} textAnchor="middle" fontSize={size === "lg" ? 10 : 8} fill="#9ca3af">/ {max}</text>
      </svg>
    </div>
  );
}

function RatingBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(Math.max(value / max, 0), 1) * 100;
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs font-bold text-gray-800">{value}/{max}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HiringBadge({ rec }: { rec: string }) {
  const r = (rec || "").toLowerCase();
  const map: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    "strong hire": { bg: "bg-emerald-500", text: "text-white", icon: CheckCircle2 },
    "hire": { bg: "bg-blue-500", text: "text-white", icon: CheckCircle2 },
    "consider": { bg: "bg-amber-400", text: "text-white", icon: AlertCircle },
    "pass": { bg: "bg-red-400", text: "text-white", icon: X },
  };
  const cfg = map[r] || { bg: "bg-gray-200", text: "text-gray-600", icon: HelpCircle };
  const Icon = cfg.icon;
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${cfg.bg} ${cfg.text} font-bold text-sm shadow-sm`}>
      <Icon className="w-4 h-4" /> {rec}
    </div>
  );
}

function TrajectoryIcon({ traj }: { traj: string }) {
  const t = (traj || "").toLowerCase();
  if (t === "upward") return <TrendingUp className="w-5 h-5 text-emerald-500" />;
  if (t === "downward") return <TrendingDown className="w-5 h-5 text-red-400" />;
  if (t === "lateral") return <Minus className="w-5 h-5 text-blue-400" />;
  return <ArrowRight className="w-5 h-5 text-amber-400" />;
}

function CompanyTierBadge({ tier }: { tier: string }) {
  const t = (tier || "").toLowerCase();
  if (t.includes("tier 1") || t.includes("mnc") || t.includes("top"))
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">Tier 1</span>;
  if (t.includes("tier 2") || t.includes("mid"))
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Tier 2</span>;
  if (t.includes("tier 3") || t.includes("startup") || t.includes("sme"))
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">Tier 3</span>;
  return null;
}

// ── Resume Analyzer ────────────────────────────────────────────────────────

export function ResumeAnalyzer() {
  const { toast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [result, setResult] = useState<FullAnalysis | null>(null);
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [autoStatus, setAutoStatus] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function enrichWithLinkedin(url: string, currentResult: FullAnalysis) {
    if (!url) return;
    setEnriching(true);
    setAutoStatus("Enriching with LinkedIn profile…");
    try {
      const companies = (currentResult.resume.experience || []).map(e => e.company).filter(Boolean);
      const r = await fetch(`${BASE}/api/hrms/candidate-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedin_url: url,
          name: currentResult.resume.name,
          companies,
          resume_summary: currentResult.resume.summary,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setResult(prev => prev ? { ...prev, assessment: data.assessment } : prev);
      toast({ title: "LinkedIn enrichment complete", description: data.linkedin_fetched ? "Profile data fetched and analyzed" : "AI analysis updated based on profile URL" });
    } catch (e) {
      toast({ title: "LinkedIn enrichment failed", description: String(e), variant: "destructive" });
    } finally { setEnriching(false); setAutoStatus(""); }
  }

  async function analyzeResume(f: File) {
    setAnalyzing(true);
    setAutoStatus("Extracting resume data with AI…");
    try {
      const form = new FormData();
      form.append("file", f);
      const r = await fetch(`${BASE}/api/hrms/resume-analyze`, { method: "POST", body: form });
      if (!r.ok) throw new Error(await r.text());
      const data: FullAnalysis = await r.json();
      setResult(data);
      setActiveSection("overview");

      // Auto-enrich with LinkedIn if URL found in resume
      const detectedLinkedin = data.resume.linkedin_url || "";
      if (detectedLinkedin) {
        setLinkedinUrl(detectedLinkedin);
        toast({ title: "LinkedIn detected", description: "Auto-analyzing LinkedIn profile from resume…" });
        await enrichWithLinkedin(detectedLinkedin, data);
      }
    } catch (e) {
      toast({ title: "Analysis failed", description: String(e), variant: "destructive" });
    } finally { setAnalyzing(false); setAutoStatus(""); }
  }

  function handleFile(f: File) {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowed.includes(f.type) && !f.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Unsupported file", description: "Please upload a PDF or image (JPG, PNG, WEBP).", variant: "destructive" });
      return;
    }
    setFile(f);
    setResult(null);
    setLinkedinUrl("");
    // Auto-start analysis immediately
    analyzeResume(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function enrichWithLinkedinManual() {
    if (!result || !linkedinUrl) return;
    await enrichWithLinkedin(linkedinUrl, result);
  }

  const photoSrc = result?.photo_base64 && result?.photo_mime
    ? `data:${result.photo_mime};base64,${result.photo_base64}` : null;

  const resume = result?.resume || {};
  const assessment = result?.assessment || {};

  const sections = [
    { id: "overview", label: "Overview", icon: User },
    { id: "assessment", label: "AI Assessment", icon: Brain },
    { id: "experience", label: "Experience", icon: Briefcase },
    { id: "education", label: "Education", icon: BookOpen },
    { id: "skills", label: "Skills", icon: Zap },
    { id: "interview", label: "Interview Q", icon: MessageCircle },
    { id: "companies", label: "Companies", icon: Building2 },
  ];

  if (!result) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#f1f5f9] px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !analyzing && !file && inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl transition-all select-none
              ${analyzing ? "border-indigo-400 bg-indigo-50 cursor-default" : "cursor-pointer border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"}
              ${dragging ? "border-indigo-400 bg-indigo-50" : ""}`}
          >
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mb-4 shadow-inner">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
                <p className="text-base font-bold text-indigo-700">{autoStatus || "Analyzing with AI…"}</p>
                {file && <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">{file.name}</p>}
                <p className="text-xs text-indigo-400 mt-3 font-medium">Extracting data · Rating · Interview questions · LinkedIn</p>
              </div>
            ) : file ? (
              <div className="flex items-center gap-4 px-6 py-5">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB · {file.type || "file"}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setFile(null); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center mb-4 shadow-inner">
                  <Upload className="w-8 h-8 text-indigo-400" />
                </div>
                <p className="text-base font-bold text-gray-700">Drop resume here or click to upload</p>
                <p className="text-sm text-gray-400 mt-1">PDF, JPG, PNG, WEBP · Max 20MB</p>
                <p className="text-xs text-indigo-500 mt-3 font-medium">AI auto-analyzes instantly — no buttons needed</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-[#f1f5f9]">
      {/* Left Sidebar: Photo + Nav */}
      <div className="w-72 shrink-0 flex flex-col bg-white border-r border-gray-100 overflow-y-auto">
        {/* Photo Area */}
        <div className="p-5 border-b border-gray-100">
          {photoSrc ? (
            <img src={photoSrc} alt="Candidate"
              className="w-full aspect-[3/4] object-cover rounded-2xl border-2 border-indigo-100 shadow-md" />
          ) : result.pdf_base64 ? (
            <div className="w-full aspect-[3/4] rounded-2xl border-2 border-gray-100 overflow-hidden bg-gray-50 flex flex-col items-center justify-center gap-3 shadow-inner">
              <FileText className="w-14 h-14 text-gray-300" />
              <p className="text-[11px] font-semibold text-gray-400 text-center px-4">PDF Resume</p>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-500 text-[10px] font-bold rounded-full">No Photo Found</span>
            </div>
          ) : (
            <div className="w-full aspect-[3/4] rounded-2xl bg-gradient-to-br from-indigo-400 to-blue-600 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-5xl">{(resume.name || "?").slice(0, 2).toUpperCase()}</span>
            </div>
          )}

          {/* Name + Title */}
          <div className="mt-4">
            <h2 className="text-sm font-black text-gray-900 leading-tight">{resume.name || "—"}</h2>
            {resume.current_title && <p className="text-xs text-indigo-600 font-semibold mt-0.5">{resume.current_title}</p>}
            {resume.career_level && (
              <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">{resume.career_level}</span>
            )}
          </div>

          {/* Contact Info */}
          <div className="mt-3 space-y-1.5">
            {resume.email && (
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <Mail className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <span className="truncate">{resume.email}</span>
              </div>
            )}
            {resume.phone && (
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <Phone className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <span>{resume.phone}</span>
              </div>
            )}
            {resume.location && (
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <span>{resume.location}</span>
              </div>
            )}
            {resume.industry && (
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <Building2 className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <span>{resume.industry}</span>
              </div>
            )}
          </div>

          {/* Social Links */}
          <div className="mt-3 flex gap-2 flex-wrap">
            {resume.linkedin_url && (
              <a href={resume.linkedin_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-semibold hover:bg-blue-100 transition-colors border border-blue-100">
                <Linkedin className="w-3 h-3" /> LinkedIn
              </a>
            )}
            {resume.github_url && (
              <a href={resume.github_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-semibold hover:bg-gray-200 transition-colors border border-gray-200">
                <Github className="w-3 h-3" /> GitHub
              </a>
            )}
            {resume.portfolio_url && (
              <a href={resume.portfolio_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-[11px] font-semibold hover:bg-purple-100 transition-colors border border-purple-100">
                <Globe className="w-3 h-3" /> Portfolio
              </a>
            )}
          </div>
        </div>

        {/* Rating Mini */}
        {typeof assessment.overall_rating === "number" && (
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">AI Rating</p>
            <div className="flex items-center gap-3">
              <RatingGauge value={assessment.overall_rating} size="sm" />
              <div className="flex-1">
                {assessment.hiring_recommendation && (
                  <HiringBadge rec={assessment.hiring_recommendation} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-2">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-xs font-semibold transition-all ${activeSection === s.id ? "bg-indigo-50 text-indigo-700 border-r-2 border-indigo-500" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}>
                <Icon className="w-3.5 h-3.5" /> {s.label}
              </button>
            );
          })}
        </nav>

        {/* LinkedIn Enrich */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/60">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Enrich with LinkedIn</p>
          <div className="relative mb-2">
            <Linkedin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500" />
            <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
              placeholder="linkedin.com/in/name"
              className="w-full pl-8 pr-3 py-2 text-[11px] rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <button onClick={enrichWithLinkedinManual} disabled={enriching || !linkedinUrl}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
            {enriching ? <><Loader2 className="w-3 h-3 animate-spin" /> {autoStatus || "Analyzing…"}</> : <><Sparkles className="w-3 h-3" /> Re-Analyze with LinkedIn</>}
          </button>
        </div>

        {/* Reset */}
        <button onClick={() => { setFile(null); setResult(null); setLinkedinUrl(""); }}
          className="px-5 py-3 text-[11px] font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-gray-100">
          <Upload className="w-3.5 h-3.5" /> Analyze Another Resume
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">

        {/* ── OVERVIEW ── */}
        {activeSection === "overview" && (
          <div className="space-y-4 max-w-3xl">
            {/* Experience + Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Years Exp.", value: resume.total_experience_years ? `${resume.total_experience_years}y` : "—", color: "text-indigo-600", bg: "bg-indigo-50" },
                { label: "Companies", value: (resume.experience || []).length || "—", color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Skills", value: (resume.skills || []).length + (resume.technical_skills || []).length || "—", color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "AI Score", value: assessment.overall_rating ? `${assessment.overall_rating}/10` : "—", color: "text-purple-600", bg: "bg-purple-50" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Summary */}
            {resume.summary && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Professional Summary</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{resume.summary}</p>
              </div>
            )}

            {/* Hiring Recommendation */}
            {assessment.hiring_recommendation && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Hiring Recommendation</span>
                </div>
                <div className="flex items-start gap-4">
                  <HiringBadge rec={assessment.hiring_recommendation} />
                  <p className="text-sm text-gray-700 leading-relaxed flex-1">{assessment.hiring_reason}</p>
                </div>
              </div>
            )}

            {/* Trajectory */}
            {assessment.career_trajectory && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Career Trajectory</span>
                </div>
                <div className="flex items-center gap-3">
                  <TrajectoryIcon traj={assessment.career_trajectory} />
                  <div>
                    <span className="text-sm font-bold text-gray-800">{assessment.career_trajectory}</span>
                    {assessment.career_trajectory_detail && (
                      <p className="text-xs text-gray-500 mt-0.5">{assessment.career_trajectory_detail}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Key Achievements */}
            {(assessment.key_achievements || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Key Achievements</span>
                </div>
                <ul className="space-y-2">
                  {(assessment.key_achievements || []).map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Personality + Culture */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assessment.personality_insights && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Personality Insights</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{assessment.personality_insights}</p>
                </div>
              )}
              {assessment.growth_potential && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Growth Potential</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{assessment.growth_potential}</p>
                </div>
              )}
            </div>

            {/* Salary Assessment */}
            {assessment.salary_assessment && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Salary Assessment</p>
                  <p className="text-sm text-gray-700">{assessment.salary_assessment}</p>
                </div>
              </div>
            )}

            {/* Comparable Roles */}
            {(assessment.comparable_roles || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Comparable Roles / Fit</p>
                <div className="flex flex-wrap gap-2">
                  {(assessment.comparable_roles || []).map((role, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">{role}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AI ASSESSMENT ── */}
        {activeSection === "assessment" && (
          <div className="space-y-4 max-w-3xl">
            {typeof assessment.overall_rating === "number" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">AI Rating</span>
                </div>
                <div className="flex items-center gap-8 flex-wrap">
                  <RatingGauge value={assessment.overall_rating} />
                  <div className="flex-1 min-w-[200px] space-y-3">
                    {Object.entries(assessment.rating_breakdown || {}).map(([key, val]) => (
                      <RatingBar key={key} label={key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} value={val as number} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Strengths */}
            {(assessment.strengths || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Strengths</span>
                </div>
                <ul className="space-y-2">
                  {(assessment.strengths || []).map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Concerns */}
            {(assessment.concerns || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Concerns</span>
                </div>
                <ul className="space-y-2">
                  {(assessment.concerns || []).map((c, i) => (
                    <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Red Flags */}
            {(assessment.red_flags || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Red Flags</span>
                </div>
                <ul className="space-y-2">
                  {(assessment.red_flags || []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-red-50 border border-red-100">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {assessment.culture_fit_notes && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Culture Fit Notes</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{assessment.culture_fit_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* ── EXPERIENCE ── */}
        {activeSection === "experience" && (
          <div className="space-y-4 max-w-3xl">
            {(resume.experience || []).length === 0 ? (
              <div className="text-center py-20 text-gray-400">No experience data found</div>
            ) : (
              (resume.experience || []).map((exp, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-gray-900">{exp.title}</h3>
                          {(() => {
                            const ca = (assessment.company_analysis || []).find(c => c.company?.toLowerCase() === exp.company?.toLowerCase());
                            return ca ? <CompanyTierBadge tier={ca.tier} /> : null;
                          })()}
                        </div>
                        <p className="text-sm font-semibold text-indigo-600 mt-0.5">{exp.company}</p>
                        {exp.location && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{exp.location}</p>}
                      </div>
                      <div className="text-right">
                        {exp.duration && (
                          <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" />{exp.duration}
                          </span>
                        )}
                        {(exp.start_year || exp.end_year) && (
                          <p className="text-[10px] text-gray-400 mt-1">{exp.start_year}{exp.start_year && exp.end_year ? " – " : ""}{exp.end_year}</p>
                        )}
                      </div>
                    </div>
                    {exp.description && <p className="text-xs text-gray-600 leading-relaxed mb-3">{exp.description}</p>}
                    {(exp.achievements || []).length > 0 && (
                      <div className="space-y-1.5">
                        {exp.achievements.map((a, j) => (
                          <div key={j} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5">
                            <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />{a}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Projects */}
            {(resume.projects || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Projects</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {(resume.projects || []).map((p, i) => (
                    <div key={i} className="p-4">
                      <p className="text-sm font-bold text-gray-800">{p.name}</p>
                      {p.description && <p className="text-xs text-gray-600 mt-1">{p.description}</p>}
                      {(p.technologies || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {p.technologies.map((t, j) => (
                            <span key={j} className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600 rounded">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EDUCATION ── */}
        {activeSection === "education" && (
          <div className="space-y-4 max-w-3xl">
            {(resume.education || []).map((edu, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</p>
                  <p className="text-sm text-indigo-600 font-semibold">{edu.institution}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {edu.year && <span className="text-xs text-gray-400">{edu.year}</span>}
                    {edu.gpa && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">GPA: {edu.gpa}</span>}
                  </div>
                </div>
              </div>
            ))}

            {/* Certifications */}
            {(resume.certifications || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Certifications</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {(resume.certifications || []).map((cert, i) => {
                    const c = typeof cert === "string" ? { name: cert, issuer: "", year: "" } : cert;
                    return (
                      <div key={i} className="px-5 py-3 flex items-center gap-3">
                        <Award className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                          {(c.issuer || c.year) && <p className="text-xs text-gray-400">{c.issuer}{c.issuer && c.year ? " · " : ""}{c.year}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Awards & Publications */}
            {(resume.awards || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Awards</span>
                </div>
                <ul className="space-y-1">
                  {(resume.awards || []).map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(resume.publications || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Publications</span>
                </div>
                <ul className="space-y-1">
                  {(resume.publications || []).map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />{p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── SKILLS ── */}
        {activeSection === "skills" && (
          <div className="space-y-4 max-w-3xl">
            {(resume.technical_skills || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Technical Skills</span>
                  <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{resume.technical_skills?.length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(resume.technical_skills || []).map((s, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {(resume.soft_skills || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Soft Skills</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(resume.soft_skills || []).map((s, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {(resume.skills || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">All Skills</span>
                  <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{resume.skills?.length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(resume.skills || []).map((s, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {(resume.languages || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Languages</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(resume.languages || []).map((l, i) => {
                    const lang = typeof l === "string" ? { language: l, proficiency: "" } : l;
                    return (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100">
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs font-bold text-blue-700">{lang.language}</span>
                        {lang.proficiency && <span className="text-[10px] text-blue-400">· {lang.proficiency}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── INTERVIEW QUESTIONS ── */}
        {activeSection === "interview" && (
          <div className="space-y-4 max-w-3xl">
            {(assessment.interview_questions || []).length === 0 ? (
              <div className="text-center py-20 text-gray-400">No interview questions generated</div>
            ) : (
              Object.entries(
                (assessment.interview_questions || []).reduce((acc, q) => {
                  const cat = q.category || "General";
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(q);
                  return acc;
                }, {} as Record<string, typeof assessment.interview_questions>)
              ).map(([category, qs]) => (
                <div key={category} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">{category}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {(qs || []).map((q, i) => q && (
                      <div key={i} className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-800">{q.question}</p>
                        {q.purpose && (
                          <p className="text-[11px] text-gray-400 mt-1.5 flex items-start gap-1.5">
                            <Lightbulb className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />{q.purpose}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── COMPANIES ── */}
        {activeSection === "companies" && (
          <div className="space-y-4 max-w-3xl">
            {(assessment.company_analysis || []).length === 0 ? (
              <div className="text-center py-20 text-gray-400">No company analysis available</div>
            ) : (
              (assessment.company_analysis || []).map((c, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-gray-900">{c.company}</h3>
                        <CompanyTierBadge tier={c.tier} />
                      </div>
                      {c.reputation && (
                        <p className="text-xs font-semibold text-indigo-600 mt-0.5">{c.reputation}</p>
                      )}
                    </div>
                  </div>
                  {c.notes && <p className="text-sm text-gray-700 leading-relaxed">{c.notes}</p>}
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ── ERPNext Detail View ────────────────────────────────────────────────────

function InfoChip({ icon: Icon, label, color = "gray" }: { icon: React.ElementType; label: string; color?: string }) {
  const colors: Record<string, string> = {
    gray: "bg-gray-100 text-gray-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${colors[color] || colors.gray}`}>
      <Icon className="w-3 h-3 shrink-0" />{label}
    </span>
  );
}

function DetailView({ record, onBack }: { record: RecruitmentTracker; onBack: () => void }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"info" | "interview" | "calllog" | "ai" | "experience" | "skills">(() => record.candidate_resume ? "ai" : "info");
  const [aiAnalysis, setAiAnalysis] = useState<FullAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const followups = record.followup_table || [];
  const hikePercent = record.existing_salary_per_month && record.expected_salary
    ? Math.round(((record.expected_salary - record.existing_salary_per_month) / record.existing_salary_per_month) * 100)
    : null;

  const initials = record.candidate_name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();

  useEffect(() => {
    if (!record.candidate_resume) return;
    setAiLoading(true);
    setAiError(null);
    fetch(`${BASE}/api/hrms/resume-analyze-erp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: record.candidate_resume }),
    })
      .then(r => { if (!r.ok) throw new Error(`Analysis failed (${r.status})`); return r.json(); })
      .then((data: FullAnalysis) => {
        setAiAnalysis(data);
        if ((data as any).linkedin_enriched) {
          toast({ title: "LinkedIn also analyzed", description: "Profile from resume was enriched automatically" });
        }
      })
      .catch(e => setAiError(String(e)))
      .finally(() => setAiLoading(false));
  }, [record.candidate_resume]); // eslint-disable-line

  const hasResume = !!record.candidate_resume;

  const tabs: { id: "info" | "interview" | "calllog" | "ai" | "experience" | "skills"; label: string; icon: React.ElementType; count?: number }[] = [
    ...(hasResume ? [
      { id: "ai" as const, label: "AI Overview", icon: Brain },
      { id: "experience" as const, label: "Experience", icon: Briefcase },
      { id: "skills" as const, label: "Skills", icon: Zap },
    ] : []),
    { id: "info", label: "Profile", icon: User },
    { id: "interview", label: "Interview", icon: MessageSquare },
    { id: "calllog", label: "Call Logs", count: followups.length, icon: Phone },
  ];

  return (
    <div className="flex-1 flex overflow-hidden bg-[#f1f5f9]">
      {/* Left sidebar */}
      <div className="w-72 shrink-0 flex flex-col bg-white border-r border-gray-100 overflow-y-auto">
        {/* Back button */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <button onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors w-full">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Tracker
          </button>
        </div>

        {/* Avatar + Name */}
        <div className="flex flex-col items-center px-5 py-6 border-b border-gray-100 text-center">
          {aiAnalysis?.photo_base64 && aiAnalysis?.photo_mime ? (
            <img
              src={`data:${aiAnalysis.photo_mime};base64,${aiAnalysis.photo_base64}`}
              alt={record.candidate_name}
              className="w-24 h-24 rounded-3xl object-cover shadow-lg mb-4 border-2 border-indigo-100"
            />
          ) : (
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-white font-black text-3xl shadow-lg mb-4 transition-all ${aiLoading ? "bg-gradient-to-br from-indigo-300 to-blue-400 animate-pulse" : "bg-gradient-to-br from-indigo-500 to-blue-600"}`}>
              {aiLoading ? <Loader2 className="w-8 h-8 animate-spin opacity-80" /> : initials}
            </div>
          )}
          <h2 className="text-sm font-black text-gray-900 leading-tight">{record.candidate_name}</h2>
          {record.qualification && (
            <p className="text-xs text-gray-400 font-medium mt-1">{record.qualification}</p>
          )}
          <div className="mt-3">
            <StatusPill status={record.status} />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 font-mono">{record.name}</p>
        </div>

        {/* Key Details */}
        <div className="px-5 py-4 space-y-3 border-b border-gray-100">
          {record.applying_for_the_post && (
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Applied For</p>
              <p className="text-xs font-bold text-indigo-600">{record.applying_for_the_post}</p>
            </div>
          )}
          {record.department && (
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              <span className="text-xs text-gray-600">{record.department}</span>
            </div>
          )}
          {record.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              <span className="text-xs text-gray-600">{record.location}</span>
            </div>
          )}
          {record.company && (
            <div className="flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              <span className="text-xs text-gray-600">{record.company}</span>
            </div>
          )}
          {record.date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              <span className="text-xs text-gray-500">Applied {fmtDate(record.date)}</span>
            </div>
          )}
        </div>

        {/* Salary Summary */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Salary</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="text-[10px] font-semibold text-gray-400">Current</span>
              <span className="text-xs font-bold text-gray-700">{fmtCurrency(record.existing_salary_per_month)}</span>
            </div>
            <div className="flex justify-between items-center bg-emerald-50 rounded-xl px-3 py-2.5 border border-emerald-100">
              <span className="text-[10px] font-semibold text-emerald-500">Expected</span>
              <span className="text-xs font-bold text-emerald-700">{fmtCurrency(record.expected_salary)}</span>
            </div>
            {hikePercent !== null && (
              <div className={`text-center text-[10px] font-bold px-3 py-1.5 rounded-lg ${hikePercent > 30 ? "bg-red-50 text-red-500" : hikePercent > 15 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                {hikePercent > 0 ? `+${hikePercent}%` : `${hikePercent}%`} hike expectation
              </div>
            )}
          </div>
        </div>

        {/* Resume AI status indicator */}
        {hasResume && (
          <div className="px-5 py-4 mt-auto border-t border-gray-100">
            {aiLoading ? (
              <div className="flex items-center gap-2 text-[11px] text-indigo-500 font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing resume with AI…
              </div>
            ) : aiAnalysis ? (
              <div className="flex items-center gap-2 text-[11px] text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> AI analysis complete
                {(aiAnalysis as any).linkedin_enriched && <Linkedin className="w-3 h-3 text-blue-500" />}
              </div>
            ) : aiError ? (
              <div className="flex items-center gap-2 text-[11px] text-red-400 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" /> Resume analysis failed
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="bg-white border-b border-gray-100 px-6 pt-4 shrink-0">
          <div className="flex gap-1">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 -mb-px
                    ${activeTab === t.id ? "text-indigo-700 border-indigo-500 bg-indigo-50/50" : "text-gray-400 border-transparent hover:text-gray-700 hover:bg-gray-50"}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                  {"count" in t && t.count !== undefined && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === t.id ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── PROFILE TAB ── */}
          {activeTab === "info" && (
            <div className="space-y-4 max-w-3xl">
              {/* Quick chips */}
              <div className="flex flex-wrap gap-2">
                {record.applying_for_the_post && <InfoChip icon={Briefcase} label={record.applying_for_the_post} color="indigo" />}
                {record.department && <InfoChip icon={Building2} label={record.department} color="blue" />}
                {record.location && <InfoChip icon={MapPin} label={record.location} />}
                {record.qualification && <InfoChip icon={BookOpen} label={record.qualification} />}
              </div>

              {/* Details grid */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/60 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Candidate Information</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {[
                    { label: "Full Name", value: record.candidate_name, bold: true },
                    { label: "Qualification", value: record.qualification },
                    { label: "Applied For", value: record.applying_for_the_post, color: "text-indigo-600 font-semibold" },
                    { label: "Department", value: record.department },
                    { label: "Company", value: record.company },
                    { label: "Location", value: record.location },
                    { label: "Application Date", value: fmtDate(record.date) },
                    { label: "Submitted By", value: record.owner, mono: true },
                    { label: "Last Modified", value: fmtDate(record.modified) },
                  ].map(row => (
                    <div key={row.label} className="flex items-center px-5 py-3 gap-6">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest w-36 shrink-0">{row.label}</span>
                      <span className={`text-sm flex-1 ${row.bold ? "font-bold text-gray-900" : row.mono ? "font-mono text-gray-500 text-xs" : row.color || "text-gray-700"}`}>
                        {row.value || <span className="text-gray-300">—</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Salary breakdown visual */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Salary Breakdown</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Current / Month</p>
                    <p className="text-2xl font-black text-gray-800">{record.existing_salary_per_month ? fmtCurrency(record.existing_salary_per_month) : <span className="text-gray-300 text-lg">Not shared</span>}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Expected / Month</p>
                    <p className="text-2xl font-black text-emerald-700">{record.expected_salary ? fmtCurrency(record.expected_salary) : <span className="text-emerald-300 text-lg">Not stated</span>}</p>
                  </div>
                </div>
                {hikePercent !== null && (
                  <div className={`mt-3 text-center py-2.5 rounded-xl text-sm font-bold
                    ${hikePercent > 30 ? "bg-red-50 text-red-500 border border-red-100" : hikePercent > 15 ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                    Candidate expects {hikePercent > 0 ? `a +${hikePercent}%` : `a ${hikePercent}%`} salary change
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── INTERVIEW TAB ── */}
          {activeTab === "interview" && (
            <div className="space-y-4 max-w-3xl">
              {/* Status chips */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Experience Status", value: record.experience_status, icon: Briefcase },
                  { label: "Telephonic Interview", value: record.rt_telephonic_interview ? fmtDate(record.rt_telephonic_interview) : null, icon: Phone },
                  { label: "Last Conversation", value: fmtDate(record.rt_last_convo), icon: Clock },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                    <item.icon className="w-5 h-5 text-indigo-300 mx-auto mb-2" />
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-xs font-bold text-gray-800">{item.value || <span className="text-gray-300 font-normal">—</span>}</p>
                  </div>
                ))}
              </div>

              {/* Interview Comments */}
              {record.telephonic_interview_commands ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Interview Comments</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{record.telephonic_interview_commands}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                  <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No interview comments yet</p>
                </div>
              )}

              {/* Not Suitable Reason */}
              {record.not_suitable_reason && (
                <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Not Suitable Reason</span>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <p className="text-sm text-red-700 leading-relaxed whitespace-pre-wrap">{record.not_suitable_reason}</p>
                  </div>
                </div>
              )}

              {/* Resume AI status */}
              {record.candidate_resume && (
                <div className={`flex items-center gap-3 rounded-2xl border shadow-sm px-5 py-4 ${aiLoading ? "bg-indigo-50 border-indigo-100" : aiAnalysis ? "bg-emerald-50 border-emerald-100" : aiError ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                    {aiLoading ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /> : aiAnalysis ? <Sparkles className="w-5 h-5 text-emerald-500" /> : <FileText className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">Resume / CV</p>
                    <p className="text-xs text-gray-500">{aiLoading ? "AI is analyzing the resume…" : aiAnalysis ? "AI analysis complete — see AI Assessment tab" : aiError ? aiError : "Resume attached"}</p>
                  </div>
                  {aiAnalysis && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
              )}
            </div>
          )}

          {/* ── CALL LOG TAB ── */}
          {activeTab === "calllog" && (
            <div className="max-w-3xl">
              {followups.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                  <Phone className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-400">No call logs recorded yet</p>
                  <p className="text-xs text-gray-300 mt-1">Follow-up calls will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followups.map((f, idx) => (
                    <div key={f.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-start gap-4">
                        {/* Icon + connector */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-500 shadow-sm">
                            <CommIcon mode={f.mode_of_communication} />
                          </div>
                          {idx < followups.length - 1 && <div className="w-px h-3 bg-gray-200 mt-2" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                            <div>
                              <span className="text-sm font-bold text-gray-900">{f.employee_name || f.employee}</span>
                              {f.mode_of_communication && (
                                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                  <CommIcon mode={f.mode_of_communication} />{f.mode_of_communication}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 shrink-0">
                              <Calendar className="w-3 h-3" />
                              <span>{fmtDate(f.date)}</span>
                              {f.time && <><Clock className="w-3 h-3 ml-1" /><span>{fmtTime(f.time)}{f.end_time ? ` – ${fmtTime(f.end_time)}` : ""}</span></>}
                            </div>
                          </div>

                          {/* Conversation */}
                          {f.conversation && (
                            <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{f.conversation}</p>
                            </div>
                          )}

                          {/* Next followup */}
                          {f.next_followup && (
                            <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                              <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="text-[10px] text-amber-700 font-semibold">Next Follow-up: {fmtDate(f.next_followup)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── AI ASSESSMENT TAB ── */}
          {activeTab === "ai" && (
            <div className="space-y-4 max-w-3xl">
              {aiLoading && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm font-semibold text-indigo-600">Analyzing resume with AI…</p>
                  <p className="text-xs text-indigo-400 mt-1">Extracting data · Rating · Interview questions · LinkedIn</p>
                </div>
              )}
              {aiError && !aiLoading && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                  <AlertTriangle className="w-8 h-8 text-red-300 mx-auto mb-2" />
                  <p className="text-sm text-red-600">{aiError}</p>
                </div>
              )}
              {aiAnalysis && !aiLoading && (() => {
                const resume = aiAnalysis.resume;
                const assessment = aiAnalysis.assessment;
                const photoSrc = aiAnalysis.photo_base64 && aiAnalysis.photo_mime ? `data:${aiAnalysis.photo_mime};base64,${aiAnalysis.photo_base64}` : null;
                return (
                  <>
                    {/* Candidate identity from resume */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
                      {photoSrc ? (
                        <img src={photoSrc} alt="Candidate" className="w-16 h-20 object-cover rounded-xl border-2 border-indigo-100 shrink-0" />
                      ) : (
                        <div className="w-16 h-20 rounded-xl bg-gradient-to-br from-indigo-400 to-blue-600 flex items-center justify-center shrink-0">
                          <span className="text-white font-black text-xl">{(resume.name || record.candidate_name || "?").slice(0,2).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900">{resume.name || record.candidate_name}</p>
                        {resume.current_title && <p className="text-xs text-indigo-600 font-semibold mt-0.5">{resume.current_title}</p>}
                        {resume.career_level && <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">{resume.career_level}</span>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {resume.email && <span className="text-[11px] text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" />{resume.email}</span>}
                          {resume.phone && <span className="text-[11px] text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{resume.phone}</span>}
                          {resume.location && <span className="text-[11px] text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{resume.location}</span>}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {resume.linkedin_url && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700"><Linkedin className="w-3 h-3" /> LinkedIn</span>}
                          {resume.github_url && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600"><Github className="w-3 h-3" /> GitHub</span>}
                        </div>
                      </div>
                    </div>

                    {/* Rating */}
                    {typeof assessment.overall_rating === "number" && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">AI Rating</span>
                          {(aiAnalysis as any).linkedin_enriched && <span className="ml-auto text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1"><Linkedin className="w-3 h-3" /> LinkedIn Enriched</span>}
                        </div>
                        <div className="flex items-center gap-8 flex-wrap">
                          <RatingGauge value={assessment.overall_rating} />
                          <div className="flex-1 min-w-[200px] space-y-3">
                            {Object.entries(assessment.rating_breakdown || {}).map(([key, val]) => (
                              <RatingBar key={key} label={key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} value={val as number} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hiring Recommendation */}
                    {assessment.hiring_recommendation && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-3"><Target className="w-3.5 h-3.5 text-indigo-500" /><span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Hiring Recommendation</span></div>
                        <div className="flex items-start gap-4">
                          <HiringBadge rec={assessment.hiring_recommendation} />
                          <p className="text-sm text-gray-700 leading-relaxed flex-1">{assessment.hiring_reason}</p>
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {resume.summary && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-2"><User className="w-3.5 h-3.5 text-indigo-500" /><span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Professional Summary</span></div>
                        <p className="text-sm text-gray-700 leading-relaxed">{resume.summary}</p>
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Years Exp.", value: resume.total_experience_years ? `${resume.total_experience_years}y` : "—", color: "text-indigo-600", bg: "bg-indigo-50" },
                        { label: "Companies", value: (resume.experience || []).length || "—", color: "text-blue-600", bg: "bg-blue-50" },
                        { label: "Skills", value: (resume.skills || []).length + (resume.technical_skills || []).length || "—", color: "text-emerald-600", bg: "bg-emerald-50" },
                        { label: "AI Score", value: assessment.overall_rating ? `${assessment.overall_rating}/10` : "—", color: "text-purple-600", bg: "bg-purple-50" },
                      ].map(s => (
                        <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
                          <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Strengths + Concerns */}
                    {(assessment.strengths || []).length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-3"><Shield className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Strengths</span></div>
                        <ul className="space-y-2">
                          {(assessment.strengths || []).map((s, i) => (
                            <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span className="text-sm text-gray-700">{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(assessment.concerns || []).length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-3"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Concerns</span></div>
                        <ul className="space-y-2">
                          {(assessment.concerns || []).map((c, i) => (
                            <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><span className="text-sm text-gray-700">{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Salary + Trajectory */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {assessment.salary_assessment && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                          <div className="flex items-center gap-2 mb-2"><DollarSign className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Salary Assessment</span></div>
                          <p className="text-sm text-gray-700">{assessment.salary_assessment}</p>
                        </div>
                      )}
                      {assessment.career_trajectory && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                          <div className="flex items-center gap-2 mb-2"><BarChart2 className="w-3.5 h-3.5 text-indigo-500" /><span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Career Trajectory</span></div>
                          <div className="flex items-center gap-2"><TrajectoryIcon traj={assessment.career_trajectory} /><span className="text-sm font-bold text-gray-800">{assessment.career_trajectory}</span></div>
                          {assessment.career_trajectory_detail && <p className="text-xs text-gray-500 mt-1">{assessment.career_trajectory_detail}</p>}
                        </div>
                      )}
                    </div>

                    {/* Interview Questions */}
                    {(assessment.interview_questions || []).length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
                          <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">AI Interview Questions</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {(assessment.interview_questions || []).map((q, i) => q && (
                            <div key={i} className="px-5 py-4">
                              <p className="text-sm font-semibold text-gray-800">{q.question}</p>
                              {q.category && <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full mt-1 inline-block">{q.category}</span>}
                              {q.purpose && <p className="text-[11px] text-gray-400 mt-1 flex items-start gap-1.5"><Lightbulb className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />{q.purpose}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* ── EXPERIENCE TAB ── */}
          {activeTab === "experience" && (
            <div className="space-y-6 max-w-3xl">
              {aiLoading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>}
              {aiAnalysis && !aiLoading && (() => {
                const resume = aiAnalysis.resume;
                const assessment = aiAnalysis.assessment;
                const hasExp = (resume.experience || []).length > 0;
                const hasInternships = (resume.internships || []).length > 0;
                const hasProjects = (resume.projects || []).length > 0;
                const hasAchievements = (resume.achievements || []).length > 0;
                const hasEducation = (resume.education || []).length > 0;
                return (
                  <>
                    {/* Work Experience */}
                    {hasExp && (
                      <div>
                        <div className="flex items-center gap-2 mb-3"><Briefcase className="w-3.5 h-3.5 text-indigo-500" /><span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Work Experience</span></div>
                        <div className="space-y-3">
                          {(resume.experience || []).map((exp, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                              <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-sm font-bold text-gray-900">{exp.title}</h3>
                                    {(() => { const ca = (assessment.company_analysis || []).find(c => c.company?.toLowerCase() === exp.company?.toLowerCase()); return ca ? <CompanyTierBadge tier={ca.tier} /> : null; })()}
                                  </div>
                                  <p className="text-sm font-semibold text-indigo-600 mt-0.5">{exp.company}</p>
                                  {exp.location && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{exp.location}</p>}
                                </div>
                                <div className="text-right">
                                  {exp.duration && <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{exp.duration}</span>}
                                  {(exp.start_year || exp.end_year) && <p className="text-[10px] text-gray-400 mt-1">{exp.start_year}{exp.start_year && exp.end_year ? " – " : ""}{exp.end_year}</p>}
                                </div>
                              </div>
                              {exp.description && <p className="text-xs text-gray-600 leading-relaxed mb-2">{exp.description}</p>}
                              {(exp.achievements || []).length > 0 && (
                                <div className="space-y-1.5">
                                  {exp.achievements.map((a, j) => (
                                    <div key={j} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5">
                                      <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />{a}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Internships */}
                    {hasInternships && (
                      <div>
                        <div className="flex items-center gap-2 mb-3"><Star className="w-3.5 h-3.5 text-amber-500" /><span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Internships</span></div>
                        <div className="space-y-3">
                          {(resume.internships || []).map((intern, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                              <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                                <div>
                                  <h3 className="text-sm font-bold text-gray-900">{intern.title}</h3>
                                  <p className="text-sm font-semibold text-amber-600 mt-0.5">{intern.company}</p>
                                  {intern.location && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{intern.location}</p>}
                                </div>
                                {intern.duration && <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">{intern.duration}</span>}
                              </div>
                              {intern.description && <p className="text-xs text-gray-600 leading-relaxed mb-2">{intern.description}</p>}
                              {(intern.responsibilities || []).length > 0 && (
                                <div className="space-y-1.5">
                                  {intern.responsibilities.map((r, j) => (
                                    <div key={j} className="flex items-start gap-2 text-xs text-gray-700 bg-amber-50/60 rounded-lg px-3 py-1.5">
                                      <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />{r}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    {hasProjects && (
                      <div>
                        <div className="flex items-center gap-2 mb-3"><Zap className="w-3.5 h-3.5 text-purple-500" /><span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Projects</span></div>
                        <div className="space-y-3">
                          {(resume.projects || []).map((proj, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5">
                              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                                <h3 className="text-sm font-bold text-gray-900">{proj.name}</h3>
                                {proj.year && <span className="text-[11px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full shrink-0">{proj.year}</span>}
                              </div>
                              {proj.description && <p className="text-xs text-gray-600 leading-relaxed mb-2">{proj.description}</p>}
                              {(proj.highlights || []).length > 0 && (
                                <div className="space-y-1.5 mb-2">
                                  {proj.highlights!.map((h, j) => (
                                    <div key={j} className="flex items-start gap-2 text-xs text-gray-700 bg-purple-50/60 rounded-lg px-3 py-1.5">
                                      <ChevronRight className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />{h}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {(proj.technologies || []).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {proj.technologies.map((t, j) => <span key={j} className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-purple-50 text-purple-600 border border-purple-100">{t}</span>)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Achievements */}
                    {hasAchievements && (
                      <div>
                        <div className="flex items-center gap-2 mb-3"><Award className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Achievements & Awards</span></div>
                        <div className="space-y-3">
                          {(resume.achievements || []).map((ach, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center shrink-0">
                                <Award className="w-4 h-4 text-emerald-500" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  <p className="text-sm font-bold text-gray-900">{ach.title}</p>
                                  {ach.year && <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded shrink-0">{ach.year}</span>}
                                </div>
                                {ach.organization && <p className="text-xs text-emerald-600 font-semibold mt-0.5">{ach.organization}</p>}
                                {ach.description && <p className="text-xs text-gray-500 leading-relaxed mt-1">{ach.description}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {hasEducation && (
                      <div>
                        <div className="flex items-center gap-2 mb-3"><BookOpen className="w-3.5 h-3.5 text-blue-500" /><span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Education</span></div>
                        <div className="space-y-3">
                          {(resume.education || []).map((edu, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
                              <div className="w-12 h-12 rounded-xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center shrink-0">
                                <BookOpen className="w-5 h-5 text-blue-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">{edu.degree}{edu.field && edu.field !== edu.degree ? ` in ${edu.field}` : ""}</p>
                                <p className="text-sm text-indigo-600 font-semibold">{edu.institution}</p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  {edu.year && <span className="text-xs text-gray-400">{edu.year}</span>}
                                  {edu.gpa && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">CGPA: {edu.gpa}</span>}
                                  {edu.percentage && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{edu.percentage}</span>}
                                  {edu.grade && <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg">{edu.grade}</span>}
                                  {edu.level && <span className="text-[10px] text-gray-400 uppercase tracking-wide">{edu.level}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!hasExp && !hasInternships && !hasProjects && !hasAchievements && !hasEducation && (
                      <div className="text-center py-16 text-gray-400"><BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" /><p className="text-sm">No experience data extracted</p></div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* ── SKILLS TAB ── */}
          {activeTab === "skills" && (
            <div className="space-y-4 max-w-3xl">
              {aiLoading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>}
              {aiAnalysis && !aiLoading && (() => {
                const resume = aiAnalysis.resume;
                return (
                  <>
                    {(resume.technical_skills || []).length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-3"><Zap className="w-3.5 h-3.5 text-indigo-500" /><span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Technical Skills</span></div>
                        <div className="flex flex-wrap gap-2">
                          {(resume.technical_skills || []).map((s, i) => <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">{s}</span>)}
                        </div>
                      </div>
                    )}
                    {(resume.soft_skills || []).length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-3"><Brain className="w-3.5 h-3.5 text-purple-500" /><span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Soft Skills</span></div>
                        <div className="flex flex-wrap gap-2">
                          {(resume.soft_skills || []).map((s, i) => <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">{s}</span>)}
                        </div>
                      </div>
                    )}
                    {(resume.skills || []).length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-3"><Star className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs font-bold text-gray-700 uppercase tracking-widest">All Skills</span></div>
                        <div className="flex flex-wrap gap-2">
                          {(resume.skills || []).map((s, i) => <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">{s}</span>)}
                        </div>
                      </div>
                    )}
                    {(resume.certifications || []).length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2"><Award className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Certifications</span></div>
                        <div className="divide-y divide-gray-50">
                          {(resume.certifications || []).map((cert, i) => {
                            const c = typeof cert === "string" ? { name: cert, issuer: "", year: "" } : cert;
                            return (
                              <div key={i} className="px-5 py-3 flex items-center gap-3">
                                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                                  {(c.issuer || c.year) && <p className="text-xs text-gray-400">{c.issuer}{c.issuer && c.year ? " · " : ""}{c.year}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {(resume.languages || []).length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-3"><Globe className="w-3.5 h-3.5 text-blue-500" /><span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Languages</span></div>
                        <div className="flex flex-wrap gap-3">
                          {(resume.languages || []).map((l, i) => {
                            const lang = typeof l === "string" ? { language: l, proficiency: "" } : l;
                            return (
                              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100">
                                <Globe className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-xs font-bold text-blue-700">{lang.language}</span>
                                {lang.proficiency && <span className="text-[10px] text-blue-400">· {lang.proficiency}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Analytics Dashboard ────────────────────────────────────────────────────

interface AIInsights {
  key_metrics: {
    acceptance_rate_pct: number;
    rejection_rate_pct: number;
    avg_salary_ask: number;
    top_applied_position: string;
    top_rejection_reason_category: string;
  };
  rejection_patterns: { category: string; count: number; percentage: number; description: string; recommendation: string }[];
  position_insights: { position: string; total_applied: number; selected: number; rejected: number; open: number; difficulty: string; insight: string }[];
  department_insights: { department: string; total: number; hired: number; pipeline: number; insight: string }[];
  overall_insights: string[];
  hiring_recommendations: string[];
  pipeline_health: "healthy" | "moderate" | "critical";
  pipeline_health_reason: string;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex-1">
      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function AnalyticsDashboard({ trackers, onFilterStatus }: { trackers: RecruitmentTracker[]; onFilterStatus: (status: string) => void }) {
  const { toast } = useToast();
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const total = trackers.length;
  const statusCounts = trackers.reduce((acc, t) => {
    const s = t.status || "Unknown";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const selected = (statusCounts["Selected"] || 0) + (statusCounts["Joined"] || 0);
  const rejected = statusCounts["Not Suitable"] || 0;
  const open = statusCounts["Open"] || 0;
  const hold = statusCounts["Hold"] || 0;
  const offerDeclined = statusCounts["Offer Declined"] || 0;

  const acceptanceRate = total > 0 ? Math.round((selected / total) * 100) : 0;
  const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

  const positionMap = trackers.reduce((acc, t) => {
    const pos = t.applying_for_the_post || "Unspecified";
    if (!acc[pos]) acc[pos] = { total: 0, selected: 0, rejected: 0, open: 0, hold: 0 };
    acc[pos].total++;
    const s = (t.status || "").toLowerCase();
    if (s === "selected" || s === "joined") acc[pos].selected++;
    else if (s === "not suitable") acc[pos].rejected++;
    else if (s === "open") acc[pos].open++;
    else if (s === "hold") acc[pos].hold++;
    return acc;
  }, {} as Record<string, { total: number; selected: number; rejected: number; open: number; hold: number }>);

  const positions = Object.entries(positionMap)
    .map(([pos, d]) => ({ pos, ...d }))
    .sort((a, b) => b.total - a.total);

  const deptMap = trackers.reduce((acc, t) => {
    const d = t.department || "No Department";
    if (!acc[d]) acc[d] = { total: 0, hired: 0 };
    acc[d].total++;
    const s = (t.status || "").toLowerCase();
    if (s === "selected" || s === "joined") acc[d].hired++;
    return acc;
  }, {} as Record<string, { total: number; hired: number }>);

  const departments = Object.entries(deptMap).map(([d, v]) => ({ dept: d, ...v })).sort((a, b) => b.total - a.total);

  const rejectedCandidates = trackers.filter(t => t.status === "Not Suitable" && t.not_suitable_reason);
  const reasonKeywords = rejectedCandidates.reduce((acc, t) => {
    const reason = (t.not_suitable_reason || "").toLowerCase();
    const keywords = ["salary", "experience", "skills", "qualification", "location", "communication", "attitude", "notice", "not interested", "overqualified", "underqualified"];
    keywords.forEach(kw => {
      if (reason.includes(kw)) acc[kw] = (acc[kw] || 0) + 1;
    });
    if (!keywords.some(kw => reason.includes(kw))) {
      acc["other"] = (acc["other"] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const reasonEntries = Object.entries(reasonKeywords).sort((a, b) => b[1] - a[1]);
  const maxReasonCount = reasonEntries[0]?.[1] || 1;

  const statusColors: Record<string, string> = {
    "Open": "bg-blue-500",
    "Hold": "bg-amber-400",
    "Selected": "bg-emerald-500",
    "Not Suitable": "bg-red-400",
    "Joined": "bg-teal-500",
    "Offer Declined": "bg-orange-400",
    "Unknown": "bg-gray-400",
  };

  const statusOrder = ["Open", "Hold", "Selected", "Joined", "Not Suitable", "Offer Declined"];
  const sortedStatuses = [...statusOrder.filter(s => statusCounts[s]), ...Object.keys(statusCounts).filter(s => !statusOrder.includes(s))];

  async function generateInsights() {
    setInsightsLoading(true);
    try {
      const r = await fetch(`${BASE}/api/hrms/recruitment-insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: trackers }),
      });
      if (!r.ok) throw new Error(await r.text());
      setInsights(await r.json());
    } catch (e) {
      toast({ title: "AI analysis failed", description: String(e), variant: "destructive" });
    } finally { setInsightsLoading(false); }
  }

  const healthColor = insights?.pipeline_health === "healthy" ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
    insights?.pipeline_health === "critical" ? "text-red-600 bg-red-50 border-red-200" :
    "text-amber-600 bg-amber-50 border-amber-200";

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Candidates", value: total, icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          { label: "Active Pipeline", value: open + hold, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
          { label: "Hired / Joined", value: selected, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
          { label: "Rejected", value: rejected, icon: XCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
          { label: "Offer Declined", value: offerDeclined, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100" },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-white rounded-2xl border ${card.border} shadow-sm p-4`}>
              <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4.5 h-4.5 ${card.color}`} />
              </div>
              <p className="text-2xl font-black text-gray-900">{card.value}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Acceptance & Rejection Rate */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Acceptance Rate</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black text-emerald-600">{acceptanceRate}%</span>
            <span className="text-sm text-gray-400 mb-1">{selected} of {total} candidates</span>
          </div>
          <div className="mt-3 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${acceptanceRate}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Rejection Rate</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black text-red-500">{rejectionRate}%</span>
            <span className="text-sm text-gray-400 mb-1">{rejected} of {total} candidates</span>
          </div>
          <div className="mt-3 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-red-400 rounded-full transition-all duration-700" style={{ width: `${rejectionRate}%` }} />
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Status Breakdown</span>
        </div>
        <div className="space-y-2.5">
          {sortedStatuses.map(status => {
            const count = statusCounts[status] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={status} className="flex items-center gap-3 cursor-pointer group hover:bg-indigo-50/60 rounded-lg px-1 -mx-1 transition-colors" onClick={() => onFilterStatus(status)} title={`Filter by ${status}`}>
                <span className="w-28 shrink-0"><StatusPill status={status} /></span>
                <MiniBar value={count} max={total} color={statusColors[status] || "bg-gray-400"} />
                <span className="text-xs font-bold text-gray-500 w-10 text-right shrink-0">{count}</span>
                <span className="text-[10px] text-gray-400 w-8 shrink-0">{pct}%</span>
                <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">Filter →</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Position-wise Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Position Tracker</span>
            <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{positions.length} positions</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {positions.map(p => (
              <div key={p.pos} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs font-semibold text-gray-800 flex-1">{p.pos}</p>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">{p.total} applied</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {p.open > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{p.open} open</span>}
                  {p.hold > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">{p.hold} hold</span>}
                  {p.selected > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">{p.selected} hired</span>}
                  {p.rejected > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-500">{p.rejected} rejected</span>}
                </div>
                <div className="mt-2 flex gap-1 h-1.5">
                  {p.selected > 0 && <div className="bg-emerald-500 rounded-full" style={{ width: `${(p.selected / p.total) * 100}%` }} />}
                  {p.open > 0 && <div className="bg-blue-400 rounded-full" style={{ width: `${(p.open / p.total) * 100}%` }} />}
                  {p.hold > 0 && <div className="bg-amber-400 rounded-full" style={{ width: `${(p.hold / p.total) * 100}%` }} />}
                  {p.rejected > 0 && <div className="bg-red-400 rounded-full" style={{ width: `${(p.rejected / p.total) * 100}%` }} />}
                </div>
              </div>
            ))}
            {positions.length === 0 && <div className="px-5 py-8 text-center text-xs text-gray-400">No data</div>}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Department Breakdown</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {departments.map(d => (
              <div key={d.dept} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{d.dept}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{d.hired} hired of {d.total}</p>
                </div>
                <MiniBar value={d.hired} max={d.total} color="bg-emerald-500" />
                <span className="text-xs font-bold text-gray-600 w-6 text-right shrink-0">{d.total}</span>
              </div>
            ))}
            {departments.length === 0 && <div className="px-5 py-8 text-center text-xs text-gray-400">No data</div>}
          </div>
        </div>
      </div>

      {/* Rejection Reasons Analysis */}
      {rejectedCandidates.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-red-50 bg-red-50/40 flex items-center gap-2">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Rejection Reasons Analysis</span>
            <span className="ml-auto text-[10px] font-bold text-red-400 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">{rejectedCandidates.length} rejected</span>
          </div>
          <div className="p-5 space-y-4">
            {reasonEntries.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Common Rejection Categories</p>
                {reasonEntries.map(([kw, count]) => (
                  <div key={kw} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-600 w-32 shrink-0 capitalize">{kw}</span>
                    <MiniBar value={count} max={maxReasonCount} color="bg-red-400" />
                    <span className="text-xs font-bold text-gray-500 w-6 text-right shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Individual Rejection Notes</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {rejectedCandidates.map(c => (
                  <div key={c.name} className="bg-red-50/60 border border-red-100 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-gray-700">{c.candidate_name}</span>
                      <span className="text-[10px] text-gray-400">·</span>
                      <span className="text-[10px] text-indigo-500 font-semibold">{c.applying_for_the_post}</span>
                    </div>
                    <p className="text-xs text-red-700 leading-relaxed">{c.not_suitable_reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Section */}
      <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-indigo-50 bg-gradient-to-r from-indigo-50 to-blue-50 flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">AI Insights</span>
          <span className="ml-auto text-[10px] text-indigo-400 font-medium">Powered by GPT-4o</span>
        </div>
        <div className="p-5">
          {!insights && !insightsLoading && (
            <div className="text-center py-8">
              <Brain className="w-10 h-10 text-indigo-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">Get AI-powered insights on rejection patterns,<br />hiring trends, and recommendations</p>
              <button onClick={generateInsights}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm">
                <Sparkles className="w-4 h-4" /> Generate AI Analysis
              </button>
            </div>
          )}
          {insightsLoading && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-indigo-600">Analyzing {trackers.length} candidates with AI…</p>
              <p className="text-xs text-indigo-400 mt-1">Finding patterns · Rejection reasons · Recommendations</p>
            </div>
          )}
          {insights && !insightsLoading && (
            <div className="space-y-5">
              {/* Pipeline Health */}
              <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${healthColor}`}>
                <Activity className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest">Pipeline Health: {insights.pipeline_health?.toUpperCase()}</p>
                  <p className="text-xs mt-1 leading-relaxed">{insights.pipeline_health_reason}</p>
                </div>
              </div>

              {/* Key Metrics */}
              {insights.key_metrics && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "Acceptance Rate", value: `${insights.key_metrics.acceptance_rate_pct}%`, color: "text-emerald-600" },
                    { label: "Rejection Rate", value: `${insights.key_metrics.rejection_rate_pct}%`, color: "text-red-500" },
                    { label: "Avg Salary Ask", value: insights.key_metrics.avg_salary_ask ? fmtCurrency(insights.key_metrics.avg_salary_ask) : "—", color: "text-blue-600" },
                    { label: "Top Position", value: insights.key_metrics.top_applied_position || "—", color: "text-indigo-600" },
                    { label: "Top Rejection Reason", value: insights.key_metrics.top_rejection_reason_category || "—", color: "text-orange-500" },
                  ].map(m => (
                    <div key={m.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{m.label}</p>
                      <p className={`text-sm font-bold ${m.color} leading-tight`}>{m.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Rejection Patterns */}
              {(insights.rejection_patterns || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <XCircle className="w-3 h-3 text-red-400" /> Rejection Patterns
                  </p>
                  <div className="space-y-2">
                    {insights.rejection_patterns.map((rp, i) => (
                      <div key={i} className="bg-red-50/60 border border-red-100 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-red-700">{rp.category}</span>
                          <span className="text-[10px] text-red-400 bg-red-100 px-1.5 py-0.5 rounded-full">{rp.count} cases · {rp.percentage}%</span>
                        </div>
                        <p className="text-[11px] text-gray-600 mb-1">{rp.description}</p>
                        {rp.recommendation && (
                          <p className="text-[11px] text-indigo-600 flex items-start gap-1.5">
                            <Lightbulb className="w-3 h-3 shrink-0 mt-0.5 text-amber-400" />{rp.recommendation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall Insights */}
              {(insights.overall_insights || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-indigo-400" /> Key Observations
                  </p>
                  <ul className="space-y-1.5">
                    {insights.overall_insights.map((obs, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-indigo-50/50 rounded-lg px-3 py-2 border border-indigo-50">
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />{obs}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Hiring Recommendations */}
              {(insights.hiring_recommendations || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Lightbulb className="w-3 h-3 text-amber-400" /> Recommendations
                  </p>
                  <ul className="space-y-1.5">
                    {insights.hiring_recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-amber-50/60 rounded-lg px-3 py-2 border border-amber-100">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={generateInsights} disabled={insightsLoading}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" /> Regenerate Analysis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Recruitment() {
  const { toast } = useToast();
  const [trackers, setTrackers] = useState<RecruitmentTracker[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [detailRecord, setDetailRecord] = useState<RecruitmentTracker | null>(null);
  const [mainView, setMainView] = useState<"tracker" | "analyzer" | "analytics">("tracker");

  const loadTrackers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (deptFilter) params.set("department", deptFilter);
      const r = await fetch(`${BASE}/api/hrms/recruitment?${params}`);
      if (!r.ok) throw new Error(await r.text());
      setTrackers(await r.json());
    } catch (e) {
      toast({ title: "Failed to load recruitment data", description: String(e), variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast, statusFilter, deptFilter]);

  useEffect(() => { loadTrackers(); }, []); // eslint-disable-line

  const openDetail = async (name: string) => {
    setDetailLoading(true);
    try {
      const r = await fetch(`${BASE}/api/hrms/recruitment/${encodeURIComponent(name)}`);
      if (!r.ok) throw new Error(await r.text());
      setDetailRecord(await r.json());
    } catch (e) {
      toast({ title: "Failed to load candidate details", description: String(e), variant: "destructive" });
    } finally { setDetailLoading(false); }
  };

  const depts = [...new Set(trackers.map(t => t.department).filter(Boolean) as string[])].sort();
  const statuses = [...new Set(trackers.map(t => t.status).filter(Boolean))].sort();
  const filtered = trackers.filter(t =>
    (!search || (t.candidate_name ?? "").toLowerCase().includes(search.toLowerCase()) || (t.applying_for_the_post ?? "").toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || (t.status ?? "").toLowerCase() === statusFilter.toLowerCase()) &&
    (!deptFilter || t.department === deptFilter)
  );
  const selectedCount = trackers.filter(t => t.status === "Selected").length;
  const openCount = trackers.filter(t => t.status === "Open").length;
  const joinedCount = trackers.filter(t => t.status === "Joined").length;

  if (detailLoading) {
    return (
      <Layout>
        <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">
          <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0">
            <button onClick={() => setDetailRecord(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span className="text-xs text-gray-400">Loading candidate details…</span>
          </div>
          <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
        </div>
      </Layout>
    );
  }

  if (detailRecord) {
    return (
      <Layout>
        <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">
          <DetailView record={detailRecord} onBack={() => setDetailRecord(null)} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-0 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 shrink-0">
            <UserPlus className="w-4 h-4 text-blue-500 shrink-0" />
            <h1 className="text-sm font-bold text-gray-900">Recruitment</h1>
          </div>

          {/* View tabs */}
          <div className="flex gap-1 flex-1">
            {([
              { id: "tracker", label: "Tracker", icon: Users },
              { id: "analytics", label: "Analytics", icon: BarChart },
              { id: "analyzer", label: "Resume Analyzer", icon: FileText },
            ] as const).map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setMainView(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold border-b-2 -mb-px transition-all
                    ${mainView === tab.id ? "text-indigo-700 border-indigo-500" : "text-gray-400 border-transparent hover:text-gray-700 hover:border-gray-200"}`}>
                  <Icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              );
            })}
          </div>

          {mainView === "tracker" && (
            <button onClick={loadTrackers} disabled={loading} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>

        {/* Analytics view */}
        {mainView === "analytics" && (
          <>
            <div className="px-6 pt-3 pb-0 flex items-center gap-3 shrink-0">
              <div className="flex gap-2 flex-wrap flex-1">
                {[
                  { label: "Total", value: trackers.length, color: "bg-blue-500", filter: "" },
                  { label: "Open", value: openCount, color: "bg-indigo-400", filter: "Open" },
                  { label: "Selected", value: selectedCount, color: "bg-emerald-500", filter: "Selected" },
                  { label: "Joined", value: joinedCount, color: "bg-teal-500", filter: "Joined" },
                  { label: "Rejected", value: trackers.filter(t => t.status === "Not Suitable").length, color: "bg-red-400", filter: "Not Suitable" },
                ].map(s => (
                  <button key={s.label} onClick={() => { setStatusFilter(s.filter); setMainView("tracker"); }}
                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-indigo-300 hover:bg-indigo-50/40 transition-all cursor-pointer">
                    <span className={`w-2 h-2 rounded-full ${s.color} shrink-0`} />
                    <span className="text-xs font-bold text-gray-700">{s.value}</span>
                    <span className="text-[10px] text-gray-400">{s.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={loadTrackers} disabled={loading} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors shrink-0">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            {loading ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
            ) : (
              <AnalyticsDashboard trackers={trackers} onFilterStatus={(status) => { setStatusFilter(status); setMainView("tracker"); }} />
            )}
          </>
        )}

        {/* Resume Analyzer view */}
        {mainView === "analyzer" && <ResumeAnalyzer />}

        {/* Tracker list view */}
        {mainView === "tracker" && (
          <>
            {/* Toolbar */}
            <div className="px-5 py-2.5 flex items-center gap-3 shrink-0 border-b border-gray-200 bg-white">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidate or position…"
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              {/* Dept */}
              {depts.length > 0 && (
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                  className="appearance-none px-3 py-1.5 pr-7 text-xs rounded-md border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239ca3af'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
                  <option value="">All Departments</option>
                  {depts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
              {/* Status */}
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="appearance-none px-3 py-1.5 pr-7 text-xs rounded-md border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239ca3af'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
                <option value="">All Status</option>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {(search || statusFilter || deptFilter) && (
                <button onClick={() => { setSearch(""); setStatusFilter(""); setDeptFilter(""); }}
                  className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded border border-gray-200 hover:border-gray-300 transition-colors">
                  Clear
                </button>
              )}
              <div className="ml-auto flex items-center gap-3">
                {/* Quick status counts */}
                {[
                  { label: "Total", value: trackers.length },
                  { label: "Open", value: openCount },
                  { label: "Selected", value: selectedCount },
                  { label: "Joined", value: joinedCount },
                ].map(s => (
                  <span key={s.label} className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-800">{s.value}</span> {s.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-400">Loading…</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-2">
                  <Users className="w-8 h-8 text-gray-300" />
                  <p className="text-sm text-gray-400">No candidates match your filters</p>
                  {(search || statusFilter || deptFilter) && (
                    <button onClick={() => { setSearch(""); setStatusFilter(""); setDeptFilter(""); }}
                      className="text-xs text-blue-600 hover:underline mt-1">Clear filters</button>
                  )}
                </div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-8">#</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Candidate</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Position</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                      <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Expected Salary</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Last Contact</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((t, i) => {
                      const initials = (t.candidate_name || "?").trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
                      const hikeAmt = t.existing_salary_per_month && t.expected_salary
                        ? Math.round(((t.expected_salary - t.existing_salary_per_month) / t.existing_salary_per_month) * 100)
                        : null;
                      return (
                        <tr key={t.name} onClick={() => openDetail(t.name)}
                          className="hover:bg-blue-50/40 cursor-pointer transition-colors group">
                          <td className="px-4 py-3 text-[11px] text-gray-400 tabular-nums">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-600 shrink-0 select-none">
                                {initials}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-tight">{t.candidate_name}</p>
                                {t.qualification && <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{t.qualification}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 max-w-[160px]">
                            <span className="truncate block">{t.applying_for_the_post || "—"}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[130px]">
                            <span className="truncate block">{t.department || "—"}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {t.location || "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs font-medium text-gray-800">{fmtCurrency(t.expected_salary)}</span>
                            {hikeAmt !== null && (
                              <span className={`ml-1.5 text-[10px] font-medium ${hikeAmt > 30 ? "text-red-500" : hikeAmt > 15 ? "text-amber-600" : "text-emerald-600"}`}>
                                {hikeAmt > 0 ? `+${hikeAmt}%` : `${hikeAmt}%`}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {fmtDate(t.rt_last_convo) !== "—" ? fmtDate(t.rt_last_convo) : fmtDate(t.date)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={t.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer count */}
            {!loading && filtered.length > 0 && (
              <div className="px-5 py-2 border-t border-gray-200 bg-white shrink-0">
                <span className="text-[11px] text-gray-400">{filtered.length} of {trackers.length} candidates</span>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
