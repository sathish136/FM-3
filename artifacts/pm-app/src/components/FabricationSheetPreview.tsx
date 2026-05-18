import type { MeshData } from "@/lib/stepLoader";
import type { PartDrawingInfo } from "@/lib/stepPartDrawing";
import { partsToBomRows, firstPartForBomRow } from "@/lib/stepPartDrawing";
import { WTT_BOM_COLUMNS } from "@/lib/drawingSheetLayout";
import { MeasuredOrthoPreview } from "@/components/MeasuredOrthoPreview";
import { ShadedMeshImage } from "@/components/ShadedMeshImage";
import { HD_GA_ISO } from "@/lib/stepMeshRenderer";

interface FabricationSheetPreviewProps {
  meshes: MeshData[];
  parts: PartDrawingInfo[];
  drawingNumber: string;
  drawingTitle: string;
  onSelectPart?: (part: PartDrawingInfo) => void;
}

function ViewLabel({ text }: { text: string }) {
  return (
    <div className="shrink-0 bg-[#1a1a2e] px-2 py-[3px] text-[8px] font-bold text-white uppercase tracking-widest">
      {text}
    </div>
  );
}

/**
 * On-screen preview — matches the exported PDF exactly.
 * 4-panel A3 layout:
 *   Top-left    (62% × 57%): FRONT ELEVATION with dimensions
 *   Bottom-left (62% × 43%): PLAN VIEW with dimensions
 *   Top-right   (38% × 40%): BOM TABLE
 *   Bottom-right(38% × 60%): ISOMETRIC 3D
 *   Title block sits inside the bottom-right panel.
 */
