import { and, eq, gte, inArray, isNull, lte, ne, or, sql, type SQLWrapper } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { CompetencyLevel } from '@sms/contracts';
import { Repository } from '../../najm';
import { Owned, type OwnedWhere } from '../../auth';
import { DB } from '../../database/db';
import { competencies, competencyDomains, competencyEvaluations, teacherAssignments } from '../../database/schema';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { Year } from '../academicYears/requestYear';
import { CompetencyEvaluationOfMovedPupil, CompetencyEvaluationOwner } from './CompetencyGuards';

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
  @Owned(CompetencyEvaluationOwner, CompetencyEvaluationOfMovedPupil)
  private ownedWhere!: OwnedWhere;

  private inYear() {
    return eq(competencyEvaluations.academicYearId, this.year.id);
  }

  /**
   * Every level set in one class and subject's list in these months, with
   * those of its pupils who changed section: a level set in another section of
   * the class and subject counts here, on the competency of the same name, for
   * a pupil who sat in this section this year. The list's own level wins.
   */
  async forAssignment(teacherAssignmentId: string, months: string[], studentId?: string) {
    const [own, carried] = await Promise.all([
      this.db.select(evaluationSelect)
        .from(competencyEvaluations)
        .innerJoin(competencies, eq(competencyEvaluations.competencyId, competencies.id))
        .innerJoin(competencyDomains, eq(competencies.domainId, competencyDomains.id))
        .where(and(
          this.ownedWhere(),
          this.inYear(),
          eq(competencyDomains.teacherAssignmentId, teacherAssignmentId),
          inArray(competencyEvaluations.month, months),
          studentId ? eq(competencyEvaluations.studentId, studentId) : undefined,
        )),
      this.carriedInto(teacherAssignmentId, months, studentId),
    ]);
    const key = (row: { studentId: string; competencyId: string; month: string }) => `${row.studentId}|${row.competencyId}|${row.month}`;
    const levels = new Map(own.map((row) => [key(row), row]));
    for (const row of pickCarried(carried)) if (!levels.has(key(row))) levels.set(key(row), row);
    return [...levels.values()];
  }

  /** The levels a pupil of this section was given in a sibling section, on this list's competencies. */
  private carriedInto(teacherAssignmentId: string, months: string[], studentId?: string) {
    const source = alias(competencies, 'source_competency');
    const sourceDomain = alias(competencyDomains, 'source_domain');
    const sourceAssignment = alias(teacherAssignments, 'source_assignment');
    const targetAssignment = alias(teacherAssignments, 'target_assignment');
    const targetDomain = alias(competencyDomains, 'target_domain');
    const target = alias(competencies, 'target_competency');
    const month = competencyEvaluations.month;
    const followed = (span: { fromMonth: SQLWrapper; untilMonth: SQLWrapper }) => and(
      or(isNull(span.fromMonth), lte(span.fromMonth, month)),
      or(isNull(span.untilMonth), gte(span.untilMonth, month)),
    );
    const sameName = (a: SQLWrapper, b: SQLWrapper) => sql`lower(btrim(${a})) = lower(btrim(${b}))`;
    return this.db.select({
      ...evaluationSelect,
      competencyId: target.id,
      sameDomain: sql<boolean>`${sameName(sourceDomain.name, targetDomain.name)}`,
      sourceId: competencyEvaluations.competencyId,
    })
      .from(competencyEvaluations)
      .innerJoin(source, eq(competencyEvaluations.competencyId, source.id))
      .innerJoin(sourceDomain, eq(source.domainId, sourceDomain.id))
      .innerJoin(sourceAssignment, eq(sourceDomain.teacherAssignmentId, sourceAssignment.id))
      .innerJoin(targetAssignment, and(
        eq(targetAssignment.id, teacherAssignmentId),
        eq(targetAssignment.classId, sourceAssignment.classId),
        eq(targetAssignment.subjectId, sourceAssignment.subjectId),
        ne(targetAssignment.sectionId, sourceAssignment.sectionId),
      ))
      .innerJoin(targetDomain, and(eq(targetDomain.teacherAssignmentId, targetAssignment.id), eq(targetDomain.academicYearId, this.year.id)))
      .innerJoin(target, and(eq(target.domainId, targetDomain.id), sameName(target.name, source.name)))
      .where(and(
        this.ownedWhere(),
        this.inYear(),
        inArray(month, months),
        studentId ? eq(competencyEvaluations.studentId, studentId) : undefined,
        followed(targetDomain),
        followed(target),
        sql`exists (select 1 from student_enrollments moved_enrollment
          join student_enrollment_placements moved_placement on moved_placement.enrollment_id = moved_enrollment.id
          where moved_enrollment.student_id = ${competencyEvaluations.studentId}
            and moved_enrollment.academic_year_id = ${this.year.id}
            and moved_placement.section_id = ${targetAssignment.sectionId})`,
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

  /** The levels set in one month on this list's own competencies, without those carried from a sibling section. */
  async ofListInMonth(teacherAssignmentId: string, month: string) {
    return this.db.select(evaluationSelect)
      .from(competencyEvaluations)
      .innerJoin(competencies, eq(competencyEvaluations.competencyId, competencies.id))
      .innerJoin(competencyDomains, eq(competencies.domainId, competencyDomains.id))
      .where(and(
        this.ownedWhere(),
        this.inYear(),
        eq(competencyDomains.teacherAssignmentId, teacherAssignmentId),
        eq(competencyEvaluations.month, month),
      ));
  }

  /** Every level of the list set in one month moves to another, on the same competencies. */
  async moveListMonth(teacherAssignmentId: string, fromMonth: string, toMonth: string) {
    const listed = this.db.select({ id: competencies.id })
      .from(competencies)
      .innerJoin(competencyDomains, eq(competencies.domainId, competencyDomains.id))
      .where(eq(competencyDomains.teacherAssignmentId, teacherAssignmentId));
    await this.db.update(competencyEvaluations)
      .set({ month: toMonth, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(
        this.inYear(),
        eq(competencyEvaluations.month, fromMonth),
        inArray(competencyEvaluations.competencyId, listed),
      ));
  }

  /** A competency removed from a month on loses its levels of that month and after; the earlier ones stay. */
  async removeFrom(competencyId: string, month: string) {
    await this.db.delete(competencyEvaluations).where(and(
      eq(competencyEvaluations.competencyId, competencyId),
      gte(competencyEvaluations.month, month),
    ));
  }

  /** A competency replaced from a month on hands its levels of that month and after to the new one. */
  async moveFrom(fromCompetencyId: string, toCompetencyId: string, month: string) {
    await this.db.update(competencyEvaluations)
      .set({ competencyId: toCompetencyId, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(competencyEvaluations.competencyId, fromCompetencyId), gte(competencyEvaluations.month, month)));
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

type CarriedLevel = { competencyId: string; studentId: string; month: string; level: CompetencyLevel; sameDomain: boolean; sourceId: string };

/**
 * One competency for each carried level: the one of the same name in the
 * sub-domain of the same name when there is one. A name shared by two
 * sub-domains with neither matching is left out rather than guessed.
 */
export function pickCarried(rows: readonly CarriedLevel[]) {
  const bySource = new Map<string, CarriedLevel[]>();
  for (const row of rows) {
    const key = `${row.studentId}|${row.sourceId}|${row.month}`;
    bySource.set(key, [...(bySource.get(key) ?? []), row]);
  }
  return [...bySource.values()].flatMap((candidates) => {
    const preferred = candidates.filter((row) => row.sameDomain);
    const chosen = preferred.length === 1 ? preferred[0] : candidates.length === 1 ? candidates[0] : null;
    return chosen ? [{ competencyId: chosen.competencyId, studentId: chosen.studentId, month: chosen.month, level: chosen.level }] : [];
  });
}
