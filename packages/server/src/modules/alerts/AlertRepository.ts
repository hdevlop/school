import { DB } from '@server/database/db';
import { alerts, classes, students, subjects, teachers, staff } from '@server/database/schema';
import { Repository } from '@server/najm';
import { count, eq, desc, sql, and, or } from 'drizzle-orm';

@Repository()
export class AlertRepository {

  declare db: DB;

  private alertSelect = {
    id: alerts.id,
    type: alerts.type,
    title: alerts.title,
    message: alerts.message,
    priority: alerts.priority,
    status: alerts.status,
    studentId: alerts.studentId,
    teacherId: alerts.teacherId,
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

  private baseQuery() {
    return this.db
      .select(this.alertSelect)
      .from(alerts)
      .leftJoin(students, eq(alerts.studentId, students.id))
      .leftJoin(teachers, eq(alerts.teacherId, teachers.id))
      .leftJoin(staff, eq(teachers.staffId, staff.id))
      .leftJoin(classes, eq(alerts.classId, classes.id))
      .leftJoin(subjects, eq(alerts.subjectId, subjects.id));
  }

  async getAll() {
    return await this.baseQuery().orderBy(desc(alerts.createdAt));
  }

  async getById(id) {
    const [alert] = await this.baseQuery()
      .where(eq(alerts.id, id))
      .limit(1);
    return alert;
  }

  async getByType(type) {
    return await this.baseQuery()
      .where(eq(alerts.type, type))
      .orderBy(desc(alerts.createdAt));
  }

  async getByStatus(status) {
    return await this.baseQuery()
      .where(eq(alerts.status, status))
      .orderBy(desc(alerts.createdAt));
  }

  async getByPriority(priority) {
    return await this.baseQuery()
      .where(eq(alerts.priority, priority))
      .orderBy(desc(alerts.createdAt));
  }

  async getByStudentId(studentId: string) {
    return await this.baseQuery()
      .where(eq(alerts.studentId, studentId))
      .orderBy(desc(alerts.createdAt));
  }

  async getByTeacherId(teacherId: string) {
    return await this.baseQuery()
      .where(eq(alerts.teacherId, teacherId))
      .orderBy(desc(alerts.createdAt));
  }

  async getByClassId(classId: string) {
    return await this.baseQuery()
      .where(eq(alerts.classId, classId))
      .orderBy(desc(alerts.createdAt));
  }

  async getBySubjectId(subjectId: string) {
    return await this.baseQuery()
      .where(eq(alerts.subjectId, subjectId))
      .orderBy(desc(alerts.createdAt));
  }

  async getByTargetAudience(targetAudience: string) {
    return await this.baseQuery()
      .where(eq(alerts.targetAudience, targetAudience))
      .orderBy(desc(alerts.createdAt));
  }

  async getActiveAlerts() {
    return await this.baseQuery()
      .where(eq(alerts.status, 'active'))
      .orderBy(desc(alerts.priority), desc(alerts.createdAt));
  }

  async getCriticalAlerts() {
    return await this.baseQuery()
      .where(
        and(
          eq(alerts.priority, 'critical'),
          or(eq(alerts.status, 'active'), eq(alerts.status, 'acknowledged'))
        )
      )
      .orderBy(desc(alerts.createdAt));
  }

  async getRecentAlertsByHours(hours: number = 24) {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);

    return await this.baseQuery()
      .where(sql`${alerts.createdAt} >= ${hoursAgo.toISOString()}`)
      .orderBy(desc(alerts.createdAt));
  }

  async getRecentAlerts(limit: number = 10) {
    return await this.baseQuery()
      .orderBy(desc(alerts.createdAt))
      .limit(limit);
  }

  async getCount() {
    const [alertCount] = await this.db
      .select({ count: count() })
      .from(alerts);
    return alertCount;
  }

  async getStatusCounts() {
    const result = await this.db
      .select({
        status: alerts.status,
        count: sql<number>`count(*)`
      })
      .from(alerts)
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
      .groupBy(alerts.type)
      .orderBy(alerts.type);

    return result.map(item => ({
      type: item.type,
      count: Number(item.count)
    }));
  }

  async create(data) {
    const [newAlert] = await this.db
      .insert(alerts)
      .values(data)
      .returning();
    return newAlert;
  }

  async update(id: string, data) {
    const [updatedAlert] = await this.db
      .update(alerts)
      .set(data)
      .where(eq(alerts.id, id))
      .returning();
    return updatedAlert;
  }

  async updateStatus(id: string, status: string) {
    const [updatedAlert] = await this.db
      .update(alerts)
      .set({ status })
      .where(eq(alerts.id, id))
      .returning();
    return updatedAlert;
  }

  async acknowledge(id: string) {
    const [updatedAlert] = await this.db
      .update(alerts)
      .set({ status: 'acknowledged' })
      .where(eq(alerts.id, id))
      .returning();
    return updatedAlert;
  }

  async dismiss(id: string) {
    const [updatedAlert] = await this.db
      .update(alerts)
      .set({ status: 'dismissed' })
      .where(eq(alerts.id, id))
      .returning();
    return updatedAlert;
  }

  async delete(id: string) {
    const [deletedAlert] = await this.db
      .delete(alerts)
      .where(eq(alerts.id, id))
      .returning();
    return deletedAlert;
  }

  async deleteAll() {
    const deletedAlerts = await this.db
      .delete(alerts)
      .returning();

    return {
      deletedCount: deletedAlerts.length,
      deletedAlerts: deletedAlerts
    };
  }

  async deleteResolved() {
    const deletedAlerts = await this.db
      .delete(alerts)
      .where(eq(alerts.status, 'resolved'))
      .returning();

    return {
      deletedCount: deletedAlerts.length,
      deletedAlerts: deletedAlerts
    };
  }

  async checkDuplicateAlert(
    type,
    studentId?: string,
    teacherId?: string,
    classId?: string,
    subjectId?: string,
  ) {
    const conditions = [eq(alerts.type, type), eq(alerts.status, 'active')];

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

  async getAlertsForStudent(studentId: string) {
    const conditions = [
      eq(alerts.status, 'active'),
      or(
        eq(alerts.studentId, studentId),
        eq(alerts.targetAudience, 'students'),
        eq(alerts.targetAudience, 'all')
      )
    ];

    return await this.baseQuery()
      .where(and(...conditions))
      .orderBy(desc(alerts.priority), desc(alerts.createdAt));
  }

  async getAlertsForTeacher(teacherId: string) {
    const conditions = [
      eq(alerts.status, 'active'),
      or(
        eq(alerts.teacherId, teacherId),
        eq(alerts.targetAudience, 'teachers'),
        eq(alerts.targetAudience, 'all')
      )
    ];

    return await this.baseQuery()
      .where(and(...conditions))
      .orderBy(desc(alerts.priority), desc(alerts.createdAt));
  }
}
