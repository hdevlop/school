import { and, desc, eq, inArray } from 'drizzle-orm';
import { Repository } from '../../najm';
import { Owned, ScopeContext, type OwnedWhere } from '../../auth';
import { DB } from '../../database/db';
import {
  classes,
  parents,
  sections,
  studentEnrollmentPlacements,
  studentEnrollments,
  studentParents,
  students,
  users,
} from '../../database/schema';
import { Student, studentTeacherInYear } from '../students/StudentGuards';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { studentSelect } from './ParentRepository';

const linkSelect = {
  isEmergencyContact: parents.isEmergencyContact,
  financialResponsibility: parents.financialResponsibility,
  relationshipType: parents.relationshipType,
};

/**
 * A parent's linked children, read as student records: each reader lists only
 * the children the Student rules let them read. A teacher who reaches a parent
 * through one pupil does not see that pupil's brothers and sisters.
 */
@Repository()
export class ParentChildrenRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare _scopeCtx: ScopeContext;
  declare db: DB;
  @Owned(Student)
  private ownedWhere!: OwnedWhere;

  // Never chain another .where() on this: it would replace the read condition.
  private readCondition(parentId: string) {
    return and(
      this.ownedWhere(),
      studentTeacherInYear(this.year.id, this._scopeCtx),
      eq(studentParents.parentId, parentId),
    );
  }

  /** Minimal filter context for a readable parent list, one latest placement per child and parent. */
  async getListPlacements(parentIds: string[]) {
    if (!parentIds.length) return [];
    return this.db
      .selectDistinctOn([studentParents.parentId, students.id], {
        parentId: studentParents.parentId,
        studentId: students.id,
        classId: studentEnrollmentPlacements.classId,
        sectionId: studentEnrollmentPlacements.sectionId,
      })
      .from(studentParents)
      .innerJoin(students, eq(studentParents.studentId, students.id))
      .innerJoin(studentEnrollments, and(
        eq(studentEnrollments.studentId, students.id),
        eq(studentEnrollments.academicYearId, this.year.id),
      ))
      .leftJoin(studentEnrollmentPlacements, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .where(and(
        this.ownedWhere(),
        studentTeacherInYear(this.year.id, this._scopeCtx),
        inArray(studentParents.parentId, parentIds),
      ))
      .orderBy(studentParents.parentId, students.id, desc(studentEnrollmentPlacements.validFrom));
  }

  /**
   * Each child linked now, with the selected year's class and section from
   * the latest placement that year, or none when the child was not enrolled.
   */
  async getChildren(parentId: string) {
    return await this.db
      .selectDistinctOn([students.name, students.id], {
        ...studentSelect,
        classId: studentEnrollmentPlacements.classId,
        sectionId: studentEnrollmentPlacements.sectionId,
        class: { id: classes.id, name: classes.name },
        section: { id: sections.id, name: sections.name },
        enrollment: {
          id: studentEnrollments.id,
          status: studentEnrollments.status,
          enrolledOn: studentEnrollments.enrolledOn,
          leftOn: studentEnrollments.leftOn,
        },
        ...linkSelect,
      })
      .from(studentParents)
      .innerJoin(students, eq(studentParents.studentId, students.id))
      .innerJoin(parents, eq(studentParents.parentId, parents.id))
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(studentEnrollments, and(
        eq(studentEnrollments.studentId, students.id),
        eq(studentEnrollments.academicYearId, this.year.id),
      ))
      .leftJoin(studentEnrollmentPlacements, eq(studentEnrollmentPlacements.enrollmentId, studentEnrollments.id))
      .leftJoin(classes, eq(studentEnrollmentPlacements.classId, classes.id))
      .leftJoin(sections, eq(studentEnrollmentPlacements.sectionId, sections.id))
      .where(this.readCondition(parentId))
      .orderBy(students.name, students.id, desc(studentEnrollmentPlacements.validFrom));
  }

  /** The children linked now, with their current class: for current-link features (alerts, fees due, events). */
  async getLinkedChildren(parentId: string) {
    return await this.db
      .select({
        ...studentSelect,
        class: { id: classes.id, name: classes.name },
        section: { id: sections.id, name: sections.name },
        ...linkSelect,
      })
      .from(studentParents)
      .innerJoin(students, eq(studentParents.studentId, students.id))
      .innerJoin(parents, eq(studentParents.parentId, parents.id))
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .where(this.readCondition(parentId))
      .orderBy(students.name);
  }
}
