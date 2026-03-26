export function createManualProvider(options = {}) {
  const pollIntervalMs = Number(options.pollIntervalMs ?? process.env.MANUAL_POLL_INTERVAL_MS ?? 2_000);
  let latestMessage = String(options.initialMessage ?? process.env.MANUAL_MESSAGE ?? "HELLO VESTAFREE");

  return {
    id: "manual",
    pollIntervalMs,
    setMessage(message = "") {
      latestMessage = String(message);
    },
    async fetch() {
      return {
        message: latestMessage,
        source: "api"
      };
    },
    format(payload) {
      return payload?.message ? String(payload.message) : "";
    }
  };
}
