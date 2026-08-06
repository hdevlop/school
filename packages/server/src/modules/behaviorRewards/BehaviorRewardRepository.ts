import { DB } from '@server/database/db';
import {
  behaviorRewards,
  classes,
  sections,
  staff,
  students,
  teacherAssignments,
  teachers,
  users,
} from '@server/database/schema';
import { Owned } from '@server/auth';
import { Repository } from '@server/najm';
import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { BehaviorReward } from './BehaviorRewardGuards';

@Owned(BehaviorReward)
@Repository()
export class BehaviorRewardRepository {
  declare db: DB;
  declare scope: (query: any) => any;

  private buildQuery() {
    const studentUsers = alias(users, 'behavior_reward_student_users');
    const awardingUsers = alias(users, 'behavior_reward_awarding_users');

    return this.db
      .select({
        id: behaviorRewards.id,
        studentId: behaviorRewards.studentId,
        classId: behaviorRewards.classId,
        sectionId: behaviorRewards.sectionId,
        awardedBy: behaviorRewards.awardedBy,
        behaviorAt: behaviorRewards.behaviorAt,
        category: behaviorRewards.category,
        recognitionLevel: behaviorRewards.recognitionLevel,
        description: behaviorRewards.description,
        rewardType: behaviorRewards.rewardType,
        points: behaviorRewards.points,
        rewardNote: behaviorRewards.rewardNote,
        createdAt: behaviorRewards.createdAt,
        updatedAt: behaviorRewards.updatedAt,
        student: {
          id: students.id,
          studentCode: students.studentCode,
          name: students.name,
          image: studentUsers.image,
          status: students.status,
        },
        class: { id: classes.id, name: classes.name },
        section: { id: sections.id, name: sections.name },
        awardedByUser: {
          id: awardingUsers.id,
          name: awardingUsers.name,
          email: awardingUsers.email,
          image: awardingUsers.image,
        },
      })
      .from(behaviorRewards)
      .innerJoin(students, eq(behaviorRewards.studentId, students.id))
      .leftJoin(studentUsers, eq(students.userId, studentUsers.id))
      .innerJoin(classes, eq(behaviorRewards.classId, classes.id))
      .innerJoin(sections, eq(behaviorRewards.sectionId, sections.id))
      .innerJoin(awardingUsers, eq(behaviorRewards.awardedBy, awardingUsers.id));
  }

  async getAll() {
    return this.scope(this.buildQuery())
      .orderBy(desc(behaviorRewards.behaviorAt), desc(behaviorRewards.createdAt));
  }

  async getById(id: string) {
    const [record] = await this.scope(this.buildQuery())
      .where(eq(behaviorRewards.id, id))
      .limit(1);
    return record;
  }

  async getStudentAcademicContext(studentId: string) {
    const [student] = await this.db
      .select({
        id: students.id,
        status: students.status,
        classId: students.classId,
        sectionId: students.sectionId,
      })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);
    return student;
  }

  async isTeacherAssignedToStudent(userId: string, studentId: string) {
    const [assignment] = await this.db
      .select({ id: teacherAssignments.id })
      .from(students)
      .innerJoin(teacherAssignments, eq(students.sectionId, teacherAssignments.sectionId))
      .innerJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .where(and(eq(students.id, studentId), eq(staff.userId, userId)))
      .limit(1);
    return Boolean(assignment);
  }

  async create(data: typeof behaviorRewards.$inferInsert) {
    const [created] = await this.db.insert(behaviorRewards).values(data).returning();
    return this.getById(created.id);
  }

  async update(id: string, data: Partial<typeof behaviorRewards.$inferInsert>) {
    await this.db.update(behaviorRewards).set(data).where(eq(behaviorRewards.id, id));
    return this.getById(id);
  }

  async delete(id: string) {
    const [deleted] = await this.db
      .delete(behaviorRewards)
      .where(eq(behaviorRewards.id, id))
      .returning();
    return deleted;
  }

  async deleteAll() {
    return this.db.delete(behaviorRewards).returning({ id: behaviorRewards.id });
  }
}
