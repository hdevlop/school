'use client';

import { useMemo, useState } from 'react';
import { DoorOpen } from 'lucide-react';
import { NajmScroll } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { ROUTINE_DAYS, type RoutineDay, type RoutineSchedule } from '../types';
import { routineDayLabel, routinePeriodLabel } from '../utils/labels';
import { colorFor } from './RoutineCell';

interface WeekLesson {
  id: string;
  subjectId: string;
  subjectName: string;
  place: string;
  room?: string | null;
}

interface WeekSlot {
  key: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  name: string;
}

const hhmm = (time: string) => time.slice(0, 5);
const slotKey = (startTime: string, endTime: string) => `${hhmm(startTime)}-${hhmm(endTime)}`;

/**
 * One teacher's week across all their sections: each section's timetable
 * shares the school's period times, so lessons merge into one grid by time.
 */
function buildWeek(schedules: RoutineSchedule[]) {
  const slots = new Map<string, WeekSlot>();
  const lessons = new Map<string, WeekLesson>();
  const days = new Set<RoutineDay>();

  for (const schedule of schedules) {
    schedule.activeDays.forEach((day) => days.add(day));
    const periods = new Map(schedule.periods.map((period) => [period.id, period]));
    for (const period of schedule.periods) {
      const key = slotKey(period.startTime, period.endTime);
      if (!slots.has(key)) slots.set(key, { key, startTime: hhmm(period.startTime), endTime: hhmm(period.endTime), isBreak: period.isBreak, name: period.name });
    }
    for (const entry of schedule.entries) {
      const period = periods.get(entry.periodId);
      if (!period) continue;
      lessons.set(`${entry.dayOfWeek}|${slotKey(period.startTime, period.endTime)}`, {
        id: entry.id,
        subjectId: entry.subjectId,
        subjectName: entry.subjectName,
        place: `${schedule.className} · ${schedule.sectionName}`,
        room: entry.roomNumber || schedule.roomNumber,
      });
    }
  }

  return {
    days: ROUTINE_DAYS.filter((day) => days.has(day)),
    slots: [...slots.values()].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    lessons,
  };
}

function LessonCard({ lesson, showSubject }: { lesson: WeekLesson; showSubject: boolean }) {
  return (
    <div className={`flex h-full min-w-0 flex-col justify-center gap-0.5 rounded-md px-2 py-1.5 ${colorFor(lesson.subjectId)}`}>
      <span className="truncate text-sm font-bold leading-tight">{lesson.place}</span>
      <span className="flex min-w-0 items-center justify-between gap-2 text-xs opacity-80">
        <span dir="auto" className="truncate">{showSubject ? lesson.subjectName : null}</span>
        {lesson.room ? (
          <span className="flex shrink-0 items-center gap-1"><DoorOpen className="size-3" aria-hidden="true" />{lesson.room}</span>
        ) : null}
      </span>
    </div>
  );
}

// A teacher's own sheet names the class first; the subject joins it only when
// they teach more than one.
function ClassCell({ lesson, showSubject }: { lesson: WeekLesson; showSubject: boolean }) {
  return (
    <div className={`flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1.5 py-1 text-center ${colorFor(lesson.subjectId)}`}>
      <span className="truncate text-base font-bold leading-tight">{lesson.place}</span>
      {showSubject ? <span dir="auto" className="max-w-full truncate text-xs font-medium opacity-85">{lesson.subjectName}</span> : null}
      {lesson.room ? (
        <span className="flex items-center gap-1 text-[0.7rem] opacity-75"><DoorOpen className="size-3" aria-hidden="true" />{lesson.room}</span>
      ) : null}
    </div>
  );
}

