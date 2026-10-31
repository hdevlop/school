'use client';

import { useMemo } from 'react';
import { Plus, UserRound } from 'lucide-react';
import { NajmScroll, NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { describeRoutineContent } from '@sms/contracts/routines';
import type { RoutineGridProps, RoutinePeriod } from '../types';
import { routineDayLabel, routinePeriodLabel } from '../utils/labels';
import { subjectColors } from '../utils/subjectColors';
import RoutineCell from './RoutineCell';
import RoutineDayList from './RoutineDayList';

// The printed sheet's navy header, ruled grid and striped breaks, at its own values.
const NAVY = 'bg-[#2c4a7a] dark:bg-slate-900';
const RULE = 'border-[#8b97ab] dark:border-border';
const STRIPES = 'bg-[repeating-linear-gradient(45deg,#f4f5f7_0_6px,#eceef2_6px_12px)] dark:bg-[repeating-linear-gradient(45deg,transparent_0_6px,rgba(148,163,184,0.12)_6px_12px)]';

export default function RoutineGrid(props: RoutineGridProps) {
  return (
    <>
      {/* Wide screens: the week as one sheet, days down and periods across. */}
      <div className="hidden min-h-0 min-w-0 flex-1 md:flex md:flex-col"><RoutineWeekTable {...props} /></div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:hidden"><RoutineDayList {...props} /></div>
    </>
  );
}

function RoutineWeekTable({ days, periods, entries, duties = [], defaultRoom, editable, canCreate = editable, canUpdate = editable, canDelete = editable, onCellClick, onDutyClick }: RoutineGridProps) {
  const { t } = useTranslation();
  const entryMap = new Map(entries.map((entry) => [`${entry.dayOfWeek}:${entry.periodId}`, entry]));
  const dutyMap = new Map(duties.map((duty) => [`${duty.dayOfWeek}:${duty.periodId}`, duty]));
  const colorOf = useMemo(() => subjectColors(entries.map((entry) => ({ id: entry.subjectId, code: entry.subjectCode }))), [entries]);
  // A break that holds a lesson on some day is as wide as a lesson.
  const narrow = (period: RoutinePeriod) => period.isBreak && !entries.some((entry) => entry.periodId === period.id);

  return (
    // The frame ends with the week, closing the sheet below its last day; on a
    // short screen it shrinks to fit, and the week scrolls inside it.
    <NajmScroll axis="both" autoHide="scroll" className={`min-h-0 rounded-xl border bg-card shadow-sm ${RULE}`}>
      {/* Separate borders: collapsed ones straddle two cells, and a lesson's
          fill on each side then hides the line between two of the same color. */}
      <table className="w-max min-w-full table-fixed border-separate border-spacing-0 text-sm">
        <caption className="sr-only">{t('classRoutines.ui.title')}</caption>
        <thead className="sticky top-0 z-20">
          <tr className={`${NAVY} text-white`}>
            <th scope="col" className={`sticky start-0 z-20 w-28 min-w-28 border-e border-white/25 px-2 py-2.5 text-center text-xs font-bold ${NAVY}`}>
              {t('classRoutines.ui.fields.teachingDays')}
            </th>
            {periods.map((period) => (
              <th key={period.id} scope="col" className={`border-e border-white/25 px-2 py-2.5 text-center last:border-e-0 ${narrow(period) ? 'w-32 min-w-32' : 'w-48 min-w-48'}`}>
                <span className="block whitespace-nowrap text-sm font-bold tabular-nums" dir="ltr">{period.startTime.slice(0, 5)} – {period.endTime.slice(0, 5)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day} className="[&:last-child>*]:border-b-0">
              <th scope="row" className={`sticky start-0 z-10 border-e border-b bg-[#eef2f8] px-2 text-center text-sm font-bold text-[#2c4a7a] dark:bg-card dark:text-foreground ${RULE}`}>
                {routineDayLabel(day, t)}
              </th>
              {periods.map((period) => {
                const entry = entryMap.get(`${day}:${period.id}`);
                const duty = dutyMap.get(`${day}:${period.id}`);
                if (period.isBreak && !entry) {
                  const content = duty ? (
                    <NBadge color="primary" look="dash" icon={UserRound} className="max-w-full whitespace-normal text-center normal-case tracking-normal">
                      {duty.staffName}
                    </NBadge>
                  ) : <span className="text-xs font-bold uppercase tracking-wide">{routinePeriodLabel(period.name, t)}</span>;
                  return (
                    <td key={period.id} className={`h-24 border-e border-b text-center text-[#6b7385] last:border-e-0 dark:text-muted-foreground ${STRIPES} ${RULE}`}>
                      {(duty ? canUpdate || canDelete : canCreate) && onDutyClick ? (
                        <button type="button" onClick={() => onDutyClick(day, period, duty)} className="flex h-full min-h-24 w-full cursor-pointer items-center justify-center p-1.5 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary" aria-label={`${routineDayLabel(day, t)} ${routinePeriodLabel(period.name, t)}: ${duty?.staffName || t('classRoutines.ui.actions.addSupervisor')}`}>
                          {content}
                        </button>
                      ) : <div className="flex min-h-24 items-center justify-center p-1.5">{content}</div>}
                    </td>
                  );
                }
                const lesson = entry ? (
                  <RoutineCell subjectId={entry.subjectId} subjectName={entry.subjectName} teacherName={entry.teacherName} roomNumber={entry.roomNumber} contentGroups={entry.contentGroups} color={colorOf(entry.subjectId)} />
                ) : <span className="text-slate-400 dark:text-muted-foreground">—</span>;
                const lessonLabel = entry
                  ? entry.contentGroups?.length
                    ? `${entry.subjectName}: ${describeRoutineContent(entry.contentGroups, entry.subjectName, t('classRoutines.ui.content.or'))}`
                    : entry.subjectName
                  : t('classRoutines.ui.actions.addLesson');
                return (
                  <td key={period.id} className={`h-24 border-e border-b p-0 last:border-e-0 ${entry ? '' : 'bg-[#fafafa] dark:bg-transparent'} ${RULE}`}>
                    {(entry ? canUpdate || canDelete : canCreate) && onCellClick ? (
                      <button type="button" onClick={() => onCellClick(day, period, entry)} className="group block h-full min-h-24 w-full cursor-pointer text-start hover:ring-2 hover:ring-inset hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-primary" aria-label={`${routineDayLabel(day, t)} ${routinePeriodLabel(period.name, t)}: ${lessonLabel}`}>
                        {entry ? lesson : <span className="flex min-h-24 items-center justify-center gap-1.5 text-xs text-slate-400 group-hover:text-primary dark:text-muted-foreground"><Plus className="hidden h-4 w-4 group-hover:block group-focus-visible:block" />—</span>}
                      </button>
                    ) : entry ? (
                      <details className="min-h-24">
                        <summary className="list-none cursor-pointer focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden" aria-label={`${routineDayLabel(day, t)} ${routinePeriodLabel(period.name, t)}: ${lessonLabel}`}>
                          {lesson}
                        </summary>
                        <div className="border-t px-2 py-1.5 text-xs leading-relaxed">
                          <p className="font-medium">{entry.subjectName}</p>
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
    </NajmScroll>
  );
}
