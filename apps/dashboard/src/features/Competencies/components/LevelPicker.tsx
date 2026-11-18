'use client';

import { useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { CompetencyLevel } from '@sms/contracts';
import { cn, Popover, PopoverContent, PopoverTrigger } from 'najm-kit';
import { levelOptions, NOT_EVALUATED, type LevelChoice } from '../config/competencyOptions';
import { LevelSignal } from './CompetencyVisuals';
import { useCompetencyText } from './CompetencyText';

/**
 * The five levels and Non évalué in a small popover over the row that opened
 * it, so the list does not move. A level saves as soon as it is picked and the
 * popover closes; picking the level already set only closes it.
 */
export function LevelPopover({ value, onChange, label, disabled = false, children }: {
  value: CompetencyLevel | null | undefined;
  onChange: (level: CompetencyLevel | null) => void;
  label: string;
  disabled?: boolean;
  /** The row that opens it: one button. */
  children: ReactNode;
}) {
  const { t, dir, language } = useCompetencyText();
  const [open, setOpen] = useState(false);
  const current: LevelChoice = value ?? NOT_EVALUATED;
  const pick = (choice: LevelChoice) => {
    setOpen(false);
    if (choice !== current) onChange(choice === NOT_EVALUATED ? null : choice);
  };
  return (
    <Popover open={open} onOpenChange={(next) => setOpen(disabled ? false : next)}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      {/* The content is portalled out of the list, so it states the list's direction itself. */}
      <PopoverContent align="end" sideOffset={6} dir={dir} lang={language}
        className="w-60 max-w-[calc(100vw-2rem)] rounded-xl p-1.5">
        <div role="radiogroup" aria-label={label} className="flex flex-col gap-0.5">
          <p className="truncate px-2.5 pb-1 pt-1.5 text-xs text-muted-foreground">{label}</p>
          {levelOptions(t).map((option) => {
            const checked = option.value === current;
            return (
              <button key={option.value} type="button" role="radio" aria-checked={checked} aria-label={option.label} onClick={() => pick(option.value)}
                className={cn(
                  'flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 text-start text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  checked ? 'bg-accent font-medium' : 'hover:bg-accent/60',
                )}>
                <LevelSignal level={option.value === NOT_EVALUATED ? null : option.value} />
                <span className="min-w-0 flex-1">{option.label}</span>
                {checked ? <Check aria-hidden="true" className="size-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * A row a teacher sets a level on two ways: a tap on one of its bars sets that
 * level at once, and a tap anywhere else on the card opens the popover with
 * every level and Non évalué. The card's button lies under the content and
 * the bars sit above it, so no button holds another.
 */
export function LevelRow({ value, onChange, label, className, signal = 'lg', children }: {
  value: CompetencyLevel | null | undefined;
  onChange: (level: CompetencyLevel | null) => void;
  label: string;
  /** The card's look: border, padding, layout. */
  className: string;
  signal?: 'sm' | 'lg' | 'row';
  /** What the card shows before its bars. */
  children: ReactNode;
}) {
  return (
    <div className={cn(className, 'relative transition-colors hover:bg-accent/50 has-[>[data-state=open]]:ring-1 has-[>[data-state=open]]:ring-ring')}>
      <LevelPopover value={value} label={label} onChange={onChange}>
        <button type="button" aria-label={label}
          className="absolute inset-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </LevelPopover>
      {children}
      <LevelSignal level={value} size={signal} onPick={onChange} className="relative" />
    </div>
  );
}
