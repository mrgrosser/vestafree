import { createManualProvider } from "./manualProvider.mjs";
import { createWeatherProvider } from "./weatherProvider.mjs";
import { createFlightProvider } from "./flightProvider.mjs";

const FACTORIES = {
  manual: createManualProvider,
  weather: createWeatherProvider,
  flight: createFlightProvider
};

function parseProviderList(raw) {
  return String(raw || "manual")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function createProvidersFromEnv() {
  const enabledProviderIds = parseProviderList(process.env.ENABLED_PROVIDERS);
  const providers = enabledProviderIds.map((id) => {
    const factory = FACTORIES[id];
    if (!factory) {
      throw new Error(`Unknown provider '${id}'. Supported providers: ${Object.keys(FACTORIES).join(", ")}`);
    }
    return factory();
  });

  const defaultProviderId = (process.env.DEFAULT_PROVIDER || providers[0]?.id || "manual").toLowerCase();
  return {
    providers,
    defaultProviderId
  };
}
