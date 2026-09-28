import { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete, own, join, where, when } from '../../auth';
import { assessments, teachers, staff, teacherAssignments } from '../../database/schema';
import { placedOnSourceDate } from '../academicSources/placedOnSourceDate';

export const Assessment = own(assessments)
  .for('teacher',
    join(assessments.teacherAssignmentId, teacherAssignments.id),
    join(teacherAssignments.teacherId, teachers.id),
    join(teachers.staffId, staff.id),
    where(staff.userId),
  );

// The student must have occupied a target section on the assessment date.
const placedOnAssessmentDate = (userId: string, parent: boolean) => placedOnSourceDate(assessments, userId, parent);

export const AssessmentForPlacedStudent = own(assessments)
  .for('student', when((userId: string) => placedOnAssessmentDate(userId, false)));

export const AssessmentForPlacedParent = own(assessments)
  .for('parent', when((userId: string) => placedOnAssessmentDate(userId, true)));

export { Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete };
