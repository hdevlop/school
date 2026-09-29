import { Repository } from '../../najm';
import { Owned, type OwnedWhere } from '../../auth';
import { and, desc, eq, asc, or, gte, lte, sql, inArray, isNull, isNotNull } from 'drizzle-orm';
import { attendance, attendanceHistory, settings, students, teacherAssignments, teachers, staff, subjects, classes, sections, users } from '../../database/schema';
import { DB } from '../../database/db';
import { alias } from 'drizzle-orm/pg-core';
import { inReportingYear, type ReportingYear } from '../academicYears/academicRecordYear';
import { monthsBetween } from '@sms/contracts/academic-years';
import { Attendance, AttendanceInTaughtSection, AttendanceUnderOwnAssignment } from './AttendanceGuards';
import { getBusinessDateOnly } from '../../shared/businessDate';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';

export const attendanceSelect = {
  id: attendance.id,
  type: attendance.type,
  studentId: attendance.studentId,
  staffId: attendance.staffId,
  teacherId: attendance.teacherId,
  teacherAssignmentId: attendance.teacherAssignmentId,
  sectionId: attendance.sectionId,
  academicYearId: attendance.academicYearId,
  date: attendance.date,
  status: attendance.status,
  notes: attendance.notes,
  markedBy: attendance.markedBy,
  createdAt: attendance.createdAt,
  updatedAt: attendance.updatedAt,
};

const inYear = (year: ReportingYear) => inReportingYear(attendance.academicYearId, attendance.date, year);

export type AttendanceListFilters = {
  type?: string;
  sectionId?: string;
  studentId?: string;
  staffId?: string;
};

