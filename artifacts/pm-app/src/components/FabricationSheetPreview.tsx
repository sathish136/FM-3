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

/** On-screen preview of the single-page fabrication PDF (A3 proportions). */
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
      <div className="grid h-full w-full grid-cols-[1fr_280px] grid-rows-2 gap-0">
        <div className="border-b border-r border-black min-h-0 flex flex-col">
          <div className="bg-black px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider shrink-0">
            Front view
          </div>
          <div className="flex-1 min-h-0">
            <MeasuredOrthoPreview meshes={meshes} parts={parts} variant="front" className="h-full" />
          </div>
        </div>

        <div className="border-b border-black flex flex-col min-h-0 overflow-hidden">
          <div className="bg-neutral-200 px-2 py-1 text-[9px] font-bold text-center border-b border-black uppercase tracking-wide shrink-0">
            Bill of materials
          </div>
          <div className="overflow-auto flex-1 text-[8px]">
            <table className="w-full border-collapse">
              <thead className="bg-neutral-100 sticky top-0">
                <tr>
                  {WTT_BOM_COLUMNS.map(col => (
                    <th key={col.key} className="border border-neutral-300 px-0.5 py-0.5 text-left font-bold">
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
                    <td className="border border-neutral-200 px-0.5 truncate max-w-[60px]" title={row.type}>
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

        <div className="border-r border-black min-h-0 flex flex-col">
          <div className="bg-black px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider shrink-0">
            Plan view
          </div>
          <div className="flex-1 min-h-0">
            <MeasuredOrthoPreview meshes={meshes} parts={parts} variant="plan" className="h-full" />
          </div>
        </div>

        <div className="relative min-h-0 flex flex-col">
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
            <div className="absolute bottom-0 right-0 w-[38%] min-w-[100px] border border-black bg-white p-1 text-[6px] leading-tight pointer-events-none">
              <p className="font-bold">WTT INTERNATIONAL PVT LTD</p>
              <p className="italic">NOTE: ALL DIMENSIONS ARE IN mm</p>
              <p className="font-semibold truncate">{drawingNumber}</p>
              <p className="truncate">{drawingTitle}</p>
              <p className="text-neutral-500">1 OF 1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
