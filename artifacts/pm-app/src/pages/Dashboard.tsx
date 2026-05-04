import { Layout } from "@/components/Layout";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, ArrowRight, Sparkles,
  ThumbsUp, ThumbsDown, Bell, Star,
  Timer, Cpu, UserCheck, HeartHandshake, Activity,
  CheckCircle, XCircle, Clock, CalendarCheck,
  Megaphone, Target, TrendingUp, MapPin,
  Newspaper, ExternalLink, PhoneCall, ChevronRight, Droplets,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

interface EmpDashData {
  today_first_checkin?: string;
  pending_work_updates?: number;
  present_days_this_month?: number;
  half_day_count?: number;
  absent_days_this_month?: number;
  checkin?: number;
  ot_request_count?: number;
  ot_prior_info_count?: number;
  on_duty_request_count?: number;
  technical_criteria_count?: number;
  behavioural_criteria_count?: number;
  positive_incidents?: number;
  negative_incidents?: number;
  work_updates?: { employee?: string; type_of_work?: string; from_time?: string; to_time?: string; status?: string }[];
  task_points?: number;
  incident_points?: number;
  technical_points?: number;
  behavioral_points?: number;
  reporting_points?: number;
  overall_points?: number;
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  return now;
}
function formatTime(s?: string) {
  if (!s) return "--";
  try { const [h, m] = s.split(":"); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`; }
  catch { return s; }
}
function formatDateTime(iso?: string) {
  if (!iso) return { date: "--", time: "--" };
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };
  } catch { return { date: "--", time: "--" }; }
}

function Skel({ w = "w-full", h = "h-3" }: { w?: string; h?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded ${w} ${h}`} />;
}