@Repository()
export class AttendanceRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;
  @Owned(Attendance, AttendanceInTaughtSection, AttendanceUnderOwnAssignment)
  private ownedWhere!: OwnedWhere;

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  private buildAttendanceQuery() {
    const studentUsers = alias(users, 'student_users');
    const teacherUsers = alias(users, 'teacher_users');
    const staffUsers = alias(users, 'staff_users');
    const teacherStaff = alias(staff, 'teacher_staff');
    const attendanceStaff = alias(staff, 'attendance_staff');
    const markedByUsers = alias(users, 'marked_by_users');

    return this.db
      .select({
        ...attendanceSelect,
        student: {
          id: students.id,
          studentCode: students.studentCode,
          name: students.name,
          image: studentUsers.image,
        },
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
        },
        teacher: {
          id: teachers.id,
          name: teacherStaff.name,
          image: teacherUsers.image,
        },
        staff: {
          id: attendanceStaff.id,
          employeeCode: attendanceStaff.employeeCode,
          name: attendanceStaff.name,
          image: staffUsers.image,
          role: attendanceStaff.role,
          department: attendanceStaff.department,
          phone: attendanceStaff.phone,
        },
        class: {
          id: classes.id,
          name: classes.name,
        },
        section: {
          id: sections.id,
          name: sections.name,
        },
        markedByUser: {
          id: markedByUsers.id,
          email: markedByUsers.email,
          image: markedByUsers.image,
        },
      })
      .from(attendance)
      .leftJoin(students, eq(attendance.studentId, students.id))
      .leftJoin(studentUsers, eq(students.userId, studentUsers.id))
      .leftJoin(teacherAssignments, eq(attendance.teacherAssignmentId, teacherAssignments.id))
      .leftJoin(teachers, or(eq(attendance.teacherId, teachers.id), eq(teacherAssignments.teacherId, teachers.id)))
      .leftJoin(teacherStaff, eq(teachers.staffId, teacherStaff.id))
      .leftJoin(teacherUsers, eq(teacherStaff.userId, teacherUsers.id))
      .leftJoin(attendanceStaff, eq(attendance.staffId, attendanceStaff.id))
      .leftJoin(staffUsers, eq(attendanceStaff.userId, staffUsers.id))
      .leftJoin(
        sections,
        eq(sections.id, sql`COALESCE(${attendance.sectionId}, ${teacherAssignments.sectionId})`),
      )
      .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .leftJoin(classes, eq(sections.classId, classes.id))
      .leftJoin(markedByUsers, eq(attendance.markedBy, markedByUsers.id));
  }

  // The year's marks the user may read (stored year, else the date in the
  // year's reporting interval), optionally of one type, section, student or
  // staff member. Year, filters and ownership are one WHERE.
  async getAll({ type, sectionId, studentId, staffId }: AttendanceListFilters = {}) {
    return await this.buildAttendanceQuery()
      .where(and(
        this.ownedWhere(),
        inYear(this.year),
        type ? eq(attendance.type, type) : undefined,
        sectionId ? eq(sections.id, sectionId) : undefined,
        studentId ? and(eq(attendance.studentId, studentId), eq(attendance.type, 'student')) : undefined,
        staffId ? and(eq(attendance.staffId, staffId), eq(attendance.type, 'staff')) : undefined,
      ))
      .orderBy(...(sectionId
        ? [desc(attendance.date), asc(students.name)]
        : studentId || staffId ? [desc(attendance.date)] : [desc(attendance.createdAt)]));
  }

  async getById(id) {
    const [result] = await this.buildAttendanceQuery()
      .where(and(this.ownedWhere(), eq(attendance.id, id), inYear(this.year)))
      .limit(1);

    return result;
  }

  async getByDate(date, type?: string) {
    const conditions = [eq(attendance.date, date)];
    if (type) conditions.push(eq(attendance.type, type));

    return await this.buildAttendanceQuery()
      .where(and(this.ownedWhere(), ...conditions, inYear(this.year)))
      .orderBy(asc(classes.name), asc(sections.name), asc(students.name));
  }

  async getByTeacher(teacherId: string) {
    const [teacher] = await this.db
      .select({ staffId: teachers.staffId })
      .from(teachers)
      .where(eq(teachers.id, teacherId))
      .limit(1);

    const conditions = [eq(attendance.teacherId, teacherId)];
    if (teacher?.staffId) {
      conditions.push(eq(attendance.staffId, teacher.staffId));
    }

    return await this.buildAttendanceQuery()
      .where(and(this.ownedWhere(), or(...conditions), inYear(this.year)))
      .orderBy(desc(attendance.date));
  }

  async getByTeacherId(teacherId) {
    return await this.buildAttendanceQuery()
      .where(and(this.ownedWhere(), eq(teacherAssignments.teacherId, teacherId), inYear(this.year)))
      .orderBy(desc(attendance.date), asc(students.name));
  }

  async getToday(type?: string) {
    return await this.getByDate(getBusinessDateOnly(), type);
  }

  async create(attendanceData) {
    const [newAttendance] = await this.db
      .insert(attendance)
      .values({ ...attendanceData, academicYearId: this.year.id })
      .returning();

    return await this.getById(newAttendance.id);
  }

  async getEligibleStaffIds(staffIds: string[], date: string) {
    if (!staffIds.length) return [];

    const rows = await this.db
      .select({ id: staff.id })
      .from(staff)
      .where(and(
        inArray(staff.id, staffIds),
        lte(staff.hireDate, date),
        or(isNull(staff.endDate), gte(staff.endDate, date)),
        inArray(staff.status, ['active', 'onLeave']),
      ));

    return rows.map((row) => row.id);
  }

  async upsertStaffRoster(
    items: Array<{ staffId: string; date: string; status: string; notes?: string | null }>,
    userId: string,
  ) {
    const rows = await this.db
      .insert(attendance)
      .values(items.map((item) => ({
        type: 'staff' as const,
        staffId: item.staffId,
        academicYearId: this.year.id,
        date: item.date,
        status: item.status as 'present' | 'absent' | 'late',
        notes: item.notes ?? null,
        markedBy: userId,
      })))
      .onConflictDoUpdate({
        target: [attendance.staffId, attendance.date],
        targetWhere: sql`${attendance.type} = 'staff'`,
        setWhere: inYear(this.year),
        set: {
          status: sql`excluded.status`,
          notes: sql`excluded.notes`,
          academicYearId: sql`excluded.academic_year_id`,
          lastUpdatedBy: userId,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning({ id: attendance.id });

    return { savedCount: rows.length, ids: rows.map((row) => row.id) };
  }

  async update(id, attendanceData) {
    const [updatedAttendance] = await this.db
      .update(attendance)
      .set(attendanceData)
      .where(and(eq(attendance.id, id), inYear(this.year)))
      .returning();

    return updatedAttendance;
  }

  async delete(id) {
    const [deletedAttendance] = await this.db
      .delete(attendance)
      .where(and(eq(attendance.id, id), inYear(this.year)))
      .returning();

    return deletedAttendance;
  }

  async deleteAll() {
    const deletedAttendance = await this.db
      .delete(attendance)
      .where(inYear(this.year))
      .returning();

    return {
      deletedCount: deletedAttendance.length,
      deletedAttendance: deletedAttendance
    };
  }

  async getTeacherAssignment(teacherId, subjectId, sectionId) {
    const [result] = await this.db
      .select()
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, teacherId),
          eq(teacherAssignments.subjectId, subjectId),
          eq(teacherAssignments.sectionId, sectionId)
        )
      )
      .limit(1);
    return result;
  }

  async checkDuplicateAttendance(studentId, teacherAssignmentId, date) {
    const [existing] = await this.db
      .select()
      .from(attendance)
      .where(and(
        eq(attendance.studentId, studentId),
        eq(attendance.teacherAssignmentId, teacherAssignmentId),
        eq(attendance.date, date)
      ))
      .limit(1);

    return existing;
  }

  // School-wide monthly counts for the selected year, by the stored-year-or-
  // date rule the year lists use, over the year's own
  // reporting months. A registered row dated outside its year is omitted from
  // the monthly chart because the year has no corresponding reporting month.
  async getMonthlyStats(type: 'student' | 'staff') {
    const year = this.year;
    const month = sql<string>`TO_CHAR(${attendance.date}, 'YYYY-MM')`;
    const rows = await this.db
      .select({
        month,
        present: sql<string>`COUNT(*) FILTER (WHERE ${attendance.status} = 'present')`,
        absent: sql<string>`COUNT(*) FILTER (WHERE ${attendance.status} = 'absent')`,
        late: sql<string>`COUNT(*) FILTER (WHERE ${attendance.status} = 'late')`,
        total: sql<string>`COUNT(*)`,
      })
      .from(attendance)
      .where(and(eq(attendance.type, type), inYear(year)))
      .groupBy(month);

    const byMonth = new Map(rows.map((r) => [r.month, {
      present: Number(r.present),
      absent: Number(r.absent),
      late: Number(r.late),
      total: Number(r.total),
    }]));
    return monthsBetween(year.reportingStartsOn, year.reportingEndsOn).map((key) => ({
      month: key,
      ...(byMonth.get(key) ?? { present: 0, absent: 0, late: 0, total: 0 }),
    }));
  }

  async getPresentCountInRange(type: 'student' | 'staff', startDate: string, endDate: string) {
    const [row] = await this.db
      .select({ count: sql<string>`COUNT(*)` })
      .from(attendance)
      .where(
        and(
          eq(attendance.type, type),
          eq(attendance.status, 'present'),
          gte(attendance.date, startDate),
          lte(attendance.date, endDate),
        ),
      );
    return Number(row?.count ?? 0);
  }

  async getAbsentLateCountsInRange(type: 'student' | 'staff', startDate: string, endDate: string) {
    const [row] = await this.db
      .select({
        absent: sql<string>`COUNT(*) FILTER (WHERE ${attendance.status} = 'absent')`,
        late: sql<string>`COUNT(*) FILTER (WHERE ${attendance.status} = 'late')`,
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.type, type),
          gte(attendance.date, startDate),
          lte(attendance.date, endDate),
        ),
      );
    return { absent: Number(row?.absent ?? 0), late: Number(row?.late ?? 0) };
  }

  // Find the daily-mode record for a student in a section on a given date.
  // Matches either the denormalized attendance.sectionId (new rows, including
  // admin/staff-marked without a teacher assignment) or the section reached
  // through teacher_assignments (legacy rows pre-denormalization).
  async findSameDayForStudentInSection(studentId: string, sectionId: string, date: string) {
    const [existing] = await this.db
      .select({ attendance })
      .from(attendance)
      .leftJoin(teacherAssignments, eq(attendance.teacherAssignmentId, teacherAssignments.id))
      .where(and(
        eq(attendance.studentId, studentId),
        eq(attendance.date, date),
        or(
          eq(attendance.sectionId, sectionId),
          eq(teacherAssignments.sectionId, sectionId),
        ),
      ))
      .orderBy(asc(attendance.createdAt))
      .limit(1);

    return existing?.attendance;
  }

  async createHistory(historyData: {
    attendanceId: string;
    oldStatus: string | null;
    newStatus: string;
    note?: string | null;
    changedBy?: string | null;
  }) {
    const [row] = await this.db
      .insert(attendanceHistory)
      .values(historyData)
      .returning();
    return row;
  }

  async getHistory(attendanceId: string) {
    return await this.db
      .select()
      .from(attendanceHistory)
      .where(eq(attendanceHistory.attendanceId, attendanceId))
      .orderBy(desc(attendanceHistory.changedAt));
  }

  async findFirstAssignmentForTeacherInSection(teacherId: string, sectionId: string) {
    if (!teacherId) return null;
    const [row] = await this.db
      .select({ id: teacherAssignments.id })
      .from(teacherAssignments)
      .where(and(
        eq(teacherAssignments.teacherId, teacherId),
        eq(teacherAssignments.sectionId, sectionId),
      ))
      .limit(1);
    return row ?? null;
  }

  async isTeacherInSection(teacherId: string, sectionId: string) {
    if (!teacherId) return false;
    const [row] = await this.db
      .select({ id: teacherAssignments.id })
      .from(teacherAssignments)
      .where(and(
        eq(teacherAssignments.teacherId, teacherId),
        eq(teacherAssignments.sectionId, sectionId),
      ))
      .limit(1);
    return !!row;
  }

  async teacherIdForUser(userId: string) {
    const [row] = await this.db.select({ id: teachers.id })
      .from(teachers)
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .where(eq(staff.userId, userId))
      .limit(1);
    return row?.id ?? null;
  }

  // School-wide attendance mode: first settings row (admin-owned).
  // Fallback to 'daily' when no settings exist yet (fresh install).
  async getAttendanceMode(): Promise<'daily' | 'per_class'> {
    const [row] = await this.db
      .select({ mode: settings.attendanceMode })
      .from(settings)
      .limit(1);
    return (row?.mode as 'daily' | 'per_class') ?? 'daily';
  }

  async checkDuplicateStaffAttendance(staffId: string, date: string) {
    const [existing] = await this.db
      .select()
      .from(attendance)
      .where(and(
        eq(attendance.type, 'staff'),
        eq(attendance.staffId, staffId),
        eq(attendance.date, date)
      ))
      .limit(1);

    return existing;
  }

  async hasRegisteredYear(id: string) {
    const [row] = await this.db.select({ id: attendance.id }).from(attendance)
      .where(and(eq(attendance.id, id), isNotNull(attendance.academicYearId)))
      .limit(1);
    return Boolean(row);
  }

  /** Trusted full reset; user-facing deletion is limited to the selected year. */
  async clearForSeedReset() {
    await this.db.delete(attendance);
  }

}
