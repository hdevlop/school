import { Err, I18n, Service } from '../../najm';
import type { AcademicYearMigrationIssueRepository } from './AcademicYearMigrationIssueRepository';

type MigrationIssue = Awaited<ReturnType<AcademicYearMigrationIssueRepository['findById']>>;

@Service()
export class AcademicYearMigrationIssueValidator {
  @I18n('migrationIssues.errors') private et!: (key: string) => string;
  ensureReviewable(issue: MigrationIssue) {
    if (!issue) Err(404, this.et('notFound'));
    if (issue.reviewStatus !== 'open') Err(409, this.et('alreadyReviewed'));
    return issue;
  }

  ensureConfirmedPlacement(confirmed: boolean) {
    if (!confirmed) Err(409, this.et('placementRequired'));
  }

  ensureAttendanceYear(registered: boolean) {
    if (!registered) Err(409, this.et('attendanceYearRequired'));
  }

  ensureSourceYear(registered: boolean) {
    if (!registered) Err(409, this.et('sourceYearRequired'));
  }

  ensureGradeYear(registered: boolean) {
    if (!registered) Err(409, this.et('gradeYearRequired'));
  }

  ensureReviewSaved(issue: MigrationIssue) {
    if (!issue) Err(409, this.et('reviewedConcurrently'));
    return issue;
  }
}
