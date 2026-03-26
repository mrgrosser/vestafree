export const BOARD_ROWS = 6;
export const BOARD_COLS = 22;
export const BOARD_SIZE = BOARD_ROWS * BOARD_COLS;
export const BLANK = " ";

const GLYPH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?;:'\"-_/()&@+#%*= ";
export const SUPPORTED_GLYPHS = new Set(GLYPH_CHARS.split(""));

export function sanitizeText(input = "") {
  return String(input)
    .toUpperCase()
    .split("")
    .map((ch) => (SUPPORTED_GLYPHS.has(ch) ? ch : BLANK))
    .join("");
}

export function messageToGrid(input = "") {
  const normalized = sanitizeText(input).trim();
  const words = normalized.length ? normalized.split(/\s+/) : [];
  const lines = [];
  let current = "";

  const pushCurrent = () => {
    lines.push((current || "").slice(0, BOARD_COLS).padEnd(BOARD_COLS, BLANK));
    current = "";
  };

  for (const word of words) {
    if (!word) continue;

    if (!current) {
      if (word.length <= BOARD_COLS) {
        current = word;
      } else {
        for (let i = 0; i < word.length; i += BOARD_COLS) {
          lines.push(word.slice(i, i + BOARD_COLS).padEnd(BOARD_COLS, BLANK));
          if (lines.length >= BOARD_ROWS) return lines;
        }
      }
      continue;
    }

    const next = `${current} ${word}`;
    if (next.length <= BOARD_COLS) {
      current = next;
    } else {
      pushCurrent();
      if (lines.length >= BOARD_ROWS) return lines;

      if (word.length <= BOARD_COLS) {
        current = word;
      } else {
        for (let i = 0; i < word.length; i += BOARD_COLS) {
          lines.push(word.slice(i, i + BOARD_COLS).padEnd(BOARD_COLS, BLANK));
          if (lines.length >= BOARD_ROWS) return lines;
        }
      }
    }
  }

  if (lines.length < BOARD_ROWS) {
    pushCurrent();
  }

  while (lines.length < BOARD_ROWS) {
    lines.push("".padEnd(BOARD_COLS, BLANK));
  }

  return lines.slice(0, BOARD_ROWS);
}

export function linesToTiles(lines) {
  return lines.join("").slice(0, BOARD_SIZE).padEnd(BOARD_SIZE, BLANK).split("");
}

export function makeBoardState(message = "") {
  const lines = messageToGrid(message);
  return {
    rows: BOARD_ROWS,
    cols: BOARD_COLS,
    message,
    lines,
    tiles: linesToTiles(lines)
  };
}
