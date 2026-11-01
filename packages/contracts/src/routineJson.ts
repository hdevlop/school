import { isDateOnly, parseSchoolYearLabel } from './academicYears';
import {
  MAX_ROUTINE_CONTENT_GROUPS,
  MAX_ROUTINE_CONTENT_LABEL_LENGTH,
  ROUTINE_DAYS,
  type RoutineContentGroup,
  type RoutineDay,
} from './routines';

export const MAX_ROUTINE_JSON_BYTES = 5 * 1024 * 1024;
export const MAX_ROUTINE_JSON_ROUTINES = 500;
const MAX_PERIODS = 30;

export type RoutineJsonPeriod = { name: string; startTime: string; endTime: string; type: 'lesson' | 'break' };
/** `period` is the 1-based position in the routine's `periods`, never a database ID. */
export type RoutineJsonLesson = {
  day: RoutineDay;
  period: number;
  subject: string;
  subjectCode?: string | null;
  teacher?: string | null;
  roomNumber?: string | null;
  notes?: string | null;
  contentGroups: RoutineContentGroup[];
};
export type RoutineJsonDuty = { day: RoutineDay; period: number; staff: string; notes?: string | null };
export type RoutineJsonRoutine = {
  className: string;
  sectionName: string;
  name: string;
  periods: RoutineJsonPeriod[];
  lessons: RoutineJsonLesson[];
  duties: RoutineJsonDuty[];
};
/** A school's class timetables, portable between years and schools: names identify classes, subjects and people. */
export type RoutineJson = {
  format: 'school-class-routines';
  version: 1;
  schoolYear: string;
  exportedAt: string;
  routines: RoutineJsonRoutine[];
};

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const onlyKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(key => keys.includes(key));
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const optionalText = (value: unknown, max: number) => value === undefined || value === null || (typeof value === 'string' && value.length <= max);
const time = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const isDay = (value: unknown): value is RoutineDay => (ROUTINE_DAYS as readonly unknown[]).includes(value);
/** Names compare as people read them: trimmed, case and Unicode form ignored. */
export const routineNameKey = (name: string) => name.trim().normalize('NFC').toLocaleLowerCase();

function isContentGroup(value: unknown): value is RoutineContentGroup {
  if (!record(value)) return false;
  const label = (item: unknown) => text(item, MAX_ROUTINE_CONTENT_LABEL_LENGTH);
  if (value.kind === 'fixed') return onlyKeys(value, ['kind', 'label']) && label(value.label);
  return value.kind === 'alternative' && onlyKeys(value, ['kind', 'options']) && Array.isArray(value.options)
    && value.options.length === 2 && value.options.every(label)
    && routineNameKey(value.options[0] as string) !== routineNameKey(value.options[1] as string);
}

function isPeriodList(value: unknown): value is RoutineJsonPeriod[] {
  if (!Array.isArray(value) || !value.length || value.length > MAX_PERIODS) return false;
  let previousEnd = '';
  for (const period of value) {
    if (!record(period) || !onlyKeys(period, ['name', 'startTime', 'endTime', 'type']) || !text(period.name, 80)
      || !time(period.startTime) || !time(period.endTime) || (period.type !== 'lesson' && period.type !== 'break')) return false;
    // The same rules as the layout editor: ordered, no overlap.
    if (period.startTime >= period.endTime || period.startTime < previousEnd) return false;
    previousEnd = period.endTime;
  }
  return value.some(period => period.type === 'lesson');
}

