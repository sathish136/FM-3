import { useMemo } from "react";
import type { MeshData } from "@/lib/stepLoader";
import type { PartDrawingInfo } from "@/lib/stepPartDrawing";
import {
  renderAssemblyMeasured3dView,
  HD_MEASURED_VIEW,
} from "@/lib/stepMeasured3dView";

interface MeasuredOrthoPreviewProps {
  meshes: MeshData[];
  parts: PartDrawingInfo[];
  variant: "front" | "plan";
  className?: string;
}

export function MeasuredOrthoPreview({
  meshes,
  parts,
  variant,
  className = "",
}: MeasuredOrthoPreviewProps) {
  const src = useMemo(() => {
    if (!meshes.length) return "";
    const view = variant === "front" ? "front" : "top";
    return renderAssemblyMeasured3dView(meshes, parts, view, HD_MEASURED_VIEW);
  }, [meshes, parts, variant]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={
        variant === "front"
          ? "Front view with dimensions"
          : "Plan view with dimensions"
      }
      className={`w-full h-full object-contain bg-white ${className}`}
      draggable={false}
    />
  );
}
