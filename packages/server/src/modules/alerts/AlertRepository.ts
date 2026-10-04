import { DB } from '../../database/db';
import { alerts, classes, students, subjects, teachers, staff, studentEnrollments, studentEnrollmentPlacements, fees } from '../../database/schema';
import { Repository } from '../../najm';
import { Owned, type OwnedWhere } from '../../auth';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { count, eq, desc, sql, and, or, isNull, type SQL } from 'drizzle-orm';
import { Alert, AlertForAudience, AlertForClass, AlertForTeacher, AlertUnderOwnAssignment } from './AlertGuards';

/** Year-owned rows plus genuinely shared system and untargeted emergency rows. */
export function alertVisibleInYear(yearId: string) {
  return or(
    eq(alerts.academicYearId, yearId),
    and(
      isNull(alerts.academicYearId),
      or(
        and(eq(alerts.type, 'system'), isNull(alerts.studentId), isNull(alerts.classId),
          isNull(alerts.teacherAssignmentId), isNull(alerts.teacherId), isNull(alerts.subjectId)),
        and(eq(alerts.type, 'emergency'), isNull(alerts.studentId), isNull(alerts.classId),
          isNull(alerts.teacherAssignmentId)),
      ),
    ),
  )!;
}

@Repository()
export class AlertRepository {
  @Year() private readonly year!: ResolvedAcademicYear;

  declare db: DB;
  @Owned(Alert, AlertForTeacher, AlertUnderOwnAssignment, AlertForClass, AlertForAudience)
  private ownedWhere!: OwnedWhere;

  private alertSelect = {
    id: alerts.id,
    academicYearId: alerts.academicYearId,
    type: alerts.type,
    title: alerts.title,
    message: alerts.message,
    priority: alerts.priority,
    status: alerts.status,
    studentId: alerts.studentId,
    teacherId: alerts.teacherId,
    teacherAssignmentId: alerts.teacherAssignmentId,
    classId: alerts.classId,
    subjectId: alerts.subjectId,
    targetAudience: alerts.targetAudience,
    isRead: alerts.isRead,
    studentName: students.name,
    teacherName: staff.name,
    className: classes.name,
    subjectName: subjects.name,
    createdAt: alerts.createdAt,
    updatedAt: alerts.updatedAt,
  };

  /** What the signed-in reader may see in the selected year, narrowed by a read's own filters. */
  private readCondition(...filters: (SQL | undefined)[]) {
    return and(this.ownedWhere(), alertVisibleInYear(this.year.id), ...filters);
  }

