import { isDateOnly, parseSchoolYearLabel } from './academicYears';
import { REVISION_LANGUAGES } from './assessmentPlanning';
import { examPlanningMonths, type ExamPlanningClass, type ExamPlanningEntry } from './examPlanning';

export const MAX_EXAM_PLANNING_JSON_BYTES = 5 * 1024 * 1024;
export type ExamPlanningJson = {
  format: 'school-exam-planning';
  version: 1;
  schoolYear: string;
  exportedAt: string;
  classes: Omit<ExamPlanningClass, 'id'>[];
};

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const onlyKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(key => keys.includes(key));
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;
const classNameKey = (name: string) => name.trim().normalize('NFC').toLowerCase();

export function isExamPlanningEntry(value: unknown): value is ExamPlanningEntry {
  // `language` is no longer stored: saved plans and older exports may still carry it, and it is dropped.
  if (!record(value) || !onlyKeys(value, ['id', 'date', 'subject', 'language', 'lessons'])) return false;
  return text(value.id, 100) && typeof value.date === 'string' && isDateOnly(value.date)
    && typeof value.subject === 'string' && text(value.subject.trim(), 120)
    && (!('language' in value) || REVISION_LANGUAGES.some(language => language === value.language))
    && Array.isArray(value.lessons) && value.lessons.length <= 40
    && Array.from(value.lessons).every(lesson => typeof lesson === 'string' && text(lesson.trim(), 500));
}

export function normalizeExamPlanningEntry(entry: ExamPlanningEntry): ExamPlanningEntry {
  return { id: entry.id, date: entry.date, subject: entry.subject.trim(), lessons: entry.lessons.map(lesson => lesson.trim()) };
}

export function isExamPlanningMonth(month: string, entries: unknown): entries is ExamPlanningEntry[] {
  if (!monthPattern.test(month) || !Array.isArray(entries) || entries.length > 200) return false;
  if (!Array.from(entries).every(isExamPlanningEntry)) return false;
  return entries.every(entry => entry.date.startsWith(`${month}-`))
    && new Set(entries.map(entry => entry.id)).size === entries.length;
}

/** Shared browser/REST file validation; contracts stay free of runtime schema dependencies. */
export function isExamPlanningJson(value: unknown): value is ExamPlanningJson {
  if (!record(value) || !onlyKeys(value, ['format', 'version', 'schoolYear', 'exportedAt', 'classes'])) return false;
  if (value.format !== 'school-exam-planning' || value.version !== 1
    || typeof value.schoolYear !== 'string' || !parseSchoolYearLabel(value.schoolYear)) return false;
  if (typeof value.exportedAt !== 'string' || !/^\d{4}-\d\d-\d\dT([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/.test(value.exportedAt)
    || !isDateOnly(value.exportedAt.slice(0, 10)) || !Number.isFinite(Date.parse(value.exportedAt))) return false;
  if (!Array.isArray(value.classes) || !value.classes.length || value.classes.length > 300) return false;
  const allowedMonths = new Set(examPlanningMonths(value.schoolYear));
  const classNames = new Set<string>();
  for (const cls of value.classes) {
    // Accept IDs from older exports, but class names alone identify imported classes.
    if (!record(cls) || !onlyKeys(cls, ['id', 'name', 'visible', 'months']) || ('id' in cls && !text(cls.id, 100))
      || typeof cls.name !== 'string' || !text(cls.name.trim(), 200) || typeof cls.visible !== 'boolean' || !record(cls.months)) return false;
    const name = classNameKey(cls.name);
    if (classNames.has(name)) return false;
    classNames.add(name);
    for (const [month, entries] of Object.entries(cls.months)) {
      if (!allowedMonths.has(month) || !isExamPlanningMonth(month, entries)) return false;
    }
  }
  return true;
}

/** Included months replace their entries; omitted months are preserved on import. */
export function normalizeExamPlanningJson(document: ExamPlanningJson): ExamPlanningJson {
  return { ...document, classes: document.classes.map(cls => ({
    name: cls.name.trim(), visible: cls.visible,
    months: Object.fromEntries(Object.entries(cls.months).map(([month, entries]) => [month, entries.map(normalizeExamPlanningEntry)])),
  })) };
}

/** Resolve names against the destination's scoped catalog; never trust exported database IDs. */
export function resolveExamPlanningClasses(document: ExamPlanningJson, catalog: readonly Pick<ExamPlanningClass, 'id' | 'name'>[]):
  { success: true; classes: ExamPlanningClass[] } | { success: false; error: 'unknownClasses' | 'ambiguousClasses' } {
  const classes: ExamPlanningClass[] = [];
  const matchedIds = new Set<string>();
  for (const cls of document.classes) {
    const matches = catalog.filter(known => classNameKey(known.name) === classNameKey(cls.name));
    if (!matches.length) return { success: false, error: 'unknownClasses' };
    if (matches.length > 1 || matchedIds.has(matches[0].id)) return { success: false, error: 'ambiguousClasses' };
    matchedIds.add(matches[0].id);
    classes.push({ ...cls, id: matches[0].id, name: matches[0].name });
  }
  return { success: true, classes };
}

export function parseExamPlanningJson(value: unknown): { success: true; data: ExamPlanningJson } | { success: false } {
  return isExamPlanningJson(value) ? { success: true, data: normalizeExamPlanningJson(value) } : { success: false };
}
