const { getDefaultConfig } = require("expo/metro-config");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { getLanIPv4Addresses } = require("./scripts/lan-host.cjs");

// Load .env manually so API_TARGET is available in metro config
try {
  const envFile = path.join(__dirname, ".env");
  const lines = fs.readFileSync(envFile, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch {}

const config = getDefaultConfig(__dirname);

// Exclude pnpm temp build directories that Metro incorrectly tries to watch
const blockList = [/.*\/node_modules\/.*_tmp_.*\/.*/, /.*_tmp_\d+.*/];

config.resolver = {
  ...config.resolver,
  blockList: [
    ...(Array.isArray(config.resolver?.blockList)
      ? config.resolver.blockList
      : []),
    ...blockList,
  ],
};

// Proxy /api/* to the API server (same PC → localhost:3000 in .env).
// Browsers on your LAN IP still use /api on port 8099; Metro forwards to API_TARGET.
const DEV_PORT =
  process.env.RCT_METRO_PORT || process.env.EXPO_DEV_SERVER_PORT || "8099";
const API_TARGET = process.env.API_TARGET || "http://localhost:3000";
const lanIps = getLanIPv4Addresses();

console.log(`[metro] API proxy → ${API_TARGET}`);
console.log(`[metro] Web app (this machine): http://localhost:${DEV_PORT}`);
if (lanIps.length) {
  for (const ip of lanIps) {
    console.log(`[metro] Web app (LAN):          http://${ip}:${DEV_PORT}`);
  }
} else {
  console.log(
    "[metro] Web app (LAN): no external IPv4 found — use localhost or check network",
  );
}

let targetUrl;
try {
  targetUrl = new URL(API_TARGET);
} catch (e) {
  console.error("[metro] Invalid API_TARGET URL:", API_TARGET);
  process.exit(1);
}
const proxyAgent = targetUrl.protocol === "https:" ? https : http;

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url && (req.url === "/api" || req.url.startsWith("/api/"))) {
        const options = {
          hostname: targetUrl.hostname,
          port:
            Number(targetUrl.port) ||
            (targetUrl.protocol === "https:" ? 443 : 80),
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: targetUrl.host,
          },
        };

        // Collect the full request body first — req.pipe() is unreliable
        // inside Metro's middleware chain (body may not stream correctly).
        const bodyChunks = [];
        req.on("data", (chunk) => bodyChunks.push(chunk));
        req.on("end", () => {
          const bodyBuffer = Buffer.concat(bodyChunks);
          if (bodyBuffer.length) {
            options.headers["content-length"] = bodyBuffer.length;
          }

          const proxyReq = proxyAgent.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, {
              ...proxyRes.headers,
              "access-control-allow-origin": "*",
            });
            proxyRes.pipe(res, { end: true });
          });

          proxyReq.on("error", (err) => {
            const msg = err.code
              ? `${err.code}: ${err.message}`
              : err.message || String(err);
            console.error(
              `[metro proxy error] ${req.method} ${req.url} → ${API_TARGET} — ${msg}`,
            );
            if (!res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" });
            }
            res.end(
              JSON.stringify({
                error: `API proxy error (${msg}). Is the API server reachable at ${API_TARGET}?`,
              }),
            );
          });

          if (bodyBuffer.length) proxyReq.write(bodyBuffer);
          proxyReq.end();
        });
        req.on("error", (err) => {
          console.error(`[metro proxy req error] ${err.message}`);
        });
      } else {
        middleware(req, res, next);
      }
    };
  },
};

module.exports = config;
