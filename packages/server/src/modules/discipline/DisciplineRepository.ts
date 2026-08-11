import { Repository } from '@server/najm';
import { DB } from '@server/database/db';
import {
  classes,
  disciplineIncidents,
  sections,
  staff,
  students,
  teacherAssignments,
  teachers,
  users,
} from '@server/database/schema';
import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

@Repository()
export class DisciplineRepository {
  declare db: DB;

  private buildJoinedQuery() {
    const studentUsers = alias(users, 'discipline_student_users');
    const reporterUsers = alias(users, 'discipline_reporter_users');
    const resolverUsers = alias(users, 'discipline_resolver_users');
    const reporterStaff = alias(staff, 'discipline_reporter_staff');
    const resolverStaff = alias(staff, 'discipline_resolver_staff');

    return this.db.select({
      id: disciplineIncidents.id,
      studentId: disciplineIncidents.studentId,
      classId: disciplineIncidents.classId,
      sectionId: disciplineIncidents.sectionId,
      reportedBy: disciplineIncidents.reportedBy,
      incidentAt: disciplineIncidents.incidentAt,
      category: disciplineIncidents.category,
      severity: disciplineIncidents.severity,
      location: disciplineIncidents.location,
      description: disciplineIncidents.description,
      status: disciplineIncidents.status,
      actionType: disciplineIncidents.actionType,
      actionNote: disciplineIncidents.actionNote,
      resolutionNote: disciplineIncidents.resolutionNote,
      resolvedBy: disciplineIncidents.resolvedBy,
      resolvedAt: disciplineIncidents.resolvedAt,
      createdAt: disciplineIncidents.createdAt,
      updatedAt: disciplineIncidents.updatedAt,
      student: {
        id: students.id,
        name: students.name,
        studentCode: students.studentCode,
        status: students.status,
        image: studentUsers.image,
      },
      class: { id: classes.id, name: classes.name },
      section: { id: sections.id, name: sections.name },
      reporter: {
        id: reporterUsers.id,
        name: reporterStaff.name,
        email: reporterUsers.email,
        image: reporterUsers.image,
      },
      resolver: {
        id: resolverUsers.id,
        name: resolverStaff.name,
        email: resolverUsers.email,
        image: resolverUsers.image,
      },
    })
      .from(disciplineIncidents)
      .innerJoin(students, eq(disciplineIncidents.studentId, students.id))
      .leftJoin(studentUsers, eq(students.userId, studentUsers.id))
      .innerJoin(classes, eq(disciplineIncidents.classId, classes.id))
      .innerJoin(sections, eq(disciplineIncidents.sectionId, sections.id))
      .innerJoin(reporterUsers, eq(disciplineIncidents.reportedBy, reporterUsers.id))
      .leftJoin(reporterStaff, eq(reporterStaff.userId, reporterUsers.id))
      .leftJoin(resolverUsers, eq(disciplineIncidents.resolvedBy, resolverUsers.id))
      .leftJoin(resolverStaff, eq(resolverStaff.userId, resolverUsers.id));
  }

  async list(reportedBy?: string) {
    const query = this.buildJoinedQuery();
    if (reportedBy) {
      return query.where(eq(disciplineIncidents.reportedBy, reportedBy))
        .orderBy(desc(disciplineIncidents.incidentAt), desc(disciplineIncidents.createdAt));
    }
    return query.orderBy(desc(disciplineIncidents.incidentAt), desc(disciplineIncidents.createdAt));
  }

  async getById(id: string) {
    const [record] = await this.buildJoinedQuery().where(eq(disciplineIncidents.id, id)).limit(1);
    return record;
  }

  async getStudentSnapshot(studentId: string) {
    const [student] = await this.db.select({
      id: students.id,
      status: students.status,
      classId: students.classId,
      sectionId: students.sectionId,
    }).from(students).where(eq(students.id, studentId)).limit(1);
    return student;
  }

  async isTeacherAssignedToSection(userId: string, sectionId: string) {
    const [assignment] = await this.db.select({ id: teacherAssignments.id })
      .from(teacherAssignments)
      .innerJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .where(and(eq(staff.userId, userId), eq(teacherAssignments.sectionId, sectionId)))
      .limit(1);
    return Boolean(assignment);
  }

  async create(data: typeof disciplineIncidents.$inferInsert) {
    const [record] = await this.db.insert(disciplineIncidents).values(data).returning({ id: disciplineIncidents.id });
    return this.getById(record.id);
  }

  async update(id: string, data: Partial<typeof disciplineIncidents.$inferInsert>) {
    await this.db.update(disciplineIncidents).set(data).where(eq(disciplineIncidents.id, id));
    return this.getById(id);
  }

  async delete(id: string) {
    const [record] = await this.db.delete(disciplineIncidents)
      .where(eq(disciplineIncidents.id, id))
      .returning({ id: disciplineIncidents.id });
    return record;
  }

  /** Internal reset support only; intentionally not exposed by the controller. */
  async deleteAll() {
    return this.db.delete(disciplineIncidents).returning({ id: disciplineIncidents.id });
  }
}
