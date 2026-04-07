import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { MeshData } from "@/lib/stepLoader";

export type { MeshData };
export type ViewMode = "shaded" | "wireframe" | "flat" | "edges";
export type BgColor = "dark" | "navy" | "white" | "light";

export interface ViewerRef {
  setCamera(view: "front" | "back" | "top" | "bottom" | "left" | "right" | "iso"): void;
  fitToView(): void;
  fitToPart(meshIndices: number[]): void;
  clearMeasure(): void;
}

interface StepViewer3DProps {
  meshes: MeshData[];
  viewMode: ViewMode;
  showGrid: boolean;
  showAxes: boolean;
  bgColor: BgColor;
  hiddenMeshes: Set<number>;
  measureMode: boolean;
  onMeasureResult: (dist: number | null, p1: THREE.Vector3 | null, p2: THREE.Vector3 | null) => void;
  onCameraChange?: (q: THREE.Quaternion) => void;
  onPartClick?: (meshIndex: number | null, meshName: string | null) => void;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
}

const BG_COLORS: Record<BgColor, number> = {
  dark: 0x0f0f1a,
  navy: 0x1a1a2e,
  white: 0xf5f5f5,
  light: 0xdde3ee,
};

// Default neutral industrial grey – used when the STEP file has no colour for a part
const DEFAULT_PART_COLOR = new THREE.Color(0xc8cdd5);

// Highlight colour applied to selected parts
const HIGHLIGHT_EMISSIVE = new THREE.Color(0x00aaff);
const HIGHLIGHT_EMISSIVE_INTENSITY = 0.35;

