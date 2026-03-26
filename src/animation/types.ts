export type SplitFlapPhase = 'idle' | 'flipping' | 'settled';

export interface BoardCellState {
  row: number;
  col: number;
  currentGlyph: string;
  targetGlyph: string;
  phase: SplitFlapPhase;
  sequence: string[];
  stepIndex: number;
}

export interface SplitFlapAnimationSettings {
  /** Time in milliseconds between intermediate glyph flips for a single cell. */
  flipSpeedMs: number;
  /** Additional delay per row in milliseconds before a cell starts. */
  rowDelayMs: number;
  /** Additional delay per column in milliseconds before a cell starts. */
  columnDelayMs: number;
  /** Optional overall multiplier for quickly tuning realism. */
  durationMultiplier: number;
}

export interface BoardTransition {
  row: number;
  col: number;
  currentGlyph: string;
  targetGlyph: string;
  sequence: string[];
  startDelayMs: number;
}

export const DEFAULT_ANIMATION_SETTINGS: SplitFlapAnimationSettings = {
  flipSpeedMs: 45,
  rowDelayMs: 35,
  columnDelayMs: 18,
  durationMultiplier: 1,
};
