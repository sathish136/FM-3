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
}

const BG_COLORS: Record<BgColor, number> = {
  dark: 0x0f0f1a,
  navy: 0x1a1a2e,
  white: 0xf5f5f5,
  light: 0xdde3ee,
};

const palette = [
  0x5588dd, 0x44aaaa, 0xddaa44, 0xaa55dd, 0xdd5555,
  0x55cc88, 0x8888cc, 0xcc8844, 0x55cc55, 0xcc55cc,
];

const StepViewer3D = forwardRef<ViewerRef, StepViewer3DProps>(function StepViewer3D(
  { meshes, viewMode, showGrid, showAxes, bgColor, hiddenMeshes, measureMode, onMeasureResult },
  ref
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameRef = useRef<number | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const axesRef = useRef<THREE.AxesHelper | null>(null);
  const modelSizeRef = useRef<number>(10);
  const partGroupsRef = useRef<Map<number, THREE.Group>>(new Map());

  const measurePtsRef = useRef<THREE.Vector3[]>([]);
  const measureGrpRef = useRef<THREE.Group | null>(null);
  const measureModeRef = useRef(measureMode);
  measureModeRef.current = measureMode;

  useImperativeHandle(ref, () => ({
    setCamera(view) {
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl) return;
      const d = modelSizeRef.current * 2.2;
      const pos: Record<string, [number, number, number]> = {
        front:  [0, 0, d],  back:   [0, 0, -d],
        top:    [0, d, 0.001], bottom: [0, -d, 0.001],
        left:   [-d, 0, 0], right:  [d, 0, 0],
        iso:    [d * 0.8, d * 0.6, d * 0.8],
      };
      const p = pos[view];
      cam.position.set(p[0], p[1], p[2]);
      cam.lookAt(0, 0, 0);
      ctrl.target.set(0, 0, 0);
      ctrl.update();
    },
    fitToView() {
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl) return;
      const d = modelSizeRef.current * 1.8;
      cam.position.set(d, d * 0.7, d);
      cam.lookAt(0, 0, 0);
      ctrl.target.set(0, 0, 0);
      ctrl.update();
    },
    fitToPart(meshIndices) {
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl || meshIndices.length === 0) return;
      const bbox = new THREE.Box3();
      for (const idx of meshIndices) {
        const grp = partGroupsRef.current.get(idx);
        if (grp) {
          const b = new THREE.Box3().setFromObject(grp);
          bbox.union(b);
        }
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
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dir1.position.set(10, 20, 10);
    dir1.castShadow = true;
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0x8899ff, 0.4);
    dir2.position.set(-10, -5, -10);
    scene.add(dir2);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 0.4));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.screenSpacePanning = true;
    controlsRef.current = controls;

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
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!renderer || !camera || !scene) return;

    const raycaster = new THREE.Raycaster();
    const onClick = (e: MouseEvent) => {
      if (!measureModeRef.current || !mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);

      const targets: THREE.Object3D[] = [];
      meshGroupRef.current?.traverse((o) => { if (o instanceof THREE.Mesh) targets.push(o); });

      const hits = raycaster.intersectObjects(targets, false);
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
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([p1, p2]),
          new THREE.LineBasicMaterial({ color: 0xffcc00 })
        );
        measureGrpRef.current.add(line);
        onMeasureResult(p1.distanceTo(p2), p1, p2);
        measurePtsRef.current = [];
      }
    };

    renderer.domElement.addEventListener("click", onClick);
    return () => renderer.domElement.removeEventListener("click", onClick);
  }, [onMeasureResult]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

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

      const col = md.color
        ? new THREE.Color(md.color[0], md.color[1], md.color[2])
        : new THREE.Color(palette[i % palette.length]);

      const partGrp = new THREE.Group();
      partGrp.name = md.name;

      let mat: THREE.Material;
      if (viewMode === "wireframe") {
        mat = new THREE.MeshBasicMaterial({ color: col, wireframe: true });
      } else if (viewMode === "flat") {
        mat = new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide, flatShading: true });
      } else if (viewMode === "edges") {
        mat = new THREE.MeshBasicMaterial({ color: 0x111122, side: THREE.DoubleSide });
        const edgeGeo = new THREE.EdgesGeometry(geo, 10);
        partGrp.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: col })));
      } else {
        mat = new THREE.MeshPhongMaterial({
          color: col, specular: new THREE.Color(0x222222),
          shininess: 50, side: THREE.DoubleSide,
        });
      }

      const mesh3 = new THREE.Mesh(geo, mat);
      mesh3.name = md.name;
      mesh3.castShadow = true;
      mesh3.receiveShadow = true;
      partGrp.add(mesh3);

      if (viewMode === "shaded") {
        const edgeGeo = new THREE.EdgesGeometry(geo, 15);
        partGrp.add(new THREE.LineSegments(
          edgeGeo,
          new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
        ));
      }

      partGrp.visible = !hiddenMeshes.has(i);
      partGroupsRef.current.set(i, partGrp);
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

    if (gridRef.current) gridRef.current.scale.setScalar((maxDim * 4) / 200);
    if (axesRef.current) axesRef.current.scale.setScalar(maxDim * 0.3);

    if (cameraRef.current && controlsRef.current) {
      const d = maxDim * 1.8;
      cameraRef.current.position.set(d, d * 0.7, d);
      cameraRef.current.lookAt(0, 0, 0);
      cameraRef.current.near = maxDim * 0.0001;
      cameraRef.current.far = maxDim * 200;
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

  useEffect(() => { if (gridRef.current) gridRef.current.visible = showGrid; }, [showGrid]);
  useEffect(() => { if (axesRef.current) axesRef.current.visible = showAxes; }, [showAxes]);
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.background = new THREE.Color(BG_COLORS[bgColor]);
  }, [bgColor]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      style={{ cursor: measureMode ? "crosshair" : "default" }}
    />
  );
});

export default StepViewer3D;
