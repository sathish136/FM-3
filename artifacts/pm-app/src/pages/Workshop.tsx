import { Layout } from "@/components/Layout";
import {
  Plus, RefreshCw, Loader2, Search, X, Printer, Trash2,
  ChevronDown, Zap, Wrench, ClipboardList, Eye,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────
type CardType = "welder" | "fitter";

interface WeldRow { joint_type: string; joint_size: string; no_of_joints: string; welding_process: string; remarks: string; }
interface FitterRow { activity: string; description: string; quantity: string; unit: string; remarks: string; }

interface WelderSummary { total_joints: string; total_weld_length: string; rework_nos: string; inspection_status: string; remarks: string; }
interface FitterSummary { no_cuttings: string; no_fittings: string; no_settings: string; rework: string; remarks: string; }

interface Signature { role: string; name: string; signature: string; date: string; }

interface JobCard {
  id?: number;
  card_type: CardType;
  card_no?: string;
  project_number?: string;
  project_name?: string;
  drawing_number?: string;
  work_order_no?: string;
  location_area?: string;
  worker_name?: string;
  supervisor_name?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  total_hours?: string;
  shift?: string;
  details?: WeldRow[] | FitterRow[];
  summary?: WelderSummary | FitterSummary;
  signatures?: Signature[];
  status?: string;
  created_by?: string;
  created_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
function fmtDate(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; }
}

const WELD_PROCESSES = ["SMAW", "GTAW", "GMAW", "Others"];
const FITTER_ACTIVITIES = ["Cutting", "Fitting", "Setting / Alignment"];
const SHIFTS = ["Day", "Night"];
const SIG_ROLES = ["Supervisor", "QC Inspector", "Site Engineer"];

function emptyWeldRow(): WeldRow { return { joint_type: "", joint_size: "", no_of_joints: "", welding_process: "SMAW", remarks: "" }; }
function emptyFitterRow(activity = ""): FitterRow { return { activity, description: "", quantity: "", unit: "", remarks: "" }; }
function emptySigs(): Signature[] { return SIG_ROLES.map(r => ({ role: r, name: "", signature: "", date: "" })); }

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  const s = (status || "Draft").toLowerCase();
  const cfg =
    s === "submitted" ? "bg-blue-100 text-blue-700 border-blue-200" :
    s === "approved"  ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
    s === "rejected"  ? "bg-red-100 text-red-700 border-red-200" :
                        "bg-gray-100 text-gray-600 border-gray-200";
  return <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", cfg)}>{status || "Draft"}</span>;
}

