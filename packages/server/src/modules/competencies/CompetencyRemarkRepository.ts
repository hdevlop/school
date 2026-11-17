import { and, eq, sql } from 'drizzle-orm';
import { Repository } from '../../najm';
import { Owned, type OwnedWhere } from '../../auth';
import { DB } from '../../database/db';
import { competencyRemarks } from '../../database/schema';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { Year } from '../academicYears/requestYear';
import { CompetencyRemarkOwner } from './CompetencyGuards';

const remarkSelect = {
  studentId: competencyRemarks.studentId,
  month: competencyRemarks.month,
  body: competencyRemarks.body,
  updatedAt: competencyRemarks.updatedAt,
};

/** The teacher's remarks for the parents, read through the remark's own ownership. */
@Repository()
export class CompetencyRemarkRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;
  @Owned(CompetencyRemarkOwner)
  private ownedWhere!: OwnedWhere;

  private inYear() {
    return eq(competencyRemarks.academicYearId, this.year.id);
  }

  /** The remarks written in one class and subject for a month, or one pupil's. */
  async forAssignment(teacherAssignmentId: string, month: string, studentId?: string) {
    return this.db.select(remarkSelect)
      .from(competencyRemarks)
      .where(and(
        this.ownedWhere(),
        this.inYear(),
        eq(competencyRemarks.teacherAssignmentId, teacherAssignmentId),
        eq(competencyRemarks.month, month),
        studentId ? eq(competencyRemarks.studentId, studentId) : undefined,
      ));
  }

  async set(data: { teacherAssignmentId: string; studentId: string; month: string; body: string; writtenBy: string }) {
    const [row] = await this.db.insert(competencyRemarks)
      .values({ ...data, academicYearId: this.year.id })
      .onConflictDoUpdate({
        target: [competencyRemarks.teacherAssignmentId, competencyRemarks.studentId, competencyRemarks.month],
        set: { body: data.body, writtenBy: data.writtenBy, updatedAt: sql`CURRENT_TIMESTAMP` },
      })
      .returning(remarkSelect);
    return row;
  }

  /** An emptied remark: its row goes. */
  async clear(teacherAssignmentId: string, studentId: string, month: string) {
    await this.db.delete(competencyRemarks).where(and(
      eq(competencyRemarks.teacherAssignmentId, teacherAssignmentId),
      eq(competencyRemarks.studentId, studentId),
      eq(competencyRemarks.month, month),
      this.inYear(),
    ));
  }
}
