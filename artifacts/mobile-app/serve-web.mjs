import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = 8099;
const API_TARGET = process.env.API_TARGET || "http://localhost:3000";

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

const targetUrl = new URL(API_TARGET);
const proxyAgent = targetUrl.protocol === "https:" ? https : http;

function proxyApi(req, res) {
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: targetUrl.host,
    },
  };

  const proxyReq = proxyAgent.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      "access-control-allow-origin": "*",
    });
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    console.error("[proxy error]", err.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "API proxy error: " + err.message }));
  });

  req.pipe(proxyReq, { end: true });
}

const server = http.createServer((req, res) => {
  // Proxy all /api/* requests to the API server
  if (req.url.startsWith("/api/") || req.url === "/api") {
    return proxyApi(req, res);
  }

  let urlPath = req.url.split("?")[0];
  let filePath = path.join(DIST, urlPath);

  const tryFile = (fp) => {
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return fp;
    return null;
  };

  let resolved =
    tryFile(filePath) ||
    tryFile(filePath + ".html") ||
    tryFile(path.join(filePath, "index.html")) ||
    tryFile(path.join(DIST, "index.html"));

  if (!resolved) {
    res.writeHead(404);
    return res.end("Not found");
  }

  const ext = path.extname(resolved);
  const mime = MIME[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": mime,
    "Cache-Control": "no-cache",
  });
  fs.createReadStream(resolved).pipe(res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`FlowMatriX web running on http://0.0.0.0:${PORT}`);
  console.log(`API proxied → ${API_TARGET}`);
});
