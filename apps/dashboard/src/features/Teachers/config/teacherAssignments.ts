import type { TeacherAssignmentFormValues } from './teacherSchemas';
import { schoolCycleForLevel } from '@sms/contracts';

/** Primary science uses SCI; SVT remains available to secondary classes. */
export function subjectsForTeacherClass<T extends { id: string; code?: string | null }>(subjects: readonly T[], level?: string | null): T[] {
  const isPrimary = schoolCycleForLevel(level ?? '')?.name === 'Primaire';
  return subjects.filter(subject => !isPrimary || subject.code?.trim().toUpperCase() !== 'SVT');
}

/** Combine sections only when their class and complete subject set match. */
export function groupTeacherAssignments(assignments: readonly TeacherAssignmentFormValues[]): TeacherAssignmentFormValues[] {
  const groups = new Map<string, TeacherAssignmentFormValues>();

  for (const assignment of assignments) {
    const subjectIds = [...new Set(assignment.subjectIds)];
    const key = JSON.stringify([assignment.classId, [...subjectIds].sort()]);
    const existing = groups.get(key);
    if (existing) {
      existing.sectionIds = [...new Set([...existing.sectionIds, ...assignment.sectionIds])];
    } else {
      groups.set(key, {
        classId: assignment.classId,
        sectionIds: [...new Set(assignment.sectionIds)],
        subjectIds,
      });
    }
  }

  return [...groups.values()];
}
