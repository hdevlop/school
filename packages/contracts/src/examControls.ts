import { examPlanningMonths, examPlanningSemester } from './examPlanning';
import { MASSAR_MAX_EXAMS_PER_TERM, massarPlanningControls } from './massar';

/**
 * A Contrôle of the school year: the days its exams take place, the classes
 * that sit it and the subjects it tests (none listed: every subject, as in
 * primary; collège tests a few subjects at a time). The semester follows from
 * its dates. The school holds as many as it decides; each class numbers its
 * own for each subject in date order, and that number is the Massar Contrôle
 * (fard) its marks fill (`classControlNumber`). A year without any saved
 * Contrôle reads them from Planning's months, as before (`derived`): the first
 * one saved keeps those too.
 */
export type ExamControl = {
  id: string;
  term: 1 | 2;
  dateFrom: string;
  dateTo: string;
  classIds: string[];
  /** The subjects it tests; empty: every subject. */
  subjectIds: string[];
  derived?: boolean;
};

export type ExamControlInput = Pick<ExamControl, 'dateFrom' | 'dateTo' | 'classIds' | 'subjectIds'>;

export const EXAM_CONTROL_PROBLEMS = ['invalidDates', 'outsideYear', 'twoSemesters', 'noClasses', 'overlap'] as const;
export type ExamControlProblem = typeof EXAM_CONTROL_PROBLEMS[number];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (value: string) => DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

type PlanningMonths = Array<{ classId: string; months: Record<string, Array<{ date?: string }>> | null | undefined }>;

/** The last day of a day's month: "2026-11-30" for "2026-11-04". */
export function monthEndOf(day: string) {
  return new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0)).toISOString().slice(0, 10);
}

/**
 * Planning's months, read as Contrôles the old way: each month with exams of a
 * semester is the next one, sat by the classes with exams that month, in every subject.
 */
export function derivedExamControls(plans: PlanningMonths): ExamControl[] {
  return massarPlanningControls(plans).map(control => ({
    id: `derived-${control.term}-${control.exam}`, term: control.term,
    dateFrom: control.examFrom, dateTo: control.examTo, classIds: control.classIds, subjectIds: [], derived: true,
  }));
}

const byDate = (a: ExamControl, b: ExamControl) => a.dateFrom.localeCompare(b.dateFrom) || a.dateTo.localeCompare(b.dateTo) || a.id.localeCompare(b.id);
const everySubject = (control: Pick<ExamControl, 'subjectIds'>) => !control.subjectIds?.length;

/** Whether a Contrôle tests a subject; a null subject stands for any subject no Contrôle names. */
export const controlTests = (control: Pick<ExamControl, 'subjectIds'>, subjectId: string | null) =>
  everySubject(control) || (subjectId != null && control.subjectIds.includes(subjectId));

/** The year's Contrôles: the saved ones once there is any, Planning's months until then. In date order. */
export function yearExamControls(stored: readonly ExamControl[], plans: PlanningMonths): ExamControl[] {
  const controls = stored.length ? stored.map(control => ({ ...control, subjectIds: control.subjectIds ?? [] })) : derivedExamControls(plans);
  return controls.sort(byDate);
}

/**
 * A Contrôle's number for one of its classes in one subject: its place among
 * the Contrôles that class sits in that subject in its semester, in date order
 * (the first is 1). A null subject numbers among the Contrôles of every
 * subject. A Contrôle read from Planning's months keeps its place across the
 * school, as it always had. 0: the Contrôle does not test it there.
 *
 * With `examDays`, a Contrôle of every subject is a subject's fard only where
 * the class has an exam of it: collège examines a few subjects each week, so
 * a subject's first exam is its Fard 1 whichever Contrôle it falls in. Until
 * the class has any exam of the subject in such a Contrôle that semester,
 * every one counts, as before.
 */
