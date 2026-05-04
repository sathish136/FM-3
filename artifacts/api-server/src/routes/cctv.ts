import { Router } from "express";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as https from "https";

const router = Router();
const CONFIG_PATH = path.join(process.cwd(), "cctv-config.json");

interface CctvConfig {
  ip: string;
  port: number;
  username: string;
  password: string;
  channelCount: number;
  channelNames: string[];
  protocol: "http" | "https";
}

const DEFAULT_CONFIG: CctvConfig = {
  ip: "",
  port: 80,
  username: "admin",
  password: "",
  channelCount: 4,
  channelNames: [],
  protocol: "http",
};

function loadConfig(): CctvConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // fall through
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(cfg: CctvConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
}

router.get("/config", (_req, res) => {
  const cfg = loadConfig();
  const safe = { ...cfg, password: cfg.password ? "***" : "" };
  res.json({ ok: true, config: safe, hasPassword: !!cfg.password });
});

router.post("/config", (req, res) => {
  const existing = loadConfig();
  const body = req.body as Partial<CctvConfig>;
  const updated: CctvConfig = {
    ip:           body.ip           !== undefined ? String(body.ip)           : existing.ip,
    port:         body.port         !== undefined ? Number(body.port)         : existing.port,
    username:     body.username     !== undefined ? String(body.username)     : existing.username,
    password:     (body.password !== undefined && body.password !== "***")
                    ? String(body.password)
                    : existing.password,
    channelCount: body.channelCount !== undefined ? Number(body.channelCount) : existing.channelCount,
    channelNames: Array.isArray(body.channelNames) ? body.channelNames : existing.channelNames,
    protocol:     body.protocol === "https" ? "https" : "http",
  };
  saveConfig(updated);
  res.json({ ok: true });
});

router.get("/snapshot", (req, res) => {
  const cfg = loadConfig();
  if (!cfg.ip) {
    res.status(400).json({ error: "NVR not configured" });
    return;
  }

  const channel = parseInt(String(req.query["channel"] ?? "1"), 10) || 1;
  const credentials = Buffer.from(`${cfg.username}:${cfg.password}`).toString("base64");
  const url = `${cfg.protocol}://${cfg.ip}:${cfg.port}/cgi-bin/snapshot.cgi?channel=${channel}`;

  const lib = cfg.protocol === "https" ? https : http;

  const options = {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
    rejectUnauthorized: false,
  };

  const proxyReq = lib.get(url, options, (proxyRes) => {
    const ct = proxyRes.headers["content-type"] || "image/jpeg";
    res.set("Content-Type", ct);
    res.set("Cache-Control", "no-cache, no-store");
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error("[CCTV] Snapshot error:", err.message);
    res.status(502).json({ error: "Cannot reach NVR", detail: err.message });
  });

  proxyReq.setTimeout(8000, () => {
    proxyReq.destroy();
    if (!res.headersSent) res.status(504).json({ error: "NVR snapshot timed out" });
  });
});

router.get("/test", (_req, res) => {
  const cfg = loadConfig();
  if (!cfg.ip) {
    res.json({ ok: false, error: "NVR not configured" });
    return;
  }

  const credentials = Buffer.from(`${cfg.username}:${cfg.password}`).toString("base64");
  const url = `${cfg.protocol}://${cfg.ip}:${cfg.port}/cgi-bin/snapshot.cgi?channel=1`;
  const lib = cfg.protocol === "https" ? https : http;

  const proxyReq = lib.get(url, { headers: { Authorization: `Basic ${credentials}` }, rejectUnauthorized: false }, (proxyRes) => {
    res.json({ ok: proxyRes.statusCode === 200, statusCode: proxyRes.statusCode });
    proxyRes.resume();
  });

  proxyReq.on("error", (err) => {
    res.json({ ok: false, error: err.message });
  });

  proxyReq.setTimeout(6000, () => {
    proxyReq.destroy();
    res.json({ ok: false, error: "Connection timed out" });
  });
});

export default router;
