import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const PORT = process.env.FRONTEND_PORT || 5173;
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const REFRESH_INTERVAL_MS = Number(process.env.FRONTEND_REFRESH_INTERVAL_MS || 10_000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

async function serveFile(res, filePath) {
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain; charset=utf-8" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

http
  .createServer(async (req, res) => {
    if (req.url === "/config.js") {
      res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      res.end(
        `window.__VESTAFREE_CONFIG__ = ${JSON.stringify({
          apiBaseUrl: API_BASE_URL,
          refreshIntervalMs: REFRESH_INTERVAL_MS
        })};`
      );
      return;
    }

    const requested = req.url === "/" ? "/frontend/index.html" : req.url;
    const safePath = path.normalize(requested).replace(/^([.]{2}[\\/])+/, "");
    const filePath = path.join(root, safePath);

    if (!filePath.startsWith(root)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    await serveFile(res, filePath);
  })
  .listen(PORT, () => {
    console.log(`Frontend listening on http://localhost:${PORT}`);
  });
