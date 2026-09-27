import { teacherAssignments } from '../teachers/teacherSchema';
import { sections } from '../sections/sectionSchema';
import { classes } from '../classes/classSchema';

// Assessments and exams are the two academic sources a grade is recorded
// against. Both carry the teaching assignment they were set under and the
// sections they target, and both follow the rules below.

export type SourceContext = {
  assignmentSectionId: string | null;
  assignmentClassId: string | null;
  sectionClassId: string | null;
  classAcademicYear: string | null;
  sectionIds: string[] | null;
};

export type SectionContext = { id: string; academicYear: string };

/**
 * Selected next to a source row. The query must left join teacherAssignments
 * on the source's assignment, then sections and classes on that assignment.
 */
export const sourceAssignmentColumns = {
  assignmentSectionId: teacherAssignments.sectionId,
  assignmentClassId: teacherAssignments.classId,
  sectionClassId: sections.classId,
  classAcademicYear: classes.academicYear,
};

/** The teacher and subject a grade must match, from the same joins. */
export const sourceTeachingColumns = {
  teacherId: teacherAssignments.teacherId,
  subjectId: teacherAssignments.subjectId,
};

export function targetSectionIds(source: SourceContext) {
  const listed = Array.isArray(source.sectionIds)
    ? source.sectionIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  return listed.length ? [...new Set(listed)] : source.assignmentSectionId ? [source.assignmentSectionId] : [];
}

export function academicSourceContextIssue(
  source: SourceContext,
  sections: Map<string, SectionContext>,
  yearLabel: string,
) {
  if (!source.assignmentSectionId || !source.assignmentClassId || !source.sectionClassId) {
    return 'missing-assignment-context';
  }
  if (source.assignmentClassId !== source.sectionClassId) return 'assignment-class-mismatch';
  if (source.classAcademicYear !== yearLabel) return 'assignment-year-mismatch';
  const targets = targetSectionIds(source);
  if (!targets.includes(source.assignmentSectionId)) return 'assignment-section-not-targeted';
  if (targets.some((id) => !sections.has(id))) return 'missing-target-section';
  if (targets.some((id) => sections.get(id)?.academicYear !== yearLabel)) return 'target-year-mismatch';
  return null;
}
