import { BOARD_ROWS, BOARD_COLS, linesToTiles } from "/shared/board.mjs";

const apiBase = window.localStorage.getItem("apiBase") || "http://localhost:3000";
const board = document.querySelector("#board");
const form = document.querySelector("#message-form");
const messageInput = document.querySelector("#message");
const statusEl = document.querySelector("#status");

function renderTiles(tiles) {
  board.innerHTML = "";
  tiles.forEach((ch) => {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.textContent = ch === " " ? "·" : ch;
    board.appendChild(tile);
  });
}

function renderState(state) {
  const lines = Array.isArray(state?.lines) ? state.lines : [];
  const tiles = linesToTiles(lines).slice(0, BOARD_ROWS * BOARD_COLS);
  renderTiles(tiles);
}

async function fetchState() {
  statusEl.textContent = "Loading board...";
  const response = await fetch(`${apiBase}/api/state`);
  const state = await response.json();
  renderState(state);
  messageInput.value = state.message || "";
  statusEl.textContent = "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "Sending...";

  const response = await fetch(`${apiBase}/api/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: messageInput.value })
  });

  if (!response.ok) {
    statusEl.textContent = "Request failed";
    return;
  }

  const state = await response.json();
  renderState(state);
  statusEl.textContent = "Updated.";
});

fetchState().catch((error) => {
  statusEl.textContent = `Unable to load backend: ${error.message}`;
});
