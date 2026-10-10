'use client';

import { useState } from 'react';
import { Plus, UserRound } from 'lucide-react';
import { NBadge } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { ROUTINE_DAYS, type RoutineDay, type RoutineGridProps } from '../types';
import { routineDayLabel, routinePeriodLabel } from '../utils/labels';
import RoutineCell from './RoutineCell';

// Sunday is index 0; the device's day opens first when the routine teaches it.
const deviceToday = (): RoutineDay => ROUTINE_DAYS[(new Date().getDay() + 6) % 7];

/** Phones: one day of a section's timetable at a time, periods top to bottom. */
export default function RoutineDayList({ days, periods, entries, duties = [], defaultRoom, editable, onCellClick, onDutyClick }: RoutineGridProps) {
  const { t } = useTranslation();
  const [pickedDay, setPickedDay] = useState<RoutineDay | null>(null);
  const today = deviceToday();
  const shownDay = pickedDay && days.includes(pickedDay) ? pickedDay : days.includes(today) ? today : days[0];
  const entryMap = new Map(entries.map((entry) => [`${entry.dayOfWeek}:${entry.periodId}`, entry]));
  const dutyMap = new Map(duties.map((duty) => [`${duty.dayOfWeek}:${duty.periodId}`, duty]));
  const dayLabel = shownDay ? routineDayLabel(shownDay, t) : '';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1 rounded-xl border bg-card p-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }} role="tablist" aria-label={t('classRoutines.ui.fields.teachingDays')}>
        {days.map((day) => (
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={day === shownDay}
            aria-label={routineDayLabel(day, t)}
            onClick={() => setPickedDay(day)}
            className={`flex flex-col items-center rounded-lg py-2 text-xs font-semibold ${day === shownDay ? 'bg-primary text-primary-foreground' : day === today ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {t(`common.weekdaysShort.${day.slice(0, 3)}`)}
            {day === today ? <span className={`mt-0.5 size-1.5 rounded-full ${day === shownDay ? 'bg-primary-foreground' : 'bg-primary'}`} /> : null}
          </button>
        ))}
      </div>

      <h2 className="px-1 text-sm font-semibold">{dayLabel}</h2>

      <ol className="flex flex-col gap-2" role="tabpanel" aria-label={dayLabel}>
        {shownDay ? periods.map((period) => {
          const time = (
            <div className="flex w-12 shrink-0 flex-col justify-center text-xs font-medium tabular-nums text-muted-foreground" dir="ltr">
              <span>{period.startTime.slice(0, 5)}</span>
              <span className="opacity-70">{period.endTime.slice(0, 5)}</span>
            </div>
          );

          if (period.isBreak) {
            const duty = dutyMap.get(`${shownDay}:${period.id}`);
            const label = routinePeriodLabel(period.name, t);
            const content = (
              <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 px-2 py-1.5">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
                {duty ? (
                  <NBadge color="primary" look="dash" icon={UserRound} className="max-w-full whitespace-normal normal-case tracking-normal">
                    {duty.staffName}
                  </NBadge>
                ) : editable && onDutyClick ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Plus className="size-3.5" aria-hidden="true" />{t('classRoutines.ui.actions.addSupervisor')}</span>
                ) : null}
              </span>
            );
            return (
              <li key={period.id} className="flex items-stretch gap-3 rounded-xl border border-dashed bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(148,163,184,0.10)_5px,rgba(148,163,184,0.10)_10px)] px-2 py-1">
                {time}
                {editable && onDutyClick ? (
                  <button type="button" onClick={() => onDutyClick(shownDay, period, duty)} className="flex min-w-0 flex-1 cursor-pointer rounded-md text-start focus-visible:outline-2 focus-visible:outline-primary" aria-label={`${dayLabel} ${label}: ${duty?.staffName || t('classRoutines.ui.actions.addSupervisor')}`}>
                    {content}
                  </button>
                ) : content}
              </li>
            );
          }

          const entry = entryMap.get(`${shownDay}:${period.id}`);
          const lesson = entry ? (
            <div className="overflow-hidden rounded-md">
              <RoutineCell subjectId={entry.subjectId} subjectName={entry.subjectName} roomNumber={entry.roomNumber} defaultRoom={defaultRoom} contentGroups={entry.contentGroups} />
            </div>
          ) : (
            <span className="flex min-h-12 items-center justify-center gap-1.5 rounded-md border border-dashed text-xs text-muted-foreground">
              {editable && onCellClick ? <><Plus className="size-4" aria-hidden="true" />{t('classRoutines.ui.actions.addLesson')}</> : '—'}
            </span>
          );
          return (
            <li key={period.id} className="flex items-stretch gap-3 rounded-xl border bg-card p-2">
              {time}
              <div className="min-w-0 flex-1">
                {editable && onCellClick ? (
                  <button type="button" onClick={() => onCellClick(shownDay, period, entry)} className="block w-full cursor-pointer rounded-md text-start focus-visible:outline-2 focus-visible:outline-primary" aria-label={`${dayLabel} ${routinePeriodLabel(period.name, t)}: ${entry?.subjectName || t('classRoutines.ui.actions.addLesson')}`}>
                    {lesson}
                  </button>
                ) : lesson}
                {entry?.notes ? <p className="mt-1 px-1 text-xs text-muted-foreground">{entry.notes}</p> : null}
              </div>
            </li>
          );
        }) : null}
      </ol>
    </div>
  );
}
