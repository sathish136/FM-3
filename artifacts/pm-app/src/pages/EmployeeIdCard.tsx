import { Layout } from "@/components/Layout";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Filter, CheckSquare, Square, Printer, RefreshCw,
  Users, X, ChevronDown, Loader2, CreditCard, Download,
  CheckCheck, AlertCircle,
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
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function ImageWithFallback({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [errored, setErrored] = useState(false);
  const initials = alt
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const proxied = src
    ? `${BASE}/api/hrms/image-proxy?path=${encodeURIComponent(src)}`
    : null;

  if (!proxied || errored) {
    return (
      <div className={`${className} bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg`}>
        {initials || "?"}
      </div>
    );
  }
  return (
    <img
      src={proxied}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}

function IdCard({ emp }: { emp: Employee }) {
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const initials = emp.employee_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  useEffect(() => {
    if (emp.image) {
      setPhotoSrc(`${BASE}/api/hrms/image-proxy?path=${encodeURIComponent(emp.image)}`);
      setPhotoError(false);
    } else {
      setPhotoSrc(null);
    }
  }, [emp.image]);

  const dept = (emp.department || "").replace(/ - WTT$/i, "").replace(/ - WTT INTERNATIONAL.*$/i, "").toUpperCase();

  return (
    <div className="id-card">
      <div className="id-card-top">
        <div className="id-card-left">
          <div className="wtt-logo-block">
            <img src={`${BASE}/wtt-logo.png`} alt="WTT" className="wtt-logo-img" />
            <div className="wtt-logo-text">
              <div className="wtt-name">WTT</div>
              <div className="wtt-sub">I N T E R N A T I O N A L</div>
              <div className="wtt-tagline">Water Loving Technology</div>
            </div>
          </div>
          <div className="emp-photo-wrap">
            {photoSrc && !photoError ? (
              <img
                src={photoSrc}
                alt={emp.employee_name}
                className="emp-photo"
                onError={() => setPhotoError(true)}
              />
            ) : (
              <div className="emp-photo emp-photo-fallback">{initials || "?"}</div>
            )}
          </div>
        </div>
        <div className="id-card-right">
          <table className="id-detail-table">
            <tbody>
              <tr>
                <td className="id-label">EMPLOYEE ID</td>
                <td className="id-colon">:</td>
                <td className="id-value id-value-bold">{emp.name}</td>
              </tr>
              <tr>
                <td className="id-label">DOJ</td>
                <td className="id-colon">:</td>
                <td className="id-value">{formatDate(emp.date_of_joining)}</td>
              </tr>
              <tr>
                <td className="id-label">DOB</td>
                <td className="id-colon">:</td>
                <td className="id-value">{formatDate(emp.date_of_birth)}</td>
              </tr>
              <tr>
                <td className="id-label">MOBILE NO</td>
                <td className="id-colon">:</td>
                <td className="id-value">{emp.cell_number || ""}</td>
              </tr>
              <tr>
                <td className="id-label">EMERGENCY CONTACT</td>
                <td className="id-colon">:</td>
                <td className="id-value">{emp.emergency_phone || ""}</td>
              </tr>
              <tr>
                <td className="id-label">BLOOD GROUP</td>
                <td className="id-colon">:</td>
                <td className="id-value id-value-bold">{emp.blood_group || ""}</td>
              </tr>
            </tbody>
          </table>
          <div className="id-address-block">
            <div className="id-label-block">ADDRESS :</div>
            <div className="id-address-text">{emp.permanent_address || ""}</div>
          </div>
        </div>
      </div>
      <div className="id-card-bottom">
        <div className="id-card-bottom-left">
          <div className="emp-name-print">{emp.employee_name.toUpperCase()}</div>
          <div className="emp-dept-print">{dept}</div>
        </div>
        <div className="id-card-bottom-right">
          <div className="auth-sig">Authorized Signature</div>
          <div className="company-addr">
            <strong>WTT INTERNATIONAL PVT.LTD,</strong><br />
            No.3, College Cross Road,<br />
            Tirupur - 641602,<br />
            Tamil Nadu, INDIA<br />
            PH: +91-421-2241120 &nbsp; 224 7707<br />
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

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const departments = ["All", ...Array.from(new Set(employees.map((e) => (e.department || "").replace(/ - WTT.*$/i, "").trim()).filter(Boolean))).sort()];

  const filtered = employees.filter((e) => {
    const dept = (e.department || "").replace(/ - WTT.*$/i, "").trim();
    const matchDept = deptFilter === "All" || dept === deptFilter;
    const matchSearch =
      !search ||
      e.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.designation || "").toLowerCase().includes(search.toLowerCase());
    return matchSearch && matchDept;
  });

  const allSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.name));
  const someSelected = filtered.some((e) => selected.has(e.name));

  function toggleAll() {
    if (allSelected) {
      const next = new Set(selected);
      filtered.forEach((e) => next.delete(e.name));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((e) => next.add(e.name));
      setSelected(next);
    }
  }

  function toggleOne(name: string) {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelected(next);
  }

  const selectedEmployees = employees.filter((e) => selected.has(e.name));

  function handlePrint() {
    if (selectedEmployees.length === 0) return;
    window.print();
  }

  return (
    <Layout>
      <style>{`
        /* ── Screen styles ── */
        .idcard-page { padding: 24px; min-height: 100vh; }
        .idcard-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .idcard-title { font-size: 22px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
        .idcard-controls { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .idcard-search { position: relative; }
        .idcard-search input { padding: 8px 12px 8px 36px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #f1f5f9; font-size: 13px; outline: none; width: 200px; }
        .idcard-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #64748b; }
        .idcard-select { padding: 8px 12px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #f1f5f9; font-size: 13px; cursor: pointer; outline: none; }
        .btn-primary { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; background: #3b82f6; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: background .15s; }
        .btn-primary:hover { background: #2563eb; }
        .btn-primary:disabled { background: #475569; cursor: not-allowed; }
        .btn-ghost { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; background: transparent; color: #94a3b8; font-size: 13px; cursor: pointer; border: 1px solid #334155; transition: all .15s; }
        .btn-ghost:hover { background: #1e293b; color: #f1f5f9; }

        .idcard-body { display: flex; gap: 20px; }
        .idcard-list { width: 340px; flex-shrink: 0; background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; display: flex; flex-direction: column; max-height: calc(100vh - 160px); }
        .idcard-list-header { padding: 12px 16px; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 10px; background: #1a2744; }
        .idcard-list-header label { display: flex; align-items: center; gap-8px; cursor: pointer; color: #94a3b8; font-size: 13px; }
        .idcard-list-body { flex: 1; overflow-y: auto; }
        .emp-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #1e293b; cursor: pointer; transition: background .1s; }
        .emp-row:hover { background: #0f172a; }
        .emp-row.selected { background: #1e3a5f; }
        .emp-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: #334155; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #94a3b8; overflow: hidden; }
        .emp-info { flex: 1; min-width: 0; }
        .emp-info-name { font-size: 13px; font-weight: 600; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .emp-info-sub { font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .emp-id-badge { font-size: 10px; background: #334155; color: #94a3b8; border-radius: 4px; padding: 2px 6px; flex-shrink: 0; }

        .idcard-preview { flex: 1; background: #111827; border-radius: 12px; border: 1px solid #1e293b; padding: 20px; overflow-y: auto; max-height: calc(100vh - 160px); }
        .preview-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #4b5563; gap: 12px; text-align: center; padding: 40px; }
        .preview-grid { display: flex; flex-wrap: wrap; gap: 16px; }

        /* ── ID Card Styles (screen) ── */
        .id-card {
          width: 320px;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          overflow: hidden;
          background: #fff;
          font-family: Arial, sans-serif;
          box-shadow: 0 2px 8px rgba(0,0,0,.12);
          color: #1e293b;
          flex-shrink: 0;
        }
        .id-card-top { display: flex; min-height: 130px; }
        .id-card-left {
          width: 100px;
          background: linear-gradient(160deg, #0a2463 0%, #1e3a8a 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 6px;
          gap: 8px;
          flex-shrink: 0;
        }
        .wtt-logo-block { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .wtt-logo-img { width: 32px; height: 32px; object-fit: contain; filter: brightness(0) invert(1); }
        .wtt-logo-text { text-align: center; }
        .wtt-name { color: #fff; font-size: 13px; font-weight: 900; letter-spacing: 1px; line-height: 1; }
        .wtt-sub { color: #93c5fd; font-size: 5px; letter-spacing: .5px; line-height: 1.2; font-weight: 600; }
        .wtt-tagline { color: #bfdbfe; font-size: 5px; font-style: italic; line-height: 1.2; }
        .emp-photo-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }
        .emp-photo { width: 60px; height: 72px; object-fit: cover; border-radius: 4px; border: 2px solid #3b82f6; }
        .emp-photo-fallback { width: 60px; height: 72px; border-radius: 4px; border: 2px solid #3b82f6; background: #1e40af; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 18px; }
        .id-card-right { flex: 1; padding: 8px 10px; }
        .id-detail-table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
        .id-detail-table tr { height: 16px; }
        .id-label { color: #475569; white-space: nowrap; padding-right: 4px; font-size: 8px; width: 86px; }
        .id-colon { color: #94a3b8; padding-right: 4px; }
        .id-value { color: #1e293b; font-size: 8.5px; }
        .id-value-bold { font-weight: 700; }
        .id-address-block { margin-top: 4px; }
        .id-label-block { font-size: 8px; color: #475569; font-weight: 600; }
        .id-address-text { font-size: 7.5px; color: #334155; line-height: 1.4; margin-top: 2px; }
        .id-card-bottom {
          display: flex;
          border-top: 2px solid #0a2463;
          background: #f8fafc;
          padding: 6px 10px;
          align-items: flex-start;
          gap: 6px;
          min-height: 52px;
        }
        .id-card-bottom-left { flex: 1; }
        .emp-name-print { font-size: 10px; font-weight: 900; color: #0a2463; letter-spacing: .5px; }
        .emp-dept-print { font-size: 8px; color: #1e40af; font-weight: 600; margin-top: 2px; }
        .id-card-bottom-right { text-align: right; }
        .auth-sig { font-size: 7px; color: #475569; font-style: italic; border-top: .5px solid #475569; padding-top: 2px; display: inline-block; margin-bottom: 3px; }
        .company-addr { font-size: 6.5px; color: #334155; line-height: 1.5; text-align: right; }

        /* ── Selection count bar ── */
        .sel-bar { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: #1a3a5c; border-bottom: 1px solid #334155; font-size: 12px; color: #93c5fd; }

        /* ── PRINT STYLES ── */
        @media print {
          body > * { display: none !important; }
          #print-area {
            display: block !important;
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 8mm !important;
            background: #fff !important;
          }
          @page { size: A4 portrait; margin: 0; }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 88mm) !important;
            gap: 6mm !important;
          }
          .id-card {
            width: 88mm !important;
            border: 1.5px solid #94a3b8 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .id-card-left { width: 28mm !important; padding: 4mm 3mm !important; }
          .wtt-logo-img { width: 10mm !important; height: 10mm !important; }
          .wtt-name { font-size: 9pt !important; }
          .wtt-sub { font-size: 4pt !important; }
          .wtt-tagline { font-size: 4pt !important; }
          .emp-photo { width: 18mm !important; height: 22mm !important; }
          .emp-photo-fallback { width: 18mm !important; height: 22mm !important; font-size: 14pt !important; }
          .id-card-right { padding: 3mm 4mm !important; }
          .id-detail-table { font-size: 7pt !important; }
          .id-label { font-size: 6.5pt !important; width: 26mm !important; }
          .id-value { font-size: 7pt !important; }
          .id-address-block { margin-top: 2mm !important; }
          .id-label-block { font-size: 6pt !important; }
          .id-address-text { font-size: 6pt !important; }
          .id-card-bottom { padding: 2mm 3mm !important; min-height: 14mm !important; }
          .emp-name-print { font-size: 8pt !important; }
          .emp-dept-print { font-size: 6pt !important; }
          .auth-sig { font-size: 5.5pt !important; }
          .company-addr { font-size: 5pt !important; }
          .id-card-top { min-height: 0 !important; }
          .id-detail-table tr { height: auto !important; }
        }
      `}</style>

      <div className="idcard-page">
        <div className="idcard-header">
          <div className="idcard-title">
            <CreditCard className="w-6 h-6 text-blue-400" />
            <span>Employee ID Cards</span>
            <span className="text-sm font-normal text-slate-400">
              ({employees.length} employees)
            </span>
          </div>
          <div className="idcard-controls">
            <button className="btn-ghost" onClick={fetchEmployees} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              className="btn-primary"
              onClick={handlePrint}
              disabled={selectedEmployees.length === 0}
            >
              <Printer className="w-4 h-4" />
              Print {selectedEmployees.length > 0 ? `(${selectedEmployees.length})` : ""} on A4
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-950/60 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="idcard-body">
          {/* ── Employee List ── */}
          <div className="idcard-list">
            <div className="idcard-list-header">
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                ) : someSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-300/50" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="text-xs">
                  {allSelected ? "Deselect All" : "Select All"}
                </span>
              </button>
              <span className="text-xs text-slate-500 ml-auto">
                {filtered.length} shown
              </span>
            </div>

            <div style={{ padding: "8px 10px", borderBottom: "1px solid #334155", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div className="idcard-search" style={{ width: "100%" }}>
                <Search className="idcard-search-icon" style={{ width: 14, height: 14 }} />
                <input
                  style={{ width: "100%", boxSizing: "border-box" }}
                  placeholder="Search name / ID / designation…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="idcard-select"
                style={{ width: "100%" }}
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {selected.size > 0 && (
              <div className="sel-bar">
                <span>{selected.size} selected for print</span>
                <button onClick={() => setSelected(new Set())} className="flex items-center gap-1 hover:text-white transition-colors">
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
            )}

            <div className="idcard-list-body">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-slate-500 text-sm gap-2">
                  <Users className="w-8 h-8" />
                  No employees found
                </div>
              ) : (
                filtered.map((emp) => (
                  <div
                    key={emp.name}
                    className={`emp-row ${selected.has(emp.name) ? "selected" : ""}`}
                    onClick={() => toggleOne(emp.name)}
                  >
                    {selected.has(emp.name) ? (
                      <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    )}
                    <ImageWithFallback
                      src={emp.image}
                      alt={emp.employee_name}
                      className="emp-avatar"
                    />
                    <div className="emp-info">
                      <div className="emp-info-name">{emp.employee_name}</div>
                      <div className="emp-info-sub">
                        {[emp.designation, (emp.department || "").replace(/ - WTT.*$/i, "")].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="emp-id-badge">{emp.name}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Preview ── */}
          <div className="idcard-preview">
            {selectedEmployees.length === 0 ? (
              <div className="preview-empty">
                <CreditCard className="w-14 h-14 text-slate-700" />
                <div>
                  <div className="text-slate-400 font-semibold text-base mb-1">No cards selected</div>
                  <div className="text-slate-600 text-sm">
                    Select employees from the list to preview their ID cards here.<br />
                    Then click <strong>Print on A4</strong> to print all selected cards.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-slate-400">
                    Preview — <strong className="text-white">{selectedEmployees.length}</strong> card{selectedEmployees.length !== 1 ? "s" : ""}
                    &nbsp;·&nbsp;
                    {Math.ceil(selectedEmployees.length / 8)} A4 sheet{Math.ceil(selectedEmployees.length / 8) !== 1 ? "s" : ""}
                    &nbsp;(8 per sheet)
                  </div>
                  <button
                    className="btn-primary"
                    onClick={handlePrint}
                  >
                    <Printer className="w-4 h-4" />
                    Print All
                  </button>
                </div>
                <div className="preview-grid">
                  {selectedEmployees.map((emp) => (
                    <IdCard key={emp.name} emp={emp} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Print Area — always in DOM, hidden on screen, shown by @media print ── */}
      <div id="print-area" style={{ display: "none" }}>
        <div className="print-grid">
          {selectedEmployees.map((emp) => (
            <IdCard key={emp.name} emp={emp} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
