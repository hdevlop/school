import { DB } from '../../database/db';
import {
  behaviorRewards,
  classes,
  sections,
  staff,
  students,
  teacherAssignments,
  teachers,
  users,
} from '../../database/schema';
import { Owned } from '../../auth';
import { Repository } from '../../najm';
import { and, desc, eq, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { occurredInReportingInterval } from '../academicYears/academicRecordYear';
import { studentPlacementOn } from '../studentEnrollments/placementOnDay';
import { BehaviorReward } from './BehaviorRewardGuards';

@Owned(BehaviorReward)
@Repository()
export class BehaviorRewardRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;
  declare ownershipCondition: () => SQL | undefined;

  // A record belongs to the year whose reporting interval holds its school-local day.
  private inSelectedYear() {
    return occurredInReportingInterval(behaviorRewards.behaviorAt, this.year);
  }

  /** What the signed-in reader may see in the selected year, narrowed by a read's own filters. */
  private readCondition(...filters: (SQL | undefined)[]) {
    return and(this.ownershipCondition(), this.inSelectedYear(), ...filters);
  }

  // Never chain another .where() on this: it would replace the read condition.
  private buildQuery(...filters: (SQL | undefined)[]) {
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
      .innerJoin(awardingUsers, eq(behaviorRewards.awardedBy, awardingUsers.id))
      .where(this.readCondition(...filters));
  }

  async getAll() {
    return this.buildQuery().orderBy(desc(behaviorRewards.behaviorAt), desc(behaviorRewards.createdAt));
  }

  async getById(id: string) {
    const [record] = await this.buildQuery(eq(behaviorRewards.id, id)).limit(1);
    return record;
  }

  /** The student's class and section on the behavior's day; see `studentPlacementOn`. */
  async getStudentPlacementOn(studentId: string, behaviorAt: string) {
    return studentPlacementOn(this.db, studentId, behaviorAt, this.year);
  }

  async isTeacherAssignedToSection(userId: string, sectionId: string) {
    const [assignment] = await this.db
      .select({ id: teacherAssignments.id })
      .from(teacherAssignments)
      .innerJoin(teachers, eq(teacherAssignments.teacherId, teachers.id))
      .innerJoin(staff, eq(teachers.staffId, staff.id))
      .where(and(eq(teacherAssignments.sectionId, sectionId), eq(staff.userId, userId)))
      .limit(1);
    return Boolean(assignment);
  }

  async create(data: typeof behaviorRewards.$inferInsert) {
    const [created] = await this.db.insert(behaviorRewards).values(data).returning();
    return this.getById(created.id);
  }

  async update(id: string, data: Partial<typeof behaviorRewards.$inferInsert>) {
    await this.db.update(behaviorRewards).set(data)
      .where(and(eq(behaviorRewards.id, id), this.inSelectedYear()));
    return this.getById(id);
  }

  async delete(id: string) {
    const [deleted] = await this.db
      .delete(behaviorRewards)
      .where(and(eq(behaviorRewards.id, id), this.inSelectedYear()))
      .returning();
    return deleted;
  }

  /** Trusted demo reset only: every year's records. */
  async deleteAll() {
    return this.db.delete(behaviorRewards).returning({ id: behaviorRewards.id });
  }
}
