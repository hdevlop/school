import { Repository } from '@server/najm';
import { Owned } from '@server/auth';
import { and, desc, eq, asc, or, gte, lte, sql, inArray, isNull } from 'drizzle-orm';
import { attendance, attendanceHistory, settings, students, teacherAssignments, teachers, staff, subjects, classes, sections, users } from '@server/database/schema';
import { DB } from '@server/database/db';
import { alias } from 'drizzle-orm/pg-core';
import { Attendance } from './AttendanceGuards';

export const attendanceSelect = {
  id: attendance.id,
  type: attendance.type,
  studentId: attendance.studentId,
  staffId: attendance.staffId,
  teacherId: attendance.teacherId,
  teacherAssignmentId: attendance.teacherAssignmentId,
  sectionId: attendance.sectionId,
  date: attendance.date,
  status: attendance.status,
  notes: attendance.notes,
  markedBy: attendance.markedBy,
  createdAt: attendance.createdAt,
  updatedAt: attendance.updatedAt,
};

@Owned(Attendance)
@Repository()
export class AttendanceRepository {
  declare db: DB;
  declare scope: (query: any) => any;

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

  async getAll(type?: string) {
    const query = this.scope(this.buildAttendanceQuery());
    if (type) {
      return await query.where(eq(attendance.type, type)).orderBy(desc(attendance.createdAt));
    }
    return await query.orderBy(desc(attendance.createdAt));
  }

  async getById(id) {
    const [result] = await this.scope(this.buildAttendanceQuery())
      .where(eq(attendance.id, id))
      .limit(1);

    return result;
  }

  async getByDate(date, type?: string) {
    const conditions = [eq(attendance.date, date)];
    if (type) conditions.push(eq(attendance.type, type));

    return await this.scope(this.buildAttendanceQuery())
      .where(and(...conditions))
      .orderBy(asc(classes.name), asc(sections.name), asc(students.name));
  }

  async getBySection(sectionId) {
    return await this.scope(this.buildAttendanceQuery())
      .where(eq(teacherAssignments.sectionId, sectionId))
      .orderBy(desc(attendance.date), asc(students.name));
  }

  async getByStudent(studentId) {
    return await this.scope(this.buildAttendanceQuery())
      .where(and(eq(attendance.studentId, studentId), eq(attendance.type, 'student')))
      .orderBy(desc(attendance.date));
  }

  async getByStaff(staffId: string) {
    return await this.scope(this.buildAttendanceQuery())
      .where(and(eq(attendance.staffId, staffId), eq(attendance.type, 'staff')))
      .orderBy(desc(attendance.date));
  }

  async getByTeacher(teacherId) {
    const [teacher] = await this.db
      .select({ staffId: teachers.staffId })
      .from(teachers)
      .where(eq(teachers.id, teacherId))
      .limit(1);

    const conditions = [eq(attendance.teacherId, teacherId)];
    if (teacher?.staffId) {
      conditions.push(eq(attendance.staffId, teacher.staffId));
    }

    return await this.scope(this.buildAttendanceQuery())
      .where(or(...conditions))
      .orderBy(desc(attendance.date));
  }

  async getByTeacherId(teacherId) {
    return await this.scope(this.buildAttendanceQuery())
      .where(eq(teacherAssignments.teacherId, teacherId))
      .orderBy(desc(attendance.date), asc(students.name));
  }

  async getToday(type?: string) {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());

    const todayDate = today.toISOString().split('T')[0];
    return await this.getByDate(todayDate, type);
  }

  async create(attendanceData) {
    const [newAttendance] = await this.db
      .insert(attendance)
      .values(attendanceData)
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
        date: item.date,
        status: item.status as 'present' | 'absent' | 'late',
        notes: item.notes ?? null,
        markedBy: userId,
      })))
      .onConflictDoUpdate({
        target: [attendance.staffId, attendance.date],
        targetWhere: sql`${attendance.type} = 'staff'`,
        set: {
          status: sql`excluded.status`,
          notes: sql`excluded.notes`,
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
      .where(eq(attendance.id, id))
      .returning();

    return updatedAttendance;
  }

  async delete(id) {
    const [deletedAttendance] = await this.db
      .delete(attendance)
      .where(eq(attendance.id, id))
      .returning();

    return deletedAttendance;
  }

  async deleteAll() {
    const deletedAttendance = await this.db
      .delete(attendance)
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

  async getMonthlyStats(type: 'student' | 'staff', academicYear: string) {
    const startYear = Number(academicYear.split('-')[0]);
    const windowStart = `${startYear}-09-01`;
    const windowEnd = `${startYear + 1}-08-31`;

    const rows = await this.db
      .select({
        month: sql<string>`TO_CHAR(${attendance.date}, 'YYYY-MM')`,
        present: sql<string>`COUNT(*) FILTER (WHERE ${attendance.status} = 'present')`,
        absent: sql<string>`COUNT(*) FILTER (WHERE ${attendance.status} = 'absent')`,
        late: sql<string>`COUNT(*) FILTER (WHERE ${attendance.status} = 'late')`,
        total: sql<string>`COUNT(*)`,
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.type, type),
          gte(attendance.date, windowStart),
          lte(attendance.date, windowEnd),
        ),
      )
      .groupBy(sql`TO_CHAR(${attendance.date}, 'YYYY-MM')`);

    const map = new Map(
      rows.map((r) => [r.month, {
        present: Number(r.present),
        absent: Number(r.absent),
        late: Number(r.late),
        total: Number(r.total),
      }]),
    );

    const result: { month: string; present: number; absent: number; late: number; total: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(startYear, 8 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const v = map.get(key) ?? { present: 0, absent: 0, late: 0, total: 0 };
      result.push({ month: key, ...v });
    }
    return result;
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
}
