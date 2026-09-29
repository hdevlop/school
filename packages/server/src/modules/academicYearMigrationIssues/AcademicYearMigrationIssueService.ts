import { Service, Transaction } from '../../najm';
import { StudentEnrollmentRepository } from '../studentEnrollments/StudentEnrollmentRepository';
import { AttendanceRepository } from '../attendance/AttendanceRepository';
import { AssessmentRepository } from '../assessments/AssessmentRepository';
import { ExamRepository } from '../exams/ExamRepository';
import { GradeRepository } from '../grades/GradeRepository';
import { AcademicYearMigrationIssueRepository } from './AcademicYearMigrationIssueRepository';
import { AcademicYearMigrationIssueValidator } from './AcademicYearMigrationIssueValidator';
import type { ListMigrationIssuesDto, ReviewMigrationIssueDto } from './AcademicYearMigrationIssueDto';

// A resolution is accepted only once the module that owns the record shows
// the fix was recorded there; this module reads no other module's tables.
@Service()
export class AcademicYearMigrationIssueService {
  constructor(
    private issues: AcademicYearMigrationIssueRepository,
    private enrollments: StudentEnrollmentRepository,
    private attendance: AttendanceRepository,
    private assessments: AssessmentRepository,
    private exams: ExamRepository,
    private grades: GradeRepository,
    private validator: AcademicYearMigrationIssueValidator,
  ) {}

  async list(query: ListMigrationIssuesDto) {
    const [rows, openCount] = await Promise.all([
      this.issues.list(query.status, query.limit, query.cursor),
      this.issues.countOpen(),
    ]);
    const items = rows.slice(0, query.limit);
    return {
      items,
      openCount,
      nextCursor: rows.length > query.limit ? items.at(-1)?.id ?? null : null,
    };
  }

  @Transaction()
  async review(id: string, data: ReviewMigrationIssueDto, actorId: string) {
    const issue = this.validator.ensureReviewable(await this.issues.findById(id));
    if (data.status === 'resolved' && issue!.issueCode === 'unknown_enrollment_date') {
      const classId = issue!.evidence.classId;
      const sectionId = issue!.evidence.sectionId;
      this.validator.ensureConfirmedPlacement(issue.entityType === 'student' && !!issue.academicYearLabel &&
        !!classId && !!sectionId &&
        await this.enrollments.hasConfirmedPlacementInYear(issue.entityId, issue.academicYearLabel, classId, sectionId));
    }
    if (data.status === 'resolved' && issue!.entityType === 'attendance' &&
      (issue!.issueCode === 'unattributed_attendance_year' || issue!.issueCode === 'ambiguous_attendance_year')) {
      this.validator.ensureAttendanceYear(await this.attendance.hasRegisteredYear(issue.entityId));
    }
    if (data.status === 'resolved' &&
      (issue!.entityType === 'assessment' || issue!.entityType === 'exam') &&
      (issue!.issueCode === 'unattributed_academic_source_year' || issue!.issueCode === 'ambiguous_academic_source_year')) {
      this.validator.ensureSourceYear(await (issue.entityType === 'assessment' ? this.assessments : this.exams).hasRegisteredYear(issue.entityId));
    }
    if (data.status === 'resolved' && issue!.entityType === 'grade' &&
      issue!.issueCode === 'unattributed_grade_year') {
      this.validator.ensureGradeYear(await this.grades.hasRegisteredYear(issue.entityId));
    }
    const reviewed = await this.issues.review(id, data.status, data.resolutionNote, actorId);
    return this.validator.ensureReviewSaved(reviewed);
  }
}
