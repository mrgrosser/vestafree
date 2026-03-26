function compactTemp(value) {
  if (value === undefined || value === null || value === "") return "--F";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value).toUpperCase();
  const rounded = Math.round(numeric);
  return `${rounded >= 0 ? "+" : ""}${rounded}F`;
}

export function createWeatherProvider(options = {}) {
  const pollIntervalMs = Number(options.pollIntervalMs ?? process.env.WEATHER_POLL_INTERVAL_MS ?? 60_000);

  return {
    id: "weather",
    pollIntervalMs,
    async fetch() {
      const city = options.city ?? process.env.WEATHER_CITY;
      const conditions = options.conditions ?? process.env.WEATHER_CONDITIONS;
      const tempF = options.tempF ?? process.env.WEATHER_TEMP_F;

      if (!city) {
        throw new Error("WEATHER_CITY is required for weather provider");
      }

      return {
        city,
        conditions: conditions || "UNKNOWN",
        tempF
      };
    },
    format(payload) {
      const city = String(payload?.city ?? "CITY").toUpperCase();
      const conditions = String(payload?.conditions ?? "UNK").toUpperCase();
      const temperature = compactTemp(payload?.tempF);
      return `WX ${city} ${conditions} ${temperature}`;
    }
  };
}
