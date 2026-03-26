import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Board,
  ScheduledCellUpdate,
  scheduleBoardAnimation,
  toBoard,
} from '../animation/scheduler';
import {
  BoardCellState,
  DEFAULT_ANIMATION_SETTINGS,
  SplitFlapAnimationSettings,
} from '../animation/types';

export interface UseSplitFlapBoardArgs {
  rows: string[];
  settings?: Partial<SplitFlapAnimationSettings>;
}

const emptyCell = (row: number, col: number): BoardCellState => ({
  row,
  col,
  currentGlyph: ' ',
  targetGlyph: ' ',
  phase: 'idle',
  sequence: [],
  stepIndex: -1,
});

const buildBoardState = (board: Board): BoardCellState[][] =>
  board.map((row, rowIndex) =>
    row.map((glyph, colIndex) => ({
      ...emptyCell(rowIndex, colIndex),
      currentGlyph: glyph,
      targetGlyph: glyph,
      phase: 'settled',
    })),
  );

export function useSplitFlapBoard({ rows, settings }: UseSplitFlapBoardArgs) {
  const mergedSettings = useMemo(
    () => ({ ...DEFAULT_ANIMATION_SETTINGS, ...settings }),
    [settings],
  );

  const targetBoard = useMemo(() => toBoard(rows), [rows]);
  const [board, setBoard] = useState<Board>(() => targetBoard);
  const [cells, setCells] = useState<BoardCellState[][]>(() => buildBoardState(targetBoard));
  const boardRef = useRef(board);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    const schedule = scheduleBoardAnimation(boardRef.current, targetBoard, mergedSettings);
    const timers: ReturnType<typeof setTimeout>[] = [];

    schedule.transitions.forEach((transition) => {
      setCells((prev) => {
        const next = prev.map((r) => r.slice());
        const row = next[transition.row] ?? [];
        const cell = row[transition.col] ?? emptyCell(transition.row, transition.col);

        row[transition.col] = {
          ...cell,
          targetGlyph: transition.targetGlyph,
          sequence: transition.sequence,
          stepIndex: 0,
          phase: 'flipping',
        };

        next[transition.row] = row;
        return next;
      });
    });

    schedule.events.forEach((event) => {
      timers.push(
        setTimeout(() => {
          setBoard((prev) => {
            const next = prev.map((row) => row.slice());
            const targetRow = next[event.update.row] ?? [];
            targetRow[event.update.col] = event.update.glyph;
            next[event.update.row] = targetRow;
            return next;
          });

          setCells((prev) => applyCellUpdate(prev, event.update));
        }, event.atMs),
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [targetBoard, mergedSettings]);

  return {
    board,
    cells,
    settings: mergedSettings,
  };
}

function applyCellUpdate(
  prev: BoardCellState[][],
  update: ScheduledCellUpdate,
): BoardCellState[][] {
  const next = prev.map((row) => row.slice());
  const row = next[update.row] ?? [];
  const cell = row[update.col] ?? emptyCell(update.row, update.col);

  row[update.col] = {
    ...cell,
    currentGlyph: update.glyph,
    targetGlyph: update.targetGlyph,
    stepIndex: cell.stepIndex + 1,
    phase: update.isFinal ? 'settled' : 'flipping',
  };

  next[update.row] = row;
  return next;
}