export function classControlNumber(controls: readonly ExamControl[], control: ExamControl, classId: string, subjectId: string | null = null, examDays?: ExamDays) {
  let sat = controls.filter(other => other.term === control.term
    && (control.derived ? other.derived : other.classIds.includes(classId) && (subjectId == null ? everySubject(other) : controlTests(other, subjectId))))
    .sort(byDate);
  // A subject the class has exams of in its Contrôles of every subject counts only those it is examined in.
  if (!control.derived && subjectId != null) {
    const days = [...(examDays?.get(classId)?.get(subjectId) ?? [])];
    const examined = (other: ExamControl) => days.some(day => other.dateFrom <= day && day <= other.dateTo);
    if (sat.some(other => everySubject(other) && examined(other))) sat = sat.filter(other => !everySubject(other) || examined(other));
  }
  return sat.findIndex(other => other.id === control.id) + 1;
}

/** The days each class has a planned exam of each subject: class id → subject id → days. */
export type ExamDays = ReadonlyMap<string, ReadonlyMap<string, ReadonlySet<string>>>;

/** The year's planned exams (those Planning wrote to the Exams page) as `ExamDays`. */
export function examDaysOf(exams: Iterable<{ classId: string | null; subjectId: string | null; date: string | Date }>): ExamDays {
  const out = new Map<string, Map<string, Set<string>>>();
  for (const exam of exams) {
    if (!exam.classId || !exam.subjectId) continue;
    const day = (exam.date instanceof Date ? exam.date.toISOString() : String(exam.date)).slice(0, 10);
    const bySubject = out.get(exam.classId) ?? new Map<string, Set<string>>();
    bySubject.set(exam.subjectId, new Set([...(bySubject.get(exam.subjectId) ?? []), day]));
    out.set(exam.classId, bySubject);
  }
  return out;
}

/**
 * A Contrôle's numbers across its classes (or those of `classIds` among them)
 * and its subjects, smallest first: usually one.
 */
export function controlNumbers(controls: readonly ExamControl[], control: ExamControl, classIds?: readonly string[]) {
  if (control.derived) return [classControlNumber(controls, control, '')];
  const mine = classIds ? control.classIds.filter(id => classIds.includes(id)) : [];
  const ids = mine.length ? mine : control.classIds;
  const subjects: Array<string | null> = everySubject(control) ? [null] : control.subjectIds;
  return [...new Set(ids.flatMap(id => subjects.map(subjectId => classControlNumber(controls, control, id, subjectId))))]
    .filter(number => number > 0).sort((a, b) => a - b);
}

/**
 * What Massar's marks follow: for each Contrôle, the Massar Contrôle each of
 * its classes fills in each subject (its number there, up to the three Massar
 * holds a semester; later ones stay the school's), with its days and the
 * window its exams are linked in (`linkFrom`–`linkTo`), each subject's fards
 * following its exams (`examDays`, see `classControlNumber`). `subjectId` null
 * stands for every subject no Contrôle of that class names. A saved Contrôle
 * links its own days; one read from Planning's months links its whole month,
 * as the link always did.
 */
export function massarExamControls(controls: readonly ExamControl[], examDays?: ExamDays) {
  // The subjects each class's Contrôles of a semester name, numbered on their own.
  const named = new Map<string, Set<string>>();
  for (const control of controls) for (const classId of control.classIds) {
    const key = `${control.term}:${classId}`;
    named.set(key, new Set([...(named.get(key) ?? []), ...(control.subjectIds ?? [])]));
  }
  return controls.flatMap(control => {
    const byNumber = new Map<string, { exam: number; subjectId: string | null; classIds: string[] }>();
    for (const classId of control.classIds) {
      const subjects: Array<string | null> = everySubject(control)
        ? [...new Set([null, ...(named.get(`${control.term}:${classId}`) ?? []), ...(examDays?.get(classId)?.keys() ?? [])])] : control.subjectIds;
      for (const subjectId of subjects) {
        const exam = classControlNumber(controls, control, classId, subjectId, examDays);
        const key = `${exam}:${subjectId ?? ''}`;
        const found = byNumber.get(key) ?? { exam, subjectId, classIds: [] };
        found.classIds.push(classId);
        byNumber.set(key, found);
      }
    }
    return [...byNumber.values()].filter(({ exam }) => exam >= 1 && exam <= MASSAR_MAX_EXAMS_PER_TERM).map(({ exam, subjectId, classIds }) => ({
      term: control.term, exam, subjectId, examFrom: control.dateFrom, examTo: control.dateTo, classIds,
      linkFrom: control.derived ? `${control.dateFrom.slice(0, 7)}-01` : control.dateFrom,
      linkTo: control.derived ? monthEndOf(control.dateTo) : control.dateTo,
    }));
  });
}

