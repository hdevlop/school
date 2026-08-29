'use client';

import { Check, Clock, X } from 'lucide-react';
import { NButton } from 'najm-kit';
import { cn } from '@/lib/utils';
import type { RosterStatus } from '../hooks/useAttendanceRoster';

const IDLE = 'border-2 border-slate-300 bg-white text-slate-500 shadow-none hover:border-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800';

export const ROSTER_STATUSES: RosterStatus[] = ['present', 'absent', 'late'];

export const ROSTER_STATUS_META: Record<RosterStatus, { label: string; icon: any; idle: string; active: string }> = {
  present: {
    label: 'Present',
    icon: Check,
    idle: IDLE + ' hover:text-emerald-600 dark:hover:text-emerald-400',
    active: 'border-2 border-emerald-700 bg-emerald-600 text-white shadow-none outline outline-2 outline-offset-1 outline-emerald-200 hover:bg-emerald-700 dark:border-emerald-400 dark:bg-emerald-500 dark:text-white dark:outline-emerald-900',
  },
  absent: {
    label: 'Absent',
    icon: X,
    idle: IDLE + ' hover:text-red-600 dark:hover:text-red-400',
    active: 'border-2 border-red-700 bg-red-600 text-white shadow-none outline outline-2 outline-offset-1 outline-red-200 hover:bg-red-700 dark:border-red-400 dark:bg-red-500 dark:text-white dark:outline-red-900',
  },
  late: {
    label: 'Late',
    icon: Clock,
    idle: IDLE + ' hover:text-amber-600 dark:hover:text-amber-400',
    active: 'border-2 border-amber-600 bg-amber-500 text-white shadow-none outline outline-2 outline-offset-1 outline-amber-200 hover:bg-amber-600 dark:border-amber-400 dark:bg-amber-500 dark:text-white dark:outline-amber-900',
  },
};

interface RosterMarksProps {
  current: RosterStatus;
  onSelect: (status: RosterStatus) => void;
  className?: string;
}

/**
 * The three marks a register offers for one person.
 *
 * Shared by the table cell and the card so a phone and a desktop are marking
 * with the same control — same labels, same pressed state, same handler — and
 * neither can drift from the other.
 */
export default function RosterMarks({ current, onSelect, className }: RosterMarksProps) {
  return (
    <div className={cn('flex w-full justify-center gap-2', className)}>
      {ROSTER_STATUSES.map((status) => {
        const meta = ROSTER_STATUS_META[status];
        const Icon = meta.icon;
        const active = current === status;
        return (
          <NButton
            key={status}
            type="button"
            variant="outline"
            size="sm"
            title={meta.label}
            aria-pressed={active}
            onClick={(event) => {
              // Cards sit inside a clickable row; marking must not also count
              // as opening the record.
              event.stopPropagation();
              onSelect(status);
            }}
            className={cn(
              'flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg p-0 transition-all duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              active ? meta.active : meta.idle,
            )}
          >
            <Icon className="h-4 w-4" />
          </NButton>
        );
      })}
    </div>
  );
}
