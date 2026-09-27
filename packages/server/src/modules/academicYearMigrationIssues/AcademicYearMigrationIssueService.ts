import { Err, Service, Transaction } from '../../najm';
import { StudentEnrollmentRepository } from '../studentEnrollments/StudentEnrollmentRepository';
import { AttendanceRepository } from '../attendance/AttendanceRepository';
import { AssessmentRepository } from '../assessments/AssessmentRepository';
import { ExamRepository } from '../exams/ExamRepository';
import { GradeRepository } from '../grades/GradeRepository';
import { AcademicYearMigrationIssueRepository } from './AcademicYearMigrationIssueRepository';
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
    const issue = await this.issues.findById(id);
    if (!issue) Err(404, 'Migration issue not found');
    if (issue!.reviewStatus !== 'open') Err(409, 'Migration issue has already been reviewed');
    if (data.status === 'resolved' && issue!.issueCode === 'unknown_enrollment_date') {
      const classId = issue!.evidence.classId;
      const sectionId = issue!.evidence.sectionId;
      if (issue!.entityType !== 'student' || !issue!.academicYearLabel ||
        !classId || !sectionId ||
        !await this.enrollments.hasConfirmedPlacementInYear(issue!.entityId, issue!.academicYearLabel, classId, sectionId)) {
        Err(409, 'Record a confirmed dated placement for the captured class and section before resolving this issue');
      }
    }
    if (data.status === 'resolved' && issue!.entityType === 'attendance' &&
      (issue!.issueCode === 'unattributed_attendance_year' || issue!.issueCode === 'ambiguous_attendance_year') &&
      !await this.attendance.hasRegisteredYear(issue!.entityId)) {
      Err(409, 'Record a supported attendance year before resolving this issue');
    }
    if (data.status === 'resolved' &&
      (issue!.entityType === 'assessment' || issue!.entityType === 'exam') &&
      (issue!.issueCode === 'unattributed_academic_source_year' || issue!.issueCode === 'ambiguous_academic_source_year') &&
      !await (issue!.entityType === 'assessment' ? this.assessments : this.exams).hasRegisteredYear(issue!.entityId)) {
      Err(409, 'Record a supported academic source year before resolving this issue');
    }
    if (data.status === 'resolved' && issue!.entityType === 'grade' &&
      issue!.issueCode === 'unattributed_grade_year' &&
      !await this.grades.hasRegisteredYear(issue!.entityId)) {
      Err(409, 'Record a supported grade year before resolving this issue');
    }
    const reviewed = await this.issues.review(id, data.status, data.resolutionNote, actorId);
    if (!reviewed) Err(409, 'Migration issue was reviewed concurrently');
    return reviewed;
  }
}
