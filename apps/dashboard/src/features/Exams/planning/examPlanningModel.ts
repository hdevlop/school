import { classControlNumber, controlNumbers, examPlanningMonths, examPlanningSemester, resolvePlanningSubject, type ExamControl, type ExamPlanningClass, type ExamPlanningEntry } from '@sms/contracts';
import type { PlanningAssessment } from '@/features/Assessments/planning/planningModel';

export type PlanningDateRange = { from: string; to: string };
export type ExamPlanningDrafts = Record<string, Record<string, ExamPlanningEntry[]>>;
export type PlanningEntrySelection = { classId: string; month: string; entryId: string };
/** What this account may plan in each class (GET /exam-planning/subjects): null is every subject. */
export type PlannableSubjects = Record<string, string[]> | null;
type PlanningSubjectCatalog = ReadonlyArray<{ id: string; name: string; nameAr?: string | null; subSubjects: ReadonlyArray<{ name: string }> }>;

/**
 * The subjects a planner may plan in one class: null for every subject (the
 * school-wide roles), a teacher's own otherwise, none until the list loads.
 */
export function plannableInClass(plannable: PlannableSubjects | undefined, classId: string): ReadonlySet<string> | null {
  if (plannable === null) return null;
  return new Set(plannable?.[classId] ?? []);
}

/**
 * Whether a planner may change an entry: one of their subjects, or a new
 * entry with no subject picked yet. The server checks the same rule on save
 * (ExamPlanningValidator.ensureMayChange).
 */
export function mayPlanEntry(allowed: ReadonlySet<string> | null, subjects: PlanningSubjectCatalog | undefined, subject: string) {
  if (!allowed || !subject.trim()) return true;
  const list = subjects ?? [];
  const subjectId = resolvePlanningSubject(subject.trim(), list.flatMap(item => item.subSubjects.map(part => ({ subjectId: item.id, name: part.name }))), list);
  return !!subjectId && allowed.has(subjectId);
}

/** Like `dir="auto"`, the first letter decides: Arabic text gets the Arabic font and right-to-left layout. */
export function planningTextLanguage(text: string | readonly string[]): 'ar' | 'fr' {
  const letter = (typeof text === 'string' ? text : text.join('\n')).match(/\p{L}/u)?.[0];
  return letter && /\p{Script=Arabic}/u.test(letter) ? 'ar' : 'fr';
}

export function planningMonthRange(month: string): PlanningDateRange {
  const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0));
  return { from: `${month}-01`, to: lastDay.toISOString().slice(0, 10) };
}

export function initialPlanningMonth(classes: ExamPlanningClass[], today: string, year: string): string {
  const months = examPlanningMonths(year);
  const current = months.includes(today.slice(0, 7)) ? today.slice(0, 7) : months[0] ?? today.slice(0, 7);
  const populated = months.filter(month => classes.some(cls => cls.months[month]?.length));
  return populated.includes(current) || !populated.length ? current : populated.reduce((best, month) =>
    Math.abs(Date.parse(`${month}-01`) - Date.parse(`${current}-01`)) < Math.abs(Date.parse(`${best}-01`) - Date.parse(`${current}-01`)) ? month : best);
}

