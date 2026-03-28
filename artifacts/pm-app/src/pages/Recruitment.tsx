import { Layout } from "@/components/Layout";
import {
  UserPlus, RefreshCw, Loader2, Search, ChevronDown, ExternalLink, X, DollarSign, MapPin, Briefcase, Building2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERP_URL = "https://erp.wttint.com";

interface RecruitmentTracker {
  name: string;
  date: string;
  company: string | null;
  candidate_name: string;
  qualification: string | null;
  applying_for_the_post: string;
  department: string | null;
  location: string | null;
  existing_salary_per_month: number;
  expected_salary: number;
  status: string;
  rt_telephonic_interview: string | null;
  rt_last_convo: string | null;
  not_suitable_reason: string | null;
  experience_status: string | null;
  candidate_resume: string | null;
  owner: string;
  modified: string;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function fmtCurrency(n: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function StatusPill({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const map: Record<string, string> = {
    "open":           "bg-blue-500 text-white",
    "hold":           "bg-amber-400 text-white",
    "selected":       "bg-emerald-500 text-white",
    "not suitable":   "bg-red-400 text-white",
    "joined":         "bg-teal-500 text-white",
    "offer declined": "bg-orange-400 text-white",
  };
  const cls = map[s] || "bg-gray-200 text-gray-600";
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{status}</span>;
}

export default function Recruitment() {
  const { toast } = useToast();

  const [trackers, setTrackers] = useState<RecruitmentTracker[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [viewRecord, setViewRecord] = useState<RecruitmentTracker | null>(null);

  const loadTrackers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (deptFilter)   params.set("department", deptFilter);
      const r = await fetch(`${BASE}/api/hrms/recruitment?${params}`);
      if (!r.ok) throw new Error(await r.text());
      setTrackers(await r.json());
    } catch (e) {
      toast({ title: "Failed to load recruitment data", description: String(e), variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast, statusFilter, deptFilter]);

  useEffect(() => { loadTrackers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const depts = [...new Set(trackers.map(t => t.department).filter(Boolean) as string[])].sort();

  const filtered = trackers.filter(t =>
    (!search     || t.candidate_name.toLowerCase().includes(search.toLowerCase()) || t.applying_for_the_post.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || t.status.toLowerCase() === statusFilter.toLowerCase()) &&
    (!deptFilter   || t.department === deptFilter)
  );

  const statuses = [...new Set(trackers.map(t => t.status).filter(Boolean))].sort();

  const selectedCount = trackers.filter(t => t.status === "Selected").length;
  const openCount     = trackers.filter(t => t.status === "Open").length;

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <UserPlus className="w-4 h-4 text-blue-500 shrink-0" />
            <h1 className="text-sm font-bold text-gray-900">Recruitment Tracker</h1>
            <span className="text-xs text-gray-400 ml-1">Candidate Pipeline — ERPNext</span>
          </div>
          <a href={`${ERP_URL}/app/recruitment-tracker`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> ERPNext
          </a>
          <button onClick={loadTrackers} disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 pt-3 pb-0 flex gap-2 shrink-0 flex-wrap">
          {[
            { label: "Total Candidates", value: trackers.length,  color: "bg-blue-500" },
            { label: "Open",             value: openCount,         color: "bg-indigo-400" },
            { label: "Selected",         value: selectedCount,     color: "bg-emerald-500" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className={`w-2 h-2 rounded-full ${s.color} shrink-0`} />
              <span className="text-xs font-bold text-gray-700">{s.value}</span>
              <span className="text-[10px] text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="px-6 pt-3 pb-2 flex items-center gap-3 shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search candidate, position…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
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

        {/* Content */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          <div className={`flex-1 overflow-y-auto px-6 pb-6 pt-2 ${viewRecord ? "hidden md:block" : ""}`}>
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-sm text-gray-400">No recruitment records found</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 w-8">#</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Candidate</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Position</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Department</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Location</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Current Salary</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Expected</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t, i) => (
                      <tr key={t.name}
                        onClick={() => setViewRecord(viewRecord?.name === t.name ? null : t)}
                        className={`border-b border-gray-50 hover:bg-indigo-50/40 transition-colors cursor-pointer ${
                          viewRecord?.name === t.name ? "bg-indigo-50 border-l-2 border-l-indigo-400" : i % 2 === 1 ? "bg-gray-50/20" : "bg-white"
                        }`}>
                        <td className="px-4 py-2.5 text-[10px] text-gray-400 font-mono">{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <p className="text-xs font-semibold text-gray-800 leading-tight">{t.candidate_name}</p>
                          {t.qualification && <p className="text-[10px] text-gray-400">{t.qualification}</p>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs font-medium text-indigo-600">{t.applying_for_the_post}</span>
                        </td>
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
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-gray-600">{fmtCurrency(t.existing_salary_per_month)}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs font-medium text-emerald-600">{fmtCurrency(t.expected_salary)}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-gray-500">{fmtDate(t.date)}</span>
                        </td>
                        <td className="px-3 py-2.5"><StatusPill status={t.status} /></td>
                        <td className="px-3 py-2.5">
                          <a href={`${ERP_URL}/app/recruitment-tracker/${t.name}`} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
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

          {/* Detail Panel */}
          {viewRecord && (
            <div className="w-80 shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-700">Candidate Details</span>
                <button onClick={() => setViewRecord(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 px-4 py-4 space-y-4">
                {/* Candidate Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {viewRecord.candidate_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{viewRecord.candidate_name}</p>
                    {viewRecord.qualification && <p className="text-xs text-gray-500">{viewRecord.qualification}</p>}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <StatusPill status={viewRecord.status} />
                  <a href={`${ERP_URL}/app/recruitment-tracker/${viewRecord.name}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-semibold text-indigo-500 hover:text-indigo-700">
                    <ExternalLink className="w-3 h-3" /> Open in ERPNext
                  </a>
                </div>

                {/* Details grid */}
                {[
                  { label: "Position",    value: viewRecord.applying_for_the_post, icon: Briefcase },
                  { label: "Department",  value: viewRecord.department,             icon: Building2 },
                  { label: "Location",    value: viewRecord.location,               icon: MapPin },
                  { label: "Date",        value: fmtDate(viewRecord.date),          icon: null },
                  { label: "Company",     value: viewRecord.company,                icon: null },
                ].map(row => row.value ? (
                  <div key={row.label} className="flex items-start gap-2">
                    {row.icon && <row.icon className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">{row.label}</p>
                      <p className="text-xs text-gray-700">{row.value}</p>
                    </div>
                  </div>
                ) : null)}

                {/* Salary */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Salary
                  </p>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-gray-400">Current</span>
                    <span className="text-xs font-semibold text-gray-700">{fmtCurrency(viewRecord.existing_salary_per_month)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-gray-400">Expected</span>
                    <span className="text-xs font-semibold text-emerald-600">{fmtCurrency(viewRecord.expected_salary)}</span>
                  </div>
                </div>

                {/* Experience / Interview */}
                {viewRecord.experience_status && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Experience</p>
                    <p className="text-xs text-gray-600">{viewRecord.experience_status}</p>
                  </div>
                )}
                {viewRecord.rt_telephonic_interview && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Telephonic Interview</p>
                    <p className="text-xs text-gray-600">{viewRecord.rt_telephonic_interview}</p>
                  </div>
                )}
                {viewRecord.rt_last_convo && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Last Conversation</p>
                    <p className="text-xs text-gray-600">{fmtDate(viewRecord.rt_last_convo)}</p>
                  </div>
                )}
                {viewRecord.not_suitable_reason && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-red-500 uppercase tracking-widest mb-0.5">Not Suitable Reason</p>
                    <p className="text-xs text-red-700">{viewRecord.not_suitable_reason}</p>
                  </div>
                )}
                {viewRecord.candidate_resume && (
                  <a href={`${ERP_URL}${viewRecord.candidate_resume}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                    <ExternalLink className="w-3.5 h-3.5" /> View Resume
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
