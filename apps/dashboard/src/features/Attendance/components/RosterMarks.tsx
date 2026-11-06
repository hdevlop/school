'use client';

import { Check, Clock, X } from 'lucide-react';
import { NButton, cn, inputBorderClasses, surfaceBorderClasses } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { RosterStatus, RosterMark } from '../hooks/useAttendanceRoster';

const IDLE = 'bg-transparent text-muted-foreground hover:bg-muted';

export const ROSTER_STATUSES: RosterStatus[] = ['present', 'absent', 'late'];

export const ROSTER_STATUS_META: Record<RosterStatus, { labelKey: string; icon: any; idle: string; active: string }> = {
  present: {
    labelKey: 'attendance.status.present',
    icon: Check,
    idle: IDLE + ' hover:text-emerald-600 dark:hover:text-emerald-400',
    active: 'bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700',
  },
  absent: {
    labelKey: 'attendance.status.absent',
    icon: X,
    idle: IDLE + ' hover:text-red-600 dark:hover:text-red-400',
    active: 'bg-red-600 text-white hover:bg-red-700 hover:text-white dark:bg-red-600 dark:text-white dark:hover:bg-red-700',
  },
  late: {
    labelKey: 'attendance.status.late',
    icon: Clock,
    idle: IDLE + ' hover:text-amber-600 dark:hover:text-amber-400',
    active: 'bg-amber-500 text-slate-950 hover:bg-amber-600 hover:text-slate-950 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-600',
  },
};

interface RosterMarksProps {
  current: RosterMark;
  onSelect: (status: RosterStatus) => void;
  className?: string;
  disabled?: boolean;
  /** The "not recorded" line above the marks; a card shows it beside the name instead. */
  showHint?: boolean;
  /** A card's smaller marks, leaving a narrow phone room for the name. */
  compact?: boolean;
}

/**
 * The three marks a register offers for one person.
 *
 * Shared by the table cell and the card so a phone and a desktop are marking
 * with the same control — same labels, same pressed state, same handler — and
 * neither can drift from the other.
 */
export default function RosterMarks({ current, onSelect, className, disabled = false, showHint = true, compact = false }: RosterMarksProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-1">
    {showHint && current === 'unmarked' && <span className="text-xs text-muted-foreground">{t('attendance.roster.unmarked')}</span>}
    <div role="group" aria-label={t('common.status')} data-bordered="true" className={cn('inline-flex w-fit shrink-0 gap-0 overflow-hidden rounded-lg bg-background', inputBorderClasses(), className)}>
      {ROSTER_STATUSES.map((status) => {
        const meta = ROSTER_STATUS_META[status];
        const Icon = meta.icon;
        const active = current === status;
        return (
          <NButton
            key={status}
            type="button"
            variant="ghost"
            size="sm"
            title={t(meta.labelKey)}
            aria-label={t(meta.labelKey)}
            aria-pressed={active}
            disabled={disabled}
            onClick={(event) => {
              // Cards sit inside a clickable row; marking must not also count
              // as opening the record.
              event.stopPropagation();
              onSelect(status);
            }}
            className={cn(
              'flex shrink-0 cursor-pointer items-center justify-center rounded-none border-y-0 border-e-0 p-0 shadow-none transition-colors first:border-s-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50',
              surfaceBorderClasses(true, 'start'), 'border-input',
              compact ? 'h-8 w-8' : 'h-9 w-9',
              active ? meta.active : meta.idle,
            )}
          >
            <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          </NButton>
        );
      })}
    </div>
    </div>
  );
}