export function examPlanningEntries(cls: ExamPlanningClass, range: PlanningDateRange, drafts: ExamPlanningDrafts = {}): ExamPlanningEntry[] {
  return Object.values({ ...cls.months, ...drafts[cls.id] }).flat()
    .filter(entry => entry.date >= range.from && entry.date <= range.to)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Editing one month preserves all other months, including hidden entries. */
export function updatePlanningMonthDraft(drafts: ExamPlanningDrafts, cls: ExamPlanningClass, month: string, entries: ExamPlanningEntry[]): ExamPlanningDrafts {
  const months = { ...drafts[cls.id], [month]: entries };
  if (JSON.stringify(entries) === JSON.stringify(cls.months[month] ?? [])) delete months[month];
  const next = { ...drafts, [cls.id]: months };
  if (!Object.keys(months).length) delete next[cls.id];
  return next;
}

/**
 * The Contrôle numbers of the exams shown: each exam's own Contrôle (its class
 * sits it and its day falls in it), numbered for that class.
 */
export function examPlanningControlNumbers(controls: readonly ExamControl[], records: ReadonlyArray<{ date: string; class?: { id: string } }>): number[] {
  const numbers = records.flatMap(record => controls
    .filter(control => record.date >= control.dateFrom && record.date <= control.dateTo
      && (control.derived || (!!record.class && control.classIds.includes(record.class.id))))
    .flatMap(control => control.derived ? [classControlNumber(controls, control, '')] : controlNumbers(controls, control, record.class ? [record.class.id] : undefined)));
  return [...new Set(numbers)].filter(number => number > 0).sort((a, b) => a - b);
}

/**
 * The Contrôles a teacher may plan in: those one of their classes sits in a
 * subject they plan there (`plannable`, per class; null or not yet read: any).
 * A Contrôle read from Planning's months is open to every class, as before.
 */
export function teacherControls(controls: readonly ExamControl[], classIds: readonly string[], plannable?: Record<string, string[]> | null): ExamControl[] {
  return controls.filter(control => control.derived || control.classIds.some(id => classIds.includes(id)
    && (!control.subjectIds.length || !plannable || (plannable[id] ?? []).some(subjectId => control.subjectIds.includes(subjectId)))));
}

/**
 * "Contrôle 2 · Semestre 1": the Contrôle's number for its classes (or for
 * `classIds` among them, a teacher's), "Contrôle 1 / 2" when its classes
 * number it differently.
 */
export function examControlLabel(controls: readonly ExamControl[], control: ExamControl, t: (key: string, params?: Record<string, unknown>) => string, classIds?: readonly string[]) {
  const name = t('massar.flow.controlNumber', { exam: controlNumbers(controls, control, classIds).join(' / ') });
  return `${name} · ${t('massar.flow.semester', { term: control.term })}`;
}

/**
 * The list, preview and print document use the same inclusive date range. An
 * exam the school has yet to give its day (`toPlace`) is not printed: its day
 * is only its Contrôle's first until then.
 */
export function examPlanningRecords(classes: ExamPlanningClass[], range: PlanningDateRange, drafts: ExamPlanningDrafts = {}): PlanningAssessment[] {
  return classes.flatMap(cls => examPlanningEntries(cls, range, drafts).filter(entry => !entry.toPlace).map(entry => ({
    id: `${cls.id}:${entry.date.slice(0, 7)}:${entry.id}`, title: entry.subject, date: entry.date, status: 'scheduled', class: { id: cls.id, name: cls.name },
    subject: { id: entry.subject, name: entry.subject },
    planning: { round: '', semester: examPlanningSemester(entry.date), groups: [{ label: '', language: planningTextLanguage(entry.lessons), lessons: entry.lessons }] },
  })));
}

export type PlanningClassGroup = { id: string | null; label: string | null; order: number; classIds: string[] };

/**
 * The planner's classes by cycle, in the school's cycle order, each group's
 * classes in the order given (the sheet sorts them by name first): how a
 * Contrôle's classes are offered and ticked a cycle at a time. Classes with
 * no cycle come last, in a group with no id or label.
 */
export function planningClassGroups(classes: readonly Pick<ExamPlanningClass, 'id' | 'cycle'>[], language: string): PlanningClassGroup[] {
  const found = new Map<string | null, PlanningClassGroup>();
  for (const cls of classes) {
    const id = cls.cycle?.id ?? null;
    const group = found.get(id) ?? (cls.cycle
      ? { id, label: cls.cycle.labels?.[language] || cls.cycle.name, order: cls.cycle.order, classIds: [] }
      : { id: null, label: null, order: Number.POSITIVE_INFINITY, classIds: [] });
    group.classIds.push(cls.id);
    found.set(id, group);
  }
  return [...found.values()].sort((a, b) => a.order - b.order || (a.label ?? '').localeCompare(b.label ?? ''));
}

/**
 * A Contrôle's classes by cycle, for its card: each cycle it reaches, whole
 * or with the classes it takes, in the groups' order. Classes outside the
 * planner's groups are left out (the card says other classes sit it too).
 */
export function controlClassGroups(classIds: readonly string[], groups: readonly PlanningClassGroup[]) {
  const chosen = new Set(classIds);
  return groups.map(group => ({ ...group, classIds: group.classIds.filter(id => chosen.has(id)) }))
    .filter(group => group.classIds.length > 0)
    .map(group => ({ ...group, whole: group.classIds.length === groups.find(other => other.id === group.id)!.classIds.length }));
}

/** A Contrôle's days, both ends counted. */
export function controlDayCount(control: Pick<ExamControl, 'dateFrom' | 'dateTo'>) {
  return Math.round((Date.parse(`${control.dateTo}T00:00:00Z`) - Date.parse(`${control.dateFrom}T00:00:00Z`)) / 86_400_000) + 1;
}

/**
 * The Contrôles the school's Planning picks its period from: those a class
 * sits (every class's for "all classes"), one per set of days, in date order.
 */
export function periodControls(controls: readonly ExamControl[], classId: string | null) {
  const seen = new Set<string>();
  return [...controls].sort((a, b) => a.dateFrom.localeCompare(b.dateFrom) || a.dateTo.localeCompare(b.dateTo) || a.id.localeCompare(b.id))
    .filter(control => {
      if (classId && !control.derived && !control.classIds.includes(classId)) return false;
      const key = `${control.dateFrom}:${control.dateTo}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** The period Planning opens on: the Contrôle under way today, else the next one, else the last. */
export function currentControl<Control extends Pick<ExamControl, 'dateFrom' | 'dateTo'>>(controls: readonly Control[], today: string): Control | undefined {
  return controls.find(control => control.dateFrom <= today && today <= control.dateTo)
    ?? controls.find(control => control.dateFrom > today) ?? controls.at(-1);
}
