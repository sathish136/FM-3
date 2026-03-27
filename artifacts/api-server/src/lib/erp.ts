import https from "https";

const ERP_BASE = "https://erp.wttint.com";
const ERP_API_KEY = process.env.ERPNEXT_API_KEY || "";
const ERP_API_SECRET = process.env.ERPNEXT_API_SECRET || "";

export function erpFetch(path: string, params: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const query = Object.keys(params).length
      ? "?" + new URLSearchParams(params).toString()
      : "";
    const fullPath = `/api/method/${path}${query}`;
    const options = {
      hostname: new URL(ERP_BASE).hostname,
      path: fullPath,
      method: "GET",
      headers: {
        Authorization: `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      rejectUnauthorized: false,
      timeout: 30000,
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } catch { resolve({}); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("ERP timeout")); });
    req.end();
  });
}

export function projectParams(project?: string): Record<string, string> {
  return project && project.trim() ? { project } : {};
}
