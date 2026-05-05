import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Layout } from "@/components/Layout";
import {
  Timer, RefreshCw, Loader2, MapPin, Download, Calendar,
  Users, Clock, List, X, LogIn, LogOut, Wifi,
  Activity, BarChart3, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface HrmsUser { erp_employee_id: string; employee_name: string; department: string | null; designation: string | null; }
interface EmpLocation { erp_employee_id: string; employee_name: string; department: string | null; designation: string | null; latitude: number; longitude: number; location_name: string | null; accuracy: number | null; is_checked_in: boolean; last_seen: string; }
interface WorkSession { id: number; erp_employee_id: string; employee_name: string; department: string | null; designation: string | null; work_date: string; check_in_time: string | null; check_out_time: string | null; duration_minutes: number | null; check_in_location: string | null; check_out_location: string | null; check_in_lat: number | null; check_in_lng: number | null; check_out_lat: number | null; check_out_lng: number | null; }
interface AttendanceLog { id: number; log_type: "IN" | "OUT"; latitude: number | null; longitude: number | null; location_name: string | null; created_at: string; }
interface DayData { sessions: WorkSession[]; logs: AttendanceLog[]; location: EmpLocation | null; }

function fmtTime(iso: string | null) { if (!iso) return "—"; try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } }
function fmtTimeFull(iso: string) { try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); } catch { return iso; } }
function fmtDateShort(d: string) { try { return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" }); } catch { return d; } }
function fmtDuration(mins: number | null) { if (mins == null) return "—"; const h = Math.floor(mins / 60), m = mins % 60; return h > 0 ? `${h}h ${m}m` : `${m}m`; }
function timeAgo(iso: string) { try { const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (d < 1) return "just now"; if (d < 60) return `${d}m ago`; if (d < 1440) return `${Math.floor(d / 60)}h ago`; return `${Math.floor(d / 1440)}d ago`; } catch { return ""; } }
function avatarColor(s: string) { const palette = ["#1a3fbd", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626", "#db2777", "#4f46e5"]; let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return palette[h % palette.length]; }
function initials(name: string) { const p = name.trim().split(/\s+/); return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase(); }

function Avatar({ name, empId, size = 36, fontSize = 12 }: { name: string; empId: string; size?: number; fontSize?: number }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", background: avatarColor(empId), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ color: "white", fontSize, fontWeight: 700 }}>{initials(name)}</span></div>;
}
function LiveBadge({ on }: { on: boolean }) { return on ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Checked In</span> : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">Checked Out</span>; }
function DurPill({ mins }: { mins: number | null }) { if (mins == null) return <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Active</span>; const cls = mins >= 480 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : mins >= 240 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-600 border-red-200"; return <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}>{fmtDuration(mins)}</span>; }
function makeIcon(isIn: boolean, label: string, selected = false) { const bg = isIn ? "#16a34a" : "#64748b"; const ring = selected ? "#1a3fbd" : isIn ? "#bbf7d0" : "#e2e8f0"; const sz = selected ? 40 : 32, inner = selected ? 28 : 22; return L.divIcon({ className: "", html: `<div style="display:flex;align-items:center;justify-content:center;width:${sz}px;height:${sz}px;border-radius:50%;background:${ring};box-shadow:0 2px 10px rgba(0,0,0,.2)"><div style="width:${inner}px;height:${inner}px;border-radius:50%;background:${bg};border:2.5px solid white;display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:8px;font-weight:800;font-family:sans-serif">${label}</span></div></div>`, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2], popupAnchor: [0, -sz / 2 - 4] }); }
function makeDotIcon(isIn: boolean) { const bg = isIn ? "#1a3fbd" : "#ef4444"; return L.divIcon({ className: "", html: `<div style="width:12px;height:12px;border-radius:50%;background:${bg};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] }); }

export default function HrmsWorkMonitor() {
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [users, setUsers] = useState<HrmsUser[]>([]);
  const [locations, setLocations] = useState<EmpLocation[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<HrmsUser | null>(null);
  const [dayDate, setDayDate] = useState(today);
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [tab, setTab] = useState<"overview" | "timeline" | "map">("overview");
  const empRowRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mMarkersRef = useRef<L.Marker[]>([]);

  const loadUsers = useCallback(async () => { try { const r = await fetch(`${BASE}/api/hrms/hrms-users`); const d = await r.json(); setUsers(d.data || []); } catch {} }, []);
  const loadLocations = useCallback(async (silent = false) => { if (!silent) setLiveLoading(true); try { const r = await fetch(`${BASE}/api/hrms/employee-locations`); const d = await r.json(); setLocations(d.data || []); setLastRefresh(new Date()); } catch {} if (!silent) setLiveLoading(false); }, []);
  const loadSessions = useCallback(async () => { setLoading(true); try { const p = new URLSearchParams({ date_from: dateFrom, date_to: dateTo }); const r = await fetch(`${BASE}/api/hrms/work-sessions?${p}`); const d = await r.json(); setSessions(d.data || []); } catch (e) { toast({ title: "Failed to load sessions", description: String(e), variant: "destructive" }); } finally { setLoading(false); } }, [dateFrom, dateTo, toast]);
  const loadDayData = useCallback(async (empId: string, date: string) => { setDayLoading(true); setDayData(null); try { const p = new URLSearchParams({ employee: empId, date }); const r = await fetch(`${BASE}/api/hrms/employee-day?${p}`); setDayData(await r.json()); } catch (e) { toast({ title: "Failed to load employee data", description: String(e), variant: "destructive" }); } finally { setDayLoading(false); } }, [toast]);
  const refreshAll = useCallback(async () => { setLiveLoading(true); await Promise.all([loadLocations(true), loadSessions()]); if (selected) await loadDayData(selected.erp_employee_id, dayDate); setLastRefresh(new Date()); setLiveLoading(false); toast({ title: "Refreshed", description: "All live data updated." }); }, [loadLocations, loadSessions, selected, dayDate, loadDayData, toast]);

  useEffect(() => { loadUsers(); loadLocations(); loadSessions(); }, []);
  useEffect(() => { loadSessions(); }, [dateFrom, dateTo]);
  useEffect(() => { if (selected) loadDayData(selected.erp_employee_id, dayDate); }, [selected, dayDate]);
  useEffect(() => { const t = setInterval(() => { loadLocations(true); if (selected) loadDayData(selected.erp_employee_id, dayDate); }, 30_000); return () => clearInterval(t); }, [loadLocations, selected, dayDate, loadDayData]);

  const locMap = new Map(locations.map(l => [l.erp_employee_id, l]));
  const allEmps: (HrmsUser & { loc?: EmpLocation })[] = users.map(u => ({ ...u, loc: locMap.get(u.erp_employee_id) }));
  locations.forEach(l => { if (!users.find(u => u.erp_employee_id === l.erp_employee_id)) allEmps.push({ erp_employee_id: l.erp_employee_id, employee_name: l.employee_name, department: l.department, designation: l.designation, loc: l }); });
  const liveCount = locations.filter(l => l.is_checked_in).length;
  const filtered = sessions.filter(s => !search || s.employee_name.toLowerCase().includes(search.toLowerCase()) || s.erp_employee_id.toLowerCase().includes(search.toLowerCase()) || (s.department || "").toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (tab !== "map" || !selected || !mapDivRef.current) return;
    if (!mapRef.current) { const m = L.map(mapDivRef.current, { zoomControl: true }); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(m); m.setView([20.5937, 78.9629], 5); mapRef.current = m; }
    const map = mapRef.current;
    mMarkersRef.current.forEach(m => m.remove()); mMarkersRef.current = [];
    const bounds: [number, number][] = [];
    const loc = dayData?.location;
    if (loc) { const mk = L.marker([loc.latitude, loc.longitude], { icon: makeIcon(loc.is_checked_in, initials(selected.employee_name), true) }).bindPopup(`<b>${selected.employee_name}</b><br>${loc.location_name || ""}<br><small>${timeAgo(loc.last_seen)}</small>`).addTo(map).openPopup(); mMarkersRef.current.push(mk); bounds.push([loc.latitude, loc.longitude]); }
    dayData?.logs.filter(l => l.latitude && l.longitude).forEach(l => { const mk = L.marker([l.latitude!, l.longitude!], { icon: makeDotIcon(l.log_type === "IN") }).bindPopup(`<b>${l.log_type === "IN" ? "Check In" : "Check Out"}</b><br>${fmtTimeFull(l.created_at)}<br><small>${l.location_name || ""}</small>`).addTo(map); mMarkersRef.current.push(mk); bounds.push([l.latitude!, l.longitude!]); });
    if (bounds.length) { try { map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 }); } catch {} }
    setTimeout(() => map?.invalidateSize(), 120);
  }, [tab, dayData, selected]);
  useEffect(() => { if (tab !== "map" && mapRef.current) { mapRef.current.remove(); mapRef.current = null; mMarkersRef.current = []; } }, [tab]);
  useEffect(() => { if (!selected && mapRef.current) { mapRef.current.remove(); mapRef.current = null; mMarkersRef.current = []; } }, [selected]);

  const exportCsv = () => {
    const hdr = ["Employee ID", "Name", "Department", "Date", "Check In", "Check Out", "Duration", "Check-In Location", "Check-Out Location"];
    const rows = filtered.map(s => [s.erp_employee_id, s.employee_name, s.department || "", s.work_date, fmtTime(s.check_in_time), fmtTime(s.check_out_time), fmtDuration(s.duration_minutes), s.check_in_location || "", s.check_out_location || ""]);
    const csv = [hdr, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `work-sessions-${dateFrom}-${dateTo}.csv`; a.click();
  };

  const dayMins = dayData?.sessions.reduce((a, s) => a + (s.duration_minutes ?? 0), 0) ?? 0;
  const totalMins = filtered.reduce((a, s) => a + (s.duration_minutes ?? 0), 0);

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f0f4fa] overflow-hidden">
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 shrink-0 shadow-sm">
          <Activity className="w-4 h-4 text-[#1a3fbd] shrink-0" />
          <h1 className="text-sm font-extrabold text-gray-900 tracking-tight">Work Monitor</h1>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{liveCount} Live</span>
          <span className="text-[11px] text-gray-300 hidden md:block ml-1">Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={refreshAll} disabled={liveLoading} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#1a3fbd] hover:bg-[#1535a8] disabled:opacity-60 transition shadow-sm shadow-blue-200">{liveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}Get Live Data</button>
          </div>
        </div>

        <div className="px-6 pt-3 flex gap-2 flex-wrap shrink-0">
          {[{ icon: Users, label: "Employees", val: users.length, col: "text-[#1a3fbd]", bg: "bg-blue-50" }, { icon: Activity, label: "On Map", val: locations.length, col: "text-sky-600", bg: "bg-sky-50" }, { icon: Timer, label: "Sessions", val: filtered.length, col: "text-violet-600", bg: "bg-violet-50" }, { icon: Clock, label: "Total Hours", val: fmtDuration(totalMins), col: "text-emerald-700", bg: "bg-emerald-50" }, { icon: BarChart3, label: "Active Now", val: filtered.filter(s => !s.check_out_time).length, col: "text-rose-600", bg: "bg-rose-50" }].map(({ icon: Icon, label, val, col, bg }) => <div key={label} className={`flex items-center gap-2 ${bg} border border-gray-200 rounded-2xl px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]`}><Icon className={`w-3.5 h-3.5 ${col} shrink-0`} /><span className="text-sm font-bold text-gray-700">{val}</span><span className="text-[11px] text-gray-400">{label}</span></div>)}
        </div>

        <div className="shrink-0 px-6 pt-3 flex items-center gap-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest shrink-0">Select Employee</p>
          <button onClick={() => empRowRef.current?.scrollBy({ left: -200, behavior: "smooth" })} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition shrink-0"><ChevronLeft className="w-4 h-4" /></button>
          <div ref={empRowRef} className="flex gap-2 overflow-x-auto pb-1 flex-1" style={{ scrollbarWidth: "none" }}>
            {allEmps.map(emp => {
              const live = emp.loc?.is_checked_in ?? false;
              const isSel = selected?.erp_employee_id === emp.erp_employee_id;
              return <button key={emp.erp_employee_id} onClick={() => { setSelected(emp); setDayDate(today); setTab("overview"); }} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all shrink-0 shadow-sm ${isSel ? "bg-[#1a3fbd] border-[#1a3fbd] text-white shadow-blue-200 shadow-md scale-[1.03]" : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-md hover:scale-[1.02]"}`}><div className="relative shrink-0"><div style={{ width: 34, height: 34, borderRadius: "50%", background: isSel ? "rgba(255,255,255,0.25)" : avatarColor(emp.erp_employee_id), display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>{initials(emp.employee_name)}</span></div><div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${isSel ? "border-[#1a3fbd]" : "border-white"} ${live ? "bg-emerald-400" : "bg-gray-300"}`} /></div><div className="min-w-0"><p className={`text-xs font-bold truncate max-w-[90px] ${isSel ? "text-white" : "text-gray-800"}`}>{emp.employee_name}</p><p className={`text-[10px] truncate max-w-[90px] ${isSel ? "text-blue-100" : "text-gray-400"}`}>{emp.department || emp.designation || "—"}</p></div></button>;
            })}
          </div>
          <button onClick={() => empRowRef.current?.scrollBy({ left: 200, behavior: "smooth" })} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition shrink-0"><ChevronRight className="w-4 h-4" /></button>
          {selected && <button onClick={() => { setSelected(null); setDayData(null); }} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-gray-500 bg-white border border-gray-200 hover:border-red-300 hover:text-red-500 transition shrink-0"><X className="w-3.5 h-3.5" />Clear</button>}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {!selected ? (
            <div className="flex flex-col gap-3 h-full">
              <div className="flex flex-wrap gap-2 shrink-0">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm text-xs"><Calendar className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-400">From</span><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="font-medium text-gray-700 border-none outline-none bg-transparent" /></div>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm text-xs"><Calendar className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-400">To</span><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="font-medium text-gray-700 border-none outline-none bg-transparent" /></div>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm text-xs flex-1 min-w-[180px]"><Users className="w-3.5 h-3.5 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee / department…" className="flex-1 border-none outline-none bg-transparent text-gray-700" /></div>
                <button onClick={() => { setDateFrom(today); setDateTo(today); }} className="px-3 py-2 rounded-xl text-xs font-bold text-[#1a3fbd] bg-blue-50 border border-blue-200 hover:bg-blue-100 transition">Today</button>
                <button onClick={() => { setDateFrom(weekAgo); setDateTo(today); }} className="px-3 py-2 rounded-xl text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition">Last 7 Days</button>
                <button onClick={exportCsv} disabled={!filtered.length} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition"><Download className="w-3.5 h-3.5" /> Export CSV</button>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2"><List className="w-4 h-4 text-[#1a3fbd]" /><span className="text-sm font-bold text-gray-700">Work Sessions</span><span className="ml-auto text-xs text-gray-400">{filtered.length} records</span></div>
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-300" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <Timer className="w-8 h-8 text-gray-200 mb-2" />
                    <p className="text-sm font-semibold text-gray-400">No sessions found</p>
                    <p className="text-xs text-gray-300 mt-1">Try a different date range</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {["#", "Employee", "Department", "Date", "Check In", "Check Out", "Duration", "Location", "Status"].map(h => (
                            <th key={h} className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-gray-400 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((s, i) => (
                          <tr
                            key={s.id}
                            onClick={() => {
                              const u = allEmps.find(e => e.erp_employee_id === s.erp_employee_id);
                              if (u) {
                                setSelected(u);
                                setDayDate(s.work_date);
                                setTab("overview");
                              }
                            }}
                            className={`border-b border-gray-50 hover:bg-blue-50/50 cursor-pointer transition-colors group ${i % 2 === 1 ? "bg-gray-50/30" : ""}`}
                          >
                            <td className="px-4 py-3 text-[11px] text-gray-300 font-mono">{i + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={s.employee_name} empId={s.erp_employee_id} size={32} fontSize={11} />
                                <div>
                                  <p className="text-xs font-bold text-gray-800 group-hover:text-[#1a3fbd] transition-colors">{s.employee_name || "—"}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">{s.erp_employee_id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-indigo-500 font-semibold whitespace-nowrap">{s.department || "—"}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap">{fmtDateShort(s.work_date)}</td>
                            <td className="px-4 py-3"><span className="text-sm font-extrabold text-[#1a3fbd] tabular-nums">{fmtTime(s.check_in_time)}</span></td>
                            <td className="px-4 py-3"><span className="text-sm font-extrabold text-gray-600 tabular-nums">{fmtTime(s.check_out_time)}</span></td>
                            <td className="px-4 py-3 whitespace-nowrap"><DurPill mins={s.duration_minutes} /></td>
                            <td className="px-4 py-3 max-w-[160px]">
                              {s.check_in_location ? (
                                <div className="flex items-start gap-1">
                                  <MapPin className="w-3 h-3 text-blue-300 shrink-0 mt-0.5" />
                                  <span className="text-[11px] text-gray-500 line-clamp-1">{s.check_in_location}</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {s.check_out_time ? (
                                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">Completed</span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Active
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
                <Avatar name={selected.employee_name} empId={selected.erp_employee_id} size={52} fontSize={18} />
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><h2 className="text-base font-extrabold text-gray-900">{selected.employee_name}</h2>{dayData?.location && <LiveBadge on={dayData.location.is_checked_in} />}</div><p className="text-xs text-gray-400 mt-0.5">{[selected.department, selected.designation].filter(Boolean).join(" · ")}<span className="ml-2 text-gray-300 font-mono text-[10px]">{selected.erp_employee_id}</span></p>{dayData?.location?.location_name && <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-300" />{dayData.location.location_name}<span className="text-gray-300">· {timeAgo(dayData.location.last_seen)}</span></p>}</div>
                <div className="hidden md:flex items-center gap-3"><div className="text-center bg-blue-50 rounded-xl px-4 py-2.5 border border-blue-100"><p className="text-lg font-extrabold text-[#1a3fbd] tabular-nums">{dayData ? dayData.sessions.length : "—"}</p><p className="text-[10px] text-blue-400 font-semibold">Sessions</p></div><div className="text-center bg-emerald-50 rounded-xl px-4 py-2.5 border border-emerald-100"><p className="text-lg font-extrabold text-emerald-700 tabular-nums">{dayData ? fmtDuration(dayMins) : "—"}</p><p className="text-[10px] text-emerald-500 font-semibold">Hours Today</p></div><div className="text-center bg-violet-50 rounded-xl px-4 py-2.5 border border-violet-100"><p className="text-lg font-extrabold text-violet-700 tabular-nums">{dayData ? dayData.logs.length : "—"}</p><p className="text-[10px] text-violet-400 font-semibold">Check Events</p></div></div>
                <div className="flex items-center gap-2 ml-auto"><div className="flex items-center gap-2 border border-gray-200 bg-gray-50 rounded-xl px-3 py-2"><Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" /><input type="date" value={dayDate} onChange={e => setDayDate(e.target.value)} className="text-xs font-bold text-gray-700 border-none outline-none bg-transparent" /></div><button onClick={() => loadDayData(selected.erp_employee_id, dayDate)} disabled={dayLoading} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-[#1a3fbd] hover:border-blue-300 hover:bg-blue-50 transition"><RefreshCw className={`w-4 h-4 ${dayLoading ? "animate-spin text-[#1a3fbd]" : ""}`} /></button></div>
              </div>

              <div className="flex items-center bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 gap-1 self-start">
                {([
                  { id: "overview", label: "Overview", icon: List },
                  { id: "timeline", label: "Timeline", icon: Activity },
                  { id: "map", label: "Live Map", icon: MapPin },
                ] as const).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === id ? "bg-[#1a3fbd] text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}><Icon className="w-3.5 h-3.5" />{label}</button>)}
              </div>

              {dayLoading && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-300" /></div>}

              {!dayLoading && tab === "overview" && dayData && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2"><Timer className="w-4 h-4 text-[#1a3fbd]" /><span className="text-sm font-bold text-gray-700">Work Sessions — {fmtDateShort(dayDate)}</span><span className="ml-auto text-xs text-gray-400">{dayData.sessions.length} sessions</span></div>
                  {dayData.sessions.length === 0 ? <div className="flex flex-col items-center py-16 text-center"><Clock className="w-8 h-8 text-gray-200 mb-2" /><p className="text-sm font-semibold text-gray-400">No sessions on this day</p></div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-gray-50 border-b border-gray-100">{["#", "Check In", "Check Out", "Duration", "In Location", "Out Location", "Status"].map(h => <th key={h} className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest text-gray-400 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{dayData.sessions.map((s, i) => <tr key={s.id} className={`border-b border-gray-50 ${i % 2 === 1 ? "bg-gray-50/30" : ""}`}><td className="px-5 py-4 text-[11px] text-gray-300 font-mono">{i + 1}</td><td className="px-5 py-4"><span className="text-xl font-extrabold text-[#1a3fbd] tabular-nums">{fmtTime(s.check_in_time)}</span></td><td className="px-5 py-4"><span className="text-xl font-extrabold text-gray-700 tabular-nums">{fmtTime(s.check_out_time)}</span></td><td className="px-5 py-4"><DurPill mins={s.duration_minutes} /></td><td className="px-5 py-4 max-w-[180px]">{s.check_in_location ? <div className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-300 shrink-0 mt-0.5" /><span className="text-xs text-gray-600 line-clamp-2">{s.check_in_location}</span></div> : <span className="text-xs text-gray-300">—</span>}</td><td className="px-5 py-4 max-w-[180px]">{s.check_out_location ? <div className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" /><span className="text-xs text-gray-500 line-clamp-2">{s.check_out_location}</span></div> : <span className="text-xs text-gray-300">—</span>}</td><td className="px-5 py-4 whitespace-nowrap">{s.check_out_time ? <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">Completed</span> : <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Active</span>}</td></tr>)}</tbody></table></div>}
                </div>
              )}

              {!dayLoading && tab === "timeline" && dayData && (
                <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 items-start">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2"><Activity className="w-4 h-4 text-[#1a3fbd]" /><span className="text-sm font-bold text-gray-700">Google-style Timeline — {fmtDateShort(dayDate)}</span><span className="ml-auto text-xs text-gray-400">{dayData.logs.length} events</span></div>
                    {dayData.logs.length === 0 ? <div className="flex flex-col items-center py-16 text-center"><Activity className="w-8 h-8 text-gray-200 mb-2" /><p className="text-sm font-semibold text-gray-400">No check-in events on this day</p></div> : <div className="px-5 py-4 flex flex-col gap-4">{dayData.logs.map((log, i) => { const isIn = log.log_type === "IN"; return <div key={log.id} className="flex gap-4"><div className="flex flex-col items-center"><div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${isIn ? "bg-blue-50 border-2 border-blue-200" : "bg-red-50 border-2 border-red-200"}`}>{isIn ? <LogIn className="w-4 h-4 text-[#1a3fbd]" /> : <LogOut className="w-4 h-4 text-red-500" />}</div>{i < dayData.logs.length - 1 && <div className="w-0.5 flex-1 my-2" style={{ background: "linear-gradient(to bottom, #e2e8f0, #f8fafc)", minHeight: 24 }} />}</div><div className="flex-1 pb-4"><div className="flex items-baseline gap-3 mb-1"><span className={`text-xs font-extrabold uppercase tracking-wide ${isIn ? "text-[#1a3fbd]" : "text-red-500"}`}>{isIn ? "Check In" : "Check Out"}</span><span className="text-xl font-extrabold text-gray-800 tabular-nums">{fmtTimeFull(log.created_at)}</span></div>{log.location_name && <div className="flex items-center gap-1.5 mt-0.5"><MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0" /><span className="text-sm text-gray-500">{log.location_name}</span></div>}{log.latitude != null && log.longitude != null && <p className="text-[11px] text-gray-300 mt-0.5 font-mono">{log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}</p>}</div></div>; })}</div>}
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[520px] flex flex-col">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2"><MapPin className="w-4 h-4 text-[#1a3fbd]" /><span className="text-sm font-bold text-gray-700">Route Map</span>{dayData?.location && <span className="ml-auto text-xs text-gray-400">{timeAgo(dayData.location.last_seen)}</span>}</div>
                    {(!dayData || (!dayData.location && dayData.logs.filter(l => l.latitude).length === 0)) ? <div className="flex flex-1 flex-col items-center justify-center py-16 text-center"><MapPin className="w-8 h-8 text-gray-200 mb-2" /><p className="text-sm font-semibold text-gray-400">No GPS data for this day</p><p className="text-xs text-gray-300 mt-1">GPS location will appear once the employee opens the app</p></div> : <div ref={mapDivRef} className="flex-1 min-h-[420px]" />}
                    <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60">
                      <div className="flex flex-wrap gap-2 text-[11px] text-gray-500">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-gray-200"><span className="w-2 h-2 rounded-full bg-[#1a3fbd]" />Check In</span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-gray-200"><span className="w-2 h-2 rounded-full bg-red-500" />Check Out</span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-gray-200">Total: {dayData?.logs.length || 0} points</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!dayLoading && tab === "map" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[520px]"><div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2"><MapPin className="w-4 h-4 text-[#1a3fbd]" /><span className="text-sm font-bold text-gray-700">Live Location</span>{dayData?.location && <span className="ml-auto text-xs text-gray-400">{timeAgo(dayData.location.last_seen)}</span>}</div>{(!dayData || (!dayData.location && dayData.logs.filter(l => l.latitude).length === 0)) ? <div className="flex flex-col items-center justify-center py-20 text-center"><MapPin className="w-8 h-8 text-gray-200 mb-2" /><p className="text-sm font-semibold text-gray-400">No GPS data for this day</p><p className="text-xs text-gray-300 mt-1">GPS location will appear once the employee opens the app</p></div> : <div ref={mapDivRef} className="min-h-[420px]" />}</div>}
              {!dayLoading && !dayData && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20"><Timer className="w-8 h-8 text-gray-200 mb-2" /><p className="text-sm font-semibold text-gray-400">Select a date to load data</p></div>}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