export default function Dashboard() {
  const { user } = useAuth();
  const now = useNow();

  const [projects, setProjects] = useState<{ id: string; name: string; status: string; progress?: number }[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [empData, setEmpData] = useState<EmpDashData | null>(null);
  const [empLoading, setEmpLoading] = useState(true);

  const fetchProjects = useCallback(() => {
    if (!user?.email) return;
    setProjectsLoading(true);
    fetch(`${BASE_URL}/api/projects?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setProjects(d); setProjectsLoading(false); })
      .catch(() => setProjectsLoading(false));
  }, [user?.email]);

  const fetchEmpData = useCallback(() => {
    if (!user?.email) return;
    setEmpLoading(true);
    fetch(`${BASE_URL}/api/employee-dashboard?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(d => { setEmpData(d.error ? null : d); setEmpLoading(false); })
      .catch(() => setEmpLoading(false));
  }, [user?.email]);

  useEffect(() => { fetchProjects(); fetchEmpData(); }, [fetchProjects, fetchEmpData]);

  const total     = projects.length;
  const active    = projects.filter(p => p.status === "active").length;
  const planning  = projects.filter(p => p.status === "planning").length;
  const onHold    = projects.filter(p => p.status === "on_hold").length;
  const done      = projects.filter(p => p.status === "completed").length;
  const avgPct    = total ? Math.round(projects.reduce((a, p) => a + (p.progress ?? 0), 0) / total) : 0;
  const recentProjects = [...projects].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0)).slice(0, 6);

  const greeting = (() => { const h = now.getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; })();
  const firstName = user?.full_name ?? "there";
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const weekday = now.toLocaleDateString("en-IN", { weekday: "long" }).toUpperCase();

  const overallPts = empData?.overall_points ?? (
    (empData?.task_points ?? 0) + (empData?.incident_points ?? 0) +
    (empData?.technical_points ?? 0) + (empData?.behavioral_points ?? 0) +
    (empData?.reporting_points ?? 0)
  );
  const positiveInc = empData?.positive_incidents ?? 0;
  const negativeInc = empData?.negative_incidents ?? 0;
  const pendingApproval =
    (empData?.ot_request_count ?? 0) + (empData?.ot_prior_info_count ?? 0) +
    (empData?.on_duty_request_count ?? 0) + (empData?.technical_criteria_count ?? 0) +
    (empData?.behavioural_criteria_count ?? 0);
  const isLoading = projectsLoading || empLoading;
  const isAgent = user?.isAgent === true;

  // ── Agent lead count ──────────────────────────────────────────────────────
  const [agentLeadCount, setAgentLeadCount] = useState(0);
  const [agentLeadLoading, setAgentLeadLoading] = useState(false);
  const [agentLeads, setAgentLeads] = useState<{ name: string; company_name: string; country: string; lead_status: string; city: string; state: string }[]>([]);

  useEffect(() => {
    if (!isAgent || !user?.email) return;
    setAgentLeadLoading(true);
    // Fetch assigned lead IDs
    fetch(`${BASE_URL}/api/agents/${encodeURIComponent(user.email)}/leads`)
      .then(r => r.ok ? r.json() : { lead_ids: [] })
      .then(async ({ lead_ids }: { lead_ids: string[] }) => {
        setAgentLeadCount(lead_ids.length);
        if (lead_ids.length === 0) { setAgentLeads([]); return; }
        // Fetch lead details from open_leads
        const res = await fetch(`${BASE_URL}/api/sales-dashboard/open_leads`);
        const data = res.ok ? await res.json() : { data: [] };
        const all: any[] = data.data ?? [];
        const assigned = all.filter((l: any) => lead_ids.includes(l.name));
        setAgentLeads(assigned.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => setAgentLeadLoading(false));
  }, [isAgent, user?.email]);

  // ── Agent water news ──────────────────────────────────────────────────────
  const [waterNews, setWaterNews] = useState<{ title: string; url: string; source: string; published: string; snippet: string }[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  useEffect(() => {
    if (!isAgent) return;
    if (agentLeadLoading) return;
    const countries = [...new Set(agentLeads.map(l => l.country).filter(Boolean))];
    if (countries.length === 0) return;
    setNewsLoading(true);
    fetch(`${BASE_URL}/api/water-news?countries=${encodeURIComponent(countries.join(","))}`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setWaterNews(d.items ?? []))
      .catch(() => {})
      .finally(() => setNewsLoading(false));
  }, [isAgent, agentLeadLoading, agentLeads]);

  const [, navigate] = useLocation();

  // ── Agent marketing dashboard early return ────────────────────────────────
  if (isAgent) {
    const agentCountries = [...new Set(agentLeads.map(l => l.country).filter(Boolean))];
    return (
      <Layout>
        <div className="h-full overflow-y-auto bg-slate-50">
          <div className="max-w-[1280px] mx-auto p-5 space-y-5">

            {/* ── Header Banner ── */}
            <div className="bg-[#1a3fbd] rounded-xl px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-blue-200 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Droplets className="w-3 h-3" /> FlowMatriX · Marketing Agent Portal
                </p>
                <h1 className="text-2xl font-bold text-white">{greeting}, {firstName}</h1>
                <p className="text-sm text-blue-200 mt-0.5">{dateStr}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-white text-[11px] font-medium">
                  <UserCheck className="w-3 h-3" /> Marketing Agent
                </span>
              </div>
              <div className="text-right shrink-0 ml-6">
                <p className="text-4xl font-bold text-white tabular-nums">{timeStr}</p>
                <p className="text-[10px] text-blue-300 uppercase tracking-widest mt-1">{weekday}</p>
              </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Assigned Leads", value: agentLeadLoading ? "—" : String(agentLeadCount), icon: Target,     iconBg: "bg-blue-100",   iconColor: "text-blue-700",   accent: "border-l-blue-500"  },
                { label: "My Dashboard",   value: "Marketing",                                      icon: Megaphone,  iconBg: "bg-emerald-100", iconColor: "text-emerald-700", accent: "border-l-emerald-500", link: "/marketing"            },
                { label: "All Leads",      value: "View All",                                       icon: TrendingUp, iconBg: "bg-amber-100",   iconColor: "text-amber-700",  accent: "border-l-amber-500",  link: "/leads"                },
                { label: "Call Logs",      value: "Marketing",                                      icon: PhoneCall,  iconBg: "bg-rose-100",    iconColor: "text-rose-700",   accent: "border-l-rose-500",   link: "/ip-call-logs/marketing"},
              ].map(card => {
                const inner = (
                  <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${card.accent} p-4 flex items-center gap-4 ${card.link ? "hover:shadow-md transition-shadow cursor-pointer" : ""}`}>
                    <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}>
                      <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{card.label}</p>
                      <p className="text-[17px] font-bold text-slate-800 mt-0.5 truncate">{card.value}</p>
                    </div>
                  </div>
                );
                return card.link
                  ? <Link key={card.label} href={card.link}>{inner}</Link>
                  : <div key={card.label}>{inner}</div>;
              })}
            </div>

            {/* ── Two-column: Leads + News ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">

              {/* Assigned Leads */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Target className="w-4 h-4 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-800">My Assigned Leads</p>
                      <p className="text-[11px] text-slate-400">{agentLeadCount} lead{agentLeadCount !== 1 ? "s" : ""} assigned to you</p>
                    </div>
                  </div>
                  <Link href="/leads" className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {agentLeadLoading ? (
                  <div className="p-5 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse h-14 bg-slate-50 rounded-lg" />
                    ))}
                  </div>
                ) : agentLeads.length === 0 ? (
                  <div className="py-14 flex flex-col items-center text-slate-400">
                    <Target className="w-8 h-8 mb-2 text-slate-200" />
                    <p className="text-sm font-medium">No leads assigned yet</p>
                    <p className="text-xs mt-1 text-slate-300">Contact your admin.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {agentLeads.map((lead, idx) => (
                      <button
                        key={lead.name}
                        onClick={() => navigate(`/sales-dashboard/lead/${encodeURIComponent(lead.name)}`)}
                        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group text-left"
                      >
                        <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                            {lead.company_name || lead.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{lead.name}</p>
                        </div>
                        {(lead.city || lead.state || lead.country) && (
                          <span className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                            <MapPin className="w-3 h-3" />{lead.city || lead.state || lead.country}
                          </span>
                        )}
                        {lead.lead_status && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border shrink-0 ${
                            lead.lead_status === "Open"        ? "bg-blue-50 text-blue-700 border-blue-200"         :
                            lead.lead_status === "Converted"   ? "bg-emerald-50 text-emerald-700 border-emerald-200":
                            lead.lead_status === "Opportunity" ? "bg-amber-50 text-amber-700 border-amber-200"      :
                            "bg-slate-50 text-slate-500 border-slate-200"
                          }`}>{lead.lead_status}</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Water Industry News */}
              <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden" style={{ maxHeight: 460 }}>
                <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                    <Droplets className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800">Water Industry News</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {agentCountries.length > 0 ? agentCountries.join(", ") : "Global updates"}
                    </p>
                  </div>
                  {newsLoading && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {newsLoading ? (
                    <div className="p-4 space-y-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="animate-pulse space-y-1.5">
                          <div className="h-3 bg-slate-100 rounded w-full" />
                          <div className="h-2.5 bg-slate-100 rounded w-4/5" />
                          <div className="h-2 bg-slate-50 rounded w-2/5" />
                        </div>
                      ))}
                    </div>
                  ) : waterNews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                      <Newspaper className="w-8 h-8 mb-2 text-slate-200" />
                      <p className="text-xs font-medium">No news available</p>
                      <p className="text-[10px] mt-0.5 text-slate-300">Loads once leads are fetched</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {waterNews.map((item, i) => (
                        <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                          className="flex gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors group">
                          <div className="w-1.5 rounded-sm bg-sky-400 shrink-0 mt-0.5" style={{ minHeight: 36 }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-medium text-slate-700 group-hover:text-blue-700 leading-snug line-clamp-2 transition-colors">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {item.source && (
                                <span className="text-[10px] text-slate-500 truncate max-w-[140px]">{item.source}</span>
                              )}
                              {item.published && (
                                <span className="text-[10px] text-slate-400 shrink-0">{item.published}</span>
                              )}
                              <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-blue-400 ml-auto shrink-0 transition-colors" />
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full overflow-y-auto" style={{ background: "#f5f6fa" }}>
        <div className="max-w-[1600px] mx-auto p-4 space-y-4">

          {/* ── TOP ROW: Banner + AI Card ── */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-4">

            {/* Banner */}
            <div className="rounded-xl px-6 py-5 flex flex-col justify-between relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 60%, #dbeafe 100%)", minHeight: 140 }}>
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 pointer-events-none"
                style={{ background: "radial-gradient(circle, #a5b4fc, transparent)", transform: "translate(30%, -30%)" }} />
              <div>
                <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Star className="w-3 h-3" /> FlowMatriX · WTT International India
                </p>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">{greeting}, {firstName}!</h1>
                <p className="text-sm text-slate-500 mt-1">{dateStr}</p>
                {empData?.today_first_checkin && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">Checked in at {formatTime(empData.today_first_checkin)}</p>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <button onClick={() => { fetchProjects(); fetchEmpData(); }} disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/70 hover:bg-white border border-white/80 text-slate-600 transition-all disabled:opacity-50 shadow-sm">
                  <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} /> Refresh
                </button>
                <div className="text-right">
                  <p className="text-3xl font-bold text-slate-800 tabular-nums leading-none">{timeStr}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{weekday}</p>
                </div>
              </div>
            </div>

            {/* AI Assistant */}
            <div className="rounded-xl p-4 flex flex-col" style={{ background: "#1e1b4b" }}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">AI Assistant</p>
                  <p className="text-[10px] text-indigo-400">Context-aware · Always ready</p>
                </div>
              </div>
              <p className="text-[11px] text-indigo-300/70 mb-3">Ask about projects, HR, procurement, drawings, and more.</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {["Project status?", "Pending tasks?", "Leave balance?", "Team today?"].map(q => (
                  <span key={q} className="text-[10px] px-2 py-1 rounded-md border border-indigo-500/30 text-indigo-300 bg-indigo-500/10 cursor-pointer hover:bg-indigo-500/20 transition-colors">{q}</span>
                ))}
              </div>
              <button className="mt-auto w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                onClick={() => (document.querySelector("[data-ai-trigger]") as HTMLElement)?.click()}>
                <Sparkles className="w-3.5 h-3.5" /> Ask AI
              </button>
            </div>
          </div>

          {/* ── MAIN 3-COLUMN GRID ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* LEFT: Performance Overview */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Performance Overview</p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Overall Points</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-slate-800 tabular-nums">{empLoading ? "…" : overallPts}</span>
                  <span className="text-sm text-slate-400 font-medium">/60</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100,(overallPts/60)*100)}%`, background: "linear-gradient(90deg,#8b5cf6,#a78bfa)" }} />
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: "Task",       pts: empData?.task_points,       max: 25, color: "#3b82f6" },
                    { label: "Incident",   pts: empData?.incident_points,   max: 5,  color: "#10b981" },
                    { label: "Technical",  pts: empData?.technical_points,  max: 10, color: "#f59e0b" },
                    { label: "Behavioral", pts: empData?.behavioral_points, max: 10, color: "#8b5cf6" },
                    { label: "Reporting",  pts: empData?.reporting_points,  max: 10, color: "#06b6d4" },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[11px] text-slate-500">{s.label}</span>
                        <span className="text-[11px] font-semibold tabular-nums" style={{ color: s.color }}>
                          {empLoading ? "--" : (s.pts ?? "--")}<span className="text-slate-300 font-normal">/{s.max}</span>
                        </span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${s.pts != null ? Math.min(100,(s.pts/s.max)*100) : 0}%`, backgroundColor: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER: Attendance + Task Pending + Incidents */}
            <div className="space-y-4">

              {/* Attendance */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">
                      <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Attendance</p>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">This Month</span>
                </div>
                <div className="grid grid-cols-4">
                  {[
                    { label: "Present",  val: empData?.present_days_this_month, icon: CheckCircle, color: "#22c55e", bg: "#f0fdf4" },
                    { label: "Half Day", val: empData?.half_day_count,           icon: Clock,       color: "#f59e0b", bg: "#fffbeb" },
                    { label: "Absent",   val: empData?.absent_days_this_month,   icon: XCircle,     color: "#ef4444", bg: "#fef2f2" },
                    { label: "Late",     val: empData?.checkin,                  icon: Clock,       color: "#f97316", bg: "#fff7ed" },
                  ].map((a, i) => (
                    <div key={a.label} className={`py-4 text-center ${i < 3 ? "border-r border-slate-50" : ""}`}>
                      <div className="flex justify-center mb-1.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: a.bg }}>
                          <a.icon className="w-4 h-4" style={{ color: a.color }} />
                        </div>
                      </div>
                      <p className="text-xl font-bold tabular-nums" style={{ color: a.color }}>
                        {empLoading ? "…" : a.val ?? "0"}
                      </p>
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{a.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Pending */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-teal-100 flex items-center justify-center">
                      <Activity className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Task Pending</p>
                  </div>
                  <Link href="/tasks" className="text-[10px] font-semibold text-teal-600 flex items-center gap-0.5 hover:underline">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="px-4 py-4">
                  <p className="text-5xl font-bold tabular-nums" style={{ color: "#14b8a6" }}>
                    {empLoading ? <span className="text-2xl text-slate-200">…</span> : empData?.pending_work_updates ?? "0"}
                  </p>
                  <Link href="/tasks" className="text-[11px] text-slate-400 mt-1.5 block hover:text-slate-600 transition-colors">
                    Click to view all pending →
                  </Link>
                </div>
              </div>

              {/* Incidents */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Incidents</p>
                </div>
                <div className="grid grid-cols-2">
                  <div className="px-4 py-4 border-r border-slate-50 flex items-center gap-3" style={{ background: "#f0fdf4" }}>
                    <ThumbsUp className="w-5 h-5 shrink-0" style={{ color: "#22c55e" }} />
                    <div>
                      <p className="text-2xl font-bold tabular-nums" style={{ color: "#22c55e" }}>
                        {empLoading ? "…" : positiveInc}
                      </p>
                      <p className="text-[10px] font-semibold text-green-500 uppercase tracking-wide">Positive</p>
                    </div>
                  </div>
                  <div className="px-4 py-4 flex items-center gap-3" style={{ background: "#fef2f2" }}>
                    <ThumbsDown className="w-5 h-5 shrink-0" style={{ color: "#ef4444" }} />
                    <div>
                      <p className="text-2xl font-bold tabular-nums" style={{ color: "#ef4444" }}>
                        {empLoading ? "…" : negativeInc}
                      </p>
                      <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">Negative</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Workflow & Reminders */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Workflow &amp; Reminders</p>
              </div>
              <div className="divide-y divide-slate-50">
                {[
                  { label: "Pending Approval",     value: pendingApproval,                           icon: Bell,          color: "#f59e0b" },
                  { label: "On Duty",              value: empData?.on_duty_request_count,             icon: UserCheck,     color: "#10b981" },
                  { label: "Technical",            value: empData?.technical_criteria_count,          icon: Cpu,           color: "#f59e0b" },
                  { label: "Behavioural Criteria", value: empData?.behavioural_criteria_count,        icon: HeartHandshake,color: "#8b5cf6" },
                  { label: "OT Request",           value: empData?.ot_request_count,                 icon: Timer,         color: "#f97316" },
                  { label: "OT Prior Info",        value: empData?.ot_prior_info_count,              icon: Activity,      color: "#06b6d4" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "18" }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <p className="text-sm text-slate-600 flex-1">{label}</p>
                    <p className="text-sm font-bold tabular-nums" style={{ color }}>
                      {empLoading ? "…" : value ?? "0"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── BOTTOM ROW: Recent Tasks + Projects Overview ── */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-4">

            {/* Recent Tasks — table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                <p className="text-sm font-bold text-slate-800">Recent Tasks</p>
                <Link href="/tasks" className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 hover:underline">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {empLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skel key={i} h="h-8" />)}
                </div>
              ) : !empData?.work_updates?.length ? (
                <div className="py-10 text-center text-slate-400 text-sm">No recent tasks</div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-50">
                      {["Employee", "Task", "From", "To", "Status"].map(h => (
                        <th key={h} className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-4 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {empData.work_updates.slice(0, 8).map((t, i) => {
                      const from = formatDateTime(t.from_time);
                      const to   = formatDateTime(t.to_time);
                      const s = (t.status || "").toLowerCase();
                      const sc = s === "completed" ? { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" }
                               : s === "in progress" ? { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" }
                               : { color: "#b45309", bg: "#fffbeb", border: "#fde68a" };
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-slate-700 text-xs whitespace-nowrap">{t.employee || "—"}</td>
                          <td className="px-4 py-2.5 text-slate-600 text-xs max-w-[200px] truncate">{t.type_of_work || "—"}</td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">{from.date} {from.time}</td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">{to.date} {to.time}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                              style={{ color: sc.color, backgroundColor: sc.bg, borderColor: sc.border }}>
                              {t.status || "Pending"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </div>

            {/* Projects Overview */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                <p className="text-sm font-bold text-slate-800">Projects Overview</p>
                <Link href="/projects" className="text-[10px] font-semibold text-blue-600 flex items-center gap-0.5 hover:underline">
                  All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {/* Stats grid */}
              <div className="grid grid-cols-3 border-b border-slate-50">
                {[
                  { label: "Active",   value: active,   color: "#3b82f6" },
                  { label: "Planning", value: planning, color: "#f59e0b" },
                  { label: "On Hold",  value: onHold,   color: "#f97316" },
                  { label: "Done",     value: done,     color: "#22c55e" },
                  { label: "Total",    value: total,    color: "#64748b" },
                  { label: "Avg %",    value: `${avgPct}%`, color: "#8b5cf6" },
                ].map((s, i) => (
                  <div key={s.label} className={`py-3 text-center ${i % 3 !== 2 ? "border-r border-slate-50" : ""} ${i < 3 ? "border-b border-slate-50" : ""}`}>
                    <p className="text-lg font-bold tabular-nums" style={{ color: s.color }}>
                      {projectsLoading ? "…" : s.value}
                    </p>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Project list */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                {projectsLoading ? (
                  <div className="p-3 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skel key={i} h="h-6" />)}</div>
                ) : recentProjects.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">No projects</div>
                ) : recentProjects.map(p => {
                  const pct = Math.min(100, p.progress ?? 0);
                  const color = p.status === "completed" ? "#22c55e" : p.status === "active" ? "#3b82f6" : p.status === "on_hold" ? "#f97316" : "#f59e0b";
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <p className="text-xs font-medium text-slate-700 flex-1 truncate">{p.name}</p>
                      <div className="flex items-center gap-1.5 shrink-0 w-20">
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
