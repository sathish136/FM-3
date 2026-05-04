import { Layout } from "@/components/Layout";
import { useState, useRef, useCallback } from "react";
import {
  Upload, X, FileImage, Sparkles, ChevronDown, ChevronUp,
  Plus, Download, RefreshCw, Building2,
  CheckCircle2, AlertCircle, Loader2, ZoomIn, ZoomOut, RotateCcw,
  Ruler, Hash, AreaChart, Maximize2,
  ClipboardList, Search, History, ChevronRight,
  Droplets, Factory, Pencil, Send,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Mode = "analyze" | "generate";
type PlantType = "ETP" | "STP" | "ZLD";

interface Measurement {
  item: string; type: "area" | "length" | "count" | "volume" | "dimension";
  value: number; unit: string; notes?: string;
}
interface AnalysisResult {
  measurements: Measurement[]; summary: string; keyFindings: string[];
  drawingType: string; scale: string; disclaimer?: string;
}
interface AnalysisRecord {
  id: string; projectName: string; instruction: string; imageDataUrl: string;
  result: AnalysisResult; createdAt: string;
}

const ETP_PROCESS_OPTIONS = [
  { id: "inlet_chamber",       label: "Inlet Chamber / Manhole" },
  { id: "bar_screen",          label: "Bar Screen & Grit Chamber" },
  { id: "equalization",        label: "Equalization Tank" },
  { id: "primary_clarifier",   label: "Primary Clarifier / PST" },
  { id: "flash_mixer",         label: "Flash Mixer & Flocculator" },
  { id: "coagulation",         label: "Coagulation / Chemical Dosing" },
  { id: "aeration",            label: "Aeration Tank (Biological)" },
  { id: "mbr",                 label: "MBR (Membrane Bio-Reactor)" },
  { id: "sbr",                 label: "Sequential Batch Reactor (SBR)" },
  { id: "secondary_clarifier", label: "Secondary Clarifier / SST" },
  { id: "sand_filter",         label: "Pressure Sand Filter" },
  { id: "acf",                 label: "Activated Carbon Filter" },
  { id: "chlorination",        label: "Chlorination Contact Tank" },
  { id: "treated_storage",     label: "Treated Water Storage / UGT" },
  { id: "sludge_thickener",    label: "Sludge Thickener" },
  { id: "sludge_holding",      label: "Sludge Holding Tank" },
  { id: "filter_press",        label: "Filter Press / Dewatering" },
  { id: "pump_station",        label: "Pump Station / MCC Room" },
  { id: "chemical_room",       label: "Chemical Storage Room" },
  { id: "blower_room",         label: "Blower / Compressor Room" },
];
const STP_PROCESS_OPTIONS = [
  { id: "screening_chamber",   label: "Screening Chamber" },
  { id: "grit_trap",           label: "Grit Trap / Oil Grease Trap" },
  { id: "equalization_stp",    label: "Equalization Tank" },
  { id: "anoxic_tank",         label: "Anoxic Tank" },
  { id: "aeration_stp",        label: "Aeration Tank (FAB/MBR)" },
  { id: "secondary_clarifier", label: "Secondary Clarifier" },
  { id: "sludge_sump",         label: "Sludge Sump" },
  { id: "sludge_drying",       label: "Sludge Drying Beds" },
  { id: "chlorination_stp",    label: "Chlorination / Disinfection" },
  { id: "treated_ugt",         label: "Treated Water UGT" },
  { id: "filter_stp",          label: "Polishing Filters" },
  { id: "pump_room",           label: "Pump Room / MCC" },
];
const ZLD_PROCESS_OPTIONS = [
  { id: "inlet_sump",          label: "Inlet Collection Sump" },
  { id: "bar_screen_zld",      label: "Bar Screen & Grit Chamber" },
  { id: "equalization_zld",    label: "Equalization Tank" },
  { id: "daf_tank",            label: "DAF Unit (Dissolved Air Flotation)" },
  { id: "daf_sludge_coll",     label: "DAF Sludge Collection Tank" },
  { id: "chemical_dosing",     label: "Chemical Dosing & Flash Mixer" },
  { id: "lamella_clariflocc",  label: "Lamella Clarifloculator" },
  { id: "lamella_feed",        label: "Lamella Feed Tank" },
  { id: "distribution_tank",   label: "Distribution Tank" },
  { id: "biological_tank",     label: "Biological Treatment Tank" },
  { id: "secondary_clarifier", label: "Secondary Clarifier / SST" },
  { id: "sludge_return_sump",  label: "Sludge Return Sump" },
  { id: "filtration_room",     label: "Filtration Room (PSF/ACF)" },
  { id: "softener",            label: "Softener / Ion Exchange" },
  { id: "ro_system",           label: "Reverse Osmosis (RO) System" },
  { id: "mee",                 label: "Multi-Effect Evaporator (MEE)" },
  { id: "atfd",                label: "ATFD / Agitated Thin Film Dryer" },
  { id: "collection_pit",      label: "Collection Pits / Drains" },
  { id: "chemical_bulk",       label: "Chemical Bulk Storage" },
  { id: "blower_room",         label: "Biological Blower Room" },
  { id: "electrical_room",     label: "Electrical Panel Room" },
  { id: "pump_station",        label: "Pump Station / MCC Room" },
];
const PROCESS_OPTIONS_MAP: Record<PlantType, typeof ETP_PROCESS_OPTIONS> = {
  ETP: ETP_PROCESS_OPTIONS, STP: STP_PROCESS_OPTIONS, ZLD: ZLD_PROCESS_OPTIONS,
};
const DEFAULT_STEPS_MAP: Record<PlantType, string[]> = {
  ETP: ["inlet_chamber", "bar_screen", "equalization", "aeration", "secondary_clarifier", "chlorination", "treated_storage", "pump_station"],
  STP: ["screening_chamber", "grit_trap", "equalization_stp", "aeration_stp", "secondary_clarifier", "chlorination_stp", "treated_ugt", "pump_room"],
  ZLD: ["inlet_sump", "bar_screen_zld", "equalization_zld", "daf_tank", "lamella_clariflocc", "biological_tank", "filtration_room", "ro_system", "mee", "collection_pit", "chemical_bulk", "blower_room", "electrical_room", "pump_station"],
};

// Civil drawing color fills (light wash, like AutoCAD layer colors)
const CIVIL_FILL: Record<string, string> = {
  blue:   "#D6EAF8",   // water / liquid tanks — sky blue
  teal:   "#D5F5E3",   // biological treatment — light green
  green:  "#EAFAF1",   // treated water storage — pale green
  amber:  "#FEF9E7",   // sludge — pale yellow
  orange: "#FDEBD0",   // chemical — pale orange
  red:    "#FDEDEC",   // emergency / hazardous — pale red
  purple: "#F4ECF7",   // advanced treatment (RO/MEE/ATFD) — pale purple
  gray:   "#F2F3F4",   // buildings / rooms — off-white
};
// Darker border color per type
const CIVIL_STROKE: Record<string, string> = {
  blue:   "#2E86C1",
  teal:   "#1E8449",
  green:  "#27AE60",
  amber:  "#B7950B",
  orange: "#CA6F1E",
  red:    "#922B21",
  purple: "#6C3483",
  gray:   "#626567",
};

interface ETPComponent {
  id: string; label: string; sublabel?: string;
  x: number; y: number; w: number; h: number;
  type: string; color: string;
  level?: number; platform?: number; isUnderground?: boolean;
  hasManholes?: boolean; manholeCount?: number;
  hasSlope?: boolean; slopeFrom?: number; slopeTo?: number;
}
interface FlowArrow { from: string; to: string; label?: string; }
interface ETPLayout { components: ETPComponent[]; flowArrows: FlowArrow[]; inlet?: any; outlet?: any; summary: string; capacity: string; designNotes: string[]; }
interface ETPRecord {
  id: string;
  params: {
    projectName: string; siteLength: number; siteWidth: number; tankHeight: number;
    inletFlow: string; processSteps: string[]; additionalNotes: string; plantType: string;
  };
  layout: ETPLayout;
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Civil Engineering Drawing SVG Component
// Matches WTT-style: white background, colored fills per layer, concrete walls
// ─────────────────────────────────────────────────────────────────────────────
function AutoCADDrawing({ layout, siteLength, siteWidth, projectName, tankHeight, inletFlow, plantType }: {
  layout: ETPLayout; siteLength: number; siteWidth: number;
  projectName: string; tankHeight: number; inletFlow?: string; plantType?: string;
}) {
  const SVG_W = 1400;
  const SVG_H = 900;
  const BORDER = 30;
  const TITLE_W = 225;
  const DIM_MARGIN = 52;
  const INNER_PAD = 8;

  const PLAN_X = BORDER + DIM_MARGIN;
  const PLAN_Y = BORDER + INNER_PAD;
  const PLAN_W = SVG_W - BORDER * 2 - DIM_MARGIN - INNER_PAD - TITLE_W;
  const PLAN_H = SVG_H - BORDER * 2 - INNER_PAD - DIM_MARGIN;

  const sl = Math.max(siteLength, 1);
  const sw = Math.max(siteWidth, 1);
  const scaleX = PLAN_W / sl;
  const scaleY = PLAN_H / sw;

  const px = (m: number) => PLAN_X + m * scaleX;
  const py = (m: number) => PLAN_Y + m * scaleY;
  const pw = (m: number) => m * scaleX;
  const ph = (m: number) => m * scaleY;

  // Wall thickness proportional to scale, min 6px
  const WT = Math.max(6, 0.3 * Math.min(scaleX, scaleY));

  const GRID_COLS = 8;
  const GRID_ROWS = 5;
  const COL_NUMS = Array.from({ length: GRID_COLS }, (_, i) => i + 1);
  const ROW_LETS = ["A", "B", "C", "D", "E"];
  const cellW = PLAN_W / GRID_COLS;
  const cellH = PLAN_H / GRID_ROWS;

  const sbMeters = sl <= 20 ? 5 : sl <= 50 ? 10 : 20;
  const sbPx = pw(sbMeters);
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const centroid = (c: ETPComponent) => ({ cx: px(c.x + c.w / 2), cy: py(c.y + c.h / 2) });

  const TB_X = SVG_W - BORDER - TITLE_W;
  const TB_Y = BORDER;
  const TB_H = SVG_H - BORDER * 2;

  const tbLine = (yOff: number) => (
    <line x1={TB_X} y1={TB_Y + yOff} x2={TB_X + TITLE_W} y2={TB_Y + yOff} stroke="#000" strokeWidth="0.7" />
  );
  const tbVLine = (xOff: number, yStart: number, yEnd: number) => (
    <line x1={TB_X + xOff} y1={TB_Y + yStart} x2={TB_X + xOff} y2={TB_Y + yEnd} stroke="#000" strokeWidth="0.7" />
  );

  const dwgTitle  = plantType === "ZLD" ? "ZLD LAYOUT PLAN"  : plantType === "STP" ? "STP LAYOUT PLAN"  : "ETP LAYOUT PLAN";
  const dwgSub    = plantType === "ZLD" ? "ZERO LIQUID DISCHARGE PLANT" : plantType === "STP" ? "SEWAGE TREATMENT PLANT" : "TREATED EFFLUENT PLANT";
  const dwgNo     = plantType === "ZLD" ? "CV-ZLD-C100-REV01" : plantType === "STP" ? "CV-STP-C100-REV01" : "CV-ETP-C100-REV01";

  const hasUnderground = layout.components?.some(c => c.isUnderground || (typeof c.level === "number" && c.level < 0));

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto"
      style={{ fontFamily: "Arial, sans-serif", background: "white" }}>
      <defs>
        {/* Concrete hatch 45° for RCC walls */}
        <pattern id="cwall" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#666" strokeWidth="1" />
        </pattern>
        {/* Cross hatch for buildings */}
        <pattern id="bwall" patternUnits="userSpaceOnUse" width="7" height="7">
          <line x1="0" y1="0" x2="7" y2="7" stroke="#888" strokeWidth="0.7" />
          <line x1="7" y1="0" x2="0" y2="7" stroke="#888" strokeWidth="0.7" />
        </pattern>
        {/* Dotted fill for collection pits */}
        <pattern id="pit_fill" patternUnits="userSpaceOnUse" width="5" height="5">
          <circle cx="2.5" cy="2.5" r="0.8" fill="#8B6914" opacity="0.6" />
        </pattern>
        {/* Flow arrow */}
        <marker id="fArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#1A5276" />
        </marker>
        {/* Dimension arrow */}
        <marker id="dArrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#333" />
        </marker>
        <marker id="dArrowR" markerWidth="5" markerHeight="5" refX="1" refY="2.5" orient="auto-start-reverse">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#333" />
        </marker>
      </defs>

      {/* ── BACKGROUND ── */}
      <rect width={SVG_W} height={SVG_H} fill="white" />

      {/* ── OUTER BORDERS ── */}
      <rect x={2} y={2} width={SVG_W - 4} height={SVG_H - 4} fill="none" stroke="#000" strokeWidth="3" />
      <rect x={BORDER} y={BORDER} width={SVG_W - BORDER * 2} height={SVG_H - BORDER * 2} fill="none" stroke="#000" strokeWidth="0.9" />

      {/* ── GRID REFERENCE STRIPS ── */}
      {COL_NUMS.map((n, i) => {
        const cx = PLAN_X + i * cellW + cellW / 2;
        return (
          <g key={`cn${n}`}>
            <line x1={cx} y1={BORDER} x2={cx} y2={PLAN_Y} stroke="#333" strokeWidth="0.4" />
            <line x1={cx} y1={PLAN_Y + PLAN_H} x2={cx} y2={SVG_H - BORDER} stroke="#333" strokeWidth="0.4" />
            <text x={cx} y={BORDER + 18} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#000">{n}</text>
            <text x={cx} y={SVG_H - BORDER - 4} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#000">{n}</text>
          </g>
        );
      })}
      {ROW_LETS.map((l, i) => {
        const cy = PLAN_Y + i * cellH + cellH / 2;
        return (
          <g key={`rl${l}`}>
            <line x1={BORDER} y1={cy} x2={PLAN_X - DIM_MARGIN} y2={cy} stroke="#333" strokeWidth="0.4" />
            <text x={BORDER + 15} y={cy + 4} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#000">{l}</text>
          </g>
        );
      })}

      {/* ── PLAN AREA ── */}
      <rect x={PLAN_X} y={PLAN_Y} width={PLAN_W} height={PLAN_H} fill="#FAFAFA" />

      {/* Light grid */}
      {COL_NUMS.slice(0, -1).map((_, i) => (
        <line key={`gc${i}`} x1={PLAN_X + (i + 1) * cellW} y1={PLAN_Y} x2={PLAN_X + (i + 1) * cellW} y2={PLAN_Y + PLAN_H} stroke="#DDD" strokeWidth="0.4" />
      ))}
      {ROW_LETS.slice(0, -1).map((_, i) => (
        <line key={`gr${i}`} x1={PLAN_X} y1={PLAN_Y + (i + 1) * cellH} x2={PLAN_X + PLAN_W} y2={PLAN_Y + (i + 1) * cellH} stroke="#DDD" strokeWidth="0.4" />
      ))}
      <rect x={PLAN_X} y={PLAN_Y} width={PLAN_W} height={PLAN_H} fill="none" stroke="#000" strokeWidth="1.2" />

      {/* ── FLOW PIPES ── */}
      {layout.flowArrows?.map((arrow, i) => {
        const fc = layout.components?.find(c => c.id === arrow.from);
        const tc = layout.components?.find(c => c.id === arrow.to);
        if (!fc || !tc) return null;
        const f = centroid(fc); const t = centroid(tc);
        const mx = (f.cx + t.cx) / 2; const my = (f.cy + t.cy) / 2;
        const dx = t.cx - f.cx; const dy = t.cy - f.cy;
        const len = Math.sqrt(dx * dx + dy * dy);
        // Shorten line to not overlap component centers
        const shrink = 18;
        const sx = f.cx + (dx / len) * shrink;
        const sy = f.cy + (dy / len) * shrink;
        const ex = t.cx - (dx / len) * shrink;
        const ey = t.cy - (dy / len) * shrink;
        return (
          <g key={i}>
            <line x1={sx} y1={sy} x2={ex} y2={ey}
              stroke="#1A5276" strokeWidth="1.4" strokeDasharray="none" markerEnd="url(#fArrow)" />
            {arrow.label && len > 60 && (
              <text x={mx} y={my - 6} fill="#1A5276" fontSize="6.5" textAnchor="middle" fontStyle="italic">{arrow.label}</text>
            )}
          </g>
        );
      })}

      {/* ── STRUCTURAL COMPONENTS ── */}
      {layout.components?.map((comp) => {
        const color    = comp.color || "blue";
        const fill     = CIVIL_FILL[color]  ?? "#F0F0F0";
        const stroke   = CIVIL_STROKE[color] ?? "#444";
        const isUnder  = comp.isUnderground || (typeof comp.level === "number" && comp.level < 0);
        const isBuilding = comp.type === "pump_station" || comp.type === "building" || color === "gray";
        const isPit    = comp.type === "pit" || (comp.w < 2 && comp.h < 2);

        const cx = px(comp.x); const cy = py(comp.y);
        const cw = pw(comp.w); const ch = ph(comp.h);
        const midX = cx + cw / 2; const midY = cy + ch / 2;
        const wt   = isPit ? Math.max(3, WT * 0.5) : WT;
        const hasRoom = cw > wt * 3.5 && ch > wt * 3.5;

        // Label lines
        const words = comp.label.split(" ");
        const half  = Math.ceil(words.length / 2);
        const ln1   = words.slice(0, half).join(" ").toUpperCase();
        const ln2   = words.slice(half).join(" ").toUpperCase();

        // Level annotation
        const lvl    = typeof comp.level === "number" ? comp.level : (isUnder ? -tankHeight : tankHeight);
        const lvlStr = lvl < 0 ? `Lvl: -${Math.abs(lvl).toFixed(2)}m` : `Lvl: +${Math.abs(lvl).toFixed(2)}m`;

        // Manholes on top of buried tanks
        const mhCount = comp.manholeCount ?? (comp.hasManholes ? Math.max(1, Math.round((comp.w * comp.h) / 50)) : 0);
        const manholes: { mx: number; my: number }[] = [];
        if (mhCount > 0 && hasRoom) {
          const cols = Math.min(mhCount, 3);
          const rows = Math.ceil(mhCount / cols);
          const mhSize = Math.min(cw * 0.12, ch * 0.12, 14);
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            if (manholes.length >= mhCount) break;
            manholes.push({
              mx: cx + wt + (c + 0.5) * (cw - wt * 2) / cols,
              my: cy + wt + (r + 0.5) * (ch - wt * 2) / rows,
            });
          }
        }

        return (
          <g key={comp.id}>
            {/* Underground dashed border indicator */}
            {isUnder && (
              <rect x={cx - 3} y={cy - 3} width={cw + 6} height={ch + 6}
                fill="none" stroke={stroke} strokeWidth="1.2" strokeDasharray="5 3" opacity="0.7" />
            )}

            {/* ── OUTER WALL (concrete hatch) ── */}
            <rect x={cx} y={cy} width={cw} height={ch}
              fill={isBuilding ? "url(#bwall)" : "url(#cwall)"}
              stroke={stroke} strokeWidth={isPit ? 1.2 : 2} />

            {/* ── INTERIOR FILL (colored by type) ── */}
            {hasRoom && (
              <rect x={cx + wt} y={cy + wt} width={cw - wt * 2} height={ch - wt * 2}
                fill={isPit ? "url(#pit_fill)" : fill}
                stroke={stroke} strokeWidth="1" opacity={isUnder ? 0.85 : 1} />
            )}

            {/* ── SLOPE INDICATOR ── */}
            {comp.hasSlope && hasRoom && (
              <line x1={cx + wt + 4} y1={cy + ch - wt - 4}
                x2={cx + cw - wt - 4} y2={cy + wt + 4}
                stroke={stroke} strokeWidth="0.9" strokeDasharray="4 2" />
            )}

            {/* ── LABELS ── */}
            {hasRoom && (() => {
              const fs = cw < 50 ? "6.5" : cw < 90 ? "7.5" : "9";
              const lineH = parseFloat(fs) + 3;
              const totalLines = [ln1, ln2, lvlStr, comp.platform ? `Plat:+${comp.platform.toFixed(2)}m` : "", comp.sublabel || ""].filter(Boolean).length;
              const startY = midY - (totalLines / 2 - 0.5) * lineH;
              let lIdx = 0;
              return (
                <>
                  <text x={midX} y={startY + lineH * lIdx++} fill="#000" fontSize={fs} fontWeight="bold" textAnchor="middle">{ln1}</text>
                  {ln2 && <text x={midX} y={startY + lineH * lIdx++} fill="#000" fontSize={fs} fontWeight="bold" textAnchor="middle">{ln2}</text>}
                  <text x={midX} y={startY + lineH * lIdx++} fill={isUnder ? "#1A5276" : "#555"} fontSize={Math.max(5.5, parseFloat(fs) - 1)} textAnchor="middle" fontStyle="italic" fontWeight={isUnder ? "bold" : "normal"}>
                    {lvlStr}
                  </text>
                  {typeof comp.platform === "number" && comp.platform > 0 && (
                    <text x={midX} y={startY + lineH * lIdx++} fill="#6C3483" fontSize="5.5" textAnchor="middle">Plat: +{comp.platform.toFixed(2)}m</text>
                  )}
                  {comp.hasSlope && comp.slopeFrom !== undefined && comp.slopeTo !== undefined && (
                    <text x={cx + wt + 3} y={cy + ch - wt - 4} fill="#888" fontSize="5" fontStyle="italic">
                      {`Slope:${comp.slopeFrom.toFixed(2)}→${comp.slopeTo.toFixed(2)}m`}
                    </text>
                  )}
                  {comp.sublabel && (
                    <text x={midX} y={startY + lineH * lIdx++} fill="#666" fontSize="5.5" textAnchor="middle" fontStyle="italic">{comp.sublabel}</text>
                  )}
                  {/* Dimension tag */}
                  <text x={cx + wt + 2} y={cy + ch - wt - 2} fill="#888" fontSize="5">
                    {comp.w.toFixed(1)}×{comp.h.toFixed(1)}m
                  </text>
                </>
              );
            })()}
            {/* Small pit label */}
            {!hasRoom && (
              <text x={midX} y={midY + 3} fill="#000" fontSize="5" textAnchor="middle" fontWeight="bold">{ln1.slice(0, 10)}</text>
            )}

            {/* ── MANHOLES ── */}
            {manholes.map((mh, mi) => (
              <g key={`mh_${mi}`}>
                <rect x={mh.mx - 7} y={mh.my - 7} width={14} height={14}
                  fill="white" stroke="#333" strokeWidth="1" />
                <circle cx={mh.mx} cy={mh.my} r="4" fill="none" stroke="#333" strokeWidth="0.8" />
                {mi === 0 && cw > 55 && (
                  <text x={mh.mx} y={mh.my - 10} fill="#333" fontSize="5" textAnchor="middle">Ø750×750</text>
                )}
              </g>
            ))}
          </g>
        );
      })}

      {/* ── LEGEND (bottom-left of plan area) ── */}
      <g transform={`translate(${PLAN_X + 8}, ${PLAN_Y + PLAN_H - 64})`}>
        <rect x={0} y={0} width={190} height={60} fill="white" stroke="#CCC" strokeWidth="0.7" rx="2" opacity="0.92" />
        <text x={5} y={12} fill="#333" fontSize="7" fontWeight="bold">LEGEND</text>
        {[
          { fill: CIVIL_FILL.blue,   stroke: CIVIL_STROKE.blue,   label: "Water / Liquid Tanks" },
          { fill: CIVIL_FILL.teal,   stroke: CIVIL_STROKE.teal,   label: "Biological Treatment" },
          { fill: CIVIL_FILL.amber,  stroke: CIVIL_STROKE.amber,  label: "Sludge Handling" },
          { fill: CIVIL_FILL.orange, stroke: CIVIL_STROKE.orange, label: "Chemical / Dosing" },
          { fill: CIVIL_FILL.purple, stroke: CIVIL_STROKE.purple, label: "Advanced Treatment (RO/MEE)" },
        ].map((leg, li) => (
          <g key={li} transform={`translate(5, ${18 + li * 9})`}>
            <rect x={0} y={0} width={10} height={7} fill={leg.fill} stroke={leg.stroke} strokeWidth="0.8" />
            <text x={14} y={6.5} fill="#444" fontSize="6">{leg.label}</text>
          </g>
        ))}
        {hasUnderground && (
          <g transform={`translate(5, 63)`}>
            <rect x={0} y={0} width={10} height={7} fill="none" stroke="#2E86C1" strokeWidth="1" strokeDasharray="3 2" />
            <text x={14} y={6.5} fill="#1A5276" fontSize="6" fontWeight="bold">Underground / Below GL</text>
          </g>
        )}
      </g>

      {/* ── NORTH ARROW ── */}
      <g transform={`translate(${PLAN_X + PLAN_W - 40}, ${PLAN_Y + 44})`}>
        <circle cx="0" cy="0" r="24" fill="white" stroke="#000" strokeWidth="1.2" />
        <path d="M0,-22 L7,0 L0,-7 L-7,0 Z" fill="#000" />
        <path d="M0,22 L7,0 L0,7 L-7,0 Z" fill="white" stroke="#000" strokeWidth="1.2" />
        <text x="0" y="-26" fill="#000" fontSize="11" fontWeight="bold" textAnchor="middle">N</text>
      </g>

      {/* ── SCALE BAR ── */}
      <g transform={`translate(${PLAN_X + PLAN_W - 120}, ${PLAN_Y + PLAN_H - 24})`}>
        <rect x={0} y={0} width={sbPx / 2} height={9} fill="#333" />
        <rect x={sbPx / 2} y={0} width={sbPx / 2} height={9} fill="white" stroke="#333" strokeWidth="0.8" />
        <rect x={0} y={0} width={sbPx} height={9} fill="none" stroke="#333" strokeWidth="0.8" />
        <text x={0} y={20} fill="#333" fontSize="7" textAnchor="start">0</text>
        <text x={sbPx} y={20} fill="#333" fontSize="7" textAnchor="end">{sbMeters}m</text>
        <text x={sbPx / 2} y={-3} fill="#333" fontSize="7" textAnchor="middle">SCALE : NTS</text>
      </g>

      {/* ── DIMENSION LINES ── */}
      {/* Bottom — site length */}
      <line x1={PLAN_X} y1={PLAN_Y + PLAN_H + 16} x2={PLAN_X + PLAN_W} y2={PLAN_Y + PLAN_H + 16}
        stroke="#333" strokeWidth="0.9" markerStart="url(#dArrowR)" markerEnd="url(#dArrow)" />
      <line x1={PLAN_X} y1={PLAN_Y + PLAN_H} x2={PLAN_X} y2={PLAN_Y + PLAN_H + 25} stroke="#333" strokeWidth="0.8" />
      <line x1={PLAN_X + PLAN_W} y1={PLAN_Y + PLAN_H} x2={PLAN_X + PLAN_W} y2={PLAN_Y + PLAN_H + 25} stroke="#333" strokeWidth="0.8" />
      <text x={PLAN_X + PLAN_W / 2} y={PLAN_Y + PLAN_H + 36} fill="#000" fontSize="11" textAnchor="middle" fontWeight="bold">
        {siteLength.toFixed(3)} m
      </text>
      {/* Left — site width */}
      <line x1={PLAN_X - 16} y1={PLAN_Y} x2={PLAN_X - 16} y2={PLAN_Y + PLAN_H}
        stroke="#333" strokeWidth="0.9" markerStart="url(#dArrowR)" markerEnd="url(#dArrow)" />
      <line x1={PLAN_X - 25} y1={PLAN_Y} x2={PLAN_X} y2={PLAN_Y} stroke="#333" strokeWidth="0.8" />
      <line x1={PLAN_X - 25} y1={PLAN_Y + PLAN_H} x2={PLAN_X} y2={PLAN_Y + PLAN_H} stroke="#333" strokeWidth="0.8" />
      <text x={PLAN_X - 38} y={PLAN_Y + PLAN_H / 2} fill="#000" fontSize="11" textAnchor="middle" fontWeight="bold"
        transform={`rotate(-90,${PLAN_X - 38},${PLAN_Y + PLAN_H / 2})`}>
        {siteWidth.toFixed(3)} m
      </text>

      {/* ═══════════════════════════════
          WTT TITLE BLOCK (right panel)
      ═══════════════════════════════ */}
      <rect x={TB_X} y={TB_Y} width={TITLE_W} height={TB_H} fill="white" stroke="#000" strokeWidth="1.5" />

      {/* Company header band */}
      <rect x={TB_X} y={TB_Y} width={TITLE_W} height={62} fill="#1A3A5C" />
      <text x={TB_X + TITLE_W / 2} y={TB_Y + 20} fill="white" fontSize="18" fontWeight="bold" textAnchor="middle" letterSpacing="3">WTT</text>
      <text x={TB_X + TITLE_W / 2} y={TB_Y + 36} fill="#AED6F1" fontSize="8.5" fontWeight="bold" textAnchor="middle">INTERNATIONAL INDIA PVT. LTD.</text>
      <text x={TB_X + TITLE_W / 2} y={TB_Y + 50} fill="#85C1E9" fontSize="7" textAnchor="middle" fontStyle="italic">Water Loving Technology</text>
      {tbLine(62)}

      {/* Project info */}
      {tbLine(124)}
      <text x={TB_X + 7} y={TB_Y + 76} fill="#888" fontSize="6.5" fontWeight="bold">PROJECT :</text>
      <text x={TB_X + 7} y={TB_Y + 90} fill="#000" fontSize="9" fontWeight="bold">{(projectName || `${plantType} PROJECT`).toUpperCase()}</text>
      <text x={TB_X + 7} y={TB_Y + 104} fill="#333" fontSize="7">{inletFlow ? `Flow : ${inletFlow}` : "Flow : —"}</text>
      <text x={TB_X + 7} y={TB_Y + 116} fill="#666" fontSize="6.5">Site : {siteLength}m × {siteWidth}m · H = {tankHeight}m</text>

      {/* Drawing title */}
      {tbLine(184)}
      <text x={TB_X + 7} y={TB_Y + 138} fill="#888" fontSize="6.5" fontWeight="bold">DRAWING TITLE :</text>
      <text x={TB_X + 7} y={TB_Y + 153} fill="#000" fontSize="10" fontWeight="bold">{dwgTitle}</text>
      <text x={TB_X + 7} y={TB_Y + 167} fill="#000" fontSize="8.5">PLAN VIEW (CIVIL)</text>
      <text x={TB_X + 7} y={TB_Y + 178} fill="#555" fontSize="7">{dwgSub}</text>

      {/* DWG info grid */}
      {tbLine(234)} {tbLine(264)} {tbLine(296)} {tbLine(348)}
      <text x={TB_X + 7} y={TB_Y + 203} fill="#888" fontSize="6">SCALE :</text>
      <text x={TB_X + 7} y={TB_Y + 218} fill="#000" fontSize="10" fontWeight="bold">NTS</text>
      <text x={TB_X + 7} y={TB_Y + 250} fill="#888" fontSize="6">DWG. NO. :</text>
      <text x={TB_X + 7} y={TB_Y + 263} fill="#000" fontSize="8" fontWeight="bold">{dwgNo}</text>
      <text x={TB_X + 7} y={TB_Y + 280} fill="#888" fontSize="6">REVISION :</text>
      <text x={TB_X + 7} y={TB_Y + 294} fill="#000" fontSize="10" fontWeight="bold">REV - A</text>
      <text x={TB_X + 7} y={TB_Y + 315} fill="#888" fontSize="6">DATE :</text>
      <text x={TB_X + 7} y={TB_Y + 329} fill="#000" fontSize="8" fontWeight="bold">{dateStr}</text>
      <text x={TB_X + 7} y={TB_Y + 342} fill="#888" fontSize="6.5">GENERATED BY FlowMatriX AI</text>

      {/* Sign-off */}
      {tbLine(398)} {tbLine(450)}
      {tbVLine(TITLE_W / 2, 348, 450)}
      <text x={TB_X + 7}              y={TB_Y + 364} fill="#888" fontSize="6">DRAWN BY :</text>
      <text x={TB_X + TITLE_W / 2 + 7} y={TB_Y + 364} fill="#888" fontSize="6">CHK. BY :</text>
      <text x={TB_X + 7}              y={TB_Y + 384} fill="#000" fontSize="8">FlowMatriX AI</text>
      <text x={TB_X + TITLE_W / 2 + 7} y={TB_Y + 384} fill="#000" fontSize="8">—</text>
      <text x={TB_X + 7}              y={TB_Y + 400} fill="#888" fontSize="6">DATE : {dateStr.split(" ")[2]}</text>
      <text x={TB_X + TITLE_W / 2 + 7} y={TB_Y + 400} fill="#888" fontSize="6">DATE :</text>
      <text x={TB_X + 7}              y={TB_Y + 428} fill="#888" fontSize="6">APPROVED BY :</text>
      <text x={TB_X + 7}              y={TB_Y + 444} fill="#000" fontSize="8">—</text>

      {/* Revision history */}
      {tbLine(478)} {tbLine(500)}
      {tbVLine(24, 450, TB_H)} {tbVLine(86, 450, TB_H)} {tbVLine(138, 450, TB_H)}
      <text x={TB_X + 7}   y={TB_Y + 466} fill="#888" fontSize="6">REV</text>
      <text x={TB_X + 28}  y={TB_Y + 466} fill="#888" fontSize="6">DESCRIPTION</text>
      <text x={TB_X + 90}  y={TB_Y + 466} fill="#888" fontSize="6">DATE</text>
      <text x={TB_X + 142} y={TB_Y + 466} fill="#888" fontSize="6">BY</text>
      <text x={TB_X + 9}   y={TB_Y + 490} fill="#000" fontSize="7">A</text>
      <text x={TB_X + 28}  y={TB_Y + 490} fill="#000" fontSize="6.5">Initial Issue</text>
      <text x={TB_X + 90}  y={TB_Y + 490} fill="#000" fontSize="6.5">{dateStr}</text>
      <text x={TB_X + 142} y={TB_Y + 490} fill="#000" fontSize="6.5">AI</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Quick actions for analyze mode
// ─────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "Measure tank areas",   icon: AreaChart,    prompt: "Identify and measure the area of all tanks, chambers and reservoirs visible in this drawing." },
  { label: "Count all elements",   icon: Hash,         prompt: "Count all distinct structural and mechanical elements — tanks, pipes, pumps, valves, manholes, etc." },
  { label: "Extract pipe lengths", icon: Ruler,        prompt: "Identify all pipe runs and measure their lengths. List each pipe by size/type if indicated." },
  { label: "Bill of Materials",    icon: ClipboardList, prompt: "Generate a complete bill of materials (BOM) — list all items, quantities, sizes and materials visible." },
  { label: "Check completeness",   icon: Search,       prompt: "Check if title block, scale, dimensions, north arrow, revision and material notes are present." },
  { label: "Earthwork volumes",    icon: Maximize2,    prompt: "Identify all excavation, backfill and earthwork areas. Estimate volumes if levels or depth info is provided." },
];

const ANA_KEY = "civil_analysis_history";
const GEN_KEY = "civil_drawing_history";
const loadAna = (): AnalysisRecord[] => { try { return JSON.parse(localStorage.getItem(ANA_KEY) || "[]"); } catch { return []; } };
const saveAna = (h: AnalysisRecord[]) => { try { localStorage.setItem(ANA_KEY, JSON.stringify(h.slice(0, 10))); } catch {} };
const loadGen = (): ETPRecord[] => { try { return JSON.parse(localStorage.getItem(GEN_KEY) || "[]"); } catch { return []; } };
const saveGen = (h: ETPRecord[]) => { try { localStorage.setItem(GEN_KEY, JSON.stringify(h.slice(0, 10))); } catch {} };

const TYPE_ICON: Record<string, any> = { area: AreaChart, length: Ruler, count: Hash, volume: Maximize2, dimension: Ruler };
const TYPE_COLOR: Record<string, string> = {
  area:      "text-blue-600 bg-blue-50 border-blue-200",
  length:    "text-emerald-600 bg-emerald-50 border-emerald-200",
  count:     "text-purple-600 bg-purple-50 border-purple-200",
  volume:    "text-amber-600 bg-amber-50 border-amber-200",
  dimension: "text-rose-600 bg-rose-50 border-rose-200",
};
const PLANT_TYPE_CONFIG: Record<PlantType, { label: string; icon: any; desc: string; accent: string }> = {
  ETP: { label: "ETP", icon: Droplets, desc: "Effluent Treatment Plant", accent: "blue" },
  STP: { label: "STP", icon: Droplets, desc: "Sewage Treatment Plant",   accent: "teal" },
  ZLD: { label: "ZLD", icon: Factory,  desc: "Zero Liquid Discharge",    accent: "purple" },
};

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function CivilDrawingAI() {
  const [mode, setMode] = useState<Mode>("analyze");

  // Analyze state
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName]       = useState("");
  const [imageMime, setImageMime]       = useState("image/jpeg");
  const [instruction, setInstruction]   = useState("");
  const [projectName, setProjectName]   = useState("");
  const [analyzing, setAnalyzing]       = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [anaHistory, setAnaHistory]     = useState<AnalysisRecord[]>(loadAna);
  const [showAnaHistory, setShowAnaHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef      = useRef<HTMLDivElement>(null);

  // Generate state
  const [plantType, setPlantType]       = useState<PlantType>("ZLD");
  const [genProjectName, setGenProjectName] = useState("");
  const [siteLength, setSiteLength]     = useState("");
  const [siteWidth, setSiteWidth]       = useState("");
  const [tankHeight, setTankHeight]     = useState("3.5");
  const [inletFlow, setInletFlow]       = useState("");
  const [addNotes, setAddNotes]         = useState("");
  const [selectedSteps, setSelectedSteps] = useState<string[]>(DEFAULT_STEPS_MAP.ZLD);
  const [generating, setGenerating]     = useState(false);
  const [genError, setGenError]         = useState<string | null>(null);
  const [genResult, setGenResult]       = useState<ETPRecord | null>(null);
  const [genHistory, setGenHistory]     = useState<ETPRecord[]>(loadGen);
  const [showGenHistory, setShowGenHistory] = useState(false);
  const [zoom, setZoom]                 = useState(1);
  const svgRef = useRef<HTMLDivElement>(null);

  // Correction state
  const [correctionPrompt, setCorrectionPrompt] = useState("");
  const [correcting, setCorrecting]     = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { setAnalyzeError("Please upload a JPG, PNG or WebP image."); return; }
    setAnalyzeError(null); setImageName(file.name); setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = e => setImageDataUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!imageDataUrl) { setAnalyzeError("Please upload a drawing first."); return; }
    if (!instruction.trim()) { setAnalyzeError("Please enter an instruction."); return; }
    setAnalyzeError(null); setAnalyzing(true);
    try {
      const base64 = imageDataUrl.split(",")[1];
      const res = await fetch(`${BASE}/api/civil-drawing/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: imageMime, instruction, projectName }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Analysis failed"); }
      const data = await res.json();
      setAnalysisResult(data.analysis);
      const record: AnalysisRecord = { id: Date.now().toString(), projectName, instruction, imageDataUrl, result: data.analysis, createdAt: new Date().toISOString() };
      const newH = [record, ...anaHistory]; setAnaHistory(newH); saveAna(newH);
    } catch (e: any) { setAnalyzeError(e.message ?? "Analysis failed"); }
    finally { setAnalyzing(false); }
  };

  const toggleStep = (id: string) => setSelectedSteps(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  const reorderStep = (id: string, dir: "up" | "down") => {
    const idx = selectedSteps.indexOf(id); if (idx < 0) return;
    const n = [...selectedSteps]; const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= n.length) return;
    [n[idx], n[swap]] = [n[swap], n[idx]]; setSelectedSteps(n);
  };

  const handleChangePlantType = (pt: PlantType) => {
    setPlantType(pt); setSelectedSteps(DEFAULT_STEPS_MAP[pt]); setGenResult(null); setCorrectionPrompt("");
  };

  const handleGenerate = async () => {
    if (!siteLength || !siteWidth) { setGenError("Enter site dimensions."); return; }
    if (selectedSteps.length < 2) { setGenError("Select at least 2 process steps."); return; }
    setGenError(null); setGenerating(true); setCorrectionPrompt(""); setCorrectionError(null);
    const opts = PROCESS_OPTIONS_MAP[plantType];
    const labels = selectedSteps.map(id => opts.find(o => o.id === id)?.label ?? id);
    try {
      const res = await fetch(`${BASE}/api/civil-drawing/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: genProjectName || `${plantType} Project`,
          siteLength: parseFloat(siteLength), siteWidth: parseFloat(siteWidth),
          tankHeight: parseFloat(tankHeight) || 3.5,
          processSteps: labels, inletFlow, additionalNotes: addNotes, plantType,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Generation failed"); }
      const data = await res.json();
      const rec: ETPRecord = { id: Date.now().toString(), params: data.params, layout: data.layout, generatedAt: new Date().toISOString() };
      setGenResult(rec);
      const newH = [rec, ...genHistory]; setGenHistory(newH); saveGen(newH);
    } catch (e: any) { setGenError(e.message ?? "Generation failed"); }
    finally { setGenerating(false); }
  };

  // ── Immediate Correction ──
  const handleCorrect = async () => {
    if (!genResult || !correctionPrompt.trim()) return;
    setCorrectionError(null); setCorrecting(true);
    try {
      const res = await fetch(`${BASE}/api/civil-drawing/correct`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existingLayout: genResult.layout,
          correctionPrompt: correctionPrompt.trim(),
          params: genResult.params,
        }),
      });
      if (!res.ok) {
        let errMsg = `Server error ${res.status}`;
        try { const err = await res.json(); errMsg = err.error || errMsg; } catch {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      if (!data.layout?.components) throw new Error("AI returned an incomplete layout — try rephrasing your correction.");
      const rec: ETPRecord = { ...genResult, id: Date.now().toString(), layout: data.layout, generatedAt: new Date().toISOString() };
      setGenResult(rec);
      setCorrectionPrompt("");
      const newH = [rec, ...genHistory]; setGenHistory(newH); saveGen(newH);
    } catch (e: any) { setCorrectionError(e.message ?? "Correction failed — please try again."); }
    finally { setCorrecting(false); }
  };

  const downloadSVG = () => {
    if (!svgRef.current || !genResult) return;
    const svgEl = svgRef.current.querySelector("svg"); if (!svgEl) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: "image/svg+xml" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${genResult.params.projectName || plantType}_civil.svg`; a.click();
  };

  const processOpts = PROCESS_OPTIONS_MAP[plantType];
  const ptCfg = PLANT_TYPE_CONFIG[plantType];

  const accentBtn = plantType === "ZLD" ? "bg-purple-600 hover:bg-purple-700" : plantType === "STP" ? "bg-teal-600 hover:bg-teal-700" : "bg-blue-600 hover:bg-blue-700";

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col">

        {/* TOP HEADER */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center shadow">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Civil Drawing AI</h1>
              <p className="text-[10px] text-gray-400">AI-powered takeoffs, measurements & ETP/STP/ZLD layout generation</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(["analyze", "generate"] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === m ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {m === "analyze" ? <><Search className="w-3.5 h-3.5" /> Analyze Drawing</> : <><Building2 className="w-3.5 h-3.5" /> Generate Layout</>}
              </button>
            ))}
          </div>
          <div className="w-40" />
        </div>

        {/* ════════════════ ANALYZE MODE ════════════════ */}
        {mode === "analyze" ? (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 bg-gray-100 flex flex-col overflow-hidden">
              <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3">
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
                  <Upload className="w-3.5 h-3.5" /> Upload Drawing
                </button>
                {imageDataUrl && (
                  <div className="flex items-center gap-2">
                    <FileImage className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-600 truncate max-w-[200px]">{imageName}</span>
                    <button onClick={() => { setImageDataUrl(null); setImageName(""); setAnalysisResult(null); }} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                {anaHistory.length > 0 && (
                  <button onClick={() => setShowAnaHistory(true)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50">
                    <History className="w-3.5 h-3.5" /> History ({anaHistory.length})
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
              <div ref={dropRef} className="flex-1 overflow-auto flex items-center justify-center p-6"
                onDrop={onDrop} onDragOver={e => e.preventDefault()}>
                {imageDataUrl ? (
                  <div className="relative max-w-full max-h-full">
                    <img src={imageDataUrl} alt="Drawing" className="max-w-full max-h-[calc(100vh-220px)] object-contain rounded-xl shadow-xl border border-gray-200" />
                    {analysisResult && (
                      <div className="absolute top-3 right-3 bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2">
                        <p className="text-[10px] font-bold text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Analysis Complete</p>
                        <p className="text-[9px] text-gray-500">{analysisResult.measurements?.length ?? 0} items found</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-2xl p-12 max-w-md transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center mx-auto mb-4">
                      <FileImage className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-700 mb-1">Upload your engineering drawing</h3>
                    <p className="text-xs text-gray-400 mb-3">Drag & drop or click · JPG, PNG, WebP</p>
                    <p className="text-[10px] text-gray-400">Works with ETP, STP, ZLD plan views, sections, P&IDs</p>
                  </div>
                )}
              </div>
            </div>

            <div className="w-[380px] flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Project (optional)</label>
                  <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. WTT — ZLD Plant Phase 2"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Instruction *</label>
                  <textarea value={instruction} onChange={e => setInstruction(e.target.value)} rows={3}
                    placeholder="e.g. Measure all tank areas and return quantities…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map(qa => {
                      const Icon = qa.icon;
                      return (
                        <button key={qa.label} onClick={() => setInstruction(qa.prompt)}
                          className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-colors text-left group">
                          <Icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="text-[11px] font-medium text-gray-600 group-hover:text-blue-700 leading-tight">{qa.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {analyzeError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600">{analyzeError}</p>
                  </div>
                )}
                <button onClick={handleAnalyze} disabled={analyzing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors shadow-sm">
                  {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Sparkles className="w-4 h-4" /> Analyze Drawing</>}
                </button>
                {analyzing && <p className="text-[10px] text-gray-400 text-center">AI is reading your drawing — typically 10–20 seconds</p>}

                {analysisResult && (
                  <div className="space-y-4 pt-1 border-t border-gray-100">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Summary</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{analysisResult.summary}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Type: {analysisResult.drawingType}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Scale: {analysisResult.scale}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Measurements ({analysisResult.measurements?.length ?? 0})</p>
                      <div className="space-y-1.5">
                        {analysisResult.measurements?.map((m, i) => {
                          const cls = TYPE_COLOR[m.type] ?? "text-gray-600 bg-gray-50 border-gray-200";
                          const Icon = TYPE_ICON[m.type] ?? Ruler;
                          return (
                            <div key={i} className={`flex items-center gap-3 border rounded-xl px-3 py-2 ${cls}`}>
                              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{m.item}</p>
                                {m.notes && <p className="text-[9px] opacity-70 truncate">{m.notes}</p>}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-bold">{typeof m.value === "number" ? m.value.toFixed(m.type === "count" ? 0 : 2) : m.value}</p>
                                <p className="text-[9px] opacity-70">{m.unit}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {analysisResult.keyFindings?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Key Findings</p>
                        <ul className="space-y-1">
                          {analysisResult.keyFindings.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                              <ChevronRight className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysisResult.disclaimer && (
                      <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{analysisResult.disclaimer}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        ) : (
          /* ════════════════ GENERATE MODE ════════════════ */
          <div className="flex flex-1 overflow-hidden">
            {/* Left Form */}
            <div className="w-[340px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
              <div className="p-5 space-y-5">

                {/* Plant Type */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Plant Type *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["ETP", "STP", "ZLD"] as PlantType[]).map(pt => {
                      const cfg = PLANT_TYPE_CONFIG[pt];
                      const Icon = cfg.icon;
                      const isActive = plantType === pt;
                      const colors = pt === "ZLD" ? "border-purple-500 bg-purple-50 text-purple-700" : pt === "STP" ? "border-teal-500 bg-teal-50 text-teal-700" : "border-blue-500 bg-blue-50 text-blue-700";
                      return (
                        <button key={pt} onClick={() => handleChangePlantType(pt)}
                          className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 transition-all ${isActive ? colors : "border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                          <Icon className="w-4 h-4" />
                          <span className="text-xs font-bold">{cfg.label}</span>
                          <span className="text-[9px] leading-tight text-center">{cfg.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                  {plantType === "ZLD" && (
                    <p className="mt-2 text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 font-semibold">
                      ZLD Mode — underground tanks, manholes, slopes, platforms, DAF, MEE & ATFD
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Project Name</label>
                  <input value={genProjectName} onChange={e => setGenProjectName(e.target.value)} placeholder={`e.g. WTT — ${plantType} Phase 1`}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Design Flow Rate</label>
                  <input value={inletFlow} onChange={e => setInletFlow(e.target.value)} placeholder="e.g. 200 KLD / 8.3 m³/hr"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Site Dimensions *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ label: "Length (m)", v: siteLength, s: setSiteLength, ph: "40" }, { label: "Width (m)", v: siteWidth, s: setSiteWidth, ph: "25" }, { label: "Wall Ht (m)", v: tankHeight, s: setTankHeight, ph: "3.5" }].map(f => (
                      <div key={f.label}>
                        <p className="text-[9px] text-gray-400 mb-0.5">{f.label}</p>
                        <input type="number" value={f.v} onChange={e => f.s(e.target.value)} placeholder={f.ph}
                          className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    ))}
                  </div>
                  {siteLength && siteWidth && <p className="text-[10px] text-blue-600 mt-1">Area: {(parseFloat(siteLength) * parseFloat(siteWidth)).toFixed(0)} m²</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{plantType} Process Stages *</label>
                  <p className="text-[9px] text-gray-400 mb-2">Select and reorder by process sequence</p>
                  {selectedSteps.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {selectedSteps.map((id, i) => {
                        const opt = processOpts.find(o => o.id === id); if (!opt) return null;
                        return (
                          <div key={id} className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5">
                            <span className="text-[9px] font-bold text-blue-600 w-4 text-center">{i + 1}</span>
                            <span className="text-[11px] text-gray-700 flex-1 truncate">{opt.label}</span>
                            <div className="flex flex-col">
                              <button onClick={() => reorderStep(id, "up")} disabled={i === 0} className="text-gray-300 disabled:opacity-20 hover:text-gray-500"><ChevronUp className="w-3 h-3" /></button>
                              <button onClick={() => reorderStep(id, "down")} disabled={i === selectedSteps.length - 1} className="text-gray-300 disabled:opacity-20 hover:text-gray-500"><ChevronDown className="w-3 h-3" /></button>
                            </div>
                            <button onClick={() => toggleStep(id)} className="text-gray-300 hover:text-red-500"><X className="w-3 h-3" /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="space-y-0.5 max-h-36 overflow-y-auto border border-gray-100 rounded-xl p-1.5 bg-gray-50">
                    {processOpts.filter(o => !selectedSteps.includes(o.id)).map(opt => (
                      <button key={opt.id} onClick={() => toggleStep(opt.id)}
                        className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white text-[11px] text-gray-400 hover:text-gray-700 transition-colors">
                        <Plus className="w-3 h-3 text-blue-400" /> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Additional Requirements</label>
                  <textarea value={addNotes} onChange={e => setAddNotes(e.target.value)} rows={2}
                    placeholder={plantType === "ZLD" ? "ZLD target, underground sump depth, MEE capacity…" : "Inlet from north, underground storage…"}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                {genError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600">{genError}</p>
                  </div>
                )}

                <button onClick={handleGenerate} disabled={generating}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors shadow-sm ${accentBtn}`}>
                  {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate {plantType} Drawing</>}
                </button>
                {generating && <p className="text-[10px] text-gray-400 text-center">AI is designing your {plantType} layout — ~15 seconds</p>}

                {genHistory.length > 0 && (
                  <button onClick={() => setShowGenHistory(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50">
                    <History className="w-3.5 h-3.5" /> View History ({genHistory.length})
                  </button>
                )}
              </div>
            </div>

            {/* Right — Drawing Output */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4 space-y-4">
              {genResult ? (
                <>
                  {/* Toolbar */}
                  <div className="bg-white rounded-2xl border border-gray-200 px-5 py-3 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{genResult.params.projectName}</p>
                      <p className="text-xs text-gray-400">{genResult.layout.components?.length ?? 0} components · {genResult.params.siteLength}m × {genResult.params.siteWidth}m · {genResult.params.plantType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><ZoomOut className="w-3.5 h-3.5" /></button>
                      <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><ZoomIn className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setZoom(1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><RotateCcw className="w-3.5 h-3.5" /></button>
                      <button onClick={downloadSVG} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"><Download className="w-3.5 h-3.5" /> SVG</button>
                      <button onClick={() => { setGenResult(null); setCorrectionPrompt(""); }} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs rounded-lg"><RefreshCw className="w-3.5 h-3.5" /> New</button>
                    </div>
                  </div>

                  {/* Drawing SVG */}
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-auto shadow-sm" ref={svgRef}>
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", display: "inline-block", minWidth: "100%" }}>
                      <AutoCADDrawing
                        layout={genResult.layout}
                        siteLength={genResult.params.siteLength}
                        siteWidth={genResult.params.siteWidth}
                        projectName={genResult.params.projectName}
                        tankHeight={genResult.params.tankHeight}
                        inletFlow={genResult.params.inletFlow}
                        plantType={genResult.params.plantType}
                      />
                    </div>
                  </div>

                  {/* ── IMMEDIATE CORRECTION PROMPT ── */}
                  <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-bold text-amber-800">Quick Correction</h3>
                      <span className="text-[10px] text-amber-600 ml-1">— describe any change and AI will update the drawing instantly</span>
                    </div>
                    <div className="p-4">
                      <div className="flex gap-3">
                        <textarea
                          value={correctionPrompt}
                          onChange={e => setCorrectionPrompt(e.target.value)}
                          placeholder={`e.g. "Move the blower room to the top-right corner" · "Increase RO system width to 8m" · "Add a pump sump near the MEE unit" · "Make the equalization tank larger"`}
                          rows={2}
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleCorrect(); }}
                        />
                        <button
                          onClick={handleCorrect}
                          disabled={correcting || !correctionPrompt.trim()}
                          className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-colors shadow-sm">
                          {correcting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                          <span className="text-[10px]">{correcting ? "Applying…" : "Apply"}</span>
                        </button>
                      </div>
                      {correctionError && (
                        <div className="mt-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          <p className="text-xs text-red-600">{correctionError}</p>
                        </div>
                      )}
                      {correcting && <p className="mt-2 text-[10px] text-amber-600 text-center">AI is applying your correction — ~10 seconds</p>}
                      <p className="mt-2 text-[10px] text-gray-400">Tip: Press Ctrl+Enter to apply · Be specific for best results</p>
                    </div>
                  </div>

                  {/* Summary & Design notes */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-blue-500" /> AI Summary</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">{genResult.layout.summary}</p>
                      {genResult.layout.capacity && <p className="mt-2 text-xs text-blue-700 font-semibold bg-blue-50 rounded-lg px-2 py-1 border border-blue-100">{genResult.layout.capacity}</p>}
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Design Notes</h3>
                      <ul className="space-y-1.5">
                        {genResult.layout.designNotes?.map((note, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>{note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Component schedule */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100"><h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Component Schedule</h3></div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>{["Component", "L (m)", "W (m)", "Level (m)", "Area (m²)", "Type", "Underground", "Notes"].map(h => <th key={h} className="px-3 py-2 text-left text-gray-400 font-semibold whitespace-nowrap">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {genResult.layout.components?.map((comp, i) => (
                            <tr key={comp.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-3 py-2 font-semibold text-gray-800 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: CIVIL_FILL[comp.color] ?? "#eee", border: `1.5px solid ${CIVIL_STROKE[comp.color] ?? "#999"}` }} />
                                {comp.label}
                              </td>
                              <td className="px-3 py-2 text-gray-600">{comp.w.toFixed(1)}</td>
                              <td className="px-3 py-2 text-gray-600">{comp.h.toFixed(1)}</td>
                              <td className={`px-3 py-2 font-medium ${typeof comp.level === "number" && comp.level < 0 ? "text-purple-600" : "text-gray-600"}`}>
                                {typeof comp.level === "number" ? (comp.level >= 0 ? `+${comp.level.toFixed(2)}` : comp.level.toFixed(2)) : "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-600">{(comp.w * comp.h).toFixed(1)}</td>
                              <td className="px-3 py-2 text-gray-500 capitalize">{comp.type}</td>
                              <td className="px-3 py-2">{comp.isUnderground ? <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Yes</span> : <span className="text-gray-300">—</span>}</td>
                              <td className="px-3 py-2 text-gray-400 italic">{comp.sublabel || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-20 h-20 rounded-3xl bg-white border-2 border-gray-200 flex items-center justify-center mb-5 shadow-sm">
                    <Building2 className="w-10 h-10 text-blue-400" />
                  </div>
                  <h2 className="text-base font-bold text-gray-700 mb-2">{ptCfg.desc} Layout Generator</h2>
                  <p className="text-xs text-gray-400 max-w-sm">
                    {plantType === "ZLD"
                      ? "Enter site dimensions, flow rate and ZLD process stages. AI generates an AutoCAD-style civil layout with colored components, underground tanks, manholes, slopes, platforms and a correction prompt."
                      : `Enter site dimensions, design flow and ${plantType} process stages. AI will generate a color-coded civil layout drawing with a component schedule.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ANALYSIS HISTORY MODAL ── */}
        {showAnaHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAnaHistory(false)}>
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><History className="w-4 h-4 text-blue-500" /> Analysis History</h2>
                <button onClick={() => setShowAnaHistory(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2" style={{ maxHeight: "calc(80vh - 60px)" }}>
                {anaHistory.map(h => (
                  <button key={h.id} type="button"
                    className="w-full text-left border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl p-3 transition-colors"
                    onClick={() => { setImageDataUrl(h.imageDataUrl); setImageName("(from history)"); setInstruction(h.instruction); setProjectName(h.projectName); setAnalysisResult(h.result); setShowAnaHistory(false); setMode("analyze"); }}>
                    <p className="text-sm font-bold text-gray-800">{h.projectName || "Untitled"}</p>
                    <p className="text-[10px] text-gray-500 truncate">{h.instruction}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{new Date(h.createdAt).toLocaleString()} · {h.result.measurements?.length ?? 0} measurements</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GENERATE HISTORY MODAL ── */}
        {showGenHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowGenHistory(false)}>
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><History className="w-4 h-4 text-blue-500" /> Generated Drawings</h2>
                <button onClick={() => setShowGenHistory(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2" style={{ maxHeight: "calc(80vh - 60px)" }}>
                {genHistory.map(h => (
                  <button key={h.id} type="button"
                    className="w-full text-left border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl p-3 transition-colors"
                    onClick={() => { setGenResult(h); setShowGenHistory(false); }}>
                    <p className="text-sm font-bold text-gray-800">{h.params.projectName}</p>
                    <p className="text-[10px] text-gray-500">{h.params.plantType} · {h.params.siteLength}m × {h.params.siteWidth}m · {h.layout.components?.length ?? 0} components</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{new Date(h.generatedAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
