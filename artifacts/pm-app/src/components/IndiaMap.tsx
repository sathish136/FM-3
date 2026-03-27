import { useEffect, useRef, useState, useMemo } from "react";
import { Download, X, MapPin, Users, Newspaper, Target, RefreshCw, ArrowUpRight, Wifi, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";

// ── State name → SVG path ID ──────────────────────────────────────────────────

const STATE_ID_MAP: Record<string, string> = {
  "Andaman and Nicobar Islands": "INAN",
  "Andaman and Nicobar": "INAN",
  "Telangana": "INTG",
  "Andhra Pradesh": "INAP",
  "Arunachal Pradesh": "INAR",
  "Assam": "INAS",
  "Bihar": "INBR",
  "Chandigarh": "INCH",
  "Chhattisgarh": "INCT",
  "Dadra and Nagar Haveli": "INDH",
  "Dadra and Nagar Haveli and Daman and Diu": "INDH",
  "Delhi": "INDL",
  "Goa": "INGA",
  "Gujarat": "INGJ",
  "Haryana": "INHR",
  "Himachal Pradesh": "INHP",
  "Jharkhand": "INJH",
  "Karnataka": "INKA",
  "Kerala": "INKL",
  "Madhya Pradesh": "INMP",
  "Maharashtra": "INMH",
  "Manipur": "INMN",
  "Meghalaya": "INML",
  "Mizoram": "INMZ",
  "Nagaland": "INNL",
  "Odisha": "INOR",
  "Puducherry": "INPY",
  "Punjab": "INPB",
  "Rajasthan": "INRJ",
  "Sikkim": "INSK",
  "Tamil Nadu": "INTN",
  "Tripura": "INTR",
  "Uttar Pradesh": "INUP",
  "Uttarakhand": "INUT",
  "West Bengal": "INWB",
  "Lakshadweep": "INLD",
  "Jammu & Kashmir": "INJK",
  "Jammu and Kashmir": "INJK",
  "Ladakh": "INLA",
};

// Reverse map: SVG ID → state name
const ID_STATE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ID_MAP).map(([k, v]) => [v, k])
);

function getStateColor(total: number): string {
  if (!total || total === 0) return "#e2e8f0";
  if (total >= 500) return "#1e3a8a";
  if (total >= 200) return "#1d4ed8";
  if (total >= 100) return "#2563eb";
  if (total >= 50)  return "#3b82f6";
  if (total >= 20)  return "#60a5fa";
  if (total >= 5)   return "#93c5fd";
  return "#bfdbfe";
}

function getStateColorHover(total: number): string {
  if (!total || total === 0) return "#cbd5e1";
  return "#f59e0b";
}

type StateStats = Record<string, { total: number; Open: number; Converted: number; Opportunity: number; Quotation: number; Lead?: number; Closed?: number; Replied?: number }>;

// ── Inline state news + competitor panel ─────────────────────────────────────

