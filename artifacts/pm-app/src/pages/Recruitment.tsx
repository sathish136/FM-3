import { Layout } from "@/components/Layout";
import {
  UserPlus, RefreshCw, Loader2, Search, ChevronDown, ExternalLink,
  ArrowLeft, DollarSign, MapPin, Briefcase, Building2, Phone,
  Calendar, Clock, User, FileText, MessageSquare, CheckCircle2, AlertCircle,
  Upload, X, Sparkles, Mail, Globe, Award, BookOpen, Star, Zap,
  TrendingUp, TrendingDown, Minus, Target, Shield, AlertTriangle,
  HelpCircle, Lightbulb, BarChart2, Link, Github, Linkedin, ChevronRight,
  FolderOpen, Trophy, MessageCircle, Brain, ArrowUpRight, ArrowRight,
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
  summary?: string; skills?: string[]; technical_skills?: string[]; soft_skills?: string[];
  languages?: { language: string; proficiency: string }[];
  experience?: { company: string; title: string; duration: string; start_year: string; end_year: string; location: string; description: string; achievements: string[] }[];
  education?: { institution: string; degree: string; field: string; year: string; gpa: string }[];
  certifications?: { name: string; issuer: string; year: string }[];
  projects?: { name: string; description: string; technologies: string[] }[];
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
    "open": "bg-blue-500 text-white", "hold": "bg-amber-400 text-white",
    "selected": "bg-emerald-500 text-white", "not suitable": "bg-red-400 text-white",
    "joined": "bg-teal-500 text-white", "offer declined": "bg-orange-400 text-white",
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${map[s] || "bg-gray-200 text-gray-600"}`}>{status}</span>;
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
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowed.includes(f.type) && !f.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Unsupported file", description: "Please upload a PDF or image (JPG, PNG, WEBP).", variant: "destructive" });
      return;
    }
    setFile(f); setResult(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function analyzeResume() {
    if (!file) return;
    setAnalyzing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`${BASE}/api/hrms/resume-analyze`, { method: "POST", body: form });
      if (!r.ok) throw new Error(await r.text());
      setResult(await r.json());
      setActiveSection("overview");
    } catch (e) {
      toast({ title: "Analysis failed", description: String(e), variant: "destructive" });
    } finally { setAnalyzing(false); }
  }

  async function enrichWithLinkedin() {
    if (!result || !linkedinUrl) return;
    setEnriching(true);
    try {
      const companies = (result.resume.experience || []).map(e => e.company).filter(Boolean);
      const r = await fetch(`${BASE}/api/hrms/candidate-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedin_url: linkedinUrl,
          name: result.resume.name,
          companies,
          resume_summary: result.resume.summary,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setResult(prev => prev ? { ...prev, assessment: data.assessment } : prev);
      toast({ title: "LinkedIn enrichment complete", description: data.linkedin_fetched ? "Profile data fetched and analyzed" : "AI analysis updated based on profile URL" });
    } catch (e) {
      toast({ title: "Enrichment failed", description: String(e), variant: "destructive" });
    } finally { setEnriching(false); }
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
            onClick={() => !file && inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer select-none
              ${dragging ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"}`}
          >
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {file ? (
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
                <p className="text-xs text-indigo-500 mt-3 font-medium">AI will extract all details + photo + deep assessment</p>
              </div>
            )}
          </div>

          {file && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">LinkedIn URL (optional — for deeper analysis)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                    <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/candidate-name"
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white" />
                  </div>
                </div>
              </div>
              <button onClick={analyzeResume} disabled={analyzing}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-sm shadow-lg hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {analyzing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with AI — please wait…</>
                  : <><Sparkles className="w-4 h-4" /> Analyze Resume + Generate Full Assessment</>}
              </button>
              {analyzing && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
                  <p className="text-xs text-indigo-600 font-medium">Extracting data, generating candidate assessment, rating, interview questions…</p>
                </div>
              )}
            </>
          )}
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
          <button onClick={enrichWithLinkedin} disabled={enriching || !linkedinUrl}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
            {enriching ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing…</> : <><Sparkles className="w-3 h-3" /> Re-Analyze</>}
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

function DetailSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <Icon className="w-3.5 h-3.5 text-indigo-500" />
        <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">{title}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function FieldRow({ label, value, mono = false, highlight }: { label: string; value: React.ReactNode; mono?: boolean; highlight?: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest self-center">{label}</span>
      <span className={`text-xs ${mono ? "font-mono" : "font-medium"} text-gray-800 ${highlight || ""}`}>{value || "—"}</span>
    </div>
  );
}

