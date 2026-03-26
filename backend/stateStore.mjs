import fs from "node:fs/promises";
import path from "node:path";

const STATE_FILE = process.env.STATE_FILE || path.join(process.cwd(), "backend", "data", "state.json");
const MAX_HISTORY = Math.max(20, Number(process.env.MAX_MESSAGE_HISTORY || 200));

function safeParse(jsonText) {
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

export class StateStore {
  constructor(filePath = STATE_FILE) {
    this.filePath = filePath;
    this.state = {
      scheduler: null,
      messageHistory: [],
      metrics: {
        errorsTotal: 0
      }
    };
  }

  async load() {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = safeParse(raw);
      if (parsed && typeof parsed === "object") {
        this.state = {
          ...this.state,
          ...parsed,
          metrics: {
            ...this.state.metrics,
            ...(parsed.metrics || {})
          }
        };
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    return this.state;
  }

  getSnapshot() {
    return this.state;
  }

  async persist() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.state, null, 2));
  }

  async updateScheduler(snapshot) {
    this.state.scheduler = snapshot;
    await this.persist();
  }

  async addMessageHistory(entry) {
    this.state.messageHistory.unshift(entry);
    this.state.messageHistory = this.state.messageHistory.slice(0, MAX_HISTORY);
    await this.persist();
  }

  async incrementErrors() {
    this.state.metrics.errorsTotal += 1;
    await this.persist();
  }
}