// ─── Print view ───────────────────────────────────────────────────────────────
function PrintView({ card, onClose }: { card: JobCard; onClose: () => void }) {
  const isWelder = card.card_type === "welder";
  const wRows  = (card.details as WeldRow[]) || [];
  const fRows  = (card.details as FitterRow[]) || [];
  const ws     = (card.summary as WelderSummary) || {};
  const fs     = (card.summary as FitterSummary) || {};
  const sigs   = card.signatures || emptySigs();

  const accentColor = isWelder ? "#8b2635" : "#1a3a6b";
  const headerBg    = isWelder ? "#f0e4e7" : "#dce6f1";

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto" id="print-area">
      <div className="flex justify-end gap-2 p-4 print:hidden">
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700">
          <Printer className="w-4 h-4" /> Print / PDF
        </button>
        <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
          <X className="w-4 h-4" /> Close
        </button>
      </div>

      <div className="max-w-[800px] mx-auto p-6 font-sans text-xs" style={{ fontFamily: "Arial, sans-serif" }}>
        {/* Title */}
        <div className="flex items-center justify-between border-2 border-gray-800 p-3 mb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              {isWelder ? <Zap className="w-8 h-8" style={{ color: accentColor }} /> : <Wrench className="w-8 h-8" style={{ color: accentColor }} />}
            </div>
            <h1 className="text-2xl font-black tracking-wide" style={{ color: accentColor }}>
              {isWelder ? "WELDER JOB CARD" : "FITTER JOB CARD"}
            </h1>
          </div>
          <div className="text-right text-[10px] text-gray-500">
            {card.card_no && <div>Card No: <b>{card.card_no}</b></div>}
            <div>Status: <b>{card.status || "Draft"}</b></div>
          </div>
        </div>

        {/* Header fields */}
        <table className="w-full border-collapse border-2 border-gray-800" style={{ fontSize: "11px" }}>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-2 py-1 font-semibold w-[18%]">Project Number</td>
              <td className="border border-gray-400 px-2 py-1 w-[22%]">{card.project_number || ""}</td>
              <td className="border border-gray-400 px-2 py-1 font-semibold w-[15%]">Date</td>
              <td className="border border-gray-400 px-2 py-1">{card.date ? fmtDate(card.date) : ""}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-2 py-1 font-semibold">Project Name</td>
              <td className="border border-gray-400 px-2 py-1">{card.project_name || ""}</td>
              <td className="border border-gray-400 px-2 py-1 font-semibold">Start Time</td>
              <td className="border border-gray-400 px-2 py-1">{card.start_time || ""}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-2 py-1 font-semibold">Drawing Number</td>
              <td className="border border-gray-400 px-2 py-1">{card.drawing_number || ""}</td>
              <td className="border border-gray-400 px-2 py-1 font-semibold">End Time</td>
              <td className="border border-gray-400 px-2 py-1">{card.end_time || ""}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-2 py-1 font-semibold">Work Order No</td>
              <td className="border border-gray-400 px-2 py-1">{card.work_order_no || ""}</td>
              <td className="border border-gray-400 px-2 py-1 font-semibold">Total Hours</td>
              <td className="border border-gray-400 px-2 py-1">{card.total_hours || ""}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-2 py-1 font-semibold">Location / Area</td>
              <td className="border border-gray-400 px-2 py-1">{card.location_area || ""}</td>
              <td className="border border-gray-400 px-2 py-1 font-semibold">Shift (Day/Night)</td>
              <td className="border border-gray-400 px-2 py-1">{card.shift || ""}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-2 py-1 font-semibold">Worker Name</td>
              <td className="border border-gray-400 px-2 py-1">{card.worker_name || ""}</td>
              <td className="border border-gray-400 px-2 py-1 font-semibold">Supervisor Name</td>
              <td className="border border-gray-400 px-2 py-1">{card.supervisor_name || ""}</td>
            </tr>
          </tbody>
        </table>

        {/* Details table header */}
        <table className="w-full border-collapse border-x-2 border-b-2 border-gray-800 mt-2" style={{ fontSize: "11px" }}>
          <thead>
            <tr style={{ backgroundColor: accentColor, color: "#fff" }}>
              <td colSpan={isWelder ? 6 : 6} className="px-2 py-1.5 font-bold text-center text-[12px] tracking-wide">
                {isWelder ? "WELDING DETAILS" : "FITTER WORK DETAILS"}
              </td>
            </tr>
            {isWelder ? (
              <tr style={{ backgroundColor: headerBg }}>
                <td className="border border-gray-400 px-2 py-1 font-bold w-8 text-center">S.No</td>
                <td className="border border-gray-400 px-2 py-1 font-bold">Joint Type</td>
                <td className="border border-gray-400 px-2 py-1 font-bold">Joint Size (mm/inch)</td>
                <td className="border border-gray-400 px-2 py-1 font-bold w-16 text-center">No. of Joints</td>
                <td className="border border-gray-400 px-2 py-1 font-bold">Welding Process (SMAW/GTAW/GMAW/Others)</td>
                <td className="border border-gray-400 px-2 py-1 font-bold">Remarks</td>
              </tr>
            ) : (
              <tr style={{ backgroundColor: headerBg }}>
                <td className="border border-gray-400 px-2 py-1 font-bold w-8 text-center">S.No</td>
                <td className="border border-gray-400 px-2 py-1 font-bold">Activity</td>
                <td className="border border-gray-400 px-2 py-1 font-bold">Description / Size / Spec</td>
                <td className="border border-gray-400 px-2 py-1 font-bold w-16 text-center">Quantity</td>
                <td className="border border-gray-400 px-2 py-1 font-bold w-16 text-center">Unit</td>
                <td className="border border-gray-400 px-2 py-1 font-bold">Remarks</td>
              </tr>
            )}
          </thead>
          <tbody>
            {isWelder ? wRows.map((r, i) => (
              <tr key={i}>
                <td className="border border-gray-300 px-2 py-2 text-center">{i + 1}</td>
                <td className="border border-gray-300 px-2 py-2">{r.joint_type}</td>
                <td className="border border-gray-300 px-2 py-2">{r.joint_size}</td>
                <td className="border border-gray-300 px-2 py-2 text-center">{r.no_of_joints}</td>
                <td className="border border-gray-300 px-2 py-2">{r.welding_process}</td>
                <td className="border border-gray-300 px-2 py-2">{r.remarks}</td>
              </tr>
            )) : fRows.map((r, i) => (
              <tr key={i}>
                <td className="border border-gray-300 px-2 py-2 text-center">{i + 1}</td>
                <td className="border border-gray-300 px-2 py-2">{r.activity}</td>
                <td className="border border-gray-300 px-2 py-2">{r.description}</td>
                <td className="border border-gray-300 px-2 py-2 text-center">{r.quantity}</td>
                <td className="border border-gray-300 px-2 py-2 text-center">{r.unit}</td>
                <td className="border border-gray-300 px-2 py-2">{r.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <table className="w-full border-collapse border-x-2 border-b-2 border-gray-800 mt-2" style={{ fontSize: "11px" }}>
          <thead>
            <tr style={{ backgroundColor: accentColor, color: "#fff" }}>
              <td colSpan={2} className="px-2 py-1 font-bold text-center">SUMMARY</td>
            </tr>
          </thead>
          <tbody>
            {isWelder ? (<>
              <tr><td className="border border-gray-400 px-2 py-1 font-semibold w-48">Total No. of Joints</td><td className="border border-gray-400 px-2 py-1">{ws.total_joints || ""}</td></tr>
              <tr><td className="border border-gray-400 px-2 py-1 font-semibold">Total Weld Length (if required)</td><td className="border border-gray-400 px-2 py-1">{ws.total_weld_length || ""}</td></tr>
              <tr><td className="border border-gray-400 px-2 py-1 font-semibold">Rework (Nos)</td><td className="border border-gray-400 px-2 py-1">{ws.rework_nos || ""}</td></tr>
              <tr>
                <td className="border border-gray-400 px-2 py-1 font-semibold">Inspection Status</td>
                <td className="border border-gray-400 px-2 py-1">
                  {(["Checked","Pending","N/A"]).map(opt => (
                    <span key={opt} className="inline-flex items-center gap-1.5 mr-4">
                      <span className="w-3 h-3 border border-gray-700 inline-block" style={{ backgroundColor: ws.inspection_status === opt ? "#333" : "transparent" }} />
                      {opt}
                    </span>
                  ))}
                </td>
              </tr>
              <tr><td className="border border-gray-400 px-2 py-1 font-semibold">Remarks</td><td className="border border-gray-400 px-2 py-1">{ws.remarks || ""}</td></tr>
            </>) : (<>
              <tr><td className="border border-gray-400 px-2 py-1 font-semibold w-48">No. of Cuttings</td><td className="border border-gray-400 px-2 py-1">{fs.no_cuttings || ""}</td></tr>
              <tr><td className="border border-gray-400 px-2 py-1 font-semibold">No. of Fittings</td><td className="border border-gray-400 px-2 py-1">{fs.no_fittings || ""}</td></tr>
              <tr><td className="border border-gray-400 px-2 py-1 font-semibold">No. of Settings / Alignments</td><td className="border border-gray-400 px-2 py-1">{fs.no_settings || ""}</td></tr>
              <tr><td className="border border-gray-400 px-2 py-1 font-semibold">Rework (if any)</td><td className="border border-gray-400 px-2 py-1">{fs.rework || ""}</td></tr>
              <tr><td className="border border-gray-400 px-2 py-1 font-semibold">Remarks</td><td className="border border-gray-400 px-2 py-1">{fs.remarks || ""}</td></tr>
            </>)}
          </tbody>
        </table>

        {/* Approval / Signatures */}
        <table className="w-full border-collapse border-x-2 border-b-2 border-gray-800 mt-2" style={{ fontSize: "11px" }}>
          <thead>
            <tr style={{ backgroundColor: accentColor, color: "#fff" }}>
              <td colSpan={4} className="px-2 py-1 font-bold text-center">APPROVAL / SIGNATURES</td>
            </tr>
            <tr style={{ backgroundColor: headerBg }}>
              <td className="border border-gray-400 px-2 py-1 font-bold">Role</td>
              <td className="border border-gray-400 px-2 py-1 font-bold">Name</td>
              <td className="border border-gray-400 px-2 py-1 font-bold">Signature</td>
              <td className="border border-gray-400 px-2 py-1 font-bold">Date</td>
            </tr>
          </thead>
          <tbody>
            {sigs.map((s, i) => (
              <tr key={i}>
                <td className="border border-gray-300 px-2 py-3 font-semibold">{s.role}</td>
                <td className="border border-gray-300 px-2 py-3">{s.name}</td>
                <td className="border border-gray-300 px-2 py-3">{s.signature}</td>
                <td className="border border-gray-300 px-2 py-3">{s.date ? fmtDate(s.date) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`@media print { .print\\:hidden { display: none !important; } }`}</style>
    </div>
  );
}

// ─── Job Card Form Modal ──────────────────────────────────────────────────────
function JobCardModal({ type, onClose, onSaved }: { type: CardType; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isWelder = type === "welder";
  const accentCls = isWelder ? "bg-rose-700 hover:bg-rose-800" : "bg-blue-700 hover:bg-blue-800";
  const accentBorder = isWelder ? "border-rose-600" : "border-blue-600";

  const [saving, setSaving] = useState(false);

  // Header
  const [cardNo,        setCardNo]        = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [projectName,   setProjectName]   = useState("");
  const [drawingNumber, setDrawingNumber] = useState("");
  const [workOrderNo,   setWorkOrderNo]   = useState("");
  const [locationArea,  setLocationArea]  = useState("");
  const [workerName,    setWorkerName]    = useState("");
  const [supervisorName,setSupervisorName]= useState("");
  const [date,          setDate]          = useState(today());
  const [startTime,     setStartTime]     = useState("");
  const [endTime,       setEndTime]       = useState("");
  const [totalHours,    setTotalHours]    = useState("");
  const [shift,         setShift]         = useState("Day");

  // Details rows
  const [weldRows,  setWeldRows]  = useState<WeldRow[]>([emptyWeldRow(), emptyWeldRow(), emptyWeldRow(), emptyWeldRow(), emptyWeldRow()]);
  const [fitterRows,setFitterRows]= useState<FitterRow[]>(FITTER_ACTIVITIES.map(a => emptyFitterRow(a)));

  // Summary
  const [ws, setWs] = useState<WelderSummary>({ total_joints: "", total_weld_length: "", rework_nos: "", inspection_status: "Checked", remarks: "" });
  const [fs, setFs] = useState<FitterSummary>({ no_cuttings: "", no_fittings: "", no_settings: "", rework: "", remarks: "" });

  // Signatures
  const [sigs, setSigs] = useState<Signature[]>(emptySigs());

  const inputCls = "w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white";

  const save = async (status: "Draft" | "Submitted") => {
    if (!projectName.trim()) { toast({ title: "Project name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload: JobCard = {
        card_type: type, card_no: cardNo, project_number: projectNumber,
        project_name: projectName, drawing_number: drawingNumber,
        work_order_no: workOrderNo, location_area: locationArea,
        worker_name: workerName, supervisor_name: supervisorName,
        date, start_time: startTime, end_time: endTime,
        total_hours: totalHours, shift,
        details: isWelder ? weldRows : fitterRows,
        summary: isWelder ? ws : fs,
        signatures: sigs, status,
        created_by: user?.email,
      };
      const r = await fetch(`${BASE}/api/workshop/job-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: `Job card ${status === "Submitted" ? "submitted" : "saved as draft"}` });
      onSaved();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 overflow-y-auto py-6">
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl">
        {/* Modal header */}
        <div className={cn("flex items-center justify-between px-6 py-4 rounded-t-2xl text-white", isWelder ? "bg-rose-800" : "bg-blue-700")}>
          <div className="flex items-center gap-3">
            {isWelder ? <Zap className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            <h2 className="text-lg font-bold">{isWelder ? "New Welder Job Card" : "New Fitter Job Card"}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* ── Header info ─────────────────────────────── */}
          <section>
            <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b-2", isWelder ? "text-rose-700 border-rose-200" : "text-blue-700 border-blue-200")}>Job Card Info</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Card No</label><input className={inputCls} value={cardNo} onChange={e => setCardNo(e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Date <span className="text-red-500">*</span></label><input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Start Time</label><input type="time" className={inputCls} value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">End Time</label><input type="time" className={inputCls} value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Project Name <span className="text-red-500">*</span></label><input className={inputCls} value={projectName} onChange={e => setProjectName(e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Project Number</label><input className={inputCls} value={projectNumber} onChange={e => setProjectNumber(e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Drawing Number</label><input className={inputCls} value={drawingNumber} onChange={e => setDrawingNumber(e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Work Order No</label><input className={inputCls} value={workOrderNo} onChange={e => setWorkOrderNo(e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Location / Area</label><input className={inputCls} value={locationArea} onChange={e => setLocationArea(e.target.value)} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Total Hours</label><input className={inputCls} value={totalHours} onChange={e => setTotalHours(e.target.value)} /></div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Shift</label>
                <select className={inputCls} value={shift} onChange={e => setShift(e.target.value)}>
                  {SHIFTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Worker Name</label><input className={inputCls} value={workerName} onChange={e => setWorkerName(e.target.value)} /></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Supervisor Name</label><input className={inputCls} value={supervisorName} onChange={e => setSupervisorName(e.target.value)} /></div>
            </div>
          </section>

          {/* ── Details table ────────────────────────────── */}
          <section>
            <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b-2", isWelder ? "text-rose-700 border-rose-200" : "text-blue-700 border-blue-200")}>
              {isWelder ? "Welding Details" : "Fitter Work Details"}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className={cn("text-white text-left", isWelder ? "bg-rose-800" : "bg-blue-700")}>
                    <th className="px-2 py-1.5 w-8">#</th>
                    {isWelder ? (<>
                      <th className="px-2 py-1.5">Joint Type</th>
                      <th className="px-2 py-1.5">Joint Size (mm/inch)</th>
                      <th className="px-2 py-1.5 w-20">No. of Joints</th>
                      <th className="px-2 py-1.5">Welding Process</th>
                    </>) : (<>
                      <th className="px-2 py-1.5">Activity</th>
                      <th className="px-2 py-1.5">Description / Size / Spec</th>
                      <th className="px-2 py-1.5 w-20">Quantity</th>
                      <th className="px-2 py-1.5 w-16">Unit</th>
                    </>)}
                    <th className="px-2 py-1.5">Remarks</th>
                    <th className="px-2 py-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {isWelder ? weldRows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-1 text-center text-gray-400">{i + 1}</td>
                      <td className="px-1 py-1"><input className={inputCls} value={row.joint_type} onChange={e => setWeldRows(r => r.map((x, j) => j === i ? { ...x, joint_type: e.target.value } : x))} /></td>
                      <td className="px-1 py-1"><input className={inputCls} value={row.joint_size} onChange={e => setWeldRows(r => r.map((x, j) => j === i ? { ...x, joint_size: e.target.value } : x))} /></td>
                      <td className="px-1 py-1"><input className={inputCls} value={row.no_of_joints} onChange={e => setWeldRows(r => r.map((x, j) => j === i ? { ...x, no_of_joints: e.target.value } : x))} /></td>
                      <td className="px-1 py-1">
                        <select className={inputCls} value={row.welding_process} onChange={e => setWeldRows(r => r.map((x, j) => j === i ? { ...x, welding_process: e.target.value } : x))}>
                          {WELD_PROCESSES.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1"><input className={inputCls} value={row.remarks} onChange={e => setWeldRows(r => r.map((x, j) => j === i ? { ...x, remarks: e.target.value } : x))} /></td>
                      <td className="px-1 py-1"><button onClick={() => setWeldRows(r => r.filter((_, j) => j !== i))} className="p-1 text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button></td>
                    </tr>
                  )) : fitterRows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-1 text-center text-gray-400">{i + 1}</td>
                      <td className="px-1 py-1">
                        <select className={inputCls} value={row.activity} onChange={e => setFitterRows(r => r.map((x, j) => j === i ? { ...x, activity: e.target.value } : x))}>
                          {FITTER_ACTIVITIES.map(a => <option key={a}>{a}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1"><input className={inputCls} value={row.description} onChange={e => setFitterRows(r => r.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} /></td>
                      <td className="px-1 py-1"><input className={inputCls} value={row.quantity} onChange={e => setFitterRows(r => r.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} /></td>
                      <td className="px-1 py-1"><input className={inputCls} value={row.unit} onChange={e => setFitterRows(r => r.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} /></td>
                      <td className="px-1 py-1"><input className={inputCls} value={row.remarks} onChange={e => setFitterRows(r => r.map((x, j) => j === i ? { ...x, remarks: e.target.value } : x))} /></td>
                      <td className="px-1 py-1"><button onClick={() => setFitterRows(r => r.filter((_, j) => j !== i))} className="p-1 text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => isWelder ? setWeldRows(r => [...r, emptyWeldRow()]) : setFitterRows(r => [...r, emptyFitterRow()])}
              className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add row
            </button>
          </section>

          {/* ── Summary ──────────────────────────────────── */}
          <section>
            <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b-2", isWelder ? "text-rose-700 border-rose-200" : "text-blue-700 border-blue-200")}>Summary</h3>
            {isWelder ? (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 mb-1 block">Total No. of Joints</label><input className={inputCls} value={ws.total_joints} onChange={e => setWs(s => ({ ...s, total_joints: e.target.value }))} /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Total Weld Length (if required)</label><input className={inputCls} value={ws.total_weld_length} onChange={e => setWs(s => ({ ...s, total_weld_length: e.target.value }))} /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Rework (Nos)</label><input className={inputCls} value={ws.rework_nos} onChange={e => setWs(s => ({ ...s, rework_nos: e.target.value }))} /></div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Inspection Status</label>
                  <div className="flex gap-4 mt-1">
                    {["Checked", "Pending", "N/A"].map(opt => (
                      <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={ws.inspection_status === opt} onChange={() => setWs(s => ({ ...s, inspection_status: opt }))} className="w-3.5 h-3.5" />
                        <span className="text-xs text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Remarks</label><input className={inputCls} value={ws.remarks} onChange={e => setWs(s => ({ ...s, remarks: e.target.value }))} /></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 mb-1 block">No. of Cuttings</label><input className={inputCls} value={fs.no_cuttings} onChange={e => setFs(s => ({ ...s, no_cuttings: e.target.value }))} /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">No. of Fittings</label><input className={inputCls} value={fs.no_fittings} onChange={e => setFs(s => ({ ...s, no_fittings: e.target.value }))} /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">No. of Settings / Alignments</label><input className={inputCls} value={fs.no_settings} onChange={e => setFs(s => ({ ...s, no_settings: e.target.value }))} /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Rework (if any)</label><input className={inputCls} value={fs.rework} onChange={e => setFs(s => ({ ...s, rework: e.target.value }))} /></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Remarks</label><input className={inputCls} value={fs.remarks} onChange={e => setFs(s => ({ ...s, remarks: e.target.value }))} /></div>
              </div>
            )}
          </section>

          {/* ── Approval / Signatures ────────────────────── */}
          <section>
            <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b-2", isWelder ? "text-rose-700 border-rose-200" : "text-blue-700 border-blue-200")}>Approval / Signatures</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 w-28">Role</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Name</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Signature</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 w-32">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sigs.map((sig, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 font-medium text-gray-700">{sig.role}</td>
                      <td className="px-1 py-1"><input className={inputCls} value={sig.name} onChange={e => setSigs(s => s.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></td>
                      <td className="px-1 py-1"><input className={inputCls} placeholder="Initials / digital ref" value={sig.signature} onChange={e => setSigs(s => s.map((x, j) => j === i ? { ...x, signature: e.target.value } : x))} /></td>
                      <td className="px-1 py-1"><input type="date" className={inputCls} value={sig.date} onChange={e => setSigs(s => s.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
          <button onClick={() => save("Draft")} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Draft
          </button>
          <button onClick={() => save("Submitted")} disabled={saving} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm", accentCls)}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Submit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Workshop page ───────────────────────────────────────────────────────
export default function Workshop() {
  const [location, navigate] = useLocation();
  const tabFromPath = (p: string): CardType => p.includes("fitter") ? "fitter" : "welder";
  const [activeTab, setActiveTab] = useState<CardType>(tabFromPath(location));

  useEffect(() => {
    setActiveTab(tabFromPath(location));
  }, [location]);
  const [cards, setCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [printCard, setPrintCard] = useState<JobCard | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ type: activeTab, ...(search ? { search } : {}) });
      const r = await fetch(`${BASE}/api/workshop/job-cards?${qs}`);
      const json = await r.json();
      setCards(json.data ?? []);
    } catch { setCards([]); }
    setLoading(false);
  }, [activeTab, search]);

  useEffect(() => { load(); }, [load]);

  const deleteCard = async (id: number) => {
    if (!confirm("Delete this job card?")) return;
    try {
      await fetch(`${BASE}/api/workshop/job-cards/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" });
      load();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const viewFull = async (id: number) => {
    try {
      const r = await fetch(`${BASE}/api/workshop/job-cards/${id}`);
      const card = await r.json();
      if (typeof card.details === "string") card.details = JSON.parse(card.details);
      if (typeof card.summary === "string") card.summary = JSON.parse(card.summary);
      if (typeof card.signatures === "string") card.signatures = JSON.parse(card.signatures);
      setPrintCard(card);
    } catch { toast({ title: "Load failed", variant: "destructive" }); }
  };

  const isWelder = activeTab === "welder";
  const accentBg    = isWelder ? "bg-rose-700"   : "bg-blue-700";
  const accentLight = isWelder ? "bg-rose-50"    : "bg-blue-50";
  const accentText  = isWelder ? "text-rose-700" : "text-blue-700";
  const accentBorder= isWelder ? "border-rose-600" : "border-blue-600";

  const stats = {
    total:     cards.length,
    draft:     cards.filter(c => c.status === "Draft").length,
    submitted: cards.filter(c => c.status === "Submitted").length,
    approved:  cards.filter(c => c.status === "Approved").length,
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white", accentBg)}>
                <ClipboardList className="w-5 h-5" />
              </div>
              Workshop Job Cards
            </h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage Welder &amp; Fitter job cards</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button onClick={() => setShowForm(true)} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium", accentBg)}>
              <Plus className="w-4 h-4" /> New {isWelder ? "Welder" : "Fitter"} Card
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {(["welder", "fitter"] as CardType[]).map(t => (
            <button key={t} onClick={() => navigate(t === "welder" ? "/workshop/welder" : "/workshop/fitter")}
              className={cn("flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === t ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700"
              )}>
              {t === "welder" ? <Zap className="w-4 h-4 text-rose-600" /> : <Wrench className="w-4 h-4 text-blue-600" />}
              {t === "welder" ? "Welder" : "Fitter"} Job Cards
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total",     value: stats.total,     color: "text-gray-800",    bg: "bg-gray-50"    },
            { label: "Draft",     value: stats.draft,     color: "text-gray-600",    bg: "bg-gray-100"   },
            { label: "Submitted", value: stats.submitted, color: "text-blue-700",    bg: "bg-blue-50"    },
            { label: "Approved",  value: stats.approved,  color: "text-emerald-700", bg: "bg-emerald-50" },
          ].map(s => (
            <div key={s.label} className={cn("rounded-xl p-4 border border-gray-200 dark:border-gray-700", s.bg)}>
              <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Search by project name, number, worker…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className={cn("px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2", accentLight)}>
            {isWelder ? <Zap className="w-4 h-4 text-rose-600" /> : <Wrench className="w-4 h-4 text-blue-600" />}
            <span className={cn("text-sm font-bold", accentText)}>{isWelder ? "Welder" : "Fitter"} Job Cards</span>
            <span className="ml-auto text-xs text-gray-400">{cards.length} records</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading job cards…</span>
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <ClipboardList className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium">No {isWelder ? "welder" : "fitter"} job cards yet</p>
              <button onClick={() => setShowForm(true)} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm", accentBg)}>
                <Plus className="w-4 h-4" /> Create first card
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Card No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Worker</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Supervisor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Shift</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((c, i) => (
                    <tr key={c.id} className={cn("border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors", i % 2 === 0 ? "" : "bg-gray-50/40 dark:bg-gray-800/20")}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.card_no || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{c.project_name || "—"}</div>
                        {c.project_number && <div className="text-xs text-gray-400">{c.project_number}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.worker_name || "—"}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.supervisor_name || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(c.date)}</td>
                      <td className="px-4 py-3">
                        {c.shift && <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", c.shift === "Day" ? "bg-yellow-100 text-yellow-700" : "bg-indigo-100 text-indigo-700")}>{c.shift}</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => viewFull(c.id!)} title="View & Print" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteCard(c.id!)} title="Delete" className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && <JobCardModal type={activeTab} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {printCard && <PrintView card={printCard} onClose={() => setPrintCard(null)} />}
    </Layout>
  );
}