function DetailView({ record, onBack }: { record: RecruitmentTracker; onBack: () => void }) {
  const followups = record.followup_table || [];
  return (
    <div className="flex-1 overflow-y-auto bg-[#f1f5f9]">
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sticky top-0 z-10">
        <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-gray-900">{record.candidate_name}</h2>
            <StatusPill status={record.status} />
            <span className="text-xs text-gray-400 font-mono">{record.name}</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{record.applying_for_the_post}{record.department ? ` · ${record.department}` : ""}</p>
        </div>
        <a href={`${ERP_URL}/app/recruitment-tracker/${record.name}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> Open in ERPNext
        </a>
      </div>
      <div className="px-6 py-5 space-y-4 max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
            {record.candidate_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900">{record.candidate_name}</h3>
            {record.qualification && <p className="text-sm text-gray-500 mt-0.5">{record.qualification}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {record.applying_for_the_post && <span className="flex items-center gap-1 text-xs text-indigo-600 font-semibold"><Briefcase className="w-3.5 h-3.5" />{record.applying_for_the_post}</span>}
              {record.department && <span className="flex items-center gap-1 text-xs text-gray-500"><Building2 className="w-3.5 h-3.5 text-gray-300" />{record.department}</span>}
              {record.location && <span className="flex items-center gap-1 text-xs text-gray-500"><MapPin className="w-3.5 h-3.5 text-gray-300" />{record.location}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <StatusPill status={record.status} />
            <p className="text-[10px] text-gray-400 mt-1">Modified {fmtDate(record.modified)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailSection title="Basic Information" icon={User}>
            <FieldRow label="Candidate Name" value={record.candidate_name} />
            <FieldRow label="Applied For" value={record.applying_for_the_post} highlight="text-indigo-600" />
            <FieldRow label="Qualification" value={record.qualification} />
            <FieldRow label="Department" value={record.department} />
            <FieldRow label="Location" value={record.location} />
            <FieldRow label="Company" value={record.company} />
            <FieldRow label="Application Date" value={fmtDate(record.date)} />
            <FieldRow label="Status" value={<StatusPill status={record.status} />} />
            <FieldRow label="Submitted By" value={record.owner} mono />
          </DetailSection>
          <DetailSection title="Salary Details" icon={DollarSign}>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Current Salary / Month</p>
                  <p className="text-xl font-bold text-gray-800 mt-1">{fmtCurrency(record.existing_salary_per_month)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-gray-200" />
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 flex justify-between items-center border border-emerald-100">
                <div>
                  <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-widest">Expected Salary / Month</p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">{fmtCurrency(record.expected_salary)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-emerald-200" />
              </div>
              {record.existing_salary_per_month && record.expected_salary && (
                <div className="text-center text-xs text-gray-400">
                  Hike expectation: <span className="font-bold text-gray-600">{Math.round(((record.expected_salary - record.existing_salary_per_month) / record.existing_salary_per_month) * 100)}%</span>
                </div>
              )}
            </div>
          </DetailSection>
        </div>
        <DetailSection title="Interview & Evaluation" icon={CheckCircle2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <FieldRow label="Experience Status" value={record.experience_status} />
            <FieldRow label="Telephonic Interview" value={record.rt_telephonic_interview} />
            <FieldRow label="Last Conversation Date" value={fmtDate(record.rt_last_convo)} />
            {record.telephonic_interview_commands && (
              <div className="col-span-2 py-2 border-b border-gray-50">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Interview Comments</p>
                <p className="text-xs text-gray-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 whitespace-pre-wrap">{record.telephonic_interview_commands}</p>
              </div>
            )}
            {record.not_suitable_reason && (
              <div className="col-span-2 py-2">
                <p className="text-[11px] font-semibold text-red-500 uppercase tracking-widest mb-1">Not Suitable Reason</p>
                <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2 whitespace-pre-wrap">{record.not_suitable_reason}</p>
              </div>
            )}
          </div>
          {record.candidate_resume && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <a href={`${ERP_URL}${record.candidate_resume}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                <ExternalLink className="w-3.5 h-3.5" /> View Resume / CV
              </a>
            </div>
          )}
        </DetailSection>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-indigo-500" /><span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Call Logs / Follow-up</span></div>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{followups.length}</span>
          </div>
          {followups.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">No call logs recorded</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {followups.map((f, idx) => (
                <div key={f.name} className="px-5 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-indigo-500"><CommIcon mode={f.mode_of_communication} /></div>
                      {idx < followups.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[16px]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-gray-800">{f.employee_name || f.employee}</span>
                        {f.mode_of_communication && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                            <CommIcon mode={f.mode_of_communication} />{f.mode_of_communication}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 ml-auto">
                          <Calendar className="w-3 h-3" />{fmtDate(f.date)}
                          {f.time && <><Clock className="w-3 h-3 ml-1" />{fmtTime(f.time)}{f.end_time ? ` – ${fmtTime(f.end_time)}` : ""}</>}
                        </span>
                      </div>
                      {f.conversation && <p className="text-xs text-gray-700 bg-gray-50 rounded-xl px-3 py-2 mt-1 whitespace-pre-wrap leading-relaxed">{f.conversation}</p>}
                      {f.next_followup && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="text-[10px] text-amber-600 font-semibold">Next Follow-up: {fmtDate(f.next_followup)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function Recruitment() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"tracker" | "analyze">("tracker");
  const [trackers, setTrackers] = useState<RecruitmentTracker[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [detailRecord, setDetailRecord] = useState<RecruitmentTracker | null>(null);

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
    (!search || t.candidate_name.toLowerCase().includes(search.toLowerCase()) || t.applying_for_the_post.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || t.status.toLowerCase() === statusFilter.toLowerCase()) &&
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
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <UserPlus className="w-4 h-4 text-blue-500 shrink-0" />
            <h1 className="text-sm font-bold text-gray-900">Recruitment</h1>
          </div>
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            <button onClick={() => setTab("tracker")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === "tracker" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              Tracker
            </button>
            <button onClick={() => setTab("analyze")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === "analyze" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <Sparkles className="w-3 h-3" /> Analyze Resume
            </button>
          </div>
          {tab === "tracker" && (
            <>
              <a href={`${ERP_URL}/app/recruitment-tracker`} target="_blank" rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> ERPNext
              </a>
              <button onClick={loadTrackers} disabled={loading} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </>
          )}
        </div>

        {tab === "analyze" && <ResumeAnalyzer />}

        {tab === "tracker" && (
          <>
            <div className="px-6 pt-3 pb-0 flex gap-2 shrink-0 flex-wrap">
              {[
                { label: "Total", value: trackers.length, color: "bg-blue-500" },
                { label: "Open", value: openCount, color: "bg-indigo-400" },
                { label: "Selected", value: selectedCount, color: "bg-emerald-500" },
                { label: "Joined", value: joinedCount, color: "bg-teal-500" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <span className={`w-2 h-2 rounded-full ${s.color} shrink-0`} />
                  <span className="text-xs font-bold text-gray-700">{s.value}</span>
                  <span className="text-[10px] text-gray-400">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="px-6 pt-3 pb-2 flex items-center gap-3 shrink-0 flex-wrap">
              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidate, position…"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              {depts.length > 0 && (
                <div className="relative">
                  <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">All Departments</option>
                    {depts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
              )}
              <div className="relative">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">All Status</option>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0 pt-2">
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-sm text-gray-400">No recruitment records found</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        {["#", "Candidate", "Position", "Department", "Location", "Current Salary", "Expected", "Date", "Last Convo", "Status", ""].map(h => (
                          <th key={h} className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t, i) => (
                        <tr key={t.name} onClick={() => openDetail(t.name)}
                          className={`border-b border-gray-50 hover:bg-indigo-50/60 transition-colors cursor-pointer ${i % 2 === 1 ? "bg-gray-50/20" : "bg-white"}`}>
                          <td className="px-4 py-2.5 text-[10px] text-gray-400 font-mono">{i + 1}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                {t.candidate_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-800 leading-tight">{t.candidate_name}</p>
                                {t.qualification && <p className="text-[10px] text-gray-400">{t.qualification}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5"><span className="text-xs font-medium text-indigo-600">{t.applying_for_the_post}</span></td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              {t.department && <Building2 className="w-3 h-3 text-gray-300 shrink-0" />}
                              <span className="text-xs text-gray-600">{t.department || "—"}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              {t.location && <MapPin className="w-3 h-3 text-gray-300 shrink-0" />}
                              <span className="text-xs text-gray-500">{t.location || "—"}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5"><span className="text-xs text-gray-600">{fmtCurrency(t.existing_salary_per_month)}</span></td>
                          <td className="px-3 py-2.5"><span className="text-xs font-medium text-emerald-600">{fmtCurrency(t.expected_salary)}</span></td>
                          <td className="px-3 py-2.5"><span className="text-xs text-gray-500">{fmtDate(t.date)}</span></td>
                          <td className="px-3 py-2.5"><span className="text-xs text-gray-500">{fmtDate(t.rt_last_convo)}</span></td>
                          <td className="px-3 py-2.5"><StatusPill status={t.status} /></td>
                          <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            <a href={`${ERP_URL}/app/recruitment-tracker/${t.name}`} target="_blank" rel="noopener noreferrer"
                              className="text-gray-300 hover:text-indigo-500 transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
