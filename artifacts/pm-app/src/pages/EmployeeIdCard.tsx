import { Layout } from "@/components/Layout";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, CheckSquare, Square, RefreshCw,
  Users, X, Loader2, CreditCard, AlertCircle,
  ChevronDown, FileDown, Scissors,
} from "lucide-react";
import { generateIdCardPdf, getPairsPerSheet } from "@/lib/idCardPrint";

const PAIRS_PER_SHEET = getPairsPerSheet();

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

const svgCache = new Map<string, string>();
/** Bump when server SVG output shape changes (embedded assets, address text, etc.). */
const SVG_CACHE_VERSION = "v3";

async function fetchIdCardSvg(emp: Employee, side: "front" | "back"): Promise<string> {
  const key = `${SVG_CACHE_VERSION}:${emp.name}:${side}:${emp.image ?? ""}`;
  const hit = svgCache.get(key);
  if (hit) return hit;

  const res = await fetch(`${BASE}/api/hrms/id-card/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employee: emp, side }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Render failed: ${res.status}`);
  }
  const svg = await res.text();
  svgCache.set(key, svg);
  return svg;
}

function IdCardSvgFace({ emp, side }: { emp: Employee; side: "front" | "back" }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);
    fetchIdCardSvg(emp, side)
      .then(html => {
        if (!cancelled) setSvg(html);
      })
      .catch(e => {
        if (!cancelled) setError(e.message ?? "Failed to load card");
      });
    return () => { cancelled = true; };
  }, [emp, side]);

  return (
    <div className="idc" ref={hostRef}>
      {error && (
        <div className="idc-err">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {!error && !svg && (
        <div className="idc-loading">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
        </div>
      )}
      {svg && (
        <div
          className="idc-svg-host"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load employees");
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
  const [showCutMarks, setShowCutMarks] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleDownloadPdf() {
    if (!selectedEmployees.length) return;
    setPdfLoading(true);
    try {
      const byName = new Map(selectedEmployees.map(e => [e.name, e]));
      await generateIdCardPdf(
        selectedEmployees,
        async (name, side) => {
          const emp = byName.get(name);
          if (!emp) throw new Error(`Employee ${name} not found`);
          return fetchIdCardSvg(emp, side);
        },
        { cutMarks: showCutMarks },
      );
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <Layout>
      <style>{`
        .idc {
          width: 190px;
          height: 295px;
          background: #fff;
          position: relative;
          overflow: hidden;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 3px 10px rgba(0,0,0,.12);
          flex-shrink: 0;
        }
        .idc-svg-host,
        .idc-svg-host svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .idc-loading,
        .idc-err {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          font-size: 10px;
          color: #64748b;
          text-align: center;
        }
        .idc-err { color: #dc2626; flex-direction: column; }

        .idc-pair {
          display: flex;
          gap: 1mm;
          align-items: flex-start;
        }
        .idc-pair-label {
          font-size: 9px;
          color: #94a3b8;
          text-align: center;
          margin-bottom: 3px;
          font-weight: 600;
          letter-spacing: .5px;
        }
      `}</style>

      <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">

        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CreditCard className="w-4 h-4 text-yellow-500 shrink-0" />
            <h1 className="text-sm font-bold text-gray-900">Employee ID Cards</h1>
            <span className="text-xs text-gray-400 ml-1">
              {employees.length > 0 ? `${employees.length} active employees` : "53.963 × 84.088 mm · orignal.svg template"}
            </span>
          </div>
          <button
            onClick={fetchEmployees}
            disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCutMarks}
              onChange={e => setShowCutMarks(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
            />
            <Scissors className="w-3.5 h-3.5" />
            Cutting marks
          </label>
          <button
            onClick={handleDownloadPdf}
            disabled={selectedEmployees.length === 0 || pdfLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pdfLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <FileDown className="w-3.5 h-3.5" />}
            A4 PDF
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden gap-4 p-4">

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
                {selected.size} selected · PDF {Math.ceil(selected.size / PAIRS_PER_SHEET)} sheet{Math.ceil(selected.size / PAIRS_PER_SHEET) !== 1 ? "s" : ""} ({PAIRS_PER_SHEET} pairs/page)
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

          <div className="flex-1 overflow-y-auto">
            {selectedEmployees.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-gray-300" />
                </div>
                <div>
                  <div className="font-semibold text-gray-500 text-sm mb-1">No cards selected</div>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    Select employees to preview front &amp; back ID cards from <strong className="text-gray-500">orignal.svg</strong>.<br />
                    Cards are <strong className="text-gray-500">53.963 × 84.088 mm</strong>. PDF: A4 landscape, front|back pairs ({PAIRS_PER_SHEET}/page).
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xs text-gray-500 mb-4">
                  <span className="font-semibold text-gray-700">{selectedEmployees.length}</span> card{selectedEmployees.length !== 1 ? "s" : ""}
                  &nbsp;·&nbsp;
                  <span className="font-semibold text-gray-700">{Math.ceil(selectedEmployees.length / PAIRS_PER_SHEET)}</span> PDF sheet{Math.ceil(selectedEmployees.length / PAIRS_PER_SHEET) !== 1 ? "s" : ""}
                  &nbsp;(landscape, {PAIRS_PER_SHEET} pairs/page)
                </div>
                <div className="flex flex-wrap gap-6">
                  {selectedEmployees.map(emp => (
                    <div key={emp.name} className="flex flex-col gap-0">
                      <div className="flex gap-2 mb-1">
                        <div style={{ width: 190, textAlign: "center" }} className="idc-pair-label">FRONT</div>
                        <div style={{ width: 190, textAlign: "center" }} className="idc-pair-label">BACK</div>
                      </div>
                      <div className="idc-pair">
                        <IdCardSvgFace emp={emp} side="front" />
                        <IdCardSvgFace emp={emp} side="back" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
