import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { MeshData } from "@/lib/stepLoader";
import { partBalloonLabels, partsToBomRows, type PartDrawingInfo } from "@/lib/stepPartDrawing";
import {
  renderMeshesShaded,
  renderAssemblyGaIso,
  type ShadedCameraView,
  type ShadedRenderOptions,
} from "@/lib/stepMeshRenderer";

interface ShadedMeshImageProps {
  meshes: MeshData[];
  meshIndices?: number[];
  view?: ShadedCameraView;
  width: number;
  height: number;
  pixelRatio?: number;
  className?: string;
  label?: string;
  alt?: string;
  /** GA sheet isometric: WTT colors + BOM balloons, no dimensions */
  gaIso?: boolean;
  parts?: PartDrawingInfo[];
  drawingNumber?: string;
  drawingTitle?: string;
}

export function ShadedMeshImage({
  meshes,
  meshIndices,
  view = "iso",
  width,
  height,
  pixelRatio = 2,
  className = "",
  label,
  alt = "3D preview",
  gaIso = false,
  parts = [],
  drawingNumber = "",
  drawingTitle = "",
}: ShadedMeshImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const indexKey = meshIndices?.join(",") ?? "all";
  const partsKey = parts.map(p => p.meshIndex).join(",");

  useEffect(() => {
    if (!meshes.length) {
      setSrc(null);
      setBusy(false);
      return;
    }
    setBusy(true);
    const id = requestAnimationFrame(() => {
      try {
        const url = gaIso
          ? renderAssemblyGaIso(meshes, parts, {
              width,
              height,
              pixelRatio,
              showBalloons: parts.length > 0 && parts.length <= 30,
              balloonLabels: partBalloonLabels(parts, partsToBomRows(parts)),
              drawingNumber: drawingNumber || undefined,
              drawingTitle: drawingTitle || undefined,
            })
          : renderMeshesShaded(meshes, {
              width,
              height,
              pixelRatio,
              view,
              meshIndices,
              background: 0xffffff,
            } satisfies ShadedRenderOptions);
        setSrc(url);
      } catch {
        setSrc(null);
      }
      setBusy(false);
    });
    return () => cancelAnimationFrame(id);
  }, [meshes, indexKey, partsKey, view, width, height, pixelRatio, gaIso, drawingNumber, drawingTitle]);

  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      {label ? (
        <div className="absolute top-0 left-0 right-0 z-10 px-3 py-2 bg-gradient-to-b from-slate-900/70 to-transparent">
          <span className="text-[11px] font-semibold tracking-wide text-white uppercase">{label}</span>
        </div>
      ) : null}
      {busy ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      ) : null}
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-contain" draggable={false} />
      ) : !busy ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          No geometry
        </div>
      ) : null}
    </div>
  );
}
