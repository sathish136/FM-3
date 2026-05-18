/** Resolve API base URLs (dev proxy, /pm-app/api, direct :3000). */
function apiBaseCandidates(): string[] {
  const appBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  const out: string[] = [];
  const envOrigin = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/$/, "");
  if (envOrigin) out.push(envOrigin);
  out.push(`${appBase}/api`, "/api");
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    if (port && port !== "3000") {
      out.push(`${protocol}//${hostname}:3000/api`);
    }
  }
  return [...new Set(out)];
}

function normalizeApiPath(path: string): string {
  let p = path.startsWith("/") ? path : `/${path}`;
  if (p.startsWith("/api/")) p = p.slice(4);
  else if (p === "/api") p = "";
  return p.startsWith("/") ? p : `/${p}`;
}

/** Fetch API with fallbacks; avoids parsing HTML as JSON. */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const rel = normalizeApiPath(path);
  let lastError: string | null = null;

  for (const base of apiBaseCandidates()) {
    const url = `${base}${rel}`;
    try {
      const res = await fetch(url, { ...init, credentials: init?.credentials ?? "include" });
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("text/html") && !res.ok) {
        lastError = `${res.status} HTML from ${url} — restart api-server if route is new`;
        continue;
      }
      return res;
    } catch (e) {
      lastError = `${url}: ${e}`;
    }
  }

  throw new Error(
    lastError || "API unreachable. Start api-server (port 3000) and refresh.",
  );
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("<!") || trimmed.startsWith("<html")) {
    throw new Error(
      "API returned a web page instead of JSON. Restart the API server (pnpm run dev in artifacts/api-server) so new /hrms/celebrations routes load.",
    );
  }
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON from API: ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    const err = (data as { error?: string })?.error;
    throw new Error(err || res.statusText);
  }
  return data;
}