export default function TeacherWeek({ schedules, today }: { schedules: RoutineSchedule[]; today?: RoutineDay | null }) {
  const { t } = useTranslation();
  const { days, slots, lessons } = useMemo(() => buildWeek(schedules), [schedules]);
  const showSubject = useMemo(() => new Set([...lessons.values()].map((lesson) => lesson.subjectId)).size > 1, [lessons]);
  const [pickedDay, setPickedDay] = useState<RoutineDay | null>(null);
  const shownDay = pickedDay ?? (today && days.includes(today) ? today : days[0]);
  const lessonSlots = slots.filter((slot) => !slot.isBreak);
  const dayLessons = lessonSlots
    .map((slot) => ({ slot, lesson: lessons.get(`${shownDay}|${slot.key}`) }))
    .filter((item): item is { slot: WeekSlot; lesson: WeekLesson } => Boolean(item.lesson));

  return (
    <>
      {/* Wide screens: one sheet for the week, days down and times across,
          each lesson named by the class it is taught to. */}
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
        <NajmScroll axis="x">
          <table className="w-full min-w-[56rem] table-fixed border-collapse text-sm">
            <caption className="sr-only">{t('classRoutines.ui.teacher.myWeekTitle')}</caption>
            <thead>
              <tr className="bg-slate-800 text-white dark:bg-slate-900">
                <th scope="col" className="w-24 border-e border-white/20 px-2 py-2.5 text-start text-xs font-semibold">
                  {t('classRoutines.ui.fields.teachingDays')}
                </th>
                {slots.map((slot) => (
                  <th
                    key={slot.key}
                    scope="col"
                    className={`border-e border-white/20 px-1 py-2.5 text-center text-xs font-semibold tabular-nums last:border-e-0 ${slot.isBreak ? 'w-16' : ''}`}
                    dir="ltr"
                  >
                    {slot.isBreak ? slot.startTime : `${slot.startTime} – ${slot.endTime}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day} className="border-t">
                  <th
                    scope="row"
                    className={`border-e px-2 text-start text-sm font-semibold ${day === today ? 'bg-primary/10 text-primary' : 'bg-muted/40 text-foreground'}`}
                  >
                    {routineDayLabel(day, t)}
                    {day === today ? <span className="block text-[0.7rem] font-medium">{t('classRoutines.ui.teacher.today')}</span> : null}
                  </th>
                  {slots.map((slot) => {
                    if (slot.isBreak) {
                      return (
                        <td
                          key={slot.key}
                          className="border-e bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(148,163,184,0.12)_5px,rgba(148,163,184,0.12)_10px)] px-1 text-center text-[0.65rem] font-semibold uppercase leading-tight text-muted-foreground last:border-e-0"
                        >
                          {routinePeriodLabel(slot.name, t)}
                        </td>
                      );
                    }
                    const lesson = lessons.get(`${day}|${slot.key}`);
                    return (
                      <td key={slot.key} className={`h-20 border-e p-1 last:border-e-0 ${day === today ? 'bg-primary/5' : ''}`}>
                        {lesson ? <ClassCell lesson={lesson} showSubject={showSubject} /> : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </NajmScroll>
      </div>

      {/* Phones: one day at a time, today first. */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="grid gap-1 rounded-xl border bg-card p-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }} role="tablist" aria-label={t('classRoutines.ui.fields.teachingDays')}>
          {days.map((day) => (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={day === shownDay}
              onClick={() => setPickedDay(day)}
              className={`flex flex-col items-center rounded-lg py-1.5 text-xs font-semibold ${day === shownDay ? 'bg-primary text-primary-foreground' : day === today ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {routineDayLabel(day, t).slice(0, 3)}
              {day === today ? <span className={`mt-0.5 size-1.5 rounded-full ${day === shownDay ? 'bg-primary-foreground' : 'bg-primary'}`} /> : null}
            </button>
          ))}
        </div>
        {dayLessons.length ? (
          <ol className="flex flex-col gap-2">
            {dayLessons.map(({ slot, lesson }) => (
              <li key={slot.key} className="flex items-stretch gap-3 rounded-xl border bg-card p-2">
                <div className="flex w-12 shrink-0 flex-col justify-center text-xs font-medium tabular-nums text-muted-foreground" dir="ltr">
                  <span>{slot.startTime}</span>
                  <span className="opacity-70">{slot.endTime}</span>
                </div>
                <div className="min-w-0 flex-1"><LessonCard lesson={lesson} showSubject={showSubject} /></div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed bg-card/60 p-6 text-center text-sm text-muted-foreground">
            {t('classRoutines.ui.teacher.noLessonsOnDay')}
          </p>
        )}
      </div>
    </>
  );
}
