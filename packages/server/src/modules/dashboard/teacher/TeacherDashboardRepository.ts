import { and, asc, count, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm';
import { Repository } from '../../../najm';
import { DB } from '../../../database/db';
import {
  assessments,
  attendance,
  classes,
  disciplineIncidents,
  grades,
  routineEntries,
  routinePeriods,
  routineSchedules,
  sections,
  students,
  subjects,
  teacherAssignments,
} from '../../../database/schema';

// Every read takes the teacher, or ids already derived from the teacher's own
// assignments, so a teacher only ever counts their own lessons and sections.
// The teacher itself is resolved through the owned TeacherRepository.
@Repository()
export class TeacherDashboardRepository {
  declare db: DB;

  private activeStudentsIn(sectionId: typeof sections.id) {
    return sql<number>`(
      SELECT COUNT(*) FROM ${students}
      WHERE ${students.sectionId} = ${sectionId} AND ${students.status} = 'active'
    )`.mapWith(Number);
  }

  async getAssignments(teacherId: string, academicYear: string) {
    return this.db
      .select({
        teacherAssignmentId: teacherAssignments.id,
        classId: classes.id,
        className: classes.name,
        sectionId: sections.id,
        sectionName: sections.name,
        subjectId: subjects.id,
        subjectName: subjects.name,
        studentCount: this.activeStudentsIn(sections.id),
      })
      .from(teacherAssignments)
      .innerJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .innerJoin(classes, eq(sections.classId, classes.id))
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(and(
        eq(teacherAssignments.teacherId, teacherId),
        eq(classes.academicYear, academicYear),
      ))
      .orderBy(asc(classes.name), asc(sections.name), asc(subjects.name));
  }

  /** The teacher's lessons in the given routines, on active days only. */
  async getWeekEntries(teacherId: string, scheduleIds: string[]) {
    if (!scheduleIds.length) return [];
    return this.db
      .select({
        entryId: routineEntries.id,
        dayOfWeek: routineEntries.dayOfWeek,
        activeDays: routineSchedules.activeDays,
        teacherAssignmentId: teacherAssignments.id,
        classId: classes.id,
        className: classes.name,
        sectionId: sections.id,
        sectionName: sections.name,
        subjectId: subjects.id,
        subjectName: subjects.name,
        roomNumber: sql<string | null>`COALESCE(${routineEntries.roomNumber}, ${sections.roomNumber})`,
        startTime: routinePeriods.startTime,
        endTime: routinePeriods.endTime,
      })
      .from(routineEntries)
      .innerJoin(routineSchedules, eq(routineEntries.scheduleId, routineSchedules.id))
      .innerJoin(routinePeriods, eq(routineEntries.periodId, routinePeriods.id))
      .innerJoin(teacherAssignments, eq(routineEntries.teacherAssignmentId, teacherAssignments.id))
      .innerJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .innerJoin(classes, eq(sections.classId, classes.id))
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(and(
        inArray(routineEntries.scheduleId, scheduleIds),
        eq(teacherAssignments.teacherId, teacherId),
      ))
      .orderBy(asc(routinePeriods.startTime));
  }

  /**
   * Student marks per day. Daily registers belong to the section, so they are
   * matched by section; per-lesson registers by the teacher's assignments.
   */
  async getAttendanceByDay(scope: AttendanceScope, from: string, to: string) {
    const condition = this.scopeCondition(scope);
    if (!condition) return [];
    return this.db
      .select({
        date: attendance.date,
        total: count(),
        attended: sql<number>`COUNT(*) FILTER (WHERE ${attendance.status} <> 'absent')`.mapWith(Number),
      })
      .from(attendance)
      .where(and(
        eq(attendance.type, 'student'),
        gte(attendance.date, from),
        lte(attendance.date, to),
        condition,
      ))
      .groupBy(attendance.date)
      .orderBy(asc(attendance.date));
  }

  /** Which registers exist: one row per day, section and marking assignment. */
  async getRegisters(scope: AttendanceScope, from: string, to: string) {
    const condition = this.scopeCondition(scope);
    if (!condition) return [];
    return this.db
      .selectDistinct({
        date: attendance.date,
        sectionId: attendance.sectionId,
        teacherAssignmentId: attendance.teacherAssignmentId,
      })
      .from(attendance)
      .where(and(
        eq(attendance.type, 'student'),
        gte(attendance.date, from),
        lte(attendance.date, to),
        condition,
      ));
  }

  private scopeCondition({ mode, sectionIds, assignmentIds }: AttendanceScope) {
    if (mode === 'per_class') {
      return assignmentIds.length ? inArray(attendance.teacherAssignmentId, assignmentIds) : undefined;
    }
    return sectionIds.length ? inArray(attendance.sectionId, sectionIds) : undefined;
  }

  /** The teacher's uncancelled assessments this year, with grading progress. */
  async getAssessments(teacherId: string, academicYearId: string) {
    return this.db
      .select({
        id: assessments.id,
        title: assessments.title,
        type: assessments.type,
        status: assessments.status,
        date: assessments.date,
        className: classes.name,
        sectionName: sections.name,
        subjectName: subjects.name,
        gradedCount: sql<number>`(
          SELECT COUNT(DISTINCT ${grades.studentId}) FROM ${grades}
          WHERE ${grades.assessmentId} = ${assessments.id} AND ${grades.status} <> 'pending'
        )`.mapWith(Number),
        studentCount: this.activeStudentsIn(sections.id),
      })
      .from(assessments)
      .innerJoin(teacherAssignments, eq(assessments.teacherAssignmentId, teacherAssignments.id))
      .innerJoin(sections, eq(teacherAssignments.sectionId, sections.id))
      .innerJoin(classes, eq(sections.classId, classes.id))
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(and(
        eq(teacherAssignments.teacherId, teacherId),
        eq(assessments.academicYearId, academicYearId),
        ne(assessments.status, 'cancelled'),
      ))
      .orderBy(asc(assessments.date));
  }

  async countOpenIncidents(sectionIds: string[]) {
    if (!sectionIds.length) return 0;
    const [row] = await this.db
      .select({ count: count() })
      .from(disciplineIncidents)
      .where(and(
        inArray(disciplineIncidents.sectionId, sectionIds),
        eq(disciplineIncidents.status, 'open'),
      ));
    return Number(row?.count ?? 0);
  }
}

export type AttendanceScope = {
  mode: 'daily' | 'per_class';
  sectionIds: string[];
  assignmentIds: string[];
};
