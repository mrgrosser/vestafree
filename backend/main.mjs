import http from "node:http";
import { BOARD_ROWS, BOARD_COLS } from "../shared/board.mjs";
import { createProvidersFromEnv } from "./providers/index.mjs";
import { ProviderScheduler } from "./providerScheduler.mjs";

const PORT = Number(process.env.PORT || 3000);

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

const { providers, defaultProviderId } = createProvidersFromEnv();
const scheduler = new ProviderScheduler({
  providers,
  activeProviderId: defaultProviderId,
  onError: (message) => console.error(message)
});

const manualProvider = providers.find((provider) => provider.id === "manual");

await scheduler.start();

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
      time: new Date().toISOString(),
      providers: providers.map((provider) => ({
        id: provider.id,
        pollIntervalMs: provider.pollIntervalMs
      })),
      activeProviderId: scheduler.activeProviderId
    });
  }

  if (method === "GET" && url === "/api/state") {
    return json(res, 200, scheduler.getState());
  }

  if (method === "POST" && url === "/api/message") {
    if (!manualProvider) {
      return json(res, 400, { error: "Manual provider is not enabled" });
    }

    try {
      const payload = await readJson(req);
      const message = payload?.message ?? "";
      manualProvider.setMessage(message);

      if (scheduler.activeProviderId === "manual") {
        await scheduler.refreshActiveProvider();
      }

      return json(res, 200, scheduler.getState());
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (method === "POST" && url === "/api/provider") {
    try {
      const payload = await readJson(req);
      scheduler.setActiveProvider(payload?.providerId);
      await scheduler.refreshActiveProvider();
      return json(res, 200, scheduler.getState());
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  return json(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

process.on("SIGINT", () => {
  scheduler.stop();
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  scheduler.stop();
  server.close(() => process.exit(0));
});
