// What a teacher may post homework for, from their own teaching assignments.
// The server takes a subject only when the teacher teaches it in every chosen
// section, so the form offers no more than that. `null` assignments mean the
// viewer is not a teacher: nothing is narrowed (the teacher select does it).

export type TeachingAssignment = {
  classId: string;
  sectionIds?: string[] | null;
  subjectIds?: string[] | null;
};

type Teaching = TeachingAssignment[] | null;

export function taughtClassIds(assignments: Teaching): Set<string> | null {
  if (!assignments) return null;
  return new Set(assignments.map((assignment) => assignment.classId));
}

export function taughtSectionIds(assignments: Teaching, classId: string): Set<string> | null {
  if (!assignments) return null;
  return new Set(assignments
    .filter((assignment) => assignment.classId === classId)
    .flatMap((assignment) => assignment.sectionIds ?? []));
}

/**
 * Subjects taught in every chosen section of the class. With no section chosen
 * yet, any subject taught somewhere in the class; with no class, anywhere.
 */
export function taughtSubjectIds(assignments: Teaching, classId: string, sectionIds: string[]): Set<string> | null {
  if (!assignments) return null;
  const inClass = assignments.filter((assignment) => !classId || assignment.classId === classId);
  const subjectsIn = (sectionId: string) => new Set(inClass
    .filter((assignment) => assignment.sectionIds?.includes(sectionId))
    .flatMap((assignment) => assignment.subjectIds ?? []));
  if (!sectionIds.length) return new Set(inClass.flatMap((assignment) => assignment.subjectIds ?? []));
  const [first, ...rest] = sectionIds.map(subjectsIn);
  return new Set([...first].filter((subjectId) => rest.every((subjects) => subjects.has(subjectId))));
}
