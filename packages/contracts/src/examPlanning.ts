import { foldSubjectName } from './subjectNames';

export type ExamPlanningEntry = {
  id: string;
  date: string;
  subject: string;
  lessons: string[];
  /** From "08:30" to "09:30"; none until the school sets them. */
  startTime?: string;
  endTime?: string;
};

/** How long an exam lasts while Planning gives it no time. */
export const PLANNING_DEFAULT_DURATION = 60;

const minutesOf = (time: string) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };

/** "09:30": a time some minutes later, within the day. */
export function addPlanningMinutes(time: string, minutes: number) {
  const total = Math.min(minutesOf(time) + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Minutes from start to end, or the default while either is missing. */
export function planningDuration(startTime?: string | null, endTime?: string | null) {
  return startTime && endTime ? minutesOf(endTime) - minutesOf(startTime) : PLANNING_DEFAULT_DURATION;
}

export type ExamPlanningClass = {
  id: string;
  name: string;
  visible: boolean;
  months: Record<string, ExamPlanningEntry[]>;
};

/** The school year starts in September: September–January is semester one. */
export function examPlanningSemester(month: string): 1 | 2 {
  const number = Number(month.slice(5, 7));
  return number >= 9 || number === 1 ? 1 : 2;
}

export function examPlanningMonths(academicYear: string): string[] {
  const start = Number(academicYear.slice(0, 4));
  if (!Number.isInteger(start) || start < 1900) return [];
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(start, 8 + index, 1));
    return date.toISOString().slice(0, 7);
  });
}

/**
 * The subject a Planning name is an exam of: its sub-subject's subject, or
 * the subject of that name; null while Subjects has neither.
 */
export function resolvePlanningSubject(name: string, subSubjects: ReadonlyArray<{ subjectId: string; name: string }>, subjects: ReadonlyArray<{ id: string; name: string; nameAr?: string | null }>) {
  const folded = foldSubjectName(name);
  return subSubjects.find(part => foldSubjectName(part.name) === folded)?.subjectId
    ?? subjects.find(subject => foldSubjectName(subject.name) === folded || (!!subject.nameAr && foldSubjectName(subject.nameAr) === folded))?.id ?? null;
}

/** A level is a class name (CE2, 3APG), compared without case or outer spaces. */
export const sameSubjectLevel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** A level's own sub-subject list for a subject; a level without one uses the school's list. */
export type SubjectLevelList = { subjectId: string; level: string; names: string[] };

/**
 * The subjects as one level (class name) is taught them: each subject's
 * sub-subjects are the level's own list when it has one, the school's otherwise.
 */
export function subjectsForLevel<S extends { id: string; subSubjects: ReadonlyArray<{ name: string }> }>(subjects: readonly S[], levels: readonly SubjectLevelList[], level: string): Array<S & { subSubjects: Array<{ name: string }> }> {
  return subjects.map(subject => {
    const own = levels.find(list => list.subjectId === subject.id && sameSubjectLevel(list.level, level));
    return { ...subject, subSubjects: own ? own.names.map(name => ({ name })) : subject.subSubjects.map(part => ({ name: part.name })) };
  });
}

const sameEntry = (a: ExamPlanningEntry, b: ExamPlanningEntry) => a.date === b.date && a.subject.trim() === b.subject.trim()
  && (a.startTime ?? null) === (b.startTime ?? null) && (a.endTime ?? null) === (b.endTime ?? null)
  && a.lessons.length === b.lessons.length && a.lessons.every((line, index) => line.trim() === b.lessons[index]?.trim());

/**
 * What saving a month changes: every entry added or removed, and both the
 * old and the new version of an entry edited. An entry left as it was is
 * not a change, wherever it sits in the list.
 */
export function changedPlanningEntries(before: readonly ExamPlanningEntry[], after: readonly ExamPlanningEntry[]): ExamPlanningEntry[] {
  const previous = new Map(before.map(entry => [entry.id, entry])), next = new Map(after.map(entry => [entry.id, entry]));
  const changed: ExamPlanningEntry[] = [];
  for (const entry of before) { const now = next.get(entry.id); if (!now || !sameEntry(entry, now)) changed.push(entry); }
  for (const entry of after) { const was = previous.get(entry.id); if (!was || !sameEntry(was, entry)) changed.push(entry); }
  return changed;
}
