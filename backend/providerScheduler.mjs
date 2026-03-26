import { makeBoardState } from "../shared/board.mjs";

export class ProviderScheduler {
  constructor({ providers, activeProviderId, onError = console.error, onStateChange = null }) {
    this.providers = providers;
    this.providerById = new Map(providers.map((provider) => [provider.id, provider]));
    this.activeProviderId = activeProviderId;
    this.onError = onError;
    this.onStateChange = onStateChange;
    this.lastGoodByProvider = new Map();
    this.intervals = [];
    this.state = makeBoardState("");
    this.meta = {
      activeProviderId: this.activeProviderId,
      lastUpdatedAt: null,
      lastError: null
    };
  }

  notifyStateChange() {
    if (typeof this.onStateChange === "function") {
      this.onStateChange(this.getState());
    }
  }

  ensureActiveProvider() {
    if (!this.providers.length) {
      this.activeProviderId = null;
      this.meta.activeProviderId = null;
      return;
    }

    if (this.providerById.has(this.activeProviderId)) return;
    const [firstProvider] = this.providers;
    this.activeProviderId = firstProvider.id;
    this.meta.activeProviderId = firstProvider.id;
  }

  hydrate({ state, meta, lastGoodByProvider }) {
    if (state) this.state = state;
    if (meta) this.meta = { ...this.meta, ...meta };
    if (lastGoodByProvider && typeof lastGoodByProvider === "object") {
      this.lastGoodByProvider = new Map(Object.entries(lastGoodByProvider));
    }
    this.ensureActiveProvider();
  }

  getState() {
    return {
      ...this.state,
      provider: {
        ...this.meta
      }
    };
  }

  async refreshProvider(provider) {
    try {
      const payload = await provider.fetch();
      const message = provider.format(payload, {
        rows: this.state.rows,
        cols: this.state.cols
      });

      const boardState = makeBoardState(message);
      this.lastGoodByProvider.set(provider.id, boardState);

      if (provider.id === this.activeProviderId) {
        this.state = boardState;
        this.meta.lastUpdatedAt = new Date().toISOString();
        this.meta.lastError = null;
        this.notifyStateChange();
      }
    } catch (error) {
      const details = {
        providerId: provider.id,
        error: error instanceof Error ? error.message : String(error),
        at: new Date().toISOString()
      };

      this.onError(`[provider:${provider.id}] ${details.error}`);

      if (provider.id === this.activeProviderId) {
        const fallback = this.lastGoodByProvider.get(provider.id);
        if (fallback) {
          this.state = fallback;
        }
        this.meta.lastError = details;
        this.notifyStateChange();
      }
    }
  }

  async refreshActiveProvider() {
    this.ensureActiveProvider();
    if (!this.activeProviderId) return;
    const provider = this.providerById.get(this.activeProviderId);
    await this.refreshProvider(provider);
  }

  async start() {
    this.ensureActiveProvider();

    if (!this.providers.length) {
      this.notifyStateChange();
      return;
    }

    await Promise.all(this.providers.map((provider) => this.refreshProvider(provider)));

    for (const provider of this.providers) {
      const intervalMs = Math.max(500, Number(provider.pollIntervalMs) || 5_000);
      const handle = setInterval(() => {
        this.refreshProvider(provider);
      }, intervalMs);
      this.intervals.push(handle);
    }
  }

  stop() {
    for (const handle of this.intervals) {
      clearInterval(handle);
    }
    this.intervals = [];
  }

  setActiveProvider(providerId) {
    const id = String(providerId || "").trim().toLowerCase();
    if (!this.providerById.has(id)) {
      throw new Error(`Unknown provider '${providerId}'`);
    }

    this.activeProviderId = id;
    this.meta.activeProviderId = id;

    const fallback = this.lastGoodByProvider.get(id);
    if (fallback) {
      this.state = fallback;
      this.meta.lastUpdatedAt = new Date().toISOString();
      this.meta.lastError = null;
    }
    this.notifyStateChange();
  }
}
