import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = 5000;

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

const server = http.createServer((req, res) => {
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
  console.log(`FlowMatriX CRM web preview running on http://0.0.0.0:${PORT}`);
});
