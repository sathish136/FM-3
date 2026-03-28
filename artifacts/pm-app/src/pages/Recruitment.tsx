import { Layout } from "@/components/Layout";
import {
  UserPlus, RefreshCw, Loader2, Search, ChevronDown, ExternalLink,
  ArrowLeft, DollarSign, MapPin, Briefcase, Building2, Phone,
  Calendar, Clock, User, FileText, MessageSquare, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERP_URL = "https://erp.wttint.com";

interface Followup {
  name: string;
  date: string;
  time: string;
  end_time: string | null;
  employee: string;
  employee_name: string;
  mode_of_communication: string;
  conversation: string;
  next_followup: string | null;
}

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
  telephonic_interview_commands: string | null;
  rt_last_convo: string | null;
  not_suitable_reason: string | null;
  experience_status: string | null;
  candidate_resume: string | null;
  owner: string;
  modified: string;
  followup_table?: Followup[];
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function fmtTime(t: string | null) {
  if (!t) return "";
  try {
    const parts = t.split(":");
    const h = parseInt(parts[0]);
    const m = parts[1] || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m} ${ampm}`;
  } catch { return t; }
}

function fmtCurrency(n: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function fmtDateTime(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return d; }
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
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{status}</span>;
}

function CommIcon({ mode }: { mode: string }) {
  const m = (mode || "").toLowerCase();
  if (m.includes("phone") || m.includes("call")) return <Phone className="w-3.5 h-3.5" />;
  if (m.includes("email")) return <FileText className="w-3.5 h-3.5" />;
  if (m.includes("meeting") || m.includes("visit")) return <User className="w-3.5 h-3.5" />;
  return <MessageSquare className="w-3.5 h-3.5" />;
}

// ── Detail View ────────────────────────────────────────────────────────────────

function DetailSection({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
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

function FieldRow({ label, value, mono = false, highlight }: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  highlight?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest self-center">{label}</span>
      <span className={`text-xs ${mono ? "font-mono" : "font-medium"} text-gray-800 ${highlight || ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function DetailView({
  record,
  onBack,
}: {
  record: RecruitmentTracker;
  onBack: () => void;
}) {
  const followups = record.followup_table || [];

  return (
    <div className="flex-1 overflow-y-auto bg-[#f1f5f9]">
      {/* Detail Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sticky top-0 z-10">
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-gray-900">{record.candidate_name}</h2>
            <StatusPill status={record.status} />
            <span className="text-xs text-gray-400 font-mono">{record.name}</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {record.applying_for_the_post}
            {record.department ? ` · ${record.department}` : ""}
          </p>
        </div>
        <a href={`${ERP_URL}/app/recruitment-tracker/${record.name}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> Open in ERPNext
        </a>
      </div>

      <div className="px-6 py-5 space-y-4 max-w-5xl mx-auto">

        {/* Candidate Avatar Hero */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
            {record.candidate_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900">{record.candidate_name}</h3>
            {record.qualification && <p className="text-sm text-gray-500 mt-0.5">{record.qualification}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {record.applying_for_the_post && (
                <span className="flex items-center gap-1 text-xs text-indigo-600 font-semibold">
                  <Briefcase className="w-3.5 h-3.5" />{record.applying_for_the_post}
                </span>
              )}
              {record.department && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Building2 className="w-3.5 h-3.5 text-gray-300" />{record.department}
                </span>
              )}
              {record.location && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-gray-300" />{record.location}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <StatusPill status={record.status} />
            <p className="text-[10px] text-gray-400 mt-1">Modified {fmtDate(record.modified)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Basic Info */}
          <DetailSection title="Basic Information" icon={User}>
            <FieldRow label="Candidate Name"    value={record.candidate_name} />
            <FieldRow label="Applied For"       value={record.applying_for_the_post} highlight="text-indigo-600" />
            <FieldRow label="Qualification"     value={record.qualification} />
            <FieldRow label="Department"        value={record.department} />
            <FieldRow label="Location"          value={record.location} />
            <FieldRow label="Company"           value={record.company} />
            <FieldRow label="Application Date"  value={fmtDate(record.date)} />
            <FieldRow label="Status"            value={<StatusPill status={record.status} />} />
            <FieldRow label="Submitted By"      value={record.owner} mono />
          </DetailSection>

          {/* Salary */}
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
                  Hike expectation:{" "}
                  <span className="font-bold text-gray-600">
                    {Math.round(((record.expected_salary - record.existing_salary_per_month) / record.existing_salary_per_month) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </DetailSection>
        </div>

        {/* Interview & Evaluation */}
        <DetailSection title="Interview & Evaluation" icon={CheckCircle2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <FieldRow label="Experience Status"          value={record.experience_status} />
            <FieldRow label="Telephonic Interview"       value={record.rt_telephonic_interview} />
            <FieldRow label="Last Conversation Date"     value={fmtDate(record.rt_last_convo)} />
            {record.telephonic_interview_commands && (
              <div className="col-span-2 py-2 border-b border-gray-50">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Interview Comments</p>
                <p className="text-xs text-gray-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 whitespace-pre-wrap">
                  {record.telephonic_interview_commands}
                </p>
              </div>
            )}
            {record.not_suitable_reason && (
              <div className="col-span-2 py-2">
                <p className="text-[11px] font-semibold text-red-500 uppercase tracking-widest mb-1">Not Suitable Reason</p>
                <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2 whitespace-pre-wrap">
                  {record.not_suitable_reason}
                </p>
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

        {/* Call Logs / Follow-up Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Call Logs / Follow-up</span>
            </div>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{followups.length}</span>
          </div>

          {followups.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">No call logs recorded</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {followups.map((f, idx) => (
                <div key={f.name} className="px-5 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-indigo-500">
                        <CommIcon mode={f.mode_of_communication} />
                      </div>
                      {idx < followups.length - 1 && (
                        <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[16px]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-gray-800">{f.employee_name || f.employee}</span>
                        {f.mode_of_communication && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                            <CommIcon mode={f.mode_of_communication} />
                            {f.mode_of_communication}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 ml-auto">
                          <Calendar className="w-3 h-3" />{fmtDate(f.date)}
                          {f.time && <><Clock className="w-3 h-3 ml-1" />{fmtTime(f.time)}{f.end_time ? ` – ${fmtTime(f.end_time)}` : ""}</>}
                        </span>
                      </div>
                      {f.conversation && (
                        <p className="text-xs text-gray-700 bg-gray-50 rounded-xl px-3 py-2 mt-1 whitespace-pre-wrap leading-relaxed">
                          {f.conversation}
                        </p>
                      )}
                      {f.next_followup && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="text-[10px] text-amber-600 font-semibold">
                            Next Follow-up: {fmtDate(f.next_followup)}
                          </span>
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

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Recruitment() {
  const { toast } = useToast();

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
      if (deptFilter)   params.set("department", deptFilter);
      const r = await fetch(`${BASE}/api/hrms/recruitment?${params}`);
      if (!r.ok) throw new Error(await r.text());
      setTrackers(await r.json());
    } catch (e) {
      toast({ title: "Failed to load recruitment data", description: String(e), variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast, statusFilter, deptFilter]);

  useEffect(() => { loadTrackers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const depts   = [...new Set(trackers.map(t => t.department).filter(Boolean) as string[])].sort();
  const statuses = [...new Set(trackers.map(t => t.status).filter(Boolean))].sort();

  const filtered = trackers.filter(t =>
    (!search      || t.candidate_name.toLowerCase().includes(search.toLowerCase()) || t.applying_for_the_post.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || t.status.toLowerCase() === statusFilter.toLowerCase()) &&
    (!deptFilter   || t.department === deptFilter)
  );

  const selectedCount = trackers.filter(t => t.status === "Selected").length;
  const openCount     = trackers.filter(t => t.status === "Open").length;
  const joinedCount   = trackers.filter(t => t.status === "Joined").length;

  // ── List view ──
  const ListView = (
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
            { label: "Joined",           value: joinedCount,       color: "bg-teal-500" },
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

        {/* Table */}
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
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 w-8">#</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Candidate</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Position</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Department</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Location</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Current Salary</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Expected</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Last Convo</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => (
                    <tr key={t.name}
                      onClick={() => openDetail(t.name)}
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
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-gray-500">{fmtDate(t.rt_last_convo)}</span>
                      </td>
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
      </div>
    </Layout>
  );

  // ── Detail view (full page inside Layout) ──
  if (detailLoading) {
    return (
      <Layout>
        <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">
          <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0">
            <button onClick={() => setDetailRecord(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span className="text-xs text-gray-400">Loading candidate details…</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
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

  return ListView;
}
