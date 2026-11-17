import { and, eq, inArray, sql } from 'drizzle-orm';
import type { CompetencyLevel } from '@sms/contracts';
import { Repository } from '../../najm';
import { Owned, type OwnedWhere } from '../../auth';
import { DB } from '../../database/db';
import { competencies, competencyDomains, competencyEvaluations } from '../../database/schema';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { Year } from '../academicYears/requestYear';
import { CompetencyEvaluationOwner } from './CompetencyGuards';

const evaluationSelect = {
  competencyId: competencyEvaluations.competencyId,
  studentId: competencyEvaluations.studentId,
  month: competencyEvaluations.month,
  level: competencyEvaluations.level,
};

/** Pupils' levels, read through the level's own ownership. */
@Repository()
export class CompetencyEvaluationRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;
  @Owned(CompetencyEvaluationOwner)
  private ownedWhere!: OwnedWhere;

  private inYear() {
    return eq(competencyEvaluations.academicYearId, this.year.id);
  }

  /** Every level set in one class and subject's list in these months. */
  async forAssignment(teacherAssignmentId: string, months: string[], studentId?: string) {
    return this.db.select(evaluationSelect)
      .from(competencyEvaluations)
      .innerJoin(competencies, eq(competencyEvaluations.competencyId, competencies.id))
      .innerJoin(competencyDomains, eq(competencies.domainId, competencyDomains.id))
      .where(and(
        this.ownedWhere(),
        this.inYear(),
        eq(competencyDomains.teacherAssignmentId, teacherAssignmentId),
        inArray(competencyEvaluations.month, months),
        studentId ? eq(competencyEvaluations.studentId, studentId) : undefined,
      ));
  }

  async set(data: { competencyId: string; studentId: string; month: string; level: CompetencyLevel; evaluatedBy: string }) {
    const [row] = await this.db.insert(competencyEvaluations)
      .values({ ...data, academicYearId: this.year.id })
      .onConflictDoUpdate({
        target: [competencyEvaluations.competencyId, competencyEvaluations.studentId, competencyEvaluations.month],
        set: { level: data.level, evaluatedBy: data.evaluatedBy, updatedAt: sql`CURRENT_TIMESTAMP` },
      })
      .returning(evaluationSelect);
    return row;
  }

  /** Non évalué again: the level's row goes. */
  async clear(competencyId: string, studentId: string, month: string) {
    await this.db.delete(competencyEvaluations).where(and(
      eq(competencyEvaluations.competencyId, competencyId),
      eq(competencyEvaluations.studentId, studentId),
      eq(competencyEvaluations.month, month),
      this.inYear(),
    ));
  }

  /**
   * The pupil sat in the section at some time in the month, this year: a
   * level is set for a pupil the class actually had. A validation lookup; it
   * returns no row to a reader.
   */
  async placedDuring(studentId: string, sectionId: string, monthStart: string, monthEnd: string) {
    const [row] = await this.db.execute<{ placed: boolean }>(sql`
      select exists (
        select 1 from student_enrollments enrollment
        join student_enrollment_placements placement on placement.enrollment_id = enrollment.id
        where enrollment.student_id = ${studentId}
          and enrollment.academic_year_id = ${this.year.id}
          and placement.section_id = ${sectionId}
          and placement.valid_from < ${monthEnd}
          and (placement.valid_to is null or placement.valid_to > ${monthStart})
          and (enrollment.left_on is null or enrollment.left_on > ${monthStart})
      ) as placed
    `);
    return !!row?.placed;
  }
}
