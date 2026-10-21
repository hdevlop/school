type TeachingAssignment = {
  classId: string;
  sectionIds: string[];
  subjectIds: string[];
};

/** The API requires a subject assignment in every targeted section. */
export function eligibleAssessmentTeachers<T extends { assignments?: TeachingAssignment[] }>(
  teachers: T[],
  classId: string,
  sectionIds: string[],
  subjectId: string,
): T[] {
  if (!classId || !subjectId || !sectionIds.length) return [];
  return teachers.filter((teacher) => sectionIds.every((sectionId) =>
    teacher.assignments?.some((assignment) => assignment.classId === classId
      && assignment.sectionIds.includes(sectionId)
      && assignment.subjectIds.includes(subjectId)),
  ));
}
