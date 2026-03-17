export interface MeshData {
  positions: number[];
  normals: number[];
  indices: number[];
  color: [number, number, number] | null;
  name: string;
}

let occtInstance: unknown = null;

async function ensureOcctScript(): Promise<void> {
  if ((window as any).occtimportjs) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-occt]');
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
  if (!initFn) {
    throw new Error("OpenCascade (occtimportjs) is not available on window after script load");
  }
  if (typeof initFn !== "function") {
    throw new Error(`OpenCascade loaded but is not callable (type: ${typeof initFn})`);
  }

  const base = import.meta.env.BASE_URL;
  occtInstance = await initFn({
    locateFile: (path: string) => {
      console.log("[occt] locateFile:", path, "→", base + path);
      if (path.endsWith(".wasm")) return `${base}occt-import-js.wasm`;
      return `${base}${path}`;
    },
  });

  return occtInstance;
}

export async function loadStepFile(
  fileBuffer: ArrayBuffer,
  onProgress: (msg: string) => void
): Promise<MeshData[]> {
  onProgress("Loading OpenCascade engine...");
  console.log("[stepLoader] starting load");

  const occt = (await getOcct()) as any;
  console.log("[stepLoader] occt ready");

  onProgress("Parsing STEP file...");

  const fileData = new Uint8Array(fileBuffer);
  const result = occt.ReadStepFile(fileData, null);
  console.log("[stepLoader] parse result:", result?.success, "meshes:", result?.meshes?.length);

  if (!result || !result.success) {
    throw new Error(
      "Failed to parse STEP file. The file may be corrupt or in an unsupported format."
    );
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
    if (mesh.color) {
      color = [mesh.color[0], mesh.color[1], mesh.color[2]];
    }

    meshes.push({
      positions,
      normals,
      indices,
      color,
      name: mesh.name || `Part ${i + 1}`,
    });

    if (i % 10 === 0 && i > 0) {
      onProgress(`Processed ${i + 1} of ${total} parts...`);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  console.log("[stepLoader] done, total meshes:", meshes.length);
  return meshes;
}
