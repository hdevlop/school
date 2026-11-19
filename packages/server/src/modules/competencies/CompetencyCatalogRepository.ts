import { and, asc, count, eq, gte, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import type { CompetencyItem } from '@sms/contracts';
import { Repository } from '../../najm';
import { Owned, type OwnedWhere } from '../../auth';
import { DB } from '../../database/db';
import {
  competencies, competencyDomains, sections, classes, staff, subjects, teacherAssignments, teachers,
} from '../../database/schema';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { Year } from '../academicYears/requestYear';
import { CompetencyDomainOwner } from './CompetencyGuards';

export type CatalogItem = CompetencyItem & { evaluationCount: number };

/** The months a domain or competency is followed in; null is the year's first, or its last. */
export type MonthSpan = { fromMonth: string | null; untilMonth: string | null };

const domainSelect = {
  id: competencyDomains.id,
  teacherAssignmentId: competencyDomains.teacherAssignmentId,
  name: competencyDomains.name,
  altName: competencyDomains.altName,
  position: competencyDomains.position,
  fromMonth: competencyDomains.fromMonth,
  untilMonth: competencyDomains.untilMonth,
};

// The domain's competencies in order, each with its months and how many levels
// were set in it in each month, so a change from one month on can say what it
// keeps and what it loses.
const competencyList = sql<CatalogItem[]>`(
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', item.id, 'domainId', item.domain_id, 'name', item.name, 'altName', item.alt_name, 'position', item.position,
    'fromMonth', item.from_month, 'untilMonth', item.until_month,
    'evaluationCount', (select count(*)::int from competency_evaluations evaluation where evaluation.competency_id = item.id),
    'evaluationsByMonth', (select coalesce(jsonb_object_agg(rated.month, rated.n), '{}'::jsonb) from (
      select evaluation.month, count(*)::int as n from competency_evaluations evaluation
      where evaluation.competency_id = item.id group by evaluation.month) rated)
  ) order by item.position, item.created_at), '[]'::jsonb)
  from competencies item
  where item.domain_id = "competency_domains"."id"
)`;
// Named in full: in a select from one table Drizzle writes `${competencyDomains.id}`
// as a bare "id", which inside this subquery would be the competency's own.

const assignmentSelect = {
  teacherAssignmentId: teacherAssignments.id,
  classId: teacherAssignments.classId,
  className: classes.name,
  sectionId: teacherAssignments.sectionId,
  sectionName: sections.name,
  subjectId: teacherAssignments.subjectId,
  subjectName: subjects.name,
  subjectCode: subjects.code,
  teacherName: sql<string | null>`(select member.name from teachers teacher
    join staff member on member.id = teacher.staff_id where teacher.id = ${teacherAssignments.teacherId})`,
};

const sameName = (column: typeof competencyDomains.name | typeof competencies.name, name: string) =>
  sql`lower(btrim(${column})) = lower(btrim(${name}))`;

type SpanColumns = { fromMonth: typeof competencies.fromMonth; untilMonth: typeof competencies.untilMonth }
  | { fromMonth: typeof competencyDomains.fromMonth; untilMonth: typeof competencyDomains.untilMonth };

/** Rows followed in at least one month of the span: two names may repeat only in months that never meet. */
function overlaps(table: SpanColumns, span: MonthSpan): SQL | undefined {
  return and(
    span.fromMonth ? or(isNull(table.untilMonth), gte(table.untilMonth, span.fromMonth)) : undefined,
    span.untilMonth ? or(isNull(table.fromMonth), sql`${table.fromMonth} <= ${span.untilMonth}`) : undefined,
  );
}

/**
 * The list a teacher follows in one class, section and subject. Reads go
 * through the domain's ownership; a competency is reached through its domain.
 */
@Repository()
export class CompetencyCatalogRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;
  @Owned(CompetencyDomainOwner)
  private ownedWhere!: OwnedWhere;

  private inYear() {
    return eq(competencyDomains.academicYearId, this.year.id);
  }

  async catalog(teacherAssignmentId: string) {
    return this.db
      .select({ ...domainSelect, competencies: competencyList })
      .from(competencyDomains)
      .where(and(this.ownedWhere(), this.inYear(), eq(competencyDomains.teacherAssignmentId, teacherAssignmentId)))
      .orderBy(asc(competencyDomains.position), asc(competencyDomains.createdAt));
  }

  async findDomain(id: string) {
    const [row] = await this.db.select(domainSelect).from(competencyDomains)
      .where(and(this.ownedWhere(), this.inYear(), eq(competencyDomains.id, id)))
      .limit(1);
    return row;
  }

  async findCompetency(id: string) {
    const [row] = await this.db
      .select({
        id: competencies.id,
        domainId: competencies.domainId,
        name: competencies.name,
        altName: competencies.altName,
        position: competencies.position,
        fromMonth: competencies.fromMonth,
        untilMonth: competencies.untilMonth,
        domainFromMonth: competencyDomains.fromMonth,
        domainUntilMonth: competencyDomains.untilMonth,
        teacherAssignmentId: competencyDomains.teacherAssignmentId,
      })
      .from(competencies)
      .innerJoin(competencyDomains, eq(competencies.domainId, competencyDomains.id))
      .where(and(this.ownedWhere(), this.inYear(), eq(competencies.id, id)))
      .limit(1);
    return row;
  }

  /** A teacher's own classes and subjects in the selected year, by their login, with or without a list. */
  async assignmentsOfTeacher(userId: string) {
    return this.db
      .select(assignmentSelect)
      .from(teacherAssignments)
      .innerJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .innerJoin(classes, eq(teacherAssignments.classId, classes.id))
      .innerJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(and(eq(staff.userId, userId), eq(classes.academicYear, this.year.label)))
      .orderBy(asc(classes.name), asc(sections.name), asc(subjects.name));
  }

  /** The classes and subjects with a list this year, as the reader may see them. */
  async listedAssignments() {
    return this.db
      .selectDistinct(assignmentSelect)
      .from(competencyDomains)
      .innerJoin(teacherAssignments, eq(competencyDomains.teacherAssignmentId, teacherAssignments.id))
      .innerJoin(classes, eq(teacherAssignments.classId, classes.id))
      .innerJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(and(this.ownedWhere(), this.inYear()))
      .orderBy(asc(classes.name), asc(sections.name), asc(subjects.name));
  }

  /** The subjects with a list in a section this year, as the reader may see them. */
  async subjectsInSection(sectionId: string) {
    return this.db
      .selectDistinct({ id: subjects.id, name: subjects.name, teacherAssignmentId: teacherAssignments.id })
      .from(competencyDomains)
      .innerJoin(teacherAssignments, eq(competencyDomains.teacherAssignmentId, teacherAssignments.id))
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(and(this.ownedWhere(), this.inYear(), eq(teacherAssignments.sectionId, sectionId)))
      .orderBy(asc(subjects.name));
  }

  async createDomain(data: { teacherAssignmentId: string; name: string; altName: string | null; position: number } & Partial<MonthSpan>) {
    const [row] = await this.db.insert(competencyDomains)
      .values({ ...data, academicYearId: this.year.id })
      .returning({ id: competencyDomains.id });
    return row;
  }

  // The service read the row through ownership first; the year keeps a write
  // from reaching another year's list.
  async updateDomain(id: string, data: Partial<{ name: string; altName: string | null; position: number } & MonthSpan>) {
    const [row] = await this.db.update(competencyDomains).set(data)
      .where(and(eq(competencyDomains.id, id), this.inYear()))
      .returning({ id: competencyDomains.id });
    return row;
  }

  async deleteDomain(id: string) {
    const [row] = await this.db.delete(competencyDomains)
      .where(and(eq(competencyDomains.id, id), this.inYear()))
      .returning({ id: competencyDomains.id });
    return row;
  }

  async createCompetency(data: { domainId: string; name: string; altName: string | null; position: number } & Partial<MonthSpan>) {
    const [row] = await this.db.insert(competencies).values(data).returning({ id: competencies.id });
    return row;
  }

  async updateCompetency(id: string, data: Partial<{ domainId: string; name: string; altName: string | null; position: number } & MonthSpan>) {
    const [row] = await this.db.update(competencies).set(data)
      .where(eq(competencies.id, id))
      .returning({ id: competencies.id });
    return row;
  }

  async deleteCompetency(id: string) {
    const [row] = await this.db.delete(competencies).where(eq(competencies.id, id)).returning({ id: competencies.id });
    return row;
  }

  /** A domain's competencies with their months, the ended ones included: what removing it from a month on goes through. */
  async competenciesOfDomain(domainId: string) {
    return this.db.select({ id: competencies.id, fromMonth: competencies.fromMonth, untilMonth: competencies.untilMonth })
      .from(competencies).where(eq(competencies.domainId, domainId));
  }

  // School-wide lookups that validate a write; none returns rows to a reader.

  /** The competency has levels in a month before this one. */
  async ratedBefore(competencyId: string, month: string) {
    const [row] = await this.db.execute<{ rated: boolean }>(sql`
      select exists (select 1 from competency_evaluations where competency_id = ${competencyId} and month < ${month}) as rated`);
    return !!row?.rated;
  }

  /** The list's domains; with a month, those still followed in it or later. */
  async countDomains(teacherAssignmentId: string, month?: string) {
    const [row] = await this.db.select({ n: count() }).from(competencyDomains)
      .where(and(eq(competencyDomains.teacherAssignmentId, teacherAssignmentId), this.inYear(),
        month ? overlaps(competencyDomains, { fromMonth: month, untilMonth: null }) : undefined));
    return Number(row?.n ?? 0);
  }

  async countCompetencies(domainId: string, month?: string) {
    const [row] = await this.db.select({ n: count() }).from(competencies)
      .where(and(eq(competencies.domainId, domainId), month ? overlaps(competencies, { fromMonth: month, untilMonth: null }) : undefined));
    return Number(row?.n ?? 0);
  }

  async nextDomainPosition(teacherAssignmentId: string) {
    const [row] = await this.db.select({ n: sql<number>`coalesce(max(${competencyDomains.position}) + 1, 0)::int` })
      .from(competencyDomains)
      .where(and(eq(competencyDomains.teacherAssignmentId, teacherAssignmentId), this.inYear()));
    return Number(row?.n ?? 0);
  }

  async nextCompetencyPosition(domainId: string) {
    const [row] = await this.db.select({ n: sql<number>`coalesce(max(${competencies.position}) + 1, 0)::int` })
      .from(competencies).where(eq(competencies.domainId, domainId));
    return Number(row?.n ?? 0);
  }

  async domainNameTaken(teacherAssignmentId: string, name: string, span: MonthSpan, excludeId?: string) {
    const [row] = await this.db.select({ id: competencyDomains.id }).from(competencyDomains)
      .where(and(
        eq(competencyDomains.teacherAssignmentId, teacherAssignmentId),
        this.inYear(),
        sameName(competencyDomains.name, name),
        overlaps(competencyDomains, span),
        excludeId ? ne(competencyDomains.id, excludeId) : undefined,
      ))
      .limit(1);
    return !!row;
  }

  async competencyNameTaken(domainId: string, name: string, span: MonthSpan, excludeId?: string) {
    const [row] = await this.db.select({ id: competencies.id }).from(competencies)
      .where(and(
        eq(competencies.domainId, domainId),
        sameName(competencies.name, name),
        overlaps(competencies, span),
        excludeId ? ne(competencies.id, excludeId) : undefined,
      ))
      .limit(1);
    return !!row;
  }

  /** An assignment with the login of its teacher, if it has one. */
  async findAssignment(id: string) {
    const [row] = await this.db
      .select({
        id: teacherAssignments.id,
        classId: teacherAssignments.classId,
        sectionId: teacherAssignments.sectionId,
        subjectId: teacherAssignments.subjectId,
        teacherId: teacherAssignments.teacherId,
        teacherUserId: staff.userId,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        className: classes.name,
        sectionName: sections.name,
      })
      .from(teacherAssignments)
      .leftJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .leftJoin(staff, eq(teachers.staffId, staff.id))
      .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .leftJoin(classes, eq(teacherAssignments.classId, classes.id))
      .leftJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .where(eq(teacherAssignments.id, id))
      .limit(1);
    return row;
  }

  /**
   * The assignment a pupil was followed by in a subject: their section in the
   * selected year during the month (else their latest that year), and that
   * section's assignment for the subject, the one holding a list first.
   */
  async assignmentForStudent(studentId: string, monthStart: string, monthEnd: string, subjectId?: string) {
    const [row] = await this.db.execute<{ section_id: string; assignment_id: string | null; subject_id: string | null }>(sql`
      with placed as (
        select placement.section_id
        from student_enrollments enrollment
        join student_enrollment_placements placement on placement.enrollment_id = enrollment.id
        where enrollment.student_id = ${studentId}
          and enrollment.academic_year_id = ${this.year.id}
        order by (placement.valid_from < ${monthEnd}
            and (placement.valid_to is null or placement.valid_to > ${monthStart})) desc,
          placement.valid_from desc
        limit 1
      )
      select placed.section_id, assignment.id as assignment_id, assignment.subject_id
      from placed
      left join lateral (
        select candidate.id, candidate.subject_id
        from teacher_assignments candidate
        where candidate.section_id = placed.section_id
          and (${subjectId ?? null}::text is null or candidate.subject_id = ${subjectId ?? null})
          and exists (select 1 from competency_domains domain
            where domain.teacher_assignment_id = candidate.id and domain.academic_year_id = ${this.year.id})
        order by candidate.teacher_id nulls last, candidate.id
        limit 1
      ) assignment on true
    `);
    return row ? { sectionId: row.section_id, teacherAssignmentId: row.assignment_id, subjectId: row.subject_id } : null;
  }
}
