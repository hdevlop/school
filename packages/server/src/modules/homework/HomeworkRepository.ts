import { and, asc, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { HomeworkAttachment, HomeworkChild } from '@sms/contracts';
import { Repository } from '../../najm';
import { Owned, type OwnedWhere } from '../../auth';
import { DB } from '../../database/db';
import {
  assessments, classes, homework, homeworkAcknowledgments, massarClasses, massarLevels, massarSubjects, sections, staff, subjects,
  subSubjects, teacherAssignments, teachers, users,
} from '../../database/schema';
import { homeworkParts } from './homeworkParts';
import { inReportingYear } from '../academicYears/academicRecordYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { Year } from '../academicYears/requestYear';
import { inTargetSectionOnSourceDate, studentPlacedOnSourceDate } from '../academicSources/placedOnSourceDate';
import { Homework, HomeworkForPlacedParent, HomeworkForPlacedStudent } from './HomeworkGuards';

export type HomeworkListFilters = { sectionId?: string; studentId?: string };

/**
 * What a read adds for its reader: a parent gets their own children the
 * homework is for, staff get how many pupils' parents marked it seen. The
 * service decides which; neither changes which rows are returned.
 */
export type HomeworkReader = { parentUserId?: string; counts?: boolean };

const homeworkSelect = {
  id: homework.id,
  academicYearId: homework.academicYearId,
  teacherAssignmentId: homework.teacherAssignmentId,
  title: homework.title,
  content: homework.content,
  date: homework.date,
  dueOn: homework.dueOn,
  sectionIds: homework.sectionIds,
  assessmentId: homework.assessmentId,
  createdAt: homework.createdAt,
  updatedAt: homework.updatedAt,
};

// The stored path is never sent: a file is read through its homework only.
const attachmentList = sql<HomeworkAttachment[]>`(
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', attachment.id, 'kind', attachment.kind, 'mimeType', attachment.mime_type, 'size', attachment.size,
    'width', attachment.width, 'height', attachment.height, 'position', attachment.position, 'purgedAt', attachment.purged_at
  ) order by attachment.position, attachment.created_at), '[]'::jsonb)
  from homework_attachments attachment
  where attachment.homework_id = ${homework.id}
)`;

// The reading parent's children who sat in a target section on the day the
// homework was given, with the moment that parent marked it seen for each.
const childrenOf = (parentUserId: string) => sql<HomeworkChild[]>`(
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', student.id, 'name', student.name, 'seenAt', seen.seen_at
  ) order by student.name), '[]'::jsonb)
  from student_enrollments enrollment
  join student_enrollment_placements placement on placement.enrollment_id = enrollment.id
  join students student on student.id = enrollment.student_id
  join student_parents link on link.student_id = student.id
  join parents parent on parent.id = link.parent_id
  left join homework_acknowledgments seen on seen.homework_id = ${homework.id}
    and seen.student_id = student.id and seen.parent_user_id = ${parentUserId}
  where parent.user_id = ${parentUserId}
    and ${inTargetSectionOnSourceDate(homework)}
)`;

const studentCount = sql<number>`(
  select count(distinct enrollment.student_id)::int
  from student_enrollments enrollment
  join student_enrollment_placements placement on placement.enrollment_id = enrollment.id
  where ${inTargetSectionOnSourceDate(homework)}
)`;

const seenCount = sql<number>`(
  select count(distinct seen.student_id)::int from homework_acknowledgments seen
  where seen.homework_id = ${homework.id}
)`;

@Repository()
export class HomeworkRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;
  @Owned(Homework, HomeworkForPlacedStudent, HomeworkForPlacedParent)
  private ownedWhere!: OwnedWhere;

  private inYear() {
    return inReportingYear(homework.academicYearId, homework.date, this.year);
  }

  private query(reader: HomeworkReader = {}) {
    const teacherUsers = alias(users, 'teacher_users');
    return this.db
      .select({
        ...homeworkSelect,
        subject: { id: subjects.id, name: subjects.name, code: subjects.code },
        subSubject: homework.subSubject,
        teacher: { id: teachers.id, name: staff.name, image: teacherUsers.image },
        class: { id: classes.id, name: classes.name },
        section: { id: sections.id, name: sections.name },
        targetSections: sql<{ id: string; name: string; classId: string }[]>`(
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', target_section.id, 'name', target_section.name, 'classId', target_section.class_id
          ) order by target_section.name), '[]'::jsonb)
          from sections as target_section
          where target_section.id = any(
            case when jsonb_array_length(coalesce(${homework.sectionIds}, '[]'::jsonb)) > 0
              then array(select jsonb_array_elements_text(${homework.sectionIds}))
              else array[${teacherAssignments.sectionId}] end
          )
        )`,
        attachments: attachmentList,
        ...(reader.parentUserId ? { children: childrenOf(reader.parentUserId) } : {}),
        ...(reader.counts ? { seenCount, studentCount } : {}),
      })
      .from(homework)
      .leftJoin(teacherAssignments, eq(homework.teacherAssignmentId, teacherAssignments.id))
      .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .leftJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .leftJoin(staff, eq(teachers.staffId, staff.id))
      .leftJoin(teacherUsers, eq(staff.userId, teacherUsers.id))
      .leftJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .leftJoin(classes, eq(sections.classId, classes.id));
  }

  // The year's homework the user may read, newest first. Year, filters and
  // ownership are one WHERE.
  async getAll({ sectionId, studentId }: HomeworkListFilters = {}, reader?: HomeworkReader) {
    return this.query(reader)
      .where(and(
        this.ownedWhere(),
        this.inYear(),
        sectionId ? this.targetsSection(sectionId) : undefined,
        studentId ? studentPlacedOnSourceDate(homework, studentId) : undefined,
      ))
      .orderBy(desc(homework.date), desc(homework.createdAt));
  }

  private targetsSection(sectionId: string): SQL {
    return or(
      eq(teacherAssignments.sectionId, sectionId),
      sql`exists (
        select 1 from jsonb_array_elements_text(coalesce(${homework.sectionIds}, '[]'::jsonb)) as target_section_id
        where target_section_id = ${sectionId}
      )`,
    )!;
  }

  async getById(id: string, reader?: HomeworkReader) {
    const [row] = await this.query(reader)
      .where(and(this.ownedWhere(), eq(homework.id, id), this.inYear()))
      .limit(1);
    return row;
  }

  async create(data: typeof homework.$inferInsert) {
    const [created] = await this.db.insert(homework)
      .values({ ...data, academicYearId: this.year.id })
      .returning({ id: homework.id });
    return created;
  }

  // The service read the row through ownership first; the year keeps a write
  // from reaching another year's record.
  async update(id: string, data: Partial<typeof homework.$inferInsert>) {
    const [updated] = await this.db.update(homework).set(data)
      .where(and(eq(homework.id, id), this.inYear()))
      .returning({ id: homework.id });
    return updated;
  }

  async delete(id: string) {
    const [deleted] = await this.db.delete(homework)
      .where(and(eq(homework.id, id), this.inYear()))
      .returning({ id: homework.id });
    return deleted;
  }

  // School-wide lookups that validate a write; none returns rows to a reader.

  /** The teacher record of a signed-in teacher, by their login. */
  async teacherIdOfUser(userId: string) {
    const [row] = await this.db.select({ id: teachers.id }).from(teachers)
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .where(eq(staff.userId, userId)).limit(1);
    return row?.id ?? null;
  }

  async findAssignment(teacherId: string, subjectId: string, sectionId: string) {
    const [row] = await this.db.select({ id: teacherAssignments.id }).from(teacherAssignments)
      .where(and(
        eq(teacherAssignments.teacherId, teacherId),
        eq(teacherAssignments.subjectId, subjectId),
        eq(teacherAssignments.sectionId, sectionId),
      )).limit(1);
    return row?.id ?? null;
  }

  /**
   * The parts of a subject a homework may name in these sections, or in a
   * class before its sections are chosen. Massar's are those of the class's
   * level in the selected year; an exam level (collège) grades tests, not
   * parts, so it falls back to the subject's sub-subjects.
   */
  async partsFor(subjectId: string, where: { sectionIds?: string[]; classId?: string }) {
    const inClass = where.sectionIds?.length ? inArray(sections.id, where.sectionIds) : eq(sections.classId, where.classId ?? '');
    const massar = await this.db.selectDistinct({ components: massarSubjects.components }).from(massarSubjects)
      .innerJoin(massarLevels, eq(massarLevels.id, massarSubjects.levelId))
      .innerJoin(massarClasses, and(eq(massarClasses.levelId, massarSubjects.levelId), eq(massarClasses.academicYearId, massarSubjects.academicYearId)))
      .innerJoin(sections, eq(sections.classId, massarClasses.classId))
      .where(and(
        eq(massarSubjects.academicYearId, this.year.id),
        eq(massarSubjects.subjectId, subjectId),
        eq(massarLevels.kind, 'components'),
        inClass,
      ));
    const own = await this.db.select({ name: subSubjects.name }).from(subSubjects)
      .where(eq(subSubjects.subjectId, subjectId)).orderBy(asc(subSubjects.position), asc(subSubjects.name));
    return homeworkParts(massar.map((row) => row.components), own.map((row) => row.name));
  }

  /** The assessment is one the same teacher gave for the same subject. */
  async assessmentMatches(assessmentId: string, teacherId: string, subjectId: string) {
    const [row] = await this.db.select({ id: assessments.id }).from(assessments)
      .innerJoin(teacherAssignments, eq(assessments.teacherAssignmentId, teacherAssignments.id))
      .where(and(
        eq(assessments.id, assessmentId),
        eq(teacherAssignments.teacherId, teacherId),
        eq(teacherAssignments.subjectId, subjectId),
      )).limit(1);
    return Boolean(row);
  }

  /** The student is this parent's child and sat in a target section on the homework's date. */
  async isChildOfParentInHomework(homeworkId: string, studentId: string, parentUserId: string) {
    const [row] = await this.db.select({ id: homework.id }).from(homework)
      .where(and(eq(homework.id, homeworkId), sql`exists (
        select 1 from student_enrollments enrollment
        join student_enrollment_placements placement on placement.enrollment_id = enrollment.id
        join student_parents link on link.student_id = enrollment.student_id
        join parents parent on parent.id = link.parent_id
        where enrollment.student_id = ${studentId} and parent.user_id = ${parentUserId}
          and ${inTargetSectionOnSourceDate(homework)}
      )`)).limit(1);
    return Boolean(row);
  }

  /** Marks the homework seen once; a second mark keeps the first time. */
  async acknowledge(homeworkId: string, studentId: string, parentUserId: string) {
    await this.db.insert(homeworkAcknowledgments)
      .values({ homeworkId, studentId, parentUserId })
      .onConflictDoNothing();
    const [row] = await this.db.select({ seenAt: homeworkAcknowledgments.seenAt }).from(homeworkAcknowledgments)
      .where(and(
        eq(homeworkAcknowledgments.homeworkId, homeworkId),
        eq(homeworkAcknowledgments.studentId, studentId),
        eq(homeworkAcknowledgments.parentUserId, parentUserId),
      )).limit(1);
    return row;
  }

  /** Trusted full reset; user-facing deletion is limited to the selected year. */
  async clearForSeedReset() {
    await this.db.delete(homework);
  }
}