  private joinedQuery(placementYearId: string) {
    // A student's filter context is the latest placement in the selected
    // year. Keep the alert's own class target intact, including class notices.
    const placement = this.db
      .selectDistinctOn([studentEnrollments.studentId], {
        studentId: studentEnrollments.studentId,
        classId: studentEnrollmentPlacements.classId,
        sectionId: studentEnrollmentPlacements.sectionId,
      })
      .from(studentEnrollments)
      .innerJoin(studentEnrollmentPlacements, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .where(eq(studentEnrollments.academicYearId, placementYearId))
      .orderBy(studentEnrollments.studentId, desc(studentEnrollmentPlacements.validFrom))
      .as('alertStudentPlacement');
    return this.db
      .select({
        ...this.alertSelect,
        studentClassId: placement.classId,
        studentSectionId: placement.sectionId,
      })
      .from(alerts)
      .leftJoin(placement, eq(alerts.studentId, placement.studentId))
      .leftJoin(students, eq(alerts.studentId, students.id))
      .leftJoin(teachers, eq(alerts.teacherId, teachers.id))
      .leftJoin(staff, eq(teachers.staffId, staff.id))
      .leftJoin(classes, eq(alerts.classId, classes.id))
      .leftJoin(subjects, eq(alerts.subjectId, subjects.id));
  }

  // Never chain another .where() on this: it would replace the read condition.
  private baseQuery(...filters: (SQL | undefined)[]) {
    return this.joinedQuery(this.year.id).where(this.readCondition(...filters));
  }

  async getAll() {
    return await this.baseQuery().orderBy(desc(alerts.createdAt));
  }

  async getById(id: string) {
    const [alert] = await this.baseQuery(eq(alerts.id, id)).limit(1);
    return alert;
  }

  async getByType(type: typeof alerts.type._.data) {
    return await this.baseQuery(eq(alerts.type, type)).orderBy(desc(alerts.createdAt));
  }

  async getByStatus(status: typeof alerts.status._.data) {
    return await this.baseQuery(eq(alerts.status, status)).orderBy(desc(alerts.createdAt));
  }

  async getByPriority(priority: typeof alerts.priority._.data) {
    return await this.baseQuery(eq(alerts.priority, priority)).orderBy(desc(alerts.createdAt));
  }

  async getByStudentId(studentId: string) {
    return await this.baseQuery(eq(alerts.studentId, studentId)).orderBy(desc(alerts.createdAt));
  }

  async getByTeacherId(teacherId: string) {
    return await this.baseQuery(eq(alerts.teacherId, teacherId)).orderBy(desc(alerts.createdAt));
  }

  async getByClassId(classId: string) {
    return await this.baseQuery(eq(alerts.classId, classId)).orderBy(desc(alerts.createdAt));
  }

  async getBySubjectId(subjectId: string) {
    return await this.baseQuery(eq(alerts.subjectId, subjectId)).orderBy(desc(alerts.createdAt));
  }

  async getActiveAlerts() {
    return await this.baseQuery(eq(alerts.status, 'active'))
      .orderBy(desc(alerts.priority), desc(alerts.createdAt));
  }

  async getCriticalAlerts() {
    return await this.baseQuery(
      eq(alerts.priority, 'critical'),
      or(eq(alerts.status, 'active'), eq(alerts.status, 'acknowledged')),
    ).orderBy(desc(alerts.createdAt));
  }

  async getRecentAlertsByHours(hours: number) {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);

    return await this.baseQuery(sql`${alerts.createdAt} >= ${hoursAgo.toISOString()}`)
      .orderBy(desc(alerts.createdAt));
  }

  async getRecentAlerts(limit: number) {
    return await this.baseQuery().orderBy(desc(alerts.createdAt)).limit(limit);
  }

  async getCount() {
    const [alertCount] = await this.db
      .select({ count: count() })
      .from(alerts)
      .where(this.readCondition());
    return alertCount;
  }

  async getStatusCounts() {
    const result = await this.db
      .select({
        status: alerts.status,
        count: sql<number>`count(*)`
      })
      .from(alerts)
      .where(this.readCondition())
      .groupBy(alerts.status)
      .orderBy(alerts.status);

    return result.map(item => ({
      status: item.status,
      count: Number(item.count)
    }));
  }

  async getPriorityCounts() {
    const result = await this.db
      .select({
        priority: alerts.priority,
        count: sql<number>`count(*)`
      })
      .from(alerts)
      .where(this.readCondition())
      .groupBy(alerts.priority)
      .orderBy(alerts.priority);

    return result.map(item => ({
      priority: item.priority,
      count: Number(item.count)
    }));
  }

  async getTypeCounts() {
    const result = await this.db
      .select({
        type: alerts.type,
        count: sql<number>`count(*)`
      })
      .from(alerts)
      .where(this.readCondition())
      .groupBy(alerts.type)
      .orderBy(alerts.type);

    return result.map(item => ({
      type: item.type,
      count: Number(item.count)
    }));
  }

  async create(data) {
    const yearId = this.year.id;
    const [newAlert] = await this.db
      .insert(alerts)
      .values({ ...data, academicYearId: data.academicYearId === null ? null : yearId })
      .returning();
    return newAlert;
  }

  /** Trusted source operation: the caller validates the persisted fee year. */
  async createFromSourceYear(data, sourceYearId: string) {
    const [created] = await this.db.insert(alerts)
      .values({ ...data, academicYearId: sourceYearId }).returning();
    const [alert] = await this.joinedQuery(sourceYearId)
      .where(and(eq(alerts.id, created.id), eq(alerts.academicYearId, sourceYearId))).limit(1);
    return alert;
  }

