import { and, count, eq, gt } from 'drizzle-orm';
import { Repository } from '../../najm';
import type { DB } from '../../database/db';
import { academicYearMigrationIssues } from './AcademicYearMigrationIssueSchema';

// The live projection a student had before its first dated enrollment.
type UnrecordedProjection = {
  id: string;
  classYear: string | null;
  classId: string | null;
  sectionId: string | null;
  enrollmentDate: string | null;
};

@Repository()
export class AcademicYearMigrationIssueRepository {
  declare db: DB;

  async list(status: 'open' | 'resolved' | 'dismissed', limit: number, cursor?: string) {
    return this.db.select().from(academicYearMigrationIssues)
      .where(and(
        eq(academicYearMigrationIssues.reviewStatus, status),
        cursor ? gt(academicYearMigrationIssues.id, cursor) : undefined,
      ))
      .orderBy(academicYearMigrationIssues.id)
      .limit(limit + 1);
  }

  async countOpen() {
    const [row] = await this.db.select({ value: count() }).from(academicYearMigrationIssues)
      .where(eq(academicYearMigrationIssues.reviewStatus, 'open'));
    return row?.value ?? 0;
  }

  async countOpenForYear(label: string) {
    const [row] = await this.db.select({ value: count() }).from(academicYearMigrationIssues)
      .where(and(
        eq(academicYearMigrationIssues.reviewStatus, 'open'),
        eq(academicYearMigrationIssues.academicYearLabel, label),
      ));
    return row?.value ?? 0;
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(academicYearMigrationIssues)
      .where(eq(academicYearMigrationIssues.id, id)).limit(1);
    return row ?? null;
  }

  // Keeps the class a student was shown in before a new dated enrollment
  // replaces it, so an administrator can confirm when that placement began.
  async recordUnknownEnrollmentDate(student: UnrecordedProjection) {
    await this.db.insert(academicYearMigrationIssues).values({
      entityType: 'student',
      entityId: student.id,
      issueCode: 'unknown_enrollment_date',
      academicYearLabel: student.classYear ?? '',
      evidenceSource: 'live_student_projection_before_yearly_enrollment',
      evidence: {
        classId: student.classId,
        sectionId: student.sectionId,
        admissionDate: student.enrollmentDate,
      },
      proposedResolution: 'Confirm the prior yearly entry date and section from source records before creating a dated enrollment',
      runId: 'live-transition',
    }).onConflictDoNothing({
      target: [
        academicYearMigrationIssues.entityType,
        academicYearMigrationIssues.entityId,
        academicYearMigrationIssues.issueCode,
        academicYearMigrationIssues.academicYearLabel,
      ],
    });
  }

  async review(id: string, status: 'resolved' | 'dismissed', note: string, actorId: string) {
    const [row] = await this.db.update(academicYearMigrationIssues).set({
      reviewStatus: status,
      resolutionNote: note,
      reviewedBy: actorId,
      reviewedAt: new Date(),
    }).where(and(eq(academicYearMigrationIssues.id, id), eq(academicYearMigrationIssues.reviewStatus, 'open')))
      .returning();
    return row ?? null;
  }

  async clearForSeedReset() {
    await this.db.delete(academicYearMigrationIssues);
  }
}