const StepViewer3D = forwardRef<ViewerRef, StepViewer3DProps>(function StepViewer3D(
  {
    meshes, viewMode, showGrid, showAxes, bgColor,
    hiddenMeshes, measureMode, onMeasureResult, onCameraChange,
    onPartClick, autoRotate = false, autoRotateSpeed = 1.5,
  },
  ref
) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const sceneRef   = useRef<THREE.Scene | null>(null);
  const cameraRef  = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameRef   = useRef<number | null>(null);
  const meshGroupRef  = useRef<THREE.Group | null>(null);
  const gridRef    = useRef<THREE.GridHelper | null>(null);
  const axesRef    = useRef<THREE.AxesHelper | null>(null);
  const modelSizeRef  = useRef<number>(10);
  const partGroupsRef = useRef<Map<number, THREE.Group>>(new Map());

  // Map from mesh index → the actual THREE.Mesh inside its group
  const mesh3dRef  = useRef<Map<number, THREE.Mesh>>(new Map());
  // Original material per mesh index (for restoring after highlight)
  const origMatRef = useRef<Map<number, THREE.Material | THREE.Material[]>>(new Map());
  const selectedIdxRef = useRef<number | null>(null);

  const measurePtsRef  = useRef<THREE.Vector3[]>([]);
  const measureGrpRef  = useRef<THREE.Group | null>(null);
  const measureModeRef = useRef(measureMode);
  measureModeRef.current = measureMode;
  const onCameraChangeRef = useRef(onCameraChange);
  onCameraChangeRef.current = onCameraChange;
  const onPartClickRef = useRef(onPartClick);
  onPartClickRef.current = onPartClick;

  function clearSelection() {
    const prev = selectedIdxRef.current;
    if (prev !== null) {
      const m = mesh3dRef.current.get(prev);
      const orig = origMatRef.current.get(prev);
      if (m && orig) m.material = orig;
      selectedIdxRef.current = null;
    }
  }

  function selectMesh(idx: number, name: string) {
    clearSelection();
    const m = mesh3dRef.current.get(idx);
    if (!m) return;
    const orig = m.material;
    origMatRef.current.set(idx, orig);
    selectedIdxRef.current = idx;

    // Clone and tint the material for the highlight
    const base = Array.isArray(orig) ? orig[0] : orig;
    let hl: THREE.Material;
    if (base instanceof THREE.MeshPhongMaterial) {
      hl = base.clone() as THREE.MeshPhongMaterial;
      (hl as THREE.MeshPhongMaterial).emissive = HIGHLIGHT_EMISSIVE.clone();
      (hl as THREE.MeshPhongMaterial).emissiveIntensity = HIGHLIGHT_EMISSIVE_INTENSITY;
    } else if (base instanceof THREE.MeshLambertMaterial) {
      hl = base.clone() as THREE.MeshLambertMaterial;
      (hl as THREE.MeshLambertMaterial).emissive = HIGHLIGHT_EMISSIVE.clone();
    } else {
      hl = new THREE.MeshPhongMaterial({
        color: HIGHLIGHT_EMISSIVE, emissive: HIGHLIGHT_EMISSIVE,
        emissiveIntensity: 0.5, side: THREE.DoubleSide,
      });
    }
    m.material = hl;
    onPartClickRef.current?.(idx, name);
  }

  useImperativeHandle(ref, () => ({
    setCamera(view) {
      const cam  = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl) return;
      const d = modelSizeRef.current * 2.2;
      const pos: Record<string, [number, number, number]> = {
        front:  [0, 0, d],   back:   [0, 0, -d],
        top:    [0, d, 0.001], bottom: [0, -d, 0.001],
        left:   [-d, 0, 0],  right:  [d, 0, 0],
        iso:    [d * 0.8, d * 0.6, d * 0.8],
      };
      const p = pos[view];
      cam.position.set(p[0], p[1], p[2]);
      cam.lookAt(0, 0, 0);
      ctrl.target.set(0, 0, 0);
      ctrl.update();
    },
    fitToView() {
      const cam  = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl) return;
      const d = modelSizeRef.current * 1.8;
      cam.position.set(d, d * 0.7, d);
      cam.lookAt(0, 0, 0);
      ctrl.target.set(0, 0, 0);
      ctrl.update();
    },
    fitToPart(meshIndices) {
      const cam  = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl || meshIndices.length === 0) return;
      const bbox = new THREE.Box3();
      for (const idx of meshIndices) {
        const grp = partGroupsRef.current.get(idx);
        if (grp) bbox.union(new THREE.Box3().setFromObject(grp));
      }
      if (bbox.isEmpty()) return;
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const d = Math.max(size.x, size.y, size.z) * 2;
      cam.position.set(center.x + d, center.y + d * 0.5, center.z + d);
      cam.lookAt(center);
      ctrl.target.copy(center);
      ctrl.update();
    },
    clearMeasure() {
      measurePtsRef.current = [];
      if (measureGrpRef.current && sceneRef.current) {
        sceneRef.current.remove(measureGrpRef.current);
        measureGrpRef.current.traverse((o) => {
          if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
            o.geometry.dispose();
            (o.material as THREE.Material).dispose();
          }
        });
        measureGrpRef.current = null;
      }
      onMeasureResult(null, null, null);
    },
  }));

  // ── Scene setup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;
    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG_COLORS[bgColor]);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.001, 100000);
    camera.position.set(5, 5, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting – brighter for realistic colours
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dir1.position.set(10, 20, 10);
    dir1.castShadow = true;
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xd0e0ff, 0.5);
    dir2.position.set(-10, -5, -10);
    scene.add(dir2);
    const dir3 = new THREE.DirectionalLight(0xffffff, 0.3);
    dir3.position.set(0, -20, 0);
    scene.add(dir3);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.5));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.06;
    controls.screenSpacePanning = true;
    // ── Allow full spherical rotation (no locked angles) ──
    controls.minPolarAngle   = 0;           // look straight down
    controls.maxPolarAngle   = Math.PI;     // look straight up from below
    controls.minAzimuthAngle = -Infinity;   // full 360° horizontal
    controls.maxAzimuthAngle = Infinity;
    controlsRef.current = controls;

    controls.addEventListener("change", () => {
      onCameraChangeRef.current?.(camera.quaternion.clone());
    });

    const grid = new THREE.GridHelper(200, 100, 0x334466, 0x223344);
    (grid.material as THREE.Material).opacity = 0.4;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);
    gridRef.current = grid;

    const axes = new THREE.AxesHelper(5);
    scene.add(axes);
    axesRef.current = axes;

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      controls.dispose();
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    ctrl.autoRotate      = autoRotate;
    ctrl.autoRotateSpeed = autoRotateSpeed;
  }, [autoRotate, autoRotateSpeed]);

  // ── Unified click handler: measure OR part selection ─────────────────────────
  useEffect(() => {
    const renderer = rendererRef.current;
    const camera   = cameraRef.current;
    const scene    = sceneRef.current;
    if (!renderer || !camera || !scene) return;

    const raycaster = new THREE.Raycaster();
    let mouseDownPos = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => { mouseDownPos = { x: e.clientX, y: e.clientY }; };

    const onClick = (e: MouseEvent) => {
      // Ignore if the mouse moved significantly (user was orbiting)
      if (Math.abs(e.clientX - mouseDownPos.x) > 5 || Math.abs(e.clientY - mouseDownPos.y) > 5) return;
      if (!mountRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width)  * 2 - 1,
        -((e.clientY - rect.top)  / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(mouse, camera);

      const targets: THREE.Mesh[] = [];
      meshGroupRef.current?.traverse((o) => { if (o instanceof THREE.Mesh) targets.push(o); });

      const hits = raycaster.intersectObjects(targets, false);

      if (measureModeRef.current) {
        // ── Measure mode ──
        if (!hits.length) return;
        const pt = hits[0].point.clone();
        measurePtsRef.current.push(pt);

        if (!measureGrpRef.current) {
          measureGrpRef.current = new THREE.Group();
          scene.add(measureGrpRef.current);
        }
        const mk = new THREE.Mesh(
          new THREE.SphereGeometry(modelSizeRef.current * 0.015, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xffcc00 })
        );
        mk.position.copy(pt);
        measureGrpRef.current.add(mk);

        if (measurePtsRef.current.length >= 2) {
          const [p1, p2] = [measurePtsRef.current[0], measurePtsRef.current[1]];
          measureGrpRef.current.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([p1, p2]),
            new THREE.LineBasicMaterial({ color: 0xffcc00 })
          ));
          onMeasureResult(p1.distanceTo(p2), p1, p2);
          measurePtsRef.current = [];
        }
      } else {
        // ── Selection / highlight mode ──
        if (!hits.length) {
          clearSelection();
          onPartClickRef.current?.(null, null);
          return;
        }
        const hitMesh = hits[0].object as THREE.Mesh;
        // Find which mesh index this belongs to
        let foundIdx: number | null = null;
        partGroupsRef.current.forEach((grp, idx) => {
          grp.traverse((o) => { if (o === hitMesh) foundIdx = idx; });
        });
        if (foundIdx !== null) {
          if (selectedIdxRef.current === foundIdx) {
            // Click same part → deselect
            clearSelection();
            onPartClickRef.current?.(null, null);
          } else {
            selectMesh(foundIdx, hitMesh.name);
          }
        }
      }
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("click", onClick);
    return () => {
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("click", onClick);
    };
  }, [onMeasureResult]);

  // ── Build geometry from mesh data ─────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    clearSelection();
    onPartClickRef.current?.(null, null);

    if (meshGroupRef.current) {
      scene.remove(meshGroupRef.current);
      meshGroupRef.current.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
      meshGroupRef.current = null;
    }
    partGroupsRef.current.clear();
    mesh3dRef.current.clear();
    origMatRef.current.clear();

    if (!meshes.length) return;

    const group = new THREE.Group();
    meshGroupRef.current = group;
    const bbox = new THREE.Box3();

    meshes.forEach((md, i) => {
      if (!md.positions.length) return;

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(md.positions, 3));
      if (md.normals.length) {
        geo.setAttribute("normal", new THREE.Float32BufferAttribute(md.normals, 3));
      } else {
        geo.computeVertexNormals();
      }
      if (md.indices.length) geo.setIndex(md.indices);

      // Resolve mesh-level fallback colour
      let fallbackCol: THREE.Color;
      if (md.color && (md.color[0] !== 0 || md.color[1] !== 0 || md.color[2] !== 0)) {
        fallbackCol = new THREE.Color(md.color[0], md.color[1], md.color[2]);
      } else {
        fallbackCol = DEFAULT_PART_COLOR.clone();
      }

      // Helper to build a single material for a given colour
      function makeMat(col: THREE.Color): THREE.Material {
        if (viewMode === "wireframe") {
          return new THREE.MeshBasicMaterial({ color: col, wireframe: true });
        } else if (viewMode === "flat") {
          return new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide, flatShading: true });
        } else if (viewMode === "edges") {
          return new THREE.MeshBasicMaterial({ color: 0x111122, side: THREE.DoubleSide });
        } else {
          return new THREE.MeshPhongMaterial({
            color: col,
            specular: new THREE.Color(0x333333),
            shininess: 60,
            side: THREE.DoubleSide,
          });
        }
      }

      const partGrp = new THREE.Group();
      partGrp.name = md.name;

      // Build material list and geometry groups from brep_faces if available
      const hasFaceColors = Array.isArray(md.brepFaces) && md.brepFaces.length > 0;
      let materials: THREE.Material[];
      let primaryMat: THREE.Material;

      if (hasFaceColors) {
        // Default material at index 0 (for triangles not covered by any face group)
        const defaultMat = makeMat(fallbackCol);
        materials = [defaultMat];
        for (const face of md.brepFaces) {
          const fc = face.color && (face.color[0] !== 0 || face.color[1] !== 0 || face.color[2] !== 0)
            ? new THREE.Color(face.color[0], face.color[1], face.color[2])
            : fallbackCol.clone();
          materials.push(makeMat(fc));
        }

        // Add geometry groups matching the occt-import-js brep_faces convention
        const triangleCount = md.indices.length / 3;
        let triangleIndex = 0;
        let faceIdx = 0;
        while (triangleIndex < triangleCount) {
          const firstIndex = triangleIndex;
          let lastIndex: number;
          let matIndex: number;
          if (faceIdx >= md.brepFaces.length) {
            lastIndex = triangleCount;
            matIndex = 0;
          } else if (triangleIndex < md.brepFaces[faceIdx].first) {
            lastIndex = md.brepFaces[faceIdx].first;
            matIndex = 0;
          } else {
            lastIndex = md.brepFaces[faceIdx].last + 1;
            matIndex = faceIdx + 1;
            faceIdx++;
          }
          geo.addGroup(firstIndex * 3, (lastIndex - firstIndex) * 3, matIndex);
          triangleIndex = lastIndex;
        }
        primaryMat = defaultMat;
      } else {
        primaryMat = makeMat(fallbackCol);
        materials = [primaryMat];
      }

      const mesh3 = new THREE.Mesh(geo, materials.length > 1 ? materials : primaryMat);
      mesh3.name = md.name;
      mesh3.castShadow    = true;
      mesh3.receiveShadow = true;
      partGrp.add(mesh3);

      // Edge overlay for shaded/edges mode
      if (viewMode === "shaded" || viewMode === "edges") {
        const edgeGeo = new THREE.EdgesGeometry(geo, viewMode === "edges" ? 10 : 15);
        const edgeColor = viewMode === "edges" ? fallbackCol : new THREE.Color(0x000000);
        const edgeOpacity = viewMode === "edges" ? 1.0 : 0.15;
        partGrp.add(new THREE.LineSegments(
          edgeGeo,
          new THREE.LineBasicMaterial({ color: edgeColor, transparent: viewMode === "shaded", opacity: edgeOpacity })
        ));
      }

      partGrp.visible = !hiddenMeshes.has(i);
      partGroupsRef.current.set(i, partGrp);
      mesh3dRef.current.set(i, mesh3);
      origMatRef.current.set(i, primaryMat);
      group.add(partGrp);

      geo.computeBoundingBox();
      if (geo.boundingBox) bbox.union(geo.boundingBox);
    });

    scene.add(group);

    const center = new THREE.Vector3();
    bbox.getCenter(center);
    group.position.sub(center);

    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 10;
    modelSizeRef.current = maxDim;

    if (gridRef.current)  gridRef.current.scale.setScalar((maxDim * 4) / 200);
    if (axesRef.current)  axesRef.current.scale.setScalar(maxDim * 0.3);

    if (cameraRef.current && controlsRef.current) {
      const d = maxDim * 1.8;
      cameraRef.current.position.set(d, d * 0.7, d);
      cameraRef.current.lookAt(0, 0, 0);
      cameraRef.current.near = maxDim * 0.0001;
      cameraRef.current.far  = maxDim * 200;
      cameraRef.current.updateProjectionMatrix();
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.minDistance = maxDim * 0.005;
      controlsRef.current.maxDistance = maxDim * 100;
      controlsRef.current.update();
    }
  }, [meshes, viewMode]);

  useEffect(() => {
    partGroupsRef.current.forEach((grp, idx) => {
      grp.visible = !hiddenMeshes.has(idx);
    });
  }, [hiddenMeshes]);

  useEffect(() => { if (gridRef.current)  gridRef.current.visible  = showGrid; }, [showGrid]);
  useEffect(() => { if (axesRef.current)  axesRef.current.visible  = showAxes; }, [showAxes]);
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.background = new THREE.Color(BG_COLORS[bgColor]);
  }, [bgColor]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      style={{ cursor: measureMode ? "crosshair" : "pointer" }}
    />
  );
});

export default StepViewer3D;
