import type { TeacherAssignmentFormValues } from './teacherSchemas';
import { schoolCycleForLevel } from '@sms/contracts';

/** What the API stores and returns: one class, its sections, the subjects taught there. */
export type TeacherAssignmentRow = { classId: string; sectionIds: string[]; subjectIds: string[] };

/** Primary science uses SCI; SVT remains available to secondary classes. */
export function subjectsForTeacherClass<T extends { id: string; code?: string | null }>(subjects: readonly T[], level?: string | null): T[] {
  const isPrimary = schoolCycleForLevel(level ?? '')?.name === 'Primaire';
  return subjects.filter(subject => !isPrimary || subject.code?.trim().toUpperCase() !== 'SVT');
}

/** Subjects that may be taught in every one of the chosen classes. */
export function subjectsForTeacherClasses<T extends { id: string; code?: string | null }>(subjects: readonly T[], levels: readonly (string | null | undefined)[]): T[] {
  return levels.reduce<T[]>((offered, level) => subjectsForTeacherClass(offered, level), [...subjects]);
}

/*
 * One assignment line may cover several classes. A section is only meaningful
 * inside its class, so the form stores each chosen section with its class:
 * splitting the line back into one row per class then needs no class list, and
 * two classes' sections can never be confused.
 */
const SECTION_KEY_SEPARATOR = '::';

export const teacherSectionKey = (classId: string, sectionId: string) => `${classId}${SECTION_KEY_SEPARATOR}${sectionId}`;

export function parseTeacherSectionKey(key: string): { classId: string; sectionId: string } | null {
  const at = key.indexOf(SECTION_KEY_SEPARATOR);
  if (at <= 0 || at + SECTION_KEY_SEPARATOR.length >= key.length) return null;
  return { classId: key.slice(0, at), sectionId: key.slice(at + SECTION_KEY_SEPARATOR.length) };
}

/** The chosen classes that have no chosen section, which the line cannot be saved with. */
export function classesWithoutSection(assignment: Pick<TeacherAssignmentFormValues, 'classIds' | 'sectionIds'>): string[] {
  const covered = new Set(assignment.sectionIds.map(key => parseTeacherSectionKey(key)?.classId));
  return assignment.classIds.filter(classId => !covered.has(classId));
}

const unique = (values: readonly string[]) => [...new Set(values)];

/**
 * Edit defaults: the classes taught the same set of subjects share one line,
 * each keeping exactly its own sections.
 */
export function groupTeacherAssignments(rows: readonly TeacherAssignmentRow[]): TeacherAssignmentFormValues[] {
  const groups = new Map<string, TeacherAssignmentFormValues>();

  for (const row of rows) {
    const subjectIds = unique(row.subjectIds);
    const key = JSON.stringify([...subjectIds].sort());
    const sectionKeys = row.sectionIds.map(sectionId => teacherSectionKey(row.classId, sectionId));
    const existing = groups.get(key);
    if (existing) {
      existing.classIds = unique([...existing.classIds, row.classId]);
      existing.sectionIds = unique([...existing.sectionIds, ...sectionKeys]);
    } else {
      groups.set(key, { classIds: [row.classId], sectionIds: unique(sectionKeys), subjectIds });
    }
  }

  return [...groups.values()];
}

/** What is sent to the API: each line split into one row per class. */
export function expandTeacherAssignments(assignments: readonly TeacherAssignmentFormValues[]): TeacherAssignmentRow[] {
  const rows: TeacherAssignmentRow[] = [];

  for (const assignment of assignments) {
    const sections = assignment.sectionIds.map(parseTeacherSectionKey).filter(section => section !== null);
    for (const classId of unique(assignment.classIds)) {
      const sectionIds = unique(sections.filter(section => section.classId === classId).map(section => section.sectionId));
      // The schema refuses a class with no section; this only keeps a stray one out of the payload.
      if (sectionIds.length > 0) rows.push({ classId, sectionIds, subjectIds: unique(assignment.subjectIds) });
    }
  }

  return rows;
}
