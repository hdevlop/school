'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { COMPETENCY_LEVEL_VALUES, type CompetencyLevel } from '@sms/contracts';
import { cn } from 'najm-kit';
import { useCompetencyText } from './CompetencyText';
import { filledBars, formatChange, SIGNAL_BARS, type Distribution } from '../config/competencyLevels';
import { EMPTY_TONE, LEVEL_TONE, levelLabel } from '../config/competencyOptions';

// The shortest bar is about a quarter of the tallest, as in the mockups.
const barHeight = (index: number) => `${28 + (index * 72) / (SIGNAL_BARS - 1)}%`;

/**
 * A level as rising bars, like a signal: Début fills two, Maîtrisé all five,
 * Non évalué none. `sm` sits beside a pupil's name; `lg` beside a competency.
 */
export function LevelSignal({ level, size = 'sm', className, onPick }: {
  level: CompetencyLevel | null | undefined;
  size?: 'sm' | 'lg';
  className?: string;
  /**
   * Makes each bar a button for its level, so a teacher sets it in one tap:
   * the third bar is En cours. Tapping the level already set clears it.
   */
  onPick?: (level: CompetencyLevel | null) => void;
}) {
  const { t } = useCompetencyText();
  const filled = filledBars(level);
  const tone = level ? LEVEL_TONE[level].bar : EMPTY_TONE;
  const large = size === 'lg';
  const bar = (index: number) => cn(large ? 'w-7 rounded-[4px]' : 'w-[5px] rounded-[1px]', index < filled ? tone : EMPTY_TONE);
  const frame = cn('inline-flex shrink-0 items-end', large ? 'h-11 gap-[3px]' : 'h-5 gap-[2px]', className);
  if (onPick) {
    return (
      <span role="radiogroup" aria-label={levelLabel(t, level)} className={frame}>
        {COMPETENCY_LEVEL_VALUES.map((value, index) => (
          <button key={value} type="button" role="radio" aria-checked={value === level}
            aria-label={levelLabel(t, value)} title={levelLabel(t, value)}
            onClick={() => onPick(value === level ? null : value)}
            className="flex h-full items-end rounded-[4px] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span aria-hidden="true" className={bar(index)} style={{ height: barHeight(index) }} />
          </button>
        ))}
      </span>
    );
  }
  return (
    <span role="img" aria-label={levelLabel(t, level)} title={levelLabel(t, level)} className={frame}>
      {Array.from({ length: SIGNAL_BARS }, (_, index) => (
        <span key={index} aria-hidden="true" className={bar(index)} style={{ height: barHeight(index) }} />
      ))}
    </span>
  );
}

/** How a competency's pupils spread across the levels; the rest of the roster stays grey. */
export function LevelDistributionBar({ distribution, total, className }: { distribution: Distribution; total: number; className?: string }) {
  const { t } = useCompetencyText();
  const label = COMPETENCY_LEVEL_VALUES
    .filter((level) => distribution[level] > 0)
    .map((level) => `${levelLabel(t, level)}: ${distribution[level]}`)
    .join(', ');
  return (
    <div role="img" aria-label={label || levelLabel(t, null)} className={cn('flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full', EMPTY_TONE, className)}>
      {total > 0 && COMPETENCY_LEVEL_VALUES.map((level) => distribution[level] > 0 ? (
        <span key={level} aria-hidden="true" className={cn('h-full first:rounded-s-full', LEVEL_TONE[level].bar)}
          style={{ width: `${(distribution[level] / total) * 100}%` }} />
      ) : null)}
    </div>
  );
}

/** `4/8` inside a ring that fills as more pupils are evaluated. */
export function EvaluatedRing({ evaluated, total, label }: { evaluated: number; total: number; label: string }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const share = total ? Math.min(1, evaluated / total) : 0;
  return (
    <span role="img" aria-label={label} title={label} className="relative inline-flex size-11 shrink-0 items-center justify-center">
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={radius} fill="none" strokeWidth="4" className="stroke-muted-foreground/20" />
        <circle cx="22" cy="22" r={radius} fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-foreground"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - share)} />
      </svg>
      <span aria-hidden="true" className="relative text-[11px] font-semibold tabular-nums">{evaluated}/{total}</span>
    </span>
  );
}

/** `↑ +0.9` since September: blue for a rise, orange for a fall, nothing without a change. */
export function ChangeMark({ change, label, signed = true }: { change: number | null; label: string; signed?: boolean }) {
  if (change == null || change === 0) return null;
  const rise = change > 0;
  const Icon = rise ? ArrowUp : ArrowDown;
  const text = signed ? formatChange(change) : String(Math.abs(change));
  return (
    <span title={label} aria-label={label}
      className={cn('inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold tabular-nums', rise ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400')}>
      <Icon aria-hidden="true" className="size-3" />
      <span aria-hidden="true">{text}</span>
    </span>
  );
}
