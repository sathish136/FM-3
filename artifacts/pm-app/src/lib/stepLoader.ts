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

// Singleton worker — created once, kept alive so OCCT stays initialised between files.
let worker: Worker | null = null;
let nextId = 1;

function getWorker(): Worker {
  if (!worker) {
    const base = import.meta.env.BASE_URL;
    worker = new Worker(`${base}step-parser-worker.js`);
  }
  return worker;
}

export async function loadStepFile(
  fileBuffer: ArrayBuffer,
  onProgress: (msg: string) => void
): Promise<LoadResult> {
  return new Promise<LoadResult>((resolve, reject) => {
    const id = nextId++;
    const w = getWorker();

    const handler = (ev: MessageEvent) => {
      const msg = ev.data;
      if (msg.id !== id) return;

      if (msg.type === "progress") {
        onProgress(msg.msg);
        return;
      }

      // Terminal message — remove listener
      w.removeEventListener("message", handler);
      w.removeEventListener("error", errHandler);

      if (msg.type === "done") {
        resolve({ meshes: msg.meshes as MeshData[], root: msg.root as TreeNode });
      } else {
        reject(new Error(msg.error || "Worker parse failed"));
      }
    };

    const errHandler = (ev: ErrorEvent) => {
      w.removeEventListener("message", handler);
      w.removeEventListener("error", errHandler);
      reject(new Error(ev.message || "Worker error"));
    };

    w.addEventListener("message", handler);
    w.addEventListener("error", errHandler);

    // Transfer the buffer to the worker (zero-copy)
    w.postMessage({ id, buffer: fileBuffer }, [fileBuffer]);
  });
}