export function FabricationSheetPreview({
  meshes,
  parts,
  drawingNumber,
  drawingTitle,
  onSelectPart,
}: FabricationSheetPreviewProps) {
  const bomRows = partsToBomRows(parts);
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2,"0")}-${String(today.getMonth()+1).padStart(2,"0")}-${today.getFullYear()}`;

  return (
    <div
      className="mx-auto w-full max-w-[1240px] bg-white shadow-2xl relative font-mono"
      style={{ aspectRatio: "420 / 297" }}
    >
      {/* ── Outer border ── */}
      <div className="absolute inset-0 border-[2.5px] border-black pointer-events-none z-10" />

      {/* ── Inner content with margins ── */}
      <div className="absolute inset-[3%] flex flex-col gap-0">
        {/* Zone label row (top) */}
        <div className="shrink-0 flex" style={{ height: "4%" }}>
          <div className="flex-1 border-b border-neutral-300 flex">
            {["A","B","C","D"].map(l => (
              <div key={l} className="flex-1 flex items-center justify-center text-[7px] font-bold text-neutral-400 border-r border-neutral-200 last:border-r-0">{l}</div>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div className="flex-1 min-h-0 flex gap-0 border border-black">
          {/* ── LEFT COLUMN (62%) ── */}
          <div className="flex flex-col border-r border-black" style={{ flex: "62" }}>
            {/* FRONT VIEW — top 57% */}
            <div className="flex flex-col border-b border-black" style={{ flex: "57" }}>
              <ViewLabel text="FRONT VIEW — ALL DIMENSIONS IN mm" />
              <div className="flex-1 min-h-0 bg-white">
                <MeasuredOrthoPreview meshes={meshes} parts={parts} variant="front" className="h-full" />
              </div>
            </div>

            {/* PLAN VIEW — bottom 43% */}
            <div className="flex flex-col" style={{ flex: "43" }}>
              <ViewLabel text="PLAN VIEW (TOP) — ALL DIMENSIONS IN mm" />
              <div className="flex-1 min-h-0 bg-white">
                <MeasuredOrthoPreview meshes={meshes} parts={parts} variant="plan" className="h-full" />
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN (38%) ── */}
          <div className="flex flex-col" style={{ flex: "38" }}>
            {/* BOM TABLE — top 40% */}
            <div className="flex flex-col border-b border-black" style={{ flex: "40" }}>
              {/* BOM header */}
              <div className="shrink-0 bg-neutral-200 border-b border-black py-0.5 text-center text-[8px] font-black uppercase tracking-widest">
                Bill of Materials
              </div>

              {/* Column headers */}
              <div className="shrink-0 border-b border-black bg-neutral-100 flex">
                {WTT_BOM_COLUMNS.map(col => (
                  <div
                    key={col.key}
                    className="border-r border-neutral-400 last:border-r-0 px-[2px] py-[1px] text-[6px] font-black uppercase truncate"
                    style={{ flex: col.w }}
                  >
                    {col.label}
                  </div>
                ))}
              </div>

              {/* BOM rows */}
              <div className="flex-1 overflow-hidden">
                {bomRows.map((row, ri) => (
                  <div
                    key={row.sr}
                    onClick={() => { const p = firstPartForBomRow(parts, row); if (p) onSelectPart?.(p); }}
                    className={`flex border-b border-neutral-200 cursor-pointer hover:bg-sky-50 text-[5.5px] ${ri % 2 === 0 ? "" : "bg-neutral-50"}`}
                  >
                    <div className="border-r border-neutral-300 px-[2px] py-[1px] font-bold text-center" style={{ flex: 12 }}>{row.sr}</div>
                    <div className="border-r border-neutral-300 px-[2px] py-[1px] truncate" style={{ flex: 28 }}>{row.description}</div>
                    <div className="border-r border-neutral-300 px-[2px] py-[1px] truncate" style={{ flex: 11 }}>{row.size}</div>
                    <div className="border-r border-neutral-300 px-[2px] py-[1px] truncate" style={{ flex: 13 }}>{row.moc}</div>
                    <div className="border-r border-neutral-300 px-[2px] py-[1px] truncate" style={{ flex: 10 }}>{row.std}</div>
                    <div className="border-r border-neutral-300 px-[2px] py-[1px] truncate" style={{ flex: 14 }}>{row.pn}</div>
                    <div className="border-r border-neutral-300 px-[2px] py-[1px] truncate" style={{ flex: 26 }} title={row.type}>{row.type}</div>
                    <div className="border-r border-neutral-300 px-[2px] py-[1px] text-center" style={{ flex: 10 }}>
                      {row.description === "PIPE" ? "" : row.qty}
                    </div>
                    <div className="px-[2px] py-[1px] text-right" style={{ flex: 16 }}>{row.totalLength}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ISOMETRIC VIEW — bottom 60% */}
            <div className="flex flex-col relative" style={{ flex: "60" }}>
              <ViewLabel text="Isometric View" />
              <div className="flex-1 min-h-0 relative bg-white overflow-hidden">
                <ShadedMeshImage
                  meshes={meshes}
                  parts={parts}
                  gaIso
                  drawingNumber={drawingNumber}
                  drawingTitle={drawingTitle}
                  width={HD_GA_ISO.width}
                  height={HD_GA_ISO.height}
                  pixelRatio={1}
                  className="h-full w-full"
                  alt="Isometric"
                />

                {/* ── Title Block (absolute, bottom-right) ── */}
                <div className="absolute bottom-0 right-0 border-t border-l border-black bg-white"
                     style={{ width: "66%", fontSize: "5.5px", lineHeight: 1.3 }}>
                  {/* Company name row */}
                  <div className="border-b border-black px-1 py-[2px] bg-neutral-50">
                    <span className="font-black text-[7px] tracking-wide">WTT INTERNATIONAL PVT LTD</span>
                  </div>

                  {/* Main block: left fields | right signoff grid */}
                  <div className="flex">
                    {/* Left: DWG NO + TITLE */}
                    <div className="flex-1 border-r border-black min-w-0 flex flex-col">
                      <div className="border-b border-black px-1 py-[2px] flex-1">
                        <div className="text-neutral-400 text-[4.5px] uppercase font-bold tracking-wider">Drawing No.</div>
                        <div className="font-black text-[6px] truncate">{drawingNumber}</div>
                      </div>
                      <div className="px-1 py-[2px] flex-1">
                        <div className="text-neutral-400 text-[4.5px] uppercase font-bold tracking-wider">Title</div>
                        <div className="font-semibold truncate">{drawingTitle}</div>
                      </div>
                    </div>

                    {/* Right: 2×3 grid (Drawn / Checked / Approved | Scale / Rev / Sheet) */}
                    <div className="flex flex-col" style={{ minWidth: "30%" }}>
                      {[
                        ["Drawn by", "AUTO / STEP"],
                        ["Checked",  "—"],
                        ["Approved", "—"],
                      ].map(([label, val]) => (
                        <div key={label} className="flex border-b border-black last:border-b-0">
                          <div className="border-r border-black px-1 py-[1px] text-neutral-400 uppercase tracking-wider flex-1" style={{fontSize:"4px"}}>{label}</div>
                          <div className="px-1 py-[1px] font-semibold flex-1">{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer: Scale / Rev / Date / Sheet */}
                  <div className="border-t border-black flex">
                    {[
                      ["SCALE", "NTS"],
                      ["REV",   "01"],
                      ["DATE",  dateStr],
                      ["SHEET", "1 OF 1"],
                    ].map(([label, val]) => (
                      <div key={label} className="flex-1 border-r border-black last:border-r-0 px-1 py-[1px]">
                        <div className="text-neutral-400 uppercase tracking-wider" style={{fontSize:"4px"}}>{label}</div>
                        <div className="font-black" style={{fontSize:"5.5px"}}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Zone label row (bottom) */}
        <div className="shrink-0 flex" style={{ height: "4%" }}>
          <div className="flex-1 border-t border-neutral-300 flex">
            {[1,2,3,4].map(n => (
              <div key={n} className="flex-1 flex items-center justify-center text-[7px] font-bold text-neutral-400 border-r border-neutral-200 last:border-r-0">{n}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
