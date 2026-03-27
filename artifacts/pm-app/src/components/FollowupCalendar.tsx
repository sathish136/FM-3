import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Calendar, RefreshCw,
  Clock, Building2, Phone, Mail, Download, Search, List, Filter, X, ArrowUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

const STATUS_DOT: Record<string, string> = {
  Open:              "bg-blue-500",
  Converted:         "bg-emerald-500",
  Opportunity:       "bg-violet-500",
  Quotation:         "bg-amber-500",
  Lead:              "bg-sky-500",
  Replied:           "bg-teal-500",
  Closed:            "bg-gray-400",
  "Lost Quotation":  "bg-red-500",
  "Do Not Contact":  "bg-rose-500",
};

const STATUS_TEXT: Record<string, string> = {
  Open:              "text-blue-700",
  Converted:         "text-emerald-700",
  Opportunity:       "text-violet-700",
  Quotation:         "text-amber-700",
  Lead:              "text-sky-700",
  Replied:           "text-teal-700",
  Closed:            "text-gray-500",
  "Lost Quotation":  "text-red-700",
  "Do Not Contact":  "text-rose-700",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];

function parseDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  // Handle DD/MM/YY format (e.g. "11/03/26")
  const slashShort = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (slashShort) {
    const year = parseInt(slashShort[3]) + 2000;
    const d = new Date(year, parseInt(slashShort[2]) - 1, parseInt(slashShort[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  // Handle DD/MM/YYYY format (e.g. "11/03/2026")
  const slashLong = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashLong) {
    const d = new Date(parseInt(slashLong[3]), parseInt(slashLong[2]) - 1, parseInt(slashLong[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  // Handle DD-MM-YYYY format (e.g. "27-03-2026")
  const dashLong = val.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashLong) {
    const d = new Date(parseInt(dashLong[3]), parseInt(dashLong[2]) - 1, parseInt(dashLong[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  // Fallback: try standard parsing (YYYY-MM-DD etc.)
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d} ${MONTHS[parseInt(m) - 1]} ${y}`;
}

interface FollowupItem {
  lead_name?: string;
  company_name?: string;
  contact_date?: string;
  next_contact?: string;
  follow_up_date?: string;
  scheduled_date?: string;
  status?: string;
  source?: string;
  mobile_no?: string;
  email_id?: string;
  country?: string;
  city?: string;
  [key: string]: any;
}

export function FollowupCalendar() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(dateKey(today));
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const { data: followupData, isLoading: followupLoading, refetch } = useQuery({
    queryKey: ["followup-report"],
    queryFn: async () => {
      const r = await fetch("/api/marketing/followup-report");
      return r.json();
    },
    staleTime: 60_000,
  });

  const { data: proposalData, isLoading: proposalLoading } = useQuery({
    queryKey: ["proposal-request"],
    queryFn: async () => {
      const r = await fetch("/api/marketing/proposal-request");
      return r.json();
    },
    staleTime: 60_000,
  });

  const isLoading = followupLoading || proposalLoading;

  const allItems: (FollowupItem & { _dateKey: string; _type: "followup" | "proposal" })[] = useMemo(() => {
    const result: (FollowupItem & { _dateKey: string; _type: "followup" | "proposal" })[] = [];

    const followups: any[] = Array.isArray(followupData?.message)
      ? followupData.message
      : Array.isArray(followupData) ? followupData : [];

    for (const item of followups) {
      // ERP returns: next_follow_up_date (DD/MM/YY), organization, contact_person, contact_details, location, followed_by
      const rawDate = item.next_follow_up_date || item.convo_date || item.contact_date || item.follow_up_date || item.scheduled_date || item.creation;
      const d = parseDate(rawDate);
      if (d) result.push({
        ...item,
        lead_name: item.contact_person || item.lead || item.lead_name,
        company_name: item.organization || item.company_name,
        contact_date: item.convo_date,
        next_contact: item.next_follow_up_date,
        follow_up_date: item.next_follow_up_date,
        source: item.followed_by || item.source,
        mobile_no: item.contact_details || item.mobile_no,
        country: item.location || item.country,
        _dateKey: dateKey(d),
        _type: "followup" as const,
      });
    }

    const proposals: any[] = Array.isArray(proposalData?.message)
      ? proposalData.message
      : Array.isArray(proposalData) ? proposalData : [];

    for (const item of proposals) {
      // ERP returns: date (DD-MM-YYYY), raised_date, company_name, proposal_status, type_of_proposal, name
      const rawDate = item.date || item.raised_date || item.contact_date || item.scheduled_date || item.creation;
      const d = parseDate(rawDate);
      if (d) result.push({
        ...item,
        lead_name: item.name || item.lead_name,
        company_name: item.company_name,
        status: item.proposal_status || item.status,
        source: item.type_of_proposal || item.source,
        _dateKey: dateKey(d),
        _type: "proposal" as const,
      });
    }

    return result;
  }, [followupData, proposalData]);

  const byDate = useMemo(() => {
    const map: Record<string, typeof allItems> = {};
    for (const item of allItems) {
      if (!map[item._dateKey]) map[item._dateKey] = [];
      map[item._dateKey].push(item);
    }
    return map;
  }, [allItems]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const todayKey = dateKey(today);

  const selectedItems = selectedDay ? (byDate[selectedDay] ?? []) : [];

  const totalFollowups = allItems.filter(i => i._type === "followup").length;
  const totalProposals = allItems.filter(i => i._type === "proposal").length;
  const overdueCount = allItems.filter(i => i._dateKey < todayKey).length;
  const todayCount = allItems.filter(i => i._dateKey === todayKey).length;

  const statusOptions = useMemo(() =>
    Array.from(new Set(allItems.map(i => i.status).filter(Boolean))).sort() as string[],
    [allItems]);

  const sourceOptions = useMemo(() =>
    Array.from(new Set(allItems.map(i => i.source).filter(Boolean))).sort() as string[],
    [allItems]);

  const activeFilters = [filterType, filterStatus, filterSource].filter(Boolean).length;

  const listItems = useMemo(() => allItems
    .filter(i => {
      const q = search.toLowerCase();
      const matchSearch = !q || [i.lead_name, i.company_name, i.status, i.source, i.country].some(v =>
        String(v ?? "").toLowerCase().includes(q)
      );
      const matchType   = !filterType   || i._type === filterType;
      const matchStatus = !filterStatus || i.status === filterStatus;
      const matchSource = !filterSource || i.source === filterSource;
      return matchSearch && matchType && matchStatus && matchSource;
    })
    .sort((a, b) => sortDir === "desc"
      ? b._dateKey.localeCompare(a._dateKey)
      : a._dateKey.localeCompare(b._dateKey)
    ), [allItems, search, filterType, filterStatus, filterSource, sortDir]);

  function exportData() {
    const rows = listItems.map(i => ({
      Type: i._type, Date: i._dateKey, Lead: i.lead_name || "",
      Company: i.company_name || "", Status: i.status || "",
      Source: i.source || "", Country: i.country || "",
      City: i.city || "", Mobile: i.mobile_no || "", Email: i.email_id || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Followups");
    XLSX.writeFile(wb, "Followup_Calendar.xlsx");
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Followup Calendar</h2>
          <p className="text-xs text-gray-400 mt-0.5">Scheduled follow-ups and proposal requests</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-px bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setView("calendar")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                view === "calendar" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
              <Calendar className="w-3.5 h-3.5" /> Calendar
            </button>
            <button onClick={() => setView("list")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                view === "list" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors font-semibold shadow-sm">
            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} /> Refresh
          </button>
          <button onClick={exportData}
            className="flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors font-semibold shadow-sm">
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      {/* KPI Strip — clean, no gradients */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Followups", value: totalFollowups, accent: "border-l-blue-500",   num: "text-blue-700" },
          { label: "Proposals",       value: totalProposals, accent: "border-l-violet-500", num: "text-violet-700" },
          { label: "Today",           value: todayCount,     accent: "border-l-indigo-500", num: "text-indigo-700" },
          { label: "Overdue",         value: overdueCount,   accent: "border-l-red-500",    num: "text-red-600" },
        ].map(kpi => (
          <div key={kpi.label} className={cn("bg-white border border-gray-200 border-l-4 rounded-xl px-4 py-3 shadow-sm", kpi.accent)}>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{kpi.label}</p>
            <p className={cn("text-2xl font-black mt-0.5 tabular-nums", kpi.num)}>
              {isLoading ? <span className="inline-block w-8 h-6 bg-gray-100 rounded animate-pulse" /> : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {view === "calendar" ? (
        <div className="flex gap-3">
          {/* Calendar */}
          <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              <span className="font-bold text-gray-800 text-sm">{MONTHS[month]} {year}</span>
              <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/60">
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }).map((_, idx) => {
                const dayNum = idx - firstDay + 1;
                const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
                const cellDate = new Date(year, month, dayNum);
                const ck = isCurrentMonth ? dateKey(cellDate) : "";
                const events = ck ? (byDate[ck] ?? []) : [];
                const isToday = ck === todayKey;
                const isSelected = ck === selectedDay;
                const isPast = ck && ck < todayKey;
                const hasEvents = events.length > 0;

                return (
                  <div
                    key={idx}
                    onClick={() => isCurrentMonth && setSelectedDay(isSelected ? null : ck)}
                    className={cn(
                      "min-h-[68px] p-1.5 border-b border-r border-gray-100 transition-colors",
                      isCurrentMonth ? "cursor-pointer" : "bg-gray-50/40",
                      isCurrentMonth && !isSelected && "hover:bg-gray-50",
                      isSelected && "bg-indigo-50/60 ring-1 ring-inset ring-indigo-200",
                    )}
                  >
                    {isCurrentMonth && (
                      <>
                        <div className={cn(
                          "w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-semibold mb-1",
                          isToday ? "bg-indigo-600 text-white" :
                          isPast ? "text-gray-300" : "text-gray-600"
                        )}>
                          {dayNum}
                        </div>
                        {events.slice(0, 2).map((ev, i) => (
                          <div key={i} className="flex items-center gap-1 mb-0.5">
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                              ev._type === "proposal" ? "bg-violet-400" : (STATUS_DOT[ev.status ?? ""] || "bg-gray-300")
                            )} />
                            <span className="text-[9px] text-gray-500 truncate leading-tight">
                              {ev.company_name || ev.lead_name || "Lead"}
                            </span>
                          </div>
                        ))}
                        {events.length > 2 && (
                          <span className="text-[9px] text-gray-400 pl-2.5">+{events.length - 2}</span>
                        )}
                        {hasEvents && events.length <= 2 && events.length > 0 && (
                          <div className="w-full h-px bg-indigo-100 mt-0.5 rounded" />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected day panel */}
          <div className="w-72 shrink-0 flex flex-col gap-2">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1">
              {selectedDay ? (
                <>
                  <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{formatDisplayDate(selectedDay)}</p>
                      <p className="text-[11px] text-gray-400">{selectedItems.length} scheduled</p>
                    </div>
                    {selectedItems.length > 0 && (
                      <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">
                        {selectedItems.length}
                      </span>
                    )}
                  </div>
                  {selectedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-200">
                      <Calendar className="w-7 h-7" />
                      <p className="text-xs text-gray-400">No events this day</p>
                    </div>
                  ) : (
                    <div className="overflow-auto divide-y divide-gray-50" style={{ maxHeight: 480 }}>
                      {selectedItems.map((item, i) => (
                        <div key={i} className="px-4 py-3 hover:bg-gray-50/60 transition-colors">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <p className="font-semibold text-gray-800 text-[12px] leading-tight">
                              {item.company_name || item.lead_name || "Unknown"}
                            </p>
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 border",
                              item._type === "proposal"
                                ? "bg-violet-50 text-violet-600 border-violet-200"
                                : "bg-blue-50 text-blue-600 border-blue-200"
                            )}>
                              {item._type === "proposal" ? "Proposal" : "Followup"}
                            </span>
                          </div>
                          {item.status && (
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className={cn("w-2 h-2 rounded-full", STATUS_DOT[item.status] || "bg-gray-300")} />
                              <span className={cn("text-[11px] font-semibold", STATUS_TEXT[item.status] || "text-gray-500")}>
                                {item.status}
                              </span>
                            </div>
                          )}
                          <div className="space-y-1">
                            {item.mobile_no && (
                              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <Phone className="w-3 h-3 text-gray-300 shrink-0" />
                                {item.mobile_no}
                              </div>
                            )}
                            {item.email_id && (
                              <div className="flex items-center gap-2 text-[11px] text-gray-500 truncate">
                                <Mail className="w-3 h-3 text-gray-300 shrink-0" />
                                {item.email_id}
                              </div>
                            )}
                            {(item.city || item.country) && (
                              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                <Building2 className="w-3 h-3 text-gray-300 shrink-0" />
                                {[item.city, item.country].filter(Boolean).join(", ")}
                              </div>
                            )}
                            {item.source && (
                              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                <Clock className="w-3 h-3 text-gray-300 shrink-0" />
                                {item.source}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-200">
                  <Calendar className="w-7 h-7" />
                  <p className="text-xs text-gray-400 text-center">Select a date<br/>to view events</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List view */
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
              <input
                className="bg-white border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-xs text-gray-700 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all w-48"
                placeholder="Search leads, company..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Type filter */}
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300 pointer-events-none" />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className={cn(
                  "appearance-none bg-white border rounded-lg pl-7 pr-6 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all cursor-pointer",
                  filterType ? "border-indigo-400 text-indigo-700 font-semibold" : "border-gray-200 text-gray-600"
                )}
              >
                <option value="">All Types</option>
                <option value="followup">Followup</option>
                <option value="proposal">Proposal</option>
              </select>
            </div>

            {/* Status filter */}
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300 pointer-events-none" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className={cn(
                  "appearance-none bg-white border rounded-lg pl-7 pr-6 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all cursor-pointer max-w-40",
                  filterStatus ? "border-indigo-400 text-indigo-700 font-semibold" : "border-gray-200 text-gray-600"
                )}
              >
                <option value="">All Statuses</option>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Source filter */}
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300 pointer-events-none" />
              <select
                value={filterSource}
                onChange={e => setFilterSource(e.target.value)}
                className={cn(
                  "appearance-none bg-white border rounded-lg pl-7 pr-6 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all cursor-pointer max-w-40",
                  filterSource ? "border-indigo-400 text-indigo-700 font-semibold" : "border-gray-200 text-gray-600"
                )}
              >
                <option value="">All Sources</option>
                {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Clear filters */}
            {activeFilters > 0 && (
              <button
                onClick={() => { setFilterType(""); setFilterStatus(""); setFilterSource(""); setSearch(""); }}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-50 transition-colors"
              >
                <X className="w-3 h-3" /> Clear ({activeFilters})
              </button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Sort toggle */}
            <button
              onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
              className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-100 transition-colors font-semibold"
              title={sortDir === "desc" ? "Newest first" : "Oldest first"}
            >
              <ArrowUpDown className="w-3 h-3" />
              {sortDir === "desc" ? "Newest first" : "Oldest first"}
            </button>

            <span className="text-xs font-semibold text-gray-400 whitespace-nowrap">{listItems.length} entries</span>
          </div>
          <div className="overflow-auto" style={{ maxHeight: 540 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Type", "Date", "Company", "Lead", "Status", "Followed By", "Source", "Country", "Mobile"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-gray-300">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-300" />
                      <span className="text-xs">Loading...</span>
                    </div>
                  </td></tr>
                ) : listItems.map((item, i) => {
                  const isPast = item._dateKey < todayKey;
                  const isToday = item._dateKey === todayKey;
                  return (
                    <tr key={i} className={cn(
                      "border-b border-gray-50 transition-colors hover:bg-gray-50/60",
                      i % 2 !== 0 ? "bg-gray-50/20" : ""
                    )}>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded font-bold border",
                          item._type === "proposal"
                            ? "bg-violet-50 text-violet-600 border-violet-200"
                            : "bg-blue-50 text-blue-600 border-blue-200"
                        )}>
                          {item._type === "proposal" ? "Proposal" : "Followup"}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-[11px] font-semibold tabular-nums",
                            isToday ? "text-indigo-600" : isPast ? "text-red-500" : "text-gray-700"
                          )}>
                            {item._dateKey}
                          </span>
                          {isToday && <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold">Today</span>}
                          {isPast && !isToday && <span className="text-[9px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-bold border border-red-200">Late</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-800 max-w-36 truncate text-[11px]">{item.company_name || "—"}</td>
                      <td className="px-3 py-2 text-gray-500 text-[11px]">{item.lead_name || "—"}</td>
                      <td className="px-3 py-2">
                        {item.status ? (
                          <div className="flex items-center gap-1.5">
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[item.status] || "bg-gray-300")} />
                            <span className={cn("text-[11px] font-semibold", STATUS_TEXT[item.status] || "text-gray-500")}>
                              {item.status}
                            </span>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-[11px] whitespace-nowrap font-medium">{item.followed_by || "—"}</td>
                      <td className="px-3 py-2 text-gray-400 text-[11px] whitespace-nowrap">{item.source || "—"}</td>
                      <td className="px-3 py-2 text-gray-400 text-[11px] whitespace-nowrap">{item.country || "—"}</td>
                      <td className="px-3 py-2 text-gray-400 text-[11px] whitespace-nowrap">{item.mobile_no || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
