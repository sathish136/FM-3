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
  clearMeasure(): void;
}

interface StepViewer3DProps {
  meshes: MeshData[];
  viewMode: ViewMode;
  showGrid: boolean;
  showAxes: boolean;
  bgColor: BgColor;
  measureMode: boolean;
  onMeasureResult: (dist: number | null, p1: THREE.Vector3 | null, p2: THREE.Vector3 | null) => void;
}

const BG_COLORS: Record<BgColor, number> = {
  dark: 0x0f0f1a,
  navy: 0x1a1a2e,
  white: 0xf5f5f5,
  light: 0xdde3ee,
};

const StepViewer3D = forwardRef<ViewerRef, StepViewer3DProps>(function StepViewer3D(
  { meshes, viewMode, showGrid, showAxes, bgColor, measureMode, onMeasureResult },
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

  // Measure state
  const measurePointsRef = useRef<THREE.Vector3[]>([]);
  const measureMarkersRef = useRef<THREE.Group | null>(null);
  const measureModeRef = useRef(measureMode);
  measureModeRef.current = measureMode;

  // Imperative API
  useImperativeHandle(ref, () => ({
    setCamera(view) {
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl) return;
      const d = modelSizeRef.current * 2.2;
      const pos: Record<string, [number, number, number]> = {
        front:  [0, 0, d],
        back:   [0, 0, -d],
        top:    [0, d, 0.001],
        bottom: [0, -d, 0.001],
        left:   [-d, 0, 0],
        right:  [d, 0, 0],
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
    clearMeasure() {
      measurePointsRef.current = [];
      if (measureMarkersRef.current && sceneRef.current) {
        sceneRef.current.remove(measureMarkersRef.current);
        measureMarkersRef.current.traverse((o) => {
          if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
            o.geometry.dispose();
            (o.material as THREE.Material).dispose();
          }
        });
        measureMarkersRef.current = null;
      }
      onMeasureResult(null, null, null);
    },
  }));

  // Init Three.js scene
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

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dir1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dir1.position.set(10, 20, 10);
    dir1.castShadow = true;
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0x8899ff, 0.4);
    dir2.position.set(-10, -5, -10);
    scene.add(dir2);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444466, 0.4);
    scene.add(hemi);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.screenSpacePanning = true;
    controls.minDistance = 0.001;
    controls.maxDistance = 100000;
    controlsRef.current = controls;

    // Grid
    const grid = new THREE.GridHelper(200, 100, 0x334466, 0x223344);
    (grid.material as THREE.Material).opacity = 0.4;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);
    gridRef.current = grid;

    // Axes
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

  // Measure click handler
  useEffect(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!renderer || !camera || !scene) return;

    const raycaster = new THREE.Raycaster();

    const onClick = (e: MouseEvent) => {
      if (!measureModeRef.current) return;
      if (!mountRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);

      const targets: THREE.Object3D[] = [];
      meshGroupRef.current?.traverse((o) => { if (o instanceof THREE.Mesh) targets.push(o); });

      const hits = raycaster.intersectObjects(targets, false);
      if (hits.length === 0) return;

      const pt = hits[0].point.clone();
      measurePointsRef.current.push(pt);

      // Rebuild markers
      if (!measureMarkersRef.current) {
        measureMarkersRef.current = new THREE.Group();
        scene.add(measureMarkersRef.current);
      }
      const markerGeo = new THREE.SphereGeometry(modelSizeRef.current * 0.015, 12, 12);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(pt);
      measureMarkersRef.current.add(marker);

      if (measurePointsRef.current.length >= 2) {
        const [p1, p2] = [measurePointsRef.current[0], measurePointsRef.current[1]];
        const dist = p1.distanceTo(p2);

        // Draw line
        const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xffcc00, linewidth: 2 });
        const line = new THREE.Line(lineGeo, lineMat);
        measureMarkersRef.current.add(line);

        onMeasureResult(dist, p1, p2);
        measurePointsRef.current = [];
      }
    };

    renderer.domElement.addEventListener("click", onClick);
    return () => renderer.domElement.removeEventListener("click", onClick);
  }, [onMeasureResult]);

  // Rebuild meshes when data / viewMode changes
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

    if (meshes.length === 0) return;

    const group = new THREE.Group();
    meshGroupRef.current = group;

    const palette = [
      0x5588dd, 0x44aaaa, 0xddaa44, 0xaa55dd, 0xdd5555,
      0x55cc88, 0x8888cc, 0xcc8844, 0x55cc55, 0xcc55cc,
    ];
    let ci = 0;
    const bbox = new THREE.Box3();

    for (const md of meshes) {
      if (md.positions.length === 0) continue;

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(md.positions, 3));
      if (md.normals.length > 0) {
        geo.setAttribute("normal", new THREE.Float32BufferAttribute(md.normals, 3));
      } else {
        geo.computeVertexNormals();
      }
      if (md.indices.length > 0) geo.setIndex(md.indices);

      const col = md.color
        ? new THREE.Color(md.color[0], md.color[1], md.color[2])
        : new THREE.Color(palette[ci % palette.length]);
      ci++;

      let mat: THREE.Material;

      if (viewMode === "wireframe") {
        mat = new THREE.MeshBasicMaterial({ color: col, wireframe: true });
      } else if (viewMode === "flat") {
        mat = new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide, flatShading: true });
      } else if (viewMode === "edges") {
        mat = new THREE.MeshBasicMaterial({ color: 0x111122, side: THREE.DoubleSide });
        const edgeGeo = new THREE.EdgesGeometry(geo, 10);
        const edgeMat = new THREE.LineBasicMaterial({ color: col });
        group.add(new THREE.LineSegments(edgeGeo, edgeMat));
      } else {
        // shaded (default)
        mat = new THREE.MeshPhongMaterial({
          color: col,
          specular: new THREE.Color(0x222222),
          shininess: 50,
          side: THREE.DoubleSide,
        });
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = md.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Edges overlay for shaded mode
      if (viewMode === "shaded") {
        const edgeGeo = new THREE.EdgesGeometry(geo, 15);
        const edgeMat = new THREE.LineBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.18,
        });
        group.add(new THREE.LineSegments(edgeGeo, edgeMat));
      }

      geo.computeBoundingBox();
      if (geo.boundingBox) bbox.union(geo.boundingBox);
    }

    scene.add(group);

    const center = new THREE.Vector3();
    bbox.getCenter(center);
    group.position.sub(center);

    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    modelSizeRef.current = maxDim || 10;

    // Scale grid to model
    if (gridRef.current) {
      const gs = maxDim * 4;
      gridRef.current.scale.setScalar(gs / 200);
    }
    if (axesRef.current) {
      axesRef.current.scale.setScalar(maxDim * 0.3);
    }

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

  // Sync grid / axes / background
  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = showGrid;
  }, [showGrid]);

  useEffect(() => {
    if (axesRef.current) axesRef.current.visible = showAxes;
  }, [showAxes]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(BG_COLORS[bgColor]);
    }
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
