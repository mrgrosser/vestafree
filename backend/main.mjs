import http from "node:http";
import { makeBoardState, BOARD_ROWS, BOARD_COLS } from "../shared/board.mjs";

const PORT = process.env.PORT || 3000;

let state = makeBoardState("HELLO VESTAFREE");

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === "OPTIONS") {
    return json(res, 204, {});
  }

  if (method === "GET" && url === "/health") {
    return json(res, 200, {
      ok: true,
      rows: BOARD_ROWS,
      cols: BOARD_COLS,
      time: new Date().toISOString()
    });
  }

  if (method === "GET" && url === "/api/state") {
    return json(res, 200, state);
  }

  if (method === "POST" && url === "/api/message") {
    try {
      const payload = await readJson(req);
      const message = payload?.message ?? "";
      state = makeBoardState(message);
      return json(res, 200, state);
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  return json(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
