import { and, asc, desc, eq, gt, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';

import { DB } from '@server/database/db';
import {
  classes,
  routineDuties,
  routineEntries,
  routinePeriods,
  routineSchedules,
  sections,
  staff,
  subjects,
  teacherAssignments,
  teachers,
} from '@server/database/schema';
import { Repository } from '@server/najm';
import type { RoutineListQuery } from './ClassRoutineDto';

@Repository()
export class ClassRoutineRepository {
  declare db: DB;

  async getPeriods(includeInactive = false, scheduleId?: string) {
    const conditions = [scheduleId
      ? eq(routinePeriods.scheduleId, scheduleId)
      : isNull(routinePeriods.scheduleId)];
    if (!includeInactive) conditions.push(eq(routinePeriods.isActive, true));
    return this.db.select().from(routinePeriods)
      .where(and(...conditions))
      .orderBy(asc(routinePeriods.sortOrder));
  }

  async getPeriod(id: string) {
    const [period] = await this.db.select().from(routinePeriods).where(eq(routinePeriods.id, id)).limit(1);
    return period;
  }

  async createPeriod(data: typeof routinePeriods.$inferInsert) {
    const [created] = await this.db.insert(routinePeriods).values(data).returning();
    return created;
  }

  async createPeriods(data: (typeof routinePeriods.$inferInsert)[]) {
    return this.db.insert(routinePeriods).values(data).returning();
  }

  async updatePeriod(id: string, data: Partial<typeof routinePeriods.$inferInsert>) {
    const [updated] = await this.db.update(routinePeriods).set(data).where(eq(routinePeriods.id, id)).returning();
    return updated;
  }

  async deletePeriods(ids: string[]) {
    if (!ids.length) return [];
    return this.db.delete(routinePeriods).where(inArray(routinePeriods.id, ids)).returning();
  }

  async list(filters: RoutineListQuery = {}) {
    const conditions = [];
    if (filters.sectionId) conditions.push(eq(routineSchedules.sectionId, filters.sectionId));
    if (filters.academicYear) conditions.push(eq(routineSchedules.academicYear, filters.academicYear));
    if (filters.status) conditions.push(eq(routineSchedules.status, filters.status));
    else conditions.push(inArray(routineSchedules.status, ['draft', 'published']));
    if (filters.classId) conditions.push(eq(sections.classId, filters.classId));

    return this.db.select({
      id: routineSchedules.id,
      sectionId: routineSchedules.sectionId,
      academicYear: routineSchedules.academicYear,
      name: routineSchedules.name,
      status: routineSchedules.status,
      activeDays: routineSchedules.activeDays,
      layoutConfig: routineSchedules.layoutConfig,
      publishedAt: routineSchedules.publishedAt,
      createdAt: routineSchedules.createdAt,
      updatedAt: routineSchedules.updatedAt,
      sectionName: sections.name,
      classId: classes.id,
      className: classes.name,
      roomNumber: sections.roomNumber,
    })
      .from(routineSchedules)
      .innerJoin(sections, eq(routineSchedules.sectionId, sections.id))
      .innerJoin(classes, eq(sections.classId, classes.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(routineSchedules.updatedAt));
  }

  async getSchedule(id: string) {
    const [schedule] = await this.db.select({
      id: routineSchedules.id,
      sectionId: routineSchedules.sectionId,
      academicYear: routineSchedules.academicYear,
      name: routineSchedules.name,
      status: routineSchedules.status,
      activeDays: routineSchedules.activeDays,
      layoutConfig: routineSchedules.layoutConfig,
      publishedAt: routineSchedules.publishedAt,
      publishedBy: routineSchedules.publishedBy,
      createdAt: routineSchedules.createdAt,
      updatedAt: routineSchedules.updatedAt,
      sectionName: sections.name,
      classId: classes.id,
      className: classes.name,
      roomNumber: sections.roomNumber,
    })
      .from(routineSchedules)
      .innerJoin(sections, eq(routineSchedules.sectionId, sections.id))
      .innerJoin(classes, eq(sections.classId, classes.id))
      .where(eq(routineSchedules.id, id))
      .limit(1);
    return schedule;
  }

  async getEntries(scheduleId: string) {
    return this.db.select({
      id: routineEntries.id,
      scheduleId: routineEntries.scheduleId,
      dayOfWeek: routineEntries.dayOfWeek,
      periodId: routineEntries.periodId,
      teacherAssignmentId: routineEntries.teacherAssignmentId,
      roomNumber: routineEntries.roomNumber,
      notes: routineEntries.notes,
      teacherId: teachers.id,
      teacherName: staff.name,
      subjectId: subjects.id,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      classId: teacherAssignments.classId,
      sectionId: teacherAssignments.sectionId,
    })
      .from(routineEntries)
      .innerJoin(teacherAssignments, eq(routineEntries.teacherAssignmentId, teacherAssignments.id))
      .innerJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(eq(routineEntries.scheduleId, scheduleId));
  }

  async getDuties(scheduleId: string) {
    return this.db.select({
      id: routineDuties.id,
      scheduleId: routineDuties.scheduleId,
      dayOfWeek: routineDuties.dayOfWeek,
      periodId: routineDuties.periodId,
      staffId: routineDuties.staffId,
      staffName: staff.name,
      staffRole: staff.role,
      teacherId: teachers.id,
      teacherName: staff.name,
      notes: routineDuties.notes,
    })
      .from(routineDuties)
      .innerJoin(staff, eq(routineDuties.staffId, staff.id))
      .leftJoin(teachers, eq(staff.id, teachers.staffId))
      .where(eq(routineDuties.scheduleId, scheduleId));
  }

  async getDuty(id: string) {
    const [duty] = await this.db.select().from(routineDuties).where(eq(routineDuties.id, id)).limit(1);
    return duty;
  }

  async getStaffSupervisor(id: string) {
    const [member] = await this.db.select({
      id: staff.id,
      name: staff.name,
      role: staff.role,
      teacherId: teachers.id,
    })
      .from(staff)
      .leftJoin(teachers, eq(staff.id, teachers.staffId))
      .where(eq(staff.id, id))
      .limit(1);
    return member;
  }

  async getDutyCandidates() {
    return this.db.select({
      staffId: staff.id,
      staffName: staff.name,
      staffRole: staff.role,
      teacherId: teachers.id,
    })
      .from(staff)
      .leftJoin(teachers, eq(staff.id, teachers.staffId))
      .where(eq(staff.status, 'active'))
      .orderBy(asc(staff.name));
  }

  async getEntry(id: string) {
    const [entry] = await this.db.select().from(routineEntries).where(eq(routineEntries.id, id)).limit(1);
    return entry;
  }

  async getSection(sectionId: string) {
    const [section] = await this.db.select({
      id: sections.id,
      classId: sections.classId,
      name: sections.name,
      roomNumber: sections.roomNumber,
      classAcademicYear: classes.academicYear,
    }).from(sections).innerJoin(classes, eq(sections.classId, classes.id))
      .where(eq(sections.id, sectionId)).limit(1);
    return section;
  }

  async getAssignment(id: string) {
    const [assignment] = await this.db.select({
      id: teacherAssignments.id,
      teacherId: teacherAssignments.teacherId,
      teacherStaffId: teachers.staffId,
      sectionId: teacherAssignments.sectionId,
      classId: teacherAssignments.classId,
      subjectId: teacherAssignments.subjectId,
    })
      .from(teacherAssignments)
      .innerJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .where(eq(teacherAssignments.id, id))
      .limit(1);
    return assignment;
  }

  async getAssignmentsForSection(sectionId: string) {
    return this.db.select({
      id: teacherAssignments.id,
      classId: teacherAssignments.classId,
      sectionId: teacherAssignments.sectionId,
      teacherId: teachers.id,
      teacherName: staff.name,
      subjectId: subjects.id,
      subjectName: subjects.name,
      subjectCode: subjects.code,
    })
      .from(teacherAssignments)
      .innerJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .innerJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(eq(teacherAssignments.sectionId, sectionId))
      .orderBy(asc(subjects.name), asc(staff.name));
  }

  async createSchedule(data: typeof routineSchedules.$inferInsert) {
    const [created] = await this.db.insert(routineSchedules).values(data).returning();
    return created;
  }

  async updateSchedule(id: string, data: Partial<typeof routineSchedules.$inferInsert>) {
    const [updated] = await this.db.update(routineSchedules).set(data).where(eq(routineSchedules.id, id)).returning();
    return updated;
  }

  async deleteSchedule(id: string) {
    const [deleted] = await this.db.delete(routineSchedules).where(eq(routineSchedules.id, id)).returning();
    return deleted;
  }

  async createEntry(data: typeof routineEntries.$inferInsert) {
    const [created] = await this.db.insert(routineEntries).values(data).returning();
    return created;
  }

  async updateEntry(id: string, data: Partial<typeof routineEntries.$inferInsert>) {
    const [updated] = await this.db.update(routineEntries).set(data).where(eq(routineEntries.id, id)).returning();
    return updated;
  }

  async updateEntryPeriod(id: string, periodId: string) {
    const [updated] = await this.db.update(routineEntries)
      .set({ periodId })
      .where(eq(routineEntries.id, id))
      .returning();
    return updated;
  }

  async createDuty(data: typeof routineDuties.$inferInsert) {
    const [created] = await this.db.insert(routineDuties).values(data).returning();
    return created;
  }

  async updateDuty(id: string, data: Partial<typeof routineDuties.$inferInsert>) {
    const [updated] = await this.db.update(routineDuties).set(data).where(eq(routineDuties.id, id)).returning();
    return updated;
  }

  async deleteDuty(id: string) {
    const [deleted] = await this.db.delete(routineDuties).where(eq(routineDuties.id, id)).returning();
    return deleted;
  }

  async updateDutyPeriod(id: string, periodId: string) {
    const [updated] = await this.db.update(routineDuties).set({ periodId }).where(eq(routineDuties.id, id)).returning();
    return updated;
  }

  async deleteEntry(id: string) {
    const [deleted] = await this.db.delete(routineEntries).where(eq(routineEntries.id, id)).returning();
    return deleted;
  }

  async getPublishedForSection(sectionId: string, academicYear?: string) {
    const conditions = [
      eq(routineSchedules.sectionId, sectionId),
      inArray(routineSchedules.status, ['draft', 'published']),
    ];
    if (academicYear) conditions.push(eq(routineSchedules.academicYear, academicYear));
    const [schedule] = await this.db.select({ id: routineSchedules.id })
      .from(routineSchedules)
      .where(and(...conditions))
      .orderBy(
        sql`case when ${routineSchedules.status} = 'published' then 0 else 1 end`,
        desc(routineSchedules.updatedAt),
      )
      .limit(1);
    return schedule;
  }

  async getTeacherScheduleIds(teacherId: string, academicYear?: string) {
    const conditions = [
      eq(teacherAssignments.teacherId, teacherId),
      inArray(routineSchedules.status, ['draft', 'published']),
    ];
    if (academicYear) conditions.push(eq(routineSchedules.academicYear, academicYear));
    const rows = await this.db.select({
      id: routineSchedules.id,
      sectionId: routineSchedules.sectionId,
      academicYear: routineSchedules.academicYear,
      status: routineSchedules.status,
      updatedAt: routineSchedules.updatedAt,
    })
      .from(routineEntries)
      .innerJoin(routineSchedules, eq(routineEntries.scheduleId, routineSchedules.id))
      .innerJoin(teacherAssignments, eq(routineEntries.teacherAssignmentId, teacherAssignments.id))
      .where(and(...conditions))
      .orderBy(
        sql`case when ${routineSchedules.status} = 'published' then 0 else 1 end`,
        desc(routineSchedules.updatedAt),
      );
    const currentBySection = new Map<string, string>();
    for (const row of rows) {
      const key = `${row.sectionId}:${row.academicYear}`;
      if (!currentBySection.has(key)) currentBySection.set(key, row.id);
    }
    const dutyConditions = [
      eq(teachers.id, teacherId),
      inArray(routineSchedules.status, ['draft', 'published']),
    ];
    if (academicYear) dutyConditions.push(eq(routineSchedules.academicYear, academicYear));
    const dutyRows = await this.db.select({
      id: routineSchedules.id,
      sectionId: routineSchedules.sectionId,
      academicYear: routineSchedules.academicYear,
    })
      .from(routineDuties)
      .innerJoin(routineSchedules, eq(routineDuties.scheduleId, routineSchedules.id))
      .innerJoin(teachers, eq(routineDuties.staffId, teachers.staffId))
      .where(and(...dutyConditions));
    for (const row of dutyRows) {
      const key = `${row.sectionId}:${row.academicYear}`;
      if (!currentBySection.has(key)) currentBySection.set(key, row.id);
    }
    return [...currentBySection.values()];
  }

  async findDutyConflicts(input: {
    scheduleId: string;
    academicYear: string;
    dayOfWeek: typeof routineDuties.$inferInsert.dayOfWeek;
    staffId: string;
    startTime: string;
    endTime: string;
    excludeDutyId?: string;
  }) {
    const conditions = [
      eq(routineDuties.staffId, input.staffId),
      eq(routineDuties.dayOfWeek, input.dayOfWeek),
      ne(routineDuties.scheduleId, input.scheduleId),
      inArray(routineSchedules.status, ['draft', 'published']),
      eq(routineSchedules.academicYear, input.academicYear),
      lt(routinePeriods.startTime, input.endTime),
      gt(routinePeriods.endTime, input.startTime),
    ];
    if (input.excludeDutyId) conditions.push(ne(routineDuties.id, input.excludeDutyId));
    return this.db.select({ id: routineDuties.id })
      .from(routineDuties)
      .innerJoin(routineSchedules, eq(routineDuties.scheduleId, routineSchedules.id))
      .innerJoin(routinePeriods, eq(routineDuties.periodId, routinePeriods.id))
      .where(and(...conditions));
  }

  async findConflicts(input: {
    scheduleId: string;
    sectionId: string;
    academicYear: string;
    dayOfWeek: typeof routineEntries.$inferInsert.dayOfWeek;
    periodId: string;
    startTime: string;
    endTime: string;
    teacherId: string;
    roomNumber?: string | null;
    excludeEntryId?: string;
  }) {
    const conditions = [
      eq(routineEntries.dayOfWeek, input.dayOfWeek),
      ne(routineEntries.scheduleId, input.scheduleId),
      inArray(routineSchedules.status, ['draft', 'published']),
      eq(routineSchedules.academicYear, input.academicYear),
      lt(routinePeriods.startTime, input.endTime),
      gt(routinePeriods.endTime, input.startTime),
      or(
        ne(routineSchedules.sectionId, input.sectionId),
        ne(routineSchedules.academicYear, input.academicYear),
      )!,
    ];
    if (input.excludeEntryId) conditions.push(ne(routineEntries.id, input.excludeEntryId));

    const rows = await this.db.select({
      entryId: routineEntries.id,
      scheduleId: routineSchedules.id,
      sectionId: routineSchedules.sectionId,
      sectionName: sections.name,
      teacherId: teacherAssignments.teacherId,
      roomNumber: routineEntries.roomNumber,
      defaultRoomNumber: sections.roomNumber,
    })
      .from(routineEntries)
      .innerJoin(routineSchedules, eq(routineEntries.scheduleId, routineSchedules.id))
      .innerJoin(routinePeriods, eq(routineEntries.periodId, routinePeriods.id))
      .innerJoin(sections, eq(routineSchedules.sectionId, sections.id))
      .innerJoin(teacherAssignments, eq(routineEntries.teacherAssignmentId, teacherAssignments.id))
      .where(and(...conditions));

    const targetRoom = input.roomNumber || null;
    return rows.filter((row) =>
      row.teacherId === input.teacherId
      || (!!targetRoom && (row.roomNumber || row.defaultRoomNumber) === targetRoom),
    );
  }
}
