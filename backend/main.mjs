import crypto from "node:crypto";
import http from "node:http";
import { BOARD_ROWS, BOARD_COLS, makeBoardState } from "../shared/board.mjs";
import { createProvidersFromEnv } from "./providers/index.mjs";
import { ProviderScheduler } from "./providerScheduler.mjs";
import { StateStore } from "./stateStore.mjs";

const PORT = Number(process.env.PORT || 3000);
const WRITE_API_TOKEN = String(process.env.WRITE_API_TOKEN || "").trim();
const MESSAGE_COOLDOWN_MS = Math.max(0, Number(process.env.MESSAGE_COOLDOWN_MS || 1_000));

const store = new StateStore();
await store.load();

const metrics = {
  requestsTotal: 0,
  errorsTotal: Number(store.getSnapshot().metrics?.errorsTotal || 0)
};

function log(event, fields = {}) {
  console.log(
    JSON.stringify({
      level: "info",
      event,
      at: new Date().toISOString(),
      ...fields
    })
  );
}

async function onErrorHook(details) {
  metrics.errorsTotal += 1;
  await store.incrementErrors();
  log("error", details);
}

function json(res, status, body, requestId) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-API-Token,X-Request-ID",
    "X-Request-ID": requestId
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
  onError: (message) => onErrorHook({ scope: "provider", message }),
  onStateChange: (state) => {
    store.updateScheduler({
      state: {
        rows: state.rows,
        cols: state.cols,
        message: state.message,
        lines: state.lines,
        tiles: state.tiles
      },
      meta: state.provider,
      lastGoodByProvider: Object.fromEntries(scheduler.lastGoodByProvider.entries())
    }).catch((error) => onErrorHook({ scope: "persist", message: error.message }));
  }
});

const persisted = store.getSnapshot().scheduler;
if (persisted) {
  scheduler.hydrate(persisted);
}

const manualProvider = providers.find((provider) => provider.id === "manual");
if (manualProvider) {
  const latestMessage = store.getSnapshot().messageHistory?.[0]?.message;
  if (typeof latestMessage === "string") {
    manualProvider.setMessage(latestMessage);
  }
}

await scheduler.start();
if (!scheduler.getState().message) {
  scheduler.state = makeBoardState("");
}

let lastMessageWriteAt = 0;

const server = http.createServer(async (req, res) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  const { method, url } = req;
  metrics.requestsTotal += 1;

  log("request.start", { requestId, method, url });

  if (method === "OPTIONS") {
    return json(res, 204, {}, requestId);
  }

  if (method === "GET" && url === "/health") {
    return json(res, 200, {
      ok: true,
      time: new Date().toISOString(),
      requestId,
      metrics,
      rows: BOARD_ROWS,
      cols: BOARD_COLS
    }, requestId);
  }

  if (method === "GET" && url === "/ready") {
    const ready = providers.length === 0 || Boolean(scheduler.activeProviderId);
    return json(res, ready ? 200 : 503, {
      ok: ready,
      activeProviderId: scheduler.activeProviderId,
      providerCount: providers.length,
      requestId
    }, requestId);
  }

  if (method === "GET" && url === "/api/state") {
    return json(res, 200, scheduler.getState(), requestId);
  }

  if (method === "POST" && url === "/api/message") {
    if (!manualProvider) {
      return json(res, 400, { error: "Manual provider is not enabled" }, requestId);
    }

    if (!WRITE_API_TOKEN || req.headers["x-api-token"] !== WRITE_API_TOKEN) {
      return json(res, 401, { error: "Unauthorized" }, requestId);
    }

    const now = Date.now();
    if (now - lastMessageWriteAt < MESSAGE_COOLDOWN_MS) {
      return json(res, 429, { error: "Rate limit exceeded", retryAfterMs: MESSAGE_COOLDOWN_MS }, requestId);
    }

    try {
      const payload = await readJson(req);
      const message = payload?.message ?? "";
      manualProvider.setMessage(message);
      lastMessageWriteAt = now;

      await store.addMessageHistory({
        message: String(message),
        at: new Date().toISOString(),
        requestId
      });

      if (scheduler.activeProviderId === "manual") {
        await scheduler.refreshActiveProvider();
      }

      return json(res, 200, scheduler.getState(), requestId);
    } catch (error) {
      await onErrorHook({ scope: "api.message", message: error.message, requestId });
      return json(res, 400, { error: error.message }, requestId);
    }
  }

  if (method === "POST" && url === "/api/provider") {
    try {
      const payload = await readJson(req);
      scheduler.setActiveProvider(payload?.providerId);
      await scheduler.refreshActiveProvider();
      return json(res, 200, scheduler.getState(), requestId);
    } catch (error) {
      await onErrorHook({ scope: "api.provider", message: error.message, requestId });
      return json(res, 400, { error: error.message }, requestId);
    }
  }

  return json(res, 404, { error: "Not found" }, requestId);
});

server.listen(PORT, () => {
  log("server.started", { port: PORT });
});

function shutdown(signal) {
  log("server.stopping", { signal });
  scheduler.stop();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
