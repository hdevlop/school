import { DB } from '../../database/db';
import { teachers, users, teacherAssignments, sections, subjects, students, classes, staff, studentEnrollments, studentEnrollmentPlacements, assessments, exams, attendance, routineEntries, grades, homework, massarSheets, alerts } from '../../database/schema';
import { Repository } from '../../najm';
import { getBusinessDateOnly } from '../../shared/businessDate';
import { Owned, type OwnedWhere } from '../../auth';
import { count, eq, desc, sql, and, inArray, gt, isNull, lte, or } from 'drizzle-orm';
import { Teacher } from './TeacherGuards';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';

export const teacherSelect = {
  id: teachers.id,
  staffId: teachers.staffId,
  userId: staff.userId,
  // 'pending' until the invitation is approved: the list offers to send it, as Staff does.
  loginStatus: users.status,
  cin: staff.cin,
  name: staff.name,
  email: users.email,
  phone: staff.phone,
  address: staff.address,
  gender: staff.gender,
  specialization: teachers.specialization,
  salary: staff.salary,
  compensationMode: staff.compensationMode,
  hourlyRate: staff.hourlyRate,
  hireDate: staff.hireDate,
  yearsOfExperience: teachers.yearsOfExperience,
  bankAccount: staff.bankAccount,
  emergencyContact: staff.emergencyContact,
  emergencyPhone: staff.emergencyPhone,
  status: staff.status,
  employmentType: staff.employmentType,
  workloadHours: staff.workloadHours,
  academicDegrees: teachers.academicDegrees,
  image: users.image,
  createdAt: teachers.createdAt,
  updatedAt: teachers.updatedAt,
};

export const studentSelect = {
  id: students.id,
  userId: students.userId,
  studentCode: students.studentCode,
  name: students.name,
  email: users.email,
  phone: students.phone,
  address: students.address,
  dateOfBirth: students.dateOfBirth,
  age: students.age,
  gender: students.gender,
  classId: students.classId,
  sectionId: students.sectionId,
  enrollmentDate: students.enrollmentDate,
  medicalConditions: students.medicalConditions,
  status: students.status,
  image: sql<string>`coalesce(${users.image}, ${students.image})`,
  createdAt: students.createdAt,
  updatedAt: students.updatedAt,
};

export const classSelect = {
  id: classes.id,
  name: classes.name,
  description: classes.description,
  academicYear: classes.academicYear,
  level: classes.level,
  createdAt: classes.createdAt,
  updatedAt: classes.updatedAt,
};

export const sectionSelect = {
  id: sections.id,
  name: sections.name,
  classId: sections.classId,
  maxStudents: sections.maxStudents,
  roomNumber: sections.roomNumber,
  status: sections.status,
  createdAt: sections.createdAt,
  updatedAt: sections.updatedAt,
};

export const subjectSelect = {
  id: subjects.id,
  name: subjects.name,
  code: subjects.code,
  description: subjects.description,
  createdAt: subjects.createdAt,
  updatedAt: subjects.updatedAt,
};

@Repository()
export class TeacherRepository {

