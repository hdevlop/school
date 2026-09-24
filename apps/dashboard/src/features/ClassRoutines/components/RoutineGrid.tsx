'use client';

import { Plus, UserRound } from 'lucide-react';
import { NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { describeRoutineContent } from '@sms/contracts/routines';
import type { RoutineGridProps } from '../types';
import { routineDayLabel, routinePeriodLabel } from '../utils/labels';
import RoutineCell from './RoutineCell';

export default function RoutineGrid({ days, periods, entries, duties = [], defaultRoom, editable, onCellClick, onDutyClick }: RoutineGridProps) {
  const { t } = useTranslation();
  const entryMap = new Map(entries.map((entry) => [`${entry.dayOfWeek}:${entry.periodId}`, entry]));
  const dutyMap = new Map(duties.map((duty) => [`${duty.dayOfWeek}:${duty.periodId}`, duty]));

  return (
    <div className="overflow-auto rounded-xl border border-slate-300 bg-card shadow-sm dark:border-border">
      <table className="w-max min-w-full table-fixed border-collapse text-sm">
        <caption className="sr-only">{t('classRoutines.ui.title')}</caption>
        <thead className="sticky top-0 z-20">
          <tr className="bg-slate-800 text-white dark:bg-slate-900">
            <th scope="col" className="sticky start-0 z-20 w-28 min-w-28 border-e border-white/25 bg-slate-800 px-2 py-2 text-start text-xs dark:bg-slate-900">
              {t('classRoutines.ui.fields.teachingDays')}
            </th>
            {periods.map((period) => (
              <th key={period.id} scope="col" className={`border-e border-white/25 px-2 py-2 text-center text-[11px] font-semibold last:border-e-0 ${period.isBreak ? 'w-32 min-w-32' : 'w-48 min-w-48'}`}>
                <span className="block">{routinePeriodLabel(period.name, t)}</span>
                <span className="block font-normal tabular-nums opacity-85" dir="ltr">{period.startTime.slice(0, 5)}–{period.endTime.slice(0, 5)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day} className="border-t border-slate-300 dark:border-border">
              <th scope="row" className="sticky start-0 z-10 border-e border-slate-300 bg-slate-50 px-2 text-start text-xs font-bold text-slate-700 dark:border-border dark:bg-card dark:text-foreground">
                {routineDayLabel(day, t)}
              </th>
              {periods.map((period) => {
                const entry = entryMap.get(`${day}:${period.id}`);
                const duty = dutyMap.get(`${day}:${period.id}`);
                if (period.isBreak) {
                  const content = duty ? (
                    <NBadge color="primary" look="dash" size="lg" icon={UserRound} className="max-w-full whitespace-normal text-center normal-case tracking-normal">
                      {duty.staffName}
                    </NBadge>
                  ) : <span className="text-xs font-medium">{routinePeriodLabel(period.name, t)}</span>;
                  return (
                    <td key={period.id} className="h-24 border-e border-slate-300 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(148,163,184,0.10)_5px,rgba(148,163,184,0.10)_10px)] text-center text-slate-600 last:border-e-0 dark:border-border dark:text-muted-foreground">
                      {editable && onDutyClick ? (
                        <button type="button" onClick={() => onDutyClick(day, period, duty)} className="flex h-full min-h-24 w-full items-center justify-center p-1.5 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary" aria-label={`${routineDayLabel(day, t)} ${routinePeriodLabel(period.name, t)}: ${duty?.staffName || t('classRoutines.ui.actions.addSupervisor')}`}>
                          {content}
                        </button>
                      ) : <div className="flex min-h-24 items-center justify-center p-1.5">{content}</div>}
                    </td>
                  );
                }
                const lesson = entry ? (
                  <RoutineCell subjectId={entry.subjectId} subjectName={entry.subjectName} teacherName={entry.teacherName} roomNumber={entry.roomNumber} defaultRoom={defaultRoom} contentGroups={entry.contentGroups} />
                ) : <span className="text-muted-foreground">—</span>;
                const lessonLabel = entry
                  ? entry.contentGroups?.length
                    ? `${entry.subjectName}: ${describeRoutineContent(entry.contentGroups, entry.subjectName, t('classRoutines.ui.content.or'))}`
                    : entry.subjectName
                  : t('classRoutines.ui.actions.addLesson');
                return (
                  <td key={period.id} className="h-24 border-e border-slate-300 p-0.5 last:border-e-0 dark:border-border">
                    {editable && onCellClick ? (
                      <button type="button" onClick={() => onCellClick(day, period, entry)} className="group block h-full min-h-24 w-full text-start hover:ring-2 hover:ring-inset hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-primary" aria-label={`${routineDayLabel(day, t)} ${routinePeriodLabel(period.name, t)}: ${lessonLabel}`}>
                        {entry ? lesson : <span className="flex min-h-24 items-center justify-center gap-1.5 text-xs text-muted-foreground"><Plus className="hidden h-4 w-4 group-hover:block group-focus-visible:block" />—</span>}
                      </button>
                    ) : entry ? (
                      <details className="min-h-24">
                        <summary className="list-none cursor-pointer focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden" aria-label={`${routineDayLabel(day, t)} ${routinePeriodLabel(period.name, t)}: ${lessonLabel}`}>
                          {lesson}
                        </summary>
                        <div className="border-t px-2 py-1.5 text-xs leading-relaxed">
                          <p className="font-medium">{entry.subjectName} · {entry.teacherName}</p>
                          <p>{entry.roomNumber || defaultRoom || t('classRoutines.ui.grid.noRoom')}</p>
                          {entry.contentGroups?.length ? <p>{lessonLabel}</p> : null}
                          {entry.notes ? <p>{entry.notes}</p> : null}
                        </div>
                      </details>
                    ) : <div className="flex min-h-24 items-center justify-center">{lesson}</div>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