  async update(id: string, data) {
    const [updatedAlert] = await this.db
      .update(alerts)
      .set(data)
      .where(and(eq(alerts.id, id), alertVisibleInYear(this.year.id)))
      .returning();
    return updatedAlert;
  }

  async updateStatus(id: string, status: string) {
    const [updatedAlert] = await this.db
      .update(alerts)
      .set({ status })
      .where(and(eq(alerts.id, id), alertVisibleInYear(this.year.id)))
      .returning();
    return updatedAlert;
  }

  async delete(id: string) {
    const [deletedAlert] = await this.db
      .delete(alerts)
      .where(and(eq(alerts.id, id), alertVisibleInYear(this.year.id)))
      .returning();
    return deletedAlert;
  }

  async deleteAll() {
    const deletedAlerts = await this.db
      .delete(alerts)
      .where(eq(alerts.academicYearId, this.year.id))
      .returning();

    return {
      deletedCount: deletedAlerts.length,
      deletedAlerts: deletedAlerts
    };
  }

  async deleteResolved() {
    const deletedAlerts = await this.db
      .delete(alerts)
      .where(and(eq(alerts.status, 'resolved'), eq(alerts.academicYearId, this.year.id)))
      .returning();

    return {
      deletedCount: deletedAlerts.length,
      deletedAlerts: deletedAlerts
    };
  }

  /** A duplicate check sees every alert, whoever is signed in. */
  async checkDuplicateAlertInScope(
    type,
    yearId: string | null,
    studentId?: string,
    teacherId?: string,
    classId?: string,
    subjectId?: string,
  ) {
    const conditions = [eq(alerts.type, type), eq(alerts.status, 'active'),
      yearId === null ? isNull(alerts.academicYearId) : eq(alerts.academicYearId, yearId)];

    if (studentId) conditions.push(eq(alerts.studentId, studentId));
    if (teacherId) conditions.push(eq(alerts.teacherId, teacherId));
    if (classId) conditions.push(eq(alerts.classId, classId));
    if (subjectId) conditions.push(eq(alerts.subjectId, subjectId));

    const [existingAlert] = await this.db
      .select({
        id: alerts.id,
        type: alerts.type,
        title: alerts.title,
        status: alerts.status,
        studentId: alerts.studentId,
        teacherId: alerts.teacherId,
        classId: alerts.classId,
        subjectId: alerts.subjectId,
        targetAudience: alerts.targetAudience,
        createdAt: alerts.createdAt,
      })
      .from(alerts)
      .where(and(...conditions))
      .limit(1);

    return existingAlert;
  }

  async hasStudentEnrollment(studentId: string) {
    const [row] = await this.db.select({ id: studentEnrollments.id }).from(studentEnrollments)
      .where(and(eq(studentEnrollments.studentId, studentId), eq(studentEnrollments.academicYearId, this.year.id)))
      .limit(1);
    return Boolean(row);
  }

  async classBelongsToYear(classId: string) {
    const [row] = await this.db.select({ id: classes.id }).from(classes)
      .where(and(eq(classes.id, classId), eq(classes.academicYear, this.year.label))).limit(1);
    return Boolean(row);
  }

  async studentWasPlacedInClass(studentId: string, classId: string) {
    const [row] = await this.db.select({ id: studentEnrollmentPlacements.id })
      .from(studentEnrollmentPlacements)
      .innerJoin(studentEnrollments, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .where(and(eq(studentEnrollments.studentId, studentId),
        eq(studentEnrollments.academicYearId, this.year.id),
        eq(studentEnrollmentPlacements.classId, classId)))
      .limit(1);
    return Boolean(row);
  }

  async findFeeSource(feeId: string) {
    const [row] = await this.db.select({ id: fees.id, studentId: fees.studentId, yearLabel: fees.academicYear })
      .from(fees).where(eq(fees.id, feeId)).limit(1);
    return row;
  }

  /** Trusted fixture reset only. User routes always use selected-year deleteAll. */
  async clearForSeedReset() {
    await this.db.delete(alerts);
  }
}
