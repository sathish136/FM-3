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

/** On-screen preview of the single-page fabrication PDF (A3 proportions).
 *  Layout: Left full-height front elevation | Right-top BOM | Right-bottom ISO 3D
 */
export function FabricationSheetPreview({
  meshes,
  parts,
  drawingNumber,
  drawingTitle,
  onSelectPart,
}: FabricationSheetPreviewProps) {
  const bomRows = partsToBomRows(parts);

  return (
    <div
      className="mx-auto w-full max-w-[1200px] border-2 border-black bg-white shadow-2xl"
      style={{ aspectRatio: "420 / 297" }}
    >
      {/* 3-panel layout: left (60%) full-height front view | right (40%) top BOM + bottom ISO */}
      <div className="grid h-full w-full grid-cols-[1fr_280px] gap-0">

        {/* ── LEFT: Full-height front elevation ── */}
        <div className="border-r border-black min-h-0 flex flex-col">
          <div className="bg-black px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider shrink-0">
            Front view
          </div>
          <div className="flex-1 min-h-0">
            <MeasuredOrthoPreview meshes={meshes} parts={parts} variant="front" className="h-full" />
          </div>
        </div>

        {/* ── RIGHT: BOM (top) + ISO 3D (bottom) ── */}
        <div className="flex flex-col min-h-0">

          {/* BOM table — upper ~42% */}
          <div className="border-b border-black flex flex-col min-h-0" style={{ flex: "0 0 42%" }}>
            <div className="bg-neutral-200 px-2 py-1 text-[9px] font-bold text-center border-b border-black uppercase tracking-wide shrink-0">
              Bill of materials
            </div>
            <div className="overflow-auto flex-1 text-[7.5px]">
              <table className="w-full border-collapse">
                <thead className="bg-neutral-100 sticky top-0">
                  <tr>
                    {WTT_BOM_COLUMNS.map(col => (
                      <th key={col.key} className="border border-neutral-300 px-0.5 py-0.5 text-left font-bold whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bomRows.map(row => (
                    <tr
                      key={row.sr}
                      className="cursor-pointer hover:bg-sky-50"
                      onClick={() => {
                        const p = firstPartForBomRow(parts, row);
                        if (p) onSelectPart?.(p);
                      }}
                    >
                      <td className="border border-neutral-200 px-0.5 text-center font-semibold">{row.sr}</td>
                      <td className="border border-neutral-200 px-0.5">{row.description}</td>
                      <td className="border border-neutral-200 px-0.5">{row.size}</td>
                      <td className="border border-neutral-200 px-0.5">{row.moc}</td>
                      <td className="border border-neutral-200 px-0.5">{row.std}</td>
                      <td className="border border-neutral-200 px-0.5">{row.pn}</td>
                      <td className="border border-neutral-200 px-0.5 truncate max-w-[50px]" title={row.type}>
                        {row.type}
                      </td>
                      <td className="border border-neutral-200 px-0.5 text-center">
                        {row.description === "PIPE" ? "" : row.qty}
                      </td>
                      <td className="border border-neutral-200 px-0.5 text-right">{row.totalLength}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Isometric 3D view — lower ~58% */}
          <div className="relative flex-1 min-h-0 flex flex-col">
            <div className="bg-black px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider shrink-0 z-10">
              Isometric view
            </div>
            <div className="flex-1 min-h-0 relative">
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
              {/* Title block overlay */}
              <div className="absolute bottom-0 right-0 w-[52%] min-w-[110px] border border-black bg-white p-1 text-[6px] leading-tight pointer-events-none">
                <p className="font-bold text-[6.5px]">WTT INTERNATIONAL PVT LTD</p>
                <p className="italic text-neutral-600">NOTE: ALL DIMENSIONS ARE IN mm</p>
                <div className="flex gap-2 mt-0.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-neutral-400 text-[5px]">DWG NO</p>
                    <p className="font-semibold truncate">{drawingNumber}</p>
                  </div>
                </div>
                <div className="mt-0.5">
                  <p className="text-neutral-400 text-[5px]">TITLE</p>
                  <p className="truncate">{drawingTitle}</p>
                </div>
                <div className="flex justify-between mt-0.5 text-neutral-500 text-[5px]">
                  <span>SHEET 1 OF 1</span>
                  <span>REV 01</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
