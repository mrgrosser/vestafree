import React from 'react';
import { SplitFlapPhase } from '../animation/types';

export interface SplitFlapCellProps {
  currentGlyph: string;
  targetGlyph: string;
  phase: SplitFlapPhase;
  className?: string;
}

export function SplitFlapCell({
  currentGlyph,
  targetGlyph,
  phase,
  className,
}: SplitFlapCellProps) {
  return (
    <div
      className={['split-flap-cell', `is-${phase}`, className].filter(Boolean).join(' ')}
      data-phase={phase}
      data-target={targetGlyph}
      aria-label={`Split-flap cell ${currentGlyph}`}
    >
      <div className="split-flap-cell__top">{currentGlyph}</div>
      <div className="split-flap-cell__hinge" aria-hidden="true" />
      <div className="split-flap-cell__bottom">{currentGlyph}</div>
    </div>
  );
}

export default SplitFlapCell;
