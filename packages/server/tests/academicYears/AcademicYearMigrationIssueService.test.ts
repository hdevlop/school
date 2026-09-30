import { describe, expect, it } from 'bun:test';
import { AcademicYearMigrationIssueService } from '../../src/modules/academicYearMigrationIssues/AcademicYearMigrationIssueService';
import { AcademicYearMigrationIssueValidator } from '../../src/modules/academicYearMigrationIssues/AcademicYearMigrationIssueValidator';
import { withEnglishMessages } from '../support/englishMessages';

type Owners = Partial<Record<'enrollments' | 'attendance' | 'assessments' | 'exams' | 'grades', Record<string, unknown>>>;

// Each resolution check is answered by the module that owns the record.
function reviewService(issues: Record<string, unknown>, owners: Owners = {}) {
  return new AcademicYearMigrationIssueService(
    issues as any,
    (owners.enrollments ?? {}) as any,
    (owners.attendance ?? {}) as any,
    (owners.assessments ?? {}) as any,
    (owners.exams ?? {}) as any,
    (owners.grades ?? {}) as any,
    withEnglishMessages(new AcademicYearMigrationIssueValidator()),
  );
}

function build(hasEnrollment: boolean) {
  const writes: string[] = [];
  const issue = {
    id: 'issue-1', entityType: 'student', entityId: 'student-1',
    issueCode: 'unknown_enrollment_date', academicYearLabel: '2025-2026',
    evidence: { classId: 'class-old', sectionId: 'section-old' },
    reviewStatus: 'open',
  };
  const issues = {
    findById: async () => issue,
    review: async (_id: string, status: string) => {
      writes.push(status);
      return { ...issue, reviewStatus: status };
    },
  };
  const enrollments = {
    hasConfirmedPlacementInYear: async (...args: unknown[]) => {
      expect(args).toEqual(['student-1', '2025-2026', 'class-old', 'section-old']);
      return hasEnrollment;
    },
  };
  return { service: reviewService(issues, { enrollments }), writes };
}

describe('migration issue review', () => {
  it('returns a bounded page and a cursor only when more issues exist', async () => {
    const seen: unknown[] = [];
    const service = reviewService({
      list: async (...args: unknown[]) => {
        seen.push(...args);
        return [{ id: 'issue-1' }, { id: 'issue-2' }, { id: 'issue-3' }];
      },
      countOpen: async () => 7,
    });
    const page = await service.list({ status: 'open', limit: 2, cursor: 'issue-0' });
    expect(seen).toEqual(['open', 2, 'issue-0']);
    expect(page.items.map((issue) => issue.id)).toEqual(['issue-1', 'issue-2']);
    expect(page.nextCursor).toBe('issue-2');
    expect(page.openCount).toBe(7);
  });

  it('keeps an unknown placement date open until a dated enrollment exists', async () => {
    const { service, writes } = build(false);
    await expect(service.review('issue-1', {
      status: 'resolved', resolutionNote: 'Confirmed against the original class register',
    }, 'admin-1')).rejects.toThrow();
    expect(writes).toEqual([]);
  });

  it('accepts a resolution after the dated enrollment was recorded', async () => {
    const { service, writes } = build(true);
    await service.review('issue-1', {
      status: 'resolved', resolutionNote: 'Confirmed against the original class register',
    }, 'admin-1');
    expect(writes).toEqual(['resolved']);
  });

  for (const issueCode of ['unattributed_attendance_year', 'ambiguous_attendance_year']) {
    it(`keeps ${issueCode} open until the attendance year is recorded`, async () => {
      const writes: string[] = [];
      let hasYear = false;
      const issue = {
        id: 'issue-attendance', entityType: 'attendance', entityId: 'attendance-1',
        issueCode, reviewStatus: 'open', evidence: {}, academicYearLabel: '',
      };
      const service = reviewService({
        findById: async () => issue,
        review: async (_id: string, status: string) => {
          writes.push(status);
          return { ...issue, reviewStatus: status };
        },
      }, { attendance: { hasRegisteredYear: async () => hasYear } });
      const decision = { status: 'resolved' as const, resolutionNote: 'Confirmed against the source attendance register' };
      await expect(service.review(issue.id, decision, 'admin-1')).rejects.toThrow();
      expect(writes).toEqual([]);
      hasYear = true;
      await service.review(issue.id, decision, 'admin-1');
      expect(writes).toEqual(['resolved']);
    });
  }

  it('allows a documented dismissal while leaving attendance attribution unchanged', async () => {
    const writes: string[] = [];
    const issue = {
      id: 'issue-attendance', entityType: 'attendance', entityId: 'attendance-1',
      issueCode: 'unattributed_attendance_year', reviewStatus: 'open', evidence: {}, academicYearLabel: '',
    };
    const service = reviewService({
      findById: async () => issue,
      review: async (_id: string, status: string) => {
        writes.push(status);
        return { ...issue, reviewStatus: status };
      },
    }, { attendance: { hasRegisteredYear: async () => { throw new Error('should not check a dismissal'); } } });
    await service.review(issue.id, {
      status: 'dismissed', resolutionNote: 'Source register was unavailable; retain this event without a year',
    }, 'admin-1');
    expect(writes).toEqual(['dismissed']);
  });

  for (const entityType of ['assessment', 'exam'] as const) {
    it(`requires a recorded year before resolving an ${entityType} source issue`, async () => {
      const writes: string[] = [];
      let registered = false;
      const issue = {
        id: `issue-${entityType}`, entityType, entityId: `${entityType}-1`,
        issueCode: 'unattributed_academic_source_year', reviewStatus: 'open',
        evidence: {}, academicYearLabel: '',
      };
      const owner = {
        hasRegisteredYear: async (id: string) => {
          expect(id).toBe(issue.entityId);
          return registered;
        },
      };
      const otherSource = { hasRegisteredYear: async () => { throw new Error('asked the wrong source module'); } };
      const service = reviewService({
        findById: async () => issue,
        review: async (_id: string, status: string) => {
          writes.push(status);
          return { ...issue, reviewStatus: status };
        },
      }, entityType === 'assessment'
        ? { assessments: owner, exams: otherSource }
        : { assessments: otherSource, exams: owner });
      const decision = {
        status: 'resolved' as const,
        resolutionNote: 'Reviewed the teaching assignment and source register',
      };
      await expect(service.review(issue.id, decision, 'admin-1')).rejects.toThrow();
      expect(writes).toEqual([]);
      registered = true;
      await service.review(issue.id, decision, 'admin-1');
      expect(writes).toEqual(['resolved']);
    });
  }

  it('requires a recorded year before resolving a grade attribution issue', async () => {
    const writes: string[] = [];
    let registered = false;
    const issue = {
      id: 'issue-grade', entityType: 'grade', entityId: 'grade-1',
      issueCode: 'unattributed_grade_year', reviewStatus: 'open',
      evidence: {}, academicYearLabel: '',
    };
    const service = reviewService({
      findById: async () => issue,
      review: async (_id: string, status: string) => {
        writes.push(status);
        return { ...issue, reviewStatus: status };
      },
    }, { grades: { hasRegisteredYear: async () => registered } });
    const decision = { status: 'resolved' as const, resolutionNote: 'Matched the grade to the dated class register' };
    await expect(service.review(issue.id, decision, 'admin-1')).rejects.toThrow();
    expect(writes).toEqual([]);
    registered = true;
    await service.review(issue.id, decision, 'admin-1');
    expect(writes).toEqual(['resolved']);
  });
});
