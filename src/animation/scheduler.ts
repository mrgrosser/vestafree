import { computeFlipSequence, DEFAULT_GLYPH_ORDER } from './glyphOrder';
import {
  BoardTransition,
  DEFAULT_ANIMATION_SETTINGS,
  SplitFlapAnimationSettings,
} from './types';

export type Board = string[][];

export interface ScheduledCellUpdate {
  row: number;
  col: number;
  glyph: string;
  targetGlyph: string;
  isFinal: boolean;
}

export interface ScheduledEvent {
  atMs: number;
  update: ScheduledCellUpdate;
}

export interface ScheduledBoardAnimation {
  transitions: BoardTransition[];
  events: ScheduledEvent[];
  totalDurationMs: number;
}

export function diffBoard(
  current: Board,
  target: Board,
  settings: Partial<SplitFlapAnimationSettings> = {},
  glyphOrder = DEFAULT_GLYPH_ORDER,
): BoardTransition[] {
  const merged = { ...DEFAULT_ANIMATION_SETTINGS, ...settings };
  const transitions: BoardTransition[] = [];

  for (let row = 0; row < target.length; row += 1) {
    const targetRow = target[row] ?? [];
    const currentRow = current[row] ?? [];

    for (let col = 0; col < targetRow.length; col += 1) {
      const currentGlyph = currentRow[col] ?? ' ';
      const targetGlyph = targetRow[col] ?? ' ';
      const sequence = computeFlipSequence(currentGlyph, targetGlyph, glyphOrder);

      if (sequence.length === 0) {
        continue;
      }

      const startDelayMs =
        (merged.rowDelayMs * row + merged.columnDelayMs * col) * merged.durationMultiplier;

      transitions.push({
        row,
        col,
        currentGlyph,
        targetGlyph,
        sequence,
        startDelayMs,
      });
    }
  }

  return transitions;
}

export function scheduleBoardAnimation(
  current: Board,
  target: Board,
  settings: Partial<SplitFlapAnimationSettings> = {},
  glyphOrder = DEFAULT_GLYPH_ORDER,
): ScheduledBoardAnimation {
  const merged = { ...DEFAULT_ANIMATION_SETTINGS, ...settings };
  const transitions = diffBoard(current, target, merged, glyphOrder);
  const events: ScheduledEvent[] = [];

  transitions.forEach((transition) => {
    transition.sequence.forEach((glyph, index) => {
      const atMs =
        transition.startDelayMs +
        index * merged.flipSpeedMs * merged.durationMultiplier;

      events.push({
        atMs,
        update: {
          row: transition.row,
          col: transition.col,
          glyph,
          targetGlyph: transition.targetGlyph,
          isFinal: index === transition.sequence.length - 1,
        },
      });
    });
  });

  events.sort((a, b) => a.atMs - b.atMs);

  const totalDurationMs = events.length ? events[events.length - 1].atMs : 0;

  return {
    transitions,
    events,
    totalDurationMs,
  };
}

/**
 * Pure transport-agnostic bridge. Call this from API polling, websockets,
 * weather, or flight feed adapters to route data into the animation pipeline.
 */
export function toBoard(input: string[]): Board {
  return input.map((row) => row.split(''));
}