function InlineStateAnalysis({ stateName }: { stateName: string }) {
  const newsQ = useQuery({
    queryKey: ["state-news-inline", stateName],
    queryFn: async () => {
      const r = await fetch(`/api/marketing/state-news?state=${encodeURIComponent(stateName)}`);
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const compQ = useQuery({
    queryKey: ["state-comp-inline", stateName],
    queryFn: async () => {
      const r = await fetch(`/api/marketing/state-competitor-analysis?state=${encodeURIComponent(stateName)}`);
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const articles: any[] = newsQ.data?.news ?? newsQ.data?.articles ?? [];
  const competitors: any[] = compQ.data?.competitors ?? [];

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* News */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-teal-500" />
            <span className="font-bold text-gray-800 text-sm">{stateName} — Industry News</span>
          </div>
          {newsQ.isLoading && <RefreshCw className="w-3.5 h-3.5 text-teal-400 animate-spin" />}
        </div>
        <div className="overflow-auto max-h-64 divide-y divide-gray-50">
          {newsQ.isLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-gray-300 text-xs">
              <Wifi className="w-4 h-4 animate-pulse text-teal-300" /> Fetching news...
            </div>
          ) : articles.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-gray-300 text-xs gap-2">
              <Newspaper className="w-4 h-4" /> No articles available
            </div>
          ) : articles.map((a: any, i: number) => (
            <div key={i} className="px-4 py-3 hover:bg-gray-50 transition-colors">
              <p className="font-semibold text-gray-800 text-xs leading-snug mb-1">{a.title}</p>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>{a.source}</span><span>{a.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Competitors */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-500" />
            <span className="font-bold text-gray-800 text-sm">{stateName} — Competitor Analysis</span>
          </div>
          {compQ.isLoading && <RefreshCw className="w-3.5 h-3.5 text-rose-400 animate-spin" />}
        </div>
        <div className="overflow-auto max-h-64">
          {compQ.isLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-gray-300 text-xs">
              <Target className="w-4 h-4 animate-pulse text-rose-300" /> Analyzing...
            </div>
          ) : competitors.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-gray-300 text-xs gap-2">
              <Building2 className="w-4 h-4" /> No competitor data
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-800 text-white">
                <tr>
                  {["Competitor", "Activities", "Technology", "Website"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {competitors.map((c: any, i: number) => (
                  <tr key={i} className={cn("border-b border-gray-50 hover:bg-gray-50", i % 2 !== 0 ? "bg-gray-50/30" : "")}>
                    <td className="px-3 py-2 font-bold text-gray-800 whitespace-nowrap">{c.name}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-40 line-clamp-2">{c.activities}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-40 line-clamp-2">{c.technology}</td>
                    <td className="px-3 py-2">
                      {c.website && c.website !== "#" ? (
                        <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 font-semibold text-[10px]">
                          Visit <ArrowUpRight className="w-2.5 h-2.5" />
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  stateStats: StateStats;
  leads: any[];
  isLoading: boolean;
  globalStats: Record<string, number>;
}

export function IndiaMap({ stateStats, leads, isLoading, globalStats }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ name: string; total: number; x: number; y: number } | null>(null);

  // Reverse-lookup: find the canonical state name (from stateStats keys) given a state name variation
  const normalizeState = (name: string): string | null => {
    // Direct match
    if (stateStats[name]) return name;
    // Try via STATE_ID_MAP (many alias → same SVG id)
    const svgId = STATE_ID_MAP[name];
    if (!svgId) return null;
    // Find a stateStats key that maps to the same SVG id
    for (const key of Object.keys(stateStats)) {
      if (STATE_ID_MAP[key] === svgId || key === name) return key;
    }
    return null;
  };

  // Load & inject SVG
  useEffect(() => {
    const BASE = import.meta.env.BASE_URL ?? "/pm-app/";
    fetch(`${BASE}india.svg`)
      .then(r => r.text())
      .then(svgText => {
        if (!mapContainerRef.current) return;

        // Parse the SVG
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        const svg = doc.querySelector("svg");
        if (!svg) return;

        // Style the SVG
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.display = "block";

        // Color each state path
        const features = svg.querySelector("#features");
        if (features) {
          const children = Array.from(features.children);
          children.forEach(el => {
            const id = el.getAttribute("id");
            if (!id) return;
            const stateName = ID_STATE_MAP[id];
            const statsKey = stateName ? normalizeState(stateName) : null;
            const total = statsKey ? (stateStats[statsKey]?.total ?? 0) : 0;

            el.setAttribute("fill", getStateColor(total));
            el.setAttribute("stroke", "#94a3b8");
            el.setAttribute("stroke-width", "0.8");
            el.setAttribute("cursor", "pointer");
            el.setAttribute("data-state", stateName || id);
            el.setAttribute("data-total", String(total));

            // Store default color for hover restore
            el.setAttribute("data-fill", getStateColor(total));
          });
        }

        // Add lead count labels on top of label circles
        const labelPoints = svg.querySelector("#label_points");
        const labelsGroup = doc.createElementNS("http://www.w3.org/2000/svg", "g");
        labelsGroup.setAttribute("id", "lead_labels");
        labelsGroup.setAttribute("pointer-events", "none");

        if (labelPoints) {
          Array.from(labelPoints.children).forEach(circle => {
            const id = circle.getAttribute("id");
            if (!id) return;
            const cx = circle.getAttribute("cx");
            const cy = circle.getAttribute("cy");
            if (!cx || !cy) return;

            const stateName = ID_STATE_MAP[id];
            const statsKey = stateName ? normalizeState(stateName) : null;
            const total = statsKey ? (stateStats[statsKey]?.total ?? 0) : 0;

            if (total === 0) return; // skip states with no leads

            const x = parseFloat(cx);
            const y = parseFloat(cy);

            // Badge background
            const badge = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
            const r = total >= 100 ? 20 : total >= 10 ? 17 : 14;
            badge.setAttribute("cx", String(x));
            badge.setAttribute("cy", String(y));
            badge.setAttribute("r", String(r));
            badge.setAttribute("fill", "white");
            badge.setAttribute("stroke", "#1d4ed8");
            badge.setAttribute("stroke-width", "1.5");
            badge.setAttribute("opacity", "0.95");
            labelsGroup.appendChild(badge);

            // Label text
            const text = doc.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", String(x));
            text.setAttribute("y", String(y + 4));
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("font-size", total >= 100 ? "11" : "10");
            text.setAttribute("font-weight", "700");
            text.setAttribute("fill", "#1d4ed8");
            text.textContent = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total);
            labelsGroup.appendChild(text);
          });
        }

        svg.appendChild(labelsGroup);

        // Remove original label_points (circles only used for position reference)
        const lp = svg.querySelector("#label_points");
        if (lp) lp.setAttribute("display", "none");
        const pts = svg.querySelector("#points");
        if (pts) pts.setAttribute("display", "none");

        // Serialize and inject
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        mapContainerRef.current.innerHTML = svgString;
        setSvgLoaded(true);
      })
      .catch(console.error);
  }, [stateStats]); // re-run when stats change

  // Attach native event handlers after SVG is injected
  useEffect(() => {
    if (!svgLoaded || !mapContainerRef.current) return;
    const container = mapContainerRef.current;
    const svg = container.querySelector("svg");
    if (!svg) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as SVGElement;
      const el = target.closest("[data-state]") as SVGElement | null;
      if (!el) return;
      const stateName = el.getAttribute("data-state") || null;
      const total = parseInt(el.getAttribute("data-total") || "0", 10);
      if (total === 0) return;
      setSelectedState(prev => prev === stateName ? null : stateName);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as SVGElement;
      const el = target.closest("[data-state]") as SVGElement | null;
      if (!el) { setTooltip(null); return; }
      const stateName = el.getAttribute("data-state") || "";
      const total = parseInt(el.getAttribute("data-total") || "0", 10);
      if (total === 0) { setTooltip(null); return; }
      setTooltip({ name: stateName, total, x: e.clientX, y: e.clientY });

      // Highlight on hover
      const defaultFill = el.getAttribute("data-fill") || "#e2e8f0";
      el.setAttribute("fill", getStateColorHover(total));
      el.setAttribute("data-hovered", "1");
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as SVGElement;
      const el = target.closest("[data-state]") as SVGElement | null;
      if (el && el.getAttribute("data-hovered")) {
        el.setAttribute("fill", el.getAttribute("data-fill") || "#e2e8f0");
        el.removeAttribute("data-hovered");
      }
      setTooltip(null);
    };

    svg.addEventListener("click", handleClick);
    svg.addEventListener("mousemove", handleMouseMove);
    svg.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      svg.removeEventListener("click", handleClick);
      svg.removeEventListener("mousemove", handleMouseMove);
      svg.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [svgLoaded]);

  // ── Selected state panel data
  const selectedData = selectedState ? (() => {
    const key = normalizeState(selectedState) ?? selectedState;
    return stateStats[key] ?? null;
  })() : null;

  // ── India KPI overview
  const indiaTotal = leads.length;
  const indiaByStatus = useMemo(() => {
    const s: Record<string, number> = {};
    for (const l of leads) {
      const st = l.status || "Unknown";
      s[st] = (s[st] || 0) + 1;
    }
    return s;
  }, [leads]);

  // ── Filtered table
  const sortedStates = Object.entries(stateStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 100);

  function exportData() {
    const rows = sortedStates.map(([state, s]) => ({
      State: state, Total: s.total, Open: s.Open,
      Converted: s.Converted, Opportunity: s.Opportunity, Quotation: s.Quotation,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "India Leads");
    XLSX.writeFile(wb, "India_State_Leads.xlsx");
  }

  return (
    <div className="space-y-5">
      {/* Map + sidebar */}
      <div className="flex gap-4" style={{ minHeight: 520 }}>
        {/* Map */}
        <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-400 gap-2 text-sm">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Loading India lead data...
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: 480 }} />
          )}

          {/* Tooltip */}
          {tooltip && (
            <div
              className="fixed z-50 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg pointer-events-none shadow-xl"
              style={{ left: tooltip.x + 14, top: tooltip.y - 32 }}
            >
              <span className="font-semibold">{tooltip.name}</span>
              <span className="text-gray-300 ml-2">{tooltip.total} leads</span>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm border border-gray-100 rounded-xl p-2.5 shadow-sm">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Leads</p>
            {[
              { color: "#1e3a8a", label: "500+" },
              { color: "#2563eb", label: "100–500" },
              { color: "#60a5fa", label: "20–100" },
              { color: "#93c5fd", label: "5–20" },
              { color: "#bfdbfe", label: "1–5" },
              { color: "#e2e8f0", label: "None" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 mb-1">
                <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: color }} />
                <span className="text-[10px] text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-72 flex flex-col gap-3">
          {/* India Overview */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
            <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" /> India Overview
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 bg-blue-600 rounded-xl p-3">
                <p className="text-blue-200 text-xs font-medium">Total Leads</p>
                <p className="text-white text-2xl font-black">{isLoading ? "—" : indiaTotal.toLocaleString()}</p>
              </div>
              {[
                { label: "Open",        value: indiaByStatus.Open ?? 0,               color: "text-blue-600" },
                { label: "Converted",   value: indiaByStatus.Converted ?? 0,          color: "text-emerald-600" },
                { label: "Opportunity", value: indiaByStatus.Opportunity ?? 0,        color: "text-violet-600" },
                { label: "Quotation",   value: indiaByStatus.Quotation ?? 0,          color: "text-amber-600" },
                { label: "Replied",     value: indiaByStatus.Replied ?? 0,            color: "text-teal-600" },
                { label: "Lead",        value: indiaByStatus.Lead ?? 0,               color: "text-sky-600" },
                { label: "Closed",      value: indiaByStatus.Closed ?? 0,             color: "text-gray-600" },
                { label: "Lost Quotation", value: indiaByStatus["Lost Quotation"] ?? 0, color: "text-red-600" },
                { label: "Do Not Contact", value: indiaByStatus["Do Not Contact"] ?? 0, color: "text-rose-600" },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-2.5">
                  <p className="text-gray-400 text-[10px] font-medium">{s.label}</p>
                  <p className={cn("font-bold text-lg", s.color)}>{isLoading ? "—" : s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Selected State Detail */}
          {selectedState && selectedData ? (
            <div className="bg-white border border-blue-100 rounded-2xl shadow-sm p-4 flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800 text-sm">{selectedState}</h3>
                <button onClick={() => setSelectedState(null)} className="text-gray-300 hover:text-gray-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-blue-50 rounded-lg px-3 py-2">
                  <span className="text-blue-700 font-semibold text-xs">Total</span>
                  <span className="text-blue-900 font-black text-lg">{selectedData.total}</span>
                </div>
                {[
                  { label: "Open",        value: selectedData.Open,        color: "text-blue-600" },
                  { label: "Converted",   value: selectedData.Converted,   color: "text-emerald-600" },
                  { label: "Opportunity", value: selectedData.Opportunity, color: "text-violet-600" },
                  { label: "Quotation",   value: selectedData.Quotation,   color: "text-amber-600" },
                ].map(s => (
                  <div key={s.label} className="flex justify-between items-center px-1">
                    <span className="text-gray-500 text-xs">{s.label}</span>
                    <span className={cn("font-bold", s.color)}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex-1 flex flex-col items-center justify-center gap-2">
              <Users className="w-6 h-6 text-blue-300" />
              <p className="text-blue-400 text-xs text-center leading-relaxed">
                Click any state on the map<br/>to see its lead breakdown
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Inline state news + competitor analysis */}
      {selectedState && <InlineStateAnalysis stateName={selectedState} />}

      {/* State Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">India Leads Data</h3>
            <p className="text-gray-400 text-xs mt-0.5">{indiaTotal.toLocaleString()} leads across {Object.keys(stateStats).length} states/cities</p>
          </div>
          <button
            onClick={exportData}
            className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2 text-sm hover:bg-emerald-100 transition-colors font-semibold"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
        <div className="overflow-auto max-h-80">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
              <tr>
                {["#", "State / City", "Total", "Open", "Converted", "Opportunity", "Quotation"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-300">Loading...</td></tr>
              ) : sortedStates.map(([state, s], i) => (
                <tr
                  key={state}
                  className={cn(
                    "border-b border-gray-50 transition-colors cursor-pointer",
                    selectedState === state ? "bg-blue-50" : i % 2 !== 0 ? "bg-gray-50/30 hover:bg-blue-50/40" : "hover:bg-blue-50/40"
                  )}
                  onClick={() => setSelectedState(selectedState === state ? null : state)}
                >
                  <td className="px-4 py-2.5 text-gray-300 font-semibold">{i + 1}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{state}</td>
                  <td className="px-4 py-2.5 font-black text-gray-900 text-sm">{s.total}</td>
                  <td className="px-4 py-2.5 text-blue-600 font-semibold">{s.Open}</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-semibold">{s.Converted}</td>
                  <td className="px-4 py-2.5 text-violet-600 font-semibold">{s.Opportunity}</td>
                  <td className="px-4 py-2.5 text-amber-600 font-semibold">{s.Quotation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