  declare db: DB;
  @Owned(Teacher)
  private ownedWhere!: OwnedWhere;
  @Year() private readonly year!: ResolvedAcademicYear;

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  private buildTeacherQuery() {
    // Each section keeps its own subjects. Combining both sets per class
    // invents section/subject pairs when the edit form submits them again.
    return this.db
      .select({
        ...teacherSelect,
        assignments: sql<Array<{
          classId: string;
          sectionIds: string[];
          subjectIds: string[];
        }>>`
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'classId', class_id,
                'sectionIds', section_ids,
                'subjectIds', subject_ids
              )
            )
            FROM (
              SELECT 
                ${classes.id} as class_id,
                ARRAY[${sections.id}] as section_ids,
                array_agg(DISTINCT ${subjects.id}) as subject_ids
              FROM ${teacherAssignments}
              INNER JOIN ${sections} ON ${teacherAssignments.sectionId} = ${sections.id}
              INNER JOIN ${classes} ON ${sections.classId} = ${classes.id}
              INNER JOIN ${subjects} ON ${teacherAssignments.subjectId} = ${subjects.id}
              WHERE ${teacherAssignments.teacherId} = ${teachers.id}
                AND ${classes.academicYear} = ${this.year.label}
              GROUP BY ${classes.id}, ${sections.id}
            ) grouped
          ),
          '[]'::json
        )
      `.as('assignments')
      })
      .from(teachers)
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id));
  }

  // ========================================
  // GET / READ METHODS
  // ========================================

  async getCount() {
    const [teachersCount] = await this.db
      .select({ count: count() })
      .from(teachers);
    return teachersCount;
  }

  // The rows getAll returns, counted. getCount above is the dashboards'
  // school-wide total.
  async getOwnedCount() {
    const [row] = await this.db
      .select({ count: count() })
      .from(teachers)
      .where(this.ownedWhere());
    return row;
  }

  async getAll() {
    return await this.buildTeacherQuery()
      .where(this.ownedWhere())
      .orderBy(desc(teachers.createdAt));
  }

  async getById(id: string) {
    const [teacher] = await this.buildTeacherQuery()
      .where(and(this.ownedWhere(), eq(teachers.id, id)))
      .limit(1);
    if (!teacher) return null;
    return teacher
  }

  async getByStatus(status) {
    return await this.buildTeacherQuery()
      .where(eq(staff.status, status))
      .orderBy(desc(teachers.createdAt));
  }

  async getBySpecialization(specialization) {
    return await this.buildTeacherQuery()
      .where(eq(teachers.specialization, specialization))
      .orderBy(staff.name);
  }

  async getByCin(cin) {
    const [existingTeacher] = await this.buildTeacherQuery()
      .where(eq(staff.cin, cin))
      .limit(1);
    return existingTeacher;
  }

  async getByEmail(email) {
    const [existingTeacher] = await this.buildTeacherQuery()
      .where(eq(users.email, email))
      .limit(1);
    return existingTeacher;
  }

  async getByPhone(phone) {
    const [teacher] = await this.buildTeacherQuery()
      .where(eq(staff.phone, phone))
      .limit(1);
    return teacher;
  }

  async getByUserId(userId: string) {
    const [teacher] = await this.db.select(teacherSelect).from(teachers)
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id))
      .where(and(this.ownedWhere(), eq(staff.userId, userId)))
      .limit(1);
    return teacher;
  }

  // The record without the year's assignments, for reads outside the year
  // scope such as the teacher dashboard.
  async getOwnedRecord(id: string) {
    const [teacher] = await this.db.select(teacherSelect).from(teachers)
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id))
      .where(and(this.ownedWhere(), eq(teachers.id, id)))
      .limit(1);
    return teacher;
  }

  // The students placed that year in the teacher's assigned sections of that
  // year's classes; with `onDate`, those enrolled and placed there that day.
  // The assignment's class and the student's placement must both belong to
  // the year: a student's current section never authorizes history.
  async getStudents(teacherId: string, onDate?: string) {
    return this.db.selectDistinctOn([students.name, students.id], {
      ...studentSelect,
      classId: studentEnrollmentPlacements.classId,
      sectionId: studentEnrollmentPlacements.sectionId,
      status: studentEnrollments.status,
      enrollmentId: studentEnrollments.id,
      placementId: studentEnrollmentPlacements.id,
      academicYear: classes.academicYear,
      ...(onDate ? { onDate: sql<string>`${onDate}` } : {}),
    }).from(teacherAssignments)
      .innerJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .innerJoin(classes, and(
        eq(sections.classId, classes.id),
        eq(teacherAssignments.classId, classes.id),
      ))
      .innerJoin(studentEnrollmentPlacements, and(
        eq(studentEnrollmentPlacements.sectionId, sections.id),
        eq(studentEnrollmentPlacements.classId, classes.id),
      ))
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .innerJoin(students, eq(studentEnrollments.studentId, students.id))
      .leftJoin(users, eq(students.userId, users.id))
      .where(and(
        eq(teacherAssignments.teacherId, teacherId),
        eq(classes.academicYear, this.year.label),
        eq(studentEnrollments.academicYearId, this.year.id),
        ...(onDate ? [
          lte(studentEnrollments.enrolledOn, onDate),
          or(isNull(studentEnrollments.leftOn), gt(studentEnrollments.leftOn, onDate)),
          lte(studentEnrollmentPlacements.validFrom, onDate),
          or(isNull(studentEnrollmentPlacements.validTo), gt(studentEnrollmentPlacements.validTo, onDate)),
        ] : []),
      ))
      .orderBy(students.name, students.id, desc(studentEnrollmentPlacements.validFrom));
  }

  async getClasses(teacherId) {
    return await this.db
      .select({
        ...classSelect,
        section: sectionSelect,
        subject: subjectSelect,
      })
      .from(teacherAssignments)
      .innerJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .innerJoin(classes, eq(sections.classId, classes.id))
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(and(eq(teacherAssignments.teacherId, teacherId), eq(classes.academicYear, this.year.label)))
      .orderBy(classes.name, sections.name, subjects.name);
  }

  async getClassSections(classId: string) {
    return await this.db
      .select(sectionSelect)
      .from(sections)
      .innerJoin(classes, eq(sections.classId, classes.id))
      .where(and(eq(sections.classId, classId), eq(classes.academicYear, this.year.label)))
      .orderBy(sections.name);
  }

  async getTeacherAssignment(teacherId, subjectId, sectionId) {
    const [assignment] = await this.db
      .select()
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.subjectId, subjectId),
          eq(teacherAssignments.sectionId, sectionId),
          inArray(teacherAssignments.classId, this.classesInSelectedYear()),
        )
      )
      .limit(1);

    return assignment;
  }

  async getTeacherAssignmentById(assignmentId) {
    const [assignment] = await this.db
      .select()
      .from(teacherAssignments)
      .where(and(eq(teacherAssignments.id, assignmentId), inArray(teacherAssignments.classId, this.classesInSelectedYear())))
      .limit(1);

    return assignment;
  }

  // ========================================
  // CREATE_METHODS
  // ========================================

  async create(data) {
    const [newTeacher] = await this.db
      .insert(teachers)
      .values(data)
      .returning();
    return newTeacher;
  }

  async createAssignment(data) {
    // A slot Planning made for this class, section and subject is filled, so its exams get the teacher.
    if (data.teacherId) {
      const [filled] = await this.db.update(teacherAssignments).set({ teacherId: data.teacherId, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(isNull(teacherAssignments.teacherId), eq(teacherAssignments.classId, data.classId), eq(teacherAssignments.sectionId, data.sectionId), eq(teacherAssignments.subjectId, data.subjectId)))
        .returning();
      if (filled) return filled;
    }
    const [assignment] = await this.db
      .insert(teacherAssignments)
      .values(data)
      .returning();
    return assignment;
  }

  /**
   * A teacher taken off a class's subject leaves its upcoming, unmarked Planning
   * exams to an empty slot, for the next teacher to fill. Marked or past exams
   * keep the teacher they were set under: they are history, and an assignment
   * they use is refused deletion as any other.
   */
  private async moveUpcomingPlanned(filter) {
    const today = getBusinessDateOnly();
    const upcoming = sql`${exams.planningEntryId} is not null and ${exams.date} >= ${today} and not exists (select 1 from grades mark where mark.exam_id = ${exams.id})`;
    const rows = await this.db.select({ id: teacherAssignments.id, classId: teacherAssignments.classId, sectionId: teacherAssignments.sectionId, subjectId: teacherAssignments.subjectId })
      .from(teacherAssignments).where(and(filter, sql`exists (select 1 from exams where ${exams.teacherAssignmentId} = ${teacherAssignments.id} and ${upcoming})`));
    for (const row of rows) {
      const [slot] = await this.db.select({ id: teacherAssignments.id }).from(teacherAssignments)
        .where(and(isNull(teacherAssignments.teacherId), eq(teacherAssignments.classId, row.classId), eq(teacherAssignments.sectionId, row.sectionId), eq(teacherAssignments.subjectId, row.subjectId))).limit(1);
      const slotId = slot?.id ?? (await this.db.insert(teacherAssignments).values({ classId: row.classId, sectionId: row.sectionId, subjectId: row.subjectId, teacherId: null }).returning({ id: teacherAssignments.id }))[0].id;
      await this.db.update(exams).set({ teacherAssignmentId: slotId, updatedAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(exams.teacherAssignmentId, row.id), upcoming));
    }
  }

  async getAssignmentRows(teacherId: string) {
    return await this.db
      .select({
        classId: teacherAssignments.classId,
        sectionId: teacherAssignments.sectionId,
        subjectId: teacherAssignments.subjectId,
      })
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          inArray(teacherAssignments.classId, this.classesInSelectedYear()),
        )
      );
  }

  async findAssignment(teacherId, sectionId, subjectId) {
    const [assignment] = await this.db
      .select()
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.sectionId, sectionId),
          eq(teacherAssignments.subjectId, subjectId),
          inArray(teacherAssignments.classId, this.classesInSelectedYear()),
        )
      )
      .limit(1);
    return assignment;
  }

  /**
   * What is still recorded under one of the teacher's assignments in the
   * selected year, once its upcoming planned exams went to an empty slot:
   * each of these keeps the assignment, so it cannot be deleted. Null when
   * the teacher has no such assignment.
   */
  async recordsUnderAssignment(teacherId: string, sectionId: string, subjectId: string) {
    const filter = and(
      eq(teacherAssignments.teacherId, teacherId),
      eq(teacherAssignments.sectionId, sectionId),
      eq(teacherAssignments.subjectId, subjectId),
      inArray(teacherAssignments.classId, this.classesInSelectedYear()),
    );
    await this.moveUpcomingPlanned(filter);
    const [row] = await this.db
      .select({ id: teacherAssignments.id, className: classes.name, sectionName: sections.name, subjectName: subjects.name })
      .from(teacherAssignments)
      .innerJoin(classes, eq(classes.id, teacherAssignments.classId))
      .innerJoin(sections, eq(sections.id, teacherAssignments.sectionId))
      .innerJoin(subjects, eq(subjects.id, teacherAssignments.subjectId))
      .where(filter)
      .limit(1);
    if (!row) return null;
    const total = async (table: typeof exams | typeof assessments | typeof attendance | typeof routineEntries | typeof homework) =>
      Number((await this.db.select({ n: count() }).from(table).where(eq(table.teacherAssignmentId, row.id)))[0]?.n ?? 0);
    const [examCount, assessmentCount, attendanceCount, lessonCount, homeworkCount] = await Promise.all([
      total(exams), total(assessments), total(attendance), total(routineEntries), total(homework),
    ]);
    return {
      className: row.className,
      sectionName: row.sectionName,
      subjectName: row.subjectName,
      records: { exams: examCount, assessments: assessmentCount, attendance: attendanceCount, lessons: lessonCount, homework: homeworkCount },
    };
  }

  /**
   * An administrator takes a subject from a teacher although records were kept
   * under it: the assignment becomes the class's vacant slot for that subject,
   * with everything recorded under it (exams and their marks, assessments,
   * attendance, lessons, homework, Massar sheets). The next teacher given the
   * subject fills the slot and takes them over (createAssignment). When the
   * class already has a slot, the records join it and this row goes.
   */
  async vacateAssignment(teacherId: string, sectionId: string, subjectId: string) {
    const [row] = await this.db
      .select({ id: teacherAssignments.id, classId: teacherAssignments.classId })
      .from(teacherAssignments)
      .where(and(
        eq(teacherAssignments.teacherId, teacherId),
        eq(teacherAssignments.sectionId, sectionId),
        eq(teacherAssignments.subjectId, subjectId),
        inArray(teacherAssignments.classId, this.classesInSelectedYear()),
      ))
      .limit(1);
    if (!row) return null;
    const [slot] = await this.db.select({ id: teacherAssignments.id }).from(teacherAssignments)
      .where(and(
        isNull(teacherAssignments.teacherId),
        eq(teacherAssignments.classId, row.classId),
        eq(teacherAssignments.sectionId, sectionId),
        eq(teacherAssignments.subjectId, subjectId),
      ))
      .limit(1);
    if (!slot) {
      await this.db.update(teacherAssignments).set({ teacherId: null, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(teacherAssignments.id, row.id));
      return row.id;
    }
    for (const table of [exams, assessments, attendance, routineEntries, homework, massarSheets, alerts]) {
      await this.db.update(table).set({ teacherAssignmentId: slot.id }).where(eq(table.teacherAssignmentId, row.id));
    }
    await this.db.delete(teacherAssignments).where(eq(teacherAssignments.id, row.id));
    return slot.id;
  }

  async deleteAssignment(teacherId, sectionId, subjectId) {
    const filter = and(
      eq(teacherAssignments.teacherId, teacherId),
      eq(teacherAssignments.sectionId, sectionId),
      eq(teacherAssignments.subjectId, subjectId),
      inArray(teacherAssignments.classId, this.classesInSelectedYear()),
    );
    await this.moveUpcomingPlanned(filter);
    const [deleted] = await this.db
      .delete(teacherAssignments)
      .where(filter)
      .returning();
    return deleted;
  }

  async deleteAssignmentsForClass(teacherId: string, classId: string, subjectId?: string) {
    const sectionRows = await this.getClassSections(classId);
    const sectionIds = sectionRows.map((section) => section.id);
    if (sectionIds.length === 0) return [];

    const filters = [
      eq(teacherAssignments.teacherId, teacherId),
      eq(teacherAssignments.classId, classId),
      inArray(teacherAssignments.classId, this.classesInSelectedYear()),
      inArray(teacherAssignments.sectionId, sectionIds),
    ];

    if (subjectId) {
      filters.push(eq(teacherAssignments.subjectId, subjectId));
    }

    await this.moveUpcomingPlanned(and(...filters));
    return await this.db
      .delete(teacherAssignments)
      .where(and(...filters))
      .returning();
  }

  // ========================================
  // UPDATE_METHODS
  // ========================================

  async update(id, data) {
    const [updatedTeacher] = await this.db
      .update(teachers)
      .set(data)
      .where(eq(teachers.id, id))
      .returning();
    return updatedTeacher;
  }

  // ========================================
  // DELETE_METHODS
  // ========================================

  async delete(id) {
    const [deletedTeacher] = await this.db
      .delete(teachers)
      .where(eq(teachers.id, id))
      .returning();
    return deletedTeacher;
  }

  async deleteAll() {
    // Shared teacher identities are cleared across all years during a seed reset.
    // Only linked accounts are needed; assignment reads require a selected year.
    const allTeachers = await this.db
      .select({ userId: staff.userId })
      .from(teachers)
      .innerJoin(staff, eq(teachers.staffId, staff.id));

    const userIds = allTeachers
      .map(teacher => teacher.userId)
      .filter(userId => userId !== null);

    const deletedTeachers = await this.db
      .delete(teachers)
      .returning();

    if (userIds.length > 0) {
      await this.db
        .delete(users)
        .where(inArray(users.id, userIds))
        .returning();
    }

    return {
      deletedCount: deletedTeachers.length,
      deletedTeachers: deletedTeachers
    };
  }

  async hasAnyAssignments(id?: string) {
    const [row] = await this.db.select({ id: teacherAssignments.id }).from(teacherAssignments)
      .where(id ? eq(teacherAssignments.teacherId, id) : undefined).limit(1);
    return !!row;
  }

  /**
   * The records a teacher's assignments hold in every year: what deleting the
   * teacher erases with them. Shared identity deletion affects every year, so
   * nothing here reads the selected one.
   */
  private historyScope(id: string) {
    const assignmentIds = this.db.select({ id: teacherAssignments.id }).from(teacherAssignments)
      .where(eq(teacherAssignments.teacherId, id));
    return {
      assignmentIds,
      examIds: this.db.select({ id: exams.id }).from(exams).where(inArray(exams.teacherAssignmentId, assignmentIds)),
      assessmentIds: this.db.select({ id: assessments.id }).from(assessments).where(inArray(assessments.teacherAssignmentId, assignmentIds)),
    };
  }

  /** How many of each record deleting this teacher erases, in every year. */
  async recordedHistory(id: string) {
    const { assignmentIds, examIds, assessmentIds } = this.historyScope(id);
    const total = async (query: Promise<Array<{ n: number }>>) => Number((await query)[0]?.n ?? 0);
    const [examCount, assessmentCount, gradeCount, attendanceCount, lessonCount, homeworkCount] = await Promise.all([
      total(this.db.select({ n: count() }).from(exams).where(inArray(exams.teacherAssignmentId, assignmentIds))),
      total(this.db.select({ n: count() }).from(assessments).where(inArray(assessments.teacherAssignmentId, assignmentIds))),
      total(this.db.select({ n: count() }).from(grades).where(or(inArray(grades.examId, examIds), inArray(grades.assessmentId, assessmentIds)))),
      total(this.db.select({ n: count() }).from(attendance).where(or(eq(attendance.teacherId, id), inArray(attendance.teacherAssignmentId, assignmentIds)))),
      total(this.db.select({ n: count() }).from(routineEntries).where(inArray(routineEntries.teacherAssignmentId, assignmentIds))),
      total(this.db.select({ n: count() }).from(homework).where(inArray(homework.teacherAssignmentId, assignmentIds))),
    ]);
    return { exams: examCount, assessments: assessmentCount, grades: gradeCount, attendance: attendanceCount, lessons: lessonCount, homework: homeworkCount };
  }

  /**
   * Erases what a teacher recorded, in every year, so the teacher can be
   * deleted: their exams and assessments with the students' grades, their
   * attendance (its history goes with it), their timetable lessons and the
   * homework they posted (its attachment rows go with it; the files, once no
   * row points at them, go with the next storage sweep). Run inside the
   * deletion's transaction, before the teacher row.
   */
  async eraseRecordedHistory(id: string) {
    const { assignmentIds, examIds, assessmentIds } = this.historyScope(id);
    await this.db.delete(homework).where(inArray(homework.teacherAssignmentId, assignmentIds));
    await this.db.delete(grades).where(or(inArray(grades.examId, examIds), inArray(grades.assessmentId, assessmentIds)));
    await this.db.delete(exams).where(inArray(exams.teacherAssignmentId, assignmentIds));
    await this.db.delete(assessments).where(inArray(assessments.teacherAssignmentId, assignmentIds));
    await this.db.delete(attendance).where(or(eq(attendance.teacherId, id), inArray(attendance.teacherAssignmentId, assignmentIds)));
    await this.db.delete(routineEntries).where(inArray(routineEntries.teacherAssignmentId, assignmentIds));
  }

  // ========================================
  // VALIDATION_HELPERS
  // ========================================
  async checkInSection(teacherId, sectionId) {
    const [result] = await this.db
      .select({ id: teacherAssignments.id })
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.sectionId, sectionId),
          inArray(teacherAssignments.classId, this.classesInSelectedYear()),
        )
      )
      .limit(1);

    return !!result;
  }

  private classesInSelectedYear() {
    return this.db.select({ id: classes.id }).from(classes)
      .where(eq(classes.academicYear, this.year.label));
  }
}
