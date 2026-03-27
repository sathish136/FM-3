import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Calendar, RefreshCw,
  Clock, Building2, Phone, Mail, FileText, Download, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

const STATUS_COLORS: Record<string, string> = {
  Open:              "bg-blue-100 text-blue-700 border-blue-200",
  Converted:         "bg-emerald-100 text-emerald-700 border-emerald-200",
  Opportunity:       "bg-violet-100 text-violet-700 border-violet-200",
  Quotation:         "bg-amber-100 text-amber-700 border-amber-200",
  Lead:              "bg-sky-100 text-sky-700 border-sky-200",
  Replied:           "bg-teal-100 text-teal-700 border-teal-200",
  Closed:            "bg-gray-100 text-gray-600 border-gray-200",
  "Lost Quotation":  "bg-red-100 text-red-700 border-red-200",
  "Do Not Contact":  "bg-rose-100 text-rose-700 border-rose-200",
};

const DOT_COLORS: Record<string, string> = {
  Open:             "bg-blue-500",
  Converted:        "bg-emerald-500",
  Opportunity:      "bg-violet-500",
  Quotation:        "bg-amber-500",
  Lead:             "bg-sky-500",
  Replied:          "bg-teal-500",
  Closed:           "bg-gray-400",
  "Lost Quotation": "bg-red-500",
  "Do Not Contact": "bg-rose-500",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];

function parseDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

  // Normalise items: get date field from any known field
  const allItems: (FollowupItem & { _dateKey: string; _type: "followup" | "proposal" })[] = useMemo(() => {
    const result: (FollowupItem & { _dateKey: string; _type: "followup" | "proposal" })[] = [];

    const followups: FollowupItem[] = Array.isArray(followupData?.message)
      ? followupData.message
      : Array.isArray(followupData)
      ? followupData
      : [];

    for (const item of followups) {
      const rawDate = item.contact_date || item.next_contact || item.follow_up_date || item.scheduled_date || item.creation;
      const d = parseDate(rawDate);
      if (d) result.push({ ...item, _dateKey: dateKey(d), _type: "followup" });
    }

    const proposals: FollowupItem[] = Array.isArray(proposalData?.message)
      ? proposalData.message
      : Array.isArray(proposalData)
      ? proposalData
      : [];

    for (const item of proposals) {
      const rawDate = item.contact_date || item.next_contact || item.follow_up_date || item.scheduled_date || item.creation;
      const d = parseDate(rawDate);
      if (d) result.push({ ...item, _dateKey: dateKey(d), _type: "proposal" });
    }

    return result;
  }, [followupData, proposalData]);

  // Group by date key
  const byDate = useMemo(() => {
    const map: Record<string, typeof allItems> = {};
    for (const item of allItems) {
      if (!map[item._dateKey]) map[item._dateKey] = [];
      map[item._dateKey].push(item);
    }
    return map;
  }, [allItems]);

  // Calendar grid
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const todayKey = dateKey(today);

  // Selected day items
  const selectedItems = selectedDay ? (byDate[selectedDay] ?? []) : [];

  // List view items
  const listItems = allItems
    .filter(i => {
      const q = search.toLowerCase();
      return !q || [i.lead_name, i.company_name, i.status, i.source, i.country].some(v =>
        String(v ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a._dateKey.localeCompare(b._dateKey));

  // Stats
  const totalFollowups = allItems.filter(i => i._type === "followup").length;
  const totalProposals = allItems.filter(i => i._type === "proposal").length;
  const overdueCount = allItems.filter(i => i._dateKey < todayKey).length;
  const todayCount = allItems.filter(i => i._dateKey === todayKey).length;

  function exportData() {
    const rows = listItems.map(i => ({
      Type: i._type,
      Date: i._dateKey,
      Lead: i.lead_name || "",
      Company: i.company_name || "",
      Status: i.status || "",
      Source: i.source || "",
      Country: i.country || "",
      City: i.city || "",
      Mobile: i.mobile_no || "",
      Email: i.email_id || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Followups");
    XLSX.writeFile(wb, "Followup_Calendar.xlsx");
  }

  return (
    <div className="space-y-5">
      {/* Header + Stats */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Followup Calendar</h2>
          <p className="text-sm text-gray-400 mt-0.5">Scheduled follow-ups and proposal requests</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1">
            <button onClick={() => setView("calendar")} className={cn("px-3 py-1.5 rounded-lg text-sm transition-all font-medium", view === "calendar" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              <Calendar className="w-4 h-4" />
            </button>
            <button onClick={() => setView("list")} className={cn("px-3 py-1.5 rounded-lg text-sm transition-all font-medium", view === "list" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              <FileText className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl px-3 py-2 text-sm hover:bg-indigo-100 transition-colors font-semibold">
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} /> Refresh
          </button>
          <button onClick={exportData} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-3 py-2 text-sm hover:bg-emerald-100 transition-colors font-semibold">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Followups", value: totalFollowups, color: "from-blue-500 to-indigo-600", text: "text-white" },
          { label: "Proposals",       value: totalProposals, color: "from-violet-500 to-purple-600", text: "text-white" },
          { label: "Today",           value: todayCount,     color: "from-amber-400 to-orange-500", text: "text-white" },
          { label: "Overdue",         value: overdueCount,   color: "from-red-400 to-rose-500",     text: "text-white" },
        ].map(kpi => (
          <div key={kpi.label} className={cn("rounded-2xl p-4 bg-gradient-to-br", kpi.color)}>
            <p className="text-white/80 text-xs font-medium">{kpi.label}</p>
            <p className={cn("text-3xl font-black mt-0.5", kpi.text)}>
              {isLoading ? <span className="inline-block w-10 h-7 bg-white/20 rounded animate-pulse" /> : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {view === "calendar" ? (
        <div className="flex gap-4">
          {/* Calendar */}
          <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="font-bold text-gray-800">{MONTHS[month]} {year}</span>
              <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">{d}</div>
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
                const isPast = ck < todayKey;

                return (
                  <div
                    key={idx}
                    onClick={() => isCurrentMonth && setSelectedDay(isSelected ? null : ck)}
                    className={cn(
                      "min-h-16 p-1.5 border-b border-r border-gray-50 transition-colors",
                      isCurrentMonth ? "cursor-pointer hover:bg-indigo-50/40" : "bg-gray-50/30",
                      isSelected && "bg-indigo-50 border-indigo-100",
                    )}
                  >
                    {isCurrentMonth && (
                      <>
                        <div className={cn(
                          "w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold mb-1",
                          isToday ? "bg-indigo-600 text-white" :
                          isPast ? "text-gray-400" : "text-gray-700"
                        )}>
                          {dayNum}
                        </div>
                        {events.slice(0, 3).map((ev, i) => (
                          <div key={i} className={cn(
                            "text-[9px] font-medium px-1.5 py-0.5 rounded mb-0.5 truncate border",
                            ev._type === "proposal"
                              ? "bg-violet-50 text-violet-600 border-violet-200"
                              : STATUS_COLORS[ev.status ?? ""] || "bg-gray-50 text-gray-500 border-gray-200"
                          )}>
                            {ev.company_name || ev.lead_name || "Lead"}
                          </div>
                        ))}
                        {events.length > 3 && (
                          <div className="text-[9px] text-gray-400 px-1 font-medium">+{events.length - 3} more</div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected day panel */}
          <div className="w-80 shrink-0">
            {selectedDay ? (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden h-full">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <p className="font-bold text-gray-800 text-sm">{selectedDay}</p>
                  <p className="text-xs text-gray-400">{selectedItems.length} scheduled</p>
                </div>
                {selectedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-300">
                    <Calendar className="w-8 h-8" />
                    <p className="text-sm text-gray-400">No events this day</p>
                  </div>
                ) : (
                  <div className="overflow-auto max-h-[500px] divide-y divide-gray-50">
                    {selectedItems.map((item, i) => (
                      <div key={i} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-semibold text-gray-800 text-sm leading-tight">{item.company_name || item.lead_name || "Unknown"}</p>
                          <span className={cn(
                            "text-[9px] px-2 py-0.5 rounded-full font-bold border shrink-0 ml-2",
                            item._type === "proposal" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          )}>
                            {item._type === "proposal" ? "Proposal" : "Followup"}
                          </span>
                        </div>
                        {item.status && (
                          <span className={cn("inline-flex text-[10px] px-2 py-0.5 rounded-full font-semibold border mb-2", STATUS_COLORS[item.status] || "bg-gray-100 text-gray-600 border-gray-200")}>
                            {item.status}
                          </span>
                        )}
                        <div className="space-y-1">
                          {item.mobile_no && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Phone className="w-3 h-3 text-gray-300 shrink-0" />
                              {item.mobile_no}
                            </div>
                          )}
                          {item.email_id && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
                              <Mail className="w-3 h-3 text-gray-300 shrink-0" />
                              {item.email_id}
                            </div>
                          )}
                          {(item.city || item.country) && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Building2 className="w-3 h-3 text-gray-300 shrink-0" />
                              {[item.city, item.country].filter(Boolean).join(", ")}
                            </div>
                          )}
                          {item.source && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Clock className="w-3 h-3 text-gray-300 shrink-0" />
                              {item.source}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-6 flex flex-col items-center justify-center h-48 gap-2">
                <Calendar className="w-8 h-8 text-indigo-300" />
                <p className="text-indigo-400 text-sm text-center leading-relaxed">Click any date<br/>to see scheduled events</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <span className="font-semibold text-gray-800 text-sm">{listItems.length} entries</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input
                className="bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all w-56"
                placeholder="Search leads..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Type", "Date", "Company", "Lead", "Status", "Source", "Country", "Mobile"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-300">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-300" />
                      Loading...
                    </div>
                  </td></tr>
                ) : listItems.map((item, i) => {
                  const isPast = item._dateKey < todayKey;
                  const isToday = item._dateKey === todayKey;
                  return (
                    <tr key={i} className={cn("border-b border-gray-50 transition-colors hover:bg-indigo-50/30", i % 2 !== 0 ? "bg-gray-50/20" : "")}>
                      <td className="px-3 py-2.5">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold", item._type === "proposal" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                          {item._type === "proposal" ? "Proposal" : "Followup"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-semibold">
                        <span className={cn(isToday ? "text-indigo-600" : isPast ? "text-red-500" : "text-gray-700")}>
                          {item._dateKey}
                          {isToday && <span className="ml-1 text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">Today</span>}
                          {isPast && !isToday && <span className="ml-1 text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full border border-red-200">Overdue</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800 max-w-36 truncate">{item.company_name || "—"}</td>
                      <td className="px-3 py-2.5 text-gray-600">{item.lead_name || "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold", STATUS_COLORS[item.status ?? ""] || "bg-gray-100 text-gray-600 border-gray-200")}>
                          {item.status || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{item.source || "—"}</td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{item.country || "—"}</td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{item.mobile_no || "—"}</td>
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
