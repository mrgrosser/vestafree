function normalizeField(value, fallback) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.toUpperCase() : fallback;
}

export function createFlightProvider(options = {}) {
  const pollIntervalMs = Number(options.pollIntervalMs ?? process.env.FLIGHT_POLL_INTERVAL_MS ?? 45_000);

  return {
    id: "flight",
    pollIntervalMs,
    async fetch() {
      const number = options.flightNumber ?? process.env.FLIGHT_NUMBER;
      const status = options.status ?? process.env.FLIGHT_STATUS;
      const gate = options.gate ?? process.env.FLIGHT_GATE;

      if (!number) {
        throw new Error("FLIGHT_NUMBER is required for flight provider");
      }

      return {
        number,
        status: status || "UNKNOWN",
        gate: gate || "TBD"
      };
    },
    format(payload) {
      const number = normalizeField(payload?.number, "NOFLIGHT");
      const status = normalizeField(payload?.status, "UNKNOWN");
      const gate = normalizeField(payload?.gate, "TBD");
      return `FLT ${number} ${status} G${gate}`;
    }
  };
}