export type MassarControl = ReturnType<typeof massarExamControls>[number];

/** The year's Massar Contrôles, from the saved Contrôles or, until one is saved, Planning's months. */
export const massarControlsOfYear = (stored: readonly ExamControl[], plans: PlanningMonths, examDays?: ExamDays) => massarExamControls(yearExamControls(stored, plans), examDays);

/**
 * The Contrôle a Massar grid stands for: the one its class sits as that
 * Massar Contrôle in its subject. A subject a class's Contrôles name follows
 * them; any other subject follows the Contrôles of every subject.
 */
export function massarControlFor(controls: readonly MassarControl[], grid: { term: number; exam: number; classId: string | null; subjectId: string | null }) {
  if (!grid.classId) return undefined;
  const forClass = controls.filter(control => control.term === grid.term && control.classIds.includes(grid.classId!));
  const own = grid.subjectId != null && forClass.some(control => control.subjectId === grid.subjectId);
  return forClass.find(control => control.exam === grid.exam && control.subjectId === (own ? grid.subjectId : null));
}

/**
 * One entry per Massar Contrôle (semester and number), as Massar's own pages
 * list them: classes and subjects may sit the same Massar Contrôle on
 * different days, so it runs from the first of those days to the last, for
 * all their classes.
 */
export function mergedMassarControls(controls: readonly MassarControl[]) {
  const merged = new Map<string, MassarControl>();
  for (const control of controls) {
    const key = `${control.term}:${control.exam}`;
    const found = merged.get(key);
    merged.set(key, found ? {
      ...found,
      examFrom: found.examFrom < control.examFrom ? found.examFrom : control.examFrom,
      examTo: found.examTo > control.examTo ? found.examTo : control.examTo,
      linkFrom: found.linkFrom < control.linkFrom ? found.linkFrom : control.linkFrom,
      linkTo: found.linkTo > control.linkTo ? found.linkTo : control.linkTo,
      classIds: [...new Set([...found.classIds, ...control.classIds])].sort(),
    } : { ...control, subjectId: null, classIds: [...control.classIds].sort() });
  }
  return [...merged.values()].sort((a, b) => a.term - b.term || a.exam - b.exam);
}

/**
 * The days a teacher's new exam may take in a class and subject: the first day
 * of each Contrôle the class sits in that subject. A Contrôle read from
 * Planning's months opens to every class, as it always did.
 */
export function controlFirstDays(controls: readonly ExamControl[], classId: string, subjectId: string | null = null): Set<string> {
  return new Set(controls.filter(control => control.derived || (control.classIds.includes(classId) && controlTests(control, subjectId))).map(control => control.dateFrom));
}

export const examControlTerm = (dateFrom: string): 1 | 2 => examPlanningSemester(dateFrom.slice(0, 7));

/**
 * Why a Contrôle cannot be saved, or null. Its dates lie in one semester of the
 * year, and a class sits at most one Contrôle of a subject on any day (two
 * Contrôles of different subjects may share days): `others` are the year's
 * other saved Contrôles. How many there are is the school's choice.
 */
export function examControlProblem(candidate: ExamControlInput, others: readonly ExamControl[], academicYear: string): ExamControlProblem | null {
  if (!isDay(candidate.dateFrom) || !isDay(candidate.dateTo) || candidate.dateFrom > candidate.dateTo) return 'invalidDates';
  const months = examPlanningMonths(academicYear);
  if (!months.includes(candidate.dateFrom.slice(0, 7)) || !months.includes(candidate.dateTo.slice(0, 7))) return 'outsideYear';
  const term = examControlTerm(candidate.dateFrom);
  if (examControlTerm(candidate.dateTo) !== term) return 'twoSemesters';
  if (!candidate.classIds.length) return 'noClasses';
  const shareSubject = (other: ExamControl) => everySubject(other) || everySubject(candidate) || other.subjectIds.some(id => candidate.subjectIds.includes(id));
  const shared = others.filter(other => other.classIds.some(id => candidate.classIds.includes(id)) && shareSubject(other));
  if (shared.some(other => other.dateFrom <= candidate.dateTo && candidate.dateFrom <= other.dateTo)) return 'overlap';
  return null;
}
