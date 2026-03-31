import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "wouter";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, X, Bell,
  Clock, MapPin, Users, Repeat, Trash2, Edit2, Check, AlertCircle,
  RefreshCw, Calendar as CalIcon, List, Loader2, Search, Filter,
} from "lucide-react";

const API = "/api";

const EVENT_TYPES = [
  { id: "meeting",  label: "Meeting",       color: "#3b82f6", bg: "bg-blue-100",    text: "text-blue-800"    },
  { id: "followup", label: "Follow-up",     color: "#8b5cf6", bg: "bg-violet-100",  text: "text-violet-800"  },
  { id: "standup",  label: "Daily Standup", color: "#10b981", bg: "bg-emerald-100", text: "text-emerald-800" },
  { id: "reminder", label: "Reminder",      color: "#f59e0b", bg: "bg-amber-100",   text: "text-amber-800"   },
  { id: "task",     label: "Task Deadline", color: "#ef4444", bg: "bg-red-100",     text: "text-red-800"     },
  { id: "call",     label: "Call",          color: "#06b6d4", bg: "bg-cyan-100",    text: "text-cyan-800"    },
  { id: "personal", label: "Personal",      color: "#64748b", bg: "bg-slate-100",   text: "text-slate-800"   },
];

const RECURRENCES = [
  { id: "none",    label: "No Repeat" },
  { id: "daily",   label: "Every Day" },
  { id: "weekday", label: "Weekdays Only (Mon–Fri)" },
  { id: "weekly",  label: "Every Week" },
  { id: "monthly", label: "Every Month" },
];

const REMINDERS = [
  { value: 0,    label: "At the time" },
  { value: 5,    label: "5 min before" },
  { value: 10,   label: "10 min before" },
  { value: 15,   label: "15 min before" },
  { value: 30,   label: "30 min before" },
  { value: 60,   label: "1 hour before" },
  { value: 120,  label: "2 hours before" },
  { value: 1440, label: "1 day before" },
];

const COLOR_PRESETS = [
  "#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#64748b",
  "#ec4899","#f97316","#84cc16","#14b8a6","#6366f1","#e11d48","#0ea5e9",
];

const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface CalEvent {
  id: number;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime?: string;
  all_day: boolean;
  event_type: string;
  color: string;
  recurrence: string;
  reminder_minutes: number;
  created_by?: string;
  related_module?: string;
  related_id?: string;
  location?: string;
  attendees?: string;
}

type ViewMode = "month" | "week" | "day" | "agenda";

function fmtTime(dt: string) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(dt: string) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtShortDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function toLocalInput(dt: string) {
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function getEventMeta(type: string) {
  return EVENT_TYPES.find(t => t.id === type) || EVENT_TYPES[0];
}

function expandRecurring(events: CalEvent[], rangeStart: Date, rangeEnd: Date): CalEvent[] {
  const result: CalEvent[] = [];
  for (const ev of events) {
    const base = new Date(ev.start_datetime);
    if (ev.recurrence === "none" || !ev.recurrence) { result.push(ev); continue; }
    let cur = new Date(base);
    while (cur <= rangeEnd) {
      if (cur >= rangeStart) {
        const diff = cur.getTime() - base.getTime();
        const newStart = new Date(ev.start_datetime); newStart.setTime(newStart.getTime() + diff);
        const newEnd = ev.end_datetime ? new Date(new Date(ev.end_datetime).getTime() + diff) : undefined;
        result.push({ ...ev, id: ev.id * 100000 + Math.floor(diff / 86400000), start_datetime: newStart.toISOString(), end_datetime: newEnd?.toISOString() });
      }
      if (ev.recurrence === "daily") cur.setDate(cur.getDate() + 1);
      else if (ev.recurrence === "weekday") { do { cur.setDate(cur.getDate() + 1); } while (cur.getDay() === 0 || cur.getDay() === 6); }
      else if (ev.recurrence === "weekly") cur.setDate(cur.getDate() + 7);
      else if (ev.recurrence === "monthly") cur.setMonth(cur.getMonth() + 1);
      else break;
    }
  }
  return result;
}

const FIRED_KEY = "cal_fired_reminders";
function getFiredSet(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || "[]")); } catch { return new Set(); }
}
function markFired(key: string) {
  const s = getFiredSet(); s.add(key);
  localStorage.setItem(FIRED_KEY, JSON.stringify(Array.from(s).slice(-200)));
}
function fireReminder(ev: CalEvent) {
  const key = `${ev.id}-${ev.start_datetime}`;
  if (getFiredSet().has(key)) return;
  markFired(key);
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(`⏰ ${ev.title}`, {
      body: `${ev.reminder_minutes > 0 ? `In ${ev.reminder_minutes} min — ` : ""}${fmtDate(ev.start_datetime)} ${fmtTime(ev.start_datetime)}${ev.location ? `\n📍 ${ev.location}` : ""}`,
      icon: "/favicon.ico",
    });
  }
}

function blankForm(defaults?: Partial<CalEvent & { start_datetime?: string; end_datetime?: string }>) {
  const now = new Date(); now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  const end = new Date(now); end.setHours(end.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    title: defaults?.title || "",
    description: defaults?.description || "",
    start_datetime: defaults?.start_datetime ? (defaults.start_datetime.length === 10 ? `${defaults.start_datetime}T${pad(now.getHours())}:${pad(now.getMinutes())}` : defaults.start_datetime.slice(0, 16)) : fmt(now),
    end_datetime: defaults?.end_datetime ? defaults.end_datetime.slice(0, 16) : fmt(end),
    all_day: defaults?.all_day ?? false,
    event_type: defaults?.event_type || "meeting",
    color: defaults?.color || "#3b82f6",
    recurrence: defaults?.recurrence || "none",
    reminder_minutes: defaults?.reminder_minutes ?? 15,
    location: defaults?.location || "",
    attendees: defaults?.attendees ? (typeof defaults.attendees === "string" ? JSON.parse(defaults.attendees) : defaults.attendees) : [] as string[],
    related_module: defaults?.related_module || "",
    related_id: defaults?.related_id || "",
  };
}

