import { Err, Service } from '../../najm';
import type { AcademicYearMigrationIssueRepository } from './AcademicYearMigrationIssueRepository';

type MigrationIssue = Awaited<ReturnType<AcademicYearMigrationIssueRepository['findById']>>;

@Service()
export class AcademicYearMigrationIssueValidator {
  ensureReviewable(issue: MigrationIssue) {
    if (!issue) Err(404, 'Migration issue not found');
    if (issue.reviewStatus !== 'open') Err(409, 'Migration issue has already been reviewed');
    return issue;
  }

  ensureConfirmedPlacement(confirmed: boolean) {
    if (!confirmed) Err(409, 'Record a confirmed dated placement for the captured class and section before resolving this issue');
  }

  ensureAttendanceYear(registered: boolean) {
    if (!registered) Err(409, 'Record a supported attendance year before resolving this issue');
  }

  ensureSourceYear(registered: boolean) {
    if (!registered) Err(409, 'Record a supported academic source year before resolving this issue');
  }

  ensureGradeYear(registered: boolean) {
    if (!registered) Err(409, 'Record a supported grade year before resolving this issue');
  }

  ensureReviewSaved(issue: MigrationIssue) {
    if (!issue) Err(409, 'Migration issue was reviewed concurrently');
    return issue;
  }
}
