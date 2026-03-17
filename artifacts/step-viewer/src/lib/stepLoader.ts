export interface MeshData {
  positions: number[];
  normals: number[];
  indices: number[];
  color: [number, number, number] | null;
  name: string;
}

export async function loadStepFile(
  fileBuffer: ArrayBuffer,
  onProgress: (msg: string) => void
): Promise<MeshData[]> {
  onProgress("Initializing OpenCascade engine...");

  const initOpenCascade = (await import("occt-import-js")).default;

  const occt = await initOpenCascade({
    locateFile: (path: string) => {
      if (path.endsWith(".wasm")) {
        return `${import.meta.env.BASE_URL}occt-import-js.wasm`;
      }
      return `${import.meta.env.BASE_URL}${path}`;
    },
  });

  onProgress("Parsing STEP file...");

  const fileData = new Uint8Array(fileBuffer);
  const result = occt.ReadStepFile(fileData, null);

  if (!result.success) {
    throw new Error(
      "Failed to parse STEP file. The file may be corrupt or in an unsupported format."
    );
  }

  onProgress(`Extracting ${result.meshes.length} mesh(es)...`);

  const meshes: MeshData[] = [];

  for (let i = 0; i < result.meshes.length; i++) {
    const mesh = result.meshes[i];

    const positions: number[] = Array.from(mesh.attributes.position.array);
    const normals: number[] = mesh.attributes.normal
      ? Array.from(mesh.attributes.normal.array)
      : [];
    const indices: number[] = Array.from(mesh.index.array);

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

    if (i % 10 === 0) {
      onProgress(`Processed ${i + 1} of ${result.meshes.length} parts...`);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return meshes;
}