export default function CalendarPage() {
  const { user } = useAuth();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>("default");
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [waEnabled, setWaEnabled] = useState<boolean>(() => localStorage.getItem("cal_wa_enabled") !== "false");
  const [browserEnabled, setBrowserEnabled] = useState<boolean>(() => localStorage.getItem("cal_browser_enabled") !== "false");
  const [defaultReminderMins, setDefaultReminderMins] = useState<number>(() => parseInt(localStorage.getItem("cal_default_reminder") ?? "15"));
  const [attendeeInput, setAttendeeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [overflowDay, setOverflowDay] = useState<{ date: Date; events: CalEvent[] } | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [phoneSource, setPhoneSource] = useState<string | null>(null);
  const [testReminderStatus, setTestReminderStatus] = useState<"idle" | "sending" | "ok" | "fail">("idle");
  const reminderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ("Notification" in window) setNotifPerm(Notification.permission);
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    fetch(`${API}/calendar/user-phone?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(d => { setUserPhone(d.phone || null); setPhoneSource(d.source || null); })
      .catch(() => {});
  }, [user?.email]);

  const requestNotifPerm = async () => {
    if ("Notification" in window) { const perm = await Notification.requestPermission(); setNotifPerm(perm); }
  };

  const sendTestReminder = async () => {
    if (!user?.email) return;
    setTestReminderStatus("sending");
    try {
      const res = await fetch(`${API}/calendar/test-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      setTestReminderStatus(res.ok ? "ok" : "fail");
    } catch {
      setTestReminderStatus("fail");
    }
    setTimeout(() => setTestReminderStatus("idle"), 4000);
  };

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
      const end   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 1, 23, 59, 59).toISOString();
      const r = await fetch(`${API}/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      if (!r.ok) { setEvents([]); return; }
      const data: CalEvent[] = await r.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, [currentDate]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      events.forEach(ev => {
        const start = new Date(ev.start_datetime).getTime();
        const remMs = (ev.reminder_minutes ?? 15) * 60 * 1000;
        const fireAt = start - remMs;
        if (now >= fireAt && now < fireAt + 70000) fireReminder(ev);
      });
    };
    check();
    reminderTimerRef.current = setInterval(check, 60000);
    return () => { if (reminderTimerRef.current) clearInterval(reminderTimerRef.current); };
  }, [events]);

  useEffect(() => {
    const title = params.get("title"); const date = params.get("date");
    const type = params.get("type"); const rel = params.get("related"); const relId = params.get("relatedId");
    if (title) {
      const dateStr = date ? `${date}T09:00` : undefined;
      const endStr  = date ? `${date}T10:00` : undefined;
      setForm(blankForm({ title, start_datetime: dateStr, end_datetime: endStr, event_type: type || "reminder", related_module: rel || undefined, related_id: relId || undefined }));
      setShowModal(true);
    }
  }, []);

  useEffect(() => {
    if ((viewMode === "week" || viewMode === "day") && timeGridRef.current) {
      const h = new Date().getHours();
      timeGridRef.current.scrollTop = Math.max(0, (h - 1)) * 56;
    }
  }, [viewMode]);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const rangeStart = new Date(year, month - 1, 1);
  const rangeEnd   = new Date(year, month + 2, 0, 23, 59, 59);
  const expanded = expandRecurring(events, rangeStart, rangeEnd);

  function filterEvents(evs: CalEvent[]): CalEvent[] {
    return evs.filter(ev => {
      const matchType = filterType === "all" || ev.event_type === filterType;
      const matchSearch = !searchQuery || ev.title.toLowerCase().includes(searchQuery.toLowerCase()) || (ev.description || "").toLowerCase().includes(searchQuery.toLowerCase()) || (ev.location || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }

  function eventsOnDate(d: Date): CalEvent[] {
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return filterEvents(expanded.filter(ev => ev.start_datetime.startsWith(ds))).sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
  }

  function agendaEvents(): CalEvent[] {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const future = new Date(now); future.setDate(future.getDate() + 60);
    return filterEvents(expandRecurring(events, now, future).filter(ev => new Date(ev.start_datetime) >= now)).sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
  }

  function getWeekDays(d: Date): Date[] {
    const start = new Date(d); start.setDate(d.getDate() - d.getDay());
    return Array.from({ length: 7 }, (_, i) => { const day = new Date(start); day.setDate(start.getDate() + i); return day; });
  }

  const weekDays = getWeekDays(currentDate);

  function navigatePrev() {
    if (viewMode === "month") setCurrentDate(new Date(year, month - 1, 1));
    else if (viewMode === "week") setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
    else if (viewMode === "day") setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; });
    else setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 30); return d; });
  }
  function navigateNext() {
    if (viewMode === "month") setCurrentDate(new Date(year, month + 1, 1));
    else if (viewMode === "week") setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
    else if (viewMode === "day") setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; });
    else setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 30); return d; });
  }

  function getNavLabel(): string {
    if (viewMode === "month") return `${MONTHS[month]} ${year}`;
    if (viewMode === "week") {
      const start = weekDays[0]; const end = weekDays[6];
      return start.getMonth() === end.getMonth() ? `${MONTHS[start.getMonth()]} ${start.getFullYear()}` : `${MONTHS[start.getMonth()].slice(0,3)} – ${MONTHS[end.getMonth()].slice(0,3)} ${end.getFullYear()}`;
    }
    if (viewMode === "day") return fmtDate(currentDate.toISOString());
    return "Next 60 Days";
  }

  const openCreate = (d?: Date, hour?: number) => {
    const base = d || selectedDate || new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ds = `${base.getFullYear()}-${pad(base.getMonth()+1)}-${pad(base.getDate())}`;
    const h = hour !== undefined ? hour : new Date().getHours();
    const startStr = `${ds}T${pad(h)}:00`;
    const endStr   = `${ds}T${pad(h+1 > 23 ? 23 : h+1)}:00`;
    setForm(blankForm({ start_datetime: startStr, end_datetime: endStr, reminder_minutes: defaultReminderMins }));
    setEditingEvent(null); setShowModal(true);
  };

  const openEdit = (ev: CalEvent) => {
    setForm({
      title: ev.title, description: ev.description || "",
      start_datetime: toLocalInput(ev.start_datetime),
      end_datetime: ev.end_datetime ? toLocalInput(ev.end_datetime) : "",
      all_day: ev.all_day, event_type: ev.event_type, color: ev.color,
      recurrence: ev.recurrence, reminder_minutes: ev.reminder_minutes,
      location: ev.location || "",
      attendees: ev.attendees ? (typeof ev.attendees === "string" ? JSON.parse(ev.attendees) : ev.attendees) : [],
      related_module: ev.related_module || "", related_id: ev.related_id || "",
    });
    setEditingEvent(ev); setShowModal(true);
  };

  const saveEvent = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, start_datetime: new Date(form.start_datetime).toISOString(), end_datetime: form.end_datetime ? new Date(form.end_datetime).toISOString() : null, created_by: user?.email, attendees: form.attendees };
      if (editingEvent) {
        await fetch(`${API}/calendar/events/${editingEvent.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        await fetch(`${API}/calendar/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      setShowModal(false); setEditingEvent(null); setOverflowDay(null);
      await loadEvents();
    } finally { setSaving(false); }
  };

  const deleteEvent = async (id: number) => {
    if (!confirm("Delete this event?")) return;
    await fetch(`${API}/calendar/events/${id}`, { method: "DELETE" });
    setShowModal(false); setEditingEvent(null); setOverflowDay(null);
    await loadEvents();
  };

  const handleTypeChange = (type: string) => {
    const meta = getEventMeta(type);
    setForm(f => ({ ...f, event_type: type, color: meta.color }));
  };

  const isToday = (d: Date) => isSameDay(d, today);
  const isSelected = (d: Date) => !!selectedDate && isSameDay(d, selectedDate);

  function getEventTopPct(ev: CalEvent): number {
    const d = new Date(ev.start_datetime);
    return ((d.getHours() * 60 + d.getMinutes()) / (24 * 60)) * 100;
  }
  function getEventHeightPct(ev: CalEvent): number {
    if (!ev.end_datetime) return (60 / (24 * 60)) * 100;
    const start = new Date(ev.start_datetime).getTime();
    const end   = new Date(ev.end_datetime).getTime();
    const mins  = Math.max(30, (end - start) / 60000);
    return (mins / (24 * 60)) * 100;
  }

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50 min-h-screen">
        {/* Top bar — row 1: title + view tabs + new event */}
        <div className="bg-white border-b px-4 py-2.5 flex items-center gap-3 shadow-sm">
          <div className="flex items-center gap-2 shrink-0">
            <CalIcon className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-gray-800 text-sm hidden sm:block">Calendar</span>
          </div>

          {/* View mode tabs */}
          <div className="flex bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0">
            {([
              { id: "month"  as ViewMode, label: "Month" },
              { id: "week"   as ViewMode, label: "Week"  },
              { id: "day"    as ViewMode, label: "Day"   },
              { id: "agenda" as ViewMode, label: "List"  },
            ]).map(v => (
              <button key={v.id} onClick={() => setViewMode(v.id)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === v.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}>
                {v.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-gray-300 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="w-full border border-gray-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-blue-400"
            />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X className="w-3 h-3" /></button>}
          </div>

          {/* Type filter */}
          <div className="relative shrink-0">
            <button onClick={() => setShowFilterMenu(v => !v)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${filterType !== "all" ? "bg-blue-50 border-blue-200 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
              <Filter className="w-3 h-3" />
              <span className="hidden sm:inline">{filterType === "all" ? "Filter" : getEventMeta(filterType).label}</span>
            </button>
            {showFilterMenu && (
              <div className="absolute top-8 right-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[150px]">
                <button onClick={() => { setFilterType("all"); setShowFilterMenu(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${filterType === "all" ? "font-bold text-blue-600" : "text-gray-700"}`}>All Types</button>
                {EVENT_TYPES.map(t => (
                  <button key={t.id} onClick={() => { setFilterType(t.id); setShowFilterMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 ${filterType === t.id ? "font-bold text-blue-600" : "text-gray-700"}`}>
                    <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />{t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {notifPerm !== "granted" ? (
            <button onClick={() => setShowReminderModal(true)}
              className="shrink-0 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
              <Bell className="w-3.5 h-3.5" /><span className="hidden md:inline">Enable Reminders</span>
            </button>
          ) : (
            <button onClick={() => setShowReminderModal(true)}
              className="shrink-0 flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors">
              <Bell className="w-3 h-3" /><span className="hidden md:inline">Reminders On</span>
            </button>
          )}

          <button onClick={() => openCreate()}
            className="shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">New Event</span>
          </button>
        </div>

        {/* WhatsApp reminder status bar */}
        {userPhone ? (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 border-b border-green-100 text-xs text-green-700">
            <span className="text-green-500 text-base leading-none">📲</span>
            <span className="font-medium">WhatsApp reminders active</span>
            <span className="text-green-600 font-mono">{userPhone}</span>
            {phoneSource === "erpnext" && <span className="text-green-500 bg-green-100 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">ERPNext</span>}
            {phoneSource === "settings" && <span className="text-green-500 bg-green-100 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">Settings</span>}
            <span className="text-green-500 ml-1">— All event reminders will be sent to this number</span>
            <button
              onClick={sendTestReminder}
              disabled={testReminderStatus === "sending"}
              className="ml-auto shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors
                bg-white border-green-300 text-green-700 hover:bg-green-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {testReminderStatus === "sending" && <Loader2 className="w-3 h-3 animate-spin" />}
              {testReminderStatus === "ok" && <Check className="w-3 h-3 text-green-600" />}
              {testReminderStatus === "fail" && <AlertCircle className="w-3 h-3 text-red-500" />}
              {testReminderStatus === "idle" && <Bell className="w-3 h-3" />}
              {testReminderStatus === "sending" ? "Sending…" : testReminderStatus === "ok" ? "Sent!" : testReminderStatus === "fail" ? "Failed" : "Send Test"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
            <span className="text-base leading-none">⚠️</span>
            <span>No WhatsApp phone configured — add your number in <strong>Settings → Notifications</strong> or via ERPNext employee profile to enable WhatsApp reminders</span>
          </div>
        )}

        {/* Nav bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b">
          <button onClick={navigatePrev} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronLeft className="w-4 h-4" /></button>
          <h2 className="font-bold text-gray-800 text-sm flex-1 text-center">{getNavLabel()}</h2>
          <button onClick={navigateNext} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
            className="text-xs text-blue-600 font-medium hover:underline px-2">Today</button>
          {loading && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
        </div>

        {/* ── Main content area: views + right sidebar ── */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden flex flex-col">

        {/* ── Month View ── */}
        {viewMode === "month" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-7 border-b bg-gray-50">
              {DAYS_SHORT.map(d => (
                <div key={d} className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">{d}</div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-auto">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`pre-${i}`} className="border-b border-r bg-gray-50/60 min-h-[90px]" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = new Date(year, month, i + 1);
                const dayEvs = eventsOnDate(d);
                const todayCell = isToday(d);
                const selCell   = isSelected(d);
                return (
                  <div key={i} onClick={() => { setSelectedDate(d); if (viewMode === "month") {} }}
                    onDoubleClick={() => openCreate(d)}
                    className={`border-b border-r min-h-[90px] p-1 cursor-pointer transition-colors
                      ${todayCell ? "bg-blue-50" : "bg-white hover:bg-gray-50"}
                      ${selCell ? "ring-2 ring-inset ring-blue-400" : ""}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                        ${todayCell ? "bg-blue-600 text-white" : "text-gray-700"}`}>{i + 1}</span>
                      {selCell && (
                        <button onClick={e => { e.stopPropagation(); openCreate(d); }}
                          className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors">
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvs.slice(0, 3).map((ev, ei) => (
                        <div key={ei} onClick={e => { e.stopPropagation(); openEdit(ev); }}
                          className="flex items-center gap-1 rounded px-1 py-0.5 text-[9px] font-semibold truncate cursor-pointer hover:opacity-80"
                          style={{ background: `${ev.color}20`, color: ev.color }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ev.color }} />
                          <span className="truncate">{!ev.all_day && fmtTime(ev.start_datetime) + " "}{ev.title}</span>
                          {ev.recurrence !== "none" && <Repeat className="w-2 h-2 shrink-0" />}
                        </div>
                      ))}
                      {dayEvs.length > 3 && (
                        <button onClick={e => { e.stopPropagation(); setOverflowDay({ date: d, events: dayEvs }); }}
                          className="text-[9px] text-blue-600 font-medium pl-1 hover:underline">
                          +{dayEvs.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Week View ── */}
        {viewMode === "week" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Week day headers */}
            <div className="grid border-b bg-white" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
              <div className="border-r py-2" />
              {weekDays.map((d, i) => (
                <div key={i} className={`py-2 text-center border-r ${isToday(d) ? "bg-blue-50" : ""}`}>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">{DAYS_SHORT[d.getDay()]}</div>
                  <div className={`text-sm font-bold mx-auto w-7 h-7 flex items-center justify-center rounded-full mt-0.5
                    ${isToday(d) ? "bg-blue-600 text-white" : "text-gray-700"}`}>{d.getDate()}</div>
                </div>
              ))}
            </div>
            {/* Time grid */}
            <div className="flex-1 overflow-y-auto" ref={timeGridRef}>
              <div className="relative" style={{ minHeight: `${24 * 56}px` }}>
                <div className="grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                  {/* Hour rows */}
                  {HOURS.map(h => (
                    <div key={h} className="contents">
                      <div className="border-r border-b text-[9px] text-gray-400 text-right pr-1.5 pt-0.5" style={{ height: 56 }}>
                        {h === 0 ? "" : `${h < 10 ? "0" : ""}${h}:00`}
                      </div>
                      {weekDays.map((d, di) => (
                        <div key={di} onClick={() => openCreate(d, h)}
                          className={`border-r border-b cursor-pointer transition-colors hover:bg-blue-50/30 ${isToday(d) ? "bg-blue-50/20" : ""}`}
                          style={{ height: 56 }} />
                      ))}
                    </div>
                  ))}
                  {/* Current time line */}
                  {weekDays.some(d => isToday(d)) && (() => {
                    const now = new Date();
                    const topPct = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;
                    const todayIdx = weekDays.findIndex(d => isToday(d));
                    return (
                      <div className="absolute left-[52px] right-0 pointer-events-none" style={{ top: `${topPct}%`, display: "grid", gridTemplateColumns: `repeat(7, 1fr)` }}>
                        {weekDays.map((_, i) => (
                          <div key={i} className={i === todayIdx ? "relative" : ""}>
                            {i === todayIdx && <div className="absolute inset-x-0 top-0 h-0.5 bg-red-500 z-10"><div className="w-2 h-2 bg-red-500 rounded-full -translate-y-[3px] -translate-x-1" /></div>}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                {/* Events overlay */}
                <div className="absolute inset-0 pointer-events-none" style={{ left: 52 }}>
                  <div className="relative h-full grid" style={{ gridTemplateColumns: `repeat(7, 1fr)` }}>
                    {weekDays.map((d, di) => {
                      const dayEvs = eventsOnDate(d).filter(ev => !ev.all_day);
                      return (
                        <div key={di} className="relative">
                          {dayEvs.map((ev, ei) => {
                            const top = getEventTopPct(ev);
                            const height = getEventHeightPct(ev);
                            return (
                              <div key={ei}
                                onClick={e => { e.stopPropagation(); openEdit(ev); }}
                                className="absolute inset-x-0.5 rounded pointer-events-auto cursor-pointer hover:opacity-90 overflow-hidden shadow-sm z-10"
                                style={{ top: `${top}%`, height: `${height}%`, minHeight: 18, background: `${ev.color}CC`, borderLeft: `3px solid ${ev.color}` }}>
                                <div className="px-1 py-0.5">
                                  <p className="text-[9px] font-bold text-white leading-tight truncate">{ev.title}</p>
                                  {height > 5 && <p className="text-[8px] text-white/80 truncate">{fmtTime(ev.start_datetime)}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* All-day events */}
              </div>
            </div>
          </div>
        )}

        {/* ── Day View ── */}
        {viewMode === "day" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b bg-white px-4 py-2 flex items-center gap-2">
              <div className={`text-lg font-bold ${isToday(currentDate) ? "text-blue-600" : "text-gray-700"}`}>
                {DAYS_SHORT[currentDate.getDay()]}, {MONTHS[currentDate.getMonth()]} {currentDate.getDate()}, {currentDate.getFullYear()}
              </div>
              {isToday(currentDate) && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">Today</span>}
            </div>
            <div className="flex-1 overflow-y-auto" ref={timeGridRef}>
              <div className="relative" style={{ minHeight: `${24 * 56}px` }}>
                <div className="grid" style={{ gridTemplateColumns: "52px 1fr" }}>
                  {HOURS.map(h => (
                    <div key={h} className="contents">
                      <div className="border-r border-b text-[9px] text-gray-400 text-right pr-1.5 pt-0.5" style={{ height: 56 }}>
                        {h === 0 ? "" : `${h < 10 ? "0" : ""}${h}:00`}
                      </div>
                      <div onClick={() => openCreate(currentDate, h)}
                        className="border-b cursor-pointer hover:bg-blue-50/30 transition-colors" style={{ height: 56 }} />
                    </div>
                  ))}
                  {/* Current time */}
                  {isToday(currentDate) && (() => {
                    const now = new Date();
                    const topPct = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;
                    return (
                      <div className="absolute left-[52px] right-0 pointer-events-none z-10" style={{ top: `${topPct}%` }}>
                        <div className="relative"><div className="absolute inset-x-0 top-0 h-0.5 bg-red-500"><div className="w-2 h-2 bg-red-500 rounded-full -translate-y-[3px] -translate-x-1" /></div></div>
                      </div>
                    );
                  })()}
                </div>
                {/* Events */}
                <div className="absolute inset-0 pointer-events-none" style={{ left: 52 }}>
                  <div className="relative h-full">
                    {eventsOnDate(currentDate).filter(ev => !ev.all_day).map((ev, ei) => {
                      const top = getEventTopPct(ev);
                      const height = getEventHeightPct(ev);
                      return (
                        <div key={ei}
                          onClick={e => { e.stopPropagation(); openEdit(ev); }}
                          className="absolute rounded pointer-events-auto cursor-pointer hover:opacity-90 overflow-hidden shadow-sm z-10"
                          style={{ top: `${top}%`, height: `${height}%`, minHeight: 24, left: 4, right: 4, background: `${ev.color}DD`, borderLeft: `4px solid ${ev.color}` }}>
                          <div className="px-2 py-1">
                            <p className="text-xs font-bold text-white leading-tight truncate">{ev.title}</p>
                            {height > 4 && <p className="text-[10px] text-white/80">{fmtTime(ev.start_datetime)}{ev.end_datetime ? ` – ${fmtTime(ev.end_datetime)}` : ""}</p>}
                            {height > 8 && ev.location && <p className="text-[10px] text-white/70 flex items-center gap-0.5 truncate"><MapPin className="w-2.5 h-2.5" />{ev.location}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            {/* All-day events for this day */}
            {eventsOnDate(currentDate).filter(ev => ev.all_day).length > 0 && (
              <div className="border-t bg-gray-50 px-4 py-2">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">All-day</p>
                <div className="flex flex-wrap gap-1">
                  {eventsOnDate(currentDate).filter(ev => ev.all_day).map((ev, i) => (
                    <button key={i} onClick={() => openEdit(ev)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${ev.color}20`, color: ev.color }}>
                      {ev.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Agenda View ── */}
        {viewMode === "agenda" && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 text-sm">Upcoming Events (60 days)</h2>
              <button onClick={loadEvents} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><RefreshCw className="w-3.5 h-3.5" /></button>
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
            ) : agendaEvents().length === 0 ? (
              <div className="text-center py-12">
                <CalIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm font-medium">No upcoming events</p>
                <button onClick={() => openCreate()} className="mt-3 text-blue-600 text-xs hover:underline">+ Create your first event</button>
              </div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const evs = agendaEvents(); let lastDay = "";
                  return evs.map((ev, i) => {
                    const dayLabel = fmtDate(ev.start_datetime);
                    const showDay = dayLabel !== lastDay; lastDay = dayLabel;
                    const meta = getEventMeta(ev.event_type);
                    return (
                      <div key={i}>
                        {showDay && (
                          <div className="flex items-center gap-2 mt-4 mb-1 first:mt-0">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isToday(new Date(ev.start_datetime)) ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>{dayLabel}</span>
                            <div className="flex-1 h-px bg-gray-100" />
                          </div>
                        )}
                        <div onClick={() => openEdit(ev)}
                          className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 hover:shadow-sm cursor-pointer transition-all group"
                          style={{ borderLeft: `3px solid ${ev.color}` }}>
                          <div className="shrink-0 mt-0.5">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>{meta.label}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate">{ev.title}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              {!ev.all_day && <span className="flex items-center gap-1 text-[10px] text-gray-500"><Clock className="w-3 h-3" />{fmtTime(ev.start_datetime)}{ev.end_datetime ? ` – ${fmtTime(ev.end_datetime)}` : ""}</span>}
                              {ev.location && <span className="flex items-center gap-1 text-[10px] text-gray-500 truncate max-w-[150px]"><MapPin className="w-3 h-3 shrink-0" />{ev.location}</span>}
                              {ev.recurrence !== "none" && <span className="flex items-center gap-1 text-[10px] text-blue-500"><Repeat className="w-3 h-3" />{RECURRENCES.find(r => r.id === ev.recurrence)?.label}</span>}
                              {ev.reminder_minutes > 0 && <span className="flex items-center gap-1 text-[10px] text-amber-500"><Bell className="w-3 h-3" />{REMINDERS.find(r => r.value === ev.reminder_minutes)?.label || `${ev.reminder_minutes}m before`}</span>}
                            </div>
                            {ev.description && <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{ev.description}</p>}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit2 className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600" />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

          </div>{/* end inner views column */}

          {/* ── Right Sidebar: Event List ── */}
          <div className="w-72 border-l bg-white flex flex-col shrink-0">
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-700 text-xs uppercase tracking-wider">
                  {viewMode === "month" && selectedDate
                    ? isToday(selectedDate) ? "Today's Events" : fmtDate(selectedDate.toISOString())
                    : "Upcoming Events"}
                </p>
                {viewMode === "month" && selectedDate && !isToday(selectedDate) && (
                  <p className="text-[10px] text-gray-400 mt-0.5">{DAYS_SHORT[selectedDate.getDay()]}, {MONTHS[selectedDate.getMonth()].slice(0,3)} {selectedDate.getDate()}</p>
                )}
              </div>
              <button onClick={loadEvents} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Event list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {(() => {
                const listEvs = viewMode === "month" && selectedDate
                  ? eventsOnDate(selectedDate)
                  : agendaEvents();
                if (loading) return (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-blue-400 animate-spin" /></div>
                );
                if (listEvs.length === 0) return (
                  <div className="text-center py-8">
                    <CalIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No events</p>
                    <button onClick={() => openCreate(viewMode === "month" && selectedDate ? selectedDate : undefined)}
                      className="mt-2 text-blue-600 text-xs hover:underline">+ Add event</button>
                  </div>
                );
                let lastDay = "";
                return listEvs.map((ev, i) => {
                  const meta = getEventMeta(ev.event_type);
                  const dayLabel = viewMode !== "month" ? fmtDate(ev.start_datetime) : "";
                  const showDay = viewMode !== "month" && dayLabel !== lastDay;
                  if (showDay) lastDay = dayLabel;
                  return (
                    <div key={i}>
                      {showDay && (
                        <div className="flex items-center gap-2 mt-3 mb-1 first:mt-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isToday(new Date(ev.start_datetime)) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>{dayLabel}</span>
                        </div>
                      )}
                      <div onClick={() => openEdit(ev)}
                        className="rounded-xl border border-gray-100 p-2.5 cursor-pointer hover:shadow-sm transition-all"
                        style={{ borderLeft: `3px solid ${ev.color}` }}>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <p className="font-semibold text-gray-800 text-xs leading-tight truncate">{ev.title}</p>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${meta.bg} ${meta.text}`}>{meta.label}</span>
                        </div>
                        {!ev.all_day && (
                          <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            {fmtTime(ev.start_datetime)}{ev.end_datetime ? ` – ${fmtTime(ev.end_datetime)}` : ""}
                          </p>
                        )}
                        {ev.location && (
                          <p className="text-[10px] text-gray-400 flex items-center gap-1 truncate mt-0.5">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />{ev.location}
                          </p>
                        )}
                        {ev.description && (
                          <p className="text-[10px] text-gray-300 mt-0.5 line-clamp-1">{ev.description}</p>
                        )}
                        {ev.recurrence !== "none" && (
                          <p className="text-[10px] text-blue-400 flex items-center gap-1 mt-0.5">
                            <Repeat className="w-2.5 h-2.5" />{RECURRENCES.find(r => r.id === ev.recurrence)?.label}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer: add event button */}
            <div className="px-3 py-2.5 border-t">
              <button onClick={() => openCreate(viewMode === "month" && selectedDate ? selectedDate : undefined)}
                className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Event
              </button>
            </div>
          </div>

        </div>{/* end flex flex-1 overflow-hidden */}
      </div>{/* end outer flex-col */}

      {/* ── Overflow day popup ── */}
      {overflowDay && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOverflowDay(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="font-bold text-gray-800 text-sm">{fmtDate(overflowDay.date.toISOString())}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => { setOverflowDay(null); openCreate(overflowDay.date); }}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><Plus className="w-3 h-3" />Add</button>
                <button onClick={() => setOverflowDay(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {overflowDay.events.map((ev, i) => {
                const meta = getEventMeta(ev.event_type);
                return (
                  <div key={i} onClick={() => { setOverflowDay(null); openEdit(ev); }}
                    className="flex items-start gap-2 rounded-xl border border-gray-100 px-3 py-2.5 cursor-pointer hover:shadow-sm"
                    style={{ borderLeft: `3px solid ${ev.color}` }}>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 shrink-0 ${meta.bg} ${meta.text}`}>{meta.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-xs truncate">{ev.title}</p>
                      {!ev.all_day && <p className="text-[10px] text-gray-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{fmtTime(ev.start_datetime)}{ev.end_datetime ? ` – ${fmtTime(ev.end_datetime)}` : ""}</p>}
                      {ev.location && <p className="text-[10px] text-gray-400 flex items-center gap-1 truncate"><MapPin className="w-2.5 h-2.5 shrink-0" />{ev.location}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <CalIcon className="w-4 h-4 text-blue-600" />
                {editingEvent ? "Edit Event" : "New Event"}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingEvent(null); }} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Title */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Event title..." autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
              </div>

              {/* Event type */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Event Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_TYPES.map(t => (
                    <button key={t.id} onClick={() => handleTypeChange(t.id)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all border
                        ${form.event_type === t.id ? `${t.bg} ${t.text} border-transparent shadow-sm scale-105` : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Event Color</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {COLOR_PRESETS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${form.color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
                      style={{ background: c }} />
                  ))}
                  <div className="relative">
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="w-6 h-6 rounded-full border-0 cursor-pointer opacity-0 absolute inset-0" />
                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-[9px] text-gray-400 cursor-pointer">+</div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-1">
                    <span className="w-4 h-4 rounded-full border border-gray-200" style={{ background: form.color }} />
                    <span className="text-[10px] text-gray-500 font-mono">{form.color}</span>
                  </div>
                </div>
              </div>

              {/* All-day toggle */}
              <div className="flex items-center gap-2">
                <button onClick={() => setForm(f => ({ ...f, all_day: !f.all_day }))}
                  className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${form.all_day ? "bg-blue-600" : "bg-gray-200"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.all_day ? "left-4.5 translate-x-0.5" : "left-0.5"}`} />
                </button>
                <span className="text-xs text-gray-600 font-medium">All-day event</span>
              </div>

              {/* Date/time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{form.all_day ? "Date" : "Start"}</label>
                  <input type={form.all_day ? "date" : "datetime-local"} value={form.all_day ? form.start_datetime.slice(0, 10) : form.start_datetime}
                    onChange={e => setForm(f => ({ ...f, start_datetime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-blue-400" />
                </div>
                {!form.all_day && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">End</label>
                    <input type="datetime-local" value={form.end_datetime || ""}
                      onChange={e => setForm(f => ({ ...f, end_datetime: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-blue-400" />
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Location</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Conference room, Zoom link, etc."
                    className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-blue-400" />
                </div>
              </div>

              {/* Recurrence + Reminder */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1 block"><Repeat className="w-3 h-3" /> Repeat</label>
                  <select value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-blue-400">
                    {RECURRENCES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1 block"><Bell className="w-3 h-3" /> Remind Me</label>
                  <select value={form.reminder_minutes} onChange={e => setForm(f => ({ ...f, reminder_minutes: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-blue-400">
                    {REMINDERS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Attendees */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1 block"><Users className="w-3 h-3" /> Attendees</label>
                <div className="flex gap-2">
                  <input type="text" value={attendeeInput} onChange={e => setAttendeeInput(e.target.value)}
                    onKeyDown={e => {
                      if ((e.key === "Enter" || e.key === ",") && attendeeInput.trim()) {
                        e.preventDefault();
                        setForm(f => ({ ...f, attendees: [...(f.attendees as string[]), attendeeInput.trim()] }));
                        setAttendeeInput("");
                      }
                    }}
                    placeholder="Name or email, press Enter"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-blue-400" />
                </div>
                {(form.attendees as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(form.attendees as string[]).map((a, i) => (
                      <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded-full border border-blue-100">
                        {a}
                        <button onClick={() => setForm(f => ({ ...f, attendees: (f.attendees as string[]).filter((_, j) => j !== i) }))}><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Notes / Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Meeting agenda, notes..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-blue-400 resize-none" />
              </div>

              {form.related_module && (
                <div className="text-[10px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  Linked to: <span className="font-semibold text-gray-600">{form.related_module} #{form.related_id}</span>
                </div>
              )}

              {notifPerm !== "granted" && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[10px] text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Enable browser notifications to receive reminders. Click "Enable Reminders" in the toolbar.</span>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center gap-2 px-5 py-4 border-t">
              {editingEvent && (
                <button onClick={() => deleteEvent(editingEvent.id)}
                  className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
              <div className="flex-1" />
              <button onClick={() => { setShowModal(false); setEditingEvent(null); }}
                className="text-gray-500 hover:text-gray-700 text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={saveEvent} disabled={saving || !form.title.trim()}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {editingEvent ? "Update" : "Save Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reminder Settings Modal ── */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">Reminder Settings</h2>
                  <p className="text-blue-100 text-[11px]">Configure how you receive event alerts</p>
                </div>
              </div>
              <button onClick={() => setShowReminderModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* ── Default Reminder Time ── */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-sm font-semibold text-gray-800">Default Reminder Time</span>
                </div>
                <p className="text-[11px] text-gray-500">Applied automatically when creating new events.</p>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { value: 0, label: "At time" },
                    { value: 5, label: "5 min" },
                    { value: 10, label: "10 min" },
                    { value: 15, label: "15 min" },
                    { value: 30, label: "30 min" },
                    { value: 60, label: "1 hour" },
                    { value: 120, label: "2 hours" },
                    { value: 1440, label: "1 day" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setDefaultReminderMins(opt.value); localStorage.setItem("cal_default_reminder", String(opt.value)); }}
                      className={`text-[11px] font-semibold px-2 py-1.5 rounded-lg border transition-colors ${
                        defaultReminderMins === opt.value
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Channel Toggles ── */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1">Notification Channels</p>

                {/* Browser toggle */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800">Browser Notifications</p>
                      <p className="text-[10px] text-gray-500">Pop-up alerts when this tab is open</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (notifPerm === "denied") return;
                        if (notifPerm === "default") {
                          const perm = await Notification.requestPermission();
                          setNotifPerm(perm);
                          if (perm === "granted") { setBrowserEnabled(true); localStorage.setItem("cal_browser_enabled", "true"); }
                          return;
                        }
                        const next = !browserEnabled;
                        setBrowserEnabled(next);
                        localStorage.setItem("cal_browser_enabled", String(next));
                      }}
                      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none ${
                        notifPerm === "granted" && browserEnabled ? "bg-blue-600" : "bg-gray-300"
                      } ${notifPerm === "denied" ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        notifPerm === "granted" && browserEnabled ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {notifPerm === "denied" && (
                    <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 space-y-1.5">
                      <p className="text-[10px] text-red-700 font-semibold">Blocked by browser — to unblock:</p>
                      <ol className="text-[10px] text-red-700 space-y-1 pl-1">
                        <li>1. Click the <strong>lock/info icon</strong> in the address bar</li>
                        <li>2. Set <strong>Notifications → Allow</strong></li>
                        <li>3. Reload the page</li>
                      </ol>
                    </div>
                  )}
                  {notifPerm === "default" && (
                    <button
                      onClick={async () => { const p = await Notification.requestPermission(); setNotifPerm(p); if (p === "granted") { setBrowserEnabled(true); localStorage.setItem("cal_browser_enabled", "true"); } }}
                      className="w-full text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg py-1.5 hover:bg-blue-100 transition-colors"
                    >
                      Click to request permission →
                    </button>
                  )}
                  {notifPerm === "granted" && (
                    <p className="text-[10px] text-emerald-600">✓ Permission granted — toggle above to enable/disable alerts</p>
                  )}
                </div>

                {/* WhatsApp toggle */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="text-base">📲</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800">WhatsApp Reminders</p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {userPhone ? `Sent to ${userPhone}` : "No phone configured"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (!userPhone) return;
                        const next = !waEnabled;
                        setWaEnabled(next);
                        localStorage.setItem("cal_wa_enabled", String(next));
                      }}
                      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none ${
                        userPhone && waEnabled ? "bg-emerald-500" : "bg-gray-300"
                      } ${!userPhone ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        userPhone && waEnabled ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {userPhone ? (
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-emerald-700">
                        ✓ {phoneSource === "erpnext" ? "From ERPNext profile" : "From notification settings"}
                      </p>
                      <button
                        onClick={() => { sendTestReminder(); }}
                        disabled={testReminderStatus === "sending" || !waEnabled}
                        className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      >
                        {testReminderStatus === "sending" && <Loader2 className="w-3 h-3 animate-spin" />}
                        {testReminderStatus === "ok" && <Check className="w-3 h-3 text-emerald-600" />}
                        {testReminderStatus === "fail" && <AlertCircle className="w-3 h-3 text-red-500" />}
                        {testReminderStatus === "idle" || testReminderStatus === "fail" ? "Send Test" : testReminderStatus === "ok" ? "Sent!" : "Sending…"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-500">Add your number in <strong>Settings → Notifications</strong> or via ERPNext employee profile.</p>
                  )}
                </div>
              </div>

              {/* ── Summary ── */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-1.5">Active Channels</p>
                <div className="flex gap-2 flex-wrap">
                  {notifPerm === "granted" && browserEnabled
                    ? <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">🔔 Browser</span>
                    : <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-semibold line-through">🔔 Browser</span>
                  }
                  {userPhone && waEnabled
                    ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">📲 WhatsApp</span>
                    : <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-semibold line-through">📲 WhatsApp</span>
                  }
                  {!((notifPerm === "granted" && browserEnabled) || (userPhone && waEnabled)) && (
                    <span className="text-[10px] text-amber-600 font-medium">⚠ No channels active — reminders won't be sent</span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setShowReminderModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-6 py-2 rounded-xl transition-colors">
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
