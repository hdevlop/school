import type { CreateAlertDto } from './AlertDto';

type AlertScopeInput = Pick<CreateAlertDto,
  'type' | 'studentId' | 'classId' | 'teacherId' | 'subjectId'
> & { teacherAssignmentId?: string | null };

/**
 * New Alert attribution. An academic Alert needs a registered year even if it
 * addresses everybody. System notices are shared school state. An emergency
 * becomes year-owned only when it names an academic target.
 *
 * Existing rows without a reliable year stay unresolved until reviewed; this
 * function must not be used to backfill them from createdAt or a current link.
 */
export function alertYearScope(input: AlertScopeInput): 'year' | 'shared' | 'invalid' {
  const hasAcademicTarget = Boolean(input.studentId || input.classId || input.teacherAssignmentId);

  if (input.type === 'system') {
    if (hasAcademicTarget || input.teacherId || input.subjectId) return 'invalid';
    return 'shared';
  }

  if (input.type === 'emergency' && !hasAcademicTarget) return 'shared';

  return 'year';
}
