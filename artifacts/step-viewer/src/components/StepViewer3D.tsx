import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface MeshData {
  positions: number[];
  normals: number[];
  indices: number[];
  color: [number, number, number] | null;
  name: string;
}

interface StepViewer3DProps {
  meshes: MeshData[];
  wireframe: boolean;
  showEdges: boolean;
}

export default function StepViewer3D({ meshes, wireframe, showEdges }: StepViewer3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameRef = useRef<number | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 10000);
    camera.position.set(5, 5, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight1.position.set(10, 20, 10);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8899ff, 0.4);
    dirLight2.position.set(-10, -5, -10);
    scene.add(dirLight2);

    const hemiLight = new THREE.HemisphereLight(0x8899ff, 0x442244, 0.3);
    scene.add(hemiLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 0.1;
    controls.maxDistance = 5000;
    controlsRef.current = controls;

    const gridHelper = new THREE.GridHelper(20, 20, 0x334455, 0x223344);
    (gridHelper.material as THREE.Material).opacity = 0.3;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    if (meshGroupRef.current) {
      sceneRef.current.remove(meshGroupRef.current);
      meshGroupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }

    if (meshes.length === 0) return;

    const group = new THREE.Group();
    meshGroupRef.current = group;

    const defaultColors = [
      0x4488cc, 0x44aa88, 0xaa8844, 0x8844aa, 0xcc4444,
      0x44cc88, 0x8888cc, 0xcc8844, 0x44cc44, 0xcc44cc,
    ];

    let colorIdx = 0;
    const boundingBox = new THREE.Box3();

    for (const meshData of meshes) {
      if (meshData.positions.length === 0) continue;

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(meshData.positions, 3)
      );

      if (meshData.normals.length > 0) {
        geometry.setAttribute(
          "normal",
          new THREE.Float32BufferAttribute(meshData.normals, 3)
        );
      } else {
        geometry.computeVertexNormals();
      }

      if (meshData.indices.length > 0) {
        geometry.setIndex(meshData.indices);
      }

      const meshColor = meshData.color
        ? new THREE.Color(meshData.color[0], meshData.color[1], meshData.color[2])
        : new THREE.Color(defaultColors[colorIdx % defaultColors.length]);
      colorIdx++;

      const material = new THREE.MeshPhongMaterial({
        color: meshColor,
        specular: new THREE.Color(0x333333),
        shininess: 60,
        side: THREE.DoubleSide,
        wireframe: wireframe,
        transparent: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = meshData.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      if (showEdges && !wireframe) {
        const edges = new THREE.EdgesGeometry(geometry, 15);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.3,
        });
        const wireframeMesh = new THREE.LineSegments(edges, lineMat);
        group.add(wireframeMesh);
      }

      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        boundingBox.union(geometry.boundingBox);
      }
    }

    sceneRef.current.add(group);

    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    group.position.sub(center);

    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    if (cameraRef.current && controlsRef.current) {
      const fitDistance = maxDim * 1.8;
      cameraRef.current.position.set(fitDistance, fitDistance * 0.7, fitDistance);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.minDistance = maxDim * 0.01;
      controlsRef.current.maxDistance = maxDim * 100;
      controlsRef.current.update();
    }
  }, [meshes, wireframe, showEdges]);

  return <div ref={mountRef} className="w-full h-full" />;
}
