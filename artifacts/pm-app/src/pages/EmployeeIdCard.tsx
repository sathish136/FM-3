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
  date_of_birth: string | null;
  image: string | null;
  cell_number: string | null;
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

function WaveDecor({ id }: { id: string }) {
  return (
    <svg className="idc-deco" viewBox="0 0 190 295" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}bl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="0.5" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id={`${id}gr`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#064e3b" />
          <stop offset="0.5" stopColor="#059669" />
          <stop offset="1" stopColor="#065f46" />
        </linearGradient>
      </defs>
      <path d={`M0 0 C0 40 44 95 40 148 C36 201 0 255 0 295 Z`} fill={`url(#${id}bl)`} />
      <path d={`M190 0 C190 40 146 95 150 148 C154 201 190 255 190 295 Z`} fill={`url(#${id}gr)`} />
    </svg>
  );
}

function IdCardFront({ emp }: { emp: Employee }) {
  const [photoErr, setPhotoErr] = useState(false);
  const photoSrc = emp.image ? `${BASE}/api/hrms/image-proxy?path=${encodeURIComponent(emp.image)}` : null;
  const initials = emp.employee_name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
  const waveId = `f${emp.name.replace(/[^a-z0-9]/gi, "")}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(emp.name)}&bgcolor=ffffff&color=1e3a8a`;

  return (
    <div className="idc">
      <WaveDecor id={waveId} />
      <div className="idc-front-inner">
        <img src={`${BASE}/wtt-logo.png`} className="idc-logo" alt="WTT" />
        <div className="idc-wtt-text">WTT</div>
        <div className="idc-intl-text">INTERNATIONAL</div>
        <div className="idc-tag-text">Water Loving Technology</div>
        <div className="idc-photo-ring">
          {photoSrc && !photoErr ? (
            <img src={photoSrc} className="idc-photo-img" alt={emp.employee_name} onError={() => setPhotoErr(true)} />
          ) : (
            <div className="idc-photo-fb">{initials || "?"}</div>
          )}
        </div>
        <div className="idc-emp-name">{emp.employee_name.toUpperCase()}</div>
        <div className="idc-emp-dept">{cleanDept(emp.department)}</div>
        <img src={qrUrl} className="idc-qr" alt="QR" />
      </div>
    </div>
  );
}