function isRoutine(value: unknown): value is RoutineJsonRoutine {
  if (!record(value) || !onlyKeys(value, ['className', 'sectionName', 'name', 'periods', 'lessons', 'duties'])) return false;
  if (!text(value.className, 200) || !text(value.sectionName, 100) || !text(value.name, 120) || !isPeriodList(value.periods)) return false;
  const periods = value.periods;
  const slot = (day: unknown, period: unknown) => isDay(day) && Number.isInteger(period) && (period as number) >= 1 && (period as number) <= periods.length;
  if (!Array.isArray(value.lessons) || value.lessons.length > ROUTINE_DAYS.length * MAX_PERIODS) return false;
  const lessonSlots = new Set<string>();
  for (const lesson of value.lessons) {
    if (!record(lesson) || !onlyKeys(lesson, ['day', 'period', 'subject', 'subjectCode', 'teacher', 'roomNumber', 'notes', 'contentGroups'])) return false;
    if (!slot(lesson.day, lesson.period) || !text(lesson.subject, 200) || !optionalText(lesson.subjectCode, 50)
      || !optionalText(lesson.teacher, 200) || !optionalText(lesson.roomNumber, 50) || !optionalText(lesson.notes, 500)) return false;
    if (!Array.isArray(lesson.contentGroups) || lesson.contentGroups.length > MAX_ROUTINE_CONTENT_GROUPS || !lesson.contentGroups.every(isContentGroup)) return false;
    const key = `${lesson.day}:${lesson.period}`;
    if (lessonSlots.has(key)) return false;
    lessonSlots.add(key);
  }
  if (!Array.isArray(value.duties) || value.duties.length > ROUTINE_DAYS.length * MAX_PERIODS) return false;
  const dutySlots = new Set<string>();
  for (const duty of value.duties) {
    if (!record(duty) || !onlyKeys(duty, ['day', 'period', 'staff', 'notes'])) return false;
    // Supervision covers a break that holds no lesson.
    if (!slot(duty.day, duty.period) || periods[(duty.period as number) - 1].type !== 'break' || !text(duty.staff, 200) || !optionalText(duty.notes, 500)) return false;
    const key = `${duty.day}:${duty.period}`;
    if (dutySlots.has(key) || lessonSlots.has(key)) return false;
    dutySlots.add(key);
  }
  return true;
}

/** Shared browser/REST file validation; contracts stay free of runtime schema dependencies. */
export function isRoutineJson(value: unknown): value is RoutineJson {
  if (!record(value) || !onlyKeys(value, ['format', 'version', 'schoolYear', 'exportedAt', 'routines'])) return false;
  if (value.format !== 'school-class-routines' || value.version !== 1
    || typeof value.schoolYear !== 'string' || !parseSchoolYearLabel(value.schoolYear)) return false;
  if (typeof value.exportedAt !== 'string' || !/^\d{4}-\d\d-\d\dT([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/.test(value.exportedAt)
    || !isDateOnly(value.exportedAt.slice(0, 10)) || !Number.isFinite(Date.parse(value.exportedAt))) return false;
  if (!Array.isArray(value.routines) || !value.routines.length || value.routines.length > MAX_ROUTINE_JSON_ROUTINES) return false;
  const sections = new Set<string>();
  for (const routine of value.routines) {
    if (!isRoutine(routine)) return false;
    const key = `${routineNameKey(routine.className)}\u0000${routineNameKey(routine.sectionName)}`;
    if (sections.has(key)) return false;
    sections.add(key);
  }
  return true;
}

const clean = (value: string | null | undefined) => value?.trim() || null;

export function normalizeRoutineJson(document: RoutineJson): RoutineJson {
  return {
    ...document,
    routines: document.routines.map(routine => ({
      className: routine.className.trim(),
      sectionName: routine.sectionName.trim(),
      name: routine.name.trim(),
      periods: routine.periods.map(period => ({ ...period, name: period.name.trim() })),
      lessons: routine.lessons.map(lesson => ({
        day: lesson.day,
        period: lesson.period,
        subject: lesson.subject.trim(),
        subjectCode: clean(lesson.subjectCode),
        teacher: clean(lesson.teacher),
        roomNumber: clean(lesson.roomNumber),
        notes: clean(lesson.notes),
        contentGroups: lesson.contentGroups.map(group => group.kind === 'fixed'
          ? { kind: 'fixed' as const, label: group.label.trim() }
          : { kind: 'alternative' as const, options: [group.options[0].trim(), group.options[1].trim()] as [string, string] }),
      })),
      duties: routine.duties.map(duty => ({ day: duty.day, period: duty.period, staff: duty.staff.trim(), notes: clean(duty.notes) })),
    })),
  };
}

export function parseRoutineJson(value: unknown): { success: true; data: RoutineJson } | { success: false } {
  return isRoutineJson(value) ? { success: true, data: normalizeRoutineJson(value) } : { success: false };
}

/** The file's slot for a stored time: "08:30:00" and "08:30" are the same period start. */
export const routineJsonTime = (value: string) => value.slice(0, 5);
