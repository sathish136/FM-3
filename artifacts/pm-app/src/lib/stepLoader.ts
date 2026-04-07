export interface BrepFace {
  first: number;
  last: number;
  color: [number, number, number] | null;
}

export interface MeshData {
  positions: number[];
  normals: number[];
  indices: number[];
  color: [number, number, number] | null;
  brepFaces: BrepFace[];
  name: string;
}

export interface TreeNode {
  id: string;
  name: string;
  meshIndices: number[];
  children: TreeNode[];
}

export interface LoadResult {
  meshes: MeshData[];
  root: TreeNode;
}

let occtInstance: unknown = null;

async function ensureOcctScript(): Promise<void> {
  if ((window as any).occtimportjs) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector("script[data-occt]");
    if (existing) { resolve(); return; }

    const script = document.createElement("script");
    script.src = `${import.meta.env.BASE_URL}occt-import-js.js`;
    script.setAttribute("data-occt", "1");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load OpenCascade script from public folder"));
    document.head.appendChild(script);
  });
}

async function getOcct(): Promise<unknown> {
  if (occtInstance) return occtInstance;

  await ensureOcctScript();

  const initFn = (window as any).occtimportjs;
  if (!initFn || typeof initFn !== "function") {
    throw new Error("OpenCascade failed to initialize");
  }

  const base = import.meta.env.BASE_URL;
  occtInstance = await initFn({
    locateFile: (path: string) => {
      if (path.endsWith(".wasm")) return `${base}occt-import-js.wasm`;
      return `${base}${path}`;
    },
  });

  return occtInstance;
}

function buildTree(node: any, parentId: string, counter: { n: number }): TreeNode {
  const id = `${parentId}-${counter.n++}`;
  return {
    id,
    name: node.name || "Unnamed",
    meshIndices: Array.isArray(node.meshes) ? node.meshes : [],
    children: Array.isArray(node.children)
      ? node.children.map((c: any) => buildTree(c, id, counter))
      : [],
  };
}

export async function loadStepFile(
  fileBuffer: ArrayBuffer,
  onProgress: (msg: string) => void
): Promise<LoadResult> {
  onProgress("Loading OpenCascade engine...");

  const occt = (await getOcct()) as any;

  onProgress("Parsing STEP file...");

  const fileData = new Uint8Array(fileBuffer);
  const result = occt.ReadStepFile(fileData, null);

  if (!result || !result.success) {
    throw new Error("Failed to parse STEP file. The file may be corrupt or in an unsupported format.");
  }

  const total: number = result.meshes.length;
  onProgress(`Extracting ${total} part(s)...`);

  const meshes: MeshData[] = [];

  for (let i = 0; i < total; i++) {
    const mesh = result.meshes[i];

    const positions: number[] = Array.from(mesh.attributes.position.array as Float32Array);
    const normals: number[] = mesh.attributes.normal
      ? Array.from(mesh.attributes.normal.array as Float32Array)
      : [];
    const indices: number[] = Array.from(mesh.index.array as Uint32Array | Uint16Array);

    let color: [number, number, number] | null = null;
    if (mesh.color) color = [mesh.color[0], mesh.color[1], mesh.color[2]];

    const brepFaces: BrepFace[] = [];
    if (Array.isArray(mesh.brep_faces)) {
      for (const face of mesh.brep_faces) {
        brepFaces.push({
          first: face.first,
          last: face.last,
          color: face.color ? [face.color[0], face.color[1], face.color[2]] : null,
        });
      }
    }

    meshes.push({
      positions,
      normals,
      indices,
      color,
      brepFaces,
      name: mesh.name || `Part ${i + 1}`,
    });

    if (i % 10 === 0 && i > 0) {
      onProgress(`Processed ${i + 1} of ${total} parts...`);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  let root: TreeNode;
  if (result.root) {
    root = buildTree(result.root, "root", { n: 0 });
    if (!root.name || root.name === "" || root.name === "Unnamed") {
      root.name = "Assembly";
    }
  } else {
    root = {
      id: "root",
      name: "Assembly",
      meshIndices: meshes.map((_, i) => i),
      children: [],
    };
  }

  return { meshes, root };
}