function IdCardBack({ emp }: { emp: Employee }) {
  const waveId = `b${emp.name.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className="idc">
      <WaveDecor id={waveId} />
      <div className="idc-back-inner">
        <table className="idc-dtbl">
          <tbody>
            <tr>
              <td className="idc-dlbl">EMPLOYEE ID</td>
              <td className="idc-dcolon">:</td>
              <td className="idc-dval idc-dvbold">{emp.name}</td>
            </tr>
            <tr>
              <td className="idc-dlbl">DOJ</td>
              <td className="idc-dcolon">:</td>
              <td className="idc-dval">{formatDate(emp.date_of_joining)}</td>
            </tr>
            <tr>
              <td className="idc-dlbl">DOB</td>
              <td className="idc-dcolon">:</td>
              <td className="idc-dval">{formatDate(emp.date_of_birth)}</td>
            </tr>
            <tr>
              <td className="idc-dlbl">MOBILE NO</td>
              <td className="idc-dcolon">:</td>
              <td className="idc-dval">{emp.cell_number || ""}</td>
            </tr>
            <tr>
              <td className="idc-dlbl">EMERGENCY CONTACT</td>
              <td className="idc-dcolon">:</td>
              <td className="idc-dval">{emp.emergency_phone || ""}</td>
            </tr>
            <tr>
              <td className="idc-dlbl">BLOOD GROUP</td>
              <td className="idc-dcolon">:</td>
              <td className="idc-dval idc-dvbold">{emp.blood_group || ""}</td>
            </tr>
          </tbody>
        </table>
        <div className="idc-addr-section">
          <div className="idc-dlbl">ADDRESS :</div>
          <div className="idc-addr-box">{emp.permanent_address || ""}</div>
        </div>
        <div className="idc-sig-area">
          <div className="idc-sig-line" />
          <div className="idc-sig-label">Authorized Signature</div>
        </div>
        <div className="idc-co-block">
          <div className="idc-co-name">
            <strong>WTT INTERNATIONAL</strong>
            <span className="idc-co-pvt">PVT.LTD,</span>
          </div>
          <div>No.3, College Cross Road,</div>
          <div>Tirupur - 641602,</div>
          <div>Tamil Nadu, INDIA</div>
          <div>PH:+91-421-2241120-224 7707</div>
          <div>WWW.WTTINT.COM</div>
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
      <style>{`
        /* ── ID card base ── */
        .idc {
          width: 190px; height: 295px;
          background: #fff;
          position: relative; overflow: hidden;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 3px 10px rgba(0,0,0,.12);
          font-family: Arial, sans-serif;
          flex-shrink: 0;
        }
        .idc-deco {
          position: absolute; top: 0; left: 0;
          width: 100%; height: 100%;
          pointer-events: none;
        }

        /* ── FRONT ── */
        .idc-front-inner {
          position: relative;
          display: flex; flex-direction: column; align-items: center;
          padding: 10px 12px 6px;
          height: 100%; box-sizing: border-box;
        }
        .idc-logo {
          width: 50px; height: 50px;
          object-fit: contain;
          margin-bottom: 2px;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,.10));
        }
        .idc-wtt-text {
          font-size: 22px; font-weight: 900;
          color: #1e3a8a; letter-spacing: 2px; line-height: 1;
          margin-bottom: 1px;
        }
        .idc-intl-text {
          font-size: 7.5px; font-weight: 700;
          color: #ea580c; letter-spacing: 3px;
          text-transform: uppercase; line-height: 1.2;
          margin-bottom: 1px;
        }
        .idc-tag-text {
          font-size: 6px; color: #475569;
          font-style: italic; margin-bottom: 8px;
        }
        .idc-photo-ring {
          width: 76px; height: 76px; border-radius: 50%;
          border: 4px solid #f97316;
          box-shadow: 0 0 0 2px #fff, 0 0 0 5px #f97316;
          overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          background: #dbeafe;
          margin-bottom: 8px;
        }
        .idc-photo-img {
          width: 100%; height: 100%;
          object-fit: cover; border-radius: 50%;
        }
        .idc-photo-fb {
          width: 100%; height: 100%; border-radius: 50%;
          background: #1e40af;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 22px; font-weight: 700;
        }
        .idc-emp-name {
          font-size: 11.5px; font-weight: 900;
          color: #1e3a8a; letter-spacing: .5px;
          text-align: center; line-height: 1.2;
          margin-bottom: 2px;
        }
        .idc-emp-dept {
          font-size: 7.5px; color: #475569;
          font-weight: 600; text-align: center;
          margin-bottom: 6px;
        }
        .idc-qr {
          width: 52px; height: 52px;
        }

        /* ── BACK ── */
        .idc-back-inner {
          position: relative;
          padding: 10px 14px 8px 20px;
          height: 100%; box-sizing: border-box;
          display: flex; flex-direction: column;
        }
        .idc-dtbl {
          width: 100%; border-collapse: collapse;
          margin-bottom: 4px;
        }
        .idc-dtbl tr { height: 16px; }
        .idc-dlbl {
          font-size: 6.5px; font-weight: 700;
          color: #1e3a8a; white-space: nowrap;
          padding-right: 1px; vertical-align: top;
        }
        .idc-dcolon {
          font-size: 6.5px; color: #1e3a8a;
          padding: 0 3px; vertical-align: top;
        }
        .idc-dval {
          font-size: 6.5px; color: #1e293b;
          vertical-align: top;
        }
        .idc-dvbold { font-weight: 700; }
        .idc-addr-section { margin-bottom: 4px; }
        .idc-addr-box {
          border: .5px solid #94a3b8;
          min-height: 30px; padding: 2px 4px;
          font-size: 6px; color: #334155;
          line-height: 1.5; border-radius: 2px;
          margin-top: 1px;
        }
        .idc-sig-area {
          flex: 1;
          display: flex; flex-direction: column;
          justify-content: center; align-items: flex-end;
          padding-right: 6px; padding-bottom: 2px;
        }
        .idc-sig-line {
          width: 65px; border-top: .7px solid #334155;
          margin-bottom: 2px;
        }
        .idc-sig-label {
          font-size: 5.5px; color: #475569; font-style: italic;
        }
        .idc-co-block {
          text-align: center;
          font-size: 5.5px; color: #1e3a8a; line-height: 1.6;
          border-top: 1px solid #1e3a8a; padding-top: 3px;
        }
        .idc-co-name {
          font-size: 6.5px; font-weight: 700;
          margin-bottom: 1px; color: #1e3a8a;
        }
        .idc-co-pvt { color: #ea580c; margin-left: 1px; }

        /* ── screen card pair ── */
        .idc-pair {
          display: flex; gap: 10px; align-items: flex-start;
        }
        .idc-pair-label {
          font-size: 9px; color: #94a3b8; text-align: center;
          margin-bottom: 3px; font-weight: 600; letter-spacing: .5px;
        }

        /* ── PRINT ── */
        @media print {
          body > * { display: none !important; }
          #id-print-area {
            display: block !important;
            position: fixed !important; top: 0 !important; left: 0 !important;
            width: 210mm !important;
            padding: 8mm !important;
            background: #fff !important;
          }
          @page { size: A4 portrait; margin: 0; }

          .id-print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 53.963mm) !important;
            gap: 5mm 4mm !important;
          }
          .id-print-page2 {
            page-break-before: always !important;
          }

          .idc {
            width: 53.963mm !important; height: 84.088mm !important;
            box-shadow: none !important;
            border: .5px solid #94a3b8 !important;
            border-radius: 2mm !important;
          }
          .idc-pair-label { display: none !important; }

          /* front print */
          .idc-front-inner { padding: 2.5mm 3mm 1.5mm !important; }
          .idc-logo { width: 12mm !important; height: 12mm !important; }
          .idc-wtt-text { font-size: 12pt !important; letter-spacing: 1.5px !important; }
          .idc-intl-text { font-size: 3.5pt !important; letter-spacing: 2px !important; }
          .idc-tag-text { font-size: 3pt !important; margin-bottom: 2mm !important; }
          .idc-photo-ring { width: 20mm !important; height: 20mm !important; border-width: 1mm !important; box-shadow: 0 0 0 .5mm #fff, 0 0 0 1.3mm #f97316 !important; margin-bottom: 2mm !important; }
          .idc-emp-name { font-size: 6.5pt !important; }
          .idc-emp-dept { font-size: 5pt !important; margin-bottom: 1.5mm !important; }
          .idc-qr { width: 13mm !important; height: 13mm !important; }

          /* back print */
          .idc-back-inner { padding: 2.5mm 3.5mm 2mm 5mm !important; }
          .idc-dtbl tr { height: 4mm !important; }
          .idc-dlbl { font-size: 4.5pt !important; }
          .idc-dcolon { font-size: 4.5pt !important; }
          .idc-dval { font-size: 4.5pt !important; }
          .idc-addr-box { font-size: 3.5pt !important; min-height: 8mm !important; }
          .idc-sig-line { width: 18mm !important; }
          .idc-sig-label { font-size: 3.5pt !important; }
          .idc-co-block { font-size: 3.5pt !important; padding-top: 1mm !important; }
          .idc-co-name { font-size: 4pt !important; }
        }
      `}</style>

      <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CreditCard className="w-4 h-4 text-yellow-500 shrink-0" />
            <h1 className="text-sm font-bold text-gray-900">Employee ID Cards</h1>
            <span className="text-xs text-gray-400 ml-1">
              {employees.length > 0 ? `${employees.length} active employees` : "53.963 × 84.088 mm · print front & back on A4"}
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

        {error && (
          <div className="mx-6 mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden gap-4 p-4">

          {/* Employee list */}
          <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">

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
                {selected.size} selected · {Math.ceil(selected.size / 9)} A4 sheet{Math.ceil(selected.size / 9) !== 1 ? "s" : ""} (9/page)
              </div>
            )}

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

          {/* Preview area */}
          <div className="flex-1 overflow-y-auto">
            {selectedEmployees.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-gray-300" />
                </div>
                <div>
                  <div className="font-semibold text-gray-500 text-sm mb-1">No cards selected</div>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    Select employees to preview front &amp; back ID cards.<br />
                    Cards are <strong className="text-gray-500">53.963 × 84.088 mm</strong> portrait,
                    9 per A4 sheet.
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{selectedEmployees.length}</span> card{selectedEmployees.length !== 1 ? "s" : ""}
                    &nbsp;·&nbsp;
                    <span className="font-semibold text-gray-700">{Math.ceil(selectedEmployees.length / 9)}</span> A4 sheet{Math.ceil(selectedEmployees.length / 9) !== 1 ? "s" : ""}
                    &nbsp;(9 per sheet, fronts page 1 · backs page 2)
                  </div>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print All
                  </button>
                </div>
                <div className="flex flex-wrap gap-6">
                  {selectedEmployees.map(emp => (
                    <div key={emp.name} className="flex flex-col gap-0">
                      <div className="flex gap-2 mb-1">
                        <div style={{width:190, textAlign:"center"}} className="idc-pair-label">FRONT</div>
                        <div style={{width:190, textAlign:"center"}} className="idc-pair-label">BACK</div>
                      </div>
                      <div className="idc-pair">
                        <IdCardFront emp={emp} />
                        <IdCardBack emp={emp} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print area — always in DOM, hidden on screen */}
      <div id="id-print-area" style={{ display: "none" }}>
        {/* Page 1: all FRONTS */}
        <div className="id-print-grid">
          {selectedEmployees.map(emp => <IdCardFront key={emp.name} emp={emp} />)}
        </div>
        {/* Page 2: all BACKS */}
        <div className="id-print-grid id-print-page2">
          {selectedEmployees.map(emp => <IdCardBack key={emp.name} emp={emp} />)}
        </div>
      </div>
    </Layout>
  );
}
