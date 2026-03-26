const GLYPH_RING = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:-/';

export const DEFAULT_GLYPH_ORDER = GLYPH_RING.split('');

const buildIndexMap = (glyphOrder: string[]) => {
  const map = new Map<string, number>();
  glyphOrder.forEach((glyph, index) => map.set(glyph, index));
  return map;
};

export function normalizeGlyph(glyph: string, glyphOrder = DEFAULT_GLYPH_ORDER): string {
  const map = buildIndexMap(glyphOrder);
  const upper = glyph.toUpperCase();
  return map.has(upper) ? upper : glyphOrder[0] ?? ' ';
}

/**
 * Returns all glyphs needed to rotate from current to target on a circular ring.
 * Includes target as the final item and omits the starting glyph.
 */
export function computeFlipSequence(
  currentGlyph: string,
  targetGlyph: string,
  glyphOrder = DEFAULT_GLYPH_ORDER,
): string[] {
  const map = buildIndexMap(glyphOrder);
  const from = normalizeGlyph(currentGlyph, glyphOrder);
  const to = normalizeGlyph(targetGlyph, glyphOrder);

  if (from === to) {
    return [];
  }

  const start = map.get(from);
  const end = map.get(to);

  if (start === undefined || end === undefined || glyphOrder.length === 0) {
    return [];
  }

  const sequence: string[] = [];
  let cursor = start;

  while (cursor !== end) {
    cursor = (cursor + 1) % glyphOrder.length;
    sequence.push(glyphOrder[cursor]);
  }

  return sequence;
}
