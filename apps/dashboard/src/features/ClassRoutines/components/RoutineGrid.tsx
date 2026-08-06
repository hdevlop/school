'use client';

import { Clock3, DoorOpen, Plus, UserRound } from 'lucide-react';
import { NBadge } from 'najm-kit';
import { useTranslation } from '@/hooks/useLanguage';
import type { RoutineGridProps } from '../types';
import { routineDayLabel, routinePeriodLabel } from '../utils/labels';

const accents = [
  'border-l-sky-500 bg-sky-50 text-sky-950 dark:bg-sky-950/30 dark:text-sky-100',
  'border-l-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100',
  'border-l-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100',
  'border-l-rose-500 bg-rose-50 text-rose-950 dark:bg-rose-950/30 dark:text-rose-100',
  'border-l-indigo-500 bg-indigo-50 text-indigo-950 dark:bg-indigo-950/30 dark:text-indigo-100',
];

const hash = (value: string) => [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
export default function RoutineGrid({ days, periods, entries, duties = [], defaultRoom, editable, onCellClick, onDutyClick }: RoutineGridProps) {
  const { t } = useTranslation();
  const entryMap = new Map(entries.map((entry) => [`${entry.dayOfWeek}:${entry.periodId}`, entry]));
  const dutyMap = new Map(duties.map((duty) => [`${duty.dayOfWeek}:${duty.periodId}`, duty]));
  const template = { gridTemplateColumns: `9rem repeat(${days.length}, minmax(12rem, 1fr))` };

  return (
    <div className="overflow-auto rounded-2xl border bg-card shadow-sm">
      <div className="grid min-w-max border-b bg-muted/45" style={template}>
        <div className="sticky left-0 z-20 flex items-center gap-2 border-r bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Clock3 className="h-4 w-4" /> {t('classRoutines.ui.fields.period')}
        </div>
        {days.map((day) => (
          <div key={day} className="border-r px-3 py-2 text-sm font-semibold last:border-r-0">{routineDayLabel(day, t)}</div>
        ))}
      </div>

      {periods.map((period) => (
        <div key={period.id} className="grid min-w-max border-b last:border-b-0" style={template}>
          <div className={`sticky left-0 z-10 flex min-h-16 flex-col justify-center border-r px-3 py-2 ${period.isBreak ? 'bg-amber-50/60 dark:bg-amber-950/15' : 'bg-card'}`}>
            <p className="text-sm font-semibold">{routinePeriodLabel(period.name, t)}</p>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
              {period.startTime.slice(0, 5)}–{period.endTime.slice(0, 5)}
            </p>
          </div>
          {days.map((day) => {
            const entry = entryMap.get(`${day}:${period.id}`);
            if (period.isBreak) {
              const duty = dutyMap.get(`${day}:${period.id}`);
              const content = duty ? (
                <NBadge
                  color="primary"
                  look="dash"
                  size="lg"
                  icon={UserRound}
                  className="border-primary/50 text-primary normal-case tracking-normal"
                >
                  {duty.staffName}
                </NBadge>
              ) : <span>{routinePeriodLabel(period.name, t)}</span>;
              if (editable && onDutyClick) {
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => onDutyClick(day, period, duty)}
                    className="group grid min-h-16 cursor-pointer border-r bg-amber-50/60 p-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:bg-amber-100/70 last:border-r-0 dark:bg-amber-950/15 dark:hover:bg-amber-950/25"
                  >
                    {duty ? (
                      <span className="flex h-full items-center justify-center">{content}</span>
                    ) : (
                      <span className="flex h-full w-full items-center justify-center gap-1.5 rounded-xl border border-dashed text-xs normal-case tracking-normal opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        <Plus className="h-4 w-4" /> {t('classRoutines.ui.actions.addSupervisor')}
                      </span>
                    )}
                  </button>
                );
              }
              return (
                <div key={day} className="flex min-h-16 items-center justify-center border-r bg-amber-50/60 px-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground last:border-r-0 dark:bg-amber-950/15">
                  {content}
                </div>
              );
            }
            return (
              <button
                key={day}
                type="button"
                disabled={!editable}
                onClick={() => onCellClick?.(day, period, entry)}
                className="group min-h-16 border-r p-1.5 text-left transition-colors last:border-r-0 enabled:cursor-pointer enabled:hover:bg-primary/[0.035] disabled:cursor-default"
              >
                {entry ? (
                  <div className={`h-full rounded-lg border border-l-4 px-2.5 py-1.5 shadow-xs transition-transform group-enabled:group-hover:-translate-y-0.5 ${accents[hash(entry.subjectId) % accents.length]}`}>
                    <p className="text-sm font-semibold leading-tight">{entry.subjectName}</p>
                    <div className="mt-1 flex min-w-0 items-center gap-2.5 text-[11px] leading-none opacity-75">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <UserRound className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{entry.teacherName}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <DoorOpen className="h-3.5 w-3.5" /> {entry.roomNumber || defaultRoom || t('classRoutines.ui.grid.noRoom')}
                      </span>
                    </div>
                  </div>
                ) : editable ? (
                  <span className="flex h-full items-center justify-center gap-1.5 rounded-xl border border-dashed text-xs font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    <Plus className="h-4 w-4" /> {t('classRoutines.ui.actions.addLesson')}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
