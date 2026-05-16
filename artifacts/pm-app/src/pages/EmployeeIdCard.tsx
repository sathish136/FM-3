import { Layout } from "@/components/Layout";
import { useState, useEffect, useCallback } from "react";
import {
  Search, CheckSquare, Square, Printer, RefreshCw,
  Users, X, Loader2, CreditCard, AlertCircle,
  ChevronDown,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Employee {
  name: string;
  employee_name: string;
  department: string | null;
  designation: string | null;
  status: string;
  date_of_joining: string | null;
  image: string | null;
  cell_number: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  emergency_phone: string | null;
  permanent_address: string | null;
}

function formatDate(val: string | null): string {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

function cleanDept(dept: string | null): string {
  return (dept || "").replace(/ - WTT.*$/i, "").trim().toUpperCase();
}

function EmpAvatar({ src, name, size = 36 }: { src: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const initials = name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
  const proxied = src ? `${BASE}/api/hrms/image-proxy?path=${encodeURIComponent(src)}` : null;
  const style = { width: size, height: size, borderRadius: "50%", flexShrink: 0 as const, overflow: "hidden" as const };

  if (!proxied || err) {
    return (
      <div style={{ ...style, background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "#4338ca" }}>
        {initials || "?"}
      </div>
    );
  }
  return <img src={proxied} alt={name} style={{ ...style, objectFit: "cover" }} onError={() => setErr(true)} />;
}

function IdCard({ emp }: { emp: Employee }) {
  const [photoErr, setPhotoErr] = useState(false);
  const photoSrc = emp.image ? `${BASE}/api/hrms/image-proxy?path=${encodeURIComponent(emp.image)}` : null;
  const initials = emp.employee_name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");

  return (
    <div className="id-card">
      {/* Top section */}
      <div className="id-card-top">
        {/* Left strip — brand + photo */}
        <div className="id-card-left-strip">
          <div className="id-brand">
            <img src={`${BASE}/wtt-logo.png`} alt="WTT" className="id-logo-img" />
            <div className="id-brand-name">WTT</div>
            <div className="id-brand-sub">I N T E R N A T I O N A L</div>
            <div className="id-brand-tag">Water Loving Technology</div>
          </div>
          <div className="id-photo-wrap">
            {photoSrc && !photoErr ? (
              <img src={photoSrc} alt={emp.employee_name} className="id-photo" onError={() => setPhotoErr(true)} />
            ) : (
              <div className="id-photo id-photo-fb">{initials || "?"}</div>
            )}
          </div>
        </div>

        {/* Right — details */}
        <div className="id-card-details">
          <table className="id-tbl">
            <tbody>
              <tr><td className="id-lbl">EMPLOYEE ID</td><td className="id-sep">:</td><td className="id-val id-bold">{emp.name}</td></tr>
              <tr><td className="id-lbl">DOJ</td><td className="id-sep">:</td><td className="id-val">{formatDate(emp.date_of_joining)}</td></tr>
              <tr><td className="id-lbl">DOB</td><td className="id-sep">:</td><td className="id-val">{formatDate(emp.date_of_birth)}</td></tr>
              <tr><td className="id-lbl">MOBILE NO</td><td className="id-sep">:</td><td className="id-val">{emp.cell_number || ""}</td></tr>
              <tr><td className="id-lbl">EMERGENCY CONTACT</td><td className="id-sep">:</td><td className="id-val">{emp.emergency_phone || ""}</td></tr>
              <tr><td className="id-lbl">BLOOD GROUP</td><td className="id-sep">:</td><td className="id-val id-bold">{emp.blood_group || ""}</td></tr>
            </tbody>
          </table>
          {emp.permanent_address && (
            <div className="id-addr-block">
              <span className="id-lbl">ADDRESS :</span>
              <div className="id-addr-text">{emp.permanent_address}</div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="id-card-bottom">
        <div className="id-bot-left">
          <div className="id-emp-name">{emp.employee_name.toUpperCase()}</div>
          <div className="id-emp-dept">{cleanDept(emp.department)}</div>
        </div>
        <div className="id-bot-right">
          <div className="id-auth-sig">Authorized Signature</div>
          <div className="id-co-addr">
            <strong>WTT INTERNATIONAL PVT.LTD,</strong><br />
            No.3, College Cross Road,<br />
            Tirupur - 641602, Tamil Nadu, INDIA<br />
            PH: +91-421-2241120 &nbsp;·&nbsp; 224 7707<br />
            WWW.WTTINT.COM
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeIdCard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/hrms/employees/id-card-data`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Employee[] = await res.json();
      setEmployees(data);
    } catch (e: any) {
      setError(e.message ?? "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const departments = [
    "All",
    ...Array.from(new Set(employees.map(e => cleanDept(e.department)).filter(Boolean))).sort(),
  ];

  const filtered = employees.filter(e => {
    const matchDept = deptFilter === "All" || cleanDept(e.department) === deptFilter;
    const matchSearch = !search ||
      e.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.designation || "").toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  const allSelected = filtered.length > 0 && filtered.every(e => selected.has(e.name));
  const someSelected = filtered.some(e => selected.has(e.name));

  function toggleAll() {
    const next = new Set(selected);
    if (allSelected) filtered.forEach(e => next.delete(e.name));
    else filtered.forEach(e => next.add(e.name));
    setSelected(next);
  }

  function toggleOne(name: string) {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name); else next.add(name);
    setSelected(next);
  }

  const selectedEmployees = employees.filter(e => selected.has(e.name));

  function handlePrint() {
    if (!selectedEmployees.length) return;
    window.print();
  }

  return (
    <Layout>
      {/* ── Card styles (shared between screen preview and print) ── */}
      <style>{`
        .id-card {
          width: 320px; flex-shrink: 0;
          border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden;
          background: #fff; font-family: Arial, sans-serif;
          box-shadow: 0 2px 8px rgba(0,0,0,.10); color: #1e293b;
        }
        .id-card-top { display: flex; min-height: 128px; }
        .id-card-left-strip {
          width: 96px; flex-shrink: 0;
          background: linear-gradient(160deg, #0a2463 0%, #1e3a8a 100%);
          display: flex; flex-direction: column; align-items: center;
          padding: 8px 6px; gap: 8px;
        }
        .id-brand { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .id-logo-img { width: 28px; height: 28px; object-fit: contain; filter: brightness(0) invert(1); }
        .id-brand-name { color: #fff; font-size: 12px; font-weight: 900; letter-spacing: 1px; line-height: 1; }
        .id-brand-sub { color: #93c5fd; font-size: 4.5px; letter-spacing: .4px; line-height: 1.3; font-weight: 700; text-align: center; }
        .id-brand-tag { color: #bfdbfe; font-size: 4px; font-style: italic; text-align: center; line-height: 1.3; }
        .id-photo-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }
        .id-photo { width: 58px; height: 70px; object-fit: cover; border-radius: 4px; border: 2px solid #60a5fa; }
        .id-photo-fb { width: 58px; height: 70px; border-radius: 4px; border: 2px solid #60a5fa; background: #1e40af; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 17px; }
        .id-card-details { flex: 1; padding: 7px 9px; }
        .id-tbl { width: 100%; border-collapse: collapse; }
        .id-tbl tr { height: 15px; }
        .id-lbl { color: #475569; font-size: 7.5px; white-space: nowrap; padding-right: 3px; width: 82px; }
        .id-sep { color: #94a3b8; padding-right: 3px; font-size: 7.5px; }
        .id-val { color: #1e293b; font-size: 8px; }
        .id-bold { font-weight: 700; }
        .id-addr-block { margin-top: 4px; }
        .id-addr-text { font-size: 7px; color: #334155; line-height: 1.4; margin-top: 1px; }
        .id-card-bottom {
          display: flex; align-items: flex-start; gap: 6px;
          border-top: 2px solid #0a2463; background: #f8fafc;
          padding: 5px 9px; min-height: 50px;
        }
        .id-bot-left { flex: 1; }
        .id-emp-name { font-size: 9.5px; font-weight: 900; color: #0a2463; letter-spacing: .4px; }
        .id-emp-dept { font-size: 7.5px; color: #1e40af; font-weight: 600; margin-top: 2px; }
        .id-bot-right { text-align: right; }
        .id-auth-sig { font-size: 6.5px; color: #475569; font-style: italic; border-top: .5px solid #94a3b8; padding-top: 2px; display: inline-block; margin-bottom: 3px; }
        .id-co-addr { font-size: 6px; color: #334155; line-height: 1.5; text-align: right; }

        /* ── PRINT ── */
        @media print {
          body > * { display: none !important; }
          #id-print-area {
            display: block !important;
            position: fixed !important; top: 0 !important; left: 0 !important;
            width: 210mm !important; padding: 8mm !important; background: #fff !important;
          }
          @page { size: A4 portrait; margin: 0; }
          .id-print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 88mm) !important;
            gap: 6mm !important;
          }
          .id-card {
            width: 88mm !important; box-shadow: none !important;
            border: 1px solid #94a3b8 !important;
            break-inside: avoid !important; page-break-inside: avoid !important;
          }
          .id-card-left-strip { width: 26mm !important; padding: 3mm 3mm !important; }
          .id-logo-img { width: 9mm !important; height: 9mm !important; }
          .id-brand-name { font-size: 8pt !important; }
          .id-brand-sub  { font-size: 3.5pt !important; }
          .id-brand-tag  { font-size: 3pt !important; }
          .id-photo { width: 17mm !important; height: 21mm !important; }
          .id-photo-fb { width: 17mm !important; height: 21mm !important; font-size: 12pt !important; }
          .id-card-details { padding: 3mm 3.5mm !important; }
          .id-lbl { font-size: 6pt !important; width: 24mm !important; }
          .id-sep { font-size: 6pt !important; }
          .id-val { font-size: 6.5pt !important; }
          .id-tbl tr { height: auto !important; }
          .id-addr-text { font-size: 5.5pt !important; }
          .id-lbl.addr { font-size: 5.5pt !important; }
          .id-card-bottom { padding: 2mm 3mm !important; min-height: 12mm !important; }
          .id-emp-name { font-size: 7.5pt !important; }
          .id-emp-dept { font-size: 6pt !important; }
          .id-auth-sig { font-size: 5pt !important; }
          .id-co-addr  { font-size: 4.5pt !important; }
          .id-card-top { min-height: 0 !important; }
        }
      `}</style>

      <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CreditCard className="w-4 h-4 text-yellow-500 shrink-0" />
            <h1 className="text-sm font-bold text-gray-900">Employee ID Cards</h1>
            <span className="text-xs text-gray-400 ml-1">
              {employees.length > 0 ? `${employees.length} active employees` : "Bulk generate & print on A4"}
            </span>
          </div>
          <button
            onClick={fetchEmployees}
            disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handlePrint}
            disabled={selectedEmployees.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print {selectedEmployees.length > 0 ? `(${selectedEmployees.length})` : ""} on A4
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mx-6 mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden gap-4 p-4">

          {/* ── Left: employee list ── */}
          <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">

            {/* Filters */}
            <div className="px-3 pt-3 pb-2 flex flex-col gap-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name / ID…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
                />
              </div>
              <div className="relative">
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="w-full appearance-none pl-3 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Select all bar */}
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 text-xs text-gray-600 hover:text-indigo-700 transition-colors"
              >
                {allSelected
                  ? <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  : someSelected
                  ? <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                  : <Square className="w-3.5 h-3.5" />
                }
                {allSelected ? "Deselect All" : "Select All"}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{filtered.length} shown</span>
                {selected.size > 0 && (
                  <button
                    onClick={() => setSelected(new Set())}
                    className="flex items-center gap-1 text-[10px] text-rose-500 hover:text-rose-700 transition-colors"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            </div>

            {selected.size > 0 && (
              <div className="px-3 py-1.5 bg-indigo-50 border-b border-indigo-100 text-[10px] font-semibold text-indigo-700">
                {selected.size} selected · {Math.ceil(selected.size / 8)} A4 sheet{Math.ceil(selected.size / 8) !== 1 ? "s" : ""}
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-gray-400 text-xs gap-2">
                  <Users className="w-7 h-7" />
                  No employees found
                </div>
              ) : (
                filtered.map(emp => (
                  <div
                    key={emp.name}
                    onClick={() => toggleOne(emp.name)}
                    className={`flex items-center gap-2.5 px-3 py-2 border-b border-gray-50 cursor-pointer transition-colors ${
                      selected.has(emp.name) ? "bg-indigo-50" : "hover:bg-gray-50"
                    }`}
                  >
                    {selected.has(emp.name)
                      ? <CheckSquare className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                      : <Square className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    }
                    <EmpAvatar src={emp.image} name={emp.employee_name} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 truncate">{emp.employee_name}</div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {[emp.designation, cleanDept(emp.department)].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span className="text-[9px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 flex-shrink-0">{emp.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Right: preview ── */}
          <div className="flex-1 overflow-y-auto">
            {selectedEmployees.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-gray-300" />
                </div>
                <div>
                  <div className="font-semibold text-gray-500 text-sm mb-1">No cards selected</div>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    Select employees from the list to preview their ID cards.<br />
                    Use <strong className="text-gray-500">Select All</strong> to pick an entire department at once.
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{selectedEmployees.length}</span> card{selectedEmployees.length !== 1 ? "s" : ""} selected
                    &nbsp;·&nbsp;
                    <span className="font-semibold text-gray-700">{Math.ceil(selectedEmployees.length / 8)}</span> A4 sheet{Math.ceil(selectedEmployees.length / 8) !== 1 ? "s" : ""}
                    &nbsp;(8 per sheet)
                  </div>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print All
                  </button>
                </div>
                <div className="flex flex-wrap gap-4">
                  {selectedEmployees.map(emp => <IdCard key={emp.name} emp={emp} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Always-rendered print area (hidden on screen, shown by @media print) ── */}
      <div id="id-print-area" style={{ display: "none" }}>
        <div className="id-print-grid">
          {selectedEmployees.map(emp => <IdCard key={emp.name} emp={emp} />)}
        </div>
      </div>
    </Layout>
  );
}
