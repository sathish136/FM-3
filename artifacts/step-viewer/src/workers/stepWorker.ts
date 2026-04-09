import initOpenCascade from "occt-import-js";

let occt: Awaited<ReturnType<typeof initOpenCascade>> | null = null;

async function getOcct() {
  if (!occt) {
    occt = await initOpenCascade({
      locateFile: (path: string) => {
        if (path.endsWith(".wasm")) {
          return new URL(
            "../../node_modules/occt-import-js/dist/occt-import-js.wasm",
            import.meta.url
          ).href;
        }
        return path;
      },
    });
  }
  return occt;
}

self.onmessage = async (e: MessageEvent) => {
  const { fileBuffer, fileName } = e.data as {
    fileBuffer: ArrayBuffer;
    fileName: string;
  };

  try {
    self.postMessage({ type: "progress", message: "Initializing OpenCascade..." });

    const oc = await getOcct();

    self.postMessage({ type: "progress", message: "Parsing STEP file..." });

    const fileData = new Uint8Array(fileBuffer);
    const result = oc.ReadStepFile(fileData, null);

    if (!result.success) {
      self.postMessage({ type: "error", message: "Failed to parse STEP file. The file may be corrupt or in an unsupported format." });
      return;
    }

    self.postMessage({ type: "progress", message: "Extracting geometry..." });

    const meshes: Array<{
      positions: number[];
      normals: number[];
      indices: number[];
      color: [number, number, number] | null;
      name: string;
    }> = [];

    for (let i = 0; i < result.meshes.length; i++) {
      const mesh = result.meshes[i];
      const positions: number[] = [];
      const normals: number[] = [];
      const indices: number[] = [];

      for (let j = 0; j < mesh.attributes.position.array.length; j++) {
        positions.push(mesh.attributes.position.array[j]);
      }

      if (mesh.attributes.normal) {
        for (let j = 0; j < mesh.attributes.normal.array.length; j++) {
          normals.push(mesh.attributes.normal.array[j]);
        }
      }

      for (let j = 0; j < mesh.index.array.length; j++) {
        indices.push(mesh.index.array[j]);
      }

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

      if (i % 5 === 0) {
        self.postMessage({
          type: "progress",
          message: `Processing mesh ${i + 1} of ${result.meshes.length}...`,
        });
      }
    }

    self.postMessage({
      type: "result",
      meshes,
      fileName,
    });
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : "Unknown error occurred",
    });
  }
};
