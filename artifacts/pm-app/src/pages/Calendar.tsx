import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "wouter";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, X, Bell, BellOff,
  Clock, MapPin, Users, Repeat, Trash2, Edit2, Check, AlertCircle,
  RefreshCw, Calendar as CalIcon, List, Loader2, Copy,
} from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/pm-app$/, "") + "/api-server/api";

// ── Event types ──────────────────────────────────────────────────────────────
const EVENT_TYPES = [
  { id: "meeting",    label: "Meeting",        color: "#3b82f6", bg: "bg-blue-100",    text: "text-blue-800"    },
  { id: "followup",   label: "Follow-up",      color: "#8b5cf6", bg: "bg-violet-100",  text: "text-violet-800"  },
  { id: "standup",    label: "Daily Standup",  color: "#10b981", bg: "bg-emerald-100", text: "text-emerald-800" },
  { id: "reminder",   label: "Reminder",       color: "#f59e0b", bg: "bg-amber-100",   text: "text-amber-800"   },
  { id: "task",       label: "Task Deadline",  color: "#ef4444", bg: "bg-red-100",     text: "text-red-800"     },
  { id: "call",       label: "Call",           color: "#06b6d4", bg: "bg-cyan-100",    text: "text-cyan-800"    },
  { id: "personal",   label: "Personal",       color: "#64748b", bg: "bg-slate-100",   text: "text-slate-800"   },
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
  { value: 5,    label: "5 minutes before" },
  { value: 10,   label: "10 minutes before" },
  { value: 15,   label: "15 minutes before" },
  { value: 30,   label: "30 minutes before" },
  { value: 60,   label: "1 hour before" },
  { value: 120,  label: "2 hours before" },
  { value: 1440, label: "1 day before" },
];

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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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
function toLocalInput(dt: string) {
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toDateInput(dt: string) {
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function getEventMeta(type: string) {
  return EVENT_TYPES.find(t => t.id === type) || EVENT_TYPES[0];
}

// Expand recurring events into a date range
function expandRecurring(events: CalEvent[], rangeStart: Date, rangeEnd: Date): CalEvent[] {
  const result: CalEvent[] = [];
  for (const ev of events) {
    const base = new Date(ev.start_datetime);
    if (ev.recurrence === "none" || !ev.recurrence) {
      result.push(ev);
      continue;
    }
    let cur = new Date(base);
    while (cur <= rangeEnd) {
      if (cur >= rangeStart) {
        const diff = cur.getTime() - base.getTime();
        const newStart = new Date(ev.start_datetime);
        newStart.setTime(newStart.getTime() + diff);
        const newEnd = ev.end_datetime ? new Date(new Date(ev.end_datetime).getTime() + diff) : undefined;
        result.push({
          ...ev,
          id: ev.id * 100000 + Math.floor(diff / 86400000),
          start_datetime: newStart.toISOString(),
          end_datetime: newEnd?.toISOString(),
        });
      }
      if (ev.recurrence === "daily")   cur.setDate(cur.getDate() + 1);
      else if (ev.recurrence === "weekday") {
        do { cur.setDate(cur.getDate() + 1); } while (cur.getDay() === 0 || cur.getDay() === 6);
      }
      else if (ev.recurrence === "weekly")  cur.setDate(cur.getDate() + 7);
      else if (ev.recurrence === "monthly") cur.setMonth(cur.getMonth() + 1);
      else break;
    }
  }
  return result;
}

// ── Reminder notification engine ──────────────────────────────────────────────
const FIRED_KEY = "cal_fired_reminders";
function getFiredSet(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || "[]")); }
  catch { return new Set(); }
}
function markFired(key: string) {
  const s = getFiredSet(); s.add(key);
  const arr = Array.from(s).slice(-200);
  localStorage.setItem(FIRED_KEY, JSON.stringify(arr));
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

// ── Blank event form ──────────────────────────────────────────────────────────
function blankForm(defaults?: Partial<CalEvent>) {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  const end = new Date(now); end.setHours(end.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    title: defaults?.title || "",
    description: defaults?.description || "",
    start_datetime: defaults?.start_datetime ? toLocalInput(defaults.start_datetime) : fmt(now),
    end_datetime: defaults?.end_datetime ? toLocalInput(defaults.end_datetime) : fmt(end),
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
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>("default");
  const [attendeeInput, setAttendeeInput] = useState("");
  const reminderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check notification permission
  useEffect(() => {
    if ("Notification" in window) setNotifPerm(Notification.permission);
  }, []);

  const requestNotifPerm = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotifPerm(perm);
    }
  };

  // Load events
  const loadEvents = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
      const end   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0, 23, 59, 59).toISOString();
      const r = await fetch(`${API}/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      const data: CalEvent[] = await r.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, [currentDate, user?.email]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Reminder engine — checks every 60 seconds
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

  // Handle URL params for "Add to Calendar" from other modules
  useEffect(() => {
    const title = params.get("title");
    const date  = params.get("date");
    const type  = params.get("type");
    const rel   = params.get("related");
    const relId = params.get("relatedId");
    if (title) {
      const dateStr = date ? `${date}T09:00` : undefined;
      const endStr  = date ? `${date}T10:00` : undefined;
      setForm(blankForm({
        title,
        start_datetime: dateStr,
        end_datetime: endStr,
        event_type: type || "reminder",
        related_module: rel || undefined,
        related_id: relId || undefined,
      }));
      setShowModal(true);
    }
  }, []);

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const rangeStart = new Date(year, month - 1, 1);
  const rangeEnd   = new Date(year, month + 2, 0, 23, 59, 59);
  const expanded = expandRecurring(events, rangeStart, rangeEnd);

  function eventsOnDate(d: Date): CalEvent[] {
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return expanded.filter(ev => ev.start_datetime.startsWith(ds))
      .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
  }

  function selectedDateEvents(): CalEvent[] {
    if (!selectedDate) return [];
    return eventsOnDate(selectedDate);
  }

  function agendaEvents(): CalEvent[] {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const future = new Date(now); future.setDate(future.getDate() + 30);
    return expandRecurring(events, now, future)
      .filter(ev => new Date(ev.start_datetime) >= now)
      .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const openCreate = (d?: Date) => {
    const base = d || selectedDate || new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ds = `${base.getFullYear()}-${pad(base.getMonth()+1)}-${pad(base.getDate())}`;
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
    const f = blankForm({
      start_datetime: `${ds}T${pad(now.getHours())}:${pad(now.getMinutes())}`,
      end_datetime:   `${ds}T${pad(now.getHours()+1)}:${pad(now.getMinutes())}`,
    });
    setForm(f); setEditingEvent(null); setShowModal(true);
  };

  const openEdit = (ev: CalEvent) => {
    setForm({
      title: ev.title,
      description: ev.description || "",
      start_datetime: toLocalInput(ev.start_datetime),
      end_datetime: ev.end_datetime ? toLocalInput(ev.end_datetime) : "",
      all_day: ev.all_day,
      event_type: ev.event_type,
      color: ev.color,
      recurrence: ev.recurrence,
      reminder_minutes: ev.reminder_minutes,
      location: ev.location || "",
      attendees: ev.attendees ? (typeof ev.attendees === "string" ? JSON.parse(ev.attendees) : ev.attendees) : [],
      related_module: ev.related_module || "",
      related_id: ev.related_id || "",
    });
    setEditingEvent(ev); setShowModal(true);
  };

  const saveEvent = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        start_datetime: new Date(form.start_datetime).toISOString(),
        end_datetime: form.end_datetime ? new Date(form.end_datetime).toISOString() : null,
        created_by: user?.email,
        attendees: form.attendees,
      };
      if (editingEvent) {
        await fetch(`${API}/calendar/events/${editingEvent.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch(`${API}/calendar/events`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setShowModal(false); setEditingEvent(null);
      await loadEvents();
    } finally { setSaving(false); }
  };

  const deleteEvent = async (id: number) => {
    if (!confirm("Delete this event?")) return;
    await fetch(`${API}/calendar/events/${id}`, { method: "DELETE" });
    setShowModal(false); setEditingEvent(null);
    await loadEvents();
  };

  // Auto-sync color with event_type
  const handleTypeChange = (type: string) => {
    const meta = getEventMeta(type);
    setForm(f => ({ ...f, event_type: type, color: meta.color }));
  };

  const isToday = (d: Date) =>
    d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

  const isSelected = (d: Date) =>
    selectedDate && d.getDate() === selectedDate.getDate() &&
    d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50 min-h-screen">
        {/* ── Top bar ── */}
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3 flex-wrap shadow-sm">
          <div className="flex items-center gap-2 flex-1">
            <CalIcon className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-gray-800 text-sm">Calendar & Reminders</span>
          </div>

          {/* Notification permission */}
          {notifPerm !== "granted" && (
            <button onClick={requestNotifPerm}
              className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
              <Bell className="w-3.5 h-3.5" /> Enable Reminders
            </button>
          )}
          {notifPerm === "granted" && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
              <Bell className="w-3 h-3" /> Reminders Active
            </span>
          )}

          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
            {([{ id: "month", icon: CalIcon, label: "Month" }, { id: "agenda", icon: List, label: "Agenda" }] as const).map(v => (
              <button key={v.id} onClick={() => setViewMode(v.id)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors
                  ${viewMode === v.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}>
                <v.icon className="w-3.5 h-3.5" />{v.label}
              </button>
            ))}
          </div>

          <button onClick={() => openCreate()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> New Event
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Main calendar area ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {viewMode === "month" ? (
              <>
                {/* Month nav */}
                <div className="flex items-center gap-3 px-4 py-3 bg-white border-b">
                  <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <h2 className="font-bold text-gray-800 text-base flex-1 text-center">
                    {MONTHS[month]} {year}
                  </h2>
                  <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
                    className="text-xs text-blue-600 font-medium hover:underline px-2">Today</button>
                  {loading && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 border-b bg-gray-50">
                  {DAYS.map(d => (
                    <div key={d} className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-auto">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`pre-${i}`} className="border-b border-r bg-gray-50/60 min-h-[90px]" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = new Date(year, month, i + 1);
                    const dayEvs = eventsOnDate(d);
                    const todayCell = isToday(d);
                    const selCell = isSelected(d);
                    return (
                      <div key={i}
                        onClick={() => { setSelectedDate(d); }}
                        className={`border-b border-r min-h-[90px] p-1 cursor-pointer transition-colors
                          ${todayCell ? "bg-blue-50" : "bg-white hover:bg-gray-50"}
                          ${selCell ? "ring-2 ring-inset ring-blue-400" : ""}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                            ${todayCell ? "bg-blue-600 text-white" : "text-gray-700"}`}>
                            {i + 1}
                          </span>
                          {selCell && (
                            <button onClick={(e) => { e.stopPropagation(); openCreate(d); }}
                              className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors">
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvs.slice(0, 3).map((ev, ei) => {
                            const meta = getEventMeta(ev.event_type);
                            return (
                              <div key={ei}
                                onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                                className="flex items-center gap-1 rounded px-1 py-0.5 text-[9px] font-semibold truncate cursor-pointer hover:opacity-80 transition-opacity"
                                style={{ background: `${ev.color}20`, color: ev.color }}>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ev.color }} />
                                <span className="truncate">
                                  {!ev.all_day && fmtTime(ev.start_datetime) + " "}
                                  {ev.title}
                                </span>
                                {ev.recurrence !== "none" && <Repeat className="w-2 h-2 shrink-0" />}
                              </div>
                            );
                          })}
                          {dayEvs.length > 3 && (
                            <div className="text-[9px] text-gray-400 font-medium pl-1">
                              +{dayEvs.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* ── Agenda view ── */
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-800 text-sm">Next 30 Days</h2>
                  <button onClick={loadEvents} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
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
                      const evs = agendaEvents();
                      let lastDay = "";
                      return evs.map((ev, i) => {
                        const dayLabel = fmtDate(ev.start_datetime);
                        const showDay = dayLabel !== lastDay;
                        lastDay = dayLabel;
                        const meta = getEventMeta(ev.event_type);
                        return (
                          <div key={i}>
                            {showDay && (
                              <div className="flex items-center gap-2 mt-4 mb-1 first:mt-0">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                                  ${isToday(new Date(ev.start_datetime)) ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
                                  {dayLabel}
                                </span>
                                <div className="flex-1 h-px bg-gray-100" />
                              </div>
                            )}
                            <div
                              onClick={() => openEdit(ev)}
                              className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 hover:shadow-sm cursor-pointer transition-all group"
                              style={{ borderLeft: `3px solid ${ev.color}` }}>
                              <div className="shrink-0 mt-0.5">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
                                  {meta.label}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 text-sm truncate">{ev.title}</p>
                                <div className="flex flex-wrap items-center gap-3 mt-1">
                                  {!ev.all_day && (
                                    <span className="flex items-center gap-1 text-[10px] text-gray-500">
                                      <Clock className="w-3 h-3" />
                                      {fmtTime(ev.start_datetime)}{ev.end_datetime ? ` – ${fmtTime(ev.end_datetime)}` : ""}
                                    </span>
                                  )}
                                  {ev.location && (
                                    <span className="flex items-center gap-1 text-[10px] text-gray-500 truncate max-w-[150px]">
                                      <MapPin className="w-3 h-3 shrink-0" />{ev.location}
                                    </span>
                                  )}
                                  {ev.recurrence !== "none" && (
                                    <span className="flex items-center gap-1 text-[10px] text-blue-500">
                                      <Repeat className="w-3 h-3" />
                                      {RECURRENCES.find(r => r.id === ev.recurrence)?.label}
                                    </span>
                                  )}
                                  {ev.reminder_minutes > 0 && (
                                    <span className="flex items-center gap-1 text-[10px] text-amber-500">
                                      <Bell className="w-3 h-3" />
                                      {REMINDERS.find(r => r.value === ev.reminder_minutes)?.label || `${ev.reminder_minutes}m before`}
                                    </span>
                                  )}
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
          </div>

          {/* ── Right sidebar: selected day events ── */}
          <div className="w-72 border-l bg-white flex flex-col shrink-0 hidden lg:flex">
            <div className="px-4 py-3 border-b">
              <p className="font-bold text-gray-700 text-xs uppercase tracking-wider">
                {selectedDate
                  ? isToday(selectedDate) ? "Today" : fmtDate(selectedDate.toISOString())
                  : "Select a day"}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {selectedDateEvents().length === 0 ? (
                <div className="text-center py-8">
                  <CalIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No events</p>
                  <button onClick={() => openCreate(selectedDate || undefined)}
                    className="mt-2 text-blue-600 text-xs hover:underline">+ Add event</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents().map((ev, i) => {
                    const meta = getEventMeta(ev.event_type);
                    return (
                      <div key={i} onClick={() => openEdit(ev)}
                        className="rounded-xl border border-gray-100 p-3 cursor-pointer hover:shadow-sm transition-all"
                        style={{ borderLeft: `3px solid ${ev.color}` }}>
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-semibold text-gray-800 text-xs leading-tight">{ev.title}</p>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${meta.bg} ${meta.text}`}>{meta.label}</span>
                        </div>
                        {!ev.all_day && (
                          <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {fmtTime(ev.start_datetime)}{ev.end_datetime ? ` – ${fmtTime(ev.end_datetime)}` : ""}
                          </p>
                        )}
                        {ev.location && (
                          <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />{ev.location}
                          </p>
                        )}
                        {ev.description && (
                          <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{ev.description}</p>
                        )}
                        {ev.recurrence !== "none" && (
                          <p className="text-[10px] text-blue-500 mt-1 flex items-center gap-1">
                            <Repeat className="w-2.5 h-2.5" />
                            {RECURRENCES.find(r => r.id === ev.recurrence)?.label}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-3 py-2 border-t">
              <button onClick={() => openCreate(selectedDate || undefined)}
                className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <CalIcon className="w-4 h-4 text-blue-600" />
                {editingEvent ? "Edit Event" : "New Event"}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingEvent(null); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Title */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Event title..."
                  autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
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

              {/* All-day toggle */}
              <div className="flex items-center gap-2">
                <button onClick={() => setForm(f => ({ ...f, all_day: !f.all_day }))}
                  className={`w-9 h-5 rounded-full transition-colors relative shrink-0
                    ${form.all_day ? "bg-blue-600" : "bg-gray-200"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                    ${form.all_day ? "left-4.5 translate-x-0.5" : "left-0.5"}`} />
                </button>
                <span className="text-xs text-gray-600 font-medium">All-day event</span>
              </div>

              {/* Date/time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                    {form.all_day ? "Date" : "Start"}
                  </label>
                  <input
                    type={form.all_day ? "date" : "datetime-local"}
                    value={form.all_day ? form.start_datetime.slice(0, 10) : form.start_datetime}
                    onChange={e => setForm(f => ({ ...f, start_datetime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-blue-400"
                  />
                </div>
                {!form.all_day && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">End</label>
                    <input
                      type="datetime-local"
                      value={form.end_datetime || ""}
                      onChange={e => setForm(f => ({ ...f, end_datetime: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Location</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Conference room, Zoom link, etc."
                    className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Recurrence + Reminder */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
                    <Repeat className="w-3 h-3" /> Repeat
                  </label>
                  <select
                    value={form.recurrence}
                    onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-blue-400">
                    {RECURRENCES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
                    <Bell className="w-3 h-3" /> Remind Me
                  </label>
                  <select
                    value={form.reminder_minutes}
                    onChange={e => setForm(f => ({ ...f, reminder_minutes: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-blue-400">
                    {REMINDERS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Attendees */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
                  <Users className="w-3 h-3" /> Attendees
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={attendeeInput}
                    onChange={e => setAttendeeInput(e.target.value)}
                    onKeyDown={e => {
                      if ((e.key === "Enter" || e.key === ",") && attendeeInput.trim()) {
                        e.preventDefault();
                        setForm(f => ({ ...f, attendees: [...(f.attendees as string[]), attendeeInput.trim()] }));
                        setAttendeeInput("");
                      }
                    }}
                    placeholder="Name or email, press Enter"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-blue-400"
                  />
                </div>
                {(form.attendees as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(form.attendees as string[]).map((a, i) => (
                      <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded-full border border-blue-100">
                        {a}
                        <button onClick={() => setForm(f => ({ ...f, attendees: (f.attendees as string[]).filter((_, j) => j !== i) }))}>
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Notes / Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Meeting agenda, follow-up notes..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-blue-400 resize-none"
                />
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
                className="text-gray-500 hover:text-gray-700 text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button onClick={saveEvent} disabled={saving || !form.title.trim()}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {editingEvent ? "Update" : "Save Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
